import type { ProviderOAuthMessage } from '../types/provider';
import { apiClient } from '../services/apiClient';
import { invalidateProviderOrgCaches } from './providerCache';

export type ProviderOAuthResult =
  | { ok: true; organization?: string }
  | { ok: false; error: string };

const POPUP_FEATURES = 'width=600,height=760,menubar=no,toolbar=no,status=no,resizable=yes';
const POPUP_NAME = 'provider-oauth';
const POPUP_POLL_MS = 400;
/** Wait after popup.closed so a late postMessage / BroadcastChannel can still win. */
const CLOSE_GRACE_MS = 900;
const POPUP_TIMEOUT_MS = 5 * 60 * 1000;
const OAUTH_CHANNEL = 'provider-oauth';
const OAUTH_STORAGE_KEY = 'provider-oauth-result';

function isOAuthMessage(data: unknown): data is ProviderOAuthMessage {
  if (!data || typeof data !== 'object') return false;
  const type = (data as { type?: unknown }).type;
  return type === 'PROVIDER_OAUTH_SUCCESS' || type === 'PROVIDER_OAUTH_ERROR';
}

function resultFromMessage(data: ProviderOAuthMessage): ProviderOAuthResult {
  if (data.type === 'PROVIDER_OAUTH_SUCCESS') {
    return { ok: true, organization: data.organization };
  }
  return {
    ok: false,
    error: data.error?.trim() || 'Authorization failed',
  };
}

/**
 * Notify the opener that OAuth finished.
 * Uses postMessage + BroadcastChannel + localStorage so success is not lost when
 * `window.opener` is null (COOP) or the popup closes before the message is handled.
 */
export function notifyProviderOAuthResult(payload: ProviderOAuthMessage): void {
  try {
    const channel = new BroadcastChannel(OAUTH_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    /* BroadcastChannel unsupported */
  }

  try {
    // storage events fire in *other* documents on setItem
    localStorage.setItem(OAUTH_STORAGE_KEY, JSON.stringify({ ...payload, _ts: Date.now() }));
  } catch {
    /* private mode / quota */
  }

  try {
    window.opener?.postMessage(payload, window.location.origin);
  } catch (err) {
    console.error('[ProviderOAuth] postMessage failed:', err);
  }
}

/**
 * Opens the provider OAuth popup and resolves when the callback signals success/failure.
 * Rejects messages whose origin does not match the app origin.
 */
export function openProviderOAuthPopup(authorizeUrl: string): Promise<ProviderOAuthResult> {
  const appOrigin = window.location.origin;

  return new Promise((resolve) => {
    let settled = false;
    let pollId: number | null = null;
    let timeoutId: number | null = null;
    let closeGraceId: number | null = null;
    let channel: BroadcastChannel | null = null;

    const cleanup = () => {
      window.removeEventListener('message', onWindowMessage);
      window.removeEventListener('storage', onStorage);
      try {
        channel?.close();
      } catch {
        /* ignore */
      }
      channel = null;
      if (pollId != null) window.clearInterval(pollId);
      if (timeoutId != null) window.clearTimeout(timeoutId);
      if (closeGraceId != null) window.clearTimeout(closeGraceId);
      try {
        localStorage.removeItem(OAUTH_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    };

    const finish = (result: ProviderOAuthResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const accept = (data: ProviderOAuthMessage) => {
      finish(resultFromMessage(data));
    };

    const onWindowMessage = (event: MessageEvent) => {
      if (event.origin !== appOrigin) return;
      if (!isOAuthMessage(event.data)) return;
      accept(event.data);
    };

    const onChannelMessage = (event: MessageEvent) => {
      if (!isOAuthMessage(event.data)) return;
      accept(event.data);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== OAUTH_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as unknown;
        if (!isOAuthMessage(parsed)) return;
        accept(parsed);
      } catch {
        /* ignore malformed */
      }
    };

    window.addEventListener('message', onWindowMessage);
    window.addEventListener('storage', onStorage);

    try {
      channel = new BroadcastChannel(OAUTH_CHANNEL);
      channel.addEventListener('message', onChannelMessage);
    } catch {
      channel = null;
    }

    const popup = window.open(authorizeUrl, POPUP_NAME, POPUP_FEATURES);
    if (!popup) {
      finish({
        ok: false,
        error: 'Popup was blocked. Allow popups for this site and try again.',
      });
      return;
    }

    pollId = window.setInterval(() => {
      if (!popup.closed) return;
      // Do not fail immediately — callback may still deliver via BroadcastChannel
      // a few ms after close (common race with postMessage + window.close()).
      if (closeGraceId != null) return;
      closeGraceId = window.setTimeout(() => {
        finish({ ok: false, error: 'Authorization window was closed.' });
      }, CLOSE_GRACE_MS);
    }, POPUP_POLL_MS);

    timeoutId = window.setTimeout(() => {
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      finish({ ok: false, error: 'Authorization timed out. Please try again.' });
    }, POPUP_TIMEOUT_MS);
  });
}

/**
 * Start (or re-authorize) a provider organization OAuth grant.
 * On success, invalidates connections/health caches (and optional projects cache).
 *
 * If the popup closes without a signal (COOP / race), we still treat the flow as
 * successful when the connections list shows a new or refreshed grant — the
 * backend may have completed the exchange already.
 */
export async function reconnectProviderOrganization(
  authToken: string,
  options?: { connectionId?: string },
): Promise<ProviderOAuthResult> {
  const before = await apiClient.listProviderConnections(authToken).catch(() => []);
  const beforeById = new Map(before.map((c) => [c.id, c]));

  const { url } = await apiClient.getProviderOAuthUrl(authToken);
  const result = await openProviderOAuthPopup(url);
  if (result.ok) {
    invalidateProviderOrgCaches(options?.connectionId);
    return result;
  }

  const ambiguousClose = result.error === 'Authorization window was closed.';
  if (!ambiguousClose) {
    return result;
  }

  invalidateProviderOrgCaches(options?.connectionId);
  try {
    const after = await apiClient.listProviderConnections(authToken);
    const added = after.find((c) => !beforeById.has(c.id));
    if (added) {
      return { ok: true, organization: added.organization };
    }
    const refreshed = after.find((c) => {
      const prev = beforeById.get(c.id);
      if (!prev) return false;
      return prev.expires_at !== c.expires_at || prev.connected_at !== c.connected_at;
    });
    if (refreshed) {
      return { ok: true, organization: refreshed.organization };
    }
  } catch {
    /* fall through to original error */
  }

  return result;
}

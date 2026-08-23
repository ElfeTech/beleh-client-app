import type { ConnectorResponse } from '../types/api';

export type ConnectorSyncOutcome = 'completed' | 'failed' | 'timeout' | 'cancelled' | 'none';

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED']);
/** Backoff schedule; repeats the last delay until timeoutMs is reached. */
const DELAYS_MS = [1500, 2000, 3000, 5000, 8000];
const DEFAULT_TIMEOUT_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function pickTargets(list: ConnectorResponse[], connectorId?: string): ConnectorResponse[] {
  if (connectorId) return list.filter((c) => c.id === connectorId);
  return list.filter((c) => !TERMINAL_STATUSES.has(c.metadata_status));
}

/**
 * Poll the connector list until schema sync settles for the target connector
 * (or every still-syncing connector when no id is given).
 *
 * Keeps the sidebar/catalog pills in sync with the backend after a connect —
 * without it a connector shows "Syncing" until the next manual refresh.
 */
export async function pollConnectorSyncUntilSettled(
  refreshConnectors: (options?: { silent?: boolean }) => Promise<ConnectorResponse[]>,
  options?: {
    connectorId?: string;
    timeoutMs?: number;
    /** Return true to stop polling (e.g. component unmounted / workspace switched). */
    isCancelled?: () => boolean;
  },
): Promise<ConnectorSyncOutcome> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();
  let attempt = 0;

  // Initial snapshot so a connector that is already settled returns immediately.
  let list = await refreshConnectors({ silent: true });
  for (;;) {
    if (options?.isCancelled?.()) return 'cancelled';

    const targets = pickTargets(list, options?.connectorId);
    if (options?.connectorId && targets.length === 0) return 'none';
    if (targets.length > 0 && targets.every((c) => TERMINAL_STATUSES.has(c.metadata_status))) {
      return targets.some((c) => c.metadata_status === 'FAILED') ? 'failed' : 'completed';
    }
    if (!options?.connectorId && targets.length === 0) return 'none';

    if (Date.now() - started >= timeoutMs) return 'timeout';

    const delay = DELAYS_MS[Math.min(attempt, DELAYS_MS.length - 1)];
    attempt += 1;
    await sleep(delay);
    if (options?.isCancelled?.()) return 'cancelled';
    list = await refreshConnectors({ silent: true });
  }
}

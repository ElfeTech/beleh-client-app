import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProviderOAuthMessage } from '../types/provider';
import { notifyProviderOAuthResult } from '../lib/providerOAuth';

/**
 * OAuth redirect target. Backend redirects here after token exchange.
 * Posts result to opener (and BroadcastChannel / localStorage fallbacks) then closes.
 * Do not fetch this URL with the API client.
 */
export function ProviderOAuthCallback() {
  const [params] = useSearchParams();
  const notified = useRef(false);

  const payload = useMemo((): ProviderOAuthMessage => {
    const success = params.get('success') === 'true';
    const organization = params.get('organization') ?? undefined;
    const error = params.get('error') ?? undefined;

    if (success) {
      return { type: 'PROVIDER_OAUTH_SUCCESS', organization };
    }
    return {
      type: 'PROVIDER_OAUTH_ERROR',
      organization,
      error: error || 'Authorization failed',
    };
  }, [params]);

  useEffect(() => {
    if (notified.current) return;
    notified.current = true;

    notifyProviderOAuthResult(payload);

    // Give the opener a beat to receive postMessage / BroadcastChannel before we tear down.
    const closeId = window.setTimeout(() => {
      try {
        window.close();
      } catch {
        /* ignore , some browsers block close if not opened by script */
      }
    }, 200);

    return () => window.clearTimeout(closeId);
  }, [payload]);

  const isSuccess = payload.type === 'PROVIDER_OAUTH_SUCCESS';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'var(--canvas-bg, #f8fafc)',
        color: 'var(--text-primary, #0f172a)',
        fontFamily: 'inherit',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '22rem' }}>
        <p
          style={{
            margin: '0 0 0.5rem',
            fontSize: '0.6875rem',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted, #64748b)',
          }}
        >
          Supabase
        </p>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: 800 }}>
          {isSuccess ? 'Connected' : 'Connection failed'}
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-tertiary, #64748b)' }}>
          {isSuccess
            ? payload.organization
              ? `Organization “${payload.organization}” is connected. You can close this window.`
              : 'You can close this window and return to the app.'
            : payload.error || 'You can close this window and try again.'}
        </p>
      </div>
    </div>
  );
}

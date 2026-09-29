import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ChevronRight, Cloud, Search, Unplug } from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { apiClient } from '../../../services/apiClient';
import { connectSlugProvider } from '../../../lib/providerOAuth';
import { invalidateSheetsAccountCaches } from '../../../lib/providerCache';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { ApiRequestError, formatProviderErrorToast } from '../../../utils/apiErrorMessage';
import type { ProviderConnection } from '../../../types/provider';
import { SHEETS_CACHE_KEYS } from '../../../types/sheets';
import { useApiData } from '../../../hooks/useApiData';
import { ConnectionEmptyOrgsIcon, ConnectionLoadErrorIcon } from './ConnectorStateIcons';

const GOOGLE_SHEETS_SLUG = 'google_sheets';

interface GoogleSheetsAccountsViewProps {
  onSelectConnection: (connection: ProviderConnection) => void;
  /** When list is non-empty, parent can show Connect in panel chrome. */
  onHasConnectionsChange?: (hasConnections: boolean) => void;
  connectRequestKey?: number;
}

export function GoogleSheetsAccountsView({
  onSelectConnection,
  onHasConnectionsChange,
  connectRequestKey = 0,
}: GoogleSheetsAccountsViewProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [oauthBusy, setOauthBusy] = useState(false);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!user) return [];
    const token = await user.getIdToken();
    return apiClient.listSlugProviderConnections(GOOGLE_SHEETS_SLUG, token);
  }, [user]);

  const {
    data: connections,
    loading,
    error,
    refetch,
    invalidate,
  } = useApiData<ProviderConnection[]>(
    SHEETS_CACHE_KEYS.connections,
    fetchConnections,
    [user?.uid],
    { immediate: Boolean(user), ttl: 60_000, dependencies: [user?.uid] },
  );

  const connectionNotFound =
    error instanceof ApiRequestError && error.code === 'PROVIDER_CONNECTION_NOT_FOUND';

  const list = useMemo(() => {
    if (connectionNotFound) return [];
    return connections ?? [];
  }, [connections, connectionNotFound]);

  const isEmpty = !loading && (connectionNotFound || (!error && list.length === 0));

  useEffect(() => {
    onHasConnectionsChange?.(!isEmpty && list.length > 0);
  }, [isEmpty, list.length, onHasConnectionsChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.organization.toLowerCase().includes(q));
  }, [list, query]);

  const connectAccount = useCallback(
    async (connectionId?: string) => {
      if (!user || oauthBusy) return;
      setOauthBusy(true);
      try {
        const token = await user.getIdToken();
        const result = await connectSlugProvider(GOOGLE_SHEETS_SLUG, token, { connectionId });
        if (result.ok) {
          invalidate();
          await refetch();
          toast.success(
            result.organization ? `Connected ${result.organization}` : 'Google account connected',
          );
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Failed to start OAuth';
        const code = err instanceof ApiRequestError ? err.code : null;
        toast.error(formatProviderErrorToast(code, detail));
      } finally {
        setOauthBusy(false);
      }
    },
    [user, oauthBusy, invalidate, refetch],
  );

  useEffect(() => {
    if (connectRequestKey > 0) {
      void connectAccount();
    }
    // Only react to external "Add new account" clicks from chrome.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectRequestKey]);

  const confirmDisconnect = async () => {
    if (!user || !disconnectId) return;
    setDisconnecting(true);
    try {
      const token = await user.getIdToken();
      await apiClient.deleteSlugProviderConnection(GOOGLE_SHEETS_SLUG, token, disconnectId);
      invalidateSheetsAccountCaches(disconnectId);
      invalidate();
      await refetch();
      toast.success('Google account disconnected');
      setDisconnectId(null);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to disconnect';
      const code = err instanceof ApiRequestError ? err.code : null;
      if (code === 'PROVIDER_CONNECTION_NOT_FOUND') {
        invalidateSheetsAccountCaches(disconnectId);
        invalidate();
        await refetch();
        setDisconnectId(null);
        toast.message('Account was already disconnected.');
      } else {
        toast.error(formatProviderErrorToast(code, detail));
      }
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <div className="ds-conn-list ds-conn-panel__body">
        {!isEmpty && (
          <div className="ds-conn-list__toolbar">
            <div className="ds-conn-catalog__search">
              <Search
                size={18}
                strokeWidth={2}
                aria-hidden
                className="ds-conn-catalog__search-icon"
              />
              <input
                type="search"
                className="ds-conn-catalog__search-input"
                placeholder="Search Google accounts…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search Google accounts"
              />
            </div>
          </div>
        )}

        {loading && <p className="ds-conn-list__loading">Loading accounts…</p>}

        {error && !loading && !connectionNotFound && (
          <div className="ds-conn-empty ds-conn-empty--error">
            <div className="ds-conn-empty__icon" aria-hidden>
              <ConnectionLoadErrorIcon />
            </div>
            <h3 className="ds-conn-empty__title">Couldn't reach connections</h3>
            <p className="ds-conn-empty__copy">
              {error.message || 'Something went wrong while loading your Google accounts.'}
            </p>
            <button type="button" className="ds-conn-empty__cta" onClick={() => void refetch()}>
              Try again
            </button>
          </div>
        )}

        {isEmpty && (
          <div className="ds-conn-empty">
            <div className="ds-conn-empty__icon" aria-hidden>
              <ConnectionEmptyOrgsIcon />
            </div>
            <h3 className="ds-conn-empty__title">Connect a Google account</h3>
            <p className="ds-conn-empty__copy">
              Authorize Beleh to read your spreadsheets (read-only), then pick one to connect.
            </p>
            <button
              type="button"
              className="ds-conn-empty__cta"
              onClick={() => void connectAccount()}
              disabled={oauthBusy}
            >
              {oauthBusy ? 'Opening…' : 'Connect Google account'}
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="ds-conn-list__rows">
            {filtered.map((conn) => (
              <div key={conn.id} className="ds-conn-list__row-wrap">
                <button
                  type="button"
                  className="ds-conn-list__row"
                  onClick={() => onSelectConnection(conn)}
                >
                  <div className="ds-conn-list__row-icon" aria-hidden>
                    <Cloud size={20} strokeWidth={1.75} />
                  </div>
                  <div className="ds-conn-list__row-text">
                    <span className="ds-conn-list__row-title">{conn.organization}</span>
                    <span className="ds-conn-list__row-meta">
                      Connected{' '}
                      {formatDistanceToNow(new Date(conn.connected_at), { addSuffix: true })}
                    </span>
                  </div>
                  <span className="ds-conn-list__status is-active">Connected</span>
                  <ChevronRight size={18} strokeWidth={2} aria-hidden />
                </button>
                <div className="ds-conn-list__row-actions">
                  <button
                    type="button"
                    className="ds-conn-list__row-action"
                    aria-label={`Disconnect ${conn.organization}`}
                    title="Disconnect account"
                    onClick={() => setDisconnectId(conn.id)}
                  >
                    <Unplug size={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && list.length > 0 && filtered.length === 0 && (
          <p className="ds-conn-catalog__empty">No accounts match your search.</p>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(disconnectId)}
        title="Disconnect Google account?"
        message="This removes the OAuth grant. Spreadsheets already connected to workspaces keep their last synced data but stop refreshing."
        confirmText="Disconnect"
        variant="danger"
        isLoading={disconnecting}
        onConfirm={() => void confirmDisconnect()}
        onCancel={() => setDisconnectId(null)}
      />
    </>
  );
}

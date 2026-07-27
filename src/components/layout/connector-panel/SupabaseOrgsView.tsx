import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ChevronRight, Hexagon, RefreshCw, Search, Unplug } from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { apiClient } from '../../../services/apiClient';
import { reconnectProviderOrganization } from '../../../lib/providerOAuth';
import {
  invalidateProviderOrgCaches,
  invalidateWorkspaceProviderCache,
} from '../../../lib/providerCache';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { ApiRequestError, formatProviderErrorToast } from '../../../utils/apiErrorMessage';
import type {
  ProviderConnection,
  ProviderHealthConnection,
  ProviderHealthResponse,
  WorkspaceProviderBinding,
} from '../../../types/provider';
import { PROVIDER_CACHE_KEYS } from '../../../types/provider';
import { useApiData } from '../../../hooks/useApiData';
import {
  ConnectionEmptyOrgsIcon,
  ConnectionLoadErrorIcon,
  ConnectionUnhealthyIcon,
} from './ConnectorStateIcons';

interface SupabaseOrgsViewProps {
  workspaceId: string;
  onSelectConnection: (connection: ProviderConnection) => void;
  /** When list is non-empty, parent can show Connect in panel chrome. */
  onHasConnectionsChange?: (hasConnections: boolean) => void;
  connectRequestKey?: number;
}

function healthByConnectionId(
  health: ProviderHealthResponse | null,
): Map<string, ProviderHealthConnection> {
  const map = new Map<string, ProviderHealthConnection>();
  for (const row of health?.connections ?? []) {
    map.set(row.id, row);
  }
  return map;
}

export function SupabaseOrgsView({
  workspaceId,
  onSelectConnection,
  onHasConnectionsChange,
  connectRequestKey = 0,
}: SupabaseOrgsViewProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [oauthBusy, setOauthBusy] = useState(false);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!user) return [];
    const token = await user.getIdToken();
    return apiClient.listProviderConnections(token);
  }, [user]);

  const {
    data: connections,
    loading,
    error,
    refetch,
    invalidate,
  } = useApiData<ProviderConnection[]>(
    PROVIDER_CACHE_KEYS.connections,
    fetchConnections,
    [user?.uid],
    { immediate: Boolean(user), ttl: 60_000, dependencies: [user?.uid] },
  );

  const fetchHealth = useCallback(async () => {
    if (!user) return { connections: [] };
    const token = await user.getIdToken();
    return apiClient.getProviderHealth(token);
  }, [user]);

  const {
    data: health,
    refetch: refetchHealth,
    invalidate: invalidateHealth,
  } = useApiData<ProviderHealthResponse>(PROVIDER_CACHE_KEYS.health, fetchHealth, [user?.uid], {
    immediate: Boolean(user),
    ttl: 60_000,
    dependencies: [user?.uid],
  });

  const fetchBinding = useCallback(async () => {
    if (!user) return null;
    const token = await user.getIdToken();
    return apiClient.getWorkspaceProviderConnection(token, workspaceId);
  }, [user, workspaceId]);

  const {
    data: binding,
    refetch: refetchBinding,
    invalidate: invalidateBinding,
  } = useApiData<WorkspaceProviderBinding | null>(
    PROVIDER_CACHE_KEYS.workspace(workspaceId),
    fetchBinding,
    [user?.uid, workspaceId],
    {
      immediate: Boolean(user && workspaceId),
      ttl: 60_000,
      dependencies: [user?.uid, workspaceId],
    },
  );

  const connectionNotFound =
    error instanceof ApiRequestError && error.code === 'PROVIDER_CONNECTION_NOT_FOUND';

  const list = useMemo(() => {
    // Empty array / connection-not-found both mean "reconnect required"
    if (connectionNotFound) return [];
    return connections ?? [];
  }, [connections, connectionNotFound]);

  const isEmpty = !loading && (connectionNotFound || (!error && list.length === 0));
  const healthMap = useMemo(() => healthByConnectionId(health), [health]);

  useEffect(() => {
    onHasConnectionsChange?.(!isEmpty && list.length > 0);
  }, [isEmpty, list.length, onHasConnectionsChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.organization.toLowerCase().includes(q));
  }, [list, query]);

  const refreshAfterOAuth = useCallback(async () => {
    invalidate();
    invalidateHealth();
    await refetch();
    await refetchHealth();
  }, [invalidate, invalidateHealth, refetch, refetchHealth]);

  const connectOrganization = useCallback(
    async (connectionId?: string) => {
      if (!user || oauthBusy) return;
      setOauthBusy(true);
      if (connectionId) setReconnectingId(connectionId);
      try {
        const token = await user.getIdToken();
        const result = await reconnectProviderOrganization(token, { connectionId });
        if (result.ok) {
          await refreshAfterOAuth();
          const orgName = result.organization;
          if (connectionId) {
            toast.success(orgName ? `Reconnected ${orgName}` : 'Organization reconnected');
          } else {
            toast.success(orgName ? `Connected ${orgName}` : 'Organization connected');
          }
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Failed to start OAuth';
        const code = err instanceof ApiRequestError ? err.code : null;
        toast.error(formatProviderErrorToast(code, detail));
      } finally {
        setOauthBusy(false);
        setReconnectingId(null);
      }
    },
    [user, oauthBusy, refreshAfterOAuth],
  );

  useEffect(() => {
    if (connectRequestKey > 0) {
      void connectOrganization();
    }
    // Only react to external "Add new organization" clicks from chrome.
    // Parent resets the key to 0 when leaving this view so remounts do not re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectRequestKey]);

  const confirmDisconnect = async () => {
    if (!user || !disconnectId) return;
    setDisconnecting(true);
    try {
      const token = await user.getIdToken();
      await apiClient.deleteProviderConnection(token, disconnectId);
      invalidateProviderOrgCaches(disconnectId);
      invalidateWorkspaceProviderCache(workspaceId);
      invalidate();
      invalidateHealth();
      invalidateBinding();
      await refetch();
      await refetchHealth();
      await refetchBinding();
      toast.success('Organization disconnected');
      setDisconnectId(null);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to disconnect';
      const code = err instanceof ApiRequestError ? err.code : null;
      if (code === 'PROVIDER_CONNECTION_NOT_FOUND') {
        invalidateProviderOrgCaches(disconnectId);
        invalidate();
        invalidateHealth();
        await refetch();
        await refetchHealth();
        setDisconnectId(null);
        toast.message('Organization was already disconnected. Please reconnect if needed.');
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
        {binding?.is_connected && binding.provider_project_name ? (
          <div className="ds-conn-list__binding">
            <span>
              Bound to <strong>{binding.provider_project_name}</strong>
              {binding.provider_organization ? ` · ${binding.provider_organization}` : null}
            </span>
          </div>
        ) : null}

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
                placeholder="Search organizations…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search organizations"
              />
            </div>
          </div>
        )}

        {loading && <p className="ds-conn-list__loading">Loading organizations…</p>}

        {error && !loading && !connectionNotFound && (
          <div className="ds-conn-empty ds-conn-empty--error">
            <div className="ds-conn-empty__icon" aria-hidden>
              <ConnectionLoadErrorIcon />
            </div>
            <h3 className="ds-conn-empty__title">Couldn’t reach connections</h3>
            <p className="ds-conn-empty__copy">
              {error.message || 'Something went wrong while loading your Supabase organizations.'}
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
            <h3 className="ds-conn-empty__title">Connect a Supabase organization</h3>
            <p className="ds-conn-empty__copy">
              Authorize Beleh to list projects in your Supabase org, then bind one to this
              workspace.
            </p>
            <button
              type="button"
              className="ds-conn-empty__cta"
              onClick={() => void connectOrganization()}
              disabled={oauthBusy}
            >
              {oauthBusy ? 'Opening…' : 'Connect organization'}
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="ds-conn-list__rows">
            {filtered.map((conn) => {
              const rowHealth = healthMap.get(conn.id);
              const unhealthy = rowHealth != null && !rowHealth.healthy;
              const expiresLabel = rowHealth?.expires_at
                ? `Expires ${formatDistanceToNow(new Date(rowHealth.expires_at), { addSuffix: true })}`
                : `Connected ${formatDistanceToNow(new Date(conn.connected_at), { addSuffix: true })}`;
              const unhealthyDetail = rowHealth?.detail
                ? formatProviderErrorToast(rowHealth.detail, rowHealth.detail)
                : 'Connection unhealthy — reconnect required';
              const isReconnecting = reconnectingId === conn.id;
              let statusClass = '';
              let statusLabel = 'Connected';
              if (unhealthy) {
                statusClass = 'is-unhealthy';
                statusLabel = 'Unhealthy';
              } else if (rowHealth?.healthy) {
                statusClass = 'is-active';
                statusLabel = 'Healthy';
              }

              return (
                <div key={conn.id} className="ds-conn-list__row-wrap">
                  <button
                    type="button"
                    className="ds-conn-list__row"
                    onClick={() => onSelectConnection(conn)}
                  >
                    <div
                      className={`ds-conn-list__row-icon${unhealthy ? ' ds-conn-list__row-icon--unhealthy' : ''}`}
                      aria-hidden
                    >
                      {unhealthy ? (
                        <ConnectionUnhealthyIcon />
                      ) : (
                        <Hexagon size={20} strokeWidth={1.75} />
                      )}
                    </div>
                    <div className="ds-conn-list__row-text">
                      <span className="ds-conn-list__row-title">{conn.organization}</span>
                      <span className="ds-conn-list__row-meta">
                        {unhealthy ? unhealthyDetail : expiresLabel}
                      </span>
                    </div>
                    <span className={`ds-conn-list__status ${statusClass}`}>{statusLabel}</span>
                    <ChevronRight size={18} strokeWidth={2} aria-hidden />
                  </button>
                  <div className="ds-conn-list__row-actions">
                    {unhealthy ? (
                      <button
                        type="button"
                        className="ds-conn-list__row-action"
                        aria-label={`Reconnect ${conn.organization}`}
                        disabled={oauthBusy}
                        onClick={() => void connectOrganization(conn.id)}
                        title="Reconnect"
                      >
                        <RefreshCw
                          size={18}
                          strokeWidth={2}
                          className={isReconnecting ? 'ds-conn-spin' : undefined}
                        />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="ds-conn-list__row-action"
                      aria-label={`Disconnect ${conn.organization}`}
                      title="Disconnect organization"
                      onClick={() => setDisconnectId(conn.id)}
                    >
                      <Unplug size={18} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && list.length > 0 && filtered.length === 0 && (
          <p className="ds-conn-catalog__empty">No organizations match your search.</p>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(disconnectId)}
        title="Disconnect organization?"
        message="This removes the OAuth grant and clears workspace bindings for that organization."
        confirmText="Disconnect"
        variant="danger"
        isLoading={disconnecting}
        onConfirm={() => void confirmDisconnect()}
        onCancel={() => setDisconnectId(null)}
      />
    </>
  );
}

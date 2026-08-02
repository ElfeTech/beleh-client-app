import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, FolderKanban, Search, Unlink } from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { apiClient } from '../../../services/apiClient';
import { reconnectProviderOrganization } from '../../../lib/providerOAuth';
import {
  invalidateProviderProjectsCache,
  invalidateWorkspaceProviderCache,
} from '../../../lib/providerCache';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { ApiRequestError, formatProviderErrorToast } from '../../../utils/apiErrorMessage';
import type {
  ProviderConnection,
  ProviderProject,
  WorkspaceProviderBinding,
} from '../../../types/provider';
import { PROVIDER_CACHE_KEYS } from '../../../types/provider';
import { useApiData } from '../../../hooks/useApiData';
import {
  ConnectionEmptyProjectsIcon,
  ConnectionLoadErrorIcon,
  ConnectionReconnectIcon,
} from './ConnectorStateIcons';

interface SupabaseProjectsViewProps {
  workspaceId: string;
  connection: ProviderConnection;
  onBound: () => void;
}

export function SupabaseProjectsView({
  workspaceId,
  connection,
  onBound,
}: SupabaseProjectsViewProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [confirmUnbind, setConfirmUnbind] = useState(false);
  const [unbinding, setUnbinding] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user) return [];
    const token = await user.getIdToken();
    return apiClient.listProviderProjects(token, connection.id);
  }, [user, connection.id]);

  const {
    data: projects,
    loading,
    error,
    refetch,
    invalidate,
  } = useApiData<ProviderProject[]>(
    PROVIDER_CACHE_KEYS.projects(connection.id),
    fetchProjects,
    [user?.uid, connection.id],
    { immediate: Boolean(user), ttl: 60_000, dependencies: [user?.uid, connection.id] },
  );

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

  const needsReconnect =
    error instanceof ApiRequestError && error.code === 'PROVIDER_CONNECTION_NOT_FOUND';

  const filtered = useMemo(() => {
    const list = projects ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.organization.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q),
    );
  }, [projects, query]);

  const handleReconnect = async () => {
    if (!user || oauthBusy) return;
    setOauthBusy(true);
    try {
      const token = await user.getIdToken();
      const result = await reconnectProviderOrganization(token, {
        connectionId: connection.id,
      });
      if (result.ok) {
        invalidate();
        await refetch();
        toast.success(
          result.organization ? `Reconnected ${result.organization}` : 'Organization reconnected',
        );
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to reconnect';
      const code = err instanceof ApiRequestError ? err.code : null;
      toast.error(formatProviderErrorToast(code, detail));
    } finally {
      setOauthBusy(false);
    }
  };

  const handleBind = async (project: ProviderProject) => {
    if (!user || !project.is_active || bindingId) return;
    setBindingId(project.id);
    try {
      const token = await user.getIdToken();
      await apiClient.bindWorkspaceProvider(token, workspaceId, {
        provider_project_id: project.id,
        provider_project_name: project.name,
        provider_organization: project.organization || connection.organization,
      });
      invalidateWorkspaceProviderCache(workspaceId);
      invalidateBinding();
      await refetchBinding();
      toast.success(`Connected ${project.name}`);
      onBound();
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to bind project';
      const code = err instanceof ApiRequestError ? err.code : null;
      if (code === 'PROVIDER_CONNECTION_NOT_FOUND') {
        toast.error(formatProviderErrorToast(code, detail));
        invalidate();
        await refetch();
      } else {
        toast.error(formatProviderErrorToast(code, detail));
      }
    } finally {
      setBindingId(null);
    }
  };

  const handleUnbind = async () => {
    if (!user) return;
    setUnbinding(true);
    try {
      const token = await user.getIdToken();
      await apiClient.unbindWorkspaceProvider(token, workspaceId);
      invalidateWorkspaceProviderCache(workspaceId);
      invalidateProviderProjectsCache(connection.id);
      invalidateBinding();
      await refetchBinding();
      toast.success('Workspace unbound from Supabase project');
      setConfirmUnbind(false);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to unbind';
      const code = err instanceof ApiRequestError ? err.code : null;
      toast.error(formatProviderErrorToast(code, detail));
    } finally {
      setUnbinding(false);
    }
  };

  return (
    <>
      <div className="ds-conn-list ds-conn-panel__body">
        {binding?.is_connected && binding.provider_project_name ? (
          <div className="ds-conn-list__binding">
            <span>
              Bound to <strong>{binding.provider_project_name}</strong>
            </span>
            <div className="ds-conn-list__binding-actions">
              <button
                type="button"
                className="ds-conn-list__add-btn"
                onClick={() => setConfirmUnbind(true)}
                aria-label="Unbind project"
              >
                <Unlink size={16} strokeWidth={2} />
                <span className="label">Unbind</span>
              </button>
            </div>
          </div>
        ) : null}

        {!needsReconnect && (
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
                placeholder="Search projects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search projects"
              />
            </div>
          </div>
        )}

        {loading && <p className="ds-conn-list__loading">Loading projects…</p>}

        {needsReconnect && !loading && (
          <div className="ds-conn-empty ds-conn-empty--warn">
            <div className="ds-conn-empty__icon" aria-hidden>
              <ConnectionReconnectIcon />
            </div>
            <h3 className="ds-conn-empty__title">Reconnect required</h3>
            <p className="ds-conn-empty__copy">
              The OAuth grant for {connection.organization} is missing or was revoked. Reconnect to
              list projects again.
            </p>
            <button
              type="button"
              className="ds-conn-empty__cta"
              onClick={() => void handleReconnect()}
              disabled={oauthBusy}
            >
              {oauthBusy ? 'Opening…' : 'Reconnect organization'}
            </button>
          </div>
        )}

        {error && !loading && !needsReconnect && (
          <div className="ds-conn-empty ds-conn-empty--error">
            <div className="ds-conn-empty__icon" aria-hidden>
              <ConnectionLoadErrorIcon />
            </div>
            <h3 className="ds-conn-empty__title">Couldn’t load projects</h3>
            <p className="ds-conn-empty__copy">
              {error.message ||
                'Something went wrong while listing projects for this organization.'}
            </p>
            <button type="button" className="ds-conn-empty__cta" onClick={() => void refetch()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="ds-conn-empty">
            <div className="ds-conn-empty__icon" aria-hidden>
              <ConnectionEmptyProjectsIcon />
            </div>
            <h3 className="ds-conn-empty__title">No projects found</h3>
            <p className="ds-conn-empty__copy">
              {query.trim()
                ? 'Try a different search.'
                : `No projects are available for ${connection.organization}.`}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="ds-conn-list__rows">
            {filtered.map((project) => {
              const isBound = binding?.is_connected && binding.provider_project_id === project.id;
              const busy = bindingId === project.id;
              let rowMeta = 'Inactive , cannot bind';
              if (busy) rowMeta = 'Connecting…';
              else if (isBound) rowMeta = 'Currently bound';
              else if (project.is_active) rowMeta = 'Tap to bind to this workspace';

              return (
                <button
                  key={project.id}
                  type="button"
                  className={`ds-conn-list__row ${!project.is_active ? 'is-inactive' : ''}`}
                  disabled={!project.is_active || Boolean(bindingId)}
                  onClick={() => void handleBind(project)}
                >
                  <div className="ds-conn-list__row-icon" aria-hidden>
                    <FolderKanban size={20} strokeWidth={1.75} />
                  </div>
                  <div className="ds-conn-list__row-text">
                    <span className="ds-conn-list__row-title">{project.name}</span>
                    <span className="ds-conn-list__row-meta">{rowMeta}</span>
                  </div>
                  <span className={`ds-conn-list__status ${project.is_active ? 'is-active' : ''}`}>
                    {project.is_active ? 'Active' : project.status}
                  </span>
                  {project.dashboard_url ? (
                    <a
                      href={project.dashboard_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ds-conn-list__row-action"
                      aria-label={`Open ${project.name} in Supabase`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={16} strokeWidth={2} />
                    </a>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmUnbind}
        title="Unbind project?"
        message="This workspace will no longer use the connected Supabase project."
        confirmText="Unbind"
        variant="warning"
        isLoading={unbinding}
        onConfirm={() => void handleUnbind()}
        onCancel={() => setConfirmUnbind(false)}
      />
    </>
  );
}

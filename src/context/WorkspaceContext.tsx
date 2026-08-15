import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../services/apiClient';
import { apiCacheManager } from '../utils/apiCacheManager';
import type {
  WorkspaceResponse,
  WorkspaceRole,
  WorkspaceUsageResponse,
  DataSourceResponse,
  WorkspaceContextResponse,
  ConnectorResponse,
} from '../types/api';
import {
  isDatasetStateError,
  isValidSessionIdForState,
  resolveDatasetIdForStateEndpoint,
} from '../lib/workspaceStateValidation';
import { writeSelectedDatasetId } from '../lib/selectedDatasourceStorage';
import { readActiveWorkspaceId, writeActiveWorkspaceId } from '../lib/uiMemory';
import {
  isWorkspaceRole,
  resolveBackendUserId,
  resolveCallerWorkspaceRole,
  resolveRoleFromContext,
} from '../utils/workspaceAccess';
import { isWorkspaceMemberSelf } from '../utils/workspaceMembers';
import { ApiRequestError } from '../utils/apiErrorMessage';
import { fetchAllPages } from '../utils/fetchAllPages';
import { LIST_PAGE_SIZE, MAX_LIST_PAGES } from '../constants/pagination';

interface WorkspaceContextType {
  workspaces: WorkspaceResponse[];
  currentWorkspace: WorkspaceResponse | null;
  setCurrentWorkspace: (workspace: WorkspaceResponse | null) => void;
  datasources: DataSourceResponse[];
  /** Set datasources directly (e.g. after hydration fetches them) so UI has data without waiting for context effect */
  setDatasources: (datasources: DataSourceResponse[]) => void;
  connectors: ConnectorResponse[];
  setConnectors: (connectors: ConnectorResponse[]) => void;
  workspaceContext: WorkspaceContextResponse | null;
  /** Caller's role in the current workspace (owner | member). */
  currentRole: WorkspaceRole | null;
  workspaceUsage: WorkspaceUsageResponse | null;
  loading: boolean;
  refreshWorkspaces: () => Promise<void>;
  /** Refetch datasources. Pass `{ silent: true }` to avoid flipping page-level loading. */
  refreshDatasources: (options?: { silent?: boolean }) => Promise<void>;
  /** Refetch connectors. Pass `{ silent: true }` to avoid flipping page-level loading. */
  refreshConnectors: (options?: { silent?: boolean }) => Promise<void>;
  refreshWorkspaceUsage: () => Promise<WorkspaceUsageResponse | null>;
  loadWorkspaceContext: (
    workspaceId: string,
    forceRefresh?: boolean,
  ) => Promise<WorkspaceContextResponse | null>;
  saveWorkspaceState: (
    workspaceId: string,
    datasetId?: string | null,
    sessionId?: string | null,
  ) => Promise<void>;
  invalidateContextCache: (workspaceId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Debounce delay for state saves (500ms)
const STATE_SAVE_DEBOUNCE_MS = 500;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceResponse | null>(null);
  const [datasources, setDatasources] = useState<DataSourceResponse[]>([]);
  const [connectors, setConnectors] = useState<ConnectorResponse[]>([]);
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContextResponse | null>(null);
  const [currentRole, setCurrentRole] = useState<WorkspaceRole | null>(null);
  const [workspaceUsage, setWorkspaceUsage] = useState<WorkspaceUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Ref to track if we've already loaded datasources for current workspace
  const loadedWorkspaceRef = useRef<string | null>(null);

  // Debounce timer for state saves
  const stateSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pending state to save (accumulated during debounce period)
  const pendingStateRef = useRef<{
    workspaceId: string;
    datasetId?: string | null;
    sessionId?: string | null;
  } | null>(null);

  const datasourcesRef = useRef(datasources);
  const connectorsRef = useRef(connectors);
  const loadingRef = useRef(loading);
  const sanitizedServerStateRef = useRef<string | null>(null);

  useEffect(() => {
    datasourcesRef.current = datasources;
    connectorsRef.current = connectors;
    loadingRef.current = loading;
  }, [datasources, connectors, loading]);

  // Persist workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      writeActiveWorkspaceId(currentWorkspace.id);
    }
  }, [currentWorkspace]);

  // Full reset when user signs out so the next login never inherits another account's workspace UI
  useEffect(() => {
    if (user) return;
    setWorkspaces([]);
    setCurrentWorkspace(null);
    setDatasources([]);
    setConnectors([]);
    setWorkspaceContext(null);
    setCurrentRole(null);
    setWorkspaceUsage(null);
    setIsInitialized(false);
    loadedWorkspaceRef.current = null;
    sanitizedServerStateRef.current = null;
  }, [user]);

  // Clear stale last_active_dataset_id on the server (e.g. deleted dataset still in DB state)
  useEffect(() => {
    if (!user || !currentWorkspace || !workspaceContext) return;
    if (workspaceContext.workspace.id !== currentWorkspace.id) return;
    if (loading) return;
    if (sanitizedServerStateRef.current === currentWorkspace.id) return;

    sanitizedServerStateRef.current = currentWorkspace.id;
    const serverDatasetId = workspaceContext.state.last_active_dataset_id;
    const resolved = resolveDatasetIdForStateEndpoint(serverDatasetId, datasources, connectors);
    if (!serverDatasetId || resolved !== null) return;

    void (async () => {
      try {
        const token = await user.getIdToken();
        await apiClient.updateWorkspaceState(token, currentWorkspace.id, {
          last_active_dataset_id: null,
          last_active_session_id: isValidSessionIdForState(
            workspaceContext.state.last_active_session_id,
          )
            ? workspaceContext.state.last_active_session_id
            : null,
        });
        apiCacheManager.invalidate('workspace-context', [token, currentWorkspace.id]);
      } catch (err) {
        if (!isDatasetStateError(err)) {
          console.warn('[WorkspaceContext] Could not clear stale server dataset state:', err);
        }
      }
    })();
  }, [user, currentWorkspace, workspaceContext, datasources, connectors, loading]);

  // Fetch workspaces - removed currentWorkspace from dependencies
  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      return;
    }

    try {
      setLoading(true);
      const token = await user.getIdToken();
      const listed = await fetchAllPages(
        (page, pageSize) => apiClient.listWorkspacesPaginated(token, { page, page_size: pageSize }),
        LIST_PAGE_SIZE,
        MAX_LIST_PAGES,
      );

      // Attach caller role when missing (list API now returns it; fall back via members/owner_id).
      const backendUserId = resolveBackendUserId(listed, user.uid, user.email);
      const fetchedWorkspaces = listed.map((workspace) => {
        if (isWorkspaceRole(workspace.role)) return workspace;
        const role = resolveCallerWorkspaceRole(workspace, user.uid, user.email, backendUserId);
        return role ? { ...workspace, role } : workspace;
      });
      setWorkspaces(fetchedWorkspaces);

      // Only set default workspace on initial load
      if (!isInitialized && fetchedWorkspaces.length > 0) {
        const savedWorkspaceId = readActiveWorkspaceId();
        let workspaceToSet: WorkspaceResponse | null = null;

        if (savedWorkspaceId) {
          workspaceToSet =
            fetchedWorkspaces.find((w: WorkspaceResponse) => w.id === savedWorkspaceId) || null;
        }

        if (!workspaceToSet) {
          workspaceToSet =
            fetchedWorkspaces.find((ws: WorkspaceResponse) => ws.is_default) ||
            fetchedWorkspaces[0];
        }

        setCurrentWorkspace(workspaceToSet);
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [user, isInitialized]);

  // Refresh datasources function using unified cache manager
  const refreshDatasources = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user || !currentWorkspace) {
        setDatasources([]);
        return;
      }

      // Keep existing catalog visible during background refetch after add/close.
      const showLoading = !options?.silent;
      try {
        if (showLoading) setLoading(true);
        const token = await user.getIdToken();
        if (!token || typeof token !== 'string' || token.length < 10) {
          console.warn('[WorkspaceContext] No valid token for datasources, skipping fetch');
          return;
        }

        // Always bypass stale cache so add/delete on other routes reflects immediately
        apiCacheManager.invalidate('datasources', [token, currentWorkspace.id]);

        const data = await apiCacheManager.fetch(
          'datasources',
          async (authToken: string, wId: string) => {
            return fetchAllPages(
              (page, pageSize) =>
                apiClient.listWorkspaceDatasourcesPaginated(authToken, wId, {
                  page,
                  page_size: pageSize,
                }),
              LIST_PAGE_SIZE,
              MAX_LIST_PAGES,
            );
          },
          [token, currentWorkspace.id],
        );

        setDatasources(data);
      } catch (error) {
        console.error('[WorkspaceContext] Failed to fetch datasources:', error);
        setDatasources([]);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [user, currentWorkspace],
  );

  // Refresh connectors function
  const refreshConnectors = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user || !currentWorkspace) {
        setConnectors([]);
        return;
      }

      const showLoading = !options?.silent;
      try {
        if (showLoading) setLoading(true);
        const token = await user.getIdToken();

        apiCacheManager.invalidate('connectors', [token, currentWorkspace.id]);

        const data = await apiCacheManager.fetch(
          'connectors',
          async (authToken: string, wId: string) => {
            return apiClient.listConnectors(authToken, wId);
          },
          [token, currentWorkspace.id],
        );

        setConnectors(data);
      } catch (error) {
        console.error('[WorkspaceContext] Failed to fetch connectors:', error);
        setConnectors([]);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [user, currentWorkspace],
  );

  // Load workspace context (state + metadata) using unified cache manager
  const loadWorkspaceContext = useCallback(
    async (
      workspaceId: string,
      forceRefresh: boolean = false,
    ): Promise<WorkspaceContextResponse | null> => {
      if (!user) return null;

      try {
        const token = await user.getIdToken();

        const data = await apiCacheManager.fetch(
          'workspace-context',
          async (authToken: string, wId: string) => {
            return apiClient.getWorkspaceContext(authToken, wId);
          },
          [token, workspaceId],
          forceRefresh ? { ttl: 0 } : undefined, // Force refresh by setting TTL to 0
        );

        setWorkspaceContext(data);

        let role = resolveRoleFromContext(data);
        if (!role && isWorkspaceRole(data.workspace?.role)) {
          role = data.workspace.role;
        }
        if (!role) {
          try {
            const membersPage = await apiClient.listWorkspaceMembers(token, workspaceId, {
              page: 1,
              page_size: 100,
            });
            const me = membersPage.items.find((m) =>
              isWorkspaceMemberSelf(m, user.uid, user.email),
            );
            role = me?.role ?? null;
          } catch (memberErr) {
            if (
              memberErr instanceof ApiRequestError &&
              (memberErr.status === 403 || memberErr.status === 404)
            ) {
              setCurrentRole(null);
              setWorkspaceContext(null);
              return null;
            }
            console.warn('[WorkspaceContext] Could not resolve role from members:', memberErr);
          }
        }
        setCurrentRole(role);
        if (role) {
          setWorkspaces((prev) =>
            prev.map((w) => (w.id === workspaceId && w.role !== role ? { ...w, role } : w)),
          );
        }
        return data;
      } catch (error) {
        console.error('[WorkspaceContext] Failed to load workspace context:', error);
        if (error instanceof ApiRequestError && (error.status === 403 || error.status === 404)) {
          setCurrentWorkspace(null);
        }
        setWorkspaceContext(null);
        setCurrentRole(null);
        return null;
      }
    },
    [user],
  );

  const refreshWorkspaceUsage = useCallback(async (): Promise<WorkspaceUsageResponse | null> => {
    if (!user || !currentWorkspace) {
      setWorkspaceUsage(null);
      return null;
    }
    try {
      const token = await user.getIdToken();
      const usage = await apiClient.getWorkspaceUsage(token, currentWorkspace.id);
      setWorkspaceUsage(usage);
      return usage;
    } catch (error) {
      console.warn('[WorkspaceContext] Failed to fetch workspace usage:', error);
      setWorkspaceUsage(null);
      return null;
    }
  }, [user, currentWorkspace]);

  // Fetch datasources and connectors when workspace changes
  useEffect(() => {
    if (!user || !currentWorkspace) {
      loadedWorkspaceRef.current = null;
      setDatasources([]);
      setConnectors([]);
      setWorkspaceContext(null);
      setCurrentRole(null);
      setWorkspaceUsage(null);
      return;
    }

    // Prefer role from list payload immediately when switching workspaces
    if (isWorkspaceRole(currentWorkspace.role)) {
      setCurrentRole(currentWorkspace.role);
    }

    // Only load if we haven't already loaded for this workspace
    if (loadedWorkspaceRef.current === currentWorkspace.id) {
      return;
    }

    loadedWorkspaceRef.current = currentWorkspace.id;
    void (async () => {
      try {
        await Promise.all([refreshDatasources(), refreshConnectors()]);
      } catch {
        // Individual refresh paths already log; continue to load persisted UI state
      }
      await loadWorkspaceContext(currentWorkspace.id);
      await refreshWorkspaceUsage();
    })();
  }, [
    user,
    currentWorkspace,
    refreshDatasources,
    refreshConnectors,
    loadWorkspaceContext,
    refreshWorkspaceUsage,
  ]);

  // Fetch workspaces on mount - only runs once when user changes
  useEffect(() => {
    if (user && !isInitialized) {
      refreshWorkspaces();
    }
  }, [user, isInitialized, refreshWorkspaces]);

  // Invalidate context cache for a workspace
  const invalidateContextCache = useCallback(
    (workspaceId: string) => {
      // We need to get the token to match the cache key
      if (!user) return;

      user
        .getIdToken()
        .then((token) => {
          apiCacheManager.invalidate('workspace-context', [token, workspaceId]);
          apiCacheManager.invalidate('workspace-sessions', [token, workspaceId]);
          console.log(
            '[WorkspaceContext] Invalidated context and sessions cache for workspace:',
            workspaceId,
          );
        })
        .catch((err) => {
          console.error('[WorkspaceContext] Failed to invalidate cache:', err);
        });
    },
    [user],
  );

  // Save workspace state with debouncing to prevent multiple rapid API calls
  const saveWorkspaceState = useCallback(
    async (
      workspaceId: string,
      datasetId?: string | null,
      sessionId?: string | null,
    ): Promise<void> => {
      if (!user) return;

      // Optimistically update local context so restore/404 effects don't keep re-PATCHing
      setWorkspaceContext((prev) => {
        if (prev?.workspace.id !== workspaceId) return prev;
        const nextState = { ...prev.state };
        if (datasetId !== undefined) {
          nextState.last_active_dataset_id = datasetId;
        }
        if (sessionId !== undefined) {
          nextState.last_active_session_id = isValidSessionIdForState(sessionId)
            ? sessionId
            : null;
        }
        if (
          nextState.last_active_dataset_id === prev.state.last_active_dataset_id &&
          nextState.last_active_session_id === prev.state.last_active_session_id
        ) {
          return prev;
        }
        return { ...prev, state: nextState };
      });

      // Store the pending state (will be merged/overwritten with subsequent calls)
      pendingStateRef.current = {
        workspaceId,
        datasetId,
        sessionId,
      };

      // Clear existing timer
      if (stateSaveTimerRef.current) {
        clearTimeout(stateSaveTimerRef.current);
      }

      // Set up debounced save
      stateSaveTimerRef.current = setTimeout(async () => {
        const stateToSave = pendingStateRef.current;
        if (!stateToSave) return;

        pendingStateRef.current = null;

        const dsList = datasourcesRef.current;
        const connList = connectorsRef.current;
        const listsEmpty = dsList.length === 0 && connList.length === 0;

        // Do not PATCH a dataset id until sources are loaded (prevents stale localStorage ids on hard refresh)
        if (listsEmpty && stateToSave.datasetId) {
          return;
        }

        const lastActiveDatasetId = resolveDatasetIdForStateEndpoint(
          stateToSave.datasetId,
          dsList,
          connList,
        );
        const lastActiveSessionId = isValidSessionIdForState(stateToSave.sessionId)
          ? stateToSave.sessionId!
          : null;

        try {
          const token = await user.getIdToken();
          await apiClient.updateWorkspaceState(token, stateToSave.workspaceId, {
            last_active_dataset_id: lastActiveDatasetId,
            last_active_session_id: lastActiveSessionId,
          });

          apiCacheManager.invalidate('workspace-context', [token, stateToSave.workspaceId]);
        } catch (error) {
          if (isDatasetStateError(error)) {
            writeSelectedDatasetId(user.uid, stateToSave.workspaceId, null);
            console.warn(
              '[WorkspaceContext] Skipped invalid dataset in workspace state (cleared local selection)',
            );
            return;
          }
          console.error('[WorkspaceContext] Failed to save workspace state:', error);
        }
      }, STATE_SAVE_DEBOUNCE_MS);
    },
    [user],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stateSaveTimerRef.current) {
        clearTimeout(stateSaveTimerRef.current);
      }
    };
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        datasources,
        setDatasources,
        connectors,
        setConnectors,
        workspaceContext,
        currentRole,
        workspaceUsage,
        loading,
        refreshWorkspaces,
        refreshDatasources,
        refreshConnectors,
        refreshWorkspaceUsage,
        loadWorkspaceContext,
        saveWorkspaceState,
        invalidateContextCache,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export { WorkspaceContext };

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

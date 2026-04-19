import { createContext, useState, useContext, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../services/apiClient';
import { apiCacheManager } from '../utils/apiCacheManager';
import type { WorkspaceResponse, DataSourceResponse, WorkspaceContextResponse, ConnectorResponse } from '../types/api';

interface WorkspaceContextType {
    workspaces: WorkspaceResponse[];
    currentWorkspace: WorkspaceResponse | null;
    setCurrentWorkspace: (workspace: WorkspaceResponse | null) => void;
    datasources: DataSourceResponse[];
    /** Set datasources directly (e.g. after hydration fetches them) so UI has data without waiting for context effect */
    setDatasources: (datasources: DataSourceResponse[]) => void;
    connectors: ConnectorResponse[];
    setConnectors: (connectors: ConnectorResponse[]) => void;
    // usage: WorkspaceContextResponse | null; // Renamed for clarity? No, let's call it workspaceContext to avoid confusion with UsageContext
    workspaceContext: WorkspaceContextResponse | null;
    loading: boolean;
    refreshWorkspaces: () => Promise<void>;
    refreshDatasources: () => Promise<void>;
    refreshConnectors: () => Promise<void>;
    loadWorkspaceContext: (workspaceId: string, forceRefresh?: boolean) => Promise<WorkspaceContextResponse | null>;
    saveWorkspaceState: (workspaceId: string, datasetId?: string | null, sessionId?: string | null) => Promise<void>;
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

    // Persist workspace changes
    useEffect(() => {
        if (currentWorkspace) {
            localStorage.setItem('activeWorkspaceId', currentWorkspace.id);
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
        setIsInitialized(false);
        loadedWorkspaceRef.current = null;
    }, [user]);

    // Fetch workspaces - removed currentWorkspace from dependencies
    const refreshWorkspaces = useCallback(async () => {
        if (!user) {
            setWorkspaces([]);
            return;
        }

        try {
            setLoading(true);
            const token = await user.getIdToken();
            const response = await apiClient.listWorkspaces(token);

            // Extract items from paginated response
            const fetchedWorkspaces = response.items;
            setWorkspaces(fetchedWorkspaces);

            // Only set default workspace on initial load
            if (!isInitialized && fetchedWorkspaces.length > 0) {
                const savedWorkspaceId = localStorage.getItem('activeWorkspaceId');
                let workspaceToSet: WorkspaceResponse | null = null;

                if (savedWorkspaceId) {
                    workspaceToSet = fetchedWorkspaces.find((w: WorkspaceResponse) => w.id === savedWorkspaceId) || null;
                }

                if (!workspaceToSet) {
                    workspaceToSet = fetchedWorkspaces.find((ws: WorkspaceResponse) => ws.is_default) || fetchedWorkspaces[0];
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
    const refreshDatasources = useCallback(async () => {
        if (!user || !currentWorkspace) {
            setDatasources([]);
            return;
        }

        try {
            setLoading(true);
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
                    const response = await apiClient.listWorkspaceDatasources(authToken, wId);
                    return response.items;
                },
                [token, currentWorkspace.id]
            );

            setDatasources(data);
        } catch (error) {
            console.error('[WorkspaceContext] Failed to fetch datasources:', error);
            setDatasources([]);
        } finally {
            setLoading(false);
        }
    }, [user, currentWorkspace]);

    // Refresh connectors function
    const refreshConnectors = useCallback(async () => {
        if (!user || !currentWorkspace) {
            setConnectors([]);
            return;
        }

        try {
            setLoading(true);
            const token = await user.getIdToken();

            apiCacheManager.invalidate('connectors', [token, currentWorkspace.id]);

            const data = await apiCacheManager.fetch(
                'connectors',
                async (authToken: string, wId: string) => {
                    return apiClient.listConnectors(authToken, wId);
                },
                [token, currentWorkspace.id]
            );

            setConnectors(data);
        } catch (error) {
            console.error('[WorkspaceContext] Failed to fetch connectors:', error);
            setConnectors([]);
        } finally {
            setLoading(false);
        }
    }, [user, currentWorkspace]);

    // Load workspace context (state + metadata) using unified cache manager
    const loadWorkspaceContext = useCallback(async (
        workspaceId: string,
        forceRefresh: boolean = false
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
                forceRefresh ? { ttl: 0 } : undefined // Force refresh by setting TTL to 0
            );

            setWorkspaceContext(data);
            return data;
        } catch (error) {
            console.error('[WorkspaceContext] Failed to load workspace context:', error);
            setWorkspaceContext(null);
            return null;
        }
    }, [user]);

    // Fetch datasources and connectors when workspace changes
    useEffect(() => {
        if (!user || !currentWorkspace) {
            loadedWorkspaceRef.current = null;
            setDatasources([]);
            setConnectors([]);
            setWorkspaceContext(null); // Clear context when workspace changes/clears
            return;
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
        })();
    }, [user, currentWorkspace, refreshDatasources, refreshConnectors, loadWorkspaceContext]);

    // Fetch workspaces on mount - only runs once when user changes
    useEffect(() => {
        if (user && !isInitialized) {
            refreshWorkspaces();
        }
    }, [user, isInitialized, refreshWorkspaces]);

    // Invalidate context cache for a workspace
    const invalidateContextCache = useCallback((workspaceId: string) => {
        // We need to get the token to match the cache key
        if (!user) return;

        user.getIdToken().then(token => {
            apiCacheManager.invalidate('workspace-context', [token, workspaceId]);
            apiCacheManager.invalidate('workspace-sessions', [token, workspaceId]);
            console.log('[WorkspaceContext] Invalidated context and sessions cache for workspace:', workspaceId);
        }).catch(err => {
            console.error('[WorkspaceContext] Failed to invalidate cache:', err);
        });
    }, [user]);

    // Save workspace state with debouncing to prevent multiple rapid API calls
    const saveWorkspaceState = useCallback(async (
        workspaceId: string,
        datasetId?: string | null,
        sessionId?: string | null
    ): Promise<void> => {
        if (!user) return;

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

            // Clear pending state
            pendingStateRef.current = null;

            try {
                console.log('[WorkspaceContext] Saving workspace state:', stateToSave);
                const token = await user.getIdToken();
                await apiClient.updateWorkspaceState(token, stateToSave.workspaceId, {
                    last_active_dataset_id: stateToSave.datasetId,
                    last_active_session_id: stateToSave.sessionId,
                });

                // Invalidate context cache since state changed
                apiCacheManager.invalidate('workspace-context', [token, stateToSave.workspaceId]);
            } catch (error) {
                // Silently fail - state saving is not critical
                console.error('[WorkspaceContext] Failed to save workspace state:', error);
            }
        }, STATE_SAVE_DEBOUNCE_MS);
    }, [user]);

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
                loading,
                refreshWorkspaces,
                refreshDatasources,
                refreshConnectors,
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


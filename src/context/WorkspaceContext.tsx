import { createContext, useState, useContext, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../services/apiClient';
import type { WorkspaceResponse, DataSourceResponse, WorkspaceContextResponse } from '../types/api';

interface WorkspaceContextType {
    workspaces: WorkspaceResponse[];
    currentWorkspace: WorkspaceResponse | null;
    setCurrentWorkspace: (workspace: WorkspaceResponse | null) => void;
    datasources: DataSourceResponse[];
    loading: boolean;
    refreshWorkspaces: () => Promise<void>;
    refreshDatasources: () => Promise<void>;
    loadWorkspaceContext: (workspaceId: string, forceRefresh?: boolean) => Promise<WorkspaceContextResponse | null>;
    saveWorkspaceState: (workspaceId: string, datasetId?: string | null, sessionId?: string | null) => Promise<void>;
    invalidateContextCache: (workspaceId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Cache for workspace context to prevent duplicate API calls
interface ContextCache {
    data: WorkspaceContextResponse;
    timestamp: number;
}

// Cache TTL in milliseconds (5 minutes)
const CONTEXT_CACHE_TTL = 5 * 60 * 1000;

// Debounce delay for state saves (500ms)
const STATE_SAVE_DEBOUNCE_MS = 500;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceResponse | null>(null);
    const [datasources, setDatasources] = useState<DataSourceResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Ref to track if we've already loaded datasources for current workspace
    const loadedWorkspaceRef = useRef<string | null>(null);

    // Cache for workspace context responses
    const contextCacheRef = useRef<Map<string, ContextCache>>(new Map());

    // Track in-flight context requests to prevent duplicate calls
    const pendingContextRequestsRef = useRef<Map<string, Promise<WorkspaceContextResponse | null>>>(new Map());

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

    // Fetch workspaces - removed currentWorkspace from dependencies
    const refreshWorkspaces = useCallback(async () => {
        if (!user) {
            setWorkspaces([]);
            return;
        }

        try {
            setLoading(true);
            const token = await user.getIdToken();
            const fetchedWorkspaces = await apiClient.listWorkspaces(token);
            setWorkspaces(fetchedWorkspaces);

            // Only set default workspace on initial load
            if (!isInitialized && fetchedWorkspaces.length > 0) {
                const savedWorkspaceId = localStorage.getItem('activeWorkspaceId');
                let workspaceToSet: WorkspaceResponse | null = null;

                if (savedWorkspaceId) {
                    workspaceToSet = fetchedWorkspaces.find(w => w.id === savedWorkspaceId) || null;
                }

                if (!workspaceToSet) {
                    workspaceToSet = fetchedWorkspaces.find(ws => ws.is_default) || fetchedWorkspaces[0];
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

    // Refresh datasources function
    const refreshDatasources = useCallback(async () => {
        if (!user || !currentWorkspace) {
            setDatasources([]);
            return;
        }

        try {
            setLoading(true);
            const token = await user.getIdToken();
            const fetchedDatasources = await apiClient.listWorkspaceDatasources(token, currentWorkspace.id);
            setDatasources(fetchedDatasources);
        } catch (error) {
            console.error('Failed to fetch datasources:', error);
            setDatasources([]);
        } finally {
            setLoading(false);
        }
    }, [user, currentWorkspace]);

    // Fetch datasources when workspace changes
    useEffect(() => {
        if (!user || !currentWorkspace) {
            loadedWorkspaceRef.current = null;
            setDatasources([]);
            return;
        }

        // Only load if we haven't already loaded for this workspace
        if (loadedWorkspaceRef.current === currentWorkspace.id) {
            return;
        }

        loadedWorkspaceRef.current = currentWorkspace.id;
        refreshDatasources();
    }, [user, currentWorkspace, refreshDatasources]);

    // Fetch workspaces on mount - only runs once when user changes
    useEffect(() => {
        if (user && !isInitialized) {
            refreshWorkspaces();
        }
    }, [user, isInitialized, refreshWorkspaces]);

    // Load workspace context (state + metadata) with caching and deduplication
    const loadWorkspaceContext = useCallback(async (
        workspaceId: string,
        forceRefresh: boolean = false
    ): Promise<WorkspaceContextResponse | null> => {
        if (!user) return null;

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = contextCacheRef.current.get(workspaceId);
            if (cached && (Date.now() - cached.timestamp) < CONTEXT_CACHE_TTL) {
                console.log('[WorkspaceContext] Returning cached context for workspace:', workspaceId);
                return cached.data;
            }
        }

        // Check if there's already a pending request for this workspace
        const pendingRequest = pendingContextRequestsRef.current.get(workspaceId);
        if (pendingRequest) {
            console.log('[WorkspaceContext] Waiting for pending context request for workspace:', workspaceId);
            return pendingRequest;
        }

        // Create new request
        const requestPromise = (async (): Promise<WorkspaceContextResponse | null> => {
            try {
                console.log('[WorkspaceContext] Fetching context for workspace:', workspaceId);
                const token = await user.getIdToken();
                const context = await apiClient.getWorkspaceContext(token, workspaceId);

                // Cache the result
                contextCacheRef.current.set(workspaceId, {
                    data: context,
                    timestamp: Date.now(),
                });

                return context;
            } catch (error) {
                console.error('[WorkspaceContext] Failed to load workspace context:', error);
                return null;
            } finally {
                // Remove from pending requests
                pendingContextRequestsRef.current.delete(workspaceId);
            }
        })();

        // Store pending request
        pendingContextRequestsRef.current.set(workspaceId, requestPromise);

        return requestPromise;
    }, [user]);

    // Invalidate context cache for a workspace
    const invalidateContextCache = useCallback((workspaceId: string) => {
        contextCacheRef.current.delete(workspaceId);
    }, []);

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
                contextCacheRef.current.delete(stateToSave.workspaceId);
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
                loading,
                refreshWorkspaces,
                refreshDatasources,
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

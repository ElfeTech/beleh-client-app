import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { ChatSessionRead } from '../types/api';
import { apiClient } from '../services/apiClient';
import { apiCacheManager } from '../utils/apiCacheManager';
import { useWorkspace } from './WorkspaceContext';
import { useAuth } from './useAuth';

interface ChatSessionContextType {
    sessions: ChatSessionRead[];
    setSessions: (sessions: ChatSessionRead[]) => void;
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    addSession: (session: ChatSessionRead) => ChatSessionRead;
    removeSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => Promise<boolean>;
    renameSession: (sessionId: string, newTitle: string) => Promise<ChatSessionRead | null>;
    loadWorkspaceSessions: (workspaceId: string, force?: boolean) => Promise<ChatSessionRead[]>;
    refreshSessions: () => Promise<ChatSessionRead[]>;
    invalidateWorkspaceSessions: (workspaceId: string) => void;
    isLoading: boolean;
    /** @deprecated Use loadWorkspaceSessions */
    loadSessions: (datasourceId: string, force?: boolean) => Promise<ChatSessionRead[]>;
    /** @deprecated Use invalidateWorkspaceSessions */
    invalidateSessions: (datasourceId: string) => void;
}

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(undefined);

export { ChatSessionContext };

export function ChatSessionProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { currentWorkspace, workspaceContext } = useWorkspace();
    const [sessions, setSessions] = useState<ChatSessionRead[]>([]);
    
    // Initialize from localStorage if available, but filter out legacy mock IDs
    const [activeSessionId, setActiveSessionIdState] = useState<string | null>(() => {
        const savedId = localStorage.getItem('activeSessionId');
        // If it's a legacy mock ID or invalid, ignore it
        if (savedId === '1' || savedId === 'undefined') return null;
        return savedId;
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const previousUserIdRef = useRef<string | null>(null);
    const activeSessionIdRef = useRef<string | null>(activeSessionId);
    activeSessionIdRef.current = activeSessionId;

    // Wrapper to persist to localStorage
    const setActiveSessionId = useCallback((id: string | null) => {
        if (id && id !== '1' && id !== 'undefined') {
            localStorage.setItem('activeSessionId', id);
        } else {
            localStorage.removeItem('activeSessionId');
        }
        setActiveSessionIdState(id === '1' ? null : id);
    }, []);

    // Clear session list when auth ends or account switches (workspace effect reloads for new user)
    useEffect(() => {
        const uid = user?.uid ?? null;
        if (!uid) {
            setSessions([]);
            setActiveSessionId(null);
            previousUserIdRef.current = null;
            return;
        }
        if (previousUserIdRef.current !== null && previousUserIdRef.current !== uid) {
            setSessions([]);
            setActiveSessionId(null);
        }
        previousUserIdRef.current = uid;
    }, [user?.uid, setActiveSessionId]);

    /**
     * Load sessions for a workspace using unified cache manager
     */
    const loadWorkspaceSessions = useCallback(async (workspaceId: string, force = false) => {
        if (!user || !workspaceId || workspaceId === 'undefined') return [];
        
        setIsLoading(true);

        try {
            const token = await user.getIdToken();
            const data = await apiCacheManager.fetch(
                'workspace-sessions',
                async (authToken: string, wId: string) => {
                    const response = await apiClient.listWorkspaceSessions(authToken, wId);
                    return response.items;
                },
                [token, workspaceId],
                force ? { ttl: 0 } : undefined
            );

            setSessions(data);

            // Validation: Ensure persisted activeSessionId actually exists in this workspace
            // Also check for legacy ID '1' (read from ref so this callback does not depend on activeSessionId)
            const persisted = activeSessionIdRef.current;
            if (persisted && persisted !== '1') {
                const sessionExists = data.some(s => s.id === persisted);
                if (!sessionExists && data.length > 0) {
                    console.warn('[ChatSessionContext] Persisted session not found in workspace, clearing.');
                    setActiveSessionId(null);
                }
            } else if (persisted === '1') {
                setActiveSessionId(null);
            }

            return data;
        } catch (err) {
            console.error('[ChatSessionContext] Failed to load workspace sessions:', err);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [user, setActiveSessionId]);

    /**
     * Refresh current workspace sessions
     */
    const refreshSessions = useCallback(async () => {
        if (currentWorkspace) {
            return loadWorkspaceSessions(currentWorkspace.id, true);
        }
        return [];
    }, [currentWorkspace, loadWorkspaceSessions]);

    // Automatically load sessions when workspace changes
    useEffect(() => {
        if (currentWorkspace) {
            loadWorkspaceSessions(currentWorkspace.id);
        } else {
            setSessions([]);
            // Do not clear persisted session while workspace is still bootstrapping (user is signed in)
            if (!user) {
                setActiveSessionId(null);
            }
        }
    }, [currentWorkspace, loadWorkspaceSessions, user, setActiveSessionId]);

    // After refresh, restore active session from server state if local selection is missing or invalid
    useEffect(() => {
        if (!currentWorkspace?.id) return;
        if (!workspaceContext || workspaceContext.workspace.id !== currentWorkspace.id) return;
        if (sessions.length === 0) return;

        const sid = workspaceContext.state.last_active_session_id;
        if (!sid || sid === '1' || sid === 'undefined') return;
        if (!sessions.some((s) => s.id === sid)) return;

        const currentValid = Boolean(
            activeSessionId && sessions.some((s) => s.id === activeSessionId)
        );
        if (!currentValid) {
            setActiveSessionId(sid);
        }
    }, [
        currentWorkspace?.id,
        workspaceContext,
        sessions,
        activeSessionId,
        setActiveSessionId,
    ]);

    /**
     * Invalidate cached sessions for a workspace
     */
    const invalidateWorkspaceSessions = useCallback((workspaceId: string) => {
        if (!user) return;

        user.getIdToken().then(token => {
            apiCacheManager.invalidate('workspace-sessions', [token, workspaceId]);
            console.log('[ChatSessionContext] Invalidated sessions cache for workspace:', workspaceId);
        }).catch(err => {
            console.error('[ChatSessionContext] Failed to invalidate sessions cache:', err);
        });
    }, [user]);

    const addSession = useCallback((session: ChatSessionRead) => {
        setSessions(prev => {
            // Avoid duplicates
            if (prev.some(s => s.id === session.id)) {
                return prev.map(s => s.id === session.id ? session : s);
            }
            return [session, ...prev];
        });

        // Invalidate cache to keep it in sync with the new session
        if (currentWorkspace) {
            invalidateWorkspaceSessions(currentWorkspace.id);
        }

        return session;
    }, [currentWorkspace, invalidateWorkspaceSessions]);

    const removeSession = useCallback((sessionId: string) => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (activeSessionId === sessionId) {
            setActiveSessionId(null);
        }

        // Invalidate cache
        if (currentWorkspace) {
            invalidateWorkspaceSessions(currentWorkspace.id);
        }
    }, [activeSessionId, currentWorkspace, invalidateWorkspaceSessions, setActiveSessionId]);

    const deleteSession = useCallback(async (sessionId: string) => {
        if (!user) return false;
        try {
            const token = await user.getIdToken();
            await apiClient.deleteChatSession(token, sessionId);
            removeSession(sessionId);
            return true;
        } catch (err) {
            console.error('[ChatSessionContext] Failed to delete session:', err);
            return false;
        }
    }, [user, removeSession]);

    const renameSession = useCallback(async (sessionId: string, newTitle: string) => {
        if (!user) return null;
        try {
            const token = await user.getIdToken();
            const updated = await apiClient.updateChatSession(token, sessionId, { title: newTitle });
            
            // Update local state
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
            
            // Invalidate cache
            if (currentWorkspace) {
                invalidateWorkspaceSessions(currentWorkspace.id);
            }
            
            return updated;
        } catch (err) {
            console.error('[ChatSessionContext] Failed to rename session:', err);
            return null;
        }
    }, [user, currentWorkspace, invalidateWorkspaceSessions]);

    /**
     * @deprecated Use loadWorkspaceSessions
     */
    const loadSessions = useCallback(async (datasourceId: string, force = false) => {
        if (!currentWorkspace) return [];
        
        // Ensure workspace sessions are loaded
        const allSessions = await loadWorkspaceSessions(currentWorkspace.id, force);
        
        // Filter by datasource for backward compatibility
        return allSessions.filter(s => s.dataset_id === datasourceId);
    }, [currentWorkspace, loadWorkspaceSessions]);

    /**
     * @deprecated Use invalidateWorkspaceSessions
     */
    const invalidateSessions = useCallback((_datasourceId: string) => {
        if (currentWorkspace) {
            invalidateWorkspaceSessions(currentWorkspace.id);
        }
    }, [currentWorkspace, invalidateWorkspaceSessions]);

    return (
        <ChatSessionContext.Provider
            value={{
                sessions,
                setSessions,
                activeSessionId,
                setActiveSessionId,
                addSession,
                removeSession,
                deleteSession,
                renameSession,
                loadWorkspaceSessions,
                refreshSessions,
                invalidateWorkspaceSessions,
                loadSessions,
                invalidateSessions,
                isLoading
            }}
        >
            {children}
        </ChatSessionContext.Provider>
    );
}

export function useChatSession() {
    const context = useContext(ChatSessionContext);
    if (!context) {
        throw new Error('useChatSession must be used within ChatSessionProvider');
    }
    return context;
}

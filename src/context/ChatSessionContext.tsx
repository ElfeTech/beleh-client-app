import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { ChatSessionRead } from '../types/api';
import { apiClient } from '../services/apiClient';
import { apiCacheManager } from '../utils/apiCacheManager';
import { useWorkspace } from './WorkspaceContext';
import { useAuth } from './useAuth';
import { readActiveSessionId, writeActiveSessionId, migrateLegacyUiMemory } from '../lib/uiMemory';
import { INITIAL_PAGE, LIST_PAGE_SIZE } from '../constants/pagination';

interface ChatSessionContextType {
  sessions: ChatSessionRead[];
  setSessions: (sessions: ChatSessionRead[]) => void;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  /** True while user clicked New chat , no session in URL/context until first message or picking a thread. */
  isNewChatDraft: boolean;
  /** True after sessions have been fetched for the current workspace (including empty list). */
  sessionsReady: boolean;
  /** Clear active session and suppress auto-restore from workspace state (sidebar New chat). */
  startNewChat: () => void;
  addSession: (session: ChatSessionRead) => ChatSessionRead;
  removeSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => Promise<boolean>;
  renameSession: (sessionId: string, newTitle: string) => Promise<ChatSessionRead | null>;
  loadWorkspaceSessions: (workspaceId: string, force?: boolean) => Promise<ChatSessionRead[]>;
  /** Load the next page of recent chats when available. */
  loadMoreSessions: () => Promise<ChatSessionRead[]>;
  sessionsHasMore: boolean;
  isLoadingMoreSessions: boolean;
  refreshSessions: (workspaceId?: string) => Promise<ChatSessionRead[]>;
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
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, workspaceContext, saveWorkspaceState } = useWorkspace();
  const [sessions, setSessions] = useState<ChatSessionRead[]>([]);

  // Initialize from localStorage if available, but filter out legacy mock IDs
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(() => {
    return readActiveSessionId();
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMoreSessions, setIsLoadingMoreSessions] = useState(false);
  const [sessionsHasMore, setSessionsHasMore] = useState(false);
  const [sessionsPage, setSessionsPage] = useState(INITIAL_PAGE);
  const sessionsWorkspaceIdRef = useRef<string | null>(null);
  const [isNewChatDraft, setIsNewChatDraft] = useState(false);
  /** Workspace id for which `sessions` reflects a completed fetch (may be empty). */
  const [sessionsReadyForId, setSessionsReadyForId] = useState<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(activeSessionId);
  activeSessionIdRef.current = activeSessionId;
  const suppressSessionRestoreRef = useRef(false);
  const workspaceContextRef = useRef(workspaceContext);
  workspaceContextRef.current = workspaceContext;
  const saveWorkspaceStateRef = useRef(saveWorkspaceState);
  saveWorkspaceStateRef.current = saveWorkspaceState;

  const sessionsReady = Boolean(currentWorkspace?.id && sessionsReadyForId === currentWorkspace.id);

  useEffect(() => {
    migrateLegacyUiMemory(user?.uid);
  }, [user?.uid]);

  // Wrapper to persist to localStorage
  const setActiveSessionId = useCallback((id: string | null) => {
    if (id && id !== '1' && id !== 'undefined') {
      suppressSessionRestoreRef.current = false;
      setIsNewChatDraft(false);
      writeActiveSessionId(id);
    } else {
      writeActiveSessionId(null);
    }
    setActiveSessionIdState(id === '1' ? null : id);
  }, []);

  const startNewChat = useCallback(() => {
    suppressSessionRestoreRef.current = true;
    setIsNewChatDraft(true);
    setActiveSessionId(null);

    const wid = currentWorkspace?.id;
    if (wid && wid !== 'undefined') {
      const datasetId =
        workspaceContext?.workspace.id === wid
          ? workspaceContext.state.last_active_dataset_id
          : null;
      void saveWorkspaceState(wid, datasetId, null);
    }
  }, [setActiveSessionId, currentWorkspace?.id, workspaceContext, saveWorkspaceState]);

  // Clear session list when auth ends or account switches (workspace effect reloads for new user).
  // Do NOT clear while Firebase is still initializing , that would wipe activeSessionId from
  // localStorage on every refresh and break in-flight chat-run resume.
  useEffect(() => {
    if (authLoading) return;

    const uid = user?.uid ?? null;
    if (!uid) {
      setSessions([]);
      setActiveSessionId(null);
      setIsNewChatDraft(false);
      previousUserIdRef.current = null;
      return;
    }
    if (previousUserIdRef.current !== null && previousUserIdRef.current !== uid) {
      setSessions([]);
      setActiveSessionId(null);
      setIsNewChatDraft(false);
    }
    previousUserIdRef.current = uid;
  }, [user?.uid, authLoading, setActiveSessionId]);

  /**
   * Load sessions for a workspace using unified cache manager (first page).
   */
  const loadWorkspaceSessions = useCallback(
    async (workspaceId: string, force = false) => {
      if (!user || !workspaceId || workspaceId === 'undefined') return [];

      setIsLoading(true);
      setSessionsReadyForId(null);
      setSessionsHasMore(false);
      setSessionsPage(INITIAL_PAGE);
      sessionsWorkspaceIdRef.current = workspaceId;

      try {
        const token = await user.getIdToken();
        const data = await apiCacheManager.fetch(
          'workspace-sessions',
          async (authToken: string, wId: string) => {
            const response = await apiClient.listWorkspaceSessionsPaginated(authToken, wId, {
              page: INITIAL_PAGE,
              page_size: LIST_PAGE_SIZE,
            });
            return {
              items: response.items,
              has_next: Boolean(response.has_next),
            };
          },
          [token, workspaceId],
          force ? { ttl: 0 } : undefined,
        );

        // Tolerate older cache entries that stored a bare session array.
        const items = Array.isArray(data) ? data : (data.items ?? []);
        const hasNext = Array.isArray(data) ? false : Boolean(data.has_next);

        setSessions(items);
        setSessionsHasMore(hasNext);
        setSessionsPage(INITIAL_PAGE);

        // Clear persisted / active id when missing from this user's session list
        // (includes empty list , another user's deep link or deleted session).
        const persisted = activeSessionIdRef.current;
        if (persisted && persisted !== '1') {
          const sessionExists = items.some((s) => s.id === persisted);
          if (!sessionExists) {
            console.warn(
              '[ChatSessionContext] Persisted session not found in workspace, clearing.',
            );
            setActiveSessionId(null);
            const ctx = workspaceContextRef.current;
            const datasetId =
              ctx?.workspace.id === workspaceId ? ctx.state.last_active_dataset_id : null;
            void saveWorkspaceStateRef.current(workspaceId, datasetId, null);
          }
        } else if (persisted === '1') {
          setActiveSessionId(null);
        }

        return items;
      } catch (err) {
        console.error('[ChatSessionContext] Failed to load workspace sessions:', err);
        setSessions([]);
        setSessionsHasMore(false);
        return [];
      } finally {
        setSessionsReadyForId(workspaceId);
        setIsLoading(false);
      }
    },
    [user, setActiveSessionId],
  );

  const loadMoreSessions = useCallback(async () => {
    const workspaceId = sessionsWorkspaceIdRef.current ?? currentWorkspace?.id;
    if (!user || !workspaceId || !sessionsHasMore || isLoadingMoreSessions) {
      return sessions;
    }

    const nextPage = sessionsPage + 1;
    setIsLoadingMoreSessions(true);
    try {
      const token = await user.getIdToken();
      const response = await apiClient.listWorkspaceSessionsPaginated(token, workspaceId, {
        page: nextPage,
        page_size: LIST_PAGE_SIZE,
      });
      const merged = [...sessions];
      for (const item of response.items) {
        if (!merged.some((s) => s.id === item.id)) merged.push(item);
      }
      setSessions(merged);
      setSessionsHasMore(Boolean(response.has_next));
      setSessionsPage(nextPage);
      return merged;
    } catch (err) {
      console.error('[ChatSessionContext] Failed to load more sessions:', err);
      return sessions;
    } finally {
      setIsLoadingMoreSessions(false);
    }
  }, [user, currentWorkspace?.id, sessions, sessionsHasMore, sessionsPage, isLoadingMoreSessions]);

  /**
   * Refresh current workspace sessions
   */
  const refreshSessions = useCallback(
    async (workspaceId?: string) => {
      const wid = workspaceId ?? currentWorkspace?.id;
      if (!wid || wid === 'undefined') return [];
      return loadWorkspaceSessions(wid, true);
    },
    [currentWorkspace, loadWorkspaceSessions],
  );

  // Automatically load sessions when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      setSessionsReadyForId(null);
      loadWorkspaceSessions(currentWorkspace.id);
    } else {
      setSessions([]);
      setSessionsHasMore(false);
      setSessionsPage(INITIAL_PAGE);
      setSessionsReadyForId(null);
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
    if (!sessionsReady) return;
    if (suppressSessionRestoreRef.current) return;
    if (isNewChatDraft) return;

    const sid = workspaceContext.state.last_active_session_id;
    if (!sid || sid === '1' || sid === 'undefined') return;

    // Stale server pointer (another user's session, deleted, or cleared) , null it out.
    if (!sessions.some((s) => s.id === sid)) {
      const datasetId = workspaceContext.state.last_active_dataset_id;
      void saveWorkspaceState(currentWorkspace.id, datasetId, null);
      return;
    }

    const currentValid = Boolean(activeSessionId && sessions.some((s) => s.id === activeSessionId));
    if (!currentValid) {
      setActiveSessionId(sid);
    }
  }, [
    currentWorkspace?.id,
    workspaceContext,
    sessions,
    sessionsReady,
    activeSessionId,
    setActiveSessionId,
    isNewChatDraft,
    saveWorkspaceState,
  ]);

  /**
   * Invalidate cached sessions for a workspace
   */
  const invalidateWorkspaceSessions = useCallback(
    (workspaceId: string) => {
      if (!user) return;

      user
        .getIdToken()
        .then((token) => {
          apiCacheManager.invalidate('workspace-sessions', [token, workspaceId]);
          console.log(
            '[ChatSessionContext] Invalidated sessions cache for workspace:',
            workspaceId,
          );
        })
        .catch((err) => {
          console.error('[ChatSessionContext] Failed to invalidate sessions cache:', err);
        });
    },
    [user],
  );

  const addSession = useCallback(
    (session: ChatSessionRead) => {
      setSessions((prev) => {
        // Avoid duplicates
        if (prev.some((s) => s.id === session.id)) {
          return prev.map((s) => (s.id === session.id ? session : s));
        }
        return [session, ...prev];
      });

      // Invalidate cache to keep it in sync with the new session
      if (currentWorkspace) {
        invalidateWorkspaceSessions(currentWorkspace.id);
      }

      return session;
    },
    [currentWorkspace, invalidateWorkspaceSessions],
  );

  const removeSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }

      // Invalidate cache
      if (currentWorkspace) {
        invalidateWorkspaceSessions(currentWorkspace.id);
      }
    },
    [activeSessionId, currentWorkspace, invalidateWorkspaceSessions, setActiveSessionId],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
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
    },
    [user, removeSession],
  );

  const renameSession = useCallback(
    async (sessionId: string, newTitle: string) => {
      if (!user) return null;
      try {
        const token = await user.getIdToken();
        const updated = await apiClient.updateChatSession(token, sessionId, { title: newTitle });

        // Update local state
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s)),
        );

        // Invalidate cache
        if (currentWorkspace) {
          invalidateWorkspaceSessions(currentWorkspace.id);
        }

        return updated;
      } catch (err) {
        console.error('[ChatSessionContext] Failed to rename session:', err);
        return null;
      }
    },
    [user, currentWorkspace, invalidateWorkspaceSessions],
  );

  /**
   * @deprecated Use loadWorkspaceSessions
   */
  const loadSessions = useCallback(
    async (datasourceId: string, force = false) => {
      if (!currentWorkspace) return [];

      // Ensure workspace sessions are loaded
      const allSessions = await loadWorkspaceSessions(currentWorkspace.id, force);

      // Filter by datasource for backward compatibility
      return allSessions.filter((s) => s.dataset_id === datasourceId);
    },
    [currentWorkspace, loadWorkspaceSessions],
  );

  /**
   * @deprecated Use invalidateWorkspaceSessions
   */
  const invalidateSessions = useCallback(
    (_datasourceId: string) => {
      if (currentWorkspace) {
        invalidateWorkspaceSessions(currentWorkspace.id);
      }
    },
    [currentWorkspace, invalidateWorkspaceSessions],
  );

  return (
    <ChatSessionContext.Provider
      value={{
        sessions,
        setSessions,
        activeSessionId,
        setActiveSessionId,
        isNewChatDraft,
        sessionsReady,
        startNewChat,
        addSession,
        removeSession,
        deleteSession,
        renameSession,
        loadWorkspaceSessions,
        loadMoreSessions,
        sessionsHasMore,
        isLoadingMoreSessions,
        refreshSessions,
        invalidateWorkspaceSessions,
        loadSessions,
        invalidateSessions,
        isLoading,
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

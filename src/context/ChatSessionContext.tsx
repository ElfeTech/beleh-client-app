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
import { sortByUpdatedAtDesc } from '../utils/sortByUpdatedAt';

interface ChatSessionContextType {
  sessions: ChatSessionRead[];
  setSessions: (
    sessions: ChatSessionRead[] | ((prev: ChatSessionRead[]) => ChatSessionRead[]),
  ) => void;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  /** True while user clicked New chat , no session in URL/context until first message or picking a thread. */
  isNewChatDraft: boolean;
  /** True after sessions have been fetched for the current workspace (including empty list). */
  sessionsReady: boolean;
  /** True when the last session-list fetch failed (list may be stale or empty). */
  sessionsLoadError: boolean;
  /** Clear active session and suppress auto-restore from workspace state (sidebar New chat). */
  startNewChat: () => void;
  addSession: (session: ChatSessionRead) => ChatSessionRead;
  /** Bump a session to the top after new activity (uses current time when API does not return updated_at). */
  touchSession: (sessionId: string) => void;
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
  const [sessions, setSessionsState] = useState<ChatSessionRead[]>([]);
  const setSessions = useCallback(
    (next: ChatSessionRead[] | ((prev: ChatSessionRead[]) => ChatSessionRead[])) => {
      setSessionsState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        return sortByUpdatedAtDesc(resolved);
      });
    },
    [],
  );

  // Initialize from localStorage if available, but filter out legacy mock IDs
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(() => {
    return readActiveSessionId();
  });

  const [isLoading, setIsLoading] = useState(false);
  const [sessionsLoadError, setSessionsLoadError] = useState(false);
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
  /** Avoid repeated workspace-state clears for the same missing last_active_session_id. */
  const clearedStaleSessionRef = useRef<string | null>(null);
  /** Sessions removed intentionally — suppress GenerativeChat 404 toasts. */
  const intentionallyDeletedIdsRef = useRef<Set<string>>(new Set());
  const workspaceContextRef = useRef(workspaceContext);
  workspaceContextRef.current = workspaceContext;
  const saveWorkspaceStateRef = useRef(saveWorkspaceState);
  saveWorkspaceStateRef.current = saveWorkspaceState;

  const sessionsReady = Boolean(currentWorkspace?.id && sessionsReadyForId === currentWorkspace.id);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

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

      const previousWorkspaceId = sessionsWorkspaceIdRef.current;
      setIsLoading(true);
      setSessionsLoadError(false);
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

        const items = sortByUpdatedAtDesc(Array.isArray(data) ? data : (data.items ?? [])).filter(
          (s) => !intentionallyDeletedIdsRef.current.has(s.id),
        );
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
        setSessionsLoadError(true);
        // Keep the previous list when it belongs to this workspace so a transient
        // failure doesn't blank the sidebar; clear it when switching workspaces.
        if (previousWorkspaceId !== workspaceId) {
          setSessions([]);
        }
        setSessionsHasMore(false);
        // Explicit refreshes must not report success on failure.
        if (force) throw err;
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
      const byId = new Map<string, (typeof sessions)[number]>();
      for (const item of sessions) byId.set(item.id, item);
      for (const item of response.items) {
        if (intentionallyDeletedIdsRef.current.has(item.id)) continue;
        const existing = byId.get(item.id);
        if (!existing) {
          byId.set(item.id, item);
          continue;
        }
        const existingTime = Date.parse(existing.updated_at || existing.created_at || '') || 0;
        const nextTime = Date.parse(item.updated_at || item.created_at || '') || 0;
        byId.set(item.id, nextTime >= existingTime ? item : existing);
      }
      const merged = sortByUpdatedAtDesc([...byId.values()]);
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
    // A failed list fetch proves nothing about the server pointer — never treat it as stale.
    if (sessionsLoadError) return;
    if (suppressSessionRestoreRef.current) return;
    if (isNewChatDraft) return;

    const sid = workspaceContext.state.last_active_session_id;
    if (!sid || sid === '1' || sid === 'undefined') {
      clearedStaleSessionRef.current = null;
      return;
    }

    // Stale server pointer (another user's session, deleted, or cleared) — null it out once.
    if (!sessions.some((s) => s.id === sid)) {
      if (clearedStaleSessionRef.current !== sid) {
        clearedStaleSessionRef.current = sid;
        const datasetId = workspaceContext.state.last_active_dataset_id;
        void saveWorkspaceState(currentWorkspace.id, datasetId, null);
      }
      return;
    }

    clearedStaleSessionRef.current = null;

    const currentValid = Boolean(activeSessionId && sessions.some((s) => s.id === activeSessionId));
    if (!currentValid) {
      setActiveSessionId(sid);
    }
  }, [
    currentWorkspace?.id,
    workspaceContext,
    sessions,
    sessionsReady,
    sessionsLoadError,
    activeSessionId,
    setActiveSessionId,
    isNewChatDraft,
    saveWorkspaceState,
  ]);

  /**
   * Invalidate cached sessions for a workspace
   */
  // Workspace id is accepted by the interface but unused: all session list entries are
  // dropped so a token-keyed miss cannot revive a deleted chat.
  const invalidateWorkspaceSessions = useCallback<(workspaceId: string) => void>(() => {
    apiCacheManager.invalidateAll('workspace-sessions');
  }, []);

  const addSession = useCallback(
    (session: ChatSessionRead) => {
      setSessions((prev) => {
        const next = prev.some((s) => s.id === session.id)
          ? prev.map((s) => (s.id === session.id ? session : s))
          : [session, ...prev];
        return sortByUpdatedAtDesc(next);
      });

      // Invalidate cache to keep it in sync with the new session
      if (currentWorkspace) {
        invalidateWorkspaceSessions(currentWorkspace.id);
      }

      return session;
    },
    [currentWorkspace, invalidateWorkspaceSessions],
  );

  const touchSession = useCallback((sessionId: string) => {
    const now = new Date().toISOString();
    setSessions((prev) =>
      sortByUpdatedAtDesc(prev.map((s) => (s.id === sessionId ? { ...s, updated_at: now } : s))),
    );
  }, []);

  const removeSession = useCallback(
    (sessionId: string) => {
      intentionallyDeletedIdsRef.current.add(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionIdRef.current === sessionId) {
        suppressSessionRestoreRef.current = true;
        setActiveSessionId(null);
        const wid = currentWorkspace?.id;
        if (wid && wid !== 'undefined') {
          const datasetId =
            workspaceContextRef.current?.workspace.id === wid
              ? workspaceContextRef.current.state.last_active_dataset_id
              : null;
          void saveWorkspaceStateRef.current(wid, datasetId, null);
        }
      }

      if (currentWorkspace) {
        invalidateWorkspaceSessions(currentWorkspace.id);
      }
    },
    [currentWorkspace, invalidateWorkspaceSessions, setActiveSessionId],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!user) return false;

      const snapshot = sessionsRef.current.find((s) => s.id === sessionId) ?? null;
      // Optimistic UI + cache clear before the DELETE round-trip so refresh cannot revive it.
      removeSession(sessionId);

      try {
        const token = await user.getIdToken();
        await apiClient.deleteChatSession(token, sessionId);
        return true;
      } catch (err) {
        console.error('[ChatSessionContext] Failed to delete session:', err);
        intentionallyDeletedIdsRef.current.delete(sessionId);
        if (snapshot) {
          suppressSessionRestoreRef.current = false;
          setSessions((prev) =>
            prev.some((s) => s.id === snapshot.id)
              ? prev
              : sortByUpdatedAtDesc([snapshot, ...prev]),
          );
        }
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
          sortByUpdatedAtDesc(
            prev.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    ...updated,
                    title: newTitle,
                  }
                : s,
            ),
          ),
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
        sessionsLoadError,
        startNewChat,
        addSession,
        touchSession,
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

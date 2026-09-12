import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChatSession } from '../context/ChatSessionContext';

export const SESSION_URL_PARAM = 'session';

function deleteSessionSearchParam(prev: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(prev);
  next.delete(SESSION_URL_PARAM);
  return next;
}

/** Keep active chat session in ?session= so hard refresh restores the thread. */
export function useSessionInUrl(workspaceId: string | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeSessionId, setActiveSessionId, sessions, isNewChatDraft, sessionsReady } =
    useChatSession();
  const skipUrlWriteRef = useRef(false);
  const hydratedRef = useRef(false);

  // Reset hydration when workspace changes
  useEffect(() => {
    hydratedRef.current = false;
  }, [workspaceId]);

  // New chat: strip ?session= from URL and never re-apply the old id from the query string
  useEffect(() => {
    if (!workspaceId || !isNewChatDraft) return;

    const fromUrl = searchParams.get(SESSION_URL_PARAM);
    if (fromUrl) {
      skipUrlWriteRef.current = true;
      setSearchParams(deleteSessionSearchParam, { replace: true });
    }
    if (activeSessionId) {
      skipUrlWriteRef.current = true;
      setActiveSessionId(null);
    }
    hydratedRef.current = true;
  }, [
    workspaceId,
    isNewChatDraft,
    searchParams,
    activeSessionId,
    setActiveSessionId,
    setSearchParams,
  ]);

  // URL → context (once sessions are loaded , including empty list)
  useEffect(() => {
    if (!workspaceId) return;
    if (isNewChatDraft) return;

    const fromUrl = searchParams.get(SESSION_URL_PARAM);
    if (!fromUrl || fromUrl === 'undefined' || fromUrl === '1') {
      if (fromUrl === 'undefined' || fromUrl === '1') {
        setSearchParams(deleteSessionSearchParam, { replace: true });
      }
      if (sessionsReady) hydratedRef.current = true;
      return;
    }

    // Wait until we know this user's session list (empty is a valid result).
    if (!sessionsReady) return;

    const exists = sessions.some((s) => s.id === fromUrl);
    if (!exists) {
      setSearchParams(deleteSessionSearchParam, { replace: true });
      if (activeSessionId === fromUrl) {
        skipUrlWriteRef.current = true;
        setActiveSessionId(null);
      }
      hydratedRef.current = true;
      return;
    }

    if (activeSessionId !== fromUrl) {
      skipUrlWriteRef.current = true;
      setActiveSessionId(fromUrl);
    }
    hydratedRef.current = true;
  }, [
    workspaceId,
    isNewChatDraft,
    searchParams,
    sessions,
    sessionsReady,
    activeSessionId,
    setActiveSessionId,
    setSearchParams,
  ]);

  // context → URL
  useEffect(() => {
    if (!workspaceId) return;

    const fromUrl = searchParams.get(SESSION_URL_PARAM);

    if (isNewChatDraft) {
      if (!activeSessionId && fromUrl) {
        skipUrlWriteRef.current = true;
        setSearchParams(deleteSessionSearchParam, { replace: true });
      }
      hydratedRef.current = true;
      return;
    }

    if (!hydratedRef.current) return;

    if (skipUrlWriteRef.current) {
      skipUrlWriteRef.current = false;
      return;
    }

    if (activeSessionId) {
      if (fromUrl === activeSessionId) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(SESSION_URL_PARAM, activeSessionId);
          return next;
        },
        { replace: true },
      );
    } else if (fromUrl) {
      setSearchParams(deleteSessionSearchParam, { replace: true });
    }
  }, [activeSessionId, workspaceId, isNewChatDraft, searchParams, setSearchParams]);
}

export function workspaceChatPath(workspaceId: string, sessionId?: string | null): string {
  const base = `/workspace/${workspaceId}`;
  if (sessionId && sessionId !== 'undefined' && sessionId !== '1') {
    return `${base}?${SESSION_URL_PARAM}=${encodeURIComponent(sessionId)}`;
  }
  return base;
}

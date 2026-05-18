import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChatSession } from '../context/ChatSessionContext';

export const SESSION_URL_PARAM = 'session';

/** Keep active chat session in ?session= so hard refresh restores the thread. */
export function useSessionInUrl(workspaceId: string | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeSessionId, setActiveSessionId, sessions } = useChatSession();
  const skipUrlWriteRef = useRef(false);
  const hydratedRef = useRef(false);

  // Reset hydration when workspace changes
  useEffect(() => {
    hydratedRef.current = false;
  }, [workspaceId]);

  // URL → context (once sessions are loaded)
  useEffect(() => {
    if (!workspaceId) return;

    const fromUrl = searchParams.get(SESSION_URL_PARAM);
    if (!fromUrl || fromUrl === 'undefined' || fromUrl === '1') {
      if (fromUrl === 'undefined' || fromUrl === '1') {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete(SESSION_URL_PARAM);
            return next;
          },
          { replace: true }
        );
      }
      hydratedRef.current = true;
      return;
    }

    if (sessions.length === 0) return;

    const exists = sessions.some((s) => s.id === fromUrl);
    if (!exists) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(SESSION_URL_PARAM);
          return next;
        },
        { replace: true }
      );
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
    searchParams,
    sessions,
    activeSessionId,
    setActiveSessionId,
    setSearchParams,
  ]);

  // context → URL
  useEffect(() => {
    if (!workspaceId || !hydratedRef.current) return;

    if (skipUrlWriteRef.current) {
      skipUrlWriteRef.current = false;
      return;
    }

    const fromUrl = searchParams.get(SESSION_URL_PARAM);
    if (activeSessionId) {
      if (fromUrl === activeSessionId) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(SESSION_URL_PARAM, activeSessionId);
          return next;
        },
        { replace: true }
      );
    } else if (fromUrl) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(SESSION_URL_PARAM);
          return next;
        },
        { replace: true }
      );
    }
  }, [activeSessionId, workspaceId, searchParams, setSearchParams]);
}

export function workspaceChatPath(workspaceId: string, sessionId?: string | null): string {
  const base = `/workspace/${workspaceId}`;
  if (sessionId && sessionId !== 'undefined' && sessionId !== '1') {
    return `${base}?${SESSION_URL_PARAM}=${encodeURIComponent(sessionId)}`;
  }
  return base;
}

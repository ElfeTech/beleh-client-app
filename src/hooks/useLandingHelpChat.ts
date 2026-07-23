import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearLandingHelpState,
  clearLegacyHelpSessionStorage,
  LANDING_HELP_DB_NAME,
  loadLandingHelpState,
  saveLandingHelpState,
} from '../lib/landingHelpDb';
import { createPublicHelpSession, streamPublicHelpMessage } from '../services/publicHelpApi';
import type { LandingHelpMessage } from '../types/landingHelpChat';

export type {
  LandingHelpMessage,
  LandingHelpMessageRole,
  LandingHelpMessageStatus,
} from '../types/landingHelpChat';

export type UsePlatformHelpChatOptions = {
  /** IndexedDB database name for session persistence */
  persistenceDb?: string;
};

function nextId(): string {
  return `help-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Shared platform help chat (SSE via `/api/public/help/*`). */
export function usePlatformHelpChat(options?: UsePlatformHelpChatOptions) {
  const persistenceDb = options?.persistenceDb ?? LANDING_HELP_DB_NAME;

  const [messages, setMessages] = useState<LandingHelpMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const persistenceDbRef = useRef(persistenceDb);
  persistenceDbRef.current = persistenceDb;

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;

    const stored = await loadLandingHelpState(persistenceDbRef.current);
    if (stored?.sessionId) {
      sessionIdRef.current = stored.sessionId;
      setSessionId(stored.sessionId);
      return stored.sessionId;
    }

    const id = await createPublicHelpSession();
    sessionIdRef.current = id;
    setSessionId(id);
    await saveLandingHelpState(id, [], persistenceDbRef.current);
    return id;
  }, []);

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    sessionIdRef.current = null;
    setSessionId(null);
    setMessages([]);
    setSessionReady(false);
    setSessionError(null);

    (async () => {
      clearLegacyHelpSessionStorage();

      try {
        const stored = await loadLandingHelpState(persistenceDbRef.current);
        if (cancelled) return;

        if (stored?.sessionId) {
          sessionIdRef.current = stored.sessionId;
          setSessionId(stored.sessionId);
          setMessages(stored.messages);
          setSessionReady(true);
          setSessionError(null);
          hydratedRef.current = true;
          return;
        }

        const id = await createPublicHelpSession();
        if (cancelled) return;

        sessionIdRef.current = id;
        setSessionId(id);
        await saveLandingHelpState(id, [], persistenceDbRef.current);
        setSessionReady(true);
        setSessionError(null);
        hydratedRef.current = true;
      } catch (err) {
        if (!cancelled) {
          setSessionError(
            err instanceof Error ? err.message : 'Could not start help session. Try again.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [persistenceDb]);

  useEffect(() => {
    if (!hydratedRef.current || isStreaming || !sessionId) return;

    const timeoutId = window.setTimeout(() => {
      void saveLandingHelpState(sessionId, messages, persistenceDbRef.current);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [messages, sessionId, isStreaming]);

  const sendMessage = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || isStreaming) return;

      setStreamError(null);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessageId = nextId();
      const assistantMessageId = nextId();

      setMessages((prev) => [
        ...prev,
        { id: userMessageId, role: 'user', content: trimmed, status: 'done' },
        { id: assistantMessageId, role: 'assistant', content: '', status: 'streaming' },
      ]);
      setIsStreaming(true);

      try {
        const sid = await ensureSession();
        if (controller.signal.aborted) return;

        await streamPublicHelpMessage(
          sid,
          trimmed,
          {
            onToken: (delta) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: m.content + delta } : m,
                ),
              );
            },
            onDone: (payload) => {
              if (payload.session_id) {
                sessionIdRef.current = payload.session_id;
                setSessionId(payload.session_id);
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: payload.content || m.content,
                        status: 'done',
                      }
                    : m,
                ),
              );
            },
            onError: (message) => {
              setStreamError(message);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: m.content || message,
                        status: 'error',
                      }
                    : m,
                ),
              );
            },
          },
          controller.signal,
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : 'Failed to get a response. Please try again.';
        setStreamError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, content: message, status: 'error' } : m,
          ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId && m.status === 'streaming'
                ? { ...m, status: 'done' }
                : m,
            ),
          );
          setIsStreaming(false);
        }
      }
    },
    [ensureSession, isStreaming],
  );

  const clearChat = useCallback(async () => {
    if (isStreaming || isClearing) return;

    setIsClearing(true);
    abortRef.current?.abort();
    setStreamError(null);
    setSessionError(null);
    setMessages([]);

    try {
      await clearLandingHelpState(persistenceDbRef.current);
      clearLegacyHelpSessionStorage();

      const id = await createPublicHelpSession();
      sessionIdRef.current = id;
      setSessionId(id);
      await saveLandingHelpState(id, [], persistenceDbRef.current);
      setSessionReady(true);
    } catch (err) {
      sessionIdRef.current = null;
      setSessionId(null);
      setSessionReady(false);
      setSessionError(
        err instanceof Error ? err.message : 'Could not reset help session. Try again.',
      );
    } finally {
      setIsClearing(false);
    }
  }, [isStreaming, isClearing]);

  const retrySession = useCallback(async () => {
    setSessionError(null);
    setSessionReady(false);
    sessionIdRef.current = null;
    setSessionId(null);
    setMessages([]);

    await clearLandingHelpState(persistenceDbRef.current);
    clearLegacyHelpSessionStorage();

    try {
      const id = await createPublicHelpSession();
      sessionIdRef.current = id;
      setSessionId(id);
      await saveLandingHelpState(id, [], persistenceDbRef.current);
      setSessionReady(true);
    } catch (err) {
      setSessionError(
        err instanceof Error ? err.message : 'Could not start help session. Try again.',
      );
    }
  }, []);

  return {
    messages,
    sessionId,
    sessionReady,
    sessionError,
    isStreaming,
    isClearing,
    streamError,
    sendMessage,
    clearChat,
    retrySession,
  };
}

/** @deprecated Prefer usePlatformHelpChat — kept for landing page imports */
export function useLandingHelpChat() {
  return usePlatformHelpChat({ persistenceDb: LANDING_HELP_DB_NAME });
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssistantTurnResponse } from '../types/api';
import type { RunStatus } from '../types/chatRun';
import type { ChatRunPhase, PersistedChatRun } from '../lib/uiMemory/keys';
import {
  clearChatRun,
  getChatRun,
  getChatRunPointer,
  migrateFromPendingTurn,
  patchChatRun,
  resolveInFlightChatRun,
  setChatRun,
  subscribeChatRun,
} from '../lib/chatRunMemory';
import {
  attachChatRun,
  cancelRun,
  ChatRunNotFoundError,
  ChatStreamTransientError,
  ChatStreamUnavailableError,
  getActiveRun,
  getRunStatus,
  startChatRun,
} from '../services/chatStreamApi';
import { apiClient } from '../services/apiClient';
import {
  clearStreamCapability,
  readStreamCapability,
  writeStreamCapability,
} from '../lib/uiMemory/keys';
import { quotaExceededFromStreamError, QuotaExceededError } from '../utils/apiErrorMessage';

export type ChatRunSendOptions = {
  skipUserMessage?: boolean;
  bypassWaitingGuard?: boolean;
  /** Reuse an existing client turn (resume / idempotent re-POST). */
  clientTurnId?: string;
  datasourceId?: string | null;
};

export type UseChatRunParams = {
  uid: string | undefined;
  sessionId: string | null;
  workspaceId: string;
  selectedDatasourceId: string | null;
  getToken: () => Promise<string>;
  /** Create a session when none is active; returns the new session id. */
  ensureSession: (prompt: string, datasourceId: string | null) => Promise<string>;
  /** Restore active session when workspace pointer points at a different session. */
  restoreSessionId?: (sessionId: string) => void;
  onComplete: (response: AssistantTurnResponse, prompt: string) => void;
  onFailure: (err: unknown, prompt: string) => void;
  refetchMessages: () => void | Promise<void>;
  historyReady?: boolean;
};

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_MS = 5 * 60 * 1000;
const SSE_REATTACH_MAX = 3;

const DEFAULT_SHIMMER_PHRASES = [
  'Analyzing your data…',
  'Checking the schema…',
  'Running the analysis…',
  'Preparing insights…',
];

const PHASE_SHIMMER_LEAD: Record<ChatRunPhase, string> = {
  planning: 'Planning the analysis…',
  querying: 'Running your prompt…',
  analyzing: 'Analyzing results…',
  rendering: 'Preparing insights…',
};

/** Keep a rotating list so the shimmer never collapses to a single frozen phrase. */
function phasePhrases(phase: ChatRunPhase | null, label: string | null): string[] {
  const lead = (label && label.trim()) || (phase && PHASE_SHIMMER_LEAD[phase]) || null;

  if (!lead) return DEFAULT_SHIMMER_PHRASES;

  return [lead, ...DEFAULT_SHIMMER_PHRASES.filter((p) => p !== lead)];
}

function runFailureError(snap: RunStatus): Error {
  const quota = quotaExceededFromStreamError({
    error_code: snap.error_code ?? undefined,
    detail: snap.error_detail ?? undefined,
    message: snap.error_detail ?? undefined,
  });
  if (quota) return quota;
  return new Error(snap.error_detail || snap.error_code || 'Run failed');
}

function isTerminalStatus(status: RunStatus['status']): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export function useChatRun(params: UseChatRunParams) {
  const {
    uid,
    sessionId,
    workspaceId,
    selectedDatasourceId,
    getToken,
    ensureSession,
    restoreSessionId,
    onComplete,
    onFailure,
    refetchMessages,
  } = params;

  const [isWaiting, setIsWaiting] = useState(false);
  const [phase, setPhase] = useState<ChatRunPhase | null>(null);
  const [phaseLabel, setPhaseLabel] = useState<string | null>(null);
  const [partialText, setPartialText] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const resumeGenerationRef = useRef(0);
  const sendInFlightRef = useRef(false);
  const terminalHandledRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onFailureRef = useRef(onFailure);
  const ensureSessionRef = useRef(ensureSession);
  const restoreSessionIdRef = useRef(restoreSessionId);
  const refetchRef = useRef(refetchMessages);
  const getTokenRef = useRef(getToken);
  const workspaceIdRef = useRef(workspaceId);
  onCompleteRef.current = onComplete;
  onFailureRef.current = onFailure;
  ensureSessionRef.current = ensureSession;
  restoreSessionIdRef.current = restoreSessionId;
  refetchRef.current = refetchMessages;
  getTokenRef.current = getToken;
  workspaceIdRef.current = workspaceId;

  const applyPersisted = useCallback((run: PersistedChatRun | null) => {
    if (!run) {
      setIsWaiting(false);
      setPhase(null);
      setPhaseLabel(null);
      setPartialText('');
      setPendingPrompt(null);
      setActiveRunId(null);
      return;
    }
    setIsWaiting(true);
    setPhase(run.phase);
    setPhaseLabel(run.phaseLabel);
    setPartialText(run.partialText || '');
    setPendingPrompt(run.prompt);
    setActiveRunId(run.runId);
  }, []);

  const finishSuccess = useCallback(
    async (uidLocal: string, sid: string, response: AssistantTurnResponse, prompt: string) => {
      terminalHandledRef.current = true;
      clearChatRun(uidLocal, sid, workspaceIdRef.current);
      applyPersisted(null);
      sendInFlightRef.current = false;
      onCompleteRef.current(response, prompt);
      await refetchRef.current();
    },
    [applyPersisted],
  );

  const finishFailure = useCallback(
    async (uidLocal: string, sid: string, err: unknown, prompt: string) => {
      terminalHandledRef.current = true;
      clearChatRun(uidLocal, sid, workspaceIdRef.current);
      applyPersisted(null);
      sendInFlightRef.current = false;
      onFailureRef.current(err, prompt);
      await refetchRef.current();
    },
    [applyPersisted],
  );

  const waitForAssistantInHistory = useCallback(
    async (sid: string, prompt: string, signal: AbortSignal): Promise<boolean> => {
      const trimmed = prompt.trim();
      const deadline = Date.now() + POLL_MAX_MS;

      const hasReply = (items: Array<{ role: string; content: string }>) => {
        let sawUser = false;
        for (const m of items) {
          if (m.role === 'user' && m.content.trim() === trimmed) {
            sawUser = true;
            continue;
          }
          if (sawUser && m.role === 'assistant') return true;
        }
        return false;
      };

      while (!signal.aborted && Date.now() < deadline) {
        const token = await getTokenRef.current();
        const page = await apiClient.getSessionMessagesPaginated(token, sid, {
          page: 1,
          page_size: 50,
        });
        if (signal.aborted) return false;
        if (hasReply(page.items)) return true;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      return false;
    },
    [],
  );

  const finishCompletedViaHistory = useCallback(
    async (uidLocal: string, sid: string, prompt: string, signal: AbortSignal) => {
      await waitForAssistantInHistory(sid, prompt, signal);
      if (signal.aborted) return;
      terminalHandledRef.current = true;
      clearChatRun(uidLocal, sid, workspaceIdRef.current);
      applyPersisted(null);
      sendInFlightRef.current = false;
      await refetchRef.current();
    },
    [applyPersisted, waitForAssistantInHistory],
  );

  const applySnapshotPhase = useCallback((uidLocal: string, sid: string, snap: RunStatus) => {
    if (snap.phase) {
      setPhase(snap.phase);
      patchChatRun(
        uidLocal,
        sid,
        {
          phase: snap.phase,
          status: snap.status === 'queued' ? 'queued' : 'running',
        },
        workspaceIdRef.current,
      );
    }
  }, []);

  const handleTerminalSnapshot = useCallback(
    async (
      uidLocal: string,
      sid: string,
      snap: RunStatus,
      prompt: string,
      signal: AbortSignal,
    ): Promise<boolean> => {
      if (snap.status === 'completed') {
        await finishCompletedViaHistory(uidLocal, sid, prompt, signal);
        return true;
      }
      if (snap.status === 'failed' || snap.status === 'cancelled') {
        await finishFailure(uidLocal, sid, runFailureError(snap), prompt);
        return true;
      }
      return false;
    },
    [finishCompletedViaHistory, finishFailure],
  );

  const streamHandlers = useCallback(
    (uidLocal: string, sid: string, prompt: string) => ({
      onRun: (payload: { run_id: string }, seq: number | null) => {
        setActiveRunId(payload.run_id);
        patchChatRun(
          uidLocal,
          sid,
          {
            runId: payload.run_id,
            status: 'running',
            lastSeq: seq ?? -1,
            mode: 'stream',
          },
          workspaceIdRef.current,
        );
      },
      onStatus: (
        payload: { phase: ChatRunPhase; label?: string; seq?: number },
        seq: number | null,
      ) => {
        setPhase(payload.phase);
        setPhaseLabel(payload.label ?? null);
        patchChatRun(
          uidLocal,
          sid,
          {
            phase: payload.phase,
            phaseLabel: payload.label ?? null,
            lastSeq: seq ?? payload.seq ?? -1,
            status: 'running',
          },
          workspaceIdRef.current,
        );
      },
      onToken: (delta: string, seq: number | null) => {
        setPartialText((prev) => {
          const next = prev + delta;
          patchChatRun(
            uidLocal,
            sid,
            {
              partialText: next,
              lastSeq: seq ?? -1,
            },
            workspaceIdRef.current,
          );
          return next;
        });
      },
      onDone: (payload: AssistantTurnResponse & { run_id?: string }) => {
        void finishSuccess(uidLocal, sid, payload, prompt);
      },
      onError: (payload: {
        detail?: string;
        message?: string;
        code?: string;
        retryable?: boolean;
        limit_type?: string;
        current_usage?: number;
        limit?: number;
        remaining?: number;
        reset_at?: string | null;
        upgrade_url?: string | null;
      }) => {
        const quota =
          quotaExceededFromStreamError(payload) ??
          (payload.code?.toUpperCase() === 'QUOTA_EXCEEDED'
            ? new QuotaExceededError({
                error: 'quota_exceeded',
                limit_type: 'credits',
                current_usage: 0,
                limit: 0,
                remaining: 0,
                message: payload.detail ?? payload.message ?? undefined,
              })
            : null);
        const err = quota ?? new Error(payload.detail ?? payload.message ?? 'Stream error');
        void finishFailure(uidLocal, sid, err, prompt);
      },
    }),
    [finishSuccess, finishFailure],
  );

  const pollRunUntilTerminal = useCallback(
    async (
      uidLocal: string,
      sid: string,
      runId: string,
      prompt: string,
      signal: AbortSignal,
    ): Promise<boolean> => {
      const deadline = Date.now() + POLL_MAX_MS;
      while (!signal.aborted && Date.now() < deadline) {
        const token = await getTokenRef.current();
        const snap = await getRunStatus(token, runId, signal);
        if (signal.aborted) return false;
        applySnapshotPhase(uidLocal, sid, snap);
        if (isTerminalStatus(snap.status)) {
          return handleTerminalSnapshot(uidLocal, sid, snap, prompt, signal);
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      return false;
    },
    [applySnapshotPhase, handleTerminalSnapshot],
  );

  const runLegacyBlocking = useCallback(
    async (
      uidLocal: string,
      sid: string,
      prompt: string,
      datasourceId: string | null,
      clientTurnId: string,
      signal: AbortSignal,
    ) => {
      setChatRun(
        uidLocal,
        sid,
        {
          clientTurnId,
          runId: null,
          sessionId: sid,
          prompt,
          datasourceId,
          status: 'running',
          phase: null,
          phaseLabel: null,
          partialText: '',
          lastSeq: -1,
          startedAt: Date.now(),
          mode: 'legacy',
        },
        workspaceIdRef.current,
      );
      writeStreamCapability(uidLocal, false);

      const token = await getTokenRef.current();
      if (signal.aborted) return;

      const response = await apiClient.addMessageToSession(token, sid, prompt, datasourceId);
      if (signal.aborted) return;
      await finishSuccess(uidLocal, sid, response, prompt);
    },
    [finishSuccess],
  );

  const pollLegacyForReply = useCallback(
    async (
      uidLocal: string,
      sid: string,
      prompt: string,
      datasourceId: string | null,
      clientTurnId: string,
      signal: AbortSignal,
    ): Promise<boolean> => {
      const pollUntil = Date.now() + 30_000;
      const trimmed = prompt.trim();

      const hasReply = (items: Array<{ role: string; content: string }>) => {
        let sawUser = false;
        for (const m of items) {
          if (m.role === 'user' && m.content.trim() === trimmed) {
            sawUser = true;
            continue;
          }
          if (sawUser && m.role === 'assistant') return true;
        }
        return false;
      };

      while (!signal.aborted && Date.now() < pollUntil) {
        const token = await getTokenRef.current();
        const page = await apiClient.getSessionMessagesPaginated(token, sid, {
          page: 1,
          page_size: 50,
        });
        if (signal.aborted) return false;
        if (hasReply(page.items)) {
          clearChatRun(uidLocal, sid, workspaceIdRef.current);
          applyPersisted(null);
          sendInFlightRef.current = false;
          await refetchRef.current();
          return true;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      if (signal.aborted) return false;
      await runLegacyBlocking(uidLocal, sid, prompt, datasourceId, clientTurnId, signal);
      return true;
    },
    [applyPersisted, runLegacyBlocking],
  );

  /**
   * Attach or start SSE. On non-terminal disconnect, reattach a few times then poll RunStatus.
   */
  const attachOrStartStream = useCallback(
    async (
      uidLocal: string,
      sid: string,
      prompt: string,
      datasourceId: string | null,
      clientTurnId: string,
      existingRunId: string | null,
      afterSeq: number,
      signal: AbortSignal,
    ) => {
      const handlers = streamHandlers(uidLocal, sid, prompt);
      let runId = existingRunId;
      let seq = afterSeq;
      let attempts = 0;

      while (!signal.aborted && !terminalHandledRef.current) {
        const token = await getTokenRef.current();
        const onSeq = (next: number) => {
          seq = next;
          patchChatRun(uidLocal, sid, { lastSeq: next }, workspaceIdRef.current);
        };

        let result: Awaited<ReturnType<typeof startChatRun>>;
        try {
          if (runId) {
            result = await attachChatRun(token, runId, seq, handlers, signal, onSeq);
          } else {
            result = await startChatRun(
              token,
              sid,
              {
                prompt,
                dataset_id: datasourceId,
                client_turn_id: clientTurnId,
              },
              handlers,
              signal,
              onSeq,
            );
            writeStreamCapability(uidLocal, true);
          }
        } catch (err) {
          // Stale run id / attach miss: fall through to idempotent start POST.
          if (
            runId &&
            (err instanceof ChatRunNotFoundError ||
              (err instanceof ChatStreamUnavailableError && err.status === 404))
          ) {
            runId = null;
            seq = -1;
            patchChatRun(uidLocal, sid, { runId: null, lastSeq: -1 }, workspaceIdRef.current);
            setActiveRunId(null);
            continue;
          }
          throw err;
        }

        if (result.lastSeq != null) {
          seq = result.lastSeq;
        }

        if (!runId) {
          runId = getChatRun(uidLocal, sid)?.runId ?? null;
          setActiveRunId(runId);
        }

        if (terminalHandledRef.current || result.terminal || signal.aborted) {
          return;
        }

        attempts += 1;
        if (attempts <= SSE_REATTACH_MAX) {
          continue;
        }

        if (runId) {
          const polled = await pollRunUntilTerminal(uidLocal, sid, runId, prompt, signal);
          if (polled || terminalHandledRef.current) return;
        }

        await finishFailure(uidLocal, sid, new Error('Chat stream ended unexpectedly'), prompt);
        return;
      }
    },
    [streamHandlers, pollRunUntilTerminal, finishFailure],
  );

  // Keep latest helpers in refs so the resume effect does not abort on identity churn
  const attachOrStartStreamRef = useRef(attachOrStartStream);
  const pollLegacyForReplyRef = useRef(pollLegacyForReply);
  const pollRunUntilTerminalRef = useRef(pollRunUntilTerminal);
  const finishFailureRef = useRef(finishFailure);
  const handleTerminalSnapshotRef = useRef(handleTerminalSnapshot);
  const applySnapshotPhaseRef = useRef(applySnapshotPhase);
  const applyPersistedRef = useRef(applyPersisted);
  attachOrStartStreamRef.current = attachOrStartStream;
  pollLegacyForReplyRef.current = pollLegacyForReply;
  pollRunUntilTerminalRef.current = pollRunUntilTerminal;
  finishFailureRef.current = finishFailure;
  handleTerminalSnapshotRef.current = handleTerminalSnapshot;
  applySnapshotPhaseRef.current = applySnapshotPhase;
  applyPersistedRef.current = applyPersisted;

  const send = useCallback(
    async (text: string, options?: ChatRunSendOptions) => {
      const trimmed = text.trim();
      if (!trimmed || !uid) return;
      if ((isWaiting || sendInFlightRef.current) && !options?.bypassWaitingGuard) return;

      sendInFlightRef.current = true;
      terminalHandledRef.current = false;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const datasourceId =
        options?.datasourceId !== undefined ? options.datasourceId : selectedDatasourceId;
      const clientTurnId = options?.clientTurnId ?? crypto.randomUUID();

      setIsWaiting(true);
      setPendingPrompt(trimmed);
      setPhase(null);
      setPhaseLabel(null);
      setPartialText('');

      try {
        let sid = sessionId;
        if (!sid) {
          sid = await ensureSessionRef.current(trimmed, datasourceId);
        }

        // Interactive send always tries SSE first. A prior negative capability cache
        // (often from a resume race on the first turn) must not pin later prompts to
        // legacy , only a failed start POST should fall back for this turn.
        const wid = workspaceIdRef.current;
        setChatRun(
          uid,
          sid,
          {
            clientTurnId,
            runId: null,
            sessionId: sid,
            prompt: trimmed,
            datasourceId,
            status: 'pending',
            phase: null,
            phaseLabel: null,
            partialText: '',
            lastSeq: -1,
            startedAt: Date.now(),
            mode: 'stream',
          },
          wid,
        );

        try {
          await attachOrStartStream(
            uid,
            sid,
            trimmed,
            datasourceId,
            clientTurnId,
            null,
            -1,
            ac.signal,
          );
        } catch (err) {
          if (err instanceof ChatStreamUnavailableError) {
            writeStreamCapability(uid, false);
            await runLegacyBlocking(uid, sid, trimmed, datasourceId, clientTurnId, ac.signal);
            return;
          }
          if (err instanceof ChatStreamTransientError) {
            if (ac.signal.aborted) return;
            await finishFailure(uid, sid, err, trimmed);
            return;
          }
          if (ac.signal.aborted) return;
          throw err;
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        const sid = sessionId;
        if (uid && sid) {
          await finishFailure(uid, sid, err, trimmed);
        } else {
          sendInFlightRef.current = false;
          applyPersisted(null);
          onFailureRef.current(err, trimmed);
        }
      }
    },
    [
      uid,
      sessionId,
      selectedDatasourceId,
      isWaiting,
      runLegacyBlocking,
      attachOrStartStream,
      finishFailure,
      applyPersisted,
    ],
  );

  const cancel = useCallback(async () => {
    if (!uid || !sessionId) return;
    const run = getChatRun(uid, sessionId);
    abortRef.current?.abort();
    abortRef.current = null;

    if (run?.runId) {
      try {
        const token = await getTokenRef.current();
        await cancelRun(token, run.runId);
      } catch {
        /* best-effort */
      }
    }
    clearChatRun(uid, sessionId, workspaceIdRef.current);
    applyPersisted(null);
    sendInFlightRef.current = false;
    terminalHandledRef.current = true;
  }, [uid, sessionId, applyPersisted]);

  // Cross-tab: mirror waiting state from other tabs
  useEffect(() => {
    if (!uid || !sessionId) return;
    return subscribeChatRun(uid, sessionId, (run) => {
      if (sendInFlightRef.current) return;
      applyPersisted(run);
    });
  }, [uid, sessionId, applyPersisted]);

  // Re-probe stream capability once per mount if previously marked unavailable
  useEffect(() => {
    if (!uid) return;
    if (readStreamCapability(uid) === false) {
      clearStreamCapability(uid);
    }
  }, [uid]);

  // If workspace pointer points at another session, restore it so hydrate/resume can find the run
  useEffect(() => {
    if (!uid || !workspaceId) return;
    const pointer = getChatRunPointer(uid, workspaceId);
    if (!pointer?.sessionId) return;
    if (sessionId === pointer.sessionId) return;
    if (sessionId && getChatRun(uid, sessionId)) return;
    restoreSessionIdRef.current?.(pointer.sessionId);
  }, [uid, workspaceId, sessionId]);

  // Hydrate waiting UI immediately from durable run memory
  useEffect(() => {
    if (!uid || !workspaceId || sendInFlightRef.current) return;
    if (sessionId) {
      migrateFromPendingTurn(uid, sessionId);
    }
    const pending = resolveInFlightChatRun(uid, workspaceId, sessionId);
    applyPersisted(pending);
  }, [uid, sessionId, workspaceId, applyPersisted]);

  // Resume / reattach , deps are only uid/sessionId/workspaceId (helpers via refs)
  useEffect(() => {
    if (!uid || !workspaceId) return;

    if (sessionId) {
      migrateFromPendingTurn(uid, sessionId);
    }
    const pending = resolveInFlightChatRun(uid, workspaceId, sessionId);
    if (!pending) return;

    // Ensure we are on the session that owns the run
    if (sessionId !== pending.sessionId) {
      restoreSessionIdRef.current?.(pending.sessionId);
      return;
    }

    // send() already owns this turn (e.g. sessionId assigned mid-send). Do not start a
    // second stream / legacy path , that race was marking streamCapability=false and
    // forcing consecutive prompts onto legacy chat.
    if (sendInFlightRef.current) {
      applyPersistedRef.current(pending);
      return;
    }

    applyPersistedRef.current(pending);
    sendInFlightRef.current = true;
    terminalHandledRef.current = false;

    const generation = ++resumeGenerationRef.current;
    const ac = new AbortController();
    abortRef.current = ac;

    const resumeStream = async () => {
      const preferStream = pending.mode !== 'legacy' && readStreamCapability(uid) !== false;
      const sid = pending.sessionId;

      if (preferStream) {
        try {
          let runId = pending.runId;
          const token = await getTokenRef.current();

          // Primary path: attach by stored runId
          if (runId) {
            try {
              const snap = await getRunStatus(token, runId, ac.signal);
              applySnapshotPhaseRef.current(uid, sid, snap);
              if (
                await handleTerminalSnapshotRef.current(uid, sid, snap, pending.prompt, ac.signal)
              ) {
                return;
              }
            } catch (err) {
              if (err instanceof ChatRunNotFoundError) {
                runId = null;
                patchChatRun(uid, sid, { runId: null }, workspaceId);
              } else if (err instanceof ChatStreamTransientError) {
                /* keep runId; fall through to attach / poll */
              } else if (!(err instanceof ChatStreamUnavailableError)) {
                throw err;
              } else {
                // Unexpected unavailable on status , clear stale id, try start POST
                runId = null;
                patchChatRun(uid, sid, { runId: null }, workspaceId);
              }
            }

            if (runId) {
              try {
                await attachOrStartStreamRef.current(
                  uid,
                  sid,
                  pending.prompt,
                  pending.datasourceId,
                  pending.clientTurnId,
                  runId,
                  pending.lastSeq,
                  ac.signal,
                );
                return;
              } catch (err) {
                if (err instanceof ChatStreamTransientError) {
                  const polled = await pollRunUntilTerminalRef.current(
                    uid,
                    sid,
                    runId,
                    pending.prompt,
                    ac.signal,
                  );
                  if (polled || terminalHandledRef.current) return;
                }
                if (
                  err instanceof ChatRunNotFoundError ||
                  (err instanceof ChatStreamUnavailableError && err.status === 404)
                ) {
                  runId = null;
                  patchChatRun(uid, sid, { runId: null }, workspaceId);
                } else if (err instanceof ChatStreamUnavailableError) {
                  // Attach endpoint missing , try start POST before legacy
                  runId = null;
                } else {
                  throw err;
                }
              }
            }
          }

          // No runId yet , discover via active run, then attach
          const active = await getActiveRun(token, sid, ac.signal);
          if (active) {
            runId = active.run_id;
            patchChatRun(
              uid,
              sid,
              {
                runId,
                clientTurnId: String(active.client_turn_id),
                status: active.status === 'queued' ? 'queued' : 'running',
                phase: active.phase ?? pending.phase,
              },
              workspaceId,
            );
            setActiveRunId(runId);
            applySnapshotPhaseRef.current(uid, sid, active);

            if (
              await handleTerminalSnapshotRef.current(uid, sid, active, pending.prompt, ac.signal)
            ) {
              return;
            }

            await attachOrStartStreamRef.current(
              uid,
              sid,
              pending.prompt,
              pending.datasourceId,
              pending.clientTurnId,
              runId,
              pending.lastSeq,
              ac.signal,
            );
            return;
          }

          // Idempotent re-POST with same client_turn_id
          try {
            await attachOrStartStreamRef.current(
              uid,
              sid,
              pending.prompt,
              pending.datasourceId,
              pending.clientTurnId,
              null,
              -1,
              ac.signal,
            );
            return;
          } catch (err) {
            if (err instanceof ChatStreamUnavailableError) {
              writeStreamCapability(uid, false);
            } else {
              throw err;
            }
          }
        } catch (err) {
          if (err instanceof ChatStreamUnavailableError) {
            // Only the start POST should disable capability (handled above).
            // Other unavailable probes fall through to legacy for this turn only.
          } else if (err instanceof ChatStreamTransientError) {
            if (pending.runId) {
              const polled = await pollRunUntilTerminalRef.current(
                uid,
                sid,
                pending.runId,
                pending.prompt,
                ac.signal,
              );
              if (polled || terminalHandledRef.current) return;
            }
            if (!ac.signal.aborted) {
              await finishFailureRef.current(uid, sid, err, pending.prompt);
            }
            return;
          } else if (ac.signal.aborted) {
            return;
          } else {
            throw err;
          }
        }
      }

      await pollLegacyForReplyRef.current(
        uid,
        sid,
        pending.prompt,
        pending.datasourceId,
        pending.clientTurnId,
        ac.signal,
      );
    };

    void resumeStream()
      .catch((err) => {
        if (!ac.signal.aborted) {
          console.error('Failed to resume pending chat run:', err);
          void finishFailureRef.current(uid, pending.sessionId, err, pending.prompt);
        }
      })
      .finally(() => {
        if (generation === resumeGenerationRef.current && !terminalHandledRef.current) {
          // Keep sendInFlight true while waiting UI is showing so hydrate doesn't wipe it
          if (!getChatRun(uid, pending.sessionId)) {
            sendInFlightRef.current = false;
          }
        }
      });

    return () => {
      ac.abort();
      if (generation === resumeGenerationRef.current) {
        sendInFlightRef.current = false;
      }
    };
  }, [uid, sessionId, workspaceId]);

  // Abort in-flight SSE when session is cleared; keep durable memory for reattach
  useEffect(() => {
    if (!sessionId) {
      abortRef.current?.abort();
    }
  }, [sessionId]);

  return {
    isWaiting,
    phase,
    phaseLabel,
    partialText,
    pendingPrompt,
    activeRunId,
    canCancel: isWaiting && Boolean(activeRunId),
    shimmerPhrases: phasePhrases(phase, phaseLabel),
    send,
    cancel,
  };
}

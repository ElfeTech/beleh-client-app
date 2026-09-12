/**
 * Durable in-flight analyst chat run memory (localStorage, 24h TTL, cross-tab).
 * Replaces sessionStorage-based chatPendingTurn.
 */

import {
  CHAT_RUN_TTL_MS,
  chatRunStorageKey,
  type ChatRunPointer,
  type PersistedChatRun,
  UI_KEYS,
} from './uiMemory/keys';
import { get, remove, set, subscribe, type UiMemoryScope } from './uiMemory/store';

function sessionScope(uid: string, sessionId: string): UiMemoryScope {
  return { kind: 'session', uid, sessionId };
}

function workspaceScope(uid: string, workspaceId: string): UiMemoryScope {
  return { kind: 'workspace', uid, workspaceId };
}

function isTerminal(status: PersistedChatRun['status']): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function isValidRun(run: PersistedChatRun | null | undefined): run is PersistedChatRun {
  return Boolean(run?.prompt && run.clientTurnId && typeof run.startedAt === 'number');
}

export function setChatRunPointer(uid: string, workspaceId: string, run: PersistedChatRun): void {
  if (!workspaceId || workspaceId === 'undefined') return;
  const pointer: ChatRunPointer = { ...run, workspaceId };
  set(workspaceScope(uid, workspaceId), UI_KEYS.chatRunPointer, pointer, {
    ttlMs: CHAT_RUN_TTL_MS,
  });
}

export function getChatRunPointer(uid: string, workspaceId: string): ChatRunPointer | null {
  if (!workspaceId || workspaceId === 'undefined') return null;
  const pointer = get<ChatRunPointer>(workspaceScope(uid, workspaceId), UI_KEYS.chatRunPointer);
  if (!isValidRun(pointer) || !pointer.sessionId) return null;
  if (isTerminal(pointer.status)) return null;
  return pointer;
}

export function clearChatRunPointer(uid: string, workspaceId: string): void {
  if (!workspaceId || workspaceId === 'undefined') return;
  remove(workspaceScope(uid, workspaceId), UI_KEYS.chatRunPointer);
}

export function setChatRun(
  uid: string,
  sessionId: string,
  run: PersistedChatRun,
  workspaceId?: string | null,
): void {
  set(sessionScope(uid, sessionId), UI_KEYS.chatRun, run, { ttlMs: CHAT_RUN_TTL_MS });
  if (workspaceId) {
    setChatRunPointer(uid, workspaceId, run);
  }
}

export function getChatRun(uid: string, sessionId: string): PersistedChatRun | null {
  const run = get<PersistedChatRun>(sessionScope(uid, sessionId), UI_KEYS.chatRun);
  if (!isValidRun(run)) return null;
  if (isTerminal(run.status)) return null;
  return run;
}

export function patchChatRun(
  uid: string,
  sessionId: string,
  patch: Partial<PersistedChatRun>,
  workspaceId?: string | null,
): PersistedChatRun | null {
  const current = get<PersistedChatRun>(sessionScope(uid, sessionId), UI_KEYS.chatRun);
  if (!current) return null;
  const next = { ...current, ...patch };
  set(sessionScope(uid, sessionId), UI_KEYS.chatRun, next, { ttlMs: CHAT_RUN_TTL_MS });
  if (workspaceId) {
    setChatRunPointer(uid, workspaceId, next);
  }
  return next;
}

export function clearChatRun(uid: string, sessionId: string, workspaceId?: string | null): void {
  remove(sessionScope(uid, sessionId), UI_KEYS.chatRun);
  if (workspaceId) {
    const pointer = getChatRunPointer(uid, workspaceId);
    if (!pointer || pointer.sessionId === sessionId) {
      clearChatRunPointer(uid, workspaceId);
    }
  }
}

export function subscribeChatRun(
  uid: string,
  sessionId: string,
  listener: (run: PersistedChatRun | null) => void,
): () => void {
  const key = chatRunStorageKey(uid, sessionId);
  return subscribe(key, (value) => {
    const run = value as PersistedChatRun | null;
    if (!isValidRun(run)) {
      listener(null);
      return;
    }
    listener(isTerminal(run.status) ? null : run);
  });
}

/**
 * Resolve an in-flight run for resume: prefer session key, fall back to workspace pointer.
 */
export function resolveInFlightChatRun(
  uid: string,
  workspaceId: string,
  sessionId: string | null,
): PersistedChatRun | null {
  if (sessionId) {
    const fromSession = getChatRun(uid, sessionId);
    if (fromSession) return fromSession;
  }
  const pointer = getChatRunPointer(uid, workspaceId);
  if (!pointer) return null;
  // Re-hydrate session-scoped key from pointer if missing
  const existing = getChatRun(uid, pointer.sessionId);
  if (existing) return existing;
  const { workspaceId: _wid, ...run } = pointer;
  void _wid;
  setChatRun(uid, pointer.sessionId, run, workspaceId);
  return run;
}

/**
 * One-time lift from legacy sessionStorage `chat-pending:{sessionId}`.
 */
export function migrateFromPendingTurn(uid: string, sessionId: string): PersistedChatRun | null {
  if (typeof sessionStorage === 'undefined') return null;
  const legacyKey = `chat-pending:${sessionId}`;
  try {
    const raw = sessionStorage.getItem(legacyKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      prompt?: string;
      startedAt?: number;
      datasourceId?: string | null;
    };
    sessionStorage.removeItem(legacyKey);
    if (!parsed?.prompt || typeof parsed.startedAt !== 'number') return null;

    const existing = getChatRun(uid, sessionId);
    if (existing) return existing;

    const run: PersistedChatRun = {
      clientTurnId: crypto.randomUUID(),
      runId: null,
      sessionId,
      prompt: parsed.prompt,
      datasourceId: parsed.datasourceId ?? null,
      status: 'pending',
      phase: null,
      phaseLabel: null,
      partialText: '',
      lastSeq: -1,
      startedAt: parsed.startedAt,
      mode: 'legacy',
    };
    setChatRun(uid, sessionId, run);
    return run;
  } catch {
    return null;
  }
}

/** @deprecated Use PersistedChatRun from uiMemory/keys. */
export type { PersistedChatRun as ChatPendingTurn };

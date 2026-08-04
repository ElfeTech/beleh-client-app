import { readSseRequest } from '../lib/sseStreamReader';
import type {
  ActiveRunResponse,
  CancelRunResponse,
  ChatRunEventDone,
  ChatRunEventError,
  ChatRunEventRun,
  ChatRunEventStatus,
  ChatRunStartBody,
  ChatRunStreamHandlers,
  RunStatus,
} from '../types/chatRun';
import {
  extractQuotaExceededDetail,
  formatApiErrorMessage,
  QuotaExceededError,
} from '../utils/apiErrorMessage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
}

function authHeaders(token: string, extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

function parseSeq(id: string | undefined): number | null {
  if (id == null || id === '') return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function dispatchSseEvent(
  event: string,
  data: string,
  id: string | undefined,
  handlers: ChatRunStreamHandlers,
): boolean {
  const seq = parseSeq(id);
  if (event === 'run') {
    try {
      handlers.onRun?.(JSON.parse(data) as ChatRunEventRun, seq);
    } catch {
      handlers.onError?.({ detail: 'Invalid run event from server' }, seq);
    }
    return false;
  }
  if (event === 'status') {
    try {
      handlers.onStatus?.(JSON.parse(data) as ChatRunEventStatus, seq);
    } catch {
      /* ignore malformed status */
    }
    return false;
  }
  if (event === 'token') {
    try {
      const parsed = JSON.parse(data) as { delta?: string };
      if (typeof parsed.delta === 'string' && parsed.delta.length > 0) {
        handlers.onToken?.(parsed.delta, seq);
      }
    } catch {
      handlers.onError?.({ detail: 'Invalid token event from server' }, seq);
    }
    return false;
  }
  if (event === 'done') {
    try {
      handlers.onDone?.(JSON.parse(data) as ChatRunEventDone, seq);
    } catch {
      handlers.onError?.({ detail: 'Invalid done event from server' }, seq);
    }
    return true;
  }
  if (event === 'error') {
    try {
      handlers.onError?.(JSON.parse(data) as ChatRunEventError, seq);
    } catch {
      handlers.onError?.({ detail: data || 'Stream error' }, seq);
    }
    return true;
  }
  return false;
}

export class ChatStreamUnavailableError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message || `Chat stream unavailable (${status})`);
    this.name = 'ChatStreamUnavailableError';
    this.status = status;
  }
}

/** Redis down / temporary stream failure , do not disable stream capability. */
export class ChatStreamTransientError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message || `Chat stream temporarily unavailable (${status})`);
    this.name = 'ChatStreamTransientError';
    this.status = status;
  }
}

function isUnavailableStatus(status: number): boolean {
  return status === 404 || status === 405 || status === 501;
}

function isTransientStatus(status: number): boolean {
  return status === 503;
}

function mapHttpError(err: unknown): never {
  if (err instanceof QuotaExceededError) throw err;
  const status = (err as { status?: number })?.status;
  if (typeof status === 'number') {
    if (isUnavailableStatus(status)) {
      throw new ChatStreamUnavailableError(status, (err as Error).message);
    }
    if (isTransientStatus(status)) {
      throw new ChatStreamTransientError(status, (err as Error).message);
    }
  }
  throw err;
}

export type ChatStreamResult = {
  /** True when a terminal `done` or `error` SSE event was received. */
  terminal: boolean;
  lastSeq: number | null;
};

async function jsonAuth<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: authHeaders(token, {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    }),
  });
  if (!response.ok) {
    if (isUnavailableStatus(response.status)) {
      throw new ChatStreamUnavailableError(response.status);
    }
    if (isTransientStatus(response.status)) {
      let detail = response.statusText;
      try {
        const body = (await response.json()) as { detail?: string; message?: string };
        detail = body.detail ?? body.message ?? detail;
      } catch {
        /* ignore */
      }
      throw new ChatStreamTransientError(response.status, detail);
    }
    let errorData: unknown = {};
    try {
      errorData = await response.json();
    } catch {
      /* ignore */
    }
    const quota = extractQuotaExceededDetail(errorData);
    if (quota || response.status === 429) {
      throw new QuotaExceededError(
        quota ?? {
          error: 'quota_exceeded',
          limit_type: 'llm_tokens',
          current_usage: 0,
          limit: 0,
          remaining: 0,
          message: formatApiErrorMessage(errorData, response.status),
        },
        response.status,
      );
    }
    let detail = response.statusText;
    if (errorData && typeof errorData === 'object') {
      const body = errorData as { detail?: string; message?: string };
      detail =
        typeof body.detail === 'string'
          ? body.detail
          : (body.message ?? formatApiErrorMessage(errorData, response.status));
    }
    const err = new Error(detail || `Request failed (${response.status})`) as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }
  return (await response.json()) as T;
}

async function consumeSse(options: {
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  handlers: ChatRunStreamHandlers;
  onSeq?: (seq: number) => void;
}): Promise<ChatStreamResult> {
  let terminal = false;
  let lastSeq: number | null = null;

  try {
    const result = await readSseRequest({
      url: options.url,
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: options.signal,
      onId: (id) => {
        const seq = parseSeq(id);
        if (seq != null) {
          lastSeq = seq;
          options.onSeq?.(seq);
        }
      },
      onEvent: (event, data, id) => {
        const seq = parseSeq(id);
        if (seq != null) lastSeq = seq;
        if (dispatchSseEvent(event, data, id, options.handlers)) {
          terminal = true;
        }
      },
    });
    if (result.lastEventId != null) {
      const seq = parseSeq(result.lastEventId);
      if (seq != null) lastSeq = seq;
    }
  } catch (err) {
    mapHttpError(err);
  }

  return { terminal, lastSeq };
}

/**
 * Start (or idempotently reattach to) a chat run via SSE.
 */
export async function startChatRun(
  token: string,
  sessionId: string,
  body: ChatRunStartBody,
  handlers: ChatRunStreamHandlers,
  signal?: AbortSignal,
  onSeq?: (seq: number) => void,
): Promise<ChatStreamResult> {
  const url = apiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/messages/stream`);
  return consumeSse({
    url,
    method: 'POST',
    headers: authHeaders(token),
    body,
    signal,
    handlers,
    onSeq,
  });
}

/**
 * Reattach to an existing run's event stream from after_seq.
 * Sends Last-Event-ID (takes precedence on the server) aligned with after_seq.
 */
export async function attachChatRun(
  token: string,
  runId: string,
  afterSeq: number,
  handlers: ChatRunStreamHandlers,
  signal?: AbortSignal,
  onSeq?: (seq: number) => void,
): Promise<ChatStreamResult> {
  const qs = afterSeq >= 0 ? `?after_seq=${encodeURIComponent(String(afterSeq))}` : '';
  const url = apiUrl(`/api/runs/${encodeURIComponent(runId)}/events${qs}`);
  const headers = authHeaders(token);
  // Last-Event-ID is the last seen seq; server replays events with seq > that id.
  if (afterSeq >= 0) {
    headers['Last-Event-ID'] = String(afterSeq);
  }
  return consumeSse({
    url,
    method: 'GET',
    headers,
    signal,
    handlers,
    onSeq,
  });
}

export async function getActiveRun(
  token: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<RunStatus | null> {
  try {
    const data = await jsonAuth<ActiveRunResponse>(
      token,
      `/api/sessions/${encodeURIComponent(sessionId)}/runs/active`,
      { method: 'GET', signal },
    );
    return data.run ?? null;
  } catch (err) {
    // 404 here means "no active run" (or probe miss) , not "streaming unsupported".
    // Never poison streamCapability from this endpoint.
    if (err instanceof ChatStreamUnavailableError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export class ChatRunNotFoundError extends Error {
  status = 404;
  constructor(runId: string) {
    super(`Chat run not found (${runId})`);
    this.name = 'ChatRunNotFoundError';
  }
}

export async function getRunStatus(
  token: string,
  runId: string,
  signal?: AbortSignal,
): Promise<RunStatus> {
  try {
    return await jsonAuth<RunStatus>(token, `/api/runs/${encodeURIComponent(runId)}`, {
      method: 'GET',
      signal,
    });
  } catch (err) {
    // Missing run ≠ streaming unavailable; callers should reattach / re-POST.
    if (err instanceof ChatStreamUnavailableError && err.status === 404) {
      throw new ChatRunNotFoundError(runId);
    }
    throw err;
  }
}

export async function cancelRun(
  token: string,
  runId: string,
  signal?: AbortSignal,
): Promise<CancelRunResponse> {
  return jsonAuth<CancelRunResponse>(token, `/api/runs/${encodeURIComponent(runId)}/cancel`, {
    method: 'POST',
    signal,
    body: '{}',
  });
}

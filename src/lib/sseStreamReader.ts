import {
  extractQuotaExceededDetail,
  formatApiErrorMessage,
  QuotaExceededError,
} from '../utils/apiErrorMessage';

export type SseEventHandler = (event: string, data: string, id?: string) => void;

export interface ReadSseRequestOptions {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  onEvent: SseEventHandler;
  /** Called whenever an `id:` field is parsed (monotonic seq as string). */
  onId?: (id: string) => void;
}

export interface ReadSseResult {
  lastEventId: string | null;
}

/**
 * Generic SSE reader over fetch (EventSource cannot POST or set Authorization).
 * Parses `event:` / `data:` / `id:` lines per the SSE spec.
 */
export async function readSseRequest(options: ReadSseRequestOptions): Promise<ReadSseResult> {
  const method = options.method ?? (options.body !== undefined ? 'POST' : 'GET');
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    ...options.headers,
  };

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const response = await fetch(options.url, {
    method,
    headers,
    body,
    signal: options.signal,
  });

  if (!response.ok) {
    let errorData: unknown = {};
    try {
      errorData = await response.json();
    } catch {
      try {
        const text = await response.text();
        errorData = text ? { detail: text } : {};
      } catch {
        /* ignore */
      }
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
      const bodyObj = errorData as { detail?: unknown; message?: string };
      if (typeof bodyObj.detail === 'string') detail = bodyObj.detail;
      else if (typeof bodyObj.message === 'string') detail = bodyObj.message;
      else detail = formatApiErrorMessage(errorData, response.status);
    }
    const err = new Error(detail || `Request failed (${response.status})`) as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let dataLines: string[] = [];
  let eventId: string | undefined;
  let lastEventId: string | null = null;

  const flushEvent = () => {
    if (dataLines.length === 0) {
      eventName = 'message';
      eventId = undefined;
      return;
    }
    const data = dataLines.join('\n');
    dataLines = [];
    if (eventId != null) {
      lastEventId = eventId;
      options.onId?.(eventId);
    }
    options.onEvent(eventName, data, eventId);
    eventName = 'message';
    eventId = undefined;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '');
        if (line === '') {
          flushEvent();
          continue;
        }
        if (line.startsWith(':')) continue;

        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim() || 'message';
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        } else if (line.startsWith('id:')) {
          eventId = line.slice(3).trim();
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const line = buffer.replace(/\r$/, '');
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      } else if (line.startsWith('id:')) {
        eventId = line.slice(3).trim();
      }
    }
    flushEvent();
  } finally {
    reader.releaseLock();
  }

  return { lastEventId };
}

/**
 * POST + ReadableStream SSE parser (EventSource cannot POST).
 * Kept for public help chat compatibility.
 */
export async function readSsePost(
  url: string,
  body: unknown,
  signal: AbortSignal | undefined,
  onEvent: SseEventHandler,
): Promise<void> {
  await readSseRequest({
    url,
    method: 'POST',
    body,
    signal,
    onEvent: (event, data) => onEvent(event, data),
  });
}

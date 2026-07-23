export type SseEventHandler = (event: string, data: string) => void;

/**
 * POST + ReadableStream SSE parser (EventSource cannot POST).
 * Parses `event:` / `data:` lines per the SSE spec.
 */
export async function readSsePost(
  url: string,
  body: unknown,
  signal: AbortSignal | undefined,
  onEvent: SseEventHandler,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errBody = (await response.json()) as { detail?: string; message?: string };
      detail = errBody.detail ?? errBody.message ?? detail;
    } catch {
      try {
        detail = (await response.text()) || detail;
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail || `Request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let dataLines: string[] = [];

  const flushEvent = () => {
    if (dataLines.length === 0) return;
    const data = dataLines.join('\n');
    dataLines = [];
    onEvent(eventName, data);
    eventName = 'message';
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
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const line = buffer.replace(/\r$/, '');
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    flushEvent();
  } finally {
    reader.releaseLock();
  }
}

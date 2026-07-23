import { readSsePost } from '../lib/sseStreamReader';
import type {
  PublicHelpDoneData,
  PublicHelpSessionResponse,
  PublicHelpStreamHandlers,
} from '../types/publicHelp';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function publicHelpUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
}

export async function createPublicHelpSession(signal?: AbortSignal): Promise<string> {
  const response = await fetch(publicHelpUrl('/api/public/help/sessions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errBody = (await response.json()) as { detail?: string };
      detail = errBody.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Failed to create help session (${response.status})`);
  }

  const data = (await response.json()) as PublicHelpSessionResponse;
  if (!data.session_id) {
    throw new Error('Invalid session response from server');
  }
  return data.session_id;
}

export async function streamPublicHelpMessage(
  sessionId: string,
  prompt: string,
  handlers: PublicHelpStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const url = publicHelpUrl(`/api/public/help/sessions/${encodeURIComponent(sessionId)}/messages`);

  await readSsePost(url, { prompt }, signal, (event, data) => {
    if (event === 'token') {
      try {
        const parsed = JSON.parse(data) as { delta?: string };
        if (typeof parsed.delta === 'string' && parsed.delta.length > 0) {
          handlers.onToken(parsed.delta);
        }
      } catch {
        handlers.onError?.('Invalid token event from server');
      }
      return;
    }

    if (event === 'done') {
      try {
        const parsed = JSON.parse(data) as PublicHelpDoneData;
        handlers.onDone(parsed);
      } catch {
        handlers.onError?.('Invalid done event from server');
      }
      return;
    }

    if (event === 'error') {
      try {
        const parsed = JSON.parse(data) as { detail?: string; message?: string };
        handlers.onError?.(parsed.detail ?? parsed.message ?? 'Stream error');
      } catch {
        handlers.onError?.(data || 'Stream error');
      }
    }
  });
}

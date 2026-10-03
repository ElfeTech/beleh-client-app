const STORAGE_KEY = 'beleh.seenOverviewSessions';
const MAX_ENTRIES = 200;

export const AUTO_OVERVIEW_ORIGIN = 'auto_overview';

export function readSeenOverviewSessions(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

/** Remember that the user opened this overview chat (drops the sidebar "New" pill). */
export function markOverviewSessionSeen(sessionId: string): Set<string> {
  const seen = readSeenOverviewSessions();
  seen.add(sessionId);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen].slice(-MAX_ENTRIES)));
  } catch {
    /* storage unavailable (private mode / blocked) — the pill simply stays */
  }
  return seen;
}

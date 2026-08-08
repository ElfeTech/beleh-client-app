/** TTL so AuthSessionGate does not spam GET /api/users/me on every navigation / hard refresh. */
const SESSION_VALIDATION_TTL_MS = 60_000;
const SESSION_STORAGE_KEY = 'beleh_session_validated';

type PersistedValidation = { uid: string; at: number };

let lastValidatedUid: string | null = null;
let lastValidatedAt = 0;

function readPersisted(): PersistedValidation | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedValidation;
    if (!parsed?.uid || typeof parsed.at !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(uid: string, at: number): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ uid, at }));
  } catch {
    /* private mode / quota */
  }
}

function clearPersisted(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function hydrateFromPersisted(): void {
  if (lastValidatedUid) return;
  const persisted = readPersisted();
  if (!persisted) return;
  if (Date.now() - persisted.at >= SESSION_VALIDATION_TTL_MS) {
    clearPersisted();
    return;
  }
  lastValidatedUid = persisted.uid;
  lastValidatedAt = persisted.at;
}

export function isSessionValidationFresh(uid: string): boolean {
  if (!uid) return false;
  hydrateFromPersisted();
  if (lastValidatedUid !== uid) return false;
  return Date.now() - lastValidatedAt < SESSION_VALIDATION_TTL_MS;
}

export function markSessionValidated(uid: string): void {
  lastValidatedUid = uid;
  lastValidatedAt = Date.now();
  writePersisted(uid, lastValidatedAt);
}

export function invalidateSessionValidationCache(): void {
  lastValidatedUid = null;
  lastValidatedAt = 0;
  clearPersisted();
}

import type { LandingHelpMessage } from '../types/landingHelpChat';

export const LANDING_HELP_IDB_RECORD_KEY = 'current' as const;

/** Landing page help persistence */
export const LANDING_HELP_DB_NAME = 'beleh-landing-help';
/** In-app support bubble for authenticated users */
export const APP_HELP_DB_NAME = 'beleh-app-help';

export type LandingHelpPersistedState = {
  id: typeof LANDING_HELP_IDB_RECORD_KEY;
  sessionId: string;
  messages: LandingHelpMessage[];
  updatedAt: number;
};

const DB_VERSION = 1;
const STORE_NAME = 'session';

function openDb(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

function normalizeMessages(messages: LandingHelpMessage[]): LandingHelpMessage[] {
  return messages.map((m) => (m.status === 'streaming' ? { ...m, status: 'done' as const } : m));
}

export async function loadLandingHelpState(
  dbName: string = LANDING_HELP_DB_NAME,
): Promise<LandingHelpPersistedState | null> {
  if (typeof indexedDB === 'undefined') return null;

  try {
    const db = await openDb(dbName);
    const record = await new Promise<LandingHelpPersistedState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(LANDING_HELP_IDB_RECORD_KEY);
      getReq.onerror = () => reject(getReq.error ?? new Error('Failed to read help state'));
      getReq.onsuccess = () => {
        const value = getReq.result as LandingHelpPersistedState | undefined;
        resolve(value ?? null);
      };
    });
    db.close();

    if (!record?.sessionId) return null;

    return {
      ...record,
      id: LANDING_HELP_IDB_RECORD_KEY,
      messages: normalizeMessages(record.messages ?? []),
    };
  } catch {
    return null;
  }
}

export async function saveLandingHelpState(
  sessionId: string,
  messages: LandingHelpMessage[],
  dbName: string = LANDING_HELP_DB_NAME,
): Promise<void> {
  if (typeof indexedDB === 'undefined' || !sessionId) return;

  const record: LandingHelpPersistedState = {
    id: LANDING_HELP_IDB_RECORD_KEY,
    sessionId,
    messages: normalizeMessages(messages),
    updatedAt: Date.now(),
  };

  try {
    const db = await openDb(dbName);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(record);
      putReq.onerror = () => reject(putReq.error ?? new Error('Failed to save help state'));
      putReq.onsuccess = () => resolve();
    });
    db.close();
  } catch {
    /* storage blocked or full */
  }
}

export async function clearLandingHelpState(dbName: string = LANDING_HELP_DB_NAME): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  try {
    const db = await openDb(dbName);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delReq = store.delete(LANDING_HELP_IDB_RECORD_KEY);
      delReq.onerror = () => reject(delReq.error ?? new Error('Failed to clear help state'));
      delReq.onsuccess = () => resolve();
    });
    db.close();
  } catch {
    /* ignore */
  }
}

/** Remove legacy localStorage session key from earlier implementation. */
export function clearLegacyHelpSessionStorage(): void {
  try {
    localStorage.removeItem('beleh_public_help_session_id');
  } catch {
    /* ignore */
  }
}

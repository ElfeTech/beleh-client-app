/**
 * Refresh-survival for the upload wizard.
 *
 * Metadata (stage, name, datasource id) lives in sessionStorage so a page
 * reload in the same tab restores the panel where the user left it. The
 * attached File itself goes to IndexedDB (sessionStorage cannot hold tens of
 * MB); structured clone preserves File objects. Everything is best-effort:
 * private mode / blocked storage degrades to "no draft" without throwing.
 */

export interface UploadDraftFileMeta {
  name: string;
  size: number;
  type: string;
}

export interface UploadDraft {
  v: 1;
  ts: number;
  /** 'form' = file picked but not uploaded yet; 'active' = server-side import exists. */
  stage: 'form' | 'active';
  name: string;
  fileMeta: UploadDraftFileMeta | null;
  datasourceId: string | null;
}

const META_KEY_PREFIX = 'beleh:upload-draft:';
const PANEL_OPEN_KEY_PREFIX = 'beleh:connect-panel-open:';
const FORM_DRAFT_TTL_MS = 30 * 60 * 1000; // re-attach files for 30 min
const ACTIVE_DRAFT_TTL_MS = 2 * 60 * 60 * 1000; // server-backed imports for 2 h

const IDB_NAME = 'beleh-upload-drafts';
const IDB_STORE = 'files';
const IDB_VERSION = 1;

function metaKey(workspaceId: string): string {
  return `${META_KEY_PREFIX}${workspaceId}`;
}

// ---------------------------------------------------------------------------
// sessionStorage metadata
// ---------------------------------------------------------------------------

export function saveUploadDraft(
  workspaceId: string,
  draft: Omit<UploadDraft, 'v' | 'ts'>,
): void {
  try {
    const payload: UploadDraft = { v: 1, ts: Date.now(), ...draft };
    sessionStorage.setItem(metaKey(workspaceId), JSON.stringify(payload));
  } catch {
    /* storage unavailable */
  }
}

export function loadUploadDraft(workspaceId: string): UploadDraft | null {
  try {
    const raw = sessionStorage.getItem(metaKey(workspaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UploadDraft;
    if (parsed?.v !== 1 || typeof parsed.ts !== 'number') return null;
    const ttl = parsed.stage === 'active' ? ACTIVE_DRAFT_TTL_MS : FORM_DRAFT_TTL_MS;
    if (Date.now() - parsed.ts > ttl) {
      clearUploadDraft(workspaceId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearUploadDraft(workspaceId: string): void {
  try {
    sessionStorage.removeItem(metaKey(workspaceId));
  } catch {
    /* storage unavailable */
  }
  void deleteDraftFile(workspaceId);
}

// ---------------------------------------------------------------------------
// Connect-panel open flag (restore the panel itself after a reload)
// ---------------------------------------------------------------------------

export function savePanelOpen(workspaceId: string, open: boolean): void {
  try {
    if (open) sessionStorage.setItem(`${PANEL_OPEN_KEY_PREFIX}${workspaceId}`, '1');
    else sessionStorage.removeItem(`${PANEL_OPEN_KEY_PREFIX}${workspaceId}`);
  } catch {
    /* storage unavailable */
  }
}

export function wasPanelOpen(workspaceId: string): boolean {
  try {
    return sessionStorage.getItem(`${PANEL_OPEN_KEY_PREFIX}${workspaceId}`) === '1';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// IndexedDB file storage
// ---------------------------------------------------------------------------

function openDraftDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  const db = await openDraftDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, mode);
      const request = run(tx.objectStore(IDB_STORE));
      request.onsuccess = () => {
        resolve(request.result as T);
        db.close();
      };
      request.onerror = () => {
        resolve(null);
        db.close();
      };
    } catch {
      resolve(null);
      db.close();
    }
  });
}

export async function saveDraftFile(workspaceId: string, file: File): Promise<void> {
  await withStore('readwrite', (store) => store.put({ file, ts: Date.now() }, workspaceId));
}

export async function loadDraftFile(workspaceId: string): Promise<File | null> {
  const entry = await withStore<{ file?: File } | undefined>('readonly', (store) =>
    store.get(workspaceId),
  );
  return entry?.file instanceof File ? entry.file : null;
}

export async function deleteDraftFile(workspaceId: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(workspaceId));
}

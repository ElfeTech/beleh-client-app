/**
 * Persist last-selected datasource per Firebase user + workspace so refresh keeps the dropdown
 * even if the server state save has not flushed yet.
 */
const PREFIX = 'beleh:selectedDataset:';

export function selectedDatasetStorageKey(uid: string, workspaceId: string): string {
  return `${PREFIX}${uid}:${workspaceId}`;
}

export function readSelectedDatasetId(uid: string | undefined, workspaceId: string | undefined): string | null {
  if (!uid || !workspaceId || typeof localStorage === 'undefined') return null;
  try {
    const v = localStorage.getItem(selectedDatasetStorageKey(uid, workspaceId));
    if (!v || v === 'undefined') return null;
    return v;
  } catch {
    return null;
  }
}

export function writeSelectedDatasetId(
  uid: string | undefined,
  workspaceId: string | undefined,
  datasetId: string | null
): void {
  if (!uid || !workspaceId || typeof localStorage === 'undefined') return;
  try {
    const key = selectedDatasetStorageKey(uid, workspaceId);
    if (datasetId === null || datasetId === '') {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, datasetId);
    }
  } catch {
    // ignore quota / private mode
  }
}

/** Remove all persisted selections (call on sign-out / account switch). */
export function clearAllSelectedDatasetStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

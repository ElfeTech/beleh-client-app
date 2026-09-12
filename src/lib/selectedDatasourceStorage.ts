/**
 * Persist last-selected datasource per Firebase user + workspace so refresh keeps the dropdown
 * even if the server state save has not flushed yet.
 *
 * Delegates to the typed UI memory layer; keeps the legacy key in sync for older readers.
 */
import { readSelectedDataset, writeSelectedDataset, selectedDatasetLegacyKey } from './uiMemory';

export function selectedDatasetStorageKey(uid: string, workspaceId: string): string {
  return selectedDatasetLegacyKey(uid, workspaceId);
}

export function readSelectedDatasetId(
  uid: string | undefined,
  workspaceId: string | undefined,
): string | null {
  if (!uid || !workspaceId) return null;
  return readSelectedDataset(uid, workspaceId);
}

export function writeSelectedDatasetId(
  uid: string | undefined,
  workspaceId: string | undefined,
  datasetId: string | null,
): void {
  if (!uid || !workspaceId) return;
  writeSelectedDataset(uid, workspaceId, datasetId);
}

/** Remove all persisted selections (call on sign-out / account switch). */
export function clearAllSelectedDatasetStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const PREFIX = 'beleh:selectedDataset:';
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

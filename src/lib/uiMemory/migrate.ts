/**
 * One-time migration of legacy localStorage keys into the `beleh:ui:` namespace.
 */

import {
  chatHeaderCollapsedLegacyKey,
  selectedDatasetLegacyKey,
  UI_KEYS,
  writeActiveSessionId,
  writeActiveWorkspaceId,
  writeChatHeaderCollapsed,
  writeSelectedDataset,
} from './keys';
import { get, getRawCompat, set, type UiMemoryScope } from './store';

const MIGRATION_FLAG = 'beleh:ui:migrated:v1';

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

/**
 * Import known legacy keys. Safe to call multiple times (flag-gated).
 * Pass the current Firebase uid when available so user-scoped keys migrate.
 */
export function migrateLegacyUiMemory(uid?: string | null): void {
  if (!canUseStorage()) return;
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === '1') return;
  } catch {
    return;
  }

  try {
    // Active workspace / session , already raw compat keys; normalize invalid values
    const aw = getRawCompat('activeWorkspaceId');
    if (aw) writeActiveWorkspaceId(aw === 'undefined' ? null : aw);

    const as = getRawCompat('activeSessionId');
    if (as) writeActiveSessionId(as === '1' || as === 'undefined' ? null : as);

    if (uid) {
      // selectedDataset: beleh:selectedDataset:{uid}:{workspaceId}
      const prefix = `beleh:selectedDataset:${uid}:`;
      const headerPrefix = 'beleh-chat-header-collapsed:';

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;

        if (k.startsWith(prefix)) {
          const workspaceId = k.slice(prefix.length);
          const value = getRawCompat(k);
          if (value && value !== 'undefined' && workspaceId) {
            writeSelectedDataset(uid, workspaceId, value);
          }
        }

        if (k.startsWith(headerPrefix)) {
          const workspaceId = k.slice(headerPrefix.length);
          const value = getRawCompat(k);
          if (workspaceId && value === 'true') {
            writeChatHeaderCollapsed(uid, workspaceId, true);
          }
        }
      }

      // chat-pending:{sessionId} from sessionStorage → leave for chatRunMemory to pick up once
      // (handled in chatRunMemory.migrateFromPendingTurn)
    }

    localStorage.setItem(MIGRATION_FLAG, '1');
  } catch {
    /* ignore */
  }
}

/** Force re-run migration (tests / debug). */
export function resetUiMemoryMigrationFlag(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(MIGRATION_FLAG);
  } catch {
    /* ignore */
  }
}

export function ensureWorkspaceSelectedDatasetMigrated(uid: string, workspaceId: string): void {
  const scope: UiMemoryScope = { kind: 'workspace', uid, workspaceId };
  if (get<string>(scope, UI_KEYS.selectedDataset)) return;
  const existing = getRawCompat(selectedDatasetLegacyKey(uid, workspaceId));
  if (!existing || existing === 'undefined') return;
  set(scope, UI_KEYS.selectedDataset, existing);
}

export function ensureHeaderCollapsedMigrated(uid: string, workspaceId: string): void {
  const scope: UiMemoryScope = { kind: 'workspace', uid, workspaceId };
  if (get<boolean>(scope, UI_KEYS.chatHeaderCollapsed) != null) return;
  const legacy = getRawCompat(chatHeaderCollapsedLegacyKey(workspaceId));
  if (legacy !== 'true') return;
  writeChatHeaderCollapsed(uid, workspaceId, true);
}

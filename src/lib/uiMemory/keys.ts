/**
 * Typed key registry for UI memory.
 * Legacy plain-string keys stay raw so resolveAuthenticatedHome / auth flows keep working.
 */

import type { UiMemoryScope } from './store';
import { get, getRawCompat, remove, scopedKey, set, setRawCompat } from './store';

/** 24h TTL for in-flight chat runs */
export const CHAT_RUN_TTL_MS = 24 * 60 * 60 * 1000;

export type ChatRunPhase = 'planning' | 'querying' | 'analyzing' | 'rendering';

export type ChatRunStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PersistedChatRun {
  clientTurnId: string;
  runId: string | null;
  sessionId: string;
  prompt: string;
  datasourceId: string | null;
  status: ChatRunStatus;
  phase: ChatRunPhase | null;
  phaseLabel: string | null;
  partialText: string;
  lastSeq: number;
  startedAt: number;
  /** When stream endpoints are missing, recover via message poll / re-POST */
  mode?: 'stream' | 'legacy';
}

/** Workspace-scoped pointer so resume can find session+run after activeSessionId loss. */
export type ChatRunPointer = PersistedChatRun & {
  workspaceId: string;
};

export interface DatasetsPageViewState {
  sourceFilter?: string;
  searchQuery?: string;
  selectedCatalog?: { kind: string; id: string } | null;
  browseLevel?: string;
  selectedSchemaName?: string | null;
  selectedTableName?: string | null;
  tableSearchQuery?: string;
  connectorDetailTab?: string;
  previewPageSize?: number;
  mobileCatalogPane?: string;
}

export interface MembersViewState {
  tab?: 'members' | 'invites';
  searchInput?: string;
  roleFilter?: string;
  pageSize?: number;
}

/** Semantic keys stored under the `beleh:ui:` namespace (enveloped). */
export const UI_KEYS = {
  selectedDataset: 'selectedDataset',
  chatHeaderCollapsed: 'chatHeaderCollapsed',
  sidebarCollapsed: 'sidebarCollapsed',
  datasetsView: 'datasetsView',
  composerDraft: 'composerDraft',
  chatRun: 'chatRun',
  /** Workspace-scoped pointer to an in-flight chat run (sessionId + runId). */
  chatRunPointer: 'chatRunPointer',
  streamCapability: 'streamCapability',
  workspaceDatasetSearch: 'workspaceDatasetSearch',
  workspaceSessionSearch: 'workspaceSessionSearch',
  workspacesListSearch: 'workspacesListSearch',
  membersView: 'membersView',
  usageTimeRange: 'usageTimeRange',
  datasetPreviewPageSize: 'datasetPreviewPageSize',
} as const;

export type UiKey = (typeof UI_KEYS)[keyof typeof UI_KEYS];

/** Plain localStorage keys kept for backward compatibility with existing readers. */
export const LEGACY_RAW_KEYS = {
  activeWorkspaceId: 'activeWorkspaceId',
  activeSessionId: 'activeSessionId',
} as const;

export function selectedDatasetLegacyKey(uid: string, workspaceId: string): string {
  return `beleh:selectedDataset:${uid}:${workspaceId}`;
}

export function chatHeaderCollapsedLegacyKey(workspaceId: string): string {
  return `beleh-chat-header-collapsed:${workspaceId}`;
}

/* ---------- helpers for enveloped keys ---------- */

export function readSelectedDataset(uid: string, workspaceId: string): string | null {
  const scope: UiMemoryScope = { kind: 'workspace', uid, workspaceId };
  const fromNs = get<string>(scope, UI_KEYS.selectedDataset);
  if (fromNs) return fromNs;
  // Legacy raw
  const legacy = getRawCompat(selectedDatasetLegacyKey(uid, workspaceId));
  if (!legacy || legacy === 'undefined') return null;
  return legacy;
}

export function writeSelectedDataset(
  uid: string,
  workspaceId: string,
  datasetId: string | null,
): void {
  const scope: UiMemoryScope = { kind: 'workspace', uid, workspaceId };
  if (datasetId === null || datasetId === '') {
    remove(scope, UI_KEYS.selectedDataset);
    setRawCompat(selectedDatasetLegacyKey(uid, workspaceId), null);
  } else {
    set(scope, UI_KEYS.selectedDataset, datasetId);
    // Keep legacy key in sync for any leftover readers
    setRawCompat(selectedDatasetLegacyKey(uid, workspaceId), datasetId);
  }
}

export function readActiveWorkspaceId(): string | null {
  const v = getRawCompat(LEGACY_RAW_KEYS.activeWorkspaceId);
  if (!v || v === 'undefined') return null;
  return v;
}

export function writeActiveWorkspaceId(id: string | null): void {
  if (!id || id === 'undefined') {
    setRawCompat(LEGACY_RAW_KEYS.activeWorkspaceId, null);
  } else {
    setRawCompat(LEGACY_RAW_KEYS.activeWorkspaceId, id);
  }
}

export function readActiveSessionId(): string | null {
  const v = getRawCompat(LEGACY_RAW_KEYS.activeSessionId);
  if (!v || v === '1' || v === 'undefined') return null;
  return v;
}

export function writeActiveSessionId(id: string | null): void {
  if (!id || id === '1' || id === 'undefined') {
    setRawCompat(LEGACY_RAW_KEYS.activeSessionId, null);
  } else {
    setRawCompat(LEGACY_RAW_KEYS.activeSessionId, id);
  }
}

export function readChatHeaderCollapsed(uid: string, workspaceId: string): boolean {
  const scope: UiMemoryScope = { kind: 'workspace', uid, workspaceId };
  const v = get<boolean>(scope, UI_KEYS.chatHeaderCollapsed);
  if (typeof v === 'boolean') return v;
  return getRawCompat(chatHeaderCollapsedLegacyKey(workspaceId)) === 'true';
}

export function writeChatHeaderCollapsed(
  uid: string,
  workspaceId: string,
  collapsed: boolean,
): void {
  const scope: UiMemoryScope = { kind: 'workspace', uid, workspaceId };
  set(scope, UI_KEYS.chatHeaderCollapsed, collapsed);
  setRawCompat(chatHeaderCollapsedLegacyKey(workspaceId), String(collapsed));
}

export function readSidebarCollapsed(uid: string): boolean {
  const scope: UiMemoryScope = { kind: 'user', uid };
  return get<boolean>(scope, UI_KEYS.sidebarCollapsed) === true;
}

export function writeSidebarCollapsed(uid: string, collapsed: boolean): void {
  const scope: UiMemoryScope = { kind: 'user', uid };
  set(scope, UI_KEYS.sidebarCollapsed, collapsed);
}

export function readDatasetsView(uid: string, workspaceId: string): DatasetsPageViewState | null {
  const scope: UiMemoryScope = { kind: 'workspace', uid, workspaceId };
  return get<DatasetsPageViewState>(scope, UI_KEYS.datasetsView);
}

export function writeDatasetsView(
  uid: string,
  workspaceId: string,
  state: DatasetsPageViewState,
): void {
  const scope: UiMemoryScope = { kind: 'workspace', uid, workspaceId };
  set(scope, UI_KEYS.datasetsView, state);
}

export function readMembersView(uid: string, workspaceId: string): MembersViewState | null {
  const scope: UiMemoryScope = { kind: 'workspace', uid, workspaceId };
  return get<MembersViewState>(scope, UI_KEYS.membersView);
}

export function writeMembersView(uid: string, workspaceId: string, state: MembersViewState): void {
  const scope: UiMemoryScope = { kind: 'workspace', uid, workspaceId };
  set(scope, UI_KEYS.membersView, state);
}

export function readComposerDraft(uid: string, sessionId: string | null): string {
  if (!sessionId) {
    const scope: UiMemoryScope = { kind: 'user', uid };
    return get<string>(scope, `${UI_KEYS.composerDraft}:new`) ?? '';
  }
  const scope: UiMemoryScope = { kind: 'session', uid, sessionId };
  return get<string>(scope, UI_KEYS.composerDraft) ?? '';
}

export function writeComposerDraft(uid: string, sessionId: string | null, draft: string): void {
  if (!sessionId) {
    const scope: UiMemoryScope = { kind: 'user', uid };
    const key = `${UI_KEYS.composerDraft}:new`;
    if (!draft.trim()) {
      remove(scope, key);
    } else {
      set(scope, key, draft);
    }
    return;
  }
  const scope: UiMemoryScope = { kind: 'session', uid, sessionId };
  if (!draft.trim()) {
    remove(scope, UI_KEYS.composerDraft);
  } else {
    set(scope, UI_KEYS.composerDraft, draft);
  }
}

export function chatRunStorageKey(uid: string, sessionId: string): string {
  return scopedKey({ kind: 'session', uid, sessionId }, UI_KEYS.chatRun);
}

/** Negative cache TTL so clients re-probe after streaming ships. */
export const STREAM_CAPABILITY_NEGATIVE_TTL_MS = 60 * 60 * 1000;

export function readStreamCapability(uid: string): boolean | null {
  const scope: UiMemoryScope = { kind: 'user', uid };
  const v = get<boolean>(scope, UI_KEYS.streamCapability);
  return typeof v === 'boolean' ? v : null;
}

export function writeStreamCapability(uid: string, available: boolean): void {
  const scope: UiMemoryScope = { kind: 'user', uid };
  if (available) {
    set(scope, UI_KEYS.streamCapability, true);
  } else {
    // Only persist "unavailable" temporarily , backend may ship later.
    set(scope, UI_KEYS.streamCapability, false, {
      ttlMs: STREAM_CAPABILITY_NEGATIVE_TTL_MS,
    });
  }
}

export function clearStreamCapability(uid: string): void {
  const scope: UiMemoryScope = { kind: 'user', uid };
  remove(scope, UI_KEYS.streamCapability);
}

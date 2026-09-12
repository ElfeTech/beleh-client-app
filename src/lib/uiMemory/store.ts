/**
 * Typed, scoped, versioned localStorage wrapper for UI preferences.
 * Cross-tab sync via `storage` event + same-tab emitter.
 */

export type UiMemoryScope =
  | { kind: 'global' }
  | { kind: 'user'; uid: string }
  | { kind: 'workspace'; uid: string; workspaceId: string }
  | { kind: 'session'; uid: string; sessionId: string };

const NS = 'beleh:ui:';
const WRAP_VERSION = 1;

export interface UiMemoryEnvelope<T> {
  /** Envelope schema version */
  v: number;
  /** Written-at epoch ms */
  t: number;
  /** Optional absolute expiry epoch ms */
  exp?: number;
  d: T;
}

type Listener = (key: string, value: unknown | null) => void;

const sameTabListeners = new Set<Listener>();

function emitSameTab(key: string, value: unknown | null): void {
  for (const fn of sameTabListeners) {
    try {
      fn(key, value);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function scopePrefix(scope: UiMemoryScope): string {
  switch (scope.kind) {
    case 'global':
      return `${NS}g:`;
    case 'user':
      return `${NS}u:${scope.uid}:`;
    case 'workspace':
      return `${NS}u:${scope.uid}:ws:${scope.workspaceId}:`;
    case 'session':
      return `${NS}u:${scope.uid}:sess:${scope.sessionId}:`;
  }
}

export function scopedKey(scope: UiMemoryScope, key: string): string {
  return `${scopePrefix(scope)}${key}`;
}

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function readRaw(storageKey: string): string | null {
  if (!canUseStorage()) return null;
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function writeRaw(storageKey: string, value: string | null): void {
  if (!canUseStorage()) return;
  try {
    if (value === null) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, value);
    }
  } catch {
    /* quota / private mode */
  }
}

export function readEnvelope<T>(storageKey: string): UiMemoryEnvelope<T> | null {
  const raw = readRaw(storageKey);
  if (!raw || raw === 'undefined') return null;
  try {
    const parsed = JSON.parse(raw) as UiMemoryEnvelope<T>;
    if (!parsed || typeof parsed !== 'object' || !('d' in parsed) || typeof parsed.t !== 'number') {
      return null;
    }
    if (parsed.exp != null && Date.now() > parsed.exp) {
      writeRaw(storageKey, null);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeEnvelope<T>(storageKey: string, data: T, options?: { ttlMs?: number }): void {
  const env: UiMemoryEnvelope<T> = {
    v: WRAP_VERSION,
    t: Date.now(),
    d: data,
  };
  if (options?.ttlMs != null && options.ttlMs > 0) {
    env.exp = Date.now() + options.ttlMs;
  }
  try {
    writeRaw(storageKey, JSON.stringify(env));
    emitSameTab(storageKey, data);
  } catch {
    /* ignore */
  }
}

export function removeKey(storageKey: string): void {
  writeRaw(storageKey, null);
  emitSameTab(storageKey, null);
}

export function get<T>(scope: UiMemoryScope, key: string): T | null {
  const env = readEnvelope<T>(scopedKey(scope, key));
  return env ? env.d : null;
}

export function set<T>(
  scope: UiMemoryScope,
  key: string,
  data: T,
  options?: { ttlMs?: number },
): void {
  writeEnvelope(scopedKey(scope, key), data, options);
}

export function remove(scope: UiMemoryScope, key: string): void {
  removeKey(scopedKey(scope, key));
}

/**
 * Clear all keys under the UI memory namespace for a user (and global if desired).
 * Call on sign-out.
 */
export function clearUserNamespace(uid: string | null | undefined): void {
  if (!canUseStorage()) return;
  try {
    const prefixes = uid ? [`${NS}u:${uid}:`, `${NS}g:`] : [NS];
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (prefixes.some((p) => k.startsWith(p)) || (!uid && k.startsWith(NS))) {
        keys.push(k);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/**
 * Clear every key starting with `beleh:ui:`.
 */
export function clearAllUiMemory(): void {
  clearUserNamespace(null);
}

/**
 * Subscribe to changes for a specific storage key (cross-tab + same-tab).
 * Returns unsubscribe.
 */
export function subscribe(
  storageKey: string,
  listener: (value: unknown | null) => void,
): () => void {
  const onSameTab: Listener = (key, value) => {
    if (key === storageKey) listener(value);
  };
  sameTabListeners.add(onSameTab);

  const onStorage = (e: StorageEvent) => {
    if (e.storageArea !== localStorage) return;
    if (e.key !== storageKey) return;
    if (e.newValue == null) {
      listener(null);
      return;
    }
    try {
      const parsed = JSON.parse(e.newValue) as UiMemoryEnvelope<unknown>;
      if (parsed?.exp != null && Date.now() > parsed.exp) {
        listener(null);
        return;
      }
      listener(parsed?.d ?? null);
    } catch {
      listener(e.newValue);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return () => {
    sameTabListeners.delete(onSameTab);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

/**
 * Write a raw string (no envelope) for keys that other modules still read as plain strings.
 * Still emits same-tab events with the raw string value.
 */
export function setRawCompat(storageKey: string, value: string | null): void {
  writeRaw(storageKey, value);
  emitSameTab(storageKey, value);
}

export function getRawCompat(storageKey: string): string | null {
  return readRaw(storageKey);
}

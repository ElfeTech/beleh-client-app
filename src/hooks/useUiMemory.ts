import { useCallback, useEffect, useState } from 'react';
import { get, remove, scopedKey, set, subscribe, type UiMemoryScope } from '../lib/uiMemory/store';

/**
 * React binding for a scoped UI memory value with cross-tab sync.
 */
export function useUiMemory<T>(
  scope: UiMemoryScope | null,
  key: string,
  fallback: T,
  options?: { ttlMs?: number },
): [T, (next: T | null) => void] {
  const storageKey = scope ? scopedKey(scope, key) : null;
  const scopeKey = scope
    ? `${scope.kind}:${'uid' in scope ? scope.uid : ''}:${'workspaceId' in scope ? scope.workspaceId : ''}:${'sessionId' in scope ? scope.sessionId : ''}:${key}`
    : `null:${key}`;

  const read = useCallback((): T => {
    if (!scope) return fallback;
    return get<T>(scope, key) ?? fallback;
  }, [scope, key, fallback]);

  const [value, setValue] = useState<T>(read);
  const [identity, setIdentity] = useState(scopeKey);

  if (identity !== scopeKey) {
    setIdentity(scopeKey);
    setValue(read());
  }

  useEffect(() => {
    if (!storageKey) return;
    return subscribe(storageKey, (next) => {
      setValue((next as T | null) ?? fallback);
    });
  }, [storageKey, fallback]);

  const update = useCallback(
    (next: T | null) => {
      if (!scope) return;
      if (next === null) {
        remove(scope, key);
        setValue(fallback);
      } else {
        set(scope, key, next, options);
        setValue(next);
      }
    },
    [scope, key, fallback, options],
  );

  return [value, update];
}

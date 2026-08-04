import { apiCacheManager } from '../utils/apiCacheManager';
import { PROVIDER_CACHE_KEYS } from '../types/provider';

export function invalidateProviderConnectionsCache(): void {
  apiCacheManager.invalidateAll(PROVIDER_CACHE_KEYS.connections);
}

export function invalidateProviderHealthCache(): void {
  apiCacheManager.invalidateAll(PROVIDER_CACHE_KEYS.health);
}

export function invalidateProviderProjectsCache(connectionId: string): void {
  apiCacheManager.invalidateAll(PROVIDER_CACHE_KEYS.projects(connectionId));
}

export function invalidateWorkspaceProviderCache(workspaceId: string): void {
  apiCacheManager.invalidateAll(PROVIDER_CACHE_KEYS.workspace(workspaceId));
}

/** Invalidate org-level caches after OAuth success, disconnect, or reconnect. */
export function invalidateProviderOrgCaches(connectionId?: string): void {
  invalidateProviderConnectionsCache();
  invalidateProviderHealthCache();
  if (connectionId) {
    invalidateProviderProjectsCache(connectionId);
  }
}

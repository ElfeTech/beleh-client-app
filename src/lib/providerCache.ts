import { apiCacheManager } from '../utils/apiCacheManager';
import { PROVIDER_CACHE_KEYS } from '../types/provider';
import { SHEETS_CACHE_KEYS } from '../types/sheets';

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

export function invalidateSheetsConnectionsCache(): void {
  apiCacheManager.invalidateAll(SHEETS_CACHE_KEYS.connections);
}

export function invalidateSheetsSpreadsheetsCache(connectionId: string): void {
  apiCacheManager.invalidateAll(SHEETS_CACHE_KEYS.spreadsheets(connectionId));
}

export function invalidateSheetsBindingsCache(workspaceId: string): void {
  apiCacheManager.invalidateAll(SHEETS_CACHE_KEYS.bindings(workspaceId));
}

/** Invalidate Google account caches after OAuth success, disconnect, or reconnect. */
export function invalidateSheetsAccountCaches(connectionId?: string): void {
  invalidateSheetsConnectionsCache();
  if (connectionId) {
    invalidateSheetsSpreadsheetsCache(connectionId);
  }
}

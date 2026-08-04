/** Provider (Supabase OAuth) API types , /api/v1/provider/* */

export type ProviderErrorCode =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_STATE_INVALID'
  | 'PROVIDER_TOKEN_EXCHANGE_FAILED'
  | 'PROVIDER_CONNECTION_NOT_FOUND'
  | 'PROVIDER_ORG_MISMATCH'
  | 'PROVIDER_PROJECT_NOT_FOUND'
  | 'PROVIDER_PROJECT_INACTIVE'
  | 'PROVIDER_FORBIDDEN'
  | 'PROVIDER_WORKSPACE_NOT_FOUND'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_CREDENTIALS_DISABLED'
  | 'PROVIDER_ANON_KEY_UNAVAILABLE';

export interface ProviderApiErrorBody {
  detail: string;
  code?: ProviderErrorCode | string;
}

export interface ProviderOAuthUrlResponse {
  url: string;
}

export interface ProviderConnection {
  id: string;
  organization: string;
  connected_at: string;
  expires_at: string;
}

export interface ProviderDisconnectResponse {
  success: boolean;
}

export interface ProviderProject {
  id: string;
  name: string;
  organization: string;
  status: string;
  is_active: boolean;
  dashboard_url: string;
}

export interface ProviderHealthConnection {
  id: string;
  organization: string;
  healthy: boolean;
  expires_at: string;
  detail: string | null;
}

export interface ProviderHealthResponse {
  connections: ProviderHealthConnection[];
}

export interface WorkspaceProviderBindRequest {
  provider_project_id: string;
  provider_project_name: string;
  provider_organization: string;
}

export interface WorkspaceProviderBinding {
  id: string;
  name: string;
  is_connected: boolean;
  provider_project_id: string | null;
  provider_project_name: string | null;
  provider_organization: string | null;
}

export interface WorkspaceProviderBindResponse {
  success: boolean;
  workspace: WorkspaceProviderBinding;
}

export interface WorkspaceProviderUnbindResponse {
  success: boolean;
}

/** Sandbox / agent tooling only , disabled by default (PROVIDER_CREDENTIALS_DISABLED). */
export interface WorkspaceProviderCredentials {
  connected: boolean;
  project_url: string;
  anon_key: string;
}

export type ProviderOAuthMessageType = 'PROVIDER_OAUTH_SUCCESS' | 'PROVIDER_OAUTH_ERROR';

export interface ProviderOAuthSuccessMessage {
  type: 'PROVIDER_OAUTH_SUCCESS';
  organization?: string;
  error?: undefined;
}

export interface ProviderOAuthErrorMessage {
  type: 'PROVIDER_OAUTH_ERROR';
  organization?: string;
  error?: string;
}

export type ProviderOAuthMessage = ProviderOAuthSuccessMessage | ProviderOAuthErrorMessage;

/** Cache keys (semantic , used with apiCacheManager) */
export const PROVIDER_CACHE_KEYS = {
  connections: 'provider:connections',
  health: 'provider:health',
  projects: (connectionId: string) => `provider:projects:${connectionId}`,
  workspace: (workspaceId: string) => `workspace:${workspaceId}:provider`,
} as const;

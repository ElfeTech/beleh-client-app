import type { ConnectorResponse } from '../types/api';
import type { WorkspaceProviderBindResponse } from '../types/provider';

export function isSchemaSyncInProgress(status: ConnectorResponse['metadata_status']): boolean {
  return status === 'PENDING' || status === 'PROCESSING';
}

export function connectorIdFromBindResponse(
  response: WorkspaceProviderBindResponse,
): string | undefined {
  const fromRoot = response.connector_id?.trim();
  if (fromRoot) return fromRoot;
  const fromConnector = response.connector?.id?.trim();
  return fromConnector || undefined;
}

/** Prefer the bind payload, then the refreshed list (companion may appear a beat later). */
export function resolveBoundCompanion(
  response: WorkspaceProviderBindResponse,
  list: ConnectorResponse[],
  projectName: string,
): ConnectorResponse | undefined {
  if (response.connector?.id) return response.connector;
  const connectorId = connectorIdFromBindResponse(response);
  if (connectorId) {
    const match = list.find((connector) => connector.id === connectorId);
    if (match) return match;
  }
  const pending = list.filter((connector) => isSchemaSyncInProgress(connector.metadata_status));
  return pending.find((connector) => connector.name === projectName) ?? pending[0];
}

export function stubPendingCompanion(
  id: string,
  name: string,
  workspaceId: string,
): ConnectorResponse {
  return {
    id,
    name,
    type: 'supabase',
    status: 'SYNCING',
    metadata_status: 'PENDING',
    last_sync_at: null,
    workspace_id: workspaceId,
    created_at: new Date().toISOString(),
    updated_at: null,
  };
}

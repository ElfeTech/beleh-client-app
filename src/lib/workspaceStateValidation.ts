import type { ConnectorResponse, DataSourceResponse } from '../types/api';

/** IDs that must never be sent to the API as session identifiers */
const INVALID_SESSION_IDS = new Set(['1', 'undefined', 'null', '']);

export function isValidSessionIdForState(sessionId: string | null | undefined): boolean {
  if (!sessionId) return false;
  const trimmed = sessionId.trim();
  if (INVALID_SESSION_IDS.has(trimmed)) return false;
  return trimmed.length >= 8;
}

/**
 * The workspace /state endpoint only accepts datasource (dataset) IDs in
 * last_active_dataset_id — not connector IDs and not deleted/stale IDs.
 */
export function resolveDatasetIdForStateEndpoint(
  datasetId: string | null | undefined,
  datasources: DataSourceResponse[],
  _connectors: ConnectorResponse[],
): string | null {
  if (!datasetId || datasetId === 'undefined') return null;
  const inDatasources = datasources.some((d) => d.id === datasetId);
  if (inDatasources) return datasetId;
  // Connector IDs are valid for chat UI but must not be PATCHed as last_active_dataset_id
  return null;
}

export function isSourceInWorkspace(
  id: string | null | undefined,
  datasources: DataSourceResponse[],
  connectors: ConnectorResponse[],
): boolean {
  if (!id) return false;
  return datasources.some((d) => d.id === id) || connectors.some((c) => c.id === id);
}

export function isDatasetStateError(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'detail' in err
        ? String((err as { detail: unknown }).detail)
        : '';
  return /dataset does not exist|does not belong to this workspace/i.test(message);
}

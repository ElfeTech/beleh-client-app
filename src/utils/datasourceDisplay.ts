import type { ConnectorResponse, DataSourceResponse } from '../types/api';

export function formatSourceType(ds: DataSourceResponse): string {
  const raw = (ds.type || ds.mime_type || 'DATA').toUpperCase();
  if (raw.includes('POSTGRES') || raw === 'SQL') return 'POSTGRES';
  if (raw.includes('EXCEL') || raw.includes('SPREADSHEET') || raw === 'XLSX') return 'EXCEL';
  if (raw.includes('CSV')) return 'CSV';
  if (raw.includes('MONGO')) return 'MONGODB';
  return raw.replace(/\s+/g, '_').slice(0, 16);
}

export type WorkspaceSourceKind = 'general' | 'datasource' | 'connector';

export interface WorkspaceSourceContext {
  kind: WorkspaceSourceKind;
  id: string | null;
  displayName: string;
  typeLabel: string;
  connectionPath: string;
  statusLabel: string;
  statusTone: 'excellent' | 'syncing' | 'warning' | 'neutral';
}

function mapStatusToClusterLabel(
  status: string | undefined,
  metadataStatus?: string,
): { label: string; tone: WorkspaceSourceContext['statusTone'] } {
  const s = (status || '').toUpperCase();
  const meta = (metadataStatus || '').toUpperCase();

  if (s === 'READY' || s === 'ACTIVE' || meta === 'COMPLETED') {
    return { label: 'READY // EXCELLENT', tone: 'excellent' };
  }
  if (s === 'PROCESSING' || meta === 'PROCESSING' || meta === 'PENDING') {
    return { label: 'SYNCING // PROCESSING', tone: 'syncing' };
  }
  if (s === 'FAILED' || meta === 'FAILED') {
    return { label: 'DEGRADED // CHECK SOURCE', tone: 'warning' };
  }
  return { label: 'STANDBY // GENERAL', tone: 'neutral' };
}

export function getWorkspaceSourceContext(
  selectedDatasourceId: string | null,
  datasources: DataSourceResponse[],
  connectors: ConnectorResponse[] = [],
): WorkspaceSourceContext {
  if (!selectedDatasourceId) {
    return {
      kind: 'general',
      id: null,
      displayName: 'GENERAL',
      typeLabel: 'MODE',
      connectionPath: 'No datasource selected — general analytical mode',
      statusLabel: 'STANDBY // GENERAL',
      statusTone: 'neutral',
    };
  }

  const ds = datasources.find((d) => d.id === selectedDatasourceId);
  if (ds) {
    const { label, tone } = mapStatusToClusterLabel(ds.status);
    const path =
      ds.duckdb_storage_path || `${ds.name.toLowerCase().replace(/\s+/g, '-')}.beleh.local`;
    return {
      kind: 'datasource',
      id: ds.id,
      displayName: ds.name.toUpperCase(),
      typeLabel: formatSourceType(ds),
      connectionPath: path,
      statusLabel: label,
      statusTone: tone,
    };
  }

  const connector = connectors.find((c) => c.id === selectedDatasourceId);
  if (connector) {
    const { label, tone } = mapStatusToClusterLabel(connector.status, connector.metadata_status);
    return {
      kind: 'connector',
      id: connector.id,
      displayName: connector.name.toUpperCase(),
      typeLabel: connector.type.toUpperCase(),
      connectionPath: `${connector.type}-connector.beleh.inter`,
      statusLabel: label,
      statusTone: tone,
    };
  }

  return {
    kind: 'general',
    id: selectedDatasourceId,
    displayName: 'UNKNOWN',
    typeLabel: 'SOURCE',
    connectionPath: 'Selected source unavailable',
    statusLabel: 'DEGRADED // CHECK SOURCE',
    statusTone: 'warning',
  };
}

export function countSchemaTables(
  selectedDatasourceId: string | null,
  datasources: DataSourceResponse[],
  connectors: ConnectorResponse[] = [],
): number | null {
  if (!selectedDatasourceId) return null;
  const ds = datasources.find((d) => d.id === selectedDatasourceId);
  if (ds?.metadata_json?.columns?.length) {
    return ds.metadata_json.columns.length;
  }
  const connector = connectors.find((c) => c.id === selectedDatasourceId);
  if (connector && connector.metadata_status === 'COMPLETED') {
    return null;
  }
  return null;
}

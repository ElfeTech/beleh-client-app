import type { LucideIcon } from 'lucide-react';
import { Braces, Database, FileSpreadsheet, FileText, Layers, Table2 } from 'lucide-react';
import type { ConnectorResponse, DataSourceResponse } from '../types/api';

export function formatSourceType(ds: DataSourceResponse): string {
  const raw = (ds.type || ds.mime_type || 'DATA').toUpperCase();
  if (raw.includes('POSTGRES') || raw === 'SQL') return 'POSTGRES';
  if (raw.includes('EXCEL') || raw.includes('SPREADSHEET') || raw === 'XLSX') return 'EXCEL';
  if (raw.includes('CSV')) return 'CSV';
  if (raw.includes('MONGO')) return 'MONGODB';
  return raw.replace(/\s+/g, '_').slice(0, 16);
}

export function getSourceTypeIcon(options: {
  kind?: 'datasource' | 'connector' | 'general';
  type?: string | null;
  mimeType?: string | null;
}): LucideIcon {
  if (!options.kind || options.kind === 'general') return Layers;
  if (options.kind === 'connector') return Database;
  const raw = `${options.type ?? ''} ${options.mimeType ?? ''}`.toUpperCase();
  if (raw.includes('POSTGRES') || raw.includes('SQL') || raw.includes('MONGO')) return Database;
  if (raw.includes('EXCEL') || raw.includes('SPREADSHEET') || raw.includes('XLSX')) {
    return FileSpreadsheet;
  }
  if (raw.includes('CSV')) return Table2;
  if (raw.includes('JSON')) return Braces;
  return FileText;
}

export function getSelectedSourceIcon(
  selectedDatasourceId: string | null,
  datasources: DataSourceResponse[],
  connectors: ConnectorResponse[] = [],
): LucideIcon {
  if (!selectedDatasourceId) return Layers;
  const ds = datasources.find((d) => d.id === selectedDatasourceId);
  if (ds) {
    return getSourceTypeIcon({ kind: 'datasource', type: ds.type, mimeType: ds.mime_type });
  }
  const connector = connectors.find((c) => c.id === selectedDatasourceId);
  if (connector) return getSourceTypeIcon({ kind: 'connector', type: connector.type });
  return Layers;
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
      displayName: 'All sources',
      typeLabel: 'MODE',
      connectionPath: 'No datasource selected , analyzing all workspace sources',
      statusLabel: 'STANDBY // ALL SOURCES',
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
      displayName: ds.name,
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
      displayName: connector.name,
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

import type {
  ConnectorResponse,
  DataSourceColumn,
  DataSourceResponse,
  DatasetTable,
  DatasetTableColumn,
} from '../types/api';

export type CatalogSourceKind = 'connector' | 'datasource';

export type CatalogSourceRef = {
  kind: CatalogSourceKind;
  id: string;
};

export function catalogSourceKey(ref: CatalogSourceRef): string {
  return `${ref.kind}:${ref.id}`;
}

export function tablesFromMetadata(datasource: DataSourceResponse): DatasetTable[] {
  const columns = datasource.metadata_json?.columns;
  if (!columns?.length) return [];

  const mapped: DatasetTableColumn[] = columns.map((col) => ({
    name: col.name,
    type: col.type || 'TEXT',
  }));

  return [
    {
      table_name: datasource.name.replace(/\s+/g, '_').toLowerCase() || 'dataset',
      row_count: datasource.metadata_json?.row_count ?? 0,
      column_count: mapped.length,
      columns: mapped,
    },
  ];
}

export function isPrimaryKeyColumn(col: DataSourceColumn | DatasetTableColumn, index: number): boolean {
  const role = 'role' in col ? col.role : undefined;
  if (role && /primary|pk/i.test(role)) return true;
  const name = col.name.toLowerCase();
  return index === 0 && (name === 'id' || name.endsWith('_id'));
}

export function getSourceDisplayName(
  kind: CatalogSourceKind,
  connector?: ConnectorResponse,
  datasource?: DataSourceResponse
): string {
  if (kind === 'connector' && connector) return connector.name;
  if (datasource) return datasource.name;
  return 'Unknown source';
}

export function getSourceHostHint(
  kind: CatalogSourceKind,
  connector?: ConnectorResponse,
  datasource?: DataSourceResponse
): string {
  if (kind === 'connector' && connector) {
    return `${connector.type.toUpperCase()} · Workspace connector`;
  }
  if (datasource) {
    const ext = datasource.mime_type?.split('/').pop()?.toUpperCase() || 'FILE';
    return `${ext} · Uploaded dataset`;
  }
  return '';
}

export function getSourceTableCountLabel(
  kind: CatalogSourceKind,
  tableCount: number | null,
  metadataStatus?: ConnectorResponse['metadata_status']
): string {
  if (kind === 'connector' && metadataStatus !== 'COMPLETED') {
    return 'Schema pending';
  }
  if (tableCount === null) return '— tables';
  return `${tableCount} table${tableCount === 1 ? '' : 's'}`;
}

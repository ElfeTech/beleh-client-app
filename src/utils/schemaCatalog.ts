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

/** Drill level inside a selected source (connectors use schemas). */
export type CatalogBrowseLevel = 'schemas' | 'tables';

export type CatalogTableIdentity = {
  schema: string;
  name: string;
  /** Original table_name from the API (used for selection keys). */
  key: string;
};

export type CatalogSchemaGroup = {
  name: string;
  tables: DatasetTable[];
  tableCount: number;
  columnCount: number;
  rowCount: number;
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

/**
 * Resolve schema + short table name from API payloads.
 * Prefers explicit `schema_name`; otherwise parses `schema.table` / falls back to `public`.
 */
export function parseTableIdentity(table: DatasetTable): CatalogTableIdentity {
  const key = table.table_name;
  const explicit = table.schema_name?.trim();
  if (explicit) {
    // If table_name is already qualified with the same schema, strip it for display.
    const prefix = `${explicit}.`;
    const name = key.startsWith(prefix) ? key.slice(prefix.length) : key;
    return { schema: explicit, name, key };
  }

  const quoted = key.match(/^"([^"]+)"\."([^"]+)"$/);
  if (quoted) {
    return { schema: quoted[1], name: quoted[2], key };
  }

  const plain = key.match(/^([A-Za-z_][\w$]*)\.([A-Za-z_][\w$]*)$/);
  if (plain) {
    return { schema: plain[1], name: plain[2], key };
  }

  return { schema: 'public', name: key, key };
}

export function groupTablesBySchema(tables: DatasetTable[]): CatalogSchemaGroup[] {
  const map = new Map<string, DatasetTable[]>();

  for (const table of tables) {
    const { schema } = parseTableIdentity(table);
    const list = map.get(schema);
    if (list) list.push(table);
    else map.set(schema, [table]);
  }

  const groups: CatalogSchemaGroup[] = [...map.entries()].map(([name, groupTables]) => ({
    name,
    tables: groupTables.slice().sort((a, b) => {
      const an = parseTableIdentity(a).name.toLowerCase();
      const bn = parseTableIdentity(b).name.toLowerCase();
      return an.localeCompare(bn);
    }),
    tableCount: groupTables.length,
    columnCount: groupTables.reduce(
      (sum, t) => sum + (t.column_count || t.columns?.length || 0),
      0,
    ),
    rowCount: groupTables.reduce((sum, t) => sum + (t.row_count || 0), 0),
  }));

  groups.sort((a, b) => {
    if (a.name === 'public') return -1;
    if (b.name === 'public') return 1;
    return a.name.localeCompare(b.name);
  });

  return groups;
}

export function filterTablesByQuery(tables: DatasetTable[], query: string): DatasetTable[] {
  const q = query.trim().toLowerCase();
  if (!q) return tables;
  return tables.filter((t) => {
    const id = parseTableIdentity(t);
    return (
      id.key.toLowerCase().includes(q) ||
      id.name.toLowerCase().includes(q) ||
      id.schema.toLowerCase().includes(q)
    );
  });
}

export function filterSchemaGroupsByQuery(
  groups: CatalogSchemaGroup[],
  query: string,
): CatalogSchemaGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.tables.some((t) => {
        const id = parseTableIdentity(t);
        return id.name.toLowerCase().includes(q) || id.key.toLowerCase().includes(q);
      }),
  );
}

export function isPrimaryKeyColumn(
  col: DataSourceColumn | DatasetTableColumn,
  index: number,
): boolean {
  const role = 'role' in col ? col.role : undefined;
  if (role && /primary|pk/i.test(role)) return true;
  const name = col.name.toLowerCase();
  return index === 0 && (name === 'id' || name.endsWith('_id'));
}

export function getSourceDisplayName(
  kind: CatalogSourceKind,
  connector?: ConnectorResponse,
  datasource?: DataSourceResponse,
): string {
  if (kind === 'connector' && connector) return connector.name;
  if (datasource) return datasource.name;
  return 'Unknown source';
}

export function getSourceHostHint(
  kind: CatalogSourceKind,
  connector?: ConnectorResponse,
  datasource?: DataSourceResponse,
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
  metadataStatus?: ConnectorResponse['metadata_status'],
): string {
  if (kind === 'connector' && metadataStatus !== 'COMPLETED') {
    return 'Schema pending';
  }
  if (tableCount === null) return '— tables';
  return `${tableCount} table${tableCount === 1 ? '' : 's'}`;
}

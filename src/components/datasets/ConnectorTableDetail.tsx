import { Columns3, Database, Table2 } from 'lucide-react';
import type { DatasetTable, DatasetTablePreviewResponse } from '../../types/api';
import { isPrimaryKeyColumn, parseTableIdentity } from '../../utils/schemaCatalog';
import { cn } from '../../lib/utils';
import { DatasetPreviewGrid } from './DatasetPreviewGrid';

export type ConnectorDetailTab = 'columns' | 'data';

interface ConnectorTableDetailProps {
  table: DatasetTable;
  activeTab: ConnectorDetailTab;
  onTabChange: (tab: ConnectorDetailTab) => void;
  preview: DatasetTablePreviewResponse | null;
  previewLoading: boolean;
  previewError?: string | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function ConnectorTableDetail({
  table,
  activeTab,
  onTabChange,
  preview,
  previewLoading,
  previewError,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: Readonly<ConnectorTableDetailProps>) {
  const identity = parseTableIdentity(table);
  const columns = table.columns ?? [];

  return (
    <div className="sc-connector-schema">
      <div className="sc-connector-schema__hero">
        <div className="sc-connector-schema__hero-icon" aria-hidden>
          <Table2 className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="sc-connector-schema__hero-text">
          <p className="sc-connector-schema__schema-path">
            <Database className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span>{identity.schema}</span>
            <span className="sc-connector-schema__sep" aria-hidden>
              /
            </span>
          </p>
          <h2 className="sc-connector-schema__title">{identity.name}</h2>
          <div className="sc-connector-schema__meta">
            <span>{table.column_count || columns.length} columns</span>
            <span>{table.row_count.toLocaleString()} approx. rows</span>
          </div>
        </div>
      </div>

      <div className="sc-detail-tabs" role="tablist" aria-label="Table details">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'columns'}
          className={cn('sc-detail-tab', activeTab === 'columns' && 'is-active')}
          onClick={() => onTabChange('columns')}
        >
          <Columns3 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          Columns
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'data'}
          className={cn('sc-detail-tab', activeTab === 'data' && 'is-active')}
          onClick={() => onTabChange('data')}
        >
          <Table2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          Data
        </button>
      </div>

      {activeTab === 'columns' ? (
        columns.length > 0 ? (
          <ul className="sc-connector-schema__cols">
            {columns.map((col, index) => {
              const isPk = isPrimaryKeyColumn(col, index);
              return (
                <li key={col.name}>
                  <div className="sc-connector-schema__col-main">
                    <span className="sc-connector-schema__col-name">{col.name}</span>
                    {isPk ? <span className="sc-pk-badge">PK</span> : null}
                  </div>
                  <span className="sc-connector-schema__col-type">{col.type || 'unknown'}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="sc-empty-panel">
            <h3>No column metadata</h3>
            <p>Column details were not returned for this table.</p>
          </div>
        )
      ) : previewError && !previewLoading ? (
        <div className="sc-empty-panel">
          <h3>Could not load preview</h3>
          <p>{previewError}</p>
        </div>
      ) : (
        <DatasetPreviewGrid
          embedded
          tableName={identity.name}
          estimatedRows={table.row_count}
          schemaColumnCount={table.column_count || columns.length}
          preview={preview}
          loading={previewLoading}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

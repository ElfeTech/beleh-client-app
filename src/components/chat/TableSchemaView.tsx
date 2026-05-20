import { useMemo, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { DataTable } from './charts/DataTable';
import { downloadCsvFile } from '../../utils/exportCsv';
import './TableSchemaView.css';

interface TableSchemaViewProps {
  columns: string[];
  rows: Record<string, unknown>[];
}

export function TableSchemaView({ columns, rows }: TableSchemaViewProps) {
  const [filter, setFilter] = useState('');

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => String(row[col] ?? '').toLowerCase().includes(q))
    );
  }, [rows, columns, filter]);

  const handleDownload = () => {
    downloadCsvFile(rows as Record<string, unknown>[], columns, `beleh-table-${Date.now()}.csv`);
  };

  return (
    <div className="table-schema-view">
      <div className="table-schema-view__toolbar">
        <div className="table-schema-view__search">
          <Search className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" strokeWidth={2} />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter response rows..."
            className="table-schema-view__search-input"
            aria-label="Filter response rows"
          />
        </div>
        <button type="button" className="table-schema-view__download" onClick={handleDownload}>
          <Download className="h-4 w-4" strokeWidth={2} />
          Download CSV
        </button>
      </div>
      <DataTable
        columns={columns}
        data={filteredRows as Record<string, unknown>[]}
      />
    </div>
  );
}

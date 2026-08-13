import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Maximize2,
  Search,
} from 'lucide-react';
import type { DatasetTablePreviewResponse } from '../../types/api';
import './DatasetPreviewGrid.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const SEARCH_DEBOUNCE_MS = 300;

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function downloadCsv(tableName: string, columns: { name: string }[], rows: unknown[][]) {
  const header = columns.map((c) => c.name).join(',');
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = formatCellValue(cell);
          const escaped = s.replace(/"/g, '""');
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob([[header, body].filter(Boolean).join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tableName}-preview.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface DatasetPreviewGridProps {
  tableName: string;
  estimatedRows: number;
  schemaColumnCount: number;
  preview: DatasetTablePreviewResponse | null;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Server-side search query currently applied to the preview fetch. */
  searchQuery?: string;
  /** Called with debounced search text; parent should refetch and reset page. */
  onSearchChange?: (query: string) => void;
  syncVerified?: boolean;
  embedded?: boolean;
  onExpand?: () => void;
}

export const DatasetPreviewGrid: React.FC<DatasetPreviewGridProps> = ({
  tableName,
  estimatedRows,
  schemaColumnCount,
  preview,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchQuery = '',
  onSearchChange,
  syncVerified = true,
  embedded = false,
  onExpand,
}) => {
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery, tableName]);

  useEffect(() => {
    if (!onSearchChange) return;
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      const current = searchQuery.trim();
      if (next === current) return;
      onSearchChange(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput, searchQuery, onSearchChange]);

  const columns = preview?.columns ?? [];
  const rawRows = preview?.rows ?? [];
  const totalRows = preview?.total_rows ?? estimatedRows;
  const totalPages = preview?.total_pages ?? 1;
  const activeSearch = searchQuery.trim();

  const displayRows = useMemo(() => {
    let rows = rawRows.map((row, i) => ({ row, index: i }));
    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const av = formatCellValue(a.row[sortCol]);
        const bv = formatCellValue(b.row[sortCol]);
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [rawRows, sortCol, sortDir]);

  const pageStart = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const displayEnd = totalRows === 0 ? 0 : Math.min(page * pageSize, totalRows);
  const showingStart = displayRows.length === 0 ? 0 : pageStart;
  const showingEnd =
    displayRows.length === 0 ? 0 : Math.min(pageStart + displayRows.length - 1, displayEnd);

  const toggleSort = (colIndex: number) => {
    if (sortCol === colIndex) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colIndex);
      setSortDir('asc');
    }
  };

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const rootClass = ['dataset-preview-grid', embedded ? 'dataset-preview-grid--embedded' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      <header className="dataset-preview-grid__header">
        <div>
          <div className="dataset-preview-grid__title-row">
            <h2 className="dataset-preview-grid__title">{tableName}</h2>
            {syncVerified && (
              <span className="dataset-preview-grid__sync-badge">
                <Check size={12} strokeWidth={3} aria-hidden />
                Sync
              </span>
            )}
          </div>
          <p className="dataset-preview-grid__meta">
            Estimated rows: {estimatedRows.toLocaleString()} | Schema columns: {schemaColumnCount}
          </p>
        </div>
        <div className="dataset-preview-grid__toolbar">
          <button
            type="button"
            className="dataset-preview-grid__tool-btn"
            disabled={!preview || rawRows.length === 0}
            onClick={() => preview && downloadCsv(tableName, columns, rawRows)}
            title="Download current page as CSV"
            aria-label="Download preview"
          >
            <Download size={14} aria-hidden />
          </button>
          {onExpand && (
            <button
              type="button"
              className="dataset-preview-grid__tool-btn"
              onClick={onExpand}
              title="Open full preview"
              aria-label="Expand preview"
            >
              <Maximize2 size={14} aria-hidden />
            </button>
          )}
        </div>
      </header>

      <div className="dataset-preview-grid__controls">
        <div className="dataset-preview-grid__search">
          <Search className="dataset-preview-grid__search-icon" size={16} aria-hidden />
          <input
            type="search"
            className="dataset-preview-grid__search-input"
            placeholder="Search all rows…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search all rows in table"
            disabled={!onSearchChange}
          />
        </div>
        <span className="dataset-preview-grid__range">
          Showing {showingStart} - {showingEnd} of {totalRows.toLocaleString()} rows
          {activeSearch ? ' matching search' : ''}
        </span>
      </div>

      {loading && !preview ? (
        <div className="dataset-preview-grid__loading" aria-busy>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="dataset-preview-grid__skeleton-row" />
          ))}
        </div>
      ) : !preview || columns.length === 0 ? (
        <div className="dataset-preview-grid__empty">No preview data available.</div>
      ) : (
        <div className="dataset-preview-grid__table-wrap" aria-busy={loading}>
          <table className="dataset-preview-grid__table">
            <thead>
              <tr>
                <th className="index-col" scope="col">
                  #
                </th>
                {columns.map((col, i) => (
                  <th key={col.name} scope="col">
                    <div className="dataset-preview-grid__th-inner">
                      <div className="dataset-preview-grid__th-text">
                        <span className="dataset-preview-grid__col-name">{col.name}</span>
                        <span className="dataset-preview-grid__col-type">{col.type}</span>
                      </div>
                      <button
                        type="button"
                        className="dataset-preview-grid__sort-btn"
                        onClick={() => toggleSort(i)}
                        aria-label={`Sort by ${col.name}`}
                      >
                        {sortCol === i && sortDir === 'desc' ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronUp size={14} />
                        )}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="dataset-preview-grid__empty">
                    {activeSearch ? 'No rows match your search.' : 'No rows to display.'}
                  </td>
                </tr>
              ) : (
                displayRows.map(({ row, index }) => (
                  <tr key={`${page}-${index}`}>
                    <td className="index-col">{pageStart + index}</td>
                    {row.map((cell, ci) => (
                      <td key={ci}>
                        {cell === null || cell === undefined ? (
                          <span className="dataset-preview-grid__null">NULL</span>
                        ) : (
                          formatCellValue(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <footer className="dataset-preview-grid__footer">
        <label className="dataset-preview-grid__density">
          Rows density:
          <select
            className="dataset-preview-grid__density-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </label>
        <nav className="dataset-preview-grid__pagination" aria-label="Table pagination">
          <button
            type="button"
            className="dataset-preview-grid__page-btn"
            disabled={!canPrev}
            onClick={() => onPageChange(1)}
          >
            First
          </button>
          <button
            type="button"
            className="dataset-preview-grid__page-btn"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>
          <span className="dataset-preview-grid__page-indicator">
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            className="dataset-preview-grid__page-btn"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
          <button
            type="button"
            className="dataset-preview-grid__page-btn"
            disabled={!canNext}
            onClick={() => onPageChange(totalPages)}
          >
            Last
          </button>
        </nav>
      </footer>
    </div>
  );
};

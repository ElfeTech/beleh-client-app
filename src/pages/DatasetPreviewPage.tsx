import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/useAuth';
import { ActionSheet, type ActionSheetItem } from '../components/common/ActionSheet';
import { DatasetPreviewGrid } from '../components/datasets/DatasetPreviewGrid';
import type { DatasetTable, DatasetTablePreviewResponse } from '../types/api';
import { useUiMemory } from '../hooks/useUiMemory';
import { UI_KEYS, type UiMemoryScope } from '../lib/uiMemory';
import { isAbortError } from '../utils/apiErrorMessage';
import './DatasetPreviewPage.css';

export const DatasetPreviewPage: React.FC = () => {
  const { id: workspaceId, datasetId } = useParams<{ id: string; datasetId: string }>();
  const [searchParams] = useSearchParams();
  const initialTable = searchParams.get('table') ?? '';
  const navigate = useNavigate();
  const { user } = useAuth();

  const [datasetName, setDatasetName] = useState('');
  const [tables, setTables] = useState<DatasetTable[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [previewData, setPreviewData] = useState<DatasetTablePreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewSearch, setPreviewSearch] = useState('');
  const previewSizeScope: UiMemoryScope | null = user?.uid ? { kind: 'user', uid: user.uid } : null;
  const [pageSize, setPageSizeRaw] = useUiMemory(
    previewSizeScope,
    UI_KEYS.datasetPreviewPageSize,
    10,
  );
  const setPageSize = (n: number) => setPageSizeRaw(n);
  const [showTableActionSheet, setShowTableActionSheet] = useState(false);

  const selectedTableMeta = tables.find((t) => t.table_name === selectedTable);

  const fetchDatasetInfo = useCallback(async () => {
    if (!user || !datasetId) return;
    try {
      const token = await user.getIdToken();
      const ds = await apiClient.getDatasource(token, datasetId);
      setDatasetName(ds.name);
    } catch (err) {
      console.error('Failed to fetch dataset info:', err);
    }
  }, [user, datasetId]);

  const fetchTables = useCallback(async () => {
    if (!user || !datasetId) return;
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const tables: DatasetTable[] = [];
      let page = 1;
      while (page <= 10) {
        const response = await apiClient.listDatasetTables(token, datasetId, {
          page,
          page_size: 100,
        });
        tables.push(...(response.tables ?? []));
        if (!response.has_next) break;
        page += 1;
      }
      setTables(tables);
      if (tables.length > 0) {
        const fromUrl = initialTable
          ? tables.find((t) => t.table_name === initialTable)?.table_name
          : undefined;
        const firstTable = fromUrl ?? tables[0].table_name;
        setSelectedTable(firstTable);
        setLoading(false);
      } else {
        setError('No tables found in this dataset.');
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch tables:', err);
      const message = err instanceof Error ? err.message : 'Failed to load tables.';
      setError(message);
      setLoading(false);
    }
  }, [user, datasetId, initialTable]);

  useEffect(() => {
    setTables([]);
    setSelectedTable('');
    setPreviewData(null);
    setError(null);
    setCurrentPage(1);
    setPreviewSearch('');
    setLoading(true);
  }, [datasetId]);

  useEffect(() => {
    setPreviewData(null);
    setCurrentPage(1);
    setPreviewSearch('');
  }, [selectedTable]);

  useEffect(() => {
    if (datasetId) {
      fetchDatasetInfo();
      fetchTables();
    }
  }, [datasetId, fetchDatasetInfo, fetchTables]);

  useEffect(() => {
    if (!user || !datasetId || loading || tables.length === 0) return;

    const tableExists = tables.some((t) => t.table_name === selectedTable);
    if (!selectedTable || !tableExists) return;

    const controller = new AbortController();

    (async () => {
      setDataLoading(true);
      try {
        const token = await user.getIdToken();
        if (controller.signal.aborted) return;
        const response = await apiClient.getDatasetTablePreview(
          token,
          datasetId,
          selectedTable,
          currentPage,
          pageSize,
          previewSearch,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setPreviewData(response);
      } catch (err: unknown) {
        if (isAbortError(err) || controller.signal.aborted) return;
        console.error('Failed to fetch preview:', err);
        const message = err instanceof Error ? err.message : 'Failed to load preview data.';
        setError(message);
      } finally {
        if (!controller.signal.aborted) setDataLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [user, datasetId, selectedTable, currentPage, pageSize, previewSearch, tables, loading]);

  const handleBack = () => {
    navigate(`/workspace/${workspaceId}/datasets`);
  };

  const tableItems: ActionSheetItem[] = tables.map((table) => ({
    id: table.table_name,
    label: `${table.table_name} (${table.row_count.toLocaleString()} rows)`,
    onClick: () => {
      setSelectedTable(table.table_name);
      setCurrentPage(1);
      setPreviewSearch('');
      setShowTableActionSheet(false);
    },
  }));

  const handlePreviewSearchChange = (query: string) => {
    setPreviewSearch(query);
    setCurrentPage(1);
  };

  return (
    <div className="preview-page app-page-root">
      <header className="preview-page-header">
        <button className="preview-page-back" onClick={handleBack} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back to catalog</span>
        </button>
        <div className="preview-page-header__main">
          <h1 className="preview-page-title">{datasetName || 'Dataset preview'}</h1>
          {tables.length > 0 && (
            <button
              type="button"
              className="preview-page-table-select"
              onClick={() => setShowTableActionSheet(true)}
            >
              <span>{selectedTable || 'Select table'}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="preview-page-main">
        {loading ? (
          <div className="preview-page-state">
            <div className="preview-page-spinner" />
            <p>Loading tables…</p>
          </div>
        ) : error ? (
          <div className="preview-page-state preview-page-state--error">
            <p>{error}</p>
            <button type="button" className="btn-gradient-primary" onClick={fetchTables}>
              Retry
            </button>
          </div>
        ) : selectedTable && selectedTableMeta ? (
          <DatasetPreviewGrid
            tableName={selectedTable}
            estimatedRows={selectedTableMeta.row_count}
            schemaColumnCount={selectedTableMeta.column_count}
            preview={previewData}
            loading={dataLoading}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            searchQuery={previewSearch}
            onSearchChange={handlePreviewSearchChange}
          />
        ) : (
          <div className="preview-page-state">
            <p>No table selected.</p>
          </div>
        )}
      </main>

      <ActionSheet
        isOpen={showTableActionSheet}
        title="Select table"
        items={tableItems}
        onClose={() => setShowTableActionSheet(false)}
      />
    </div>
  );
};

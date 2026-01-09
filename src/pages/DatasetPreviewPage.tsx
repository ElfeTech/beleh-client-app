import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/useAuth';
import type {
    DatasetTable,
    DatasetTablePreviewResponse
} from '../types/api';
import './DatasetPreviewPage.css';

export const DatasetPreviewPage: React.FC = () => {
    const { id: workspaceId, datasetId } = useParams<{ id: string, datasetId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [datasetName, setDatasetName] = useState<string>('');
    const [tables, setTables] = useState<DatasetTable[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [previewData, setPreviewData] = useState<DatasetTablePreviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Track if this is the initial load to prevent duplicate preview calls
    const isInitialLoadRef = useRef(true);

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

    const fetchPreview = useCallback(async (tableName: string, page: number, size: number) => {
        if (!user || !tableName || !datasetId) return;
        try {
            setDataLoading(true);
            const token = await user.getIdToken();
            const response = await apiClient.getDatasetTablePreview(token, datasetId, tableName, page, size);
            setPreviewData(response);
        } catch (err: any) {
            console.error('Failed to fetch preview:', err);
            setError(err.message || 'Failed to load preview data.');
        } finally {
            setDataLoading(false);
        }
    }, [user, datasetId]);

    const fetchTables = useCallback(async () => {
        if (!user || !datasetId) return;
        try {
            setLoading(true);
            setError(null);
            const token = await user.getIdToken();
            const response = await apiClient.listDatasetTables(token, datasetId);
            setTables(response.tables);
            if (response.tables.length > 0) {
                const firstTable = response.tables[0].table_name;
                setSelectedTable(firstTable);
                setLoading(false);
                // Fetch preview for the first table immediately after tables are loaded
                // This ensures the correct sequence: tables → preview (no 404s)
                await fetchPreview(firstTable, currentPage, pageSize);
                // Mark that initial load is complete
                isInitialLoadRef.current = false;
            } else {
                setError('No tables found in this dataset.');
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Failed to fetch tables:', err);
            setError(err.message || 'Failed to load tables.');
            setLoading(false);
        }
    }, [user, datasetId, fetchPreview, pageSize]);

    // Reset state when dataset id changes to avoid race conditions with old state
    useEffect(() => {
        setTables([]);
        setSelectedTable('');
        setPreviewData(null);
        setError(null);
        setCurrentPage(1);
        setLoading(true);
        isInitialLoadRef.current = true; // Reset initial load flag
    }, [datasetId]);

    useEffect(() => {
        if (datasetId) {
            fetchDatasetInfo();
            fetchTables();
        }
    }, [datasetId, fetchDatasetInfo, fetchTables]);

    // Only fetch preview when user manually changes table, page, or page size
    // Initial preview is fetched directly from fetchTables to ensure correct sequence
    useEffect(() => {
        // Skip if this is the initial load (handled by fetchTables)
        if (isInitialLoadRef.current) return;

        // Skip if we're still loading tables or if there are no tables
        if (loading || tables.length === 0) return;

        // Only fetch if the selected table exists in the current tables list
        const tableExists = tables.some(t => t.table_name === selectedTable);
        if (selectedTable && tableExists) {
            fetchPreview(selectedTable, currentPage, pageSize);
        }
    }, [selectedTable, currentPage, pageSize, fetchPreview, tables, loading]);

    const handleBack = () => {
        navigate(`/workspace/${workspaceId}`);
    };

    const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedTable(e.target.value);
        setCurrentPage(1);
    };

    const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleNextPage = () => {
        if (previewData && currentPage < previewData.total_pages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const renderSkeleton = () => (
        <div className="skeleton-container">
            <div className="skeleton-header" />
            {[...Array(15)].map((_, i) => (
                <div key={i} className="skeleton-row" />
            ))}
        </div>
    );

    return (
        <div className="preview-page">
            <header className="preview-page-header">
                <div className="header-main">
                    <button className="back-btn" onClick={handleBack} title="Back to Chat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>
                    <div className="header-info">
                        <h1>{datasetName || 'Dataset Preview'}</h1>
                        <span className="dataset-id-tag">ID: {datasetId}</span>
                    </div>
                </div>
            </header>

            {tables.length > 0 && (
                <div className="table-selector-section">
                    <label htmlFor="table-select" className="table-select-label">Table:</label>
                    <select
                        id="table-select"
                        value={selectedTable}
                        onChange={handleTableChange}
                        className="table-select"
                    >
                        {tables.map(table => (
                            <option key={table.table_name} value={table.table_name}>
                                {table.table_name} ({table.row_count.toLocaleString()} rows)
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <main className="preview-page-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <p>Loading dataset tables...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>{error}</p>
                        <button className="primary-btn" onClick={fetchTables}>Try Again</button>
                    </div>
                ) : (
                    <div className="data-grid-container">
                        {dataLoading ? renderSkeleton() : previewData ? (
                            <div className="data-grid-wrapper">
                                <table className="data-grid">
                                    <thead>
                                        <tr>
                                            <th className="sticky-col index-col">#</th>
                                            {previewData.columns.map((col, i) => (
                                                <th key={i} title={`Type: ${col.type}`}>
                                                    <div className="col-header">
                                                        <span className="col-name">{col.name}</span>
                                                        <span className="col-type">{col.type}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.rows.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                <td className="sticky-col index-col">{(currentPage - 1) * pageSize + rowIndex + 1}</td>
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex}>
                                                        {cell === null ? <span className="null-value">null</span> : String(cell)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>No data available for this table.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="preview-page-footer">
                <div className="footer-left">
                    {previewData && (
                        <div className="pagination-info">
                            Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, previewData.total_rows)}</strong> of <strong>{previewData.total_rows.toLocaleString()}</strong> rows
                        </div>
                    )}
                </div>

                <div className="footer-right">
                    <div className="pagination-group">
                        <div className="page-size-selector">
                            <span>Rows per page:</span>
                            <select value={pageSize} onChange={handlePageSizeChange}>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                        </div>

                        <div className="page-navigation">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1 || dataLoading}
                                className="nav-btn"
                                aria-label="Previous Page"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="page-indicator">
                                Page <strong>{currentPage}</strong> of <strong>{previewData?.total_pages || 1}</strong>
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={!previewData || currentPage >= previewData.total_pages || dataLoading}
                                className="nav-btn"
                                aria-label="Next Page"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

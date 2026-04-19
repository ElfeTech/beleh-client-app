import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/useAuth';
import { ActionSheet, type ActionSheetItem } from '../components/common/ActionSheet';
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

    // Selection UI state
    const [showTableActionSheet, setShowTableActionSheet] = useState(false);
    const [showPageSizeActionSheet, setShowPageSizeActionSheet] = useState(false);

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
                await fetchPreview(firstTable, currentPage, pageSize);
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

    // Reset state when dataset id changes
    useEffect(() => {
        setTables([]);
        setSelectedTable('');
        setPreviewData(null);
        setError(null);
        setCurrentPage(1);
        setLoading(true);
        isInitialLoadRef.current = true;
    }, [datasetId]);

    useEffect(() => {
        if (datasetId) {
            fetchDatasetInfo();
            fetchTables();
        }
    }, [datasetId, fetchDatasetInfo, fetchTables]);

    useEffect(() => {
        if (isInitialLoadRef.current) return;
        if (loading || tables.length === 0) return;

        const tableExists = tables.some(t => t.table_name === selectedTable);
        if (selectedTable && tableExists) {
            fetchPreview(selectedTable, currentPage, pageSize);
        }
    }, [selectedTable, currentPage, pageSize, fetchPreview, tables, loading]);

    const handleBack = () => {
        navigate(`/workspace/${workspaceId}`);
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

    const tableItems: ActionSheetItem[] = tables.map(table => ({
        id: table.table_name,
        label: `${table.table_name} (${table.row_count.toLocaleString()} rows)`,
        onClick: () => {
            setSelectedTable(table.table_name);
            setCurrentPage(1);
            setShowTableActionSheet(false);
        }
    }));

    const pageSizeItems: ActionSheetItem[] = [50, 100, 200].map(size => ({
        id: size.toString(),
        label: `${size} rows per page`,
        onClick: () => {
            setPageSize(size);
            setCurrentPage(1);
            setShowPageSizeActionSheet(false);
        }
    }));

    const renderSkeleton = () => (
        <div className="skeleton-container">
            {[...Array(12)].map((_, i) => (
                <div key={i} className="skeleton-row" />
            ))}
        </div>
    );

    return (
        <div className="preview-page app-page-root app-page-root--scroll">
            <header className="preview-page-header">
                <div className="header-main">
                    <button className="back-btn" onClick={handleBack} title="Back">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>
                    <div className="header-info">
                        <h1>{datasetName || 'Preview'}</h1>
                        <span className="dataset-id-tag">{datasetId}</span>
                    </div>

                    {tables.length > 0 && (
                        <div className="table-selector-section">
                            <button
                                className="table-select-trigger"
                                onClick={() => setShowTableActionSheet(true)}
                            >
                                <span>{selectedTable}</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="preview-page-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <p>Scanning tables...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>{error}</p>
                        <button className="primary-btn" onClick={fetchTables}>Retry</button>
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
                                                <th key={i}>
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
                                <p>No records found.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="preview-page-footer">
                <div className="footer-left">
                    {previewData && (
                        <div className="pagination-info">
                            <strong>{((currentPage - 1) * pageSize + 1).toLocaleString()}</strong> - <strong>{Math.min(currentPage * pageSize, previewData.total_rows).toLocaleString()}</strong> of <strong>{previewData.total_rows.toLocaleString()}</strong>
                        </div>
                    )}
                </div>

                <div className="footer-right">
                    <button
                        className="page-size-trigger"
                        onClick={() => setShowPageSizeActionSheet(true)}
                    >
                        {pageSize} / page
                    </button>

                    <div className="page-navigation">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1 || dataLoading}
                            className="nav-btn"
                            aria-label="Previous"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="page-indicator">{currentPage} / {previewData?.total_pages || 1}</span>
                        <button
                            onClick={handleNextPage}
                            disabled={!previewData || currentPage >= previewData.total_pages || dataLoading}
                            className="nav-btn"
                            aria-label="Next"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </footer>

            <ActionSheet
                isOpen={showTableActionSheet}
                title="Select Table"
                items={tableItems}
                onClose={() => setShowTableActionSheet(false)}
            />

            <ActionSheet
                isOpen={showPageSizeActionSheet}
                title="Rows per page"
                items={pageSizeItems}
                onClose={() => setShowPageSizeActionSheet(false)}
            />
        </div>
    );
};

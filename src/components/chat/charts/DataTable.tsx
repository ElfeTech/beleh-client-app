import { useState, useMemo } from 'react';
import './DataTable.css';

interface DataTableProps {
    columns: string[];
    data: Record<string, any>[];
    isExpanded?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable({ columns, data, isExpanded = false }: DataTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    const itemsPerPage = isExpanded ? 20 : 10;

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortColumn || !sortDirection) return data;

        return [...data].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            const aNum = Number(aVal);
            const bNum = Number(bVal);

            // Numeric sort
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }

            // String sort
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();

            if (sortDirection === 'asc') {
                return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
            } else {
                return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
            }
        });
    }, [data, sortColumn, sortDirection]);

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = sortedData.slice(startIndex, endIndex);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortColumn(null);
                setSortDirection(null);
            }
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
    };

    if (data.length === 0) {
        return (
            <div className="data-table-empty">
                <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ margin: '0 auto 1rem' }}
                >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                </svg>
                <p>No data available</p>
            </div>
        );
    }

    return (
        <div className="modern-data-table-container">
            <div className="data-table-wrapper">
                <table className="modern-data-table">
                    <thead>
                        <tr>
                            {columns.map((column, index) => (
                                <th key={index} onClick={() => handleSort(column)}>
                                    <div className="table-header-cell">
                                        <span>{column}</span>
                                        <span className="sort-indicator">
                                            {sortColumn === column && (
                                                sortDirection === 'asc' ? '↑' : '↓'
                                            )}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {columns.map((column, colIndex) => (
                                    <td key={colIndex}>
                                        {formatCellValue(row[column])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="modern-table-pagination">
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="modern-pagination-btn"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        Previous
                    </button>
                    <div className="pagination-info">
                        <span className="pagination-current">
                            Page {currentPage} of {totalPages}
                        </span> &nbsp;|&nbsp;
                        <span className="pagination-total">
                            {data.length.toLocaleString()} rows
                        </span>
                    </div>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="modern-pagination-btn"
                    >
                        Next
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

function formatCellValue(value: any): string {
    if (value === null || value === undefined) {
        return '-';
    }
    if (typeof value === 'number') {
        return value.toLocaleString();
    }
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    if (typeof value === 'string' && value.length > 100) {
        return value.slice(0, 100) + '...';
    }
    return String(value);
}

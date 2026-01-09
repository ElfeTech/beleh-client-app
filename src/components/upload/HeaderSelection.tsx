import React, { useState } from 'react';
import type { ExcelSheet, SheetRecoveryConfig } from '../../types/api';
import './HeaderSelection.css';

interface HeaderSelectionProps {
    sheets: ExcelSheet[];
    onSubmit: (configs: SheetRecoveryConfig[]) => void;
    onBack: () => void;
}

const getExcelColumnName = (index: number): string => {
    let name = '';
    let i = index;
    while (i >= 0) {
        name = String.fromCharCode((i % 26) + 65) + name;
        i = Math.floor(i / 26) - 1;
    }
    return name;
};

export const HeaderSelection: React.FC<HeaderSelectionProps> = ({
    sheets,
    onSubmit,
    onBack
}) => {
    const [selectedHeaders, setSelectedHeaders] = useState<Record<string, number>>({});
    const [expandedSheet, setExpandedSheet] = useState<string | null>(sheets[0]?.name || null);

    const handleRowClick = (sheetName: string, rowIndex: number) => {
        setSelectedHeaders(prev => ({
            ...prev,
            [sheetName]: rowIndex
        }));
    };

    const isHeaderSelected = (sheetName: string) => selectedHeaders[sheetName] !== undefined;

    const allHeadersSelected = sheets
        .filter(s => s.selected)
        .every(s => isHeaderSelected(s.name) || !s.needs_user_input);

    const handleSubmit = () => {
        const configs: SheetRecoveryConfig[] = sheets
            .filter(s => s.selected)
            .map(s => ({
                sheet_name: s.name,
                header_row_index: selectedHeaders[s.name] ?? (s.needs_user_input ? -1 : 0) // Backend might handle 0 if not needed
            }));
        onSubmit(configs);
    };

    return (
        <div className="header-selection-container">
            <div className="header-selection-header">
                <button className="back-link" onClick={onBack}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back to sheet selection
                </button>
                <div className="title-section">
                    <h3>Set Document Headers</h3>
                    <p className="description">
                        Confirm the header row for each selected sheet by clicking on it.
                    </p>
                </div>
            </div>

            <div className="sheets-accordion-list">
                {sheets.filter(s => s.selected).map((sheet) => (
                    <div
                        key={sheet.name}
                        className={`sheet-accordion-item ${expandedSheet === sheet.name ? 'expanded' : ''} ${isHeaderSelected(sheet.name) ? 'completed' : ''}`}
                    >
                        <div
                            className="accordion-trigger"
                            onClick={() => setExpandedSheet(expandedSheet === sheet.name ? null : sheet.name)}
                        >
                            <div className="sheet-meta">
                                <span className={`status-dot ${isHeaderSelected(sheet.name) ? 'done' : 'pending'}`} />
                                <span className="sheet-name">{sheet.name}</span>
                                {isHeaderSelected(sheet.name) && (
                                    <span className="selected-row-info">Row {selectedHeaders[sheet.name] + 1} selected</span>
                                )}
                            </div>
                            <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </div>

                        {expandedSheet === sheet.name && (
                            <div className="accordion-content">
                                {sheet.reason && <div className="sheet-suggestion">💡 {sheet.reason}</div>}
                                {sheet.preview_rows && sheet.preview_rows.length > 0 ? (
                                    <div className="preview-table-wrapper">
                                        <div className="preview-table-container">
                                            <table className="preview-table">
                                                <thead>
                                                    <tr>
                                                        <th className="row-index-header">#</th>
                                                        {sheet.preview_rows[0]?.map((_, i) => (
                                                            <th key={i} className="column-header">
                                                                {getExcelColumnName(i)}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sheet.preview_rows.map((row, rowIndex) => (
                                                        <tr
                                                            key={rowIndex}
                                                            className={`preview-row ${selectedHeaders[sheet.name] === rowIndex ? 'selected' : ''}`}
                                                            onClick={() => handleRowClick(sheet.name, rowIndex)}
                                                        >
                                                            <td className="row-index-col">
                                                                {selectedHeaders[sheet.name] === rowIndex ? (
                                                                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="selection-icon">
                                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                                    </svg>
                                                                ) : (
                                                                    rowIndex + 1
                                                                )}
                                                            </td>
                                                            {row.map((cell, cellIndex) => (
                                                                <td key={cellIndex} className="cell-content">
                                                                    {cell?.toString() || <span className="empty-cell">Empty</span>}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="no-preview-msg">
                                        No data preview available for this sheet.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="header-selection-footer">
                <button
                    className="primary-btn submit-btn"
                    disabled={!allHeadersSelected}
                    onClick={handleSubmit}
                >
                    Confirm & Submit All Sheets
                </button>
            </div>
        </div>
    );
};

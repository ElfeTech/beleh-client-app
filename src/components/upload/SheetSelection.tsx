import React from 'react';
import type { ExcelSheet } from '../../types/api';
import './SheetSelection.css';

interface SheetSelectionProps {
    sheets: ExcelSheet[];
    onToggleSheet: (sheetName: string) => void;
}

export const SheetSelection: React.FC<SheetSelectionProps> = ({ sheets, onToggleSheet }) => {
    return (
        <div className="sheet-selection-container">
            <div className="sheet-selection-header">
                <h3>Select Sheets to Import</h3>
                <p>Choose the sheets you want to include in your dataset.</p>
            </div>
            <div className="sheet-grid">
                {sheets.map((sheet) => (
                    <div
                        key={sheet.name}
                        className={`sheet-card ${sheet.selected ? 'selected' : ''}`}
                        onClick={() => onToggleSheet(sheet.name)}
                    >
                        <div className="sheet-card-content">
                            <div className="sheet-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                </svg>
                            </div>
                            <div className="sheet-info">
                                <div className="sheet-name" title={sheet.name}>{sheet.name}</div>
                                {sheet.status === 'READY' ? (
                                    <span className="status-badge ready">
                                        <span className="dot" />
                                        Ready
                                    </span>
                                ) : (
                                    <div className="status-attention-container">
                                        <span className="status-badge attention">
                                            <span className="dot" />
                                            Needs Attention
                                        </span>
                                        {sheet.reason && (
                                            <div className="sheet-issue-text">{sheet.reason}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="sheet-checkbox">
                            {sheet.selected ? (
                                <div className="checked-icon">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="unchecked-icon" />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

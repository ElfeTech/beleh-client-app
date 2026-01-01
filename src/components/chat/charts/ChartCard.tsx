import { useState, type ReactNode } from 'react';
import './ChartCard.css';

interface ChartCardProps {
    title?: string;
    description?: string;
    children: ReactNode;
    onExpand?: () => void;
    onDownloadCSV?: () => void;
    onDownloadPNG?: () => void;
    onViewData?: () => void;
    onClose?: () => void;
}

export function ChartCard({
    title,
    description,
    children,
    onExpand,
    onDownloadCSV,
    onDownloadPNG,
    onViewData,
    onClose
}: ChartCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="chart-card"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            {(title || description) && (
                <div className="chart-card-header">
                    <div className="chart-card-title-section">
                        {title && <h3 className="chart-card-title">{title}</h3>}
                        {description && <p className="chart-card-description">{description}</p>}
                    </div>

                    {/* Action buttons - show on hover */}
                    <div className={`chart-card-actions ${isHovered || onClose ? 'visible' : ''}`}>
                        {onClose && (
                            <button
                                className="chart-action-btn chart-close-btn"
                                onClick={onClose}
                                title="Close"
                                aria-label="Close"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                        {onExpand && (
                            <button
                                className="chart-action-btn"
                                onClick={onExpand}
                                title="Expand chart"
                                aria-label="Expand chart"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                </svg>
                            </button>
                        )}
                        {onDownloadCSV && (
                            <button
                                className="chart-action-btn"
                                onClick={onDownloadCSV}
                                title="Download CSV"
                                aria-label="Download CSV"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="9" y1="15" x2="15" y2="15" />
                                </svg>
                                <span className="action-label">CSV</span>
                            </button>
                        )}
                        {onDownloadPNG && (
                            <button
                                className="chart-action-btn"
                                onClick={onDownloadPNG}
                                title="Download PNG"
                                aria-label="Download PNG"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                <span className="action-label">PNG</span>
                            </button>
                        )}
                        {onViewData && (
                            <button
                                className="chart-action-btn"
                                onClick={onViewData}
                                title="View data"
                                aria-label="View data"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                    <polyline points="10 9 9 9 8 9" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Chart Content */}
            <div className="chart-card-content">
                {children}
            </div>
        </div>
    );
}

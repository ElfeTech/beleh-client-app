import type { ChatWorkflowResponse } from '../../types/api';
import { ChartRenderer } from './charts/ChartRenderer';
import './ChartVisualization.css';

interface ChartVisualizationProps {
    response: ChatWorkflowResponse;
}

export function ChartVisualization({ response }: ChartVisualizationProps) {

    const { visualization, insight, execution } = response;

    // Handle error state from execution metadata
    if (execution && execution.status === 'ERROR' && execution.message) {
        return (
            <div className="chart-response error">
                <div className="error-message">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p>{execution.message}</p>
                </div>
            </div>
        );
    }

    // No data to visualize
    if (!visualization) {
        return null;
    }

    const { encoding } = visualization;

    // Use the full dataset from execution.rows instead of data_preview
    const fullData = execution?.rows || [];
    const columnNames = execution?.columns?.map(col => col.name) || [];

    // Safety check for execution data
    if (!fullData || !Array.isArray(fullData) || fullData.length === 0) {
        return null;
    }

    const columns = columnNames.length > 0 ? columnNames : (fullData.length > 0 ? Object.keys(fullData[0]) : []);

    return (
        <div className="chart-response">
            <ChartRenderer data={fullData} visualization={visualization} columns={columns} />

            {/* Insights Section */}
            {insight && (
                <div className="explanation-section">
                    <h4 className="explanation-title">Key Insights</h4>
                    {insight.summary && <p className="explanation-text">{insight.summary}</p>}

                    {insight.key_insights && insight.key_insights.length > 0 && (
                        <ul className="insight-list">
                            {insight.key_insights.map((keyInsight, index) => (
                                <li key={index}>{keyInsight}</li>
                            ))}
                        </ul>
                    )}

                    {insight.limitations && (
                        <p className="insight-limitations">
                            <strong>Note:</strong> {insight.limitations}
                        </p>
                    )}

                    {insight.confidence !== undefined && (
                        <div className="insight-confidence">
                            <strong>Confidence:</strong> {(insight.confidence * 100).toFixed(0)}%
                        </div>
                    )}
                </div>
            )}

            {/* Data Summary */}
            <div className="data-summary">
                <span className="summary-item">
                    <strong>{fullData.length}</strong> data points
                </span>
                {encoding && encoding.x && (
                    <span className="summary-item">
                        X: <strong>{encoding.x.label}</strong>
                    </span>
                )}
                {encoding && encoding.y && (
                    <span className="summary-item">
                        Y: <strong>{encoding.y.label}</strong>
                    </span>
                )}
            </div>
        </div>
    );
}

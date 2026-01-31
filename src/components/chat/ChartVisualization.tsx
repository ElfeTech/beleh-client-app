import { useState, useMemo } from 'react';
import type { ChatWorkflowResponse, VisualizationRecommendation } from '../../types/api';
import { ChartRenderer } from './charts/ChartRenderer';
import { ChartTypeSelector } from './charts/ChartTypeSelector';
import {
    analyzeDataCharacteristics,
    getCompatibleChartTypes,
    backendToChartType,
    chartTypeToBackendFormat,
    type ChartType,
} from '../../utils/chartCompatibility';
import './ChartVisualization.css';

interface ChartVisualizationProps {
    response: ChatWorkflowResponse;
}

export function ChartVisualization({ response }: ChartVisualizationProps) {
    const { visualization, insight, execution, intent } = response;

    // Get the original chart type from the API response
    const originalChartType = useMemo(() => {
        const vizType = visualization?.type || visualization?.visualization_type || 'table';
        return backendToChartType(vizType);
    }, [visualization]);

    // State for user-selected chart type (defaults to API recommendation)
    const [selectedChartType, setSelectedChartType] = useState<ChartType>(originalChartType);

    // Reset selected chart type when response changes
    useMemo(() => {
        setSelectedChartType(originalChartType);
    }, [originalChartType]);

    // Check if we have results to show alongside clarification
    const hasResults = execution && execution.row_count > 0;
    const needsClarification = intent?.clarification_needed && intent.clarification_message;
    const isExecutionFailed = execution?.status === 'FAILED' || execution?.status === 'ERROR';

    // Use the full dataset from execution.rows instead of data_preview
    const fullData = execution?.rows || [];
    const columnNames = execution?.columns?.map(col => col.name) || [];

    // Analyze data characteristics and get compatible chart types
    const compatibleChartTypes = useMemo(() => {
        if (!fullData || fullData.length === 0) {
            return [];
        }

        const xField = visualization?.encoding?.x?.field || visualization?.dimensions?.x;
        const yField = visualization?.encoding?.y?.field || visualization?.dimensions?.y;
        const seriesField = visualization?.encoding?.series?.field || visualization?.dimensions?.series;

        const characteristics = analyzeDataCharacteristics(fullData, xField, yField, seriesField);
        return getCompatibleChartTypes(characteristics, originalChartType);
    }, [fullData, visualization, originalChartType]);

    // Create modified visualization with user-selected chart type
    const modifiedVisualization = useMemo((): VisualizationRecommendation | null => {
        if (!visualization || selectedChartType === originalChartType) {
            return visualization ?? null;
        }

        const backendType = chartTypeToBackendFormat(selectedChartType) as VisualizationRecommendation['type'];
        return {
            ...visualization,
            type: backendType,
            visualization_type: backendType,
        };
    }, [visualization, selectedChartType, originalChartType]);

    // Handle chart type change
    const handleChartTypeChange = (newType: ChartType) => {
        setSelectedChartType(newType);
    };

    // Handle clarification request - show ONLY clarification if no results OR execution failed
    if (needsClarification && (!hasResults || isExecutionFailed)) {
        return (
            <div className="chart-response clarification">
                <div className="clarification-message">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', marginRight: '8px', color: '#3b82f6' }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p>{intent?.clarification_message}</p>
                </div>
            </div>
        );
    }

    // Handle error state from execution metadata
    if (execution && execution.status === 'FAILED' && execution.message) {
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

    // Safety check for execution data
    if (!fullData || !Array.isArray(fullData) || fullData.length === 0) {
        return null;
    }

    const columns = columnNames.length > 0 ? columnNames : (fullData.length > 0 ? Object.keys(fullData[0]) : []);

    return (
        <div className="chart-response">
            {/* Show clarification message if needed, even with results */}
            {needsClarification && hasResults && (
                <div className="clarification-banner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', flexShrink: 0, color: '#3b82f6' }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p>{intent?.clarification_message}</p>
                </div>
            )}

            {/* Chart Type Selector */}
            {compatibleChartTypes.length > 1 && (
                <div className="chart-type-selector-wrapper">
                    <ChartTypeSelector
                        options={compatibleChartTypes}
                        selectedType={selectedChartType}
                        onTypeChange={handleChartTypeChange}
                    />
                </div>
            )}

            <ChartRenderer data={fullData} visualization={modifiedVisualization!} columns={columns} />

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

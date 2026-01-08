import React, { useState, useRef } from 'react';
import { useFeedback } from '../../../context/FeedbackContext';
import { FEEDBACK_TRIGGERS } from '../../../types/feedback';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { PieChart } from './PieChart';
import { DataTable } from './DataTable';
import { ChartCard } from './ChartCard';
import { ExpandedChartModal } from './ExpandedChartModal';
import { MultiLineChart } from './MultiLineChart';
import { MultiBarChart } from './MultiBarChart';
import { ScatterPlotChart } from './ScatterPlotChart';
import { HeatmapChart } from './HeatmapChart';
import type { VisualizationRecommendation } from '../../../types/api';
import {
    adaptMultiDimensionalData,
    checkDimensionOverload,
    checkFieldCardinality,
} from '../../../utils/visualizationAdapter';

interface ChartRendererProps {
    data: Record<string, any>[];
    visualization: VisualizationRecommendation;
    columns: string[];
}

export function ChartRenderer({ data, visualization, columns }: ChartRendererProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDataTable, setShowDataTable] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);
    const { trackVisualizationInteraction, showFeedback } = useFeedback();

    // Normalize visualization object to handle both old and new backend formats
    const normalizedVisualization = React.useMemo(() => {
        const viz = { ...visualization };

        // Handle visualization_type vs type
        const vizTypeValue = viz.type || viz.visualization_type;
        viz.visualization_type = vizTypeValue;

        // Convert dimensions to encoding if dimensions exists but encoding doesn't
        if (viz.dimensions && !viz.encoding) {
            viz.encoding = {
                x: viz.dimensions.x ? { field: viz.dimensions.x, type: 'categorical' as const, label: viz.dimensions.x } : undefined,
                y: viz.dimensions.y ? { field: viz.dimensions.y, type: 'quantitative' as const, label: viz.dimensions.y } : undefined,
                series: viz.dimensions.series ? { field: viz.dimensions.series, type: 'categorical' as const, label: viz.dimensions.series } : undefined,
                color: viz.dimensions.color ? { field: viz.dimensions.color, type: 'categorical' as const, label: viz.dimensions.color } : undefined,
                size: viz.dimensions.size ? { field: viz.dimensions.size, type: 'quantitative' as const, label: viz.dimensions.size } : undefined,
                facet: viz.dimensions.facet ? { field: viz.dimensions.facet, type: 'categorical' as const, label: viz.dimensions.facet } : undefined,
            };
        }

        return viz;
    }, [visualization]);

    // Normalize visualization type from backend format to internal format
    const normalizeVisualizationType = (type: string | undefined): string => {
        if (!type) {
            return 'NONE';
        }
        const typeMap: Record<string, string> = {
            'line': 'LINE_CHART',
            'multiline': 'MULTI_LINE_CHART',
            'bar': 'BAR_CHART',
            'stacked_bar': 'STACKED_BAR_CHART',
            'heatmap': 'HEATMAP',
            'scatter': 'SCATTER_PLOT',
            'pie': 'PIE_CHART',
            'table': 'TABLE',
            'auto': 'NONE',
        };
        return typeMap[type.toLowerCase()] || type.toUpperCase();
    };

    const vizType = normalizeVisualizationType(normalizedVisualization.visualization_type);

    const handleExpand = () => {
        setIsExpanded(true);
        // Track visualization interaction for feedback
        trackVisualizationInteraction();
        // Show UX feedback after chart interaction (longer delay for user to view chart)
        setTimeout(() => {
            showFeedback(FEEDBACK_TRIGGERS.UX);
        }, 5000); // 5 seconds - give user time to explore the chart
    };

    const handleClose = () => {
        setIsExpanded(false);
    };

    const handleDownloadCSV = () => {
        // Convert data to CSV
        const csvContent = convertToCSV(data, columns);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `chart-data-${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPNG = async () => {
        if (!chartRef.current) return;

        try {
            // Dynamically import html2canvas
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(chartRef.current, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher quality
                logging: false,
            });

            canvas.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `chart-${Date.now()}.png`;
                link.click();
                URL.revokeObjectURL(url);
            });
        } catch (error) {
            console.error('Failed to download PNG:', error);
        }
    };

    const handleViewData = () => {
        setShowDataTable(!showDataTable);
    };

    const renderChart = (expanded: boolean = false) => {
        // Check for dimension overload
        const overloadCheck = checkDimensionOverload(normalizedVisualization, 5);
        if (overloadCheck.overloaded && normalizedVisualization.use_fallback) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                    <p>{overloadCheck.message}</p>
                    <p style={{ marginTop: '1rem' }}>Falling back to table view.</p>
                    <div style={{ marginTop: '1.5rem' }}>
                        <DataTable columns={columns} data={data} isExpanded={expanded} />
                    </div>
                </div>
            );
        }

        switch (vizType) {
            case 'BAR_CHART': {
                // Check if this is actually a multi-bar chart (has series encoding)
                if (normalizedVisualization.encoding?.series) {
                    const chartData = adaptMultiDimensionalData(normalizedVisualization, data);
                    if (!chartData.seriesField) {
                        return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: Series field is required for grouped/stacked bar chart</div>;
                    }

                    // Check cardinality
                    const cardinalityCheck = checkFieldCardinality(data, chartData.seriesField, 15);
                    if (!cardinalityCheck.valid) {
                        return (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                <p>{cardinalityCheck.message}</p>
                                <p style={{ marginTop: '1rem' }}>Consider filtering or grouping your data.</p>
                            </div>
                        );
                    }

                    // Default to grouped mode (unless explicitly set as stacked)
                    return (
                        <MultiBarChart
                            data={data}
                            xLabel={chartData.xLabel}
                            yLabel={chartData.yLabel}
                            seriesField={chartData.seriesField}
                            xField={chartData.xField}
                            yField={chartData.yField}
                            timeGrain={chartData.timeGrain}
                            mode="grouped"
                            isExpanded={expanded}
                        />
                    );
                }

                // Regular bar chart
                return <BarChart data={data} visualization={normalizedVisualization} isExpanded={expanded} />;
            }

            case 'STACKED_BAR_CHART': {
                try {
                    const chartData = adaptMultiDimensionalData(normalizedVisualization, data);
                    if (!chartData.seriesField) {
                        return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: Series field is required for stacked bar chart</div>;
                    }

                    // Check cardinality
                    const cardinalityCheck = checkFieldCardinality(data, chartData.seriesField, 15);
                    if (!cardinalityCheck.valid) {
                        return (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                <p>{cardinalityCheck.message}</p>
                                <p style={{ marginTop: '1rem' }}>Consider filtering or grouping your data.</p>
                            </div>
                        );
                    }

                    return (
                        <MultiBarChart
                            data={data}
                            xLabel={chartData.xLabel}
                            yLabel={chartData.yLabel}
                            seriesField={chartData.seriesField}
                            xField={chartData.xField}
                            yField={chartData.yField}
                            timeGrain={chartData.timeGrain}
                            mode="stacked"
                            isExpanded={expanded}
                        />
                    );
                } catch (error) {
                    console.error('Stacked bar chart rendering error:', error);
                    return (
                        <div style={{ padding: '2rem', color: '#ef4444' }}>
                            Error rendering stacked bar chart: {error instanceof Error ? error.message : 'Unknown error'}
                        </div>
                    );
                }
            }

            case 'LINE_CHART': {
                // Check if this is actually a multi-line chart (has series encoding)
                if (normalizedVisualization.encoding?.series) {
                    const chartData = adaptMultiDimensionalData(normalizedVisualization, data);
                    if (!chartData.seriesField) {
                        return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: Series field is required for multi-line chart</div>;
                    }

                    // Check cardinality
                    const cardinalityCheck = checkFieldCardinality(data, chartData.seriesField, 20);
                    if (!cardinalityCheck.valid) {
                        return (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                <p>{cardinalityCheck.message}</p>
                                <p style={{ marginTop: '1rem' }}>Consider filtering or grouping your data.</p>
                            </div>
                        );
                    }

                    return (
                        <MultiLineChart
                            data={data}
                            xLabel={chartData.xLabel}
                            yLabel={chartData.yLabel}
                            seriesField={chartData.seriesField}
                            xField={chartData.xField}
                            yField={chartData.yField}
                            timeGrain={chartData.timeGrain}
                            isExpanded={expanded}
                        />
                    );
                }

                // Regular line chart
                return <LineChart data={data} visualization={normalizedVisualization} isExpanded={expanded} />;
            }

            case 'PIE_CHART':
                return <PieChart data={data} visualization={normalizedVisualization} isExpanded={expanded} />;

            case 'TABLE':
                return <DataTable columns={columns} data={data} isExpanded={expanded} />;

            case 'MULTI_LINE_CHART': {
                const chartData = adaptMultiDimensionalData(normalizedVisualization, data);
                if (!chartData.seriesField) {
                    return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: Series field is required for multi-line chart</div>;
                }

                // Check cardinality
                const cardinalityCheck = checkFieldCardinality(data, chartData.seriesField, 20);
                if (!cardinalityCheck.valid) {
                    return (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                            <p>{cardinalityCheck.message}</p>
                            <p style={{ marginTop: '1rem' }}>Consider filtering or grouping your data.</p>
                        </div>
                    );
                }

                return (
                    <MultiLineChart
                        data={data}
                        xLabel={chartData.xLabel}
                        yLabel={chartData.yLabel}
                        seriesField={chartData.seriesField}
                        xField={chartData.xField}
                        yField={chartData.yField}
                        timeGrain={chartData.timeGrain}
                        isExpanded={expanded}
                    />
                );
            }

            case 'SCATTER_PLOT': {
                const chartData = adaptMultiDimensionalData(normalizedVisualization, data);

                // Check color field cardinality if present - relaxed for scatter plots
                if (chartData.colorField) {
                    const cardinalityCheck = checkFieldCardinality(data, chartData.colorField, 50);
                    if (!cardinalityCheck.valid) {
                        return (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                <p>{cardinalityCheck.message}</p>
                                <p style={{ marginTop: '1rem' }}>Consider filtering or grouping your data.</p>
                            </div>
                        );
                    }
                }

                return (
                    <ScatterPlotChart
                        data={data}
                        xLabel={chartData.xLabel}
                        yLabel={chartData.yLabel}
                        xField={chartData.xField}
                        yField={chartData.yField}
                        sizeField={chartData.sizeField}
                        sizeLabel={chartData.sizeLabel}
                        colorField={chartData.colorField}
                        colorLabel={chartData.colorLabel}
                        isExpanded={expanded}
                    />
                );
            }

            case 'HEATMAP': {
                try {
                    const chartData = adaptMultiDimensionalData(normalizedVisualization, data);
                    if (!chartData.colorField) {
                        return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: Color field is required for heatmap</div>;
                    }

                    return (
                        <HeatmapChart
                            data={data}
                            xLabel={chartData.xLabel}
                            yLabel={chartData.yLabel}
                            colorLabel={chartData.colorLabel || chartData.colorField}
                            xField={chartData.xField}
                            yField={chartData.yField}
                            colorField={chartData.colorField}
                            timeGrain={chartData.timeGrain}
                            isExpanded={expanded}
                        />
                    );
                } catch (error) {
                    console.error('Heatmap rendering error:', error);
                    return (
                        <div style={{ padding: '2rem', color: '#ef4444' }}>
                            Error rendering heatmap: {error instanceof Error ? error.message : 'Unknown error'}
                        </div>
                    );
                }
            }

            case 'NONE':
                return (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                        No visualization available for this query.
                    </div>
                );

            default:
                return (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                        Unsupported visualization type: {normalizedVisualization.type || normalizedVisualization.visualization_type} (normalized: {vizType})
                    </div>
                );
        }
    };

    const isTable = vizType === 'TABLE';

    return (
        <>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', width: '100%' }}>
                <div style={{
                    flex: showDataTable && !isTable ? '1 1 55%' : '1 1 100%',
                    minWidth: showDataTable && !isTable ? '300px' : 'auto',
                    maxWidth: showDataTable && !isTable ? undefined : '100%'
                }}>
                    <ChartCard
                        title={normalizedVisualization.title}
                        description={normalizedVisualization.description}
                        onExpand={handleExpand}
                        onDownloadCSV={handleDownloadCSV}
                        onDownloadPNG={!isTable ? handleDownloadPNG : undefined}
                        onViewData={!isTable ? handleViewData : undefined}
                    >
                        <div ref={chartRef}>
                            {renderChart(false)}
                        </div>
                    </ChartCard>
                </div>

                {showDataTable && !isTable && (
                    <div style={{ flex: '1 1 40%', minWidth: '300px' }}>
                        <ChartCard
                            title="Data Table"
                            onClose={() => setShowDataTable(false)}
                        >
                            <DataTable columns={columns} data={data} />
                        </ChartCard>
                    </div>
                )}
            </div>

            {isExpanded && (
                <ExpandedChartModal
                    title={normalizedVisualization.title}
                    description={normalizedVisualization.description}
                    onClose={handleClose}
                >
                    {renderChart(true)}
                </ExpandedChartModal>
            )}
        </>
    );
}

// Helper function to convert data to CSV
function convertToCSV(data: Record<string, any>[], columns: string[]): string {
    if (data.length === 0) return '';

    const cols = columns.length > 0 ? columns : Object.keys(data[0]);

    // Header row
    const header = cols.join(',');

    // Data rows
    const rows = data.map(row => {
        return cols.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return '';

            // Escape quotes and wrap in quotes if contains comma or quote
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(',');
    });

    return [header, ...rows].join('\n');
}

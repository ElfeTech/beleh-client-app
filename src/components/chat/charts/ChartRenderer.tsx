import { useState, useRef } from 'react';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { PieChart } from './PieChart';
import { DataTable } from './DataTable';
import { ChartCard } from './ChartCard';
import { ExpandedChartModal } from './ExpandedChartModal';
import type { VisualizationRecommendation } from '../../../types/api';

interface ChartRendererProps {
    data: Record<string, any>[];
    visualization: VisualizationRecommendation;
    columns: string[];
}

export function ChartRenderer({ data, visualization, columns }: ChartRendererProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDataTable, setShowDataTable] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);

    const handleExpand = () => {
        setIsExpanded(true);
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
        switch (visualization.visualization_type) {
            case 'BAR_CHART':
                return <BarChart data={data} visualization={visualization} isExpanded={expanded} />;
            case 'LINE_CHART':
                return <LineChart data={data} visualization={visualization} isExpanded={expanded} />;
            case 'PIE_CHART':
                return <PieChart data={data} visualization={visualization} isExpanded={expanded} />;
            case 'TABLE':
                return <DataTable columns={columns} data={data} isExpanded={expanded} />;
            default:
                return (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                        Unsupported visualization type: {visualization.visualization_type}
                    </div>
                );
        }
    };

    const isTable = visualization.visualization_type === 'TABLE';

    return (
        <>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', width: '100%' }}>
                <div style={{
                    flex: showDataTable && !isTable ? '1 1 55%' : '1 1 100%',
                    minWidth: showDataTable && !isTable ? '300px' : 'auto',
                    maxWidth: showDataTable && !isTable ? undefined : '100%'
                }}>
                    <ChartCard
                        title={visualization.title}
                        description={visualization.description}
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
                    title={visualization.title}
                    description={visualization.description}
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

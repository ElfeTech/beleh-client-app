import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import type { VisualizationRecommendation } from '../../../types/api';
import { adaptBarChartData } from '../../../utils/visualizationAdapter';
import { formatValue } from '../../../utils/formatters';
import './BarChart.css';

interface BarChartProps {
    data: Record<string, any>[];
    visualization: VisualizationRecommendation;
    isExpanded?: boolean;
}

// Custom tooltip component with enhanced formatting
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="modern-chart-tooltip">
                <div className="tooltip-label">{data.tooltipName}</div>
                <div className="tooltip-value">
                    <span className="tooltip-value-label">{payload[0].name}:</span>
                    <span className="tooltip-value-number">{data.tooltipValue}</span>
                </div>
            </div>
        );
    }
    return null;
};

export function BarChart({ data, visualization, isExpanded = false }: BarChartProps) {
    if (data.length === 0) {
        return <div className="chart-error">No data available</div>;
    }

    // Use the visualization adapter to format data
    const formattedData = adaptBarChartData(visualization, data);
    const { chartData, yLabel, yFormat } = formattedData;

    // Color palette - blue gradient
    const colors = [
        '#3b82f6', // blue-500
        '#60a5fa', // blue-400
        '#2563eb', // blue-600
        '#1d4ed8', // blue-700
        '#93c5fd', // blue-300
    ];

    const height = isExpanded ? 500 : 350;

    // Y-axis tick formatter
    const formatYAxis = (value: number) => formatValue(value, yFormat);

    return (
        <div className="modern-bar-chart">
            <ResponsiveContainer width="100%" height={height}>
                <RechartsBarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis
                        tickFormatter={formatYAxis}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                        label={{
                            value: yLabel,
                            angle: -90,
                            position: 'insideLeft',
                            style: { fill: '#374151', fontSize: 13, fontWeight: 500 }
                        }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                    <Bar
                        dataKey="value"
                        name={yLabel}
                        radius={[8, 8, 0, 0]}
                        animationDuration={800}
                        animationEasing="ease-out"
                    >
                        {chartData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={colors[chartData.indexOf(entry) % colors.length]} />
                        ))}
                    </Bar>
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
}

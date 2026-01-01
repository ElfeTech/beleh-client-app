import {
    LineChart as RechartsLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import type { VisualizationRecommendation } from '../../../types/api';
import { adaptLineChartData } from '../../../utils/visualizationAdapter';
import { formatValue } from '../../../utils/formatters';
import './LineChart.css';

interface LineChartProps {
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

export function LineChart({ data, visualization, isExpanded = false }: LineChartProps) {
    if (data.length === 0) {
        return <div className="chart-error">No data available</div>;
    }

    // Use the visualization adapter to format data
    const formattedData = adaptLineChartData(visualization, data);
    const { chartData, yLabel, yFormat } = formattedData;

    const height = isExpanded ? 500 : 350;

    // Y-axis tick formatter
    const formatYAxis = (value: number) => formatValue(value, yFormat);

    return (
        <div className="modern-line-chart">
            <ResponsiveContainer width="100%" height={height}>
                <RechartsLineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                    <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="name"
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
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                        type="monotone"
                        dataKey="value"
                        name={yLabel}
                        stroke="url(#lineGradient)"
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                        animationDuration={1000}
                        animationEasing="ease-out"
                    />
                </RechartsLineChart>
            </ResponsiveContainer>
        </div>
    );
}

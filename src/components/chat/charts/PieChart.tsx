import {
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import type { VisualizationRecommendation } from '../../../types/api';
import { adaptPieChartData, truncateLabel } from '../../../utils/visualizationAdapter';
import './PieChart.css';

interface PieChartProps {
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
                    <span className="tooltip-value-label">Value:</span>
                    <span className="tooltip-value-number">{data.tooltipValue}</span>
                </div>
                <div className="tooltip-value">
                    <span className="tooltip-value-label">Percentage:</span>
                    <span className="tooltip-value-number">{data.percentDisplay}%</span>
                </div>
            </div>
        );
    }
    return null;
};

// Custom label renderer with optimized positioning
const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent
}: any) => {
    // percent is already 0-1 from Recharts, multiply by 100 for display
    const percentValue = percent * 100;

    if (percentValue < 5) return null; // Hide labels for slices < 5%

    // Position labels inside the donut segments for better containment
    // Use the midpoint between inner and outer radius
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight={700}
            style={{
                textShadow: '0px 1px 4px rgba(0, 0, 0, 0.8)',
                pointerEvents: 'none'
            }}
        >
            {`${percentValue.toFixed(1)}%`}
        </text>
    );
};

export function PieChart({ data, visualization, isExpanded = false }: PieChartProps) {
    if (data.length === 0) {
        return <div className="chart-error">No data available</div>;
    }

    // Use the visualization adapter to format data
    const formattedData = adaptPieChartData(visualization, data, 10);
    const { chartData: chartDataWithPercent } = formattedData;

    // Color palette - vibrant gradient colors
    const colors = [
        '#3b82f6', // blue-500
        '#8b5cf6', // violet-500
        '#ec4899', // pink-500
        '#f59e0b', // amber-500
        '#10b981', // emerald-500
        '#06b6d4', // cyan-500
        '#6366f1', // indigo-500
        '#f97316', // orange-500
        '#14b8a6', // teal-500
        '#a855f7', // purple-500
    ];

    const size = isExpanded ? 650 : 450;

    return (
        <div className="modern-pie-chart">
            <ResponsiveContainer width="100%" height={size}>
                <RechartsPieChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                    <defs>
                        {colors.map((color, index) => (
                            <linearGradient
                                key={`gradient-${index}`}
                                id={`pieGradient${index}`}
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="1"
                            >
                                <stop offset="0%" stopColor={color} stopOpacity={1} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                            </linearGradient>
                        ))}
                    </defs>
                    <Pie
                        data={chartDataWithPercent}
                        cx="50%"
                        cy="45%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={isExpanded ? 180 : 115}
                        innerRadius={isExpanded ? 110 : 65}
                        paddingAngle={1}
                        dataKey="value"
                        animationDuration={1000}
                        animationEasing="ease-out"
                    >
                        {chartDataWithPercent.map((_, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={`url(#pieGradient${index % colors.length})`}
                                stroke="#fff"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value, entry: any) => {
                            const truncated = truncateLabel(value, 25);
                            return `${truncated} (${entry.payload.percentDisplay}%)`;
                        }}
                        wrapperStyle={{
                            fontSize: '0.875rem',
                            paddingTop: '1rem'
                        }}
                    />
                </RechartsPieChart>
            </ResponsiveContainer>

            {data.length > 10 && (
                <div className="chart-note">
                    Showing top 10 of {data.length} items
                </div>
            )}
        </div>
    );
}

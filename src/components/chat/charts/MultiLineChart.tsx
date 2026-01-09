import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartLegend } from './ChartLegend';
import type { LegendItem } from './ChartLegend';
import { formatTimeLabel, formatTimeLabelTooltip } from '../../../utils/formatters';

interface MultiLineChartProps {
  data: Record<string, any>[];
  xLabel: string;
  yLabel: string;
  seriesField: string;
  xField: string;
  yField: string;
  timeGrain?: string;
  isExpanded?: boolean;
}

const COLOR_PALETTE = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7', // Purple
];

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  xLabel,
  yLabel,
  seriesField,
  xField,
  yField,
  timeGrain,
  isExpanded = false,
}) => {
  // Transform data to group by series
  const seriesMap = new Map<string, any[]>();
  const allXValues = new Set<string>();

  data.forEach((row) => {
    const seriesValue = row[seriesField];
    const xValue = row[xField];
    const yValue = row[yField];

    if (!seriesMap.has(seriesValue)) {
      seriesMap.set(seriesValue, []);
    }

    allXValues.add(xValue);
    seriesMap.get(seriesValue)!.push({
      x: xValue,
      y: yValue,
    });
  });

  // Create unified data structure for Recharts
  const sortedXValues = Array.from(allXValues).sort();
  const chartData = sortedXValues.map((xValue) => {
    const dataPoint: any = {
      name: xValue,
      // Store formatted label for display
      displayLabel: formatTimeLabel(xValue, timeGrain),
      // Store raw value for tooltip
      rawValue: xValue,
    };
    seriesMap.forEach((seriesData, seriesKey) => {
      const point = seriesData.find((d) => d.x === xValue);
      dataPoint[seriesKey] = point ? point.y : null;
    });
    return dataPoint;
  });

  // Create legend items
  const seriesKeys = Array.from(seriesMap.keys());
  const legendItems: LegendItem[] = seriesKeys.map((key, index) => ({
    key,
    label: String(key),
    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
  }));

  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const handleLegendToggle = (key: string) => {
    setHiddenSeries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        // Don't hide all series
        if (newSet.size < seriesKeys.length - 1) {
          newSet.add(key);
        }
      }
      return newSet;
    });
  };

  const height = isExpanded ? 500 : 350;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    // Get the raw value from payload for proper formatting
    const dataPoint = payload[0]?.payload;
    const formattedTimeLabel = formatTimeLabelTooltip(dataPoint?.rawValue || dataPoint?.name, timeGrain);

    return (
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          border: 'none',
          borderRadius: '8px',
          padding: '12px',
          color: 'white',
          fontSize: '13px',
        }}
      >
        <div style={{ marginBottom: '8px', fontWeight: '600' }}>
          {formattedTimeLabel}
        </div>
        {payload
          .filter((p: any) => !hiddenSeries.has(p.dataKey) && p.dataKey !== 'displayLabel' && p.dataKey !== 'rawValue')
          .map((p: any, idx: number) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: p.color,
                  display: 'inline-block',
                }}
              />
              <span>
                {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
              </span>
            </div>
          ))}
      </div>
    );
  };

  // Check if we have too many series
  if (seriesKeys.length > 20) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        <p>Too many series to display ({seriesKeys.length} series detected).</p>
        <p>Please narrow down your data to 20 or fewer series for optimal visualization.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <ChartLegend
        items={legendItems}
        onToggle={handleLegendToggle}
        layout="horizontal"
        interactive={true}
      />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            {seriesKeys.map((key, index) => (
              <linearGradient
                key={`gradient-${key}`}
                id={`line-gradient-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                  stopOpacity={0.3}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="displayLabel"
            label={{
              value: xLabel,
              position: 'insideBottom',
              offset: -10,
              style: { fill: '#6b7280', fontSize: '14px' },
            }}
            tick={{ fill: '#6b7280', fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: '14px', textAnchor: 'middle' },
            }}
            tick={{ fill: '#6b7280', fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          {seriesKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
              strokeWidth={2}
              dot={{ fill: '#fff', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              hide={hiddenSeries.has(key)}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

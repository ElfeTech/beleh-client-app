import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from 'recharts';
import { ChartLegend } from './ChartLegend';
import type { LegendItem } from './ChartLegend';

interface ScatterPlotChartProps {
  data: Record<string, any>[];
  xLabel: string;
  yLabel: string;
  xField: string;
  yField: string;
  sizeField?: string;
  sizeLabel?: string;
  colorField?: string;
  colorLabel?: string;
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

export const ScatterPlotChart: React.FC<ScatterPlotChartProps> = ({
  data,
  xLabel,
  yLabel,
  xField,
  yField,
  sizeField,
  sizeLabel,
  colorField,
  colorLabel,
  isExpanded = false,
}) => {
  // Transform data for scatter plot
  const minSize = 50;
  const maxSize = 400;

  // Calculate size range if size field is present
  let sizeMin = 0;
  let sizeMax = 1;
  if (sizeField) {
    const sizes = data.map((d) => d[sizeField]).filter((v) => typeof v === 'number');
    sizeMin = Math.min(...sizes);
    sizeMax = Math.max(...sizes);
  }

  // Get unique color values if color field is present
  const colorValues = colorField
    ? Array.from(new Set(data.map((d) => d[colorField])))
    : [];

  const colorMap = new Map<any, string>();
  colorValues.forEach((value, index) => {
    colorMap.set(value, COLOR_PALETTE[index % COLOR_PALETTE.length]);
  });

  // Transform data
  const chartData = data.map((row) => {
    const x = row[xField];
    const y = row[yField];
    const size = sizeField ? row[sizeField] : 100;
    const color = colorField ? row[colorField] : null;

    // Normalize size
    let normalizedSize = 100;
    if (sizeField && sizeMax !== sizeMin) {
      normalizedSize = minSize + ((size - sizeMin) / (sizeMax - sizeMin)) * (maxSize - minSize);
    }

    return {
      x,
      y,
      z: normalizedSize,
      size: sizeField ? row[sizeField] : undefined,
      color: color,
      colorValue: colorMap.get(color) || COLOR_PALETTE[0],
      _raw: row,
    };
  });

  // Create legend items for color dimension
  const legendItems: LegendItem[] = colorValues.map((value, index) => ({
    key: String(value),
    label: String(value),
    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
  }));

  const height = isExpanded ? 500 : 350;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const point = payload[0].payload;

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
        <div style={{ marginBottom: '4px' }}>
          <strong>{xLabel}:</strong> {typeof point.x === 'number' ? point.x.toLocaleString() : point.x}
        </div>
        <div style={{ marginBottom: '4px' }}>
          <strong>{yLabel}:</strong> {typeof point.y === 'number' ? point.y.toLocaleString() : point.y}
        </div>
        {sizeField && point.size !== undefined && (
          <div style={{ marginBottom: '4px' }}>
            <strong>{sizeLabel}:</strong>{' '}
            {typeof point.size === 'number' ? point.size.toLocaleString() : point.size}
          </div>
        )}
        {colorField && point.color !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: point.colorValue,
                display: 'inline-block',
              }}
            />
            <span>
              <strong>{colorLabel}:</strong> {point.color}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Check for dimension overload
  if (colorValues.length > 20) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        <p>Too many color categories to display ({colorValues.length} categories detected).</p>
        <p>Please narrow down your data to 20 or fewer categories for optimal visualization.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {colorField && legendItems.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
            {colorLabel}
          </div>
          <ChartLegend items={legendItems} layout="horizontal" interactive={false} />
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            label={{
              value: xLabel,
              position: 'insideBottom',
              offset: -10,
              style: { fill: '#6b7280', fontSize: '14px' },
            }}
            tick={{ fill: '#6b7280', fontSize: '12px' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: '14px', textAnchor: 'middle' },
            }}
            tick={{ fill: '#6b7280', fontSize: '12px' }}
          />
          <ZAxis type="number" dataKey="z" range={[minSize, maxSize]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={chartData} shape="circle">
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.colorValue}
                fillOpacity={0.7}
                stroke={entry.colorValue}
                strokeWidth={2}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      {sizeField && (
        <div
          style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: 'var(--gray-500)',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          Bubble size represents {sizeLabel}
        </div>
      )}
    </div>
  );
};

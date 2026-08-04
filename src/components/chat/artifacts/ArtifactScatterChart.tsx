import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart as RechartsScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { ScatterData } from '../../../types/api';
import { isValidScatterData } from '../../../utils/artifactAdapters';
import '../charts/BarChart.css';

const COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#6366f1',
  '#f97316',
];

function formatAxisValue(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

interface ArtifactScatterChartProps {
  data: ScatterData;
  isExpanded?: boolean;
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { x?: number; y?: number; label?: string }; name?: string }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point) return null;
  return (
    <div className="modern-chart-tooltip">
      {point.label ? <div className="tooltip-label">{point.label}</div> : null}
      {payload[0].name ? <div className="tooltip-label">{payload[0].name}</div> : null}
      <div className="tooltip-value">
        <span className="tooltip-value-label">X:</span>
        <span className="tooltip-value-number">{formatAxisValue(Number(point.x ?? 0))}</span>
      </div>
      <div className="tooltip-value">
        <span className="tooltip-value-label">Y:</span>
        <span className="tooltip-value-number">{formatAxisValue(Number(point.y ?? 0))}</span>
      </div>
    </div>
  );
}

export function ArtifactScatterChart({ data, isExpanded = false }: ArtifactScatterChartProps) {
  if (!isValidScatterData(data)) {
    return <div className="chart-error">No data available</div>;
  }

  const height = isExpanded ? 500 : 350;
  const series = data.datasets.filter((d) => d.points.length > 0);
  const multi = series.length > 1;
  const legend = multi ? <Legend verticalAlign="top" align="center" height={32} /> : null;

  return (
    <div className="modern-bar-chart">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name={data.x_label || 'X'}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(v) => formatAxisValue(v)}
            label={
              data.x_label
                ? { value: data.x_label, position: 'insideBottom', offset: -8, fill: '#6b7280' }
                : undefined
            }
          />
          <YAxis
            type="number"
            dataKey="y"
            name={data.y_label || 'Y'}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(v) => formatAxisValue(v)}
            label={
              data.y_label
                ? {
                    value: data.y_label,
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#6b7280',
                  }
                : undefined
            }
          />
          <ZAxis range={[60, 60]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTooltip />} />
          {legend}
          {series.map((ds, i) => (
            <Scatter
              key={ds.label || `series_${i}`}
              name={ds.label || `Series ${i + 1}`}
              data={ds.points}
              fill={COLORS[i % COLORS.length]}
            />
          ))}
        </RechartsScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

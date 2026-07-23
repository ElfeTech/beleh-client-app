import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ChartArtifactType, ChartData } from '../../../types/api';
import { chartDataToSeries } from '../../../utils/artifactAdapters';
import '../charts/BarChart.css';
import '../charts/PieChart.css';

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

interface ArtifactChartProps {
  type: ChartArtifactType;
  data: ChartData;
  isExpanded?: boolean;
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown>; name?: string }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="modern-chart-tooltip">
      <div className="tooltip-label">{String(row.tooltipName ?? row.name)}</div>
      {payload.map((entry, i) => (
        <div key={i} className="tooltip-value">
          <span className="tooltip-value-label">{entry.name}:</span>
          <span className="tooltip-value-number">
            {formatAxisValue(Number(row[entry.name ?? 'value'] ?? row.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown> }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="modern-chart-tooltip">
      <div className="tooltip-label">{String(row.tooltipName ?? row.name)}</div>
      <div className="tooltip-value">
        <span className="tooltip-value-label">Value:</span>
        <span className="tooltip-value-number">{String(row.tooltipValue ?? row.value)}</span>
      </div>
      {row.percentDisplay != null ? (
        <div className="tooltip-value">
          <span className="tooltip-value-label">Percentage:</span>
          <span className="tooltip-value-number">{String(row.percentDisplay)}%</span>
        </div>
      ) : null}
    </div>
  );
}

export function ArtifactChart({ type, data, isExpanded = false }: ArtifactChartProps) {
  const { points, seriesKeys, yLabel } = chartDataToSeries(data);

  if (!points.length) {
    return <div className="chart-error">No data available</div>;
  }

  if (type === 'pie' || type === 'doughnut') {
    const total = points.reduce((sum, p) => sum + (Number(p.value) || 0), 0) || 1;
    const pieData = points.map((p) => ({
      ...p,
      percentDisplay: (((Number(p.value) || 0) / total) * 100).toFixed(1),
    }));
    const size = isExpanded ? 650 : 450;
    const outer = isExpanded ? 180 : 115;
    const inner = type === 'doughnut' || type === 'pie' ? (isExpanded ? 110 : 65) : 0;

    return (
      <div className="modern-pie-chart">
        <ResponsiveContainer width="100%" height={size}>
          <RechartsPieChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              outerRadius={outer}
              innerRadius={inner}
              paddingAngle={1}
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const height = isExpanded ? 500 : 350;
  const multi = seriesKeys.length > 1 && !(seriesKeys.length === 1 && seriesKeys[0] === 'value');

  if (type === 'line') {
    return (
      <div className="modern-bar-chart">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsLineChart data={points} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(v) => formatAxisValue(v)}
            />
            <Tooltip content={<BarTooltip />} />
            {multi ? <Legend /> : null}
            {multi ? (
              seriesKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                name={yLabel || 'Value'}
                stroke={COLORS[0]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            )}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // bar (default)
  return (
    <div className="modern-bar-chart">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={points} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(v) => formatAxisValue(v)}
          />
          <Tooltip content={<BarTooltip />} />
          {multi ? <Legend /> : null}
          {multi ? (
            seriesKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                name={key}
                fill={COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))
          ) : (
            <Bar dataKey="value" name={yLabel || 'Value'} radius={[4, 4, 0, 0]}>
              {points.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          )}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

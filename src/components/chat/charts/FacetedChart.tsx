import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './FacetedChart.css';

interface FacetedChartProps {
  data: Record<string, any>[];
  xLabel: string;
  yLabel: string;
  facetField: string;
  facetLabel: string;
  xField: string;
  yField: string;
  chartType: 'line' | 'bar';
  isExpanded?: boolean;
}

const PRIMARY_COLOR = '#3b82f6';

export const FacetedChart: React.FC<FacetedChartProps> = ({
  data,
  xLabel,
  yLabel,
  facetField,
  facetLabel,
  xField,
  yField,
  chartType,
  isExpanded = false,
}) => {
  // Group data by facet value
  const facetMap = new Map<string, any[]>();

  data.forEach((row) => {
    const facetValue = String(row[facetField]);
    if (!facetMap.has(facetValue)) {
      facetMap.set(facetValue, []);
    }
    facetMap.get(facetValue)!.push({
      name: row[xField],
      value: row[yField],
    });
  });

  const facets = Array.from(facetMap.entries()).map(([key, values]) => ({
    key,
    label: key,
    data: values,
  }));

  // Sort facets by key
  facets.sort((a, b) => a.key.localeCompare(b.key));

  // Check for too many facets
  if (facets.length > 12) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        <p>Too many facets to display ({facets.length} facets detected).</p>
        <p>Please narrow down your data to 12 or fewer facets for optimal visualization.</p>
      </div>
    );
  }

  // Determine grid layout
  const cols = facets.length <= 2 ? facets.length : facets.length <= 4 ? 2 : 3;
  const chartHeight = isExpanded ? 280 : 220;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          border: 'none',
          borderRadius: '8px',
          padding: '10px',
          color: 'white',
          fontSize: '12px',
        }}
      >
        <div style={{ marginBottom: '4px', fontWeight: '600' }}>
          {xLabel}: {label}
        </div>
        <div>
          {yLabel}: {typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}
        </div>
      </div>
    );
  };

  const renderChart = (facetData: any[]) => {
    if (chartType === 'line') {
      return (
        <LineChart data={facetData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="facet-line-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={0.8} />
              <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: '10px' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fill: '#6b7280', fontSize: '10px' }} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={PRIMARY_COLOR}
            strokeWidth={2}
            dot={{ fill: '#fff', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      );
    } else {
      return (
        <BarChart data={facetData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="facet-bar-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={0.9} />
              <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: '10px' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fill: '#6b7280', fontSize: '10px' }} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" fill="url(#facet-bar-gradient)" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }
  };

  return (
    <div className="faceted-chart-container">
      <div className="faceted-chart-header">
        <span className="faceted-chart-label">Faceted by: {facetLabel}</span>
      </div>
      <div
        className="faceted-chart-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }}
      >
        {facets.map((facet) => (
          <div key={facet.key} className="faceted-chart-item">
            <div className="faceted-chart-title">{facet.label}</div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              {renderChart(facet.data)}
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
};

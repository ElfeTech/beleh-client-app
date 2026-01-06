import React from 'react';
import { formatTimeLabel } from '../../../utils/formatters';
import './HeatmapChart.css';

interface HeatmapChartProps {
  data: Record<string, any>[];
  xLabel: string;
  yLabel: string;
  colorLabel: string;
  xField: string;
  yField: string;
  colorField: string;
  timeGrain?: string;
  isExpanded?: boolean;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  xLabel,
  yLabel,
  colorLabel,
  xField,
  yField,
  colorField,
  timeGrain,
  isExpanded = false,
}) => {
  // Helper to check if a value looks like a date
  const isDateValue = (value: any): boolean => {
    if (!value) return false;
    const strValue = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(strValue) || !isNaN(Date.parse(strValue));
  };

  // Format axis label based on time_grain if applicable
  const formatAxisLabel = (value: any): string => {
    if (timeGrain && isDateValue(value)) {
      return formatTimeLabel(value, timeGrain);
    }
    return String(value);
  };

  // Get unique x and y values
  const xValues = Array.from(new Set(data.map((d) => d[xField]))).sort();
  const yValues = Array.from(new Set(data.map((d) => d[yField]))).sort();

  // Create a map for quick lookup
  const dataMap = new Map<string, number>();
  const allColorValues: number[] = [];

  data.forEach((row) => {
    const key = `${row[xField]}-${row[yField]}`;
    const value = row[colorField];
    dataMap.set(key, value);
    if (typeof value === 'number') {
      allColorValues.push(value);
    }
  });

  // Calculate color scale
  const minValue = Math.min(...allColorValues);
  const maxValue = Math.max(...allColorValues);

  // Generate color based on value
  const getColor = (value: number | undefined): string => {
    if (value === undefined || value === null) {
      return '#f3f4f6'; // Gray for missing values
    }

    // Normalize value between 0 and 1
    const normalized = maxValue === minValue ? 0.5 : (value - minValue) / (maxValue - minValue);

    // Use blue gradient from light to dark
    // Light blue: #dbeafe to Dark blue: #1e40af
    const lightBlue = { r: 219, g: 234, b: 254 };
    const darkBlue = { r: 30, g: 64, b: 175 };

    const r = Math.round(lightBlue.r + (darkBlue.r - lightBlue.r) * normalized);
    const g = Math.round(lightBlue.g + (darkBlue.g - lightBlue.g) * normalized);
    const b = Math.round(lightBlue.b + (darkBlue.b - lightBlue.b) * normalized);

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Get text color based on background brightness
  const getTextColor = (bgColor: string): string => {
    if (bgColor === '#f3f4f6') return '#6b7280';

    const rgb = bgColor.match(/\d+/g);
    if (!rgb) return '#ffffff';

    const [r, g, b] = rgb.map(Number);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 155 ? '#1f2937' : '#ffffff';
  };

  // Format value for display
  const formatValue = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'number') {
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
    }
    return String(value);
  };

  // Create color scale legend
  const legendSteps = 5;
  const legendColors = Array.from({ length: legendSteps }, (_, i) => {
    const value = minValue + (maxValue - minValue) * (i / (legendSteps - 1));
    return {
      color: getColor(value),
      value: value,
    };
  });

  // Check for dimension overload
  if (xValues.length > 30 || yValues.length > 30) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        <p>
          Too many categories to display ({xValues.length} x {yValues.length} cells).
        </p>
        <p>Please narrow down your data to 30 or fewer categories per axis for optimal visualization.</p>
      </div>
    );
  }

  const cellSize = isExpanded ? 60 : 50;

  return (
    <div className="heatmap-container">
      <div className="heatmap-wrapper" style={{ overflowX: xValues.length > 10 ? 'auto' : 'visible' }}>
        <table className="heatmap-table" style={{ fontSize: isExpanded ? '13px' : '12px' }}>
          <thead>
            <tr>
              <th className="heatmap-cell heatmap-cell--header heatmap-cell--corner"></th>
              {xValues.map((xVal) => {
                const displayLabel = formatAxisLabel(xVal);
                return (
                  <th
                    key={String(xVal)}
                    className="heatmap-cell heatmap-cell--header"
                    style={{ minWidth: cellSize, maxWidth: cellSize }}
                    title={displayLabel}
                  >
                    <div className="heatmap-cell-content heatmap-cell-content--header">
                      {displayLabel.length > 10 ? displayLabel.substring(0, 10) + '...' : displayLabel}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {yValues.map((yVal) => {
              const yDisplayLabel = formatAxisLabel(yVal);
              return (
              <tr key={String(yVal)}>
                <th className="heatmap-cell heatmap-cell--header heatmap-cell--row-header" title={yDisplayLabel}>
                  <div className="heatmap-cell-content heatmap-cell-content--header">{yDisplayLabel}</div>
                </th>
                {xValues.map((xVal) => {
                  const key = `${xVal}-${yVal}`;
                  const value = dataMap.get(key);
                  const bgColor = getColor(value);
                  const textColor = getTextColor(bgColor);
                  const xDisplayLabel = formatAxisLabel(xVal);

                  return (
                    <td
                      key={key}
                      className="heatmap-cell heatmap-cell--data"
                      style={{
                        backgroundColor: bgColor,
                        color: textColor,
                        minWidth: cellSize,
                        maxWidth: cellSize,
                        height: cellSize,
                      }}
                      title={`${xLabel}: ${xDisplayLabel}\n${yLabel}: ${yDisplayLabel}\n${colorLabel}: ${formatValue(value)}`}
                    >
                      <div className="heatmap-cell-content">{formatValue(value)}</div>
                    </td>
                  );
                })}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* Color scale legend */}
      <div className="heatmap-legend">
        <div className="heatmap-legend-title">{colorLabel}</div>
        <div className="heatmap-legend-scale">
          {legendColors.map((item, index) => (
            <div key={index} className="heatmap-legend-item">
              <div className="heatmap-legend-color" style={{ backgroundColor: item.color }} />
              <div className="heatmap-legend-label">{formatValue(item.value)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

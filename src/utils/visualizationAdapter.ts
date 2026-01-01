/**
 * Visualization Adapter Layer
 * Transforms raw data into chart-ready formatted data
 * Handles automatic type detection, formatting, and chart-specific requirements
 */

import type { VisualizationRecommendation } from '../types/api';
import type { FormatConfig } from './formatters';
import {
  createFormatConfig,
  formatValue,
  formatValueTooltip,
} from './formatters';

export interface FormattedChartData {
  // Original field names
  xField: string;
  yField: string;

  // Labels
  xLabel: string;
  yLabel: string;

  // Format configurations
  xFormat: FormatConfig;
  yFormat: FormatConfig;

  // Transformed data ready for charts
  chartData: Array<{
    name: string; // Formatted x-axis value
    value: number; // Raw numeric value for y-axis
    rawName: any; // Original x value
    rawValue: any; // Original y value
    displayValue: string; // Formatted y value for display
    tooltipName: string; // Full formatted x for tooltip
    tooltipValue: string; // Full formatted y for tooltip
  }>;

  // Additional metadata
  total?: number;
  hasTimeData: boolean;
  isPercentage: boolean;
  isCurrency: boolean;
}

/**
 * Main adapter function - converts raw data to formatted chart data
 */
export function adaptVisualizationData(
  visualization: VisualizationRecommendation,
  rawData: Record<string, any>[]
): FormattedChartData {
  const { encoding } = visualization;
  const xEncoding = encoding?.x;
  const yEncoding = encoding?.y;

  if (!xEncoding || !yEncoding) {
    throw new Error('Missing required encoding configuration');
  }

  const xField = xEncoding.field;
  const yField = yEncoding.field;

  // Extract sample values for type detection
  const xSampleValues = rawData.map(row => row[xField]).filter(v => v != null);
  const ySampleValues = rawData.map(row => row[yField]).filter(v => v != null);

  // Create format configurations
  const xFormat = createFormatConfig(
    xField,
    xEncoding.type,
    xSampleValues,
    xEncoding.format
  );

  const yFormat = createFormatConfig(
    yField,
    yEncoding.type,
    ySampleValues,
    yEncoding.format
  );

  // Transform data
  const chartData = rawData.map(row => {
    const rawX = row[xField];
    const rawY = row[yField];
    const numericY = Number(rawY) || 0;

    return {
      name: formatValue(rawX, xFormat),
      value: numericY,
      rawName: rawX,
      rawValue: rawY,
      displayValue: formatValue(rawY, yFormat),
      tooltipName: formatValueTooltip(rawX, xFormat),
      tooltipValue: formatValueTooltip(rawY, yFormat, rawY),
    };
  });

  // Calculate total for percentage calculations
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return {
    xField,
    yField,
    xLabel: xEncoding.label || xField,
    yLabel: yEncoding.label || yField,
    xFormat,
    yFormat,
    chartData,
    total,
    hasTimeData: xFormat.type === 'date' || yFormat.type === 'date',
    isPercentage: yFormat.type === 'percentage',
    isCurrency: yFormat.type === 'currency',
  };
}

/**
 * Chart-specific adapters for different visualization types
 */

export interface PieChartData extends FormattedChartData {
  chartData: Array<{
    name: string;
    value: number;
    rawName: any;
    rawValue: any;
    displayValue: string;
    tooltipName: string;
    tooltipValue: string;
    percent: number; // 0-1 for Recharts
    percentDisplay: string; // Formatted percentage string
  }>;
}

/**
 * Adapt data specifically for pie charts
 */
export function adaptPieChartData(
  visualization: VisualizationRecommendation,
  rawData: Record<string, any>[],
  maxSlices: number = 10
): PieChartData {
  // Limit data for readability
  const limitedData = rawData.slice(0, maxSlices);
  const baseData = adaptVisualizationData(visualization, limitedData);

  // Add percentage calculations
  const chartDataWithPercent = baseData.chartData.map(item => ({
    ...item,
    percent: baseData.total! > 0 ? item.value / baseData.total! : 0,
    percentDisplay: baseData.total! > 0
      ? ((item.value / baseData.total!) * 100).toFixed(1)
      : '0.0',
  }));

  return {
    ...baseData,
    chartData: chartDataWithPercent,
  };
}

export interface LineChartData extends FormattedChartData {
  // Line charts may need time-based sorting and formatting
  isTimeSeries: boolean;
  timeGranularity?: string;
}

/**
 * Adapt data specifically for line charts
 */
export function adaptLineChartData(
  visualization: VisualizationRecommendation,
  rawData: Record<string, any>[]
): LineChartData {
  const baseData = adaptVisualizationData(visualization, rawData);

  // Check if this is a time series
  const isTimeSeries = baseData.xFormat.type === 'date';
  const timeGranularity = baseData.xFormat.timeGranularity;

  // Sort by x-axis if it's temporal
  if (isTimeSeries) {
    baseData.chartData.sort((a, b) => {
      const dateA = new Date(a.rawName).getTime();
      const dateB = new Date(b.rawName).getTime();
      return dateA - dateB;
    });
  }

  return {
    ...baseData,
    isTimeSeries,
    timeGranularity,
  };
}

export interface BarChartData extends FormattedChartData {
  // Bar charts use categorical data
  isCategorical: boolean;
}

/**
 * Adapt data specifically for bar charts
 */
export function adaptBarChartData(
  visualization: VisualizationRecommendation,
  rawData: Record<string, any>[]
): BarChartData {
  const baseData = adaptVisualizationData(visualization, rawData);

  // Bar charts typically use categorical x-axis
  const isCategorical = baseData.xFormat.type === 'string' ||
                        (baseData.xFormat.type === 'date' && baseData.xFormat.timeGranularity !== 'none');

  return {
    ...baseData,
    isCategorical,
  };
}

/**
 * Format axis tick values
 * Used by chart components to format tick labels
 */
export function formatAxisTick(value: any, format: FormatConfig): string {
  return formatValue(value, format);
}

/**
 * Format tooltip content
 * Provides detailed formatting for tooltip displays
 */
export interface TooltipContent {
  label: string;
  value: string;
  rawValue?: string;
  metadata?: string;
}

export function formatTooltipContent(
  name: any,
  value: any,
  xFormat: FormatConfig,
  yFormat: FormatConfig,
  metricName?: string
): TooltipContent {
  const formattedLabel = formatValueTooltip(name, xFormat);
  const formattedValue = formatValueTooltip(value, yFormat, value);

  // Add raw value if using compact notation
  let rawValueStr: string | undefined;
  if (yFormat.compact && typeof value === 'number') {
    rawValueStr = value.toLocaleString();
  }

  return {
    label: formattedLabel,
    value: formattedValue,
    rawValue: rawValueStr,
    metadata: metricName,
  };
}

/**
 * Determine if a field should use compact number formatting
 */
export function shouldUseCompactFormat(values: number[]): boolean {
  const maxValue = Math.max(...values.map(Math.abs));
  return maxValue >= 10000; // Use compact for values >= 10K
}

/**
 * Utility to extract column metadata for formatting
 */
export function getColumnFormat(
  columnName: string,
  data: Record<string, any>[]
): FormatConfig {
  const sampleValues = data
    .map(row => row[columnName])
    .filter(v => v != null)
    .slice(0, 100); // Sample first 100 rows

  // Try to detect from field name and values
  const detectedType = createFormatConfig(
    columnName,
    'quantitative', // Default assumption
    sampleValues
  );

  return detectedType;
}

/**
 * Helper to truncate long labels while preserving important information
 */
export function truncateLabel(label: string, maxLength: number = 25): string {
  if (label.length <= maxLength) return label;

  // Try to truncate at word boundary
  const truncated = label.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.6) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Color palette generator with accessibility in mind
 */
export const COLOR_PALETTES = {
  default: [
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
  ],
  monochrome: [
    '#3b82f6', // blue-500
    '#60a5fa', // blue-400
    '#2563eb', // blue-600
    '#1d4ed8', // blue-700
    '#93c5fd', // blue-300
  ],
  warm: [
    '#f59e0b', // amber-500
    '#f97316', // orange-500
    '#ec4899', // pink-500
    '#dc2626', // red-600
    '#fbbf24', // amber-400
  ],
  cool: [
    '#3b82f6', // blue-500
    '#06b6d4', // cyan-500
    '#14b8a6', // teal-500
    '#10b981', // emerald-500
    '#8b5cf6', // violet-500
  ],
};

export function getColorPalette(type: 'default' | 'monochrome' | 'warm' | 'cool' = 'default'): string[] {
  return COLOR_PALETTES[type];
}

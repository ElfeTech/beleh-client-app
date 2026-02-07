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

  // Extract time grain from backend if available (check both direct property and advanced_spec)
  const timeGrain = visualization.time_grain || (visualization as any).advanced_spec?.time_grain;

  // Create format configurations
  const xFormat = createFormatConfig(
    xField,
    xEncoding.type,
    xSampleValues,
    xEncoding.format,
    timeGrain
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

/**
 * Multi-dimensional visualization adapters
 */

export interface MultiDimensionalChartData {
  xField: string;
  yField: string;
  xLabel: string;
  yLabel: string;
  xFormat: FormatConfig;
  yFormat: FormatConfig;
  data: Record<string, any>[];

  // Additional dimension fields
  seriesField?: string;
  seriesLabel?: string;
  colorField?: string;
  colorLabel?: string;
  sizeField?: string;
  sizeLabel?: string;
  facetField?: string;
  facetLabel?: string;

  // Time grain from backend
  timeGrain?: string;

  dimensionCount: number;
}

/**
 * Adapt data for multi-dimensional charts (multi-line, grouped bars, etc.)
 */
export function adaptMultiDimensionalData(
  visualization: VisualizationRecommendation,
  rawData: Record<string, any>[]
): MultiDimensionalChartData {
  const { encoding } = visualization;

  if (!encoding?.x) {
    throw new Error('Missing required x encoding configuration');
  }

  if (rawData.length === 0) {
    throw new Error('No data available');
  }

  const xField = encoding.x.field;

  // If y field is not explicitly provided, infer it from the data
  let yField: string;
  let yLabel: string;
  let yType: 'categorical' | 'quantitative' | 'temporal' = 'quantitative';

  if (encoding?.y) {
    yField = encoding.y.field;
    yLabel = encoding.y.label || yField;
    yType = encoding.y.type;
  } else {
    // Infer y field from data - find the first numeric column that's not x or series/color/size/facet
    const excludeFields = new Set([
      xField,
      encoding.series?.field,
      encoding.color?.field,
      encoding.size?.field,
      encoding.facet?.field,
    ].filter(Boolean));

    const numericColumns = Object.keys(rawData[0]).filter(col => {
      if (excludeFields.has(col)) return false;
      const value = rawData[0][col];
      return typeof value === 'number' || !isNaN(Number(value));
    });

    if (numericColumns.length === 0) {
      throw new Error('No numeric field found for y-axis');
    }

    yField = numericColumns[0];
    yLabel = yField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Extract dimension fields
  const seriesField = encoding.series?.field;
  const colorField = encoding.color?.field;
  const sizeField = encoding.size?.field;
  const facetField = encoding.facet?.field;

  // Calculate dimension count
  let dimensionCount = 2; // x and y are always present
  if (seriesField) dimensionCount++;
  if (colorField) dimensionCount++;
  if (sizeField) dimensionCount++;
  if (facetField) dimensionCount++;

  // Create format configurations
  const xSampleValues = rawData.map(row => row[xField]).filter(v => v != null);
  const ySampleValues = rawData.map(row => row[yField]).filter(v => v != null);

  const xFormat = createFormatConfig(
    xField,
    encoding.x.type,
    xSampleValues,
    encoding.x.format
  );

  const yFormat = createFormatConfig(
    yField,
    yType,
    ySampleValues,
    encoding.y?.format
  );

  // Extract time grain from visualization metadata (check both direct property and advanced_spec)
  const timeGrain = visualization.time_grain || (visualization as any).advanced_spec?.time_grain;

  return {
    xField,
    yField,
    xLabel: encoding.x.label || xField,
    yLabel,
    xFormat,
    yFormat,
    data: rawData,
    seriesField,
    seriesLabel: encoding.series?.label || seriesField,
    colorField,
    colorLabel: encoding.color?.label || colorField,
    sizeField,
    sizeLabel: encoding.size?.label || sizeField,
    facetField,
    facetLabel: encoding.facet?.label || facetField,
    timeGrain,
    dimensionCount,
  };
}

/**
 * Check if visualization has too many dimensions
 */
export function checkDimensionOverload(
  visualization: VisualizationRecommendation,
  maxDimensions: number = 5
): { overloaded: boolean; dimensionCount: number; message?: string } {
  const { encoding } = visualization;

  let dimensionCount = 0;
  if (encoding?.x) dimensionCount++;
  if (encoding?.y) dimensionCount++;
  if (encoding?.series) dimensionCount++;
  if (encoding?.color) dimensionCount++;
  if (encoding?.size) dimensionCount++;
  if (encoding?.facet) dimensionCount++;

  const overloaded = dimensionCount > maxDimensions;

  return {
    overloaded,
    dimensionCount,
    message: overloaded
      ? `Too many dimensions (${dimensionCount}). Maximum recommended is ${maxDimensions}. Consider using faceting or filtering your data.`
      : undefined,
  };
}

/**
 * Get unique values for a categorical field
 */
export function getUniqueValues(
  data: Record<string, any>[],
  field: string
): any[] {
  return Array.from(new Set(data.map(row => row[field])));
}

/**
 * Check cardinality of categorical fields
 */
export function checkFieldCardinality(
  data: Record<string, any>[],
  field: string,
  maxCardinality: number = 20
): { valid: boolean; cardinality: number; message?: string } {
  const uniqueValues = getUniqueValues(data, field);
  const cardinality = uniqueValues.length;
  const valid = cardinality <= maxCardinality;

  return {
    valid,
    cardinality,
    message: valid
      ? undefined
      : `Too many unique values in '${field}' (${cardinality}). Maximum recommended is ${maxCardinality}.`,
  };
}

/**
 * Wide-to-Long data format transformation
 * Converts data with multiple metric columns into a normalized format suitable for multi-series charts
 *
 * Example:
 * Input (wide format):
 *   [{ segment: "A", total_sales: 100, total_profit: 20 }]
 * Output (long format):
 *   [{ segment: "A", metric: "total_sales", value: 100 }, { segment: "A", metric: "total_profit", value: 20 }]
 */
export interface WideToLongResult {
  data: Record<string, any>[];
  seriesField: string;
  valueField: string;
  metricNames: string[];
}

/**
 * Detect if data is in wide format with multiple numeric columns
 * that should be treated as separate series
 */
export function detectWideFormatData(
  data: Record<string, any>[],
  xField: string,
  yField?: string
): { isWideFormat: boolean; numericColumns: string[] } {
  if (!data || data.length === 0) {
    return { isWideFormat: false, numericColumns: [] };
  }

  const firstRow = data[0];
  const allColumns = Object.keys(firstRow);

  // Find all numeric columns (excluding the x-axis field)
  const numericColumns = allColumns.filter(col => {
    if (col === xField) return false;
    const value = firstRow[col];
    return typeof value === 'number' || (!Number.isNaN(Number(value)) && value !== null && value !== '');
  });

  // Consider it wide format if:
  // 1. There are 2+ numeric columns
  // 2. No explicit y-field is provided OR the y-field is just one of multiple numeric columns
  const isWideFormat = numericColumns.length >= 2 && (!yField || numericColumns.includes(yField));

  return { isWideFormat, numericColumns };
}

/**
 * Transform wide-format data to long-format for multi-series visualization
 */
export function transformWideToLong(
  data: Record<string, any>[],
  xField: string,
  metricColumns: string[],
  seriesFieldName: string = 'metric',
  valueFieldName: string = 'value'
): WideToLongResult {
  const longData: Record<string, any>[] = [];

  data.forEach(row => {
    metricColumns.forEach(metricCol => {
      const newRow: Record<string, any> = {
        [xField]: row[xField],
        [seriesFieldName]: formatMetricName(metricCol),
        [valueFieldName]: Number(row[metricCol]) || 0,
        // Preserve original metric column name for reference
        _originalMetric: metricCol,
      };

      // Copy any other non-metric fields (e.g., additional dimensions)
      Object.keys(row).forEach(key => {
        if (key !== xField && !metricColumns.includes(key)) {
          newRow[key] = row[key];
        }
      });

      longData.push(newRow);
    });
  });

  return {
    data: longData,
    seriesField: seriesFieldName,
    valueField: valueFieldName,
    metricNames: metricColumns.map(formatMetricName),
  };
}

/**
 * Format metric column names for display
 * e.g., "total_sales" -> "Total Sales"
 */
function formatMetricName(name: string): string {
  return name
    .replaceAll('_', ' ')
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

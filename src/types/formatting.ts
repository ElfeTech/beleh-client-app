/**
 * Type definitions for the visualization formatting system
 */

import type { FormatConfig as BaseFormatConfig, TimeGranularity as BaseTimeGranularity } from '../utils/formatters';

export type { FormatConfig, TimeGranularity } from '../utils/formatters';

/**
 * Supported format types
 */
export type FormatType = 'number' | 'currency' | 'percentage' | 'date' | 'time' | 'datetime' | 'string';

/**
 * Configuration for formatting a specific field
 */
export interface FieldFormatConfig extends BaseFormatConfig {
  fieldName: string;
}

/**
 * Theme configuration for visualizations
 */
export interface VisualizationTheme {
  colors: string[];
  fontFamily?: string;
  fontSize?: {
    axis?: number;
    label?: number;
    tooltip?: number;
    legend?: number;
  };
  gridColor?: string;
  axisColor?: string;
  backgroundColor?: string;
}

/**
 * Formatting options that can be passed to chart components
 */
export interface ChartFormattingOptions {
  compactNumbers?: boolean;
  showRawValues?: boolean;
  dateFormat?: string;
  currencySymbol?: string;
  locale?: string;
  decimals?: number;
}

/**
 * Metadata about the formatted data
 */
export interface FormattedDataMetadata {
  hasTimeData: boolean;
  hasNumericData: boolean;
  hasCurrencyData: boolean;
  hasPercentageData: boolean;
  timeGranularity?: BaseTimeGranularity;
  valueRange?: {
    min: number;
    max: number;
  };
}

/**
 * Result of field type detection
 */
export interface FieldTypeDetectionResult {
  detectedType: FormatType;
  confidence: number;
  suggestedFormat?: BaseFormatConfig;
  samples?: any[];
}

/**
 * Formatter registry for custom formatters
 */
export interface FormatterRegistry {
  [key: string]: (value: any, config?: Partial<BaseFormatConfig>) => string;
}

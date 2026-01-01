/**
 * Formatting utilities for charts and visualizations
 * Provides consistent, professional formatting across all chart types
 */

import { format, parseISO, isValid } from 'date-fns';

/**
 * Time granularity detection from data patterns
 */
export type TimeGranularity = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'none';

export interface FormatConfig {
  type: 'number' | 'currency' | 'percentage' | 'date' | 'time' | 'datetime' | 'string';
  currency?: string;
  locale?: string;
  decimals?: number;
  compact?: boolean; // Use K, M, B notation
  dateFormat?: string;
  timeGranularity?: TimeGranularity;
}

/**
 * Detect if a value is a date/time
 */
export function isDateTime(value: any): boolean {
  if (!value) return false;

  // Check if it's already a Date object
  if (value instanceof Date) return isValid(value);

  // Check common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO 8601
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/, // YYYY-MM-DD HH:mm:ss
    /^\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY or M/D/YYYY
  ];

  const strValue = String(value);
  if (datePatterns.some(pattern => pattern.test(strValue))) {
    try {
      const date = parseISO(strValue);
      return isValid(date);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Detect time granularity from a set of date values
 */
export function detectTimeGranularity(values: any[]): TimeGranularity {
  if (values.length === 0) return 'none';

  const dates = values
    .filter(v => v != null)
    .map(v => {
      try {
        return parseISO(String(v));
      } catch {
        return null;
      }
    })
    .filter(d => d && isValid(d)) as Date[];

  if (dates.length === 0) return 'none';

  // Check if all dates have the same year
  const years = new Set(dates.map(d => d.getFullYear()));
  const months = new Set(dates.map(d => `${d.getFullYear()}-${d.getMonth()}`));
  const days = new Set(dates.map(d => d.toDateString()));

  // Check for time components
  const hasTimes = dates.some(d => d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0);

  if (!hasTimes) {
    // Date-only granularity
    if (years.size > 1 && days.size === dates.length) {
      // Multiple years, different days
      return 'day';
    } else if (months.size > 1 && days.size === dates.length) {
      // Multiple months
      return 'day';
    } else if (months.size > 1) {
      return 'month';
    } else if (years.size > 1) {
      return 'year';
    }
    return 'day';
  } else {
    // Has time component
    const hasMinutes = dates.some(d => d.getMinutes() !== 0);
    const hasSeconds = dates.some(d => d.getSeconds() !== 0);

    if (hasSeconds) return 'second';
    if (hasMinutes) return 'minute';
    return 'hour';
  }
}

/**
 * Format a date value based on granularity
 */
export function formatDate(value: any, granularity: TimeGranularity = 'day', fullFormat: boolean = false): string {
  if (!value) return 'N/A';

  try {
    const date = typeof value === 'string' ? parseISO(value) : value;
    if (!isValid(date)) return String(value);

    if (fullFormat) {
      // Full format for tooltips
      switch (granularity) {
        case 'year':
          return format(date, 'yyyy');
        case 'month':
          return format(date, 'MMMM yyyy');
        case 'day':
          return format(date, 'MMMM d, yyyy');
        case 'hour':
          return format(date, 'MMM d, yyyy HH:mm');
        case 'minute':
          return format(date, 'MMM d, yyyy HH:mm');
        case 'second':
          return format(date, 'MMM d, yyyy HH:mm:ss');
        default:
          return format(date, 'MMM d, yyyy');
      }
    } else {
      // Compact format for axis labels
      switch (granularity) {
        case 'year':
          return format(date, 'yyyy');
        case 'month':
          return format(date, 'MMM');
        case 'day':
          return format(date, 'MMM d');
        case 'hour':
          return format(date, 'HH:mm');
        case 'minute':
          return format(date, 'HH:mm');
        case 'second':
          return format(date, 'HH:mm:ss');
        default:
          return format(date, 'MMM d');
      }
    }
  } catch {
    return String(value);
  }
}

/**
 * Format a number with intelligent precision and compact notation
 */
export function formatNumber(
  value: number,
  config: Partial<FormatConfig> = {}
): string {
  const {
    decimals,
    compact = false,
    locale = 'en-US',
  } = config;

  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  if (compact) {
    return formatCompactNumber(value, decimals);
  }

  // Intelligent decimal precision
  const autoDecimals = decimals !== undefined ? decimals : getIntelligentDecimals(value);

  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: autoDecimals,
  });
}

/**
 * Format number with K, M, B notation
 */
export function formatCompactNumber(value: number, decimals?: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e9) {
    return `${sign}${(abs / 1e9).toFixed(decimals ?? 1)}B`;
  } else if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toFixed(decimals ?? 1)}M`;
  } else if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(decimals ?? 1)}K`;
  }

  return formatNumber(value, { decimals: decimals ?? 0 });
}

/**
 * Get intelligent decimal places based on value magnitude
 */
function getIntelligentDecimals(value: number): number {
  const abs = Math.abs(value);

  if (abs === 0) return 0;
  if (abs >= 1000) return 0;
  if (abs >= 100) return 1;
  if (abs >= 10) return 1;
  if (abs >= 1) return 2;

  // For very small numbers, show up to 4 decimals
  return 4;
}

/**
 * Format currency values
 */
export function formatCurrency(
  value: number,
  config: Partial<FormatConfig> = {}
): string {
  const {
    currency = 'USD',
    locale = 'en-US',
    compact = false,
  } = config;

  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  if (compact && Math.abs(value) >= 1000) {
    const compactNum = formatCompactNumber(value, 1);
    return `$${compactNum}`;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format percentage values
 */
export function formatPercentage(
  value: number,
  config: Partial<FormatConfig> = {}
): string {
  const { decimals = 1 } = config;

  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  return `${value.toFixed(decimals)}%`;
}

/**
 * Auto-detect format type from field name and sample values
 */
export function detectFormatType(
  fieldName: string,
  sampleValues: any[]
): FormatConfig['type'] {
  const lowerName = fieldName.toLowerCase();

  // Check field name patterns
  if (lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('timestamp')) {
    if (lowerName.includes('time') && !lowerName.includes('date')) {
      return 'time';
    }
    return 'date';
  }

  if (lowerName.includes('percent') || lowerName.includes('rate') || lowerName.includes('ratio')) {
    return 'percentage';
  }

  if (lowerName.includes('price') || lowerName.includes('cost') || lowerName.includes('amount') ||
      lowerName.includes('revenue') || lowerName.includes('salary')) {
    return 'currency';
  }

  // Check sample values
  const validSamples = sampleValues.filter(v => v != null);
  if (validSamples.length === 0) return 'string';

  // Check if dates
  if (validSamples.some(v => isDateTime(v))) {
    return 'date';
  }

  // Check if numbers
  const numericSamples = validSamples.filter(v => typeof v === 'number' || !isNaN(Number(v)));
  if (numericSamples.length === validSamples.length) {
    return 'number';
  }

  return 'string';
}

/**
 * Create a format config for a field based on encoding and data
 */
export function createFormatConfig(
  field: string,
  fieldType: 'categorical' | 'quantitative' | 'temporal',
  sampleValues: any[],
  format?: string
): FormatConfig {
  // Use explicit format if provided
  if (format) {
    if (format.includes('$')) return { type: 'currency', compact: true };
    if (format.includes('%')) return { type: 'percentage' };
    if (format.includes('K') || format.includes('M')) return { type: 'number', compact: true };
  }

  // Auto-detect based on field type
  if (fieldType === 'temporal') {
    const granularity = detectTimeGranularity(sampleValues);
    return { type: 'date', timeGranularity: granularity };
  }

  if (fieldType === 'quantitative') {
    const detectedType = detectFormatType(field, sampleValues);

    if (detectedType === 'currency') {
      return { type: 'currency', compact: true };
    }

    if (detectedType === 'percentage') {
      return { type: 'percentage', decimals: 1 };
    }

    return { type: 'number', compact: true };
  }

  // Categorical - check if it's actually dates
  const detectedType = detectFormatType(field, sampleValues);
  if (detectedType === 'date' || detectedType === 'time') {
    const granularity = detectTimeGranularity(sampleValues);
    return { type: 'date', timeGranularity: granularity };
  }

  return { type: 'string' };
}

/**
 * Apply formatting to a value based on config
 */
export function formatValue(value: any, config: FormatConfig): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  switch (config.type) {
    case 'date':
    case 'time':
    case 'datetime':
      return formatDate(value, config.timeGranularity || 'day', false);

    case 'currency':
      return formatCurrency(Number(value), config);

    case 'percentage':
      return formatPercentage(Number(value), config);

    case 'number':
      return formatNumber(Number(value), config);

    case 'string':
    default:
      return String(value);
  }
}

/**
 * Format value for tooltips (more detailed)
 */
export function formatValueTooltip(value: any, config: FormatConfig, rawValue?: any): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  switch (config.type) {
    case 'date':
    case 'time':
    case 'datetime':
      return formatDate(value, config.timeGranularity || 'day', true);

    case 'currency':
      // Show full currency in tooltip
      return formatCurrency(Number(value), { ...config, compact: false });

    case 'percentage':
      return formatPercentage(Number(value), config);

    case 'number':
      // Show full number in tooltip
      const formatted = formatNumber(Number(value), { ...config, compact: false });
      // If compact was used in display, show both
      if (config.compact && rawValue !== undefined) {
        const compact = formatCompactNumber(Number(value));
        return `${formatted} (${compact})`;
      }
      return formatted;

    case 'string':
    default:
      return String(value);
  }
}

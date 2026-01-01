# Visualization Formatting System

A smart, automatic formatting layer for charts and visualizations that provides professional, executive-ready output.

## Overview

The visualization formatting system consists of two main components:

1. **formatters.ts** - Core formatting utilities for dates, numbers, currency, and percentages
2. **visualizationAdapter.ts** - Adapter layer that transforms raw data into chart-ready formatted data

## Features

### Automatic Type Detection
- Detects dates, times, numbers, currency, and percentages from field names and sample values
- Intelligently determines time granularity (year, month, day, hour, minute, second)
- No manual configuration required in most cases

### Professional Formatting
- **Numbers**: Compact notation (1.2K, 3.4M, 5.6B) for large values
- **Currency**: Localized currency formatting with symbols
- **Percentages**: Configurable decimal precision
- **Dates**: Smart formatting based on granularity
  - Year → `2024`
  - Month → `Jan` or `January`
  - Day → `Jan 12`
  - Hour → `14:30`
- **Never shows ugly timestamps** like `2024-01-15 00:00:00`

### Chart-Specific Adaptations
- **Line Charts**: Time-based sorting, time series detection
- **Bar Charts**: Categorical labeling
- **Pie Charts**: Percentage calculations, slice limiting
- **Tooltips**: Detailed formatting with raw values when needed

## Usage

### Basic Usage in Chart Components

```typescript
import { adaptLineChartData } from '../../../utils/visualizationAdapter';
import { formatValue } from '../../../utils/formatters';

function LineChart({ data, visualization }) {
  // Adapt data with automatic formatting
  const formattedData = adaptLineChartData(visualization, data);
  const { chartData, yLabel, yFormat } = formattedData;

  // Create axis formatter
  const formatYAxis = (value: number) => formatValue(value, yFormat);

  return (
    <RechartsLineChart data={chartData}>
      <YAxis tickFormatter={formatYAxis} />
      {/* ... */}
    </RechartsLineChart>
  );
}
```

### Custom Tooltips

```typescript
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const data = payload[0].payload;
    return (
      <div>
        <div>{data.tooltipName}</div>
        <div>{data.tooltipValue}</div>
      </div>
    );
  }
  return null;
};
```

### Chart-Specific Adapters

#### Pie Chart
```typescript
const pieData = adaptPieChartData(visualization, rawData, maxSlices);
// Includes percentage calculations and formatting
```

#### Line Chart
```typescript
const lineData = adaptLineChartData(visualization, rawData);
// Automatically sorts time series data
```

#### Bar Chart
```typescript
const barData = adaptBarChartData(visualization, rawData);
// Optimized for categorical data
```

## API Reference

### Core Formatters

#### `formatValue(value: any, config: FormatConfig): string`
Formats a value based on the provided configuration.

#### `formatDate(value: any, granularity: TimeGranularity, fullFormat: boolean): string`
Formats date values with appropriate granularity.

#### `formatNumber(value: number, config: Partial<FormatConfig>): string`
Formats numbers with intelligent precision.

#### `formatCurrency(value: number, config: Partial<FormatConfig>): string`
Formats currency values with localization.

#### `formatPercentage(value: number, config: Partial<FormatConfig>): string`
Formats percentage values.

### Type Detection

#### `detectFormatType(fieldName: string, sampleValues: any[]): FormatConfig['type']`
Auto-detects the format type from field name and sample values.

#### `detectTimeGranularity(values: any[]): TimeGranularity`
Determines the time granularity from a set of date values.

#### `isDateTime(value: any): boolean`
Checks if a value represents a date/time.

### Visualization Adapters

#### `adaptVisualizationData(visualization, rawData): FormattedChartData`
Base adapter that works for all chart types.

#### `adaptPieChartData(visualization, rawData, maxSlices): PieChartData`
Specialized adapter for pie charts with percentage calculations.

#### `adaptLineChartData(visualization, rawData): LineChartData`
Specialized adapter for line charts with time series support.

#### `adaptBarChartData(visualization, rawData): BarChartData`
Specialized adapter for bar charts with categorical support.

## Format Configuration

### FormatConfig Interface

```typescript
interface FormatConfig {
  type: 'number' | 'currency' | 'percentage' | 'date' | 'time' | 'datetime' | 'string';
  currency?: string;         // e.g., 'USD', 'EUR'
  locale?: string;           // e.g., 'en-US', 'de-DE'
  decimals?: number;         // Number of decimal places
  compact?: boolean;         // Use K, M, B notation
  dateFormat?: string;       // Custom date format
  timeGranularity?: TimeGranularity;
}
```

### Time Granularity

```typescript
type TimeGranularity = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'none';
```

## Examples

### Automatic Number Formatting

```typescript
formatNumber(1234567, { compact: true });
// Output: "1.2M"

formatNumber(1234.567, { decimals: 2 });
// Output: "1,234.57"
```

### Automatic Date Formatting

```typescript
// Axis label (compact)
formatDate('2024-01-15', 'day', false);
// Output: "Jan 15"

// Tooltip (full)
formatDate('2024-01-15', 'day', true);
// Output: "January 15, 2024"
```

### Currency Formatting

```typescript
formatCurrency(1234.56, { currency: 'USD', compact: false });
// Output: "$1,234.56"

formatCurrency(1234567, { currency: 'USD', compact: true });
// Output: "$1.2M"
```

## Integration with Backend

The system automatically reads field encoding information from the backend's `VisualizationRecommendation`:

```typescript
interface FieldEncoding {
  field: string;
  type: 'categorical' | 'quantitative' | 'temporal';
  label: string;
  format?: string;  // Optional explicit format hint
}
```

The adapter uses this metadata to automatically configure formatters.

## Theming

Access predefined color palettes:

```typescript
import { getColorPalette } from '../utils/visualizationAdapter';

const colors = getColorPalette('default');  // or 'monochrome', 'warm', 'cool'
```

## Best Practices

1. **Always use adapters** - Don't transform data manually in chart components
2. **Trust auto-detection** - The system intelligently detects types from field names and values
3. **Use tooltips for details** - Show compact values on axes, detailed values in tooltips
4. **Consistent formatting** - Use the same FormatConfig for a field across different contexts
5. **Test with edge cases** - Verify formatting with null values, very large/small numbers, etc.

## Testing

The formatters handle edge cases:
- Null/undefined values → "N/A"
- Invalid dates → original value as string
- NaN → "N/A"
- Very large numbers → Compact notation
- Very small numbers → Appropriate decimal precision

## Future Enhancements

Potential improvements to consider:
- Custom formatter registry for domain-specific formats
- Internationalization support
- Dynamic format detection based on data distribution
- Format templates/presets
- Accessibility features (ARIA labels, screen reader support)

/**
 * Chart Compatibility Utility
 * Determines which chart types are compatible with given data characteristics
 */

export type ChartType =
    | 'bar'
    | 'line'
    | 'pie'
    | 'stacked_bar'
    | 'scatter'
    | 'heatmap'
    | 'table';

export interface ChartTypeOption {
    type: ChartType;
    label: string;
    icon: string;
    description: string;
    recommended?: boolean;
}

export interface DataCharacteristics {
    rowCount: number;
    hasNumericY: boolean;
    hasCategoricalX: boolean;
    hasTemporalX: boolean;
    hasSeriesField: boolean;
    numericColumnCount: number;
    categoricalColumnCount: number;
    uniqueXValues: number;
    uniqueSeriesValues?: number;
    // Track if explicit encoding fields exist
    hasExplicitXField: boolean;
    hasExplicitYField: boolean;
}

/**
 * Analyze data to determine its characteristics
 */
export function analyzeDataCharacteristics(
    data: Record<string, any>[],
    xField?: string,
    yField?: string,
    seriesField?: string
): DataCharacteristics {
    if (!data || data.length === 0) {
        return {
            rowCount: 0,
            hasNumericY: false,
            hasCategoricalX: false,
            hasTemporalX: false,
            hasSeriesField: false,
            numericColumnCount: 0,
            categoricalColumnCount: 0,
            uniqueXValues: 0,
            hasExplicitXField: false,
            hasExplicitYField: false,
        };
    }

    const firstRow = data[0];
    const columns = Object.keys(firstRow);

    // Count numeric and categorical columns
    let numericColumnCount = 0;
    let categoricalColumnCount = 0;

    columns.forEach(col => {
        const value = firstRow[col];
        if (typeof value === 'number' || (!Number.isNaN(Number(value)) && value !== null && value !== '')) {
            numericColumnCount++;
        } else if (typeof value === 'string') {
            categoricalColumnCount++;
        }
    });

    // Track if explicit fields are provided
    const hasExplicitXField = !!(xField && firstRow[xField] !== undefined);
    const hasExplicitYField = !!(yField && firstRow[yField] !== undefined);

    // Analyze X field
    let hasCategoricalX = false;
    let hasTemporalX = false;
    let uniqueXValues = 0;

    if (hasExplicitXField && xField) {
        const xValues = data.map(row => row[xField]);
        uniqueXValues = new Set(xValues).size;

        const xSample = firstRow[xField];
        if (typeof xSample === 'string') {
            // Check if it's a date
            const dateTest = new Date(xSample);
            const datePattern = /^\d{4}[-/]\d{2}[-/]\d{2}/;
            const isDateFormat = datePattern.exec(xSample);
            if (!Number.isNaN(dateTest.getTime()) && isDateFormat) {
                hasTemporalX = true;
            } else {
                hasCategoricalX = true;
            }
        }
    }

    // Analyze Y field
    let hasNumericY = false;
    if (hasExplicitYField && yField) {
        const yValue = firstRow[yField];
        hasNumericY = typeof yValue === 'number' || !Number.isNaN(Number(yValue));
    } else if (hasExplicitXField && numericColumnCount > 0) {
        // Only infer Y if we have explicit X and there are numeric columns available
        hasNumericY = true;
    }

    // Check for series field
    let hasSeriesField = false;
    let uniqueSeriesValues: number | undefined;
    if (seriesField && firstRow[seriesField] !== undefined) {
        hasSeriesField = true;
        const seriesValues = data.map(row => row[seriesField]);
        uniqueSeriesValues = new Set(seriesValues).size;
    }

    return {
        rowCount: data.length,
        hasNumericY,
        hasCategoricalX,
        hasTemporalX,
        hasSeriesField,
        numericColumnCount,
        categoricalColumnCount,
        uniqueXValues,
        uniqueSeriesValues,
        hasExplicitXField,
        hasExplicitYField,
    };
}

/**
 * Determine compatible chart types based on data characteristics
 */
export function getCompatibleChartTypes(
    characteristics: DataCharacteristics,
    currentType?: ChartType
): ChartTypeOption[] {
    const options: ChartTypeOption[] = [];
    const {
        rowCount,
        hasNumericY,
        hasCategoricalX,
        hasTemporalX,
        numericColumnCount,
        uniqueXValues,
        hasExplicitXField,
        hasExplicitYField,
    } = characteristics;

    // Table is always compatible
    options.push({
        type: 'table',
        label: 'Table',
        icon: 'table',
        description: 'View data in tabular format',
    });

    // Charts require at least an explicit X field to work properly
    // Without proper encoding, charts will fail with "Missing required encoding configuration"
    const hasValidEncoding = hasExplicitXField && (hasExplicitYField || numericColumnCount > 0);

    if (!hasValidEncoding) {
        // If current type is not table, still include it but mark table as recommended
        if (currentType && currentType !== 'table') {
            const tableOption = options.find(opt => opt.type === 'table');
            if (tableOption) {
                tableOption.recommended = true;
            }
        }
        return options;
    }

    // Bar chart - good for categorical data with numeric values
    if (hasNumericY && (hasCategoricalX || uniqueXValues <= 20) && uniqueXValues > 0) {
        options.push({
            type: 'bar',
            label: 'Bar',
            icon: 'bar',
            description: 'Compare values across categories',
            recommended: hasCategoricalX && !hasTemporalX,
        });
    }

    // Line chart - good for temporal/sequential data
    if (hasNumericY && (hasTemporalX || uniqueXValues >= 3)) {
        options.push({
            type: 'line',
            label: 'Line',
            icon: 'line',
            description: 'Show trends over time or sequence',
            recommended: hasTemporalX,
        });
    }

    // Pie chart - good for showing parts of a whole (limited categories)
    if (hasNumericY && uniqueXValues >= 2 && uniqueXValues <= 10) {
        options.push({
            type: 'pie',
            label: 'Pie',
            icon: 'pie',
            description: 'Show proportions of a whole',
        });
    }

    // Stacked/Grouped bar - good when comparing multiple series or metrics
    if (hasNumericY && numericColumnCount >= 2 && uniqueXValues > 0 && uniqueXValues <= 15) {
        options.push({
            type: 'stacked_bar',
            label: 'Grouped Bar',
            icon: 'stacked_bar',
            description: 'Compare multiple metrics side by side',
        });
    }

    // Scatter plot - good for showing correlation between two numeric values
    if (numericColumnCount >= 2 && rowCount >= 5 && hasExplicitXField) {
        options.push({
            type: 'scatter',
            label: 'Scatter',
            icon: 'scatter',
            description: 'Show relationship between two variables',
        });
    }

    // Mark current type as selected/recommended if it's in the list
    if (currentType) {
        const currentOption = options.find(opt => opt.type === currentType);
        if (currentOption) {
            currentOption.recommended = true;
        }
    }

    // Sort: recommended first, then alphabetically
    return options.sort((a, b) => {
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        return a.label.localeCompare(b.label);
    });
}

/**
 * Get icon SVG path for chart type
 */
export function getChartTypeIcon(type: ChartType): string {
    const icons: Record<ChartType, string> = {
        bar: 'M18 20V10M12 20V4M6 20v-6',
        line: 'M3 12l4-4 4 4 4-4 4 4M3 20h18',
        pie: 'M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9M12 3v9l6.36 3.64',
        stacked_bar: 'M18 20V10M12 20V4M6 20v-6M18 10V4M12 4v4M6 14V8',
        scatter: 'M6 6h.01M6 18h.01M12 12h.01M18 6h.01M18 18h.01M9 9h.01M15 15h.01',
        heatmap: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
        table: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
    };
    return icons[type] || icons.table;
}

/**
 * Convert internal chart type to backend format
 */
export function chartTypeToBackendFormat(type: ChartType): string {
    const mapping: Record<ChartType, string> = {
        bar: 'bar',
        line: 'line',
        pie: 'pie',
        stacked_bar: 'stacked_bar',
        scatter: 'scatter',
        heatmap: 'heatmap',
        table: 'table',
    };
    return mapping[type] || 'table';
}

/**
 * Convert backend chart type to internal format
 */
export function backendToChartType(backendType: string): ChartType {
    const mapping: Record<string, ChartType> = {
        'bar': 'bar',
        'BAR_CHART': 'bar',
        'line': 'line',
        'LINE_CHART': 'line',
        'multiline': 'line',
        'MULTI_LINE_CHART': 'line',
        'pie': 'pie',
        'PIE_CHART': 'pie',
        'stacked_bar': 'stacked_bar',
        'STACKED_BAR_CHART': 'stacked_bar',
        'scatter': 'scatter',
        'SCATTER_PLOT': 'scatter',
        'heatmap': 'heatmap',
        'HEATMAP': 'heatmap',
        'table': 'table',
        'TABLE': 'table',
    };
    return mapping[backendType] || 'table';
}

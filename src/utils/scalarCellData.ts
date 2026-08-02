import type { VisualizationRecommendation } from '../types/api';
import { formatNumber } from './formatters';

export interface ScalarCellData {
  label: string;
  value: string;
}

function humanizeFieldName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function isNumericValue(value: unknown): boolean {
  if (value == null || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return false;
  return !Number.isNaN(Number(value));
}

function formatScalarDisplay(value: unknown): string {
  if (value == null) return ',';
  if (typeof value === 'number') {
    return formatNumber(value, { compact: true, decimals: 4 });
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function resolveLabel(
  field: string,
  row: Record<string, unknown>,
  visualization?: VisualizationRecommendation | null,
): string {
  const encodingLabel =
    visualization?.encoding?.y?.field === field
      ? visualization.encoding?.y?.label
      : visualization?.encoding?.x?.field === field
        ? visualization.encoding?.x?.label
        : undefined;

  if (encodingLabel?.trim()) return encodingLabel.trim();
  const cell = row[field];
  if (typeof cell === 'string' && cell.trim() && !isNumericValue(cell)) return cell.trim();
  return humanizeFieldName(field);
}

/** True when the result set is a single scalar (one row, one meaningful value). */
export function isScalarCellResult(rows: Record<string, unknown>[], columns: string[]): boolean {
  return extractScalarCellData(rows, columns) !== null;
}

export function extractScalarCellData(
  rows: Record<string, unknown>[],
  columns: string[],
  visualization?: VisualizationRecommendation | null,
): ScalarCellData | null {
  if (!Array.isArray(rows) || rows.length !== 1) return null;

  const row = rows[0];
  const cols = columns.length > 0 ? columns : Object.keys(row);
  if (cols.length === 0) return null;

  if (cols.length === 1) {
    const field = cols[0];
    const raw = row[field];
    if (raw == null || raw === '') return null;
    return {
      label: resolveLabel(field, row, visualization),
      value: formatScalarDisplay(raw),
    };
  }

  const numericCols = cols.filter((c) => isNumericValue(row[c]));

  if (cols.length === 2 && numericCols.length === 1) {
    const valueCol = numericCols[0];
    const labelCol = cols.find((c) => c !== valueCol)!;
    const labelCell = row[labelCol];
    const label =
      typeof labelCell === 'string' && labelCell.trim() && !isNumericValue(labelCell)
        ? String(labelCell).trim()
        : resolveLabel(valueCol, row, visualization);

    return {
      label,
      value: formatScalarDisplay(row[valueCol]),
    };
  }

  if (numericCols.length === 1) {
    const valueCol = numericCols[0];
    const xField = visualization?.encoding?.x?.field || visualization?.dimensions?.x;
    const labelFromX =
      xField && cols.includes(xField) && row[xField] != null && !isNumericValue(row[xField])
        ? String(row[xField]).trim()
        : null;

    return {
      label: labelFromX || resolveLabel(valueCol, row, visualization),
      value: formatScalarDisplay(row[valueCol]),
    };
  }

  return null;
}

import type { ChatWorkflowResponse } from '../types/api';
import {
  analyzeDataCharacteristics,
  backendToChartType,
  getCompatibleChartTypes,
  type ChartType,
} from './chartCompatibility';
import { isScalarCellResult } from './scalarCellData';

export type ResponseViewId = 'table' | 'plot' | 'sql';

export interface ResponseViewAvailability {
  table: boolean;
  plot: boolean;
  sql: boolean;
  availableViews: ResponseViewId[];
  defaultView: ResponseViewId | null;
  compatiblePlotTypes: ChartType[];
  originalChartType: ChartType;
}

export function getCompiledSql(response: ChatWorkflowResponse): string | null {
  const fromExecution = response.execution?.sql_query?.trim();
  if (fromExecution) return fromExecution;

  const entities = response.intent?.entities;
  if (entities && typeof entities === 'object') {
    const sql = (entities as Record<string, unknown>).sql;
    if (typeof sql === 'string' && sql.trim()) return sql.trim();
    const query = (entities as Record<string, unknown>).query;
    if (typeof query === 'string' && query.trim()) return query.trim();
  }

  return null;
}

export function getResponseViewAvailability(
  response: ChatWorkflowResponse,
): ResponseViewAvailability {
  const execution = response.execution;
  const visualization = response.visualization;
  const rows = execution?.rows ?? [];
  const hasRows = Array.isArray(rows) && rows.length > 0;

  const columnNames =
    execution?.columns?.map((c) => c.name) ?? (hasRows ? Object.keys(rows[0]) : []);

  const table = hasRows && columnNames.length > 0;
  const scalarCell = table && isScalarCellResult(rows as Record<string, unknown>[], columnNames);

  const originalChartType = backendToChartType(
    visualization?.type || visualization?.visualization_type || 'table',
  );

  let compatiblePlotTypes: ChartType[] = [];
  if (table && visualization && !scalarCell) {
    const xField = visualization.encoding?.x?.field || visualization.dimensions?.x;
    const yField = visualization.encoding?.y?.field || visualization.dimensions?.y;
    const seriesField = visualization.encoding?.series?.field || visualization.dimensions?.series;
    const characteristics = analyzeDataCharacteristics(rows, xField, yField, seriesField);
    compatiblePlotTypes = getCompatibleChartTypes(characteristics, originalChartType)
      .map((o) => o.type)
      .filter((t) => t !== 'table');
  }

  const plot = Boolean(visualization && table && (scalarCell || compatiblePlotTypes.length > 0));
  const sql = Boolean(getCompiledSql(response));

  const availableViews: ResponseViewId[] = [];
  if (table) availableViews.push('table');
  if (plot) availableViews.push('plot');
  if (sql) availableViews.push('sql');

  let defaultView: ResponseViewId | null = availableViews[0] ?? null;
  if (scalarCell && availableViews.includes('plot')) {
    defaultView = 'plot';
  } else if (plot && originalChartType !== 'table' && availableViews.includes('plot')) {
    defaultView = 'plot';
  } else if (table && availableViews.includes('table')) {
    defaultView = 'table';
  }

  return {
    table,
    plot,
    sql,
    availableViews,
    defaultView,
    compatiblePlotTypes,
    originalChartType,
  };
}

/** True when the workflow response includes table/plot/SQL UI (not text-only). */
export function workflowHasRichUi(response: ChatWorkflowResponse): boolean {
  return getResponseViewAvailability(response).availableViews.length > 0;
}

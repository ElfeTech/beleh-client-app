import type {
  AssistantTurnMeta,
  ChartArtifactType,
  ChartData,
  ChatMessageMetadata,
  UiArtifact,
} from '../types/api';
import {
  asChartData,
  asTableData,
  findChartArtifacts,
  findTableArtifact,
  getArtifactReactKey,
  isChartArtifactType,
  tableRowsToRecords,
} from './artifactAdapters';
import type { ChartType } from './chartCompatibility';

export type ResponseViewId = 'table' | 'plot';

export interface ResponseViewChart {
  id: string;
  key: string;
  type: ChartArtifactType;
  data: ChartData;
  title: string;
}

export interface ResponseViewAvailability {
  table: boolean;
  plot: boolean;
  availableViews: ResponseViewId[];
  defaultView: ResponseViewId | null;
  compatiblePlotTypes: ChartType[];
  originalChartType: ChartType;
  tableColumns: string[];
  tableRows: Record<string, unknown>[];
  /** All valid charts in array order (multi-panel). */
  charts: ResponseViewChart[];
  /** First chart — used by single-panel tabs. */
  chartType: ChartArtifactType | null;
  chartData: ChartData | null;
  chartTitle: string;
}

const PLOT_SWITCH_TYPES: ChartType[] = ['bar', 'line', 'pie'];

function artifactChartToPlotType(type: ChartArtifactType): ChartType {
  if (type === 'doughnut') return 'pie';
  return type;
}

function isValidChartData(data: ChartData): boolean {
  return data.labels.length > 0 && data.datasets.length > 0;
}

/** SQL panels finalized; missing → 1 for older stored messages. */
export function getPanelCount(meta?: AssistantTurnMeta | null): number {
  const n = meta?.panel_count;
  if (typeof n === 'number' && Number.isFinite(n) && n >= 1) return Math.floor(n);
  return 1;
}

export function getResponseViewAvailability(artifacts: UiArtifact[]): ResponseViewAvailability {
  const tableArtifact = findTableArtifact(artifacts);

  let tableColumns: string[] = [];
  let tableRows: Record<string, unknown>[] = [];
  let table = false;

  if (tableArtifact) {
    const data = asTableData(tableArtifact.data);
    tableColumns = data.columns;
    tableRows = tableRowsToRecords(data.columns, data.rows);
    table = tableColumns.length > 0 && tableRows.length > 0;
  }

  const charts: ResponseViewChart[] = findChartArtifacts(artifacts)
    .filter((a): a is UiArtifact & { type: ChartArtifactType } => isChartArtifactType(a.type))
    .map((a) => {
      const data = asChartData(a.data);
      return {
        id: a.id,
        key: getArtifactReactKey(a),
        type: a.type,
        data,
        title: a.title || '',
      };
    })
    .filter((c) => isValidChartData(c.data));

  const first = charts[0];
  const plot = charts.length > 0;
  const chartType = first?.type ?? null;
  const chartData = first?.data ?? null;
  const chartTitle = first?.title ?? '';
  const originalChartType: ChartType = first ? artifactChartToPlotType(first.type) : 'bar';
  const compatiblePlotTypes: ChartType[] = (() => {
    if (!plot) return [];
    if (PLOT_SWITCH_TYPES.includes(originalChartType)) return [...PLOT_SWITCH_TYPES];
    return [originalChartType];
  })();

  const availableViews: ResponseViewId[] = [];
  if (table) availableViews.push('table');
  if (plot) availableViews.push('plot');

  let defaultView: ResponseViewId | null = availableViews[0] ?? null;
  if (plot && availableViews.includes('plot')) {
    defaultView = 'plot';
  } else if (table && availableViews.includes('table')) {
    defaultView = 'table';
  }

  return {
    table,
    plot,
    availableViews,
    defaultView,
    compatiblePlotTypes,
    originalChartType,
    tableColumns,
    tableRows,
    charts,
    chartType,
    chartData,
    chartTitle,
  };
}

export function turnHasRichUi(metadata: ChatMessageMetadata | null | undefined): boolean {
  const artifacts = metadata?.artifacts ?? [];
  if (artifacts.some((a) => a.type === 'kpi' || a.type === 'insight' || a.type === 'filter_bar')) {
    return true;
  }
  if (artifacts.some((a) => a.type === 'empty_state' || a.type === 'error')) {
    return true;
  }
  return getResponseViewAvailability(artifacts).availableViews.length > 0;
}

/** @deprecated use turnHasRichUi */
export function workflowHasRichUi(metadata: ChatMessageMetadata | null | undefined): boolean {
  return turnHasRichUi(metadata);
}

export function getTurnMeta(metadata: ChatMessageMetadata | null | undefined): AssistantTurnMeta {
  return metadata?.meta ?? {};
}

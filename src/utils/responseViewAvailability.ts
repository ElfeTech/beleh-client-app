import type {
  AssistantTurnMeta,
  ChartArtifactType,
  ChartData,
  ChatMessageMetadata,
  ScatterData,
  UiArtifact,
} from '../types/api';
import {
  asChartData,
  asScatterData,
  asTableData,
  findChartArtifacts,
  findTableArtifact,
  getArtifactReactKey,
  isCategoryChartType,
  isChartArtifactType,
  isScatterArtifactType,
  isValidCategoryChartData,
  isValidScatterData,
  tableRowsToRecords,
} from './artifactAdapters';
import type { ChartType } from './chartCompatibility';

export type ResponseViewId = 'table' | 'plot';

export interface ResponseViewChart {
  id: string;
  key: string;
  type: ChartArtifactType;
  /** Category charts only; null for scatter. */
  data: ChartData | null;
  /** Scatter only; null for category charts. */
  scatterData: ScatterData | null;
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
  /** First chart , used by single-panel tabs. */
  chartType: ChartArtifactType | null;
  chartData: ChartData | null;
  scatterData: ScatterData | null;
  chartTitle: string;
}

/** Category chart types that can be swapped in the interactive plot chips. */
const PLOT_SWITCH_TYPES: ChartType[] = ['column', 'bar', 'line', 'area', 'pie'];

function artifactChartToPlotType(type: ChartArtifactType): ChartType {
  if (type === 'doughnut') return 'pie';
  return type;
}

function toResponseViewChart(
  a: UiArtifact & { type: ChartArtifactType },
): ResponseViewChart | null {
  if (isScatterArtifactType(a.type)) {
    const scatterData = asScatterData(a.data);
    if (!isValidScatterData(scatterData)) return null;
    return {
      id: a.id,
      key: getArtifactReactKey(a),
      type: a.type,
      data: null,
      scatterData,
      title: a.title || '',
    };
  }

  if (!isCategoryChartType(a.type)) return null;
  const data = asChartData(a.data);
  if (!isValidCategoryChartData(data)) return null;
  return {
    id: a.id,
    key: getArtifactReactKey(a),
    type: a.type,
    data,
    scatterData: null,
    title: a.title || '',
  };
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
    .map(toResponseViewChart)
    .filter((c): c is ResponseViewChart => c != null);

  const first = charts[0];
  const plot = charts.length > 0;
  const chartType = first?.type ?? null;
  const chartData = first?.data ?? null;
  const scatterData = first?.scatterData ?? null;
  const chartTitle = first?.title ?? '';
  const originalChartType: ChartType = first ? artifactChartToPlotType(first.type) : 'column';
  const compatiblePlotTypes: ChartType[] = (() => {
    if (!plot) return [];
    if (originalChartType === 'scatter') return ['scatter'];
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
    scatterData,
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

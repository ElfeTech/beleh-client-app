import type {
  ActionGroupData,
  ActionItem,
  ChartArtifactType,
  ChartData,
  EmptyStateData,
  ErrorData,
  FilterBarData,
  InsightData,
  KpiData,
  ScatterData,
  ScatterDataset,
  ScatterPoint,
  TableData,
  UiArtifact,
} from '../types/api';

const CATEGORY_CHART_TYPES = new Set<string>(['column', 'bar', 'line', 'area', 'doughnut', 'pie']);

const CHART_TYPES = new Set<string>([...CATEGORY_CHART_TYPES, 'scatter']);

export function isChartArtifactType(type: string): type is ChartArtifactType {
  return CHART_TYPES.has(type);
}

export function isCategoryChartType(type: string): type is Exclude<ChartArtifactType, 'scatter'> {
  return CATEGORY_CHART_TYPES.has(type);
}

export function isScatterArtifactType(type: string): type is 'scatter' {
  return type === 'scatter';
}

export function asKpiData(data: Record<string, unknown>): KpiData {
  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  return {
    metrics: metrics
      .filter((m): m is Record<string, unknown> => m != null && typeof m === 'object')
      .map((m) => ({
        label: String(m.label ?? ''),
        value: String(m.value ?? ''),
        sub: m.sub != null ? String(m.sub) : null,
        delta_pct: typeof m.delta_pct === 'number' ? m.delta_pct : null,
      })),
  };
}

export function asTableData(data: Record<string, unknown>): TableData {
  const columns = Array.isArray(data.columns) ? data.columns.map(String) : [];
  const rows = Array.isArray(data.rows) ? (data.rows as unknown[][]) : [];
  const page_size = typeof data.page_size === 'number' ? data.page_size : 50;
  return { columns, rows, page_size };
}

export function asChartData(data: Record<string, unknown>): ChartData {
  const labels = Array.isArray(data.labels) ? data.labels.map(String) : [];
  const rawDatasets = Array.isArray(data.datasets) ? data.datasets : [];
  const datasets = rawDatasets
    .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object')
    .map((d) => ({
      label: String(d.label ?? ''),
      data: Array.isArray(d.data)
        ? d.data.map((n) => (typeof n === 'number' ? n : Number(n) || 0))
        : [],
    }));
  return {
    labels,
    datasets,
    source_tool_call_id: data.source_tool_call_id != null ? String(data.source_tool_call_id) : null,
  };
}

function coerceScatterPoint(raw: unknown): ScatterPoint | null {
  if (raw == null || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const x = typeof p.x === 'number' ? p.x : Number(p.x);
  const y = typeof p.y === 'number' ? p.y : Number(p.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const point: ScatterPoint = { x, y };
  if (p.label != null) point.label = String(p.label);
  return point;
}

export function asScatterData(data: Record<string, unknown>): ScatterData {
  const rawDatasets = Array.isArray(data.datasets) ? data.datasets : [];
  const datasets: ScatterDataset[] = rawDatasets
    .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object')
    .map((d) => {
      const rawPoints = Array.isArray(d.points) ? d.points : [];
      const points = rawPoints.map(coerceScatterPoint).filter((p): p is ScatterPoint => p != null);
      return {
        label: String(d.label ?? ''),
        points,
      };
    });

  return {
    datasets,
    x_label: data.x_label != null ? String(data.x_label) : undefined,
    y_label: data.y_label != null ? String(data.y_label) : undefined,
    source_tool_call_id: data.source_tool_call_id != null ? String(data.source_tool_call_id) : null,
  };
}

export function isValidCategoryChartData(data: ChartData): boolean {
  return data.labels.length > 0 && data.datasets.length > 0;
}

export function isValidScatterData(data: ScatterData): boolean {
  return data.datasets.some((d) => d.points.length > 0);
}

export function asInsightData(data: Record<string, unknown>): InsightData {
  const bullets = Array.isArray(data.bullets) ? data.bullets.map(String) : [];
  return {
    bullets,
    limitations: data.limitations != null ? String(data.limitations) : null,
    confidence: typeof data.confidence === 'number' ? data.confidence : null,
  };
}

export function asActionGroupData(data: Record<string, unknown>): ActionGroupData {
  const actions = Array.isArray(data.actions) ? data.actions : [];
  return {
    actions: actions
      .filter((a): a is Record<string, unknown> => a != null && typeof a === 'object')
      .map((a) => ({
        id: String(a.id ?? ''),
        label: String(a.label ?? ''),
        style: (a.style as ActionItem['style']) ?? 'secondary',
        kind: (a.kind as ActionItem['kind']) ?? 'ask',
        payload:
          a.payload && typeof a.payload === 'object' ? (a.payload as Record<string, unknown>) : {},
      })),
  };
}

export function asFilterBarData(data: Record<string, unknown>): FilterBarData {
  const filters = Array.isArray(data.filters) ? data.filters : [];
  return {
    filters: filters
      .filter((f): f is Record<string, unknown> => f != null && typeof f === 'object')
      .map((f) => ({
        id: String(f.id ?? ''),
        label: String(f.label ?? ''),
        value: String(f.value ?? ''),
      })),
  };
}

export function asEmptyStateData(data: Record<string, unknown>): EmptyStateData {
  return {
    message: data.message != null ? String(data.message) : 'No data returned for this query.',
  };
}

export function asErrorData(data: Record<string, unknown>): ErrorData {
  return {
    message: data.message != null ? String(data.message) : 'An error occurred.',
    code: data.code != null ? String(data.code) : null,
  };
}

/** Convert artifact table rows to object records for DataTable / TableSchemaView. */
export function tableRowsToRecords(
  columns: string[],
  rows: unknown[][],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      record[col] = Array.isArray(row) ? row[i] : undefined;
    });
    return record;
  });
}

export interface ChartSeriesPoint {
  name: string;
  tooltipName: string;
  value: number;
  tooltipValue: string;
  [key: string]: string | number;
}

/** Single-dataset → [{ name, value, ... }]; multi-dataset → rows with series keys. */
export function chartDataToSeries(chart: ChartData): {
  points: ChartSeriesPoint[];
  seriesKeys: string[];
  yLabel: string;
} {
  const { labels, datasets } = chart;
  if (!datasets.length) {
    return { points: [], seriesKeys: [], yLabel: '' };
  }

  if (datasets.length === 1) {
    const ds = datasets[0];
    const points = labels.map((label, i) => {
      const value = ds.data[i] ?? 0;
      return {
        name: truncateLabel(label),
        tooltipName: label,
        value,
        tooltipValue: formatChartNumber(value),
      };
    });
    return { points, seriesKeys: ['value'], yLabel: ds.label };
  }

  const seriesKeys = datasets.map((d, i) => d.label || `series_${i}`);
  const points = labels.map((label, i) => {
    const point: ChartSeriesPoint = {
      name: truncateLabel(label),
      tooltipName: label,
      value: datasets[0]?.data[i] ?? 0,
      tooltipValue: formatChartNumber(datasets[0]?.data[i] ?? 0),
    };
    datasets.forEach((ds, di) => {
      const key = seriesKeys[di];
      point[key] = ds.data[i] ?? 0;
    });
    return point;
  });

  return { points, seriesKeys, yLabel: datasets.map((d) => d.label).join(' / ') };
}

function truncateLabel(label: string, max = 18): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

function formatChartNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

export function getAskPromptsFromArtifacts(artifacts: UiArtifact[]): string[] {
  const prompts: string[] = [];
  for (const artifact of artifacts) {
    if (artifact.type !== 'action_group') continue;
    const { actions } = asActionGroupData(artifact.data);
    for (const action of actions) {
      if (action.kind !== 'ask') continue;
      const prompt = action.payload?.prompt;
      if (typeof prompt === 'string' && prompt.trim()) {
        prompts.push(prompt.trim());
      } else if (action.label.trim()) {
        prompts.push(action.label.trim());
      }
    }
  }
  return prompts;
}

export function findArtifact(
  artifacts: UiArtifact[],
  type: UiArtifact['type'],
): UiArtifact | undefined {
  return artifacts.find((a) => a.type === type);
}

export function findChartArtifact(artifacts: UiArtifact[]): UiArtifact | undefined {
  return artifacts.find((a) => isChartArtifactType(a.type));
}

/** All chart artifacts in array order (multi-panel turns). */
export function findChartArtifacts(artifacts: UiArtifact[]): UiArtifact[] {
  return artifacts.filter((a) => isChartArtifactType(a.type));
}

/**
 * Chart and panel-error artifacts in array order so a failed panel
 * slots between successful charts in multi-panel turns.
 */
export function findPanelViewArtifacts(artifacts: UiArtifact[]): UiArtifact[] {
  return artifacts.filter((a) => isChartArtifactType(a.type) || a.type === 'error');
}

/** Prefer source_tool_call_id for charts; fall back to artifact id. */
export function getArtifactReactKey(artifact: UiArtifact): string {
  if (isScatterArtifactType(artifact.type)) {
    const sourceId = asScatterData(artifact.data).source_tool_call_id;
    if (sourceId) return sourceId;
  } else if (isCategoryChartType(artifact.type)) {
    const sourceId = asChartData(artifact.data).source_tool_call_id;
    if (sourceId) return sourceId;
  }
  return artifact.id;
}

export function findTableArtifact(artifacts: UiArtifact[]): UiArtifact | undefined {
  return artifacts.find((a) => a.type === 'table');
}

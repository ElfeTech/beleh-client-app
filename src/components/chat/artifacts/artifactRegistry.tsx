import type { ComponentType } from 'react';
import type { ArtifactType, UiArtifact } from '../../../types/api';
import { asTableData, tableRowsToRecords } from '../../../utils/artifactAdapters';
import { TableSchemaView } from '../TableSchemaView';
import { ArtifactChartCard } from './ArtifactChartCard';
import { ArtifactKpi } from './ArtifactKpi';
import { ArtifactInsight } from './ArtifactInsight';
import { ArtifactActionGroup } from './ArtifactActionGroup';
import { ArtifactFilterBar } from './ArtifactFilterBar';
import { ArtifactEmptyState } from './ArtifactEmptyState';
import { ArtifactError } from './ArtifactError';

export interface ArtifactRenderContext {
  onAsk?: (prompt: string) => void;
  disabled?: boolean;
  filterValue?: string | null;
  onFilterChange?: (value: string | null) => void;
  /** When true, skip table/chart , handled by ResponseViewTabs */
  skipDataViews?: boolean;
}

export type ArtifactComponentProps = {
  artifact: UiArtifact;
  context?: ArtifactRenderContext;
};

function ArtifactTableStandalone({ artifact, context }: ArtifactComponentProps) {
  if (context?.skipDataViews) return null;
  const table = asTableData(artifact.data);
  let rows = tableRowsToRecords(table.columns, table.rows);
  if (context?.filterValue) {
    const q = context.filterValue.toLowerCase();
    rows = rows.filter((row) =>
      table.columns.some((col) =>
        String(row[col] ?? '')
          .toLowerCase()
          .includes(q),
      ),
    );
  }
  return <TableSchemaView columns={table.columns} rows={rows} />;
}

function ArtifactChartStandalone({ artifact, context }: ArtifactComponentProps) {
  if (context?.skipDataViews) return null;
  return <ArtifactChartCard artifact={artifact} />;
}

function ArtifactKpiWrap({ artifact }: ArtifactComponentProps) {
  return <ArtifactKpi artifact={artifact} />;
}

function ArtifactInsightWrap({ artifact }: ArtifactComponentProps) {
  return <ArtifactInsight artifact={artifact} />;
}

function ArtifactActionGroupWrap({ artifact, context }: ArtifactComponentProps) {
  return (
    <ArtifactActionGroup artifact={artifact} onAsk={context?.onAsk} disabled={context?.disabled} />
  );
}

function ArtifactFilterBarWrap({ artifact, context }: ArtifactComponentProps) {
  return (
    <ArtifactFilterBar
      artifact={artifact}
      activeValue={context?.filterValue}
      onChange={context?.onFilterChange}
    />
  );
}

function ArtifactEmptyWrap({ artifact }: ArtifactComponentProps) {
  return <ArtifactEmptyState artifact={artifact} />;
}

function ArtifactErrorWrap({ artifact }: ArtifactComponentProps) {
  return <ArtifactError artifact={artifact} canRetry={false} />;
}

/** Soft fallback for unshipped / unknown artifact types , never a red Error card. */
function ArtifactUnsupported({ artifact }: ArtifactComponentProps) {
  return (
    <p className="artifact-empty">
      {artifact.title ? <strong>{artifact.title}: </strong> : null}
      This visualization type isn&apos;t supported yet.
    </p>
  );
}

export const artifactRegistry: Record<ArtifactType, ComponentType<ArtifactComponentProps>> = {
  kpi: ArtifactKpiWrap,
  table: ArtifactTableStandalone,
  column: ArtifactChartStandalone,
  bar: ArtifactChartStandalone,
  line: ArtifactChartStandalone,
  area: ArtifactChartStandalone,
  doughnut: ArtifactChartStandalone,
  pie: ArtifactChartStandalone,
  scatter: ArtifactChartStandalone,
  heatmap: ArtifactChartStandalone,
  map: ArtifactChartStandalone,
  insight: ArtifactInsightWrap,
  action_group: ArtifactActionGroupWrap,
  filter_bar: ArtifactFilterBarWrap,
  empty_state: ArtifactEmptyWrap,
  error: ArtifactErrorWrap,
};

/** Types rendered inside ResponseViewTabs / panel grid when data views exist */
export const DATA_VIEW_ARTIFACT_TYPES = new Set<ArtifactType>([
  'table',
  'column',
  'bar',
  'line',
  'area',
  'doughnut',
  'pie',
  'scatter',
  'heatmap',
  'map',
]);

export function ArtifactRenderer({
  artifact,
  context,
}: {
  artifact: UiArtifact;
  context?: ArtifactRenderContext;
}) {
  const Comp = artifactRegistry[artifact.type] ?? ArtifactUnsupported;
  return <Comp artifact={artifact} context={context} />;
}

import type { ComponentType } from 'react';
import type { ArtifactType, ChartArtifactType, UiArtifact } from '../../../types/api';
import { asChartData, asTableData, tableRowsToRecords } from '../../../utils/artifactAdapters';
import { TableSchemaView } from '../TableSchemaView';
import { ArtifactChart } from './ArtifactChart';
import { ArtifactKpi } from './ArtifactKpi';
import { ArtifactInsight } from './ArtifactInsight';
import { ArtifactActionGroup } from './ArtifactActionGroup';
import { ArtifactFilterBar } from './ArtifactFilterBar';
import { ArtifactEmptyState } from './ArtifactEmptyState';
import { ArtifactError } from './ArtifactError';
import { ChartCard } from '../charts/ChartCard';

export interface ArtifactRenderContext {
  onAsk?: (prompt: string) => void;
  disabled?: boolean;
  filterValue?: string | null;
  onFilterChange?: (value: string | null) => void;
  /** When true, skip table/chart — handled by ResponseViewTabs */
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
  const chart = asChartData(artifact.data);
  return (
    <ChartCard title={artifact.title || undefined}>
      <ArtifactChart type={artifact.type as ChartArtifactType} data={chart} />
    </ChartCard>
  );
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

export const artifactRegistry: Record<ArtifactType, ComponentType<ArtifactComponentProps>> = {
  kpi: ArtifactKpiWrap,
  table: ArtifactTableStandalone,
  bar: ArtifactChartStandalone,
  line: ArtifactChartStandalone,
  doughnut: ArtifactChartStandalone,
  pie: ArtifactChartStandalone,
  insight: ArtifactInsightWrap,
  action_group: ArtifactActionGroupWrap,
  filter_bar: ArtifactFilterBarWrap,
  empty_state: ArtifactEmptyWrap,
  error: ArtifactErrorWrap,
};

/** Types rendered inside ResponseViewTabs when both table and chart exist */
export const DATA_VIEW_ARTIFACT_TYPES = new Set<ArtifactType>([
  'table',
  'bar',
  'line',
  'doughnut',
  'pie',
]);

export function ArtifactRenderer({
  artifact,
  context,
}: {
  artifact: UiArtifact;
  context?: ArtifactRenderContext;
}) {
  const Comp = artifactRegistry[artifact.type];
  if (!Comp) return null;
  return <Comp artifact={artifact} context={context} />;
}

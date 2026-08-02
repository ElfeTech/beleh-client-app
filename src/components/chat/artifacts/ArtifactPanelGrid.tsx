import type { ChartArtifactType, UiArtifact } from '../../../types/api';
import {
  asChartData,
  asScatterData,
  getArtifactReactKey,
  isCategoryChartType,
  isChartArtifactType,
  isScatterArtifactType,
} from '../../../utils/artifactAdapters';
import { ChartCard } from '../charts/ChartCard';
import { ArtifactChart } from './ArtifactChart';
import { ArtifactScatterChart } from './ArtifactScatterChart';
import { ArtifactError } from './ArtifactError';
import './artifacts.css';

interface ArtifactPanelGridProps {
  artifacts: UiArtifact[];
  /** When true, allow a 2-column layout on wide screens (only applies with 2+ panels). */
  multiColumn?: boolean;
}

export function ArtifactPanelGrid({
  artifacts,
  multiColumn = false,
}: Readonly<ArtifactPanelGridProps>) {
  const panels = artifacts.filter((a) => a.type === 'error' || isChartArtifactType(a.type));
  if (panels.length === 0) return null;

  // meta.panel_count can exceed the panels that actually render; never leave a lone
  // chart in a two-column track or it renders at half width.
  const useMultiColumn = multiColumn && panels.length > 1;

  return (
    <div
      className={
        useMultiColumn ? 'artifact-panel-grid artifact-panel-grid--multi' : 'artifact-panel-grid'
      }
    >
      {panels.map((artifact) => {
        const key = getArtifactReactKey(artifact);

        if (artifact.type === 'error') {
          return (
            <div key={key} className="artifact-panel-grid__cell">
              <ArtifactError artifact={artifact} canRetry={false} />
            </div>
          );
        }

        if (isScatterArtifactType(artifact.type)) {
          const scatter = asScatterData(artifact.data);
          return (
            <div key={key} className="artifact-panel-grid__cell">
              <ChartCard title={artifact.title || undefined}>
                <ArtifactScatterChart data={scatter} />
              </ChartCard>
            </div>
          );
        }

        if (!isCategoryChartType(artifact.type)) {
          return null;
        }

        const chart = asChartData(artifact.data);
        return (
          <div key={key} className="artifact-panel-grid__cell">
            <ChartCard title={artifact.title || undefined}>
              <ArtifactChart
                type={artifact.type as Exclude<ChartArtifactType, 'scatter'>}
                data={chart}
              />
            </ChartCard>
          </div>
        );
      })}
    </div>
  );
}

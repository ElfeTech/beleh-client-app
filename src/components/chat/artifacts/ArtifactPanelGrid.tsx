import type { UiArtifact } from '../../../types/api';
import { getArtifactReactKey, isChartArtifactType } from '../../../utils/artifactAdapters';
import { ArtifactChartCard } from './ArtifactChartCard';
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

        return (
          <div key={key} className="artifact-panel-grid__cell">
            <ArtifactChartCard artifact={artifact} />
          </div>
        );
      })}
    </div>
  );
}

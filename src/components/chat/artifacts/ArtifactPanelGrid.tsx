import type { ChartArtifactType, UiArtifact } from '../../../types/api';
import {
  asChartData,
  getArtifactReactKey,
  isChartArtifactType,
} from '../../../utils/artifactAdapters';
import { ChartCard } from '../charts/ChartCard';
import { ArtifactChart } from './ArtifactChart';
import { ArtifactError } from './ArtifactError';
import './artifacts.css';

interface ArtifactPanelGridProps {
  artifacts: UiArtifact[];
  /** When true, use 2-column layout on md+ screens. */
  multiColumn?: boolean;
}

export function ArtifactPanelGrid({
  artifacts,
  multiColumn = false,
}: Readonly<ArtifactPanelGridProps>) {
  if (artifacts.length === 0) return null;

  return (
    <div
      className={
        multiColumn ? 'artifact-panel-grid artifact-panel-grid--multi' : 'artifact-panel-grid'
      }
    >
      {artifacts.map((artifact) => {
        const key = getArtifactReactKey(artifact);

        if (artifact.type === 'error') {
          return (
            <div key={key} className="artifact-panel-grid__cell">
              <ArtifactError artifact={artifact} canRetry={false} />
            </div>
          );
        }

        if (!isChartArtifactType(artifact.type)) return null;

        const chart = asChartData(artifact.data);
        return (
          <div key={key} className="artifact-panel-grid__cell">
            <ChartCard title={artifact.title || undefined}>
              <ArtifactChart type={artifact.type as ChartArtifactType} data={chart} />
            </ChartCard>
          </div>
        );
      })}
    </div>
  );
}

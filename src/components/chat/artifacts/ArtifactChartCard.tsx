import { useState } from 'react';
import type { UiArtifact } from '../../../types/api';
import {
  asChartData,
  asHeatmapData,
  asMapData,
  asScatterData,
  isCategoryChartType,
  isHeatmapArtifactType,
  isMapArtifactType,
  isScatterArtifactType,
} from '../../../utils/artifactAdapters';
import { ChartCard } from '../charts/ChartCard';
import { ExpandedChartModal } from '../charts/ExpandedChartModal';
import { ArtifactChart } from './ArtifactChart';
import { ArtifactHeatmap } from './ArtifactHeatmap';
import { ArtifactMapChart } from './ArtifactMapChart';
import { ArtifactScatterChart } from './ArtifactScatterChart';

interface ArtifactChartCardProps {
  artifact: UiArtifact;
}

/**
 * Chart artifact in a card with a maximize action.
 * The expanded copy re-renders at the larger `isExpanded` size rather than being scaled up.
 */
export function ArtifactChartCard({ artifact }: Readonly<ArtifactChartCardProps>) {
  const [isMaximized, setIsMaximized] = useState(false);
  const title = artifact.title || undefined;

  const renderChart = (isExpanded: boolean) => {
    if (isScatterArtifactType(artifact.type)) {
      return <ArtifactScatterChart data={asScatterData(artifact.data)} isExpanded={isExpanded} />;
    }
    if (isHeatmapArtifactType(artifact.type)) {
      return <ArtifactHeatmap data={asHeatmapData(artifact.data)} isExpanded={isExpanded} />;
    }
    if (isMapArtifactType(artifact.type)) {
      return <ArtifactMapChart data={asMapData(artifact.data)} isExpanded={isExpanded} />;
    }
    if (isCategoryChartType(artifact.type)) {
      return (
        <ArtifactChart
          type={artifact.type}
          data={asChartData(artifact.data)}
          isExpanded={isExpanded}
        />
      );
    }
    return null;
  };

  const chart = renderChart(false);
  if (!chart) return null;

  return (
    <>
      <ChartCard title={title} onExpand={() => setIsMaximized(true)}>
        {chart}
      </ChartCard>

      {isMaximized && (
        <ExpandedChartModal title={title} onClose={() => setIsMaximized(false)}>
          {renderChart(true)}
        </ExpandedChartModal>
      )}
    </>
  );
}

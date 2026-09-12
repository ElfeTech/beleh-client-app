import type { UiArtifact } from '../../types/api';
import { getResponseViewAvailability } from '../../utils/responseViewAvailability';
import { asEmptyStateData, asErrorData } from '../../utils/artifactAdapters';
import './ChartVisualization.css';

interface ChartVisualizationProps {
  artifacts: UiArtifact[];
}

/** Fallback shell when there is no rich analysis card (text-only / empty / error). */
export function ChartVisualization({ artifacts }: ChartVisualizationProps) {
  const availability = getResponseViewAvailability(artifacts);

  if (availability.availableViews.length > 0) {
    return null;
  }

  const errorArt = artifacts.find((a) => a.type === 'error');
  if (errorArt) {
    const { message } = asErrorData(errorArt.data);
    return (
      <p className="message-plain message-plain--assistant leading-relaxed text-[color:var(--error)]">
        {message}
      </p>
    );
  }

  const emptyArt = artifacts.find((a) => a.type === 'empty_state');
  if (emptyArt) {
    const { message } = asEmptyStateData(emptyArt.data);
    return (
      <p className="message-plain message-plain--assistant leading-relaxed text-[color:var(--text-muted)]">
        {message}
      </p>
    );
  }

  return null;
}

import type { UiArtifact } from '../../../types/api';
import { asEmptyStateData } from '../../../utils/artifactAdapters';
import './artifacts.css';

interface ArtifactEmptyStateProps {
  artifact: UiArtifact;
}

export function ArtifactEmptyState({ artifact }: ArtifactEmptyStateProps) {
  const { message } = asEmptyStateData(artifact.data);
  return (
    <p className="artifact-empty">
      {artifact.title ? <strong>{artifact.title}: </strong> : null}
      {message}
    </p>
  );
}

import { ChatFailureCard } from '../ChatFailureCard';
import type { UiArtifact } from '../../../types/api';
import { asErrorData } from '../../../utils/artifactAdapters';

interface ArtifactErrorProps {
  artifact: UiArtifact;
  canRetry?: boolean;
  onRetry?: () => void;
  disabled?: boolean;
}

export function ArtifactError({ artifact, canRetry, onRetry, disabled }: ArtifactErrorProps) {
  const { message } = asErrorData(artifact.data);
  return (
    <ChatFailureCard
      title={artifact.title || 'Analysis could not be completed'}
      detail={message}
      canRetry={canRetry}
      onRetry={onRetry}
      disabled={disabled}
    />
  );
}

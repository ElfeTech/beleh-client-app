import { SuggestedPrompts } from '../SuggestedPrompts';
import type { UiArtifact } from '../../../types/api';
import { asActionGroupData } from '../../../utils/artifactAdapters';
import { toast } from 'sonner';

interface ArtifactActionGroupProps {
  artifact: UiArtifact;
  onAsk?: (prompt: string) => void;
  disabled?: boolean;
}

export function ArtifactActionGroup({ artifact, onAsk, disabled }: ArtifactActionGroupProps) {
  const { actions } = asActionGroupData(artifact.data);
  const askPrompts = actions
    .filter((a) => a.kind === 'ask')
    .map((a) => {
      const prompt = a.payload?.prompt;
      return typeof prompt === 'string' && prompt.trim() ? prompt.trim() : a.label.trim();
    })
    .filter(Boolean);

  // Handle non-ask kinds on the same list via SuggestedPrompts for ask only;
  // run_tool / navigate are stubbed when clicked via label fallback below.
  if (!askPrompts.length) {
    const other = actions.filter((a) => a.kind !== 'ask');
    if (!other.length) return null;
    return (
      <SuggestedPrompts
        prompts={other.map((a) => a.label)}
        disabled={disabled}
        onSelect={(label) => {
          const action = other.find((a) => a.label === label);
          if (action?.kind === 'navigate') {
            const path = action.payload?.path;
            if (typeof path === 'string' && path.startsWith('/')) {
              window.location.assign(path);
              return;
            }
          }
          toast.message('This action is not available yet.');
        }}
      />
    );
  }

  return (
    <SuggestedPrompts
      prompts={askPrompts}
      onSelect={(prompt) => onAsk?.(prompt)}
      disabled={disabled}
    />
  );
}

import { cn } from '../../../lib/utils';
import type { UiArtifact } from '../../../types/api';
import { asFilterBarData } from '../../../utils/artifactAdapters';
import './artifacts.css';

interface ArtifactFilterBarProps {
  artifact: UiArtifact;
  activeValue?: string | null;
  onChange?: (value: string | null) => void;
}

export function ArtifactFilterBar({ artifact, activeValue, onChange }: ArtifactFilterBarProps) {
  const { filters } = asFilterBarData(artifact.data);
  if (!filters.length) return null;

  return (
    <div className="artifact-filter-bar" role="group" aria-label={artifact.title || 'Filters'}>
      {artifact.title ? <p className="artifact-section-title">{artifact.title}</p> : null}
      <div className="artifact-filter-bar__chips">
        <button
          type="button"
          className={cn(
            'interactive-plot__chip',
            (activeValue == null || activeValue === '') && 'interactive-plot__chip--active',
          )}
          onClick={() => onChange?.(null)}
        >
          All
        </button>
        {filters.map((f) => (
          <button
            key={f.id || f.value}
            type="button"
            className={cn(
              'interactive-plot__chip',
              activeValue === f.value && 'interactive-plot__chip--active',
            )}
            onClick={() => onChange?.(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

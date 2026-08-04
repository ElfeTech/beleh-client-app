import type { UiArtifact } from '../../../types/api';
import { asInsightData } from '../../../utils/artifactAdapters';
import './artifacts.css';

interface ArtifactInsightProps {
  artifact: UiArtifact;
}

export function ArtifactInsight({ artifact }: ArtifactInsightProps) {
  const { bullets, limitations } = asInsightData(artifact.data);
  if (!bullets.length && !limitations) return null;

  return (
    <div className="artifact-insight">
      {artifact.title ? <p className="artifact-section-title">{artifact.title}</p> : null}
      {bullets.length > 0 ? (
        <ul className="artifact-insight__list">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}
      {limitations ? <p className="artifact-insight__limitations">{limitations}</p> : null}
    </div>
  );
}

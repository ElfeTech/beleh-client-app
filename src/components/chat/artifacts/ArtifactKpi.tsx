import { LabelWidgetCard } from '../LabelWidgetCard';
import type { UiArtifact } from '../../../types/api';
import { asKpiData } from '../../../utils/artifactAdapters';
import './artifacts.css';

interface ArtifactKpiProps {
  artifact: UiArtifact;
}

export function ArtifactKpi({ artifact }: ArtifactKpiProps) {
  const { metrics } = asKpiData(artifact.data);
  if (!metrics.length) return null;

  return (
    <div className="artifact-kpi">
      {artifact.title ? <p className="artifact-section-title">{artifact.title}</p> : null}
      <div className="artifact-kpi__grid">
        {metrics.map((m, i) => (
          <div key={`${m.label}-${i}`} className="artifact-kpi__item">
            <LabelWidgetCard label={m.label} value={m.value} />
            {m.sub || m.delta_pct != null ? (
              <p className="artifact-kpi__meta">
                {m.sub ? <span>{m.sub}</span> : null}
                {m.delta_pct != null ? (
                  <span
                    className={
                      m.delta_pct > 0
                        ? 'artifact-kpi__delta artifact-kpi__delta--up'
                        : m.delta_pct < 0
                          ? 'artifact-kpi__delta artifact-kpi__delta--down'
                          : 'artifact-kpi__delta'
                    }
                  >
                    {m.delta_pct > 0 ? '+' : ''}
                    {m.delta_pct}%
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

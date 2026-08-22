import type { CSSProperties } from 'react';
import { LabelWidgetCard } from '../LabelWidgetCard';
import type { UiArtifact } from '../../../types/api';
import { asKpiData } from '../../../utils/artifactAdapters';
import './artifacts.css';

interface ArtifactKpiProps {
  artifact: UiArtifact;
}

const MAX_KPI_COLUMNS = 4;

/**
 * Balanced column count for a KPI row set: fill rows as evenly as possible
 * with at most 4 cards per row. 1→1, 2→2, 3→3, 4→4, 5→3 (3+2), 6→3 (3+3),
 * 7→4 (4+3), 8→4 (4+4).
 */
export function balancedKpiColumns(count: number): number {
  if (count <= 0) return 1;
  if (count <= MAX_KPI_COLUMNS) return count;
  const rows = Math.ceil(count / MAX_KPI_COLUMNS);
  return Math.ceil(count / rows);
}

export function ArtifactKpi({ artifact }: ArtifactKpiProps) {
  const { metrics } = asKpiData(artifact.data);
  if (!metrics.length) return null;

  const columns = balancedKpiColumns(metrics.length);
  const gridStyle = { '--kpi-cols': columns } as CSSProperties;

  return (
    <div className="artifact-kpi" data-kpi-count={metrics.length}>
      {artifact.title ? <p className="artifact-section-title">{artifact.title}</p> : null}
      <div className="artifact-kpi__grid" style={gridStyle}>
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

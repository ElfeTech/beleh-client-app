import { useMemo, useState } from 'react';
import type { HeatmapData } from '../../../types/api';
import { isValidHeatmapData } from '../../../utils/artifactAdapters';
import {
  formatScaleValue,
  normalizeToDomain,
  sequentialBlue,
  sequentialBlueTextColor,
} from '../../../utils/sequentialBlueScale';
import '../charts/BarChart.css';
import './artifacts.css';

interface ArtifactHeatmapProps {
  data: HeatmapData;
  isExpanded?: boolean;
}

interface HoveredCell {
  xi: number;
  yi: number;
  clientX: number;
  clientY: number;
}

export function ArtifactHeatmap({ data, isExpanded = false }: ArtifactHeatmapProps) {
  const [hovered, setHovered] = useState<HoveredCell | null>(null);

  const { min, max } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const row of data.values) {
      for (const v of row) {
        if (v == null) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 0;
    }
    return { min: lo, max: hi };
  }, [data.values]);

  if (!isValidHeatmapData(data)) {
    return <div className="chart-error">No data available</div>;
  }

  const nx = data.x_labels.length;
  // Inline numbers stay readable only while cells are wide enough.
  const showCellValues = nx <= (isExpanded ? 14 : 9);
  const rotateXLabels = nx > 6 || data.x_labels.some((l) => l.length > 6);

  const hoveredValue = hovered ? data.values[hovered.yi]?.[hovered.xi] : null;

  return (
    <div className="artifact-heatmap" onMouseLeave={() => setHovered(null)}>
      <div
        className="artifact-heatmap__grid"
        style={{ gridTemplateColumns: `auto repeat(${nx}, minmax(0, 1fr))` }}
        role="table"
        aria-label={data.value_label || 'Heatmap'}
      >
        {data.y_labels.map((yLabel, yi) => (
          <div key={`row-${yi}`} className="artifact-heatmap__row" role="row">
            <div className="artifact-heatmap__y-label" role="rowheader" title={yLabel}>
              {yLabel}
            </div>
            {data.x_labels.map((xLabel, xi) => {
              const value = data.values[yi]?.[xi] ?? null;
              const t = value == null ? null : normalizeToDomain(value, min, max);
              return (
                <div
                  key={`cell-${yi}-${xi}`}
                  className="artifact-heatmap__cell"
                  role="cell"
                  style={
                    t == null
                      ? undefined
                      : { background: sequentialBlue(t), color: sequentialBlueTextColor(t) }
                  }
                  data-empty={t == null ? 'true' : undefined}
                  aria-label={`${yLabel} × ${xLabel}: ${value == null ? 'no data' : formatScaleValue(value)}`}
                  onMouseEnter={(e) =>
                    setHovered({ xi, yi, clientX: e.clientX, clientY: e.clientY })
                  }
                  onMouseMove={(e) =>
                    setHovered({ xi, yi, clientX: e.clientX, clientY: e.clientY })
                  }
                >
                  {showCellValues && value != null ? formatScaleValue(value) : null}
                </div>
              );
            })}
          </div>
        ))}
        <div className="artifact-heatmap__row" role="row">
          <div className="artifact-heatmap__y-label" aria-hidden />
          {data.x_labels.map((xLabel, xi) => (
            <div
              key={`x-${xi}`}
              className={
                rotateXLabels
                  ? 'artifact-heatmap__x-label artifact-heatmap__x-label--rotated'
                  : 'artifact-heatmap__x-label'
              }
              role="columnheader"
              title={xLabel}
            >
              <span>{xLabel}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="artifact-heatmap__footer">
        <div className="artifact-heatmap__axis-titles">
          {data.y_title ? <span>{data.y_title}</span> : null}
          {data.y_title && data.x_title ? <span aria-hidden>×</span> : null}
          {data.x_title ? <span>{data.x_title}</span> : null}
        </div>
        <div className="artifact-heatmap__legend" aria-hidden>
          <span>{formatScaleValue(min)}</span>
          <span
            className="artifact-heatmap__legend-ramp"
            style={{
              background: `linear-gradient(to right, ${sequentialBlue(0)}, ${sequentialBlue(0.5)}, ${sequentialBlue(1)})`,
            }}
          />
          <span>{formatScaleValue(max)}</span>
          {data.value_label ? <span>· {data.value_label}</span> : null}
        </div>
      </div>

      {hovered && hoveredValue != null ? (
        <div
          className="modern-chart-tooltip artifact-heatmap__tooltip"
          style={{ left: hovered.clientX + 12, top: hovered.clientY + 12 }}
        >
          <div className="tooltip-label">
            {data.y_labels[hovered.yi]} × {data.x_labels[hovered.xi]}
          </div>
          <div className="tooltip-value">
            <span className="tooltip-value-label">{data.value_label || 'Value'}:</span>
            <span className="tooltip-value-number">{formatScaleValue(hoveredValue)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

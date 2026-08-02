import { useMemo, useState } from 'react';

import type { ChartArtifactType, ChartData, ScatterData } from '../../types/api';
import type { ChartType } from '../../utils/chartCompatibility';
import { ArtifactChart } from './artifacts/ArtifactChart';
import { ArtifactScatterChart } from './artifacts/ArtifactScatterChart';
import { LabelWidgetCard } from './LabelWidgetCard';
import { cn } from '../../lib/utils';
import './InteractivePlotView.css';

interface InteractivePlotViewProps {
  chartType: ChartArtifactType;
  chartData?: ChartData | null;
  scatterData?: ScatterData | null;
  title?: string;
  compatiblePlotTypes: ChartType[];
  initialChartType: ChartType;
}

const CATEGORY_SWITCH: ChartType[] = ['column', 'bar', 'line', 'area', 'pie'];

function toArtifactType(
  t: ChartType,
  original: ChartArtifactType,
): Exclude<ChartArtifactType, 'scatter'> {
  if (t === 'line') return 'line';
  if (t === 'area') return 'area';
  if (t === 'column') return 'column';
  if (t === 'bar') return 'bar';
  if (t === 'pie') {
    return original === 'doughnut' ? 'doughnut' : 'pie';
  }
  // stacked_bar / heatmap / table / scatter fall back to vertical columns
  return 'column';
}

export function InteractivePlotView({
  chartType,
  chartData,
  scatterData,
  title,
  compatiblePlotTypes,
  initialChartType,
}: InteractivePlotViewProps) {
  const isScatter = chartType === 'scatter';

  const plotTypes = useMemo(() => {
    if (isScatter) return [] as ChartType[];
    const filtered =
      compatiblePlotTypes.length > 0
        ? compatiblePlotTypes.filter((t) => CATEGORY_SWITCH.includes(t))
        : [initialChartType].filter((t) => CATEGORY_SWITCH.includes(t));
    return filtered;
  }, [compatiblePlotTypes, initialChartType, isScatter]);

  const [selectedType, setSelectedType] = useState<ChartType>(() =>
    plotTypes.includes(initialChartType) ? initialChartType : (plotTypes[0] ?? 'column'),
  );

  const activeArtifactType = useMemo(
    () => toArtifactType(selectedType, chartType),
    [selectedType, chartType],
  );

  if (isScatter) {
    const data = scatterData;
    const subtitle = title
      ? title
      : data
        ? `${data.datasets.reduce((n, d) => n + d.points.length, 0)} points`
        : 'Scatter plot';

    return (
      <div className="interactive-plot">
        <div className="interactive-plot__header">
          <p className="interactive-plot__label">High-fidelity data plotting</p>
          <p className="interactive-plot__subtitle">{subtitle}</p>
        </div>
        <div className="interactive-plot__chart-wrap">
          {data ? <ArtifactScatterChart data={data} /> : null}
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <p className="text-sm text-[color:var(--text-muted)]">Unable to render plot for this data.</p>
    );
  }

  const isScalarKpi =
    chartData.labels.length === 1 &&
    chartData.datasets.length === 1 &&
    chartData.datasets[0].data.length === 1;

  const yLabel = chartData.datasets[0]?.label || 'value';
  const subtitle = isScalarKpi
    ? 'Single metric result'
    : title
      ? title
      : `${chartData.labels.length} categories · ${yLabel}`;

  if (isScalarKpi) {
    const label = chartData.labels[0] || yLabel;
    const value = String(chartData.datasets[0].data[0] ?? '');
    return (
      <div className="interactive-plot">
        <div className="interactive-plot__header">
          <p className="interactive-plot__label">Metric</p>
          <p className="interactive-plot__subtitle">{subtitle}</p>
        </div>
        <LabelWidgetCard label={label} value={value} />
      </div>
    );
  }

  return (
    <div className="interactive-plot">
      <div className="interactive-plot__header">
        <p className="interactive-plot__label">High-fidelity data plotting</p>
        <p className="interactive-plot__subtitle">{subtitle}</p>
      </div>

      {plotTypes.length > 1 ? (
        <div className="interactive-plot__chips" role="group" aria-label="Chart type">
          {plotTypes.map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                'interactive-plot__chip',
                selectedType === t && 'interactive-plot__chip--active',
              )}
              onClick={() => setSelectedType(t)}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      ) : null}

      <div className="interactive-plot__chart-wrap">
        <ArtifactChart type={activeArtifactType} data={chartData} />
      </div>
    </div>
  );
}

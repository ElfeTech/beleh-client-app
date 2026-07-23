import { useMemo, useState } from 'react';

import type { ChartArtifactType, ChartData } from '../../types/api';
import { chartDataToSeries } from '../../utils/artifactAdapters';
import type { ChartType } from '../../utils/chartCompatibility';
import { ArtifactChart } from './artifacts/ArtifactChart';
import { LabelWidgetCard } from './LabelWidgetCard';
import { cn } from '../../lib/utils';
import './InteractivePlotView.css';

interface InteractivePlotViewProps {
  chartType: ChartArtifactType;
  chartData: ChartData;
  title?: string;
  compatiblePlotTypes: ChartType[];
  initialChartType: ChartType;
}

function toArtifactType(t: ChartType): ChartArtifactType {
  if (t === 'line') return 'line';
  if (t === 'pie') return 'pie';
  return 'bar';
}

function HorizontalBarPlot({ chartData }: { chartData: ChartData }) {
  const { points } = chartDataToSeries(chartData);
  if (!points.length) {
    return (
      <p className="text-sm text-[color:var(--text-muted)]">Unable to render plot for this data.</p>
    );
  }

  const max = Math.max(...points.map((d) => Number(d.value) || 0), 1);
  const items = [...points].sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 12);

  return (
    <div className="interactive-plot__bars">
      {items.map((item) => (
        <div key={String(item.tooltipName)} className="interactive-plot__row">
          <span className="interactive-plot__row-label" title={String(item.tooltipName)}>
            {item.name}
          </span>
          <span className="interactive-plot__row-value">{item.tooltipValue}</span>
          <div className="interactive-plot__bar-track">
            <div
              className="interactive-plot__bar-fill"
              style={{ width: `${(Number(item.value) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InteractivePlotView({
  chartType,
  chartData,
  title,
  compatiblePlotTypes,
  initialChartType,
}: InteractivePlotViewProps) {
  const isScalarKpi =
    chartData.labels.length === 1 &&
    chartData.datasets.length === 1 &&
    chartData.datasets[0].data.length === 1;

  const plotTypes =
    compatiblePlotTypes.length > 0
      ? compatiblePlotTypes.filter((t) => t === 'bar' || t === 'line' || t === 'pie')
      : [initialChartType];

  const [selectedType, setSelectedType] = useState<ChartType>(
    plotTypes.includes(initialChartType) ? initialChartType : plotTypes[0],
  );

  const activeArtifactType = useMemo(() => {
    if (chartType === 'doughnut' && selectedType === 'pie') return 'doughnut' as const;
    return toArtifactType(selectedType);
  }, [chartType, selectedType]);

  const yLabel = chartData.datasets[0]?.label || 'value';
  const subtitle = isScalarKpi
    ? 'Single metric result'
    : title
      ? title
      : `${chartData.labels.length} categories · ${yLabel}`;

  const useHorizontalBars = selectedType === 'bar' && !isScalarKpi;

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

      {useHorizontalBars ? (
        <HorizontalBarPlot chartData={chartData} />
      ) : (
        <div className="interactive-plot__chart-wrap">
          <ArtifactChart type={activeArtifactType} data={chartData} />
        </div>
      )}
    </div>
  );
}

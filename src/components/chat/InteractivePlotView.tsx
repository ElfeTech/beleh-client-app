import { useMemo, useState } from 'react';
import type { ChatWorkflowResponse, VisualizationRecommendation } from '../../types/api';
import { chartTypeToBackendFormat, type ChartType } from '../../utils/chartCompatibility';
import { adaptVisualizationData } from '../../utils/visualizationAdapter';
import { ChartRenderer } from './charts/ChartRenderer';
import { LabelWidgetCard } from './LabelWidgetCard';
import { extractScalarCellData } from '../../utils/scalarCellData';
import { cn } from '../../lib/utils';
import './InteractivePlotView.css';

interface InteractivePlotViewProps {
  response: ChatWorkflowResponse;
  columns: string[];
  rows: Record<string, unknown>[];
  compatiblePlotTypes: ChartType[];
  initialChartType: ChartType;
}

function buildVisualizationForType(
  base: VisualizationRecommendation,
  chartType: ChartType,
): VisualizationRecommendation {
  const newType = chartTypeToBackendFormat(chartType) as VisualizationRecommendation['type'];
  return {
    ...base,
    type: newType,
    visualization_type: newType,
  };
}

function HorizontalBarPlot({
  visualization,
  rows,
}: {
  visualization: VisualizationRecommendation;
  rows: Record<string, unknown>[];
}) {
  const formatted = useMemo(() => {
    try {
      return adaptVisualizationData(visualization, rows as Record<string, any>[]);
    } catch {
      return null;
    }
  }, [visualization, rows]);

  if (!formatted) {
    return (
      <p className="text-sm text-[color:var(--text-muted)]">
        Unable to render plot for this encoding.
      </p>
    );
  }

  const max = Math.max(...formatted.chartData.map((d) => d.value), 1);
  const items = [...formatted.chartData].sort((a, b) => b.value - a.value).slice(0, 12);

  return (
    <div className="interactive-plot__bars">
      {items.map((item) => (
        <div key={String(item.rawName)} className="interactive-plot__row">
          <span className="interactive-plot__row-label" title={item.tooltipName}>
            {item.name}
          </span>
          <span className="interactive-plot__row-value">{item.displayValue}</span>
          <div className="interactive-plot__bar-track">
            <div
              className="interactive-plot__bar-fill"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InteractivePlotView({
  response,
  columns,
  rows,
  compatiblePlotTypes,
  initialChartType,
}: InteractivePlotViewProps) {
  const visualization = response.visualization!;
  const scalarCell = useMemo(
    () => extractScalarCellData(rows, columns, visualization),
    [rows, columns, visualization],
  );

  const plotTypes = compatiblePlotTypes.length > 0 ? compatiblePlotTypes : [initialChartType];
  const [chartType, setChartType] = useState<ChartType>(
    plotTypes.includes(initialChartType) ? initialChartType : plotTypes[0],
  );

  const modifiedViz = useMemo(
    () => buildVisualizationForType(visualization, chartType),
    [visualization, chartType],
  );

  const xField = visualization.encoding?.x?.field || visualization.dimensions?.x || 'category';
  const yField = visualization.encoding?.y?.field || visualization.dimensions?.y || 'value';
  const subtitle = scalarCell ? 'Single metric result' : `Auto-fitted to ${xField} vs ${yField}`;

  const useHorizontalBars = chartType === 'bar' && !scalarCell;

  if (scalarCell) {
    return (
      <div className="interactive-plot">
        <div className="interactive-plot__header">
          <p className="interactive-plot__label">Metric</p>
          <p className="interactive-plot__subtitle">{subtitle}</p>
        </div>
        <LabelWidgetCard label={scalarCell.label} value={scalarCell.value} />
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
                chartType === t && 'interactive-plot__chip--active',
              )}
              onClick={() => setChartType(t)}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      ) : null}

      {useHorizontalBars ? (
        <HorizontalBarPlot visualization={modifiedViz} rows={rows} />
      ) : (
        <div className="interactive-plot__chart-wrap">
          <ChartRenderer
            data={rows as Record<string, any>[]}
            visualization={modifiedViz}
            columns={columns}
          />
        </div>
      )}
    </div>
  );
}

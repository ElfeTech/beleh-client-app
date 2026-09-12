import { useMemo, useRef, useState } from 'react';
import { Download, Maximize2 } from 'lucide-react';

import type {
  ChartArtifactType,
  ChartData,
  HeatmapData,
  MapData,
  ScatterData,
} from '../../types/api';
import type { ChartType } from '../../utils/chartCompatibility';
import { downloadElementAsPng } from '../../utils/downloadChartPng';
import { ArtifactChart } from './artifacts/ArtifactChart';
import { ArtifactHeatmap } from './artifacts/ArtifactHeatmap';
import { ArtifactMapChart } from './artifacts/ArtifactMapChart';
import { ArtifactScatterChart } from './artifacts/ArtifactScatterChart';
import { ExpandedChartModal } from './charts/ExpandedChartModal';
import { LabelWidgetCard } from './LabelWidgetCard';
import { cn } from '../../lib/utils';
import './InteractivePlotView.css';

interface InteractivePlotViewProps {
  chartType: ChartArtifactType;
  chartData?: ChartData | null;
  scatterData?: ScatterData | null;
  heatmapData?: HeatmapData | null;
  mapData?: MapData | null;
  title?: string;
  compatiblePlotTypes: ChartType[];
  initialChartType: ChartType;
}

const CATEGORY_SWITCH: ChartType[] = ['column', 'bar', 'line', 'area', 'pie'];

function toArtifactType(
  t: ChartType,
  original: ChartArtifactType,
): Exclude<ChartArtifactType, 'scatter' | 'heatmap' | 'map'> {
  if (t === 'line') return 'line';
  if (t === 'area') return 'area';
  if (t === 'column') return 'column';
  if (t === 'bar') return 'bar';
  if (t === 'pie') {
    return original === 'doughnut' ? 'doughnut' : 'pie';
  }
  // stacked_bar / heatmap / map / table / scatter fall back to vertical columns
  return 'column';
}

export function InteractivePlotView({
  chartType,
  chartData,
  scatterData,
  heatmapData,
  mapData,
  title,
  compatiblePlotTypes,
  initialChartType,
}: InteractivePlotViewProps) {
  const isScatter = chartType === 'scatter';
  const isHeatmap = chartType === 'heatmap';
  const isMap = chartType === 'map';
  const isFixedShape = isScatter || isHeatmap || isMap;
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleDownloadPng = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadElementAsPng(chartWrapRef.current, title || 'chart');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadButton = (
    <button
      type="button"
      className="interactive-plot__download"
      onClick={() => void handleDownloadPng()}
      disabled={isExporting}
      title="Download as PNG"
      aria-label="Download chart as PNG"
      aria-busy={isExporting}
    >
      <Download size={14} strokeWidth={2} aria-hidden />
      {isExporting ? 'Saving…' : 'PNG'}
    </button>
  );

  const maximizeButton = (
    <button
      type="button"
      className="interactive-plot__maximize"
      onClick={() => setIsMaximized(true)}
      title="Maximize chart"
      aria-label="Maximize chart"
    >
      <Maximize2 size={14} strokeWidth={2} aria-hidden />
    </button>
  );

  /** Scatter/heatmap/map render themselves and can't switch shape; pair each with its caption. */
  const fixedShape = useMemo(() => {
    if (isScatter && scatterData) {
      return {
        render: (isExpanded: boolean) => (
          <ArtifactScatterChart data={scatterData} isExpanded={isExpanded} />
        ),
        subtitle: `${scatterData.datasets.reduce((n, d) => n + d.points.length, 0)} points`,
      };
    }
    if (isHeatmap && heatmapData) {
      return {
        render: (isExpanded: boolean) => (
          <ArtifactHeatmap data={heatmapData} isExpanded={isExpanded} />
        ),
        subtitle: `${heatmapData.y_labels.length} × ${heatmapData.x_labels.length} matrix`,
      };
    }
    if (isMap && mapData) {
      return {
        render: (isExpanded: boolean) => <ArtifactMapChart data={mapData} isExpanded={isExpanded} />,
        subtitle: `${mapData.regions.length} regions`,
      };
    }
    return null;
  }, [isScatter, scatterData, isHeatmap, heatmapData, isMap, mapData]);

  const plotTypes = useMemo(() => {
    if (isFixedShape) return [] as ChartType[];
    const filtered =
      compatiblePlotTypes.length > 0
        ? compatiblePlotTypes.filter((t) => CATEGORY_SWITCH.includes(t))
        : [initialChartType].filter((t) => CATEGORY_SWITCH.includes(t));
    return filtered;
  }, [compatiblePlotTypes, initialChartType, isFixedShape]);

  const [selectedType, setSelectedType] = useState<ChartType>(() =>
    plotTypes.includes(initialChartType) ? initialChartType : (plotTypes[0] ?? 'column'),
  );

  const activeArtifactType = useMemo(
    () => toArtifactType(selectedType, chartType),
    [selectedType, chartType],
  );

  if (isFixedShape) {
    const subtitle = title || fixedShape?.subtitle || 'Plot';
    const content = fixedShape ? fixedShape.render(false) : null;

    return (
      <div className="interactive-plot">
        <div className="interactive-plot__header">
          <div className="interactive-plot__header-text">
            <p className="interactive-plot__label">High-fidelity data plotting</p>
            <p className="interactive-plot__subtitle">{subtitle}</p>
          </div>
          {content ? (
            <div className="interactive-plot__header-actions">
              {maximizeButton}
              {downloadButton}
            </div>
          ) : null}
        </div>
        <div ref={chartWrapRef} className="interactive-plot__chart-wrap">
          {content}
        </div>

        {isMaximized && fixedShape && (
          <ExpandedChartModal title={subtitle} onClose={() => setIsMaximized(false)}>
            {fixedShape.render(true)}
          </ExpandedChartModal>
        )}
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
        <div className="interactive-plot__header-text">
          <p className="interactive-plot__label">High-fidelity data plotting</p>
          <p className="interactive-plot__subtitle">{subtitle}</p>
        </div>
        <div className="interactive-plot__header-actions">
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
          {maximizeButton}
          {downloadButton}
        </div>
      </div>

      <div ref={chartWrapRef} className="interactive-plot__chart-wrap">
        <ArtifactChart type={activeArtifactType} data={chartData} />
      </div>

      {isMaximized && (
        <ExpandedChartModal title={subtitle} onClose={() => setIsMaximized(false)}>
          <ArtifactChart type={activeArtifactType} data={chartData} isExpanded />
        </ExpandedChartModal>
      )}
    </div>
  );
}

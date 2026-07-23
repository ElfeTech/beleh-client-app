import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  getResponseViewAvailability,
  type ResponseViewId,
} from '../../utils/responseViewAvailability';
import type { UiArtifact } from '../../types/api';
import { TableSchemaView } from './TableSchemaView';
import { InteractivePlotView } from './InteractivePlotView';
import './ResponseViewTabs.css';

const TAB_CONFIG: Record<ResponseViewId, { label: string; icon: typeof LayoutGrid }> = {
  table: { label: 'Table schema matrix', icon: LayoutGrid },
  plot: { label: 'Interactive plot', icon: BarChart3 },
};

interface ResponseViewTabsProps {
  artifacts: UiArtifact[];
  filterValue?: string | null;
}

export function ResponseViewTabs({ artifacts, filterValue }: ResponseViewTabsProps) {
  const availability = useMemo(() => getResponseViewAvailability(artifacts), [artifacts]);
  const { availableViews, defaultView } = availability;

  const [activeView, setActiveView] = useState<ResponseViewId>(
    defaultView ?? availableViews[0] ?? 'table',
  );

  useEffect(() => {
    if (defaultView) setActiveView(defaultView);
  }, [defaultView, artifacts]);

  const resolvedView = availableViews.includes(activeView)
    ? activeView
    : (defaultView ?? availableViews[0]);

  const filteredRows = useMemo(() => {
    const rows = availability.tableRows;
    const columns = availability.tableColumns;
    if (!filterValue) return rows;
    const q = filterValue.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) =>
        String(row[col] ?? '')
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [availability.tableRows, availability.tableColumns, filterValue]);

  if (availableViews.length === 0) {
    return null;
  }

  const panel = (() => {
    switch (resolvedView) {
      case 'table':
        return <TableSchemaView columns={availability.tableColumns} rows={filteredRows} />;
      case 'plot':
        return availability.chartData && availability.chartType ? (
          <InteractivePlotView
            chartType={availability.chartType}
            chartData={availability.chartData}
            title={availability.chartTitle}
            compatiblePlotTypes={availability.compatiblePlotTypes}
            initialChartType={availability.originalChartType}
          />
        ) : null;
      default:
        return null;
    }
  })();

  if (availableViews.length === 1) {
    return <div className="response-view-tabs__panel">{panel}</div>;
  }

  return (
    <div className="response-view-tabs">
      <div className="response-view-tabs__strip" role="tablist">
        {availableViews.map((viewId) => {
          const { label, icon: Icon } = TAB_CONFIG[viewId];
          const isActive = resolvedView === viewId;
          return (
            <button
              key={viewId}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn(
                'response-view-tabs__tab',
                isActive && 'response-view-tabs__tab--active',
              )}
              onClick={() => setActiveView(viewId)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </div>
      <div className="response-view-tabs__panel" role="tabpanel">
        {panel}
      </div>
    </div>
  );
}

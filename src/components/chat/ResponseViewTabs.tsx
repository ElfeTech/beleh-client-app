import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, BarChart3, Terminal } from 'lucide-react';
import type { ChatWorkflowResponse } from '../../types/api';
import { cn } from '../../lib/utils';
import {
  getCompiledSql,
  getResponseViewAvailability,
  type ResponseViewId,
} from '../../utils/responseViewAvailability';
import { TableSchemaView } from './TableSchemaView';
import { InteractivePlotView } from './InteractivePlotView';
import { SqlInspectorPanel } from './SqlInspectorPanel';
import './ResponseViewTabs.css';

const TAB_CONFIG: Record<ResponseViewId, { label: string; icon: typeof LayoutGrid }> = {
  table: { label: 'Table schema matrix', icon: LayoutGrid },
  plot: { label: 'Interactive plot', icon: BarChart3 },
  sql: { label: 'Compiled SQL', icon: Terminal },
};

interface ResponseViewTabsProps {
  response: ChatWorkflowResponse;
  schemaTarget?: string | null;
}

export function ResponseViewTabs({ response, schemaTarget }: ResponseViewTabsProps) {
  const availability = useMemo(() => getResponseViewAvailability(response), [response]);
  const { availableViews, defaultView } = availability;

  const [activeView, setActiveView] = useState<ResponseViewId>(
    defaultView ?? availableViews[0] ?? 'table',
  );

  useEffect(() => {
    if (defaultView) setActiveView(defaultView);
  }, [defaultView, response.message_id, response.session_id]);

  const resolvedView = availableViews.includes(activeView)
    ? activeView
    : (defaultView ?? availableViews[0]);

  const execution = response.execution;
  const rows = (execution?.rows ?? []) as Record<string, unknown>[];
  const columns =
    execution?.columns?.map((c) => c.name) ?? (rows.length > 0 ? Object.keys(rows[0]) : []);
  const sql = getCompiledSql(response);

  if (availableViews.length === 0) {
    return null;
  }

  const panel = (() => {
    switch (resolvedView) {
      case 'table':
        return <TableSchemaView columns={columns} rows={rows} />;
      case 'plot':
        return response.visualization ? (
          <InteractivePlotView
            response={response}
            columns={columns}
            rows={rows}
            compatiblePlotTypes={availability.compatiblePlotTypes}
            initialChartType={availability.originalChartType}
          />
        ) : null;
      case 'sql':
        return sql ? <SqlInspectorPanel sql={sql} schemaTarget={schemaTarget} /> : null;
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

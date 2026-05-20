import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Database, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ConnectorResponse, DataSourceResponse } from '../../types/api';
import { getWorkspaceSourceContext } from '../../utils/datasourceDisplay';
import './ChatWorkspaceHeader.css';

const STORAGE_KEY_PREFIX = 'beleh-chat-header-collapsed:';

interface ChatWorkspaceHeaderProps {
  workspaceId: string;
  selectedDatasourceId: string | null;
  datasources: DataSourceResponse[];
  connectors?: ConnectorResponse[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ChatWorkspaceHeader({
  workspaceId,
  selectedDatasourceId,
  datasources,
  connectors = [],
  onRefresh,
  refreshing = false,
}: ChatWorkspaceHeaderProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${workspaceId}`;

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed, storageKey]);

  const source = getWorkspaceSourceContext(selectedDatasourceId, datasources, connectors);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  if (collapsed) {
    return (
      <header className="chat-workspace-header chat-workspace-header--collapsed">
        <div className="chat-workspace-header__collapsed-inner">
          <div className="chat-workspace-header__collapse-summary">
            <span
              className={cn(
                'chat-workspace-header__status-dot',
                `chat-workspace-header__status-dot--${source.statusTone}`
              )}
            />
            <span className="truncate">{source.displayName}</span>
            <span className="text-[color:var(--text-muted)] font-mono text-[10px]">
              {source.statusLabel.split('//')[0]?.trim()}
            </span>
          </div>
          <button
            type="button"
            className="chat-workspace-header__icon-btn"
            onClick={toggleCollapsed}
            aria-expanded={false}
            aria-label="Expand workspace context"
            title="Show context"
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="chat-workspace-header">
      <div className="chat-workspace-header__inner">
        <div className="chat-workspace-header__source">
          <div className="chat-workspace-header__icon-wrap">
            <Database className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="chat-workspace-header__meta">
            <div className="chat-workspace-header__pills">
              <span className="chat-workspace-header__pill">{source.displayName}</span>
              <span className="chat-workspace-header__pill chat-workspace-header__pill--muted">
                {source.typeLabel}
              </span>
            </div>
            <p className="chat-workspace-header__path" title={source.connectionPath}>
              {source.connectionPath}
            </p>
          </div>
        </div>

        <div className="chat-workspace-header__cluster">
          <span className="chat-workspace-header__cluster-label">Cluster status</span>
          <div className="chat-workspace-header__cluster-row">
            <span
              className={cn(
                'chat-workspace-header__status',
                `chat-workspace-header__status--${source.statusTone}`
              )}
            >
              {source.statusLabel}
            </span>
            {onRefresh ? (
              <button
                type="button"
                className="chat-workspace-header__icon-btn"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh source status"
                title="Refresh"
              >
                <RefreshCw
                  className={cn('h-4 w-4', refreshing && 'animate-spin')}
                  strokeWidth={2}
                />
              </button>
            ) : null}
            <button
              type="button"
              className="chat-workspace-header__icon-btn"
              onClick={toggleCollapsed}
              aria-expanded
              aria-label="Collapse workspace context"
              title="Collapse"
            >
              <ChevronUp className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { CommonMenu } from './CommonMenu';
import { WorkspaceMenu } from './WorkspaceMenu';
import { DatasourceModal } from './DatasourceModal';
import { WorkspaceRegionDropdown } from './WorkspaceRegionDropdown';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/useAuth';
import { useDatasource } from '../../context/DatasourceContext';
import { ensureDemoRemovedAfterLiveSource, findDemoDatasource } from '../../lib/workspaceDemo';
import {
  isDatasourcesAtLimit,
  PLAN_LIMIT_REACHED_TOOLTIP,
  PLAN_MANAGED_BY_OWNER_COPY,
  canShowWorkspaceUpgradeCta,
  workspaceLimitUpgradeMessage,
  BILLING_UPGRADE_HREF,
} from '../../utils/workspaceAccess';

interface SideMenuProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SideMenu({ isCollapsed = false, onToggleCollapse }: SideMenuProps) {
  const location = useLocation();
  const workspaceContext = useWorkspace();
  const { user } = useAuth();
  const { selectedDatasourceId, setSelectedDatasourceId } = useDatasource();
  const isWorkspacePage = location.pathname.startsWith('/workspace/');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const workspaces = workspaceContext.workspaces;
  const currentWorkspace = workspaceContext.currentWorkspace;
  const dataSources = workspaceContext.datasources;
  const isLoadingWorkspaces = workspaceContext.loading && workspaces.length === 0;
  const isLoadingDataSources = workspaceContext.loading;
  const datasourcesAtLimit = isDatasourcesAtLimit(workspaceContext.workspaceUsage);
  const canUpgrade = canShowWorkspaceUpgradeCta(workspaceContext.currentRole);

  const handleUploadSuccess = async () => {
    const wid = currentWorkspace?.id;
    const demoId = findDemoDatasource(dataSources)?.id ?? null;
    const hadDemo = Boolean(demoId) || dataSources.some((d) => Boolean(d.is_demo));
    await workspaceContext.refreshDatasources();
    if (hadDemo && user && wid) {
      try {
        const token = await user.getIdToken();
        await ensureDemoRemovedAfterLiveSource(token, wid, dataSources);
        await workspaceContext.refreshDatasources();
        if (demoId && selectedDatasourceId === demoId) {
          setSelectedDatasourceId(null);
        }
      } catch {
        /* best-effort leave demo */
      }
    }
    await workspaceContext.refreshWorkspaceUsage();
  };

  const handleAddClick = () => {
    if (datasourcesAtLimit) {
      if (canUpgrade) return;
      toast.error(workspaceLimitUpgradeMessage(workspaceContext.currentRole, 'datasources'));
      return;
    }
    setIsUploadModalOpen(true);
  };

  if (isLoadingWorkspaces && !currentWorkspace) {
    return (
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="workspace-selector loading">
            <div className="skeleton h-8 w-full"></div>
          </div>
        </div>
        <CommonMenu />
      </aside>
    );
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="sidebar-header">
        {!isCollapsed && workspaces.length > 0 ? <WorkspaceRegionDropdown /> : null}
      </div>

      <div className="sidebar-content">
        {isWorkspacePage &&
          (isLoadingDataSources && dataSources.length === 0 ? (
            <div className="sidebar-section">
              <div className="sidebar-section-title">
                <div className="skeleton h-4 w-20"></div>
              </div>
              <div className="skeleton h-8 w-full mb-2"></div>
              <div className="skeleton h-8 w-full"></div>
            </div>
          ) : (
            <WorkspaceMenu
              dataSources={dataSources}
              onAddClick={handleAddClick}
              onRefresh={async () => {
                await workspaceContext.refreshDatasources();
                await workspaceContext.refreshWorkspaceUsage();
              }}
              addAtLimit={datasourcesAtLimit}
              canUpgrade={canUpgrade}
              upgradeHref={BILLING_UPGRADE_HREF}
              addDisabledReason={
                datasourcesAtLimit
                  ? canUpgrade
                    ? PLAN_LIMIT_REACHED_TOOLTIP
                    : PLAN_MANAGED_BY_OWNER_COPY
                  : undefined
              }
            />
          ))}
      </div>

      <CommonMenu />

      {isUploadModalOpen && currentWorkspace && (
        <DatasourceModal
          mode="add"
          workspaceId={currentWorkspace.id}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </aside>
  );
}

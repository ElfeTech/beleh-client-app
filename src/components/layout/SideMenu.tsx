import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CommonMenu } from './CommonMenu';
import { WorkspaceMenu } from './WorkspaceMenu';
import { DatasourceModal } from './DatasourceModal';
import { WorkspaceRegionDropdown } from './WorkspaceRegionDropdown';
import { useWorkspace } from '../../context/WorkspaceContext';

interface SideMenuProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SideMenu({ isCollapsed = false, onToggleCollapse }: SideMenuProps) {
  const location = useLocation();
  const workspaceContext = useWorkspace();
  const isWorkspacePage = location.pathname.startsWith('/workspace/');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Use data from WorkspaceContext
  const workspaces = workspaceContext.workspaces;
  const currentWorkspace = workspaceContext.currentWorkspace;
  const dataSources = workspaceContext.datasources;
  const isLoadingWorkspaces = workspaceContext.loading && workspaces.length === 0;
  const isLoadingDataSources = workspaceContext.loading;

  const handleUploadSuccess = async () => {
    // Refresh datasources from WorkspaceContext
    await workspaceContext.refreshDatasources();
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
      {/* Collapse Toggle Button */}
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
              onAddClick={() => setIsUploadModalOpen(true)}
              onRefresh={() => workspaceContext.refreshDatasources()}
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

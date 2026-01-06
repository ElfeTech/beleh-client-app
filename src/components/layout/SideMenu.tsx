import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CommonMenu } from './CommonMenu';
import { WorkspaceMenu } from './WorkspaceMenu';
import { DatasourceModal } from './DatasourceModal';
import { WorkspaceModal } from './WorkspaceModal';
import { useWorkspace } from '../../context/WorkspaceContext';

interface SideMenuProps {
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function SideMenu({ isCollapsed = false, onToggleCollapse }: SideMenuProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const workspaceContext = useWorkspace();
    const isWorkspacePage = location.pathname.startsWith('/workspace/');

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

    // Close dropdown when sidebar collapses
    useEffect(() => {
        if (isCollapsed) {
            setIsDropdownOpen(false);
        }
    }, [isCollapsed]);

    // Use data from WorkspaceContext
    const workspaces = workspaceContext.workspaces;
    const currentWorkspace = workspaceContext.currentWorkspace;
    const dataSources = workspaceContext.datasources;
    const isLoadingWorkspaces = workspaceContext.loading && workspaces.length === 0;
    const isLoadingDataSources = workspaceContext.loading;

    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

    const handleWorkspaceSelect = (workspace: typeof workspaces[0]) => {
        workspaceContext.setCurrentWorkspace(workspace);
        setIsDropdownOpen(false);
        navigate(`/workspace/${workspace.id}`);
    };

    const handleUploadSuccess = async () => {
        // Refresh datasources from WorkspaceContext
        await workspaceContext.refreshDatasources();
    };

    const handleWorkspaceSuccess = async () => {
        // Refresh workspaces after creating a new one
        await workspaceContext.refreshWorkspaces();

        // Navigate to the newly created workspace (it will be the last one)
        const newWorkspace = workspaceContext.workspaces.at(-1);
        if (newWorkspace) {
            workspaceContext.setCurrentWorkspace(newWorkspace);
            navigate(`/workspace/${newWorkspace.id}`);
        }
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
                <div className={`workspace-selector ${isDropdownOpen ? 'open' : ''}`}>
                    <button className="workspace-trigger" onClick={toggleDropdown} disabled={workspaces.length === 0}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H5V7h7v10z" />
                        </svg>
                        <h1>{currentWorkspace?.name || 'My Workspace'}</h1>
                        <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>

                    {isDropdownOpen && (
                        <div className="workspace-dropdown">
                            <div className="workspace-options">
                                {workspaces.map((workspace) => (
                                    <button
                                        key={workspace.id}
                                        className={`workspace-option ${currentWorkspace?.id === workspace.id ? 'active' : ''}`}
                                        onClick={() => handleWorkspaceSelect(workspace)}
                                    >
                                        {workspace.name}
                                        {workspace.is_default && <span className="default-badge">Default</span>}
                                    </button>
                                ))}
                            </div>
                            <button
                                className="add-workspace-btn"
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    setIsWorkspaceModalOpen(true);
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add New Workspace
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="sidebar-content">
                {isWorkspacePage && (
                    isLoadingDataSources && dataSources.length === 0 ? (
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
                    )
                )}
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

            {isWorkspaceModalOpen && (
                <WorkspaceModal
                    onClose={() => setIsWorkspaceModalOpen(false)}
                    onSuccess={handleWorkspaceSuccess}
                />
            )}
        </aside>
    );
}

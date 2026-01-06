import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/useAuth';
import { apiClient } from '../services/apiClient';
import { ContextMenu, type ContextMenuItem } from '../components/common/ContextMenu';
import { ActionSheet, type ActionSheetItem } from '../components/common/ActionSheet';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { WorkspaceModal } from '../components/layout/WorkspaceModal';
import type { WorkspaceResponse } from '../types/api';
import './WorkspacesPage.css';

export function WorkspacesPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { workspaces, currentWorkspace, setCurrentWorkspace, refreshWorkspaces, loading } = useWorkspace();

    const [searchQuery, setSearchQuery] = useState('');
    const [contextMenuAnchor, setContextMenuAnchor] = useState<HTMLElement | null>(null);
    const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceResponse | null>(null);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const filteredWorkspaces = workspaces.filter((workspace) =>
        workspace.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleMoreClick = (e: React.MouseEvent, workspace: WorkspaceResponse) => {
        e.stopPropagation();
        setSelectedWorkspace(workspace);

        if (isMobile) {
            setShowActionSheet(true);
        } else {
            setContextMenuAnchor(e.currentTarget as HTMLElement);
        }
    };

    const handleEdit = () => {
        if (selectedWorkspace) {
            setEditName(selectedWorkspace.name);
            setShowEditModal(true);
        }
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedWorkspace || !user) return;

        try {
            setIsDeleting(true);
            const token = await user.getIdToken();
            await apiClient.deleteWorkspace(token, selectedWorkspace.id);

            await refreshWorkspaces();

            if (currentWorkspace?.id === selectedWorkspace.id) {
                const remainingWorkspaces = workspaces.filter((w) => w.id !== selectedWorkspace.id);
                if (remainingWorkspaces.length > 0) {
                    setCurrentWorkspace(remainingWorkspaces[0]);
                    navigate(`/workspace/${remainingWorkspaces[0].id}`);
                }
            }

            setShowDeleteConfirm(false);
            setSelectedWorkspace(null);
            toast.success('Workspace deleted successfully');
        } catch (err) {
            console.error('Failed to delete workspace:', err);
            toast.error('Failed to delete workspace. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleConfirmEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorkspace || !user || !editName.trim()) return;

        try {
            setIsEditing(true);
            const token = await user.getIdToken();
            await apiClient.updateWorkspace(token, selectedWorkspace.id, editName.trim());

            await refreshWorkspaces();

            setShowEditModal(false);
            setSelectedWorkspace(null);
            setEditName('');
        } catch (err) {
            console.error('Failed to update workspace:', err);
        } finally {
            setIsEditing(false);
        }
    };

    const handleWorkspaceClick = (workspace: WorkspaceResponse) => {
        setCurrentWorkspace(workspace);
        localStorage.setItem('activeWorkspaceId', workspace.id);
        navigate(`/workspace/${workspace.id}`);
    };

    const handleCreateSuccess = async () => {
        await refreshWorkspaces();
        setShowCreateModal(false);
    };

    const getMenuItems = (): ContextMenuItem[] | ActionSheetItem[] => [
        {
            id: 'edit',
            label: 'Edit Workspace',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            variant: 'default' as const,
            onClick: handleEdit,
            disabled: selectedWorkspace?.is_default,
        },
        {
            id: 'delete',
            label: 'Delete Workspace',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            ),
            variant: 'danger' as const,
            onClick: handleDelete,
            disabled: selectedWorkspace?.is_default,
        },
    ];

    return (
        <div className="workspaces-page">
            {/* Header Section */}
            <div className="workspaces-header">
                <div className="header-content">
                    <div className="header-text">
                        <h1>Workspaces</h1>
                        <p>Organize your data and analytics into separate workspaces</p>
                    </div>
                    <button className="create-workspace-button" onClick={() => setShowCreateModal(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Create Workspace
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="workspaces-search">
                <div className="search-input-wrapper">
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search workspaces..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button className="search-clear" onClick={() => setSearchQuery('')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Workspaces Grid */}
            {loading && workspaces.length === 0 ? (
                <div className="workspaces-loading">
                    <div className="spinner"></div>
                    <p>Loading workspaces...</p>
                </div>
            ) : filteredWorkspaces.length === 0 ? (
                <div className="workspaces-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <h3>No workspaces found</h3>
                    <p>{searchQuery ? 'Try a different search term' : 'Create your first workspace to get started'}</p>
                    {!searchQuery && (
                        <button className="empty-create-btn" onClick={() => setShowCreateModal(true)}>
                            Create Workspace
                        </button>
                    )}
                </div>
            ) : (
                <div className="workspaces-grid">
                    {filteredWorkspaces.map((workspace) => (
                        <div
                            key={workspace.id}
                            className={`workspace-card ${currentWorkspace?.id === workspace.id ? 'active' : ''}`}
                        >
                            <div className="workspace-card-content" onClick={() => handleWorkspaceClick(workspace)}>
                                <div className="workspace-card-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="workspace-card-info">
                                    <h3 className="workspace-card-name">{workspace.name}</h3>
                                    {workspace.is_default && (
                                        <span className="workspace-default-badge">Default</span>
                                    )}
                                </div>
                                {currentWorkspace?.id === workspace.id && (
                                    <div className="workspace-active-indicator">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Active</span>
                                    </div>
                                )}
                            </div>
                            {!workspace.is_default && (
                                <button
                                    className="workspace-card-more"
                                    onClick={(e) => handleMoreClick(e, workspace)}
                                    aria-label="More options"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="12" cy="5" r="1" />
                                        <circle cx="12" cy="19" r="1" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Desktop Context Menu */}
            <ContextMenu
                isOpen={!!contextMenuAnchor && !isMobile}
                anchorEl={contextMenuAnchor}
                items={getMenuItems() as ContextMenuItem[]}
                onClose={() => setContextMenuAnchor(null)}
            />

            {/* Mobile Action Sheet */}
            <ActionSheet
                isOpen={showActionSheet && isMobile}
                title="Workspace Options"
                items={getMenuItems() as ActionSheetItem[]}
                onClose={() => setShowActionSheet(false)}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Workspace?"
                message={`This action cannot be undone. All data associated with "${selectedWorkspace?.name}" will be permanently deleted.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            {/* Edit Workspace Modal */}
            {showEditModal && (
                <div className="modal-backdrop" onClick={() => setShowEditModal(false)} style={{ zIndex: 10001 }}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Workspace</h2>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleConfirmEdit} className="modal-form">
                            <div className="form-group">
                                <label htmlFor="edit-workspace-name">Workspace Name</label>
                                <input
                                    id="edit-workspace-name"
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter workspace name"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => setShowEditModal(false)}
                                    disabled={isEditing}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="primary-btn" disabled={!editName.trim() || isEditing}>
                                    {isEditing ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Workspace Modal */}
            {showCreateModal && (
                <WorkspaceModal onClose={() => setShowCreateModal(false)} onSuccess={handleCreateSuccess} />
            )}
        </div>
    );
}

import React, { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceContext } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu';
import { ActionSheet, type ActionSheetItem } from '../common/ActionSheet';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './WorkspaceSwitcher.css';

interface WorkspaceSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWorkspace?: () => void;
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ isOpen, onClose, onCreateWorkspace }) => {
  const navigate = useNavigate();
  const context = useContext(WorkspaceContext);
  const { user } = useAuth();

  const [contextMenuAnchor, setContextMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedWorkspaceForMenu, setSelectedWorkspaceForMenu] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const menuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!context) {
    return null;
  }

  const { workspaces, currentWorkspace, setCurrentWorkspace, refreshWorkspaces } = context;

  const handleWorkspaceSelect = (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      // Persist selection
      localStorage.setItem('activeWorkspaceId', workspaceId);
      // Navigate to workspace
      navigate(`/workspace/${workspaceId}`);
      onClose();
    }
  };

  const handleCreateWorkspace = () => {
    // Close the workspace switcher first to clear the UI
    onClose();
    // Trigger the create workspace callback
    if (onCreateWorkspace) {
      // Delay slightly to ensure smooth transition
      setTimeout(() => {
        onCreateWorkspace();
      }, 150);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleMoreClick = (e: React.MouseEvent, workspaceId: string) => {
    e.stopPropagation();
    setSelectedWorkspaceForMenu(workspaceId);

    if (isMobile) {
      setShowActionSheet(true);
    } else {
      setContextMenuAnchor(e.currentTarget as HTMLElement);
    }
  };

  const handleEdit = () => {
    const workspace = workspaces.find((w) => w.id === selectedWorkspaceForMenu);
    if (workspace) {
      setEditName(workspace.name);
      setShowEditModal(true);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedWorkspaceForMenu || !user) return;

    try {
      setIsDeleting(true);
      const token = await user.getIdToken();
      await apiClient.deleteWorkspace(token, selectedWorkspaceForMenu);

      await refreshWorkspaces();

      if (currentWorkspace?.id === selectedWorkspaceForMenu) {
        const remainingWorkspaces = workspaces.filter((w) => w.id !== selectedWorkspaceForMenu);
        if (remainingWorkspaces.length > 0) {
          setCurrentWorkspace(remainingWorkspaces[0]);
          navigate(`/workspace/${remainingWorkspaces[0].id}`);
        }
      }

      setShowDeleteConfirm(false);
      setSelectedWorkspaceForMenu(null);
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceForMenu || !user || !editName.trim()) return;

    try {
      setIsEditing(true);
      const token = await user.getIdToken();
      await apiClient.updateWorkspace(token, selectedWorkspaceForMenu, editName.trim());

      await refreshWorkspaces();

      setShowEditModal(false);
      setSelectedWorkspaceForMenu(null);
      setEditName('');
    } catch (err) {
      console.error('Failed to update workspace:', err);
    } finally {
      setIsEditing(false);
    }
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
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-backdrop" onClick={handleBackdropClick}>
      <div className="bottom-sheet-container">
        <div className="bottom-sheet-header">
          <div className="bottom-sheet-handle" />
          <h2>Switch Workspace</h2>
          <button className="bottom-sheet-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bottom-sheet-content">
          <div className="workspace-list">
            {/* Create New Workspace Button */}
            <button
              className="workspace-list-item create-workspace-btn"
              onClick={handleCreateWorkspace}
            >
              <div className="workspace-icon create-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="workspace-info">
                <span className="workspace-name">Create New Workspace</span>
              </div>
            </button>

            {/* Divider */}
            <div className="workspace-list-divider" />

            {/* Existing Workspaces */}
            {workspaces.map((workspace) => (
              <div key={workspace.id} className="workspace-list-item-wrapper">
                <button
                  className={`workspace-list-item ${currentWorkspace?.id === workspace.id ? 'active' : ''}`}
                  onClick={() => handleWorkspaceSelect(workspace.id)}
                >
                  <div className="workspace-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="workspace-info">
                    <span className="workspace-name">{workspace.name}</span>
                    {workspace.is_default && <span className="default-badge">Default</span>}
                  </div>
                  {currentWorkspace?.id === workspace.id && (
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                {!workspace.is_default && (
                  <button
                    ref={(el) => (menuButtonRefs.current[workspace.id] = el)}
                    className="workspace-more-btn"
                    onClick={(e) => handleMoreClick(e, workspace.id)}
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
        </div>
      </div>

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
        message="This action cannot be undone. All data associated with this workspace will be permanently deleted."
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
    </div>
  );
};

export default WorkspaceSwitcher;

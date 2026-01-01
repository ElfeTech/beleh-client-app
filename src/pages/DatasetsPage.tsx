import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { DatasourceContext } from '../context/DatasourceContext';
import { useAuth } from '../context/useAuth';
import { apiClient } from '../services/apiClient';
import { UploadModal } from '../components/layout/UploadModal';
import MobileChatHeader from '../components/layout/MobileChatHeader';
import WorkspaceSwitcher from '../components/layout/WorkspaceSwitcher';
import { WorkspaceModal } from '../components/layout/WorkspaceModal';
import { DatasourceModal } from '../components/layout/DatasourceModal';
import { ActionSheet, type ActionSheetItem } from '../components/common/ActionSheet';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import './DatasetsPage.css';

const DatasetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const workspaceContext = useContext(WorkspaceContext);
  const datasourceContext = useContext(DatasourceContext);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Mobile menu state
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedDatasetForMenu, setSelectedDatasetForMenu] = useState<string | null>(null);
  const [datasetToEdit, setDatasetToEdit] = useState<string | null>(null);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const datasources = workspaceContext?.datasources || [];
  const loading = workspaceContext?.loading || false;
  const setSelectedDatasourceId = datasourceContext?.setSelectedDatasourceId || (() => {});

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'status-ready';
      case 'PROCESSING':
        return 'status-processing';
      case 'FAILED':
        return 'status-failed';
      default:
        return 'status-pending';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('csv')) return 'CSV';
    if (type.includes('excel') || type.includes('xlsx')) return 'XLS';
    if (type.includes('json')) return 'JSON';
    return 'FILE';
  };

  const handleDatasetSelect = async (datasetId: string) => {
    // Set as active dataset
    setSelectedDatasourceId(datasetId);
    localStorage.setItem('selectedDatasourceId', datasetId);

    // Navigate back to chat (session will be created in Workspace component)
    navigate(`/workspace/${workspaceId}`);
  };

  // Mobile menu handlers
  const handleMoreClick = (e: React.MouseEvent, datasetId: string) => {
    e.stopPropagation();
    setSelectedDatasetForMenu(datasetId);
    setShowActionSheet(true);
  };

  const handleEdit = () => {
    // Store the dataset ID before ActionSheet closes and clears selectedDatasetForMenu
    setDatasetToEdit(selectedDatasetForMenu);
    setShowEditModal(true);
  };

  const handleDelete = () => {
    // Store the dataset ID before ActionSheet closes and clears selectedDatasetForMenu
    setDatasetToDelete(selectedDatasetForMenu);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!datasetToDelete || !user) return;

    try {
      setIsDeleting(true);
      const token = await user.getIdToken();
      await apiClient.deleteDatasource(token, datasetToDelete);

      // Refresh datasources
      if (workspaceContext?.refreshDatasources) {
        await workspaceContext.refreshDatasources();
      }

      setShowDeleteConfirm(false);
      setDatasetToDelete(null);
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = async () => {
    if (workspaceContext?.refreshDatasources) {
      await workspaceContext.refreshDatasources();
    }
    setShowEditModal(false);
    setDatasetToEdit(null);
  };

  const getMenuItems = (): ActionSheetItem[] => [
    {
      id: 'edit',
      label: 'Edit Dataset',
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
      label: 'Delete Dataset',
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

  return (
    <div className="datasets-page">
      {isMobile && (
        <MobileChatHeader
          onWorkspaceClick={() => setShowWorkspaceSwitcher(true)}
          onDatasetClick={() => {/* Already on datasets page */}}
          showDatasetSelector={false}
        />
      )}

      <div className="datasets-header">
        <h1>Datasets</h1>
        <p>Select a dataset to start analyzing</p>
      </div>

      <button className="upload-dataset-btn" onClick={() => setShowUploadModal(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add New Dataset
      </button>

      {loading ? (
        <div className="datasets-loading">
          <div className="spinner" />
          <p>Loading datasets...</p>
        </div>
      ) : datasources.length === 0 ? (
        <div className="datasets-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          <h3>No datasets yet</h3>
          <p>Upload a CSV, Excel, or JSON file to get started</p>
        </div>
      ) : (
        <div className="datasets-list">
          {datasources.map((dataset) => (
            <div key={dataset.id} className="dataset-card-wrapper">
              <button
                className="dataset-card"
                onClick={() => handleDatasetSelect(dataset.id)}
                disabled={dataset.status !== 'READY'}
              >
                <div className={`dataset-icon ${getFileTypeIcon(dataset.mime_type || '').toLowerCase()}`}>
                  {getFileTypeIcon(dataset.mime_type || '')}
                </div>

                <div className="dataset-content">
                  <h3 className="dataset-name">{dataset.name}</h3>

                  <div className="dataset-meta-row">
                    <span className={`dataset-status ${getStatusColor(dataset.status)}`}>
                      {dataset.status}
                    </span>
                    <span className="dataset-meta-separator">•</span>
                    <span className="dataset-type">{dataset.mime_type || 'Unknown'}</span>
                    {dataset.file_size && (
                      <>
                        <span className="dataset-meta-separator">•</span>
                        <span className="dataset-size">{formatFileSize(dataset.file_size)}</span>
                      </>
                    )}
                  </div>

                  {dataset.metadata_json?.row_count ? (
                    <div className="dataset-stats">
                      <span>{dataset.metadata_json.row_count.toLocaleString()} rows</span>
                      {Boolean(dataset.metadata_json.col_count) && (
                        <>
                          <span className="dataset-meta-separator">•</span>
                          <span>{dataset.metadata_json.col_count} columns</span>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>

                <svg className="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Mobile-only more options button */}
              {isMobile && (
                <button
                  className="dataset-more-btn-mobile"
                  onClick={(e) => handleMoreClick(e, dataset.id)}
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

      {showUploadModal && workspaceId && (
        <UploadModal
          workspaceId={workspaceId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            // Refresh will happen automatically via context
          }}
        />
      )}

      {showWorkspaceSwitcher && (
        <WorkspaceSwitcher
          isOpen={showWorkspaceSwitcher}
          onClose={() => setShowWorkspaceSwitcher(false)}
          onCreateWorkspace={() => setShowCreateWorkspaceModal(true)}
        />
      )}

      {showCreateWorkspaceModal && (
        <WorkspaceModal
          onClose={() => setShowCreateWorkspaceModal(false)}
          onSuccess={async () => {
            // Refresh workspace list
            if (workspaceContext?.refreshWorkspaces) {
              await workspaceContext.refreshWorkspaces();
            }
            setShowCreateWorkspaceModal(false);
            // Navigate to the newly created workspace
            if (workspaceContext?.workspaces && workspaceContext.workspaces.length > 0) {
              const newWorkspace = workspaceContext.workspaces.at(-1);
              if (newWorkspace && workspaceContext.setCurrentWorkspace) {
                workspaceContext.setCurrentWorkspace(newWorkspace);
                localStorage.setItem('activeWorkspaceId', newWorkspace.id);
                navigate(`/workspace/${newWorkspace.id}`);
              }
            }
          }}
        />
      )}

      {/* Mobile Action Sheet for dataset options */}
      <ActionSheet
        isOpen={showActionSheet}
        title="Dataset Options"
        items={getMenuItems()}
        onClose={() => {
          setShowActionSheet(false);
          // Only clear selection if no modal is being opened
          if (!showEditModal && !showDeleteConfirm) {
            setSelectedDatasetForMenu(null);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Dataset?"
        message="This action cannot be undone. All data and chat history associated with this dataset will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDatasetToDelete(null);
        }}
      />

      {/* Edit Dataset Modal */}
      {showEditModal && datasetToEdit && (
        <DatasourceModal
          mode="edit"
          datasourceId={datasetToEdit}
          initialName={datasources.find(ds => ds.id === datasetToEdit)?.name || ''}
          onClose={() => {
            setShowEditModal(false);
            setDatasetToEdit(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default DatasetsPage;

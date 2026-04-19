import React, { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  ChevronRight,
  Clock,
  Database,
  FileSpreadsheet,
  FileJson,
  Layers,
} from 'lucide-react';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { DatasourceContext } from '../context/DatasourceContext';
import { useAuth } from '../context/useAuth';
import { apiClient } from '../services/apiClient';
import { UploadModal } from '../components/layout/UploadModal';
import { ConnectorSelectionModal } from '../components/layout/ConnectorSelectionModal';
import { PostgresConnectorModal } from '../components/layout/PostgresConnectorModal';
import MobileChatHeader from '../components/layout/MobileChatHeader';
import WorkspaceSwitcher from '../components/layout/WorkspaceSwitcher';
import { WorkspaceModal } from '../components/layout/WorkspaceModal';
import { DatasourceModal } from '../components/layout/DatasourceModal';
import { ActionSheet, type ActionSheetItem } from '../components/common/ActionSheet';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '../components/common/ContextMenu';
import type { ConnectorResponse, DataSourceResponse } from '../types/api';
import './DatasetsPage.css';

type SourceFilter = 'all' | 'files' | 'databases';

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Never synced';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'Unknown';
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

type UnifiedRow =
  | { kind: 'connector'; id: string; connector: ConnectorResponse }
  | { kind: 'datasource'; id: string; datasource: DataSourceResponse };

function getConnectorPill(status: ConnectorResponse['status']): { label: string; className: string } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Connected', className: 'ds-pill ds-pill--success' };
    case 'FAILED':
      return { label: 'Error', className: 'ds-pill ds-pill--error' };
    case 'SYNCING':
      return { label: 'Syncing', className: 'ds-pill ds-pill--sync' };
    default:
      return { label: 'Inactive', className: 'ds-pill ds-pill--muted' };
  }
}

function getDatasourcePill(status: DataSourceResponse['status']): { label: string; className: string } {
  switch (status) {
    case 'READY':
      return { label: 'Connected', className: 'ds-pill ds-pill--success' };
    case 'FAILED':
      return { label: 'Error', className: 'ds-pill ds-pill--error' };
    case 'PROCESSING':
    case 'PENDING':
      return { label: 'Syncing', className: 'ds-pill ds-pill--sync' };
    default:
      return { label: status.replace(/_/g, ' '), className: 'ds-pill ds-pill--muted' };
  }
}

const DatasetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const workspaceContext = useContext(WorkspaceContext);
  const datasourceContext = useContext(DatasourceContext);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showConnectorSelectionModal, setShowConnectorSelectionModal] = useState(false);
  const [showPostgresModal, setShowPostgresModal] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Mobile menu state
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState<{ id: string, type: 'datasource' | 'connector' } | null>(null);
  const [datasetToEdit, setDatasetToEdit] = useState<string | null>(null);
  const [datasetToRename, setDatasetToRename] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'datasource' | 'connector' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Desktop menu state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const datasources = workspaceContext?.datasources || [];
  const connectors = workspaceContext?.connectors || [];
  const loading = workspaceContext?.loading || false;
  const setSelectedDatasourceId = datasourceContext?.setSelectedDatasourceId || (() => { });

  const unifiedSources: UnifiedRow[] = useMemo(() => {
    const rows: UnifiedRow[] = [];
    connectors.forEach((connector) =>
      rows.push({ kind: 'connector', id: connector.id, connector })
    );
    datasources.forEach((datasource) =>
      rows.push({ kind: 'datasource', id: datasource.id, datasource })
    );
    return rows;
  }, [connectors, datasources]);

  const activeConnectionCount = useMemo(() => {
    return unifiedSources.filter((row) => {
      if (row.kind === 'connector') {
        return row.connector.status === 'ACTIVE' || row.connector.status === 'SYNCING';
      }
      return (
        row.datasource.status === 'READY' || row.datasource.status === 'PROCESSING'
      );
    }).length;
  }, [unifiedSources]);

  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedSources.filter((row) => {
      if (sourceFilter === 'files' && row.kind !== 'datasource') return false;
      if (sourceFilter === 'databases' && row.kind !== 'connector') return false;
      if (!q) return true;
      const name = row.kind === 'connector' ? row.connector.name : row.datasource.name;
      return name.toLowerCase().includes(q);
    });
  }, [unifiedSources, searchQuery, sourceFilter]);

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

  const handleDatasetSelect = async (datasetId: string) => {
    // Set as active dataset
    setSelectedDatasourceId(datasetId);

    // Navigate back to chat (session will be created in Workspace component)
    navigate(`/workspace/${workspaceId}`);
  };

  const handleConnectorSelect = async (connectorId: string) => {
    // Set as active connector/datasource
    setSelectedDatasourceId(connectorId);

    // Navigate back to chat
    navigate(`/workspace/${workspaceId}`);
    toast.success("Database selected for analysis");
  };
  // Mobile menu handlers
  const handleMoreClick = (e: React.MouseEvent, id: string, type: 'datasource' | 'connector') => {
    e.stopPropagation();
    setSelectedItemForMenu({ id, type });
    setShowActionSheet(true);
  };

  const handleDesktopMenuClick = (e: React.MouseEvent<HTMLButtonElement>, id: string, type: 'datasource' | 'connector') => {
    e.stopPropagation();
    setSelectedItemForMenu({ id, type });
    setMenuAnchorEl(e.currentTarget);
    setShowContextMenu(true);
  };

  const handleRename = () => {
    if (selectedItemForMenu?.type === 'datasource') {
      setDatasetToRename(selectedItemForMenu.id);
      setShowRenameModal(true);
    } else {
      toast.info("Renaming connectors coming soon");
    }
  };

  const handleEdit = () => {
    if (selectedItemForMenu?.type === 'datasource') {
      setDatasetToEdit(selectedItemForMenu.id);
      setShowEditModal(true);
    } else {
      toast.info("Editing connectors coming soon");
    }
  };

  const handleDelete = () => {
    setItemToDelete(selectedItemForMenu);
    setShowDeleteConfirm(true);
  };

  const handlePreview = (datasetId: string) => {
    navigate(`/workspace/${workspaceId}/datasets/${datasetId}/preview`);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !user || !workspaceId) return;

    try {
      setIsDeleting(true);
      const token = await user.getIdToken();
      
      if (itemToDelete.type === 'datasource') {
        await apiClient.deleteDatasource(token, itemToDelete.id);
        if (workspaceContext?.refreshDatasources) {
          await workspaceContext.refreshDatasources();
        }
      } else {
        await apiClient.deleteConnector(token, workspaceId, itemToDelete.id);
        if (workspaceContext?.refreshConnectors) {
          await workspaceContext.refreshConnectors();
        }
      }

      setShowDeleteConfirm(false);
      setItemToDelete(null);
      toast.success(`${itemToDelete.type === 'datasource' ? 'Dataset' : 'Connector'} deleted successfully`);
    } catch (err) {
      console.error('Failed to delete item:', err);
      toast.error(`Failed to delete ${itemToDelete.type === 'datasource' ? 'dataset' : 'connector'}. Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = async () => {
    if (workspaceContext?.refreshDatasources) {
      await workspaceContext.refreshDatasources();
    }
    setShowEditModal(false);
    setShowRenameModal(false);
    setDatasetToEdit(null);
    setDatasetToRename(null);
  };

  const getMenuItems = (): ActionSheetItem[] => {
    const items: ActionSheetItem[] = [];
    
    if (selectedItemForMenu?.type === 'datasource') {
      items.push({
        id: 'preview',
        label: 'Preview Data',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ),
        variant: 'default' as const,
        onClick: () => {
          if (selectedItemForMenu) handlePreview(selectedItemForMenu.id);
        },
      });
      
      items.push({
        id: 'rename',
        label: 'Rename',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        ),
        variant: 'default' as const,
        onClick: handleRename,
      });

      items.push({
        id: 'update',
        label: 'Update Dataset',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        ),
        variant: 'default' as const,
        onClick: handleEdit,
      });
    }

    items.push({
      id: 'delete',
      label: selectedItemForMenu?.type === 'datasource' ? 'Delete Dataset' : 'Delete Connector',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
      variant: 'danger' as const,
      onClick: handleDelete,
    });

    return items;
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (selectedItemForMenu?.type === 'datasource') {
      items.push({
        id: 'preview',
        label: 'Preview Data',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ),
        variant: 'default',
        onClick: () => {
          if (selectedItemForMenu) handlePreview(selectedItemForMenu.id);
        },
      });

      items.push({
        id: 'rename',
        label: 'Rename',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        ),
        variant: 'default',
        onClick: handleRename,
      });

      items.push({
        id: 'update',
        label: 'Update Dataset',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        ),
        variant: 'default',
        onClick: handleEdit,
      });
    }

    items.push({
      id: 'delete',
      label: selectedItemForMenu?.type === 'datasource' ? 'Delete Dataset' : 'Delete Connector',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
      variant: 'danger',
      onClick: handleDelete,
    });

    return items;
  };

  const renderLoading = () => (
    <div className="ds-source-grid ds-source-grid--loading">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="ds-source-skeleton">
          <div className="ds-source-skeleton__shine" />
          <div className="ds-source-skeleton__row">
            <div className="ds-source-skeleton__icon" />
            <div className="ds-source-skeleton__pill" />
          </div>
          <div className="ds-source-skeleton__title" />
          <div className="ds-source-skeleton__meta" />
          <div className="ds-source-skeleton__footer" />
        </div>
      ))}
    </div>
  );

  const hasContent = unifiedSources.length > 0;

  const renderSourceIcon = (row: UnifiedRow) => {
    if (row.kind === 'connector') {
      return (
        <div className="ds-card-icon ds-card-icon--connector" aria-hidden>
          <Database className="ds-card-icon-svg" strokeWidth={1.75} />
        </div>
      );
    }
    const mime = row.datasource.mime_type?.toLowerCase() || '';
    if (mime.includes('json')) {
      return (
        <div className="ds-card-icon ds-card-icon--json" aria-hidden>
          <FileJson className="ds-card-icon-svg" strokeWidth={1.75} />
        </div>
      );
    }
    if (mime.includes('csv') || mime.includes('excel') || mime.includes('sheet') || mime.includes('spreadsheet')) {
      return (
        <div className="ds-card-icon ds-card-icon--sheet" aria-hidden>
          <FileSpreadsheet className="ds-card-icon-svg" strokeWidth={1.75} />
        </div>
      );
    }
    return (
      <div className="ds-card-icon ds-card-icon--file" aria-hidden>
        <Layers className="ds-card-icon-svg" strokeWidth={1.75} />
      </div>
    );
  };

  return (
    <div className="datasets-page app-page-root">
      {isMobile && (
        <MobileChatHeader
          onWorkspaceClick={() => setShowWorkspaceSwitcher(true)}
          onDatasetClick={() => {/* Already on datasets page */ }}
          showDatasetSelector={false}
        />
      )}

      <div className="ds-page-inner">
        <header className="ds-hero">
          <div className="ds-hero-bg" aria-hidden />
          <div className="ds-hero-text">
            <p className="ds-hero-kicker">Workspace</p>
            <h1>Data Sources</h1>
            <p className="ds-hero-lede">Manage and sync your active connections.</p>
            {!loading && (
              <p className="ds-hero-meta">
                <span className="ds-hero-meta__dot" aria-hidden />
                {unifiedSources.length} source{unifiedSources.length === 1 ? '' : 's'} in this workspace
              </p>
            )}
          </div>
          <div className="ds-hero-actions">
            <span className="ds-active-pill" aria-live="polite">
              {activeConnectionCount} active
            </span>
            <button
              type="button"
              className="ds-primary-cta"
              onClick={() => setShowConnectorSelectionModal(true)}
            >
              <Plus size={18} strokeWidth={2.5} aria-hidden />
              Add connection
            </button>
          </div>
        </header>

        {!loading && hasContent && (
          <div className="ds-toolbar">
            <div className="ds-search-wrap">
              <Search className="ds-search-icon" size={18} strokeWidth={2} aria-hidden />
              <input
                className="ds-search-input"
                placeholder="Search by name, type, or host…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search data sources"
              />
            </div>
            <div className="ds-filter-pills" role="tablist" aria-label="Filter sources">
              {(['all', 'files', 'databases'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={sourceFilter === key}
                  className={`ds-filter-pill ${sourceFilter === key ? 'is-active' : ''}`}
                  onClick={() => setSourceFilter(key)}
                >
                  {key === 'all' ? 'All' : key === 'files' ? 'Files' : 'Databases'}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          className="upload-dataset-fab"
          type="button"
          onClick={() => setShowConnectorSelectionModal(true)}
          aria-label="Add connection"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {loading ? (
          renderLoading()
        ) : !hasContent ? (
          <div className="datasets-empty ds-empty-hero">
            <div className="ds-empty-icon-wrap" aria-hidden>
              <Database size={40} strokeWidth={1.5} />
            </div>
            <h3>No data sources yet</h3>
            <p>Upload a spreadsheet or connect PostgreSQL to start analyzing with AI.</p>
            {!isMobile && (
              <button type="button" className="ds-primary-cta" onClick={() => setShowConnectorSelectionModal(true)}>
                <Plus size={18} strokeWidth={2.5} aria-hidden />
                Add connection
              </button>
            )}
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="ds-empty-filtered">
            <h3>No matches</h3>
            <p>Try another search or reset filters.</p>
            <button
              type="button"
              className="ds-link-btn"
              onClick={() => {
                setSearchQuery('');
                setSourceFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="ds-source-grid">
            {filteredSources.map((row) => {
              const pill =
                row.kind === 'connector'
                  ? getConnectorPill(row.connector.status)
                  : getDatasourcePill(row.datasource.status);
              const updatedIso =
                row.kind === 'connector'
                  ? row.connector.updated_at || row.connector.last_sync_at || row.connector.created_at
                  : row.datasource.updated_at || row.datasource.created_at;
              const title = row.kind === 'connector' ? row.connector.name : row.datasource.name;
              const id = row.kind === 'connector' ? row.connector.id : row.datasource.id;
              const menuType = row.kind === 'connector' ? 'connector' : 'datasource';
              const isSelected =
                row.kind === 'datasource' && datasourceContext?.selectedDatasourceId === row.datasource.id;

              return (
                <div
                  key={row.kind === 'connector' ? `c-${row.connector.id}` : `d-${row.datasource.id}`}
                  className={`ds-source-card ds-source-card--${row.kind} ${isSelected ? 'is-selected' : ''}`}
                  data-kind={row.kind}
                >
                  <button
                    type="button"
                    className="ds-source-card__body"
                    disabled={row.kind === 'datasource' && row.datasource.status !== 'READY'}
                    onClick={() => {
                      if (row.kind === 'connector') handleConnectorSelect(row.connector.id);
                      else if (row.datasource.status === 'READY') handleDatasetSelect(row.datasource.id);
                    }}
                  >
                    <div className="ds-source-card__top">
                      {renderSourceIcon(row)}
                      <span className={pill.className}>{pill.label}</span>
                    </div>
                    <p className="ds-source-card__kind">
                      {row.kind === 'connector' ? 'Live database' : 'Uploaded file'}
                    </p>
                    <h3 className="ds-source-card__title">{title}</h3>
                    <p className="ds-source-card__updated">
                      <Clock size={14} strokeWidth={2} aria-hidden />
                      <span>Updated {formatRelativeTime(updatedIso)}</span>
                    </p>
                    {row.kind === 'connector' ? (
                      <p className="ds-source-card__hint">
                        {row.connector.type.toUpperCase()} · Index {row.connector.metadata_status.toLowerCase()}
                      </p>
                    ) : (
                      <p className="ds-source-card__hint">
                        {row.datasource.mime_type?.split('/').pop()?.toUpperCase() || 'FILE'}
                        {row.datasource.file_size ? ` · ${formatFileSize(row.datasource.file_size)}` : ''}
                        {row.datasource.metadata_json?.row_count
                          ? ` · ${row.datasource.metadata_json.row_count.toLocaleString()} rows`
                          : ''}
                      </p>
                    )}
                  </button>
                  <div className="ds-source-card__footer">
                    {row.kind === 'datasource' && row.datasource.status === 'READY' && (
                      <button
                        type="button"
                        className="ds-source-card__ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(row.datasource.id);
                        }}
                      >
                        Preview
                      </button>
                    )}
                    <button
                      type="button"
                      className="ds-source-card__settings"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMobile) handleMoreClick(e, id, menuType);
                        else handleDesktopMenuClick(e, id, menuType);
                      }}
                    >
                      <span>Settings</span>
                      <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showConnectorSelectionModal && (
          <ConnectorSelectionModal 
            onClose={() => setShowConnectorSelectionModal(false)}
            onSelect={(type) => {
                setShowConnectorSelectionModal(false);
                if (type === 'upload') setShowUploadModal(true);
                else if (type === 'postgres') setShowPostgresModal(true);
            }}
          />
      )}

      {showPostgresModal && workspaceId && (
          <PostgresConnectorModal 
            workspaceId={workspaceId}
            onClose={() => setShowPostgresModal(false)}
            onSuccess={() => {
                if (workspaceContext?.refreshConnectors) {
                    workspaceContext.refreshConnectors();
                }
                toast.success("PostgreSQL connector added successfully!");
            }}
          />
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
        title={selectedItemForMenu?.type === 'datasource' ? 'Dataset Options' : 'Connector Options'}
        items={getMenuItems()}
        onClose={() => {
          setShowActionSheet(false);
          // Only clear selection if no modal or context menu is being opened
          if (!showEditModal && !showDeleteConfirm && !showRenameModal && !showContextMenu) {
            setSelectedItemForMenu(null);
          }
        }}
      />

      {/* Desktop Context Menu for dataset options */}
      <ContextMenu
        isOpen={showContextMenu}
        anchorEl={menuAnchorEl}
        items={getContextMenuItems()}
        onClose={() => {
          setShowContextMenu(false);
          setMenuAnchorEl(null);
          // Only clear selection if no modal is being opened
          if (!showEditModal && !showDeleteConfirm && !showRenameModal) {
            setSelectedItemForMenu(null);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={itemToDelete?.type === 'datasource' ? "Delete Dataset?" : "Delete Connector?"}
        message="This action cannot be undone. All data associated with this source will be permanently removed from your workspace."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
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

      {/* Rename Dataset Modal */}
      {showRenameModal && datasetToRename && (
        <DatasourceModal
          mode="rename"
          datasourceId={datasetToRename}
          initialName={datasources.find(ds => ds.id === datasetToRename)?.name || ''}
          onClose={() => {
            setShowRenameModal(false);
            setDatasetToRename(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default DatasetsPage;


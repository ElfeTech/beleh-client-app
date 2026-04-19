import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { DataSourceResponse, ChatSessionRead } from '../../types/api';
import { useDatasource } from '../../context/DatasourceContext';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu';
import { ActionSheet, type ActionSheetItem } from '../common/ActionSheet';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { DatasourceModal } from './DatasourceModal';

interface WorkspaceMenuProps {
    dataSources: DataSourceResponse[];
    onAddClick: () => void;
    onRefresh?: () => void;
}

// Session cache to avoid refetching
const _sessionCache = new Map<string, { sessions: ChatSessionRead[], timestamp: number }>();
const _CACHE_DURATION = 30000; // 30 seconds
void _sessionCache; // Mark as intentionally unused
void _CACHE_DURATION; // Mark as intentionally unused

export function WorkspaceMenu({ dataSources, onAddClick, onRefresh }: WorkspaceMenuProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id: workspaceId } = useParams<{ id: string }>();
    const { selectedDatasourceId, setSelectedDatasourceId } = useDatasource();
    const [contextMenuAnchor, setContextMenuAnchor] = useState<HTMLElement | null>(null);
    const [selectedDatasetForMenu, setSelectedDatasetForMenu] = useState<string | null>(null);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const menuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

    const getIconInfo = (type: string) => {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('csv')) return { label: 'CSV', class: 'csv' };
        if (lowerType.includes('xl') || lowerType.includes('spread')) return { label: 'XL', class: 'xlsx' };
        if (lowerType.includes('json')) return { label: 'JSON', class: 'json' };
        return { label: 'DS', class: 'other' };
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'N/A';
        const kb = bytes / 1024;
        const mb = kb / 1024;
        const gb = mb / 1024;

        if (gb >= 1) return `${gb.toFixed(1)} GB`;
        if (mb >= 1) return `${mb.toFixed(1)} MB`;
        if (kb >= 1) return `${kb.toFixed(1)} KB`;
        return `${bytes} B`;
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'READY': return '#10b981';
            case 'PROCESSING': return '#f59e0b';
            case 'FAILED': return '#ef4444';
            case 'PENDING': return '#6b7280';
            default: return '#6b7280';
        }
    };

    // Sort datasets by most recent activity (updated_at)
    const sortedDataSources = [...dataSources].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA; // Most recent first
    });

    // Handle mobile detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDatasourceClick = (datasourceId: string) => {
        setSelectedDatasourceId(datasourceId);

        // Navigate to the workspace chat interface if not already there
        if (workspaceId && globalThis.location.pathname !== `/workspace/${workspaceId}`) {
            navigate(`/workspace/${workspaceId}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, datasourceId: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDatasourceClick(datasourceId);
        }
    };

    const handleMoreClick = (e: React.MouseEvent, datasourceId: string) => {
        e.stopPropagation();
        setSelectedDatasetForMenu(datasourceId);

        if (isMobile) {
            setShowActionSheet(true);
        } else {
            setContextMenuAnchor(e.currentTarget as HTMLElement);
        }
    };

    const handleEdit = () => {
        setShowEditModal(true);
    };

    const handlePreview = (datasetId: string) => {
        navigate(`/workspace/${workspaceId}/datasets/${datasetId}/preview`);
    };

    const handleRename = () => {
        setShowRenameModal(true);
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedDatasetForMenu || !user) return;

        try {
            setIsDeleting(true);
            const token = await user.getIdToken();
            await apiClient.deleteDatasource(token, selectedDatasetForMenu);

            if (selectedDatasourceId === selectedDatasetForMenu) {
                const remainingDatasets = dataSources.filter((ds) => ds.id !== selectedDatasetForMenu);
                if (remainingDatasets.length > 0) {
                    setSelectedDatasourceId(remainingDatasets[0].id);
                } else {
                    setSelectedDatasourceId(null);
                }
            }

            onRefresh?.();

            setShowDeleteConfirm(false);
            setSelectedDatasetForMenu(null);
            toast.success('Dataset deleted successfully');
        } catch (err) {
            console.error('Failed to delete dataset:', err);
            toast.error('Failed to delete dataset. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditSuccess = () => {
        onRefresh?.();
        setShowEditModal(false);
        setShowRenameModal(false);
        setSelectedDatasetForMenu(null);
    };

    const getMenuItems = (): ContextMenuItem[] | ActionSheetItem[] => [
        {
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
                if (selectedDatasetForMenu) handlePreview(selectedDatasetForMenu);
            },
        },
        {
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
        },
        {
            id: 'edit',
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
        <div className="sidebar-section">
            <div className="sidebar-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Datasets
            </div>
            <div className="dataset-list">
                {sortedDataSources.map((source) => {
                    const iconInfo = getIconInfo(source.type);
                    const isActive = selectedDatasourceId === source.id;

                    return (
                        <div key={source.id} className="dataset-group">
                            <div className="dataset-item-wrapper">
                                <div
                                    className={`dataset-item-compact ${isActive ? 'active' : ''}`}
                                    onClick={() => handleDatasourceClick(source.id)}
                                    onKeyDown={(e) => handleKeyDown(e, source.id)}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={isActive}
                                >
                                    <span className={`dataset-icon ${iconInfo.class}`}>
                                        {iconInfo.label}
                                    </span>
                                    <div className="dataset-item-title" title={source.name}>{source.name}</div>

                                    {/* Info button with hover tooltip */}
                                    <div className="dataset-info-wrapper">
                                        <button
                                            className="dataset-info-btn"
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label="Dataset info"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M12 16v-4M12 8h.01" />
                                            </svg>
                                        </button>
                                        <div className="dataset-info-tooltip">
                                            <div className="tooltip-row">
                                                <span className="tooltip-label">Status</span>
                                                <span className="tooltip-value" style={{ color: getStatusColor(source.status) }}>
                                                    {source.status}
                                                </span>
                                            </div>
                                            <div className="tooltip-row">
                                                <span className="tooltip-label">Type</span>
                                                <span className="tooltip-value">{iconInfo.label}</span>
                                            </div>
                                            <div className="tooltip-row">
                                                <span className="tooltip-label">Size</span>
                                                <span className="tooltip-value">{formatFileSize(source.file_size)}</span>
                                            </div>
                                            {source.metadata_json?.row_count && (
                                                <div className="tooltip-row">
                                                    <span className="tooltip-label">Rows</span>
                                                    <span className="tooltip-value">{source.metadata_json.row_count.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    ref={(el) => (menuButtonRefs.current[source.id] = el)}
                                    className="dataset-more-btn"
                                    onClick={(e) => handleMoreClick(e, source.id)}
                                    aria-label="More options"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="12" cy="5" r="1" />
                                        <circle cx="12" cy="19" r="1" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <button className="add-dataset-btn" onClick={onAddClick}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add New Dataset
            </button>

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
                title="Dataset Options"
                items={getMenuItems() as ActionSheetItem[]}
                onClose={() => setShowActionSheet(false)}
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
                onCancel={() => setShowDeleteConfirm(false)}
            />

            {/* Edit Dataset Modal */}
            {showEditModal && selectedDatasetForMenu && (
                <DatasourceModal
                    mode="edit"
                    datasourceId={selectedDatasetForMenu}
                    initialName={dataSources.find(ds => ds.id === selectedDatasetForMenu)?.name || ''}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedDatasetForMenu(null);
                    }}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* Rename Dataset Modal */}
            {showRenameModal && selectedDatasetForMenu && (
                <DatasourceModal
                    mode="rename"
                    datasourceId={selectedDatasetForMenu}
                    initialName={dataSources.find(ds => ds.id === selectedDatasetForMenu)?.name || ''}
                    onClose={() => {
                        setShowRenameModal(false);
                        setSelectedDatasetForMenu(null);
                    }}
                    onSuccess={handleEditSuccess}
                />
            )}
        </div>
    );
}

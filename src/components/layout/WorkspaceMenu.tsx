import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DataSourceResponse } from '../../types/api';
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

    // Auto-select first datasource or restore from localStorage
    useEffect(() => {
        const savedDatasetId = localStorage.getItem('last_active_dataset_id');

        if (savedDatasetId && dataSources.some(ds => ds.id === savedDatasetId)) {
            setSelectedDatasourceId(savedDatasetId);
        } else if (dataSources.length > 0 && !selectedDatasourceId) {
            setSelectedDatasourceId(dataSources[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataSources]);

    // Persist selected dataset
    useEffect(() => {
        if (selectedDatasourceId) {
            localStorage.setItem('last_active_dataset_id', selectedDatasourceId);
        }
    }, [selectedDatasourceId]);

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
                    setSelectedDatasourceId('');
                }
            }

            onRefresh?.();

            setShowDeleteConfirm(false);
            setSelectedDatasetForMenu(null);
        } catch (err) {
            console.error('Failed to delete dataset:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditSuccess = () => {
        onRefresh?.();
        setShowEditModal(false);
        setSelectedDatasetForMenu(null);
    };

    const getMenuItems = (): ContextMenuItem[] | ActionSheetItem[] => [
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
        <div className="sidebar-section">
            <div className="sidebar-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Datasets
            </div>
            <div className="dataset-list">
                {dataSources.map((source) => {
                    const iconInfo = getIconInfo(source.type);
                    const isActive = selectedDatasourceId === source.id;
                    return (
                        <div key={source.id} className="dataset-item-wrapper">
                            <div
                                className={`dataset-item-detailed ${isActive ? 'active' : ''}`}
                                onClick={() => handleDatasourceClick(source.id)}
                                onKeyDown={(e) => handleKeyDown(e, source.id)}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isActive}
                            >
                                <div className="dataset-item-header">
                                    <span className={`dataset-icon ${iconInfo.class}`}>
                                        {iconInfo.label}
                                    </span>
                                    <div className="dataset-item-title">{source.name}</div>
                                </div>
                                <div className="dataset-item-meta">
                                    <span
                                        className="dataset-status"
                                        style={{ color: getStatusColor(source.status) }}
                                    >
                                        {source.status}
                                    </span>
                                    <span className="dataset-meta-separator">•</span>
                                    <span className="dataset-type">{iconInfo.label}</span>
                                    <span className="dataset-meta-separator">•</span>
                                    <span className="dataset-size">{formatFileSize(source.file_size)}</span>
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
        </div>
    );
}

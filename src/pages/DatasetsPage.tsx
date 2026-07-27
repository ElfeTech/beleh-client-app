import React, { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSpreadsheet,
  FileJson,
  Layers,
  MessageSquare,
  Table2,
  FolderOpen,
} from 'lucide-react';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { DatasourceContext } from '../context/DatasourceContext';
import { useAuth } from '../context/useAuth';
import { apiClient } from '../services/apiClient';
import { DatasourceConnectionPanel } from '../components/layout/DatasourceConnectionPanel';
import MobileChatHeader from '../components/layout/MobileChatHeader';
import WorkspaceSwitcher from '../components/layout/WorkspaceSwitcher';
import { WorkspaceModal } from '../components/layout/WorkspaceModal';
import { DatasourceModal } from '../components/layout/DatasourceModal';
import { ActionSheet, type ActionSheetItem } from '../components/common/ActionSheet';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '../components/common/ContextMenu';
import type {
  ConnectorResponse,
  DataSourceResponse,
  DatasetTable,
  DatasetTablePreviewResponse,
} from '../types/api';
import { DatasetPreviewGrid } from '../components/datasets/DatasetPreviewGrid';
import {
  ConnectorTableDetail,
  type ConnectorDetailTab,
} from '../components/datasets/ConnectorTableDetail';
import {
  catalogSourceKey,
  tablesFromMetadata,
  getSourceDisplayName,
  getSourceHostHint,
  getSourceTableCountLabel,
  groupTablesBySchema,
  filterTablesByQuery,
  filterSchemaGroupsByQuery,
  parseTableIdentity,
  type CatalogSourceRef,
  type CatalogBrowseLevel,
} from '../utils/schemaCatalog';
import {
  readDatasetsView,
  writeActiveWorkspaceId,
  writeDatasetsView,
  type DatasetsPageViewState,
} from '../lib/uiMemory';
import './DatasetsPage.css';

type SourceFilter = 'all' | 'files' | 'databases';
type MobileCatalogPane = 'sources' | 'schemas' | 'tables' | 'preview';

type UnifiedRow =
  | { kind: 'connector'; id: string; connector: ConnectorResponse }
  | { kind: 'datasource'; id: string; datasource: DataSourceResponse };

function getConnectorPill(status: ConnectorResponse['status']): {
  label: string;
  className: string;
} {
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

function getDatasourcePill(status: DataSourceResponse['status']): {
  label: string;
  className: string;
} {
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
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileCatalogPane, setMobileCatalogPane] = useState<MobileCatalogPane>('sources');

  // Mobile menu state
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState<{
    id: string;
    type: 'datasource' | 'connector';
  } | null>(null);
  const [datasetToEdit, setDatasetToEdit] = useState<string | null>(null);
  const [datasetToRename, setDatasetToRename] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: 'datasource' | 'connector';
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Desktop menu state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [selectedCatalogSource, setSelectedCatalogSource] = useState<CatalogSourceRef | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [catalogTables, setCatalogTables] = useState<DatasetTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [browseLevel, setBrowseLevel] = useState<CatalogBrowseLevel>('tables');
  const [selectedSchemaName, setSelectedSchemaName] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [connectorDetailTab, setConnectorDetailTab] = useState<ConnectorDetailTab>('columns');
  const [previewData, setPreviewData] = useState<DatasetTablePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(10);
  const [datasetsViewHydrated, setDatasetsViewHydrated] = useState(false);

  // Restore catalog filter / search / selection from UI memory
  useEffect(() => {
    if (!user?.uid || !workspaceId) return;
    const stored = readDatasetsView(user.uid, workspaceId);
    if (stored) {
      if (stored.searchQuery != null) setSearchQuery(stored.searchQuery);
      if (
        stored.sourceFilter === 'all' ||
        stored.sourceFilter === 'files' ||
        stored.sourceFilter === 'databases'
      ) {
        setSourceFilter(stored.sourceFilter);
      }
      if (
        stored.selectedCatalog &&
        (stored.selectedCatalog.kind === 'datasource' ||
          stored.selectedCatalog.kind === 'connector') &&
        stored.selectedCatalog.id
      ) {
        setSelectedCatalogSource(stored.selectedCatalog as CatalogSourceRef);
      }
    }
    setDatasetsViewHydrated(true);
  }, [user?.uid, workspaceId]);

  useEffect(() => {
    if (!datasetsViewHydrated || !user?.uid || !workspaceId) return;
    const state: DatasetsPageViewState = {
      searchQuery,
      sourceFilter,
      selectedCatalog: selectedCatalogSource,
    };
    writeDatasetsView(user.uid, workspaceId, state);
  }, [
    datasetsViewHydrated,
    user?.uid,
    workspaceId,
    searchQuery,
    sourceFilter,
    selectedCatalogSource,
  ]);

  const datasources = workspaceContext?.datasources || [];
  const connectors = workspaceContext?.connectors || [];
  const loading = workspaceContext?.loading || false;
  const setSelectedDatasourceId = datasourceContext?.setSelectedDatasourceId || (() => {});

  const unifiedSources: UnifiedRow[] = useMemo(() => {
    const rows: UnifiedRow[] = [];
    connectors.forEach((connector) =>
      rows.push({ kind: 'connector', id: connector.id, connector }),
    );
    datasources.forEach((datasource) =>
      rows.push({ kind: 'datasource', id: datasource.id, datasource }),
    );
    return rows;
  }, [connectors, datasources]);

  const activeConnectionCount = useMemo(() => {
    return unifiedSources.filter((row) => {
      if (row.kind === 'connector') {
        return row.connector.status === 'ACTIVE' || row.connector.status === 'SYNCING';
      }
      return row.datasource.status === 'READY' || row.datasource.status === 'PROCESSING';
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
    if (filteredSources.length === 0) {
      setSelectedCatalogSource(null);
      return;
    }
    const stillVisible = selectedCatalogSource
      ? filteredSources.some(
          (row) =>
            catalogSourceKey({ kind: row.kind, id: row.id }) ===
            catalogSourceKey(selectedCatalogSource),
        )
      : false;
    if (!stillVisible) {
      const first = filteredSources[0];
      setSelectedCatalogSource({ kind: first.kind, id: first.id });
    }
  }, [filteredSources, selectedCatalogSource]);

  useEffect(() => {
    if (!user || !selectedCatalogSource || !workspaceId) {
      setCatalogTables([]);
      setSelectedTableName(null);
      setSelectedSchemaName(null);
      setBrowseLevel('tables');
      return;
    }

    const row = unifiedSources.find(
      (r) => r.kind === selectedCatalogSource.kind && r.id === selectedCatalogSource.id,
    );
    if (!row) return;

    if (row.kind === 'connector') {
      const meta = row.connector.metadata_status;
      if (meta === 'PENDING' || meta === 'PROCESSING') {
        setCatalogTables([]);
        setSelectedTableName(null);
        setSelectedSchemaName(null);
        setBrowseLevel('schemas');
        setTablesLoading(false);
        return;
      }
      if (meta === 'FAILED') {
        setCatalogTables([]);
        setSelectedTableName(null);
        setSelectedSchemaName(null);
        setBrowseLevel('schemas');
        setTablesLoading(false);
        return;
      }

      let cancelled = false;
      (async () => {
        setTablesLoading(true);
        try {
          const token = await user.getIdToken();
          const response = await apiClient.listConnectorTables(
            token,
            workspaceId,
            row.connector.id,
          );
          if (cancelled) return;
          setCatalogTables(response.tables);
          setBrowseLevel('schemas');
          setSelectedSchemaName(null);
          setSelectedTableName(null);
          setConnectorDetailTab('columns');
        } catch {
          if (cancelled) return;
          setCatalogTables([]);
          setSelectedTableName(null);
          setSelectedSchemaName(null);
          setBrowseLevel('schemas');
        } finally {
          if (!cancelled) setTablesLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    if (row.datasource.status !== 'READY') {
      setCatalogTables([]);
      setSelectedTableName(null);
      setSelectedSchemaName(null);
      setBrowseLevel('tables');
      setTablesLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setTablesLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await apiClient.listDatasetTables(token, row.datasource.id);
        if (cancelled) return;
        const tables =
          response.tables.length > 0 ? response.tables : tablesFromMetadata(row.datasource);
        setCatalogTables(tables);
        setBrowseLevel('tables');
        setSelectedSchemaName(null);
        setSelectedTableName(tables[0]?.table_name ?? null);
      } catch {
        if (cancelled) return;
        const fallback = tablesFromMetadata(row.datasource);
        setCatalogTables(fallback);
        setBrowseLevel('tables');
        setSelectedSchemaName(null);
        setSelectedTableName(fallback[0]?.table_name ?? null);
      } finally {
        if (!cancelled) setTablesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, selectedCatalogSource, unifiedSources, workspaceId]);

  const schemaGroups = useMemo(() => groupTablesBySchema(catalogTables), [catalogTables]);

  const filteredSchemaGroups = useMemo(
    () => filterSchemaGroupsByQuery(schemaGroups, tableSearchQuery),
    [schemaGroups, tableSearchQuery],
  );

  const tablesInSelectedSchema = useMemo(() => {
    if (!selectedSchemaName) return [];
    return schemaGroups.find((g) => g.name === selectedSchemaName)?.tables ?? [];
  }, [schemaGroups, selectedSchemaName]);

  const selectedCatalogRow = useMemo(() => {
    if (!selectedCatalogSource) return null;
    return (
      unifiedSources.find(
        (r) => r.kind === selectedCatalogSource.kind && r.id === selectedCatalogSource.id,
      ) ?? null
    );
  }, [unifiedSources, selectedCatalogSource]);

  const isConnectorSource = selectedCatalogRow?.kind === 'connector';

  const browseTables = useMemo(() => {
    if (isConnectorSource) {
      return filterTablesByQuery(tablesInSelectedSchema, tableSearchQuery);
    }
    return filterTablesByQuery(catalogTables, tableSearchQuery);
  }, [isConnectorSource, tablesInSelectedSchema, catalogTables, tableSearchQuery]);

  const selectedTable = useMemo(
    () => catalogTables.find((t) => t.table_name === selectedTableName) ?? null,
    [catalogTables, selectedTableName],
  );

  const previewDatasetId =
    selectedCatalogRow?.kind === 'datasource' ? selectedCatalogRow.datasource.id : null;

  useEffect(() => {
    setPreviewPage(1);
    setPreviewData(null);
  }, [selectedTableName, previewDatasetId]);

  useEffect(() => {
    if (!user || !previewDatasetId || !selectedTableName) {
      setPreviewData(null);
      setPreviewLoading(false);
      return;
    }

    if (
      selectedCatalogRow?.kind !== 'datasource' ||
      selectedCatalogRow.datasource.status !== 'READY'
    ) {
      return;
    }

    let cancelled = false;

    (async () => {
      setPreviewLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await apiClient.getDatasetTablePreview(
          token,
          previewDatasetId,
          selectedTableName,
          previewPage,
          previewPageSize,
        );
        if (!cancelled) setPreviewData(response);
      } catch {
        if (!cancelled) setPreviewData(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, previewDatasetId, selectedTableName, previewPage, previewPageSize, selectedCatalogRow]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileCatalogPane('sources');
  }, [isMobile]);

  const handleUseInChat = (ref: CatalogSourceRef) => {
    setSelectedDatasourceId(ref.id);
    navigate(`/workspace/${workspaceId}`);
    toast.success('Source selected for AI analysis');
  };

  const handleCatalogSourceSelect = (ref: CatalogSourceRef) => {
    setSelectedCatalogSource(ref);
    setTableSearchQuery('');
    setSelectedSchemaName(null);
    setSelectedTableName(null);
    setConnectorDetailTab('columns');
    if (ref.kind === 'connector') {
      setBrowseLevel('schemas');
      if (isMobile) setMobileCatalogPane('schemas');
    } else {
      setBrowseLevel('tables');
      if (isMobile) setMobileCatalogPane('tables');
    }
  };

  const handleSelectSchema = (schemaName: string) => {
    setSelectedSchemaName(schemaName);
    setSelectedTableName(null);
    setBrowseLevel('tables');
    setTableSearchQuery('');
    setConnectorDetailTab('columns');
    if (isMobile) setMobileCatalogPane('tables');
  };

  const handleBackToSchemas = () => {
    setBrowseLevel('schemas');
    setSelectedSchemaName(null);
    setSelectedTableName(null);
    setTableSearchQuery('');
    setConnectorDetailTab('columns');
    if (isMobile) setMobileCatalogPane('schemas');
  };

  const handleSelectTable = (tableName: string) => {
    setSelectedTableName(tableName);
    setConnectorDetailTab('columns');
    if (isMobile) setMobileCatalogPane('preview');
  };

  const handleBrowseBack = () => {
    if (isConnectorSource && browseLevel === 'tables') {
      handleBackToSchemas();
      return;
    }
    setMobileCatalogPane('sources');
  };
  // Mobile menu handlers
  const handleMoreClick = (e: React.MouseEvent, id: string, type: 'datasource' | 'connector') => {
    e.stopPropagation();
    setSelectedItemForMenu({ id, type });
    setShowActionSheet(true);
  };

  const handleDesktopMenuClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
    type: 'datasource' | 'connector',
  ) => {
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
      toast.info('Renaming connectors coming soon');
    }
  };

  const handleEdit = () => {
    if (selectedItemForMenu?.type === 'datasource') {
      setDatasetToEdit(selectedItemForMenu.id);
      setShowEditModal(true);
    } else {
      toast.info('Editing connectors coming soon');
    }
  };

  const handleDelete = () => {
    setItemToDelete(selectedItemForMenu);
    setShowDeleteConfirm(true);
  };

  const handlePreview = (datasetId: string, tableName?: string) => {
    const tableQuery = tableName ? `?table=${encodeURIComponent(tableName)}` : '';
    navigate(`/workspace/${workspaceId}/datasets/${datasetId}/preview${tableQuery}`);
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
      toast.success(
        `${itemToDelete.type === 'datasource' ? 'Dataset' : 'Connector'} deleted successfully`,
      );
    } catch (err) {
      console.error('Failed to delete item:', err);
      toast.error(
        `Failed to delete ${itemToDelete.type === 'datasource' ? 'dataset' : 'connector'}. Please try again.`,
      );
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

    if (selectedItemForMenu) {
      items.push({
        id: 'use-in-chat',
        label: 'Use in AI Analyst',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
        variant: 'default' as const,
        onClick: () => {
          if (selectedItemForMenu) {
            handleUseInChat({
              kind: selectedItemForMenu.type === 'connector' ? 'connector' : 'datasource',
              id: selectedItemForMenu.id,
            });
          }
        },
      });
    }

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

    if (selectedItemForMenu) {
      items.push({
        id: 'use-in-chat',
        label: 'Use in AI Analyst',
        icon: <MessageSquare size={16} strokeWidth={2} />,
        variant: 'default',
        onClick: () => {
          if (selectedItemForMenu) {
            handleUseInChat({
              kind: selectedItemForMenu.type === 'connector' ? 'connector' : 'datasource',
              id: selectedItemForMenu.id,
            });
          }
        },
      });
    }

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

  const hasContent = unifiedSources.length > 0;

  const renderSourceIcon = (row: UnifiedRow) => {
    const iconProps = { size: 16, strokeWidth: 1.75 as const };
    if (row.kind === 'connector') return <Database {...iconProps} />;
    const mime = row.datasource.mime_type?.toLowerCase() || '';
    if (mime.includes('json')) return <FileJson {...iconProps} />;
    if (
      mime.includes('csv') ||
      mime.includes('excel') ||
      mime.includes('sheet') ||
      mime.includes('spreadsheet')
    ) {
      return <FileSpreadsheet {...iconProps} />;
    }
    return <Layers {...iconProps} />;
  };

  const tableCountForSource = (row: UnifiedRow): number | null => {
    const key = catalogSourceKey({ kind: row.kind, id: row.id });
    if (selectedCatalogSource && catalogSourceKey(selectedCatalogSource) === key) {
      return catalogTables.length;
    }
    if (row.kind === 'datasource' && row.datasource.metadata_json?.columns?.length) {
      return 1;
    }
    return null;
  };

  return (
    <div className="schema-catalog-page app-page-root analytics-page">
      {isMobile && (
        <MobileChatHeader
          onWorkspaceClick={() => setShowWorkspaceSwitcher(true)}
          onDatasetClick={() => {
            /* Already on datasets page */
          }}
          showDatasetSelector={false}
        />
      )}

      <div className="sc-inner">
        <header className="sc-page-header">
          <div>
            <div className="sc-page-header__title-row">
              <span className="sc-page-header__icon" aria-hidden>
                <Database size={22} strokeWidth={1.75} />
              </span>
              <div>
                <h1>Database Schema Catalog</h1>
                <p className="sc-page-header__lede">
                  Audit and map enterprise datasources, table schemas, and secure encrypted
                  pipelines.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-gradient-primary sc-connect-cta--desktop"
            onClick={() => setShowConnectionPanel(true)}
          >
            <Plus size={18} strokeWidth={2.5} aria-hidden />
            Connect Enterprise DB
          </button>
        </header>

        {!loading && hasContent && (
          <div className="sc-toolbar">
            <div className="sc-search-wrap">
              <Search className="sc-search-icon" size={18} strokeWidth={2} aria-hidden />
              <input
                className="sc-search-input"
                placeholder="Search by name, type, or host…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search data sources"
              />
            </div>
            <div className="sc-filter-pills" role="tablist" aria-label="Filter sources">
              {(['all', 'files', 'databases'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={sourceFilter === key}
                  className={`sc-filter-pill ${sourceFilter === key ? 'is-active' : ''}`}
                  onClick={() => setSourceFilter(key)}
                >
                  {key === 'all' ? 'All' : key === 'files' ? 'Files' : 'Databases'}
                </button>
              ))}
            </div>
            <span className="ds-pill ds-pill--muted" aria-live="polite">
              {activeConnectionCount} active
            </span>
          </div>
        )}

        <button
          className="upload-dataset-fab"
          type="button"
          onClick={() => setShowConnectionPanel(true)}
          aria-label="Connect data source"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {loading ? (
          <div className="sc-catalog-layout">
            <div className="sc-panel sc-col--sources">
              {[1, 2, 3].map((i) => (
                <div key={i} className="sc-skeleton-row" />
              ))}
            </div>
            <div className="sc-panel">
              <div className="sc-skeleton-row" />
              <div className="sc-skeleton-row" />
            </div>
            <div className="sc-panel">
              <div className="sc-skeleton-row" />
            </div>
          </div>
        ) : !hasContent ? (
          <div className="sc-empty-hero">
            <Database size={40} strokeWidth={1.5} aria-hidden />
            <h3>No data sources yet</h3>
            <p>
              Upload a spreadsheet or connect PostgreSQL to explore schemas and analyze with AI.
            </p>
            <button
              type="button"
              className="btn-gradient-primary"
              onClick={() => setShowConnectionPanel(true)}
            >
              <Plus size={18} strokeWidth={2.5} aria-hidden />
              Connect Enterprise DB
            </button>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="sc-empty-hero">
            <h3>No matches</h3>
            <p>Try another search or reset filters.</p>
            <button
              type="button"
              className="sc-link-btn"
              onClick={() => {
                setSearchQuery('');
                setSourceFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div
            className={`sc-catalog-layout ${isMobile ? 'sc-catalog-layout--mobile' : ''}`}
            data-mobile-pane={isMobile ? mobileCatalogPane : undefined}
          >
            <div
              className={`sc-col sc-col--sources ${isMobile && mobileCatalogPane !== 'sources' ? 'sc-col--mobile-hidden' : ''}`}
            >
              <div className="sc-panel">
                <div className="sc-panel__head">Encrypted sources</div>
                <div className="sc-panel__body">
                  <div className="sc-sources-list">
                    {filteredSources.map((row) => {
                      const ref: CatalogSourceRef = { kind: row.kind, id: row.id };
                      const isSelected =
                        selectedCatalogSource?.kind === ref.kind &&
                        selectedCatalogSource?.id === ref.id;
                      const pill =
                        row.kind === 'connector'
                          ? getConnectorPill(row.connector.status)
                          : getDatasourcePill(row.datasource.status);
                      const title = getSourceDisplayName(
                        row.kind,
                        row.kind === 'connector' ? row.connector : undefined,
                        row.kind === 'datasource' ? row.datasource : undefined,
                      );
                      const hostHint = getSourceHostHint(
                        row.kind,
                        row.kind === 'connector' ? row.connector : undefined,
                        row.kind === 'datasource' ? row.datasource : undefined,
                      );
                      const tableLabel = getSourceTableCountLabel(
                        row.kind,
                        tableCountForSource(row),
                        row.kind === 'connector' ? row.connector.metadata_status : undefined,
                      );
                      const menuType = row.kind === 'connector' ? 'connector' : 'datasource';
                      const ready =
                        row.kind === 'datasource'
                          ? row.datasource.status === 'READY'
                          : row.connector.status === 'ACTIVE';

                      return (
                        <button
                          key={catalogSourceKey(ref)}
                          type="button"
                          className={`sc-source-item ${isSelected ? 'is-selected' : ''}`}
                          disabled={!ready && row.kind === 'datasource'}
                          onClick={() => handleCatalogSourceSelect(ref)}
                        >
                          <div className="sc-source-item__row">
                            <span className="sc-source-item__icon" aria-hidden>
                              {renderSourceIcon(row)}
                            </span>
                            <div>
                              <p className="sc-source-item__name">{title}</p>
                              <p className="sc-source-item__host">{hostHint}</p>
                            </div>
                          </div>
                          <div className="sc-source-item__meta">
                            <span
                              className={`sc-status-dot ${pill.className.includes('success') ? '' : ''}`}
                            >
                              {pill.label}
                            </span>
                            <span>{tableLabel}</span>
                          </div>
                          <div className="sc-source-item__actions">
                            <button
                              type="button"
                              className="sc-source-item__menu-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isMobile) handleMoreClick(e, ref.id, menuType);
                                else handleDesktopMenuClick(e, ref.id, menuType);
                              }}
                            >
                              Options
                            </button>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <section
              className={`sc-col sc-col--tables ${
                isMobile && mobileCatalogPane !== 'tables' && mobileCatalogPane !== 'schemas'
                  ? 'sc-col--mobile-hidden'
                  : ''
              }`}
            >
              <div className="sc-panel">
                {(isMobile || (isConnectorSource && browseLevel === 'tables')) && (
                  <button
                    type="button"
                    className={isMobile ? 'sc-mobile-back' : 'sc-browse-back'}
                    onClick={handleBrowseBack}
                  >
                    <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
                    {isConnectorSource && browseLevel === 'tables' ? 'All schemas' : 'Sources'}
                  </button>
                )}

                {isConnectorSource && browseLevel === 'tables' && selectedSchemaName ? (
                  <div className="sc-browse-crumb" aria-label="Catalog path">
                    <button type="button" onClick={handleBackToSchemas}>
                      Schemas
                    </button>
                    <span aria-hidden>/</span>
                    <strong>{selectedSchemaName}</strong>
                  </div>
                ) : null}

                <div className="sc-panel__head">
                  {isConnectorSource && browseLevel === 'schemas'
                    ? `Schemas (${
                        selectedCatalogRow?.kind === 'connector' &&
                        (selectedCatalogRow.connector.metadata_status === 'PENDING' ||
                          selectedCatalogRow.connector.metadata_status === 'PROCESSING')
                          ? '—'
                          : schemaGroups.length
                      })`
                    : isConnectorSource
                      ? `Tables in ${selectedSchemaName ?? 'schema'} (${browseTables.length})`
                      : `Sheets & tables (${
                          selectedCatalogRow?.kind === 'datasource' &&
                          selectedCatalogRow.datasource.status !== 'READY'
                            ? '—'
                            : catalogTables.length
                        })`}
                </div>
                <div className="sc-tables-search">
                  <div className="sc-search-wrap">
                    <Search className="sc-search-icon" size={18} strokeWidth={2} aria-hidden />
                    <input
                      className="sc-search-input"
                      placeholder={
                        isConnectorSource && browseLevel === 'schemas'
                          ? 'Search schemas…'
                          : isConnectorSource
                            ? 'Search tables…'
                            : 'Search sheets & tables…'
                      }
                      value={tableSearchQuery}
                      onChange={(e) => setTableSearchQuery(e.target.value)}
                      aria-label="Search catalog"
                      disabled={
                        !selectedCatalogSource ||
                        (selectedCatalogRow?.kind === 'connector' &&
                          selectedCatalogRow.connector.metadata_status !== 'COMPLETED') ||
                        (selectedCatalogRow?.kind === 'datasource' &&
                          selectedCatalogRow.datasource.status !== 'READY')
                      }
                    />
                  </div>
                </div>
                <div className="sc-panel__body sc-panel__body--flush">
                  {tablesLoading ? (
                    <>
                      <div className="sc-skeleton-row" />
                      <div className="sc-skeleton-row" />
                      <div className="sc-skeleton-row" />
                    </>
                  ) : selectedCatalogRow?.kind === 'connector' &&
                    (selectedCatalogRow.connector.metadata_status === 'PENDING' ||
                      selectedCatalogRow.connector.metadata_status === 'PROCESSING') ? (
                    <div className="sc-empty-panel">
                      <h3>Schema sync pending</h3>
                      <p>
                        Schemas and tables for this database will appear once metadata sync
                        completes.
                      </p>
                    </div>
                  ) : selectedCatalogRow?.kind === 'connector' &&
                    selectedCatalogRow.connector.metadata_status === 'FAILED' ? (
                    <div className="sc-empty-panel">
                      <h3>Schema sync failed</h3>
                      <p>
                        Could not discover schemas for this database. Try reconnecting or syncing
                        again.
                      </p>
                    </div>
                  ) : selectedCatalogRow?.kind === 'datasource' &&
                    selectedCatalogRow.datasource.status !== 'READY' ? (
                    <div className="sc-empty-panel">
                      <h3>Source processing</h3>
                      <p>Schema tables are available when this dataset reaches Ready status.</p>
                    </div>
                  ) : isConnectorSource && browseLevel === 'schemas' ? (
                    filteredSchemaGroups.length === 0 ? (
                      <div className="sc-empty-panel">
                        <p>No schemas match your search.</p>
                      </div>
                    ) : (
                      <ul className="sc-schema-list">
                        {filteredSchemaGroups.map((group) => (
                          <li key={group.name}>
                            <button
                              type="button"
                              className={`sc-schema-item ${selectedSchemaName === group.name ? 'is-selected' : ''}`}
                              onClick={() => handleSelectSchema(group.name)}
                            >
                              <span className="sc-schema-item__icon" aria-hidden>
                                <FolderOpen size={18} strokeWidth={2} />
                              </span>
                              <span className="sc-schema-item__body">
                                <span className="sc-schema-item__name">{group.name}</span>
                                <span className="sc-schema-item__meta">
                                  {group.tableCount} table{group.tableCount === 1 ? '' : 's'}
                                  {group.rowCount > 0
                                    ? ` · ${group.rowCount.toLocaleString()} rows`
                                    : ''}
                                </span>
                              </span>
                              <ChevronRight
                                className="sc-schema-item__chevron"
                                size={16}
                                strokeWidth={2.25}
                                aria-hidden
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : browseTables.length === 0 ? (
                    <div className="sc-empty-panel">
                      <p>
                        {isConnectorSource
                          ? 'No tables in this schema match your search.'
                          : 'No tables match your search.'}
                      </p>
                    </div>
                  ) : (
                    <ul className="sc-table-list">
                      {browseTables.map((table) => {
                        const identity = parseTableIdentity(table);
                        return (
                          <li key={table.table_name}>
                            <button
                              type="button"
                              className={`sc-table-item ${selectedTableName === table.table_name ? 'is-selected' : ''}`}
                              onClick={() => handleSelectTable(table.table_name)}
                            >
                              <span className="sc-table-item__leading" aria-hidden>
                                <Table2 size={16} strokeWidth={2} />
                              </span>
                              <span className="sc-table-item__label">
                                <span className="sc-table-item__name">{identity.name}</span>
                                {isConnectorSource ? (
                                  <span className="sc-table-item__sub">
                                    {table.column_count || table.columns?.length || 0} cols
                                  </span>
                                ) : null}
                              </span>
                              <span className="sc-table-item__count">
                                {table.row_count.toLocaleString()} rows
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            <section
              className={`sc-col sc-col--detail ${isMobile && mobileCatalogPane !== 'preview' ? 'sc-col--mobile-hidden' : ''}`}
            >
              <div className="sc-panel sc-panel--preview">
                {isMobile && (
                  <button
                    type="button"
                    className="sc-mobile-back"
                    onClick={() => setMobileCatalogPane('tables')}
                  >
                    <ChevronLeft size={18} strokeWidth={2.25} aria-hidden />
                    Tables
                  </button>
                )}
                {selectedCatalogRow?.kind === 'connector' &&
                (selectedCatalogRow.connector.metadata_status === 'PENDING' ||
                  selectedCatalogRow.connector.metadata_status === 'PROCESSING') ? (
                  <div className="sc-empty-panel">
                    <h3>Schema sync pending</h3>
                    <p>Table details will appear here once connector metadata sync completes.</p>
                  </div>
                ) : selectedCatalogRow?.kind === 'connector' &&
                  selectedCatalogRow.connector.metadata_status === 'FAILED' ? (
                  <div className="sc-empty-panel">
                    <h3>Schema sync failed</h3>
                    <p>Could not load schema details for this database.</p>
                  </div>
                ) : selectedCatalogRow?.kind === 'connector' && selectedTable ? (
                  <ConnectorTableDetail
                    table={selectedTable}
                    activeTab={connectorDetailTab}
                    onTabChange={setConnectorDetailTab}
                    onUseInChat={() =>
                      handleUseInChat({
                        kind: 'connector',
                        id: selectedCatalogRow.connector.id,
                      })
                    }
                  />
                ) : selectedCatalogRow?.kind === 'connector' &&
                  browseLevel === 'schemas' &&
                  !selectedTable ? (
                  <div className="sc-empty-panel sc-empty-panel--guide">
                    <div className="sc-empty-panel__icon" aria-hidden>
                      <FolderOpen size={28} strokeWidth={1.75} />
                    </div>
                    <h3>Pick a schema</h3>
                    <p>
                      PostgreSQL catalogs start with schemas. Open one to browse its tables, then
                      inspect columns or analyze the data in chat.
                    </p>
                  </div>
                ) : selectedCatalogRow?.kind === 'connector' &&
                  browseLevel === 'tables' &&
                  !selectedTable ? (
                  <div className="sc-empty-panel sc-empty-panel--guide">
                    <div className="sc-empty-panel__icon" aria-hidden>
                      <Table2 size={28} strokeWidth={1.75} />
                    </div>
                    <h3>Pick a table</h3>
                    <p>
                      Select a table in <strong>{selectedSchemaName ?? 'this schema'}</strong> to
                      view columns or explore its data.
                    </p>
                  </div>
                ) : selectedCatalogRow?.kind === 'datasource' &&
                  selectedCatalogRow.datasource.status !== 'READY' ? (
                  <div className="sc-empty-panel">
                    <h3>Source processing</h3>
                    <p>Data preview is available when this dataset reaches Ready status.</p>
                  </div>
                ) : selectedTable && previewDatasetId ? (
                  <DatasetPreviewGrid
                    embedded
                    tableName={selectedTable.table_name}
                    estimatedRows={selectedTable.row_count}
                    schemaColumnCount={selectedTable.column_count}
                    preview={previewData}
                    loading={previewLoading}
                    page={previewPage}
                    pageSize={previewPageSize}
                    onPageChange={setPreviewPage}
                    onPageSizeChange={(size) => {
                      setPreviewPageSize(size);
                      setPreviewPage(1);
                    }}
                    onExpand={() => handlePreview(previewDatasetId, selectedTable.table_name)}
                  />
                ) : (
                  <div className="sc-empty-panel sc-empty-panel--guide">
                    <div className="sc-empty-panel__icon" aria-hidden>
                      <Layers size={28} strokeWidth={1.75} />
                    </div>
                    <h3>Select a table</h3>
                    <p>Choose a sheet or table to preview rows in the data grid.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {showConnectionPanel && workspaceId && (
        <DatasourceConnectionPanel
          workspaceId={workspaceId}
          onClose={() => setShowConnectionPanel(false)}
          onSuccess={() => {
            if (workspaceContext?.refreshConnectors) {
              void workspaceContext.refreshConnectors();
            }
            if (workspaceContext?.refreshDatasources) {
              void workspaceContext.refreshDatasources();
            }
            toast.success('Datasource connected successfully.');
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
                writeActiveWorkspaceId(newWorkspace.id);
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
        title={itemToDelete?.type === 'datasource' ? 'Delete Dataset?' : 'Delete Connector?'}
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
          initialName={datasources.find((ds) => ds.id === datasetToEdit)?.name || ''}
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
          initialName={datasources.find((ds) => ds.id === datasetToRename)?.name || ''}
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

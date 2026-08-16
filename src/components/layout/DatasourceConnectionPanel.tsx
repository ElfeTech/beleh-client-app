import { useCallback, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { DatasourceConnectionPanelShell, PanelChrome } from './DatasourceConnectionPanelShell';
import { CatalogView, type ConnectorPanelSelect } from './connector-panel/CatalogView';
import { PostgresConnectorView } from './connector-panel/PostgresConnectorView';
import { UploadConnectorView } from './connector-panel/UploadConnectorView';
import { SupabaseOrgsView } from './connector-panel/SupabaseOrgsView';
import { SupabaseProjectsView } from './connector-panel/SupabaseProjectsView';
import { invalidateProviderProjectsCache } from '../../lib/providerCache';
import type { ProviderConnection } from '../../types/provider';
import type { ConnectorResponse } from '../../types/api';
import './DatasourceConnectionPanel.css';

type PanelView =
  | { id: 'catalog' }
  | { id: 'upload' }
  | { id: 'postgres' }
  | { id: 'supabase-orgs' }
  | { id: 'supabase-projects'; connection: ProviderConnection };

export interface DatasourceConnectionPanelProps {
  workspaceId: string;
  onClose: () => void;
  /** Called after a successful connect (upload / postgres / supabase bind). */
  onSuccess?: (created?: ConnectorResponse) => void;
  /** When true, hide file-based connectors (e.g. open from chat). */
  hideFileSources?: boolean;
}

function viewTitle(view: PanelView): {
  title: string;
  subtitle?: string;
  eyebrow?: string;
} {
  switch (view.id) {
    case 'catalog':
      return {
        eyebrow: 'Data platform',
        title: 'Connect a source',
        subtitle: 'Add files, cloud platforms, or databases to this workspace.',
      };
    case 'upload':
      return {
        eyebrow: 'Files',
        title: 'Upload dataset',
        subtitle: 'CSV and Excel spreadsheets.',
      };
    case 'postgres':
      return {
        eyebrow: 'Database',
        title: 'Connect PostgreSQL',
        subtitle: 'Encrypted pipeline for schema catalog sync.',
      };
    case 'supabase-orgs':
      return {
        eyebrow: 'Supabase',
        title: 'Organizations',
        subtitle: 'Choose an organization or connect a new one.',
      };
    case 'supabase-projects':
      return {
        eyebrow: 'Supabase',
        title: view.connection.organization,
        subtitle: 'Select a project to bind to this workspace.',
      };
    default:
      return { title: 'Connect' };
  }
}

export function DatasourceConnectionPanel({
  workspaceId,
  onClose,
  onSuccess,
  hideFileSources = false,
}: DatasourceConnectionPanelProps) {
  const [stack, setStack] = useState<PanelView[]>([{ id: 'catalog' }]);
  const [orgsHasConnections, setOrgsHasConnections] = useState(false);
  const [orgsConnectKey, setOrgsConnectKey] = useState(0);
  const uploadBackHandlerRef = useRef<(() => boolean) | null>(null);

  const current = useMemo(() => stack[stack.length - 1] ?? ({ id: 'catalog' } as const), [stack]);
  const canGoBack = stack.length > 1;
  const chrome = useMemo(() => viewTitle(current), [current]);

  const push = useCallback((view: PanelView) => {
    setStack((prev) => [...prev, view]);
    if (view.id !== 'supabase-orgs') {
      setOrgsHasConnections(false);
      // Reset so remounting orgs after visiting projects does not re-fire OAuth.
      setOrgsConnectKey(0);
    }
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => {
      const next = prev.length > 1 ? prev.slice(0, -1) : prev;
      const top = next[next.length - 1];
      if (top?.id !== 'supabase-orgs') {
        setOrgsHasConnections(false);
        setOrgsConnectKey(0);
      }
      return next;
    });
  }, []);

  const handlePanelBack = useCallback(() => {
    if (current.id === 'upload' && uploadBackHandlerRef.current?.()) {
      return;
    }
    pop();
  }, [current.id, pop]);

  const handleCatalogSelect = (type: ConnectorPanelSelect) => {
    if (type === 'upload') push({ id: 'upload' });
    else if (type === 'postgres') push({ id: 'postgres' });
    else if (type === 'supabase') push({ id: 'supabase-orgs' });
  };

  const handleFlowSuccess = (created?: ConnectorResponse) => {
    onSuccess?.(created);
    onClose();
  };

  const headerActions =
    current.id === 'supabase-orgs' && orgsHasConnections ? (
      <button
        type="button"
        className="ds-conn-list__add-btn"
        onClick={() => setOrgsConnectKey((k) => k + 1)}
        aria-label="Add new organization"
        title="Add new organization"
      >
        <Plus size={18} strokeWidth={2} />
        <span className="label">Add new organization</span>
      </button>
    ) : null;

  return (
    <DatasourceConnectionPanelShell>
      <PanelChrome
        title={chrome.title}
        subtitle={chrome.subtitle}
        eyebrow={chrome.eyebrow}
        canGoBack={canGoBack}
        onBack={handlePanelBack}
        onClose={onClose}
        headerActions={headerActions}
      />

      {current.id === 'catalog' && (
        <CatalogView hideFileSources={hideFileSources} onSelect={handleCatalogSelect} />
      )}

      {current.id === 'upload' && (
        <UploadConnectorView
          workspaceId={workspaceId}
          onCancel={pop}
          onSuccess={handleFlowSuccess}
          onRegisterBackHandler={(handler) => {
            uploadBackHandlerRef.current = handler;
          }}
        />
      )}

      {current.id === 'postgres' && (
        <PostgresConnectorView
          workspaceId={workspaceId}
          onCancel={pop}
          onSuccess={handleFlowSuccess}
        />
      )}

      {current.id === 'supabase-orgs' && (
        <SupabaseOrgsView
          workspaceId={workspaceId}
          onSelectConnection={(connection) => {
            invalidateProviderProjectsCache(connection.id);
            push({ id: 'supabase-projects', connection });
          }}
          onHasConnectionsChange={setOrgsHasConnections}
          connectRequestKey={orgsConnectKey}
        />
      )}

      {current.id === 'supabase-projects' && (
        <SupabaseProjectsView
          workspaceId={workspaceId}
          connection={current.connection}
          onBound={handleFlowSuccess}
        />
      )}
    </DatasourceConnectionPanelShell>
  );
}

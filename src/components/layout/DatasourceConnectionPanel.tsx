import { useCallback, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { DatasourceConnectionPanelShell, PanelChrome } from './DatasourceConnectionPanelShell';
import { CatalogView, type ConnectorPanelSelect } from './connector-panel/CatalogView';
import { PostgresConnectorView } from './connector-panel/PostgresConnectorView';
import { UploadConnectorView } from './connector-panel/UploadConnectorView';
import { SupabaseOrgsView } from './connector-panel/SupabaseOrgsView';
import { SupabaseProjectsView } from './connector-panel/SupabaseProjectsView';
import { GoogleSheetsAccountsView } from './connector-panel/GoogleSheetsAccountsView';
import { GoogleSheetsLinkView } from './connector-panel/GoogleSheetsLinkView';
import { GoogleSheetsPickerView } from './connector-panel/GoogleSheetsPickerView';
import {
  invalidateProviderProjectsCache,
  invalidateSheetsSpreadsheetsCache,
} from '../../lib/providerCache';
import type { ProviderConnection } from '../../types/provider';
import type { ConnectorResponse } from '../../types/api';
import './DatasourceConnectionPanel.css';

type PanelView =
  | { id: 'catalog' }
  | { id: 'upload' }
  | { id: 'postgres' }
  | { id: 'supabase-orgs' }
  | { id: 'supabase-projects'; connection: ProviderConnection }
  | { id: 'google-sheets-link' }
  | { id: 'google-sheets-accounts' }
  | { id: 'google-sheets-picker'; connection: ProviderConnection };

export type ConnectSuccessSource = 'upload' | 'postgres' | 'supabase' | 'google-sheets';

export interface DatasourceConnectionPanelProps {
  workspaceId: string;
  onClose: () => void;
  /**
   * Called after a successful connect (upload / postgres / supabase bind).
   * source tells callers which flow completed (supabase already shows its own
   * "Connected {project}" toast — don't stack a second generic one on it).
   */
  onSuccess?: (created?: ConnectorResponse, source?: ConnectSuccessSource) => void;
  /** When true, hide file-based connectors (e.g. open from chat). */
  hideFileSources?: boolean;
  /** Open directly on a flow view (e.g. restore the upload wizard after a reload). */
  initialView?: 'upload' | 'postgres' | 'supabase-orgs';
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
    case 'google-sheets-link':
      return {
        eyebrow: 'Google Sheets',
        title: 'Link your data source',
        subtitle: 'Share a sheet with our service account and paste its URL.',
      };
    case 'google-sheets-accounts':
      return {
        eyebrow: 'Google Sheets',
        title: 'Google accounts',
        subtitle: 'Choose an account or connect a new one.',
      };
    case 'google-sheets-picker':
      return {
        eyebrow: 'Google Sheets',
        title: view.connection.organization,
        subtitle: 'Pick a spreadsheet and the tabs to import.',
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
  initialView,
}: DatasourceConnectionPanelProps) {
  const [stack, setStack] = useState<PanelView[]>(() =>
    initialView ? [{ id: 'catalog' }, { id: initialView }] : [{ id: 'catalog' }],
  );
  const [orgsHasConnections, setOrgsHasConnections] = useState(false);
  const [orgsConnectKey, setOrgsConnectKey] = useState(0);
  const [sheetsHasConnections, setSheetsHasConnections] = useState(false);
  const [sheetsConnectKey, setSheetsConnectKey] = useState(0);
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
    if (view.id !== 'google-sheets-accounts') {
      setSheetsHasConnections(false);
      setSheetsConnectKey(0);
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
      if (top?.id !== 'google-sheets-accounts') {
        setSheetsHasConnections(false);
        setSheetsConnectKey(0);
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
    else if (type === 'google-sheets-link') push({ id: 'google-sheets-link' });
    else if (type === 'google-sheets') push({ id: 'google-sheets-accounts' });
  };

  const handleFlowSuccess = (created?: ConnectorResponse) => {
    let source: ConnectSuccessSource = 'upload';
    if (current.id === 'supabase-projects' || current.id === 'supabase-orgs') {
      source = 'supabase';
    } else if (current.id === 'postgres') {
      source = 'postgres';
    } else if (current.id === 'google-sheets-picker' || current.id === 'google-sheets-accounts') {
      source = 'google-sheets';
    }
    onSuccess?.(created, source);
    onClose();
  };

  const handleSheetsBound = () => {
    onSuccess?.(undefined, 'google-sheets');
    onClose();
  };

  let headerActions: React.ReactNode = null;
  if (current.id === 'supabase-orgs' && orgsHasConnections) {
    headerActions = (
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
    );
  } else if (current.id === 'google-sheets-accounts' && sheetsHasConnections) {
    headerActions = (
      <button
        type="button"
        className="ds-conn-list__add-btn"
        onClick={() => setSheetsConnectKey((k) => k + 1)}
        aria-label="Add new Google account"
        title="Add new Google account"
      >
        <Plus size={18} strokeWidth={2} />
        <span className="label">Add new account</span>
      </button>
    );
  }

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

      {current.id === 'google-sheets-link' && (
        <GoogleSheetsLinkView
          workspaceId={workspaceId}
          onCancel={pop}
          onBound={handleSheetsBound}
        />
      )}

      {current.id === 'google-sheets-accounts' && (
        <GoogleSheetsAccountsView
          onSelectConnection={(connection) => {
            invalidateSheetsSpreadsheetsCache(connection.id);
            push({ id: 'google-sheets-picker', connection });
          }}
          onHasConnectionsChange={setSheetsHasConnections}
          connectRequestKey={sheetsConnectKey}
        />
      )}

      {current.id === 'google-sheets-picker' && (
        <GoogleSheetsPickerView
          workspaceId={workspaceId}
          connection={current.connection}
          onBound={handleSheetsBound}
        />
      )}
    </DatasourceConnectionPanelShell>
  );
}

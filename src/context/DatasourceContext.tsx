import {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from './useAuth';
import { useWorkspace } from './WorkspaceContext';
import { readSelectedDatasetId, writeSelectedDatasetId } from '../lib/selectedDatasourceStorage';
import { isSourceInWorkspace } from '../lib/workspaceStateValidation';

interface DatasourceContextType {
  selectedDatasourceId: string | null;
  setSelectedDatasourceId: (id: string | null) => void;
}

const DatasourceContext = createContext<DatasourceContextType | undefined>(undefined);

export { DatasourceContext };

export function DatasourceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentWorkspace, workspaceContext, datasources, connectors, loading } = useWorkspace();
  const [selectedDatasourceId, setSelectedDatasourceIdState] = useState<string | null>(null);
  const datasetHydratedForWorkspaceRef = useRef<string | null>(null);

  const setSelectedDatasourceId = useCallback(
    (id: string | null) => {
      setSelectedDatasourceIdState(id);
      const wid = currentWorkspace?.id;
      const uid = user?.uid;
      writeSelectedDatasetId(uid, wid, id);
    },
    [user?.uid, currentWorkspace?.id],
  );

  // Hydrate selection for the current workspace once source lists are ready.
  // Prefer the user's explicit local choice over server state (connectors cannot be stored
  // in last_active_dataset_id, and server state may lag behind a fresh pick).
  useEffect(() => {
    if (!user) {
      setSelectedDatasourceIdState(null);
      datasetHydratedForWorkspaceRef.current = null;
      return;
    }

    const wid = currentWorkspace?.id;
    if (!wid) return;

    if (datasetHydratedForWorkspaceRef.current === wid) {
      return;
    }

    // Wait until workspace bootstrap finished so we do not treat an empty list as "missing"
    // and wipe a valid persisted selection.
    if (loading) return;
    if (!workspaceContext || workspaceContext.workspace.id !== wid) return;

    const uid = user.uid;
    const stored = readSelectedDatasetId(uid, wid);
    const serverDatasetId = workspaceContext.state.last_active_dataset_id ?? null;

    let chosen: string | null = null;
    if (isSourceInWorkspace(stored, datasources, connectors)) {
      chosen = stored;
    } else if (isSourceInWorkspace(serverDatasetId, datasources, connectors)) {
      chosen = serverDatasetId as string;
      // Mirror server choice into local memory so refresh stays consistent
      writeSelectedDatasetId(uid, wid, chosen);
    } else {
      // Lists may still be empty (no sources yet) — keep any stored id until lists arrive,
      // then clear only once we know the id is stale.
      const listsReady = datasources.length > 0 || connectors.length > 0;
      if (listsReady) {
        if (stored) writeSelectedDatasetId(uid, wid, null);
        chosen = null;
      } else if (stored) {
        // No sources in workspace yet; still surface the stored id so the composer
        // does not flash GENERAL — validation effect will clear if it never appears.
        chosen = stored;
      } else {
        chosen = null;
      }
    }

    setSelectedDatasourceIdState(chosen);
    datasetHydratedForWorkspaceRef.current = wid;
  }, [user, currentWorkspace?.id, workspaceContext, datasources, connectors, loading]);

  // Early restore from localStorage while waiting for workspaceContext (feels instant on refresh)
  useEffect(() => {
    if (!user?.uid || !currentWorkspace?.id || loading) return;
    const wid = currentWorkspace.id;
    if (datasetHydratedForWorkspaceRef.current === wid) return;

    const stored = readSelectedDatasetId(user.uid, wid);
    if (!stored) return;

    // Apply immediately if already valid, or if lists have not loaded yet (optimistic)
    if (
      isSourceInWorkspace(stored, datasources, connectors) ||
      (datasources.length === 0 && connectors.length === 0)
    ) {
      setSelectedDatasourceIdState(stored);
    }
  }, [user?.uid, currentWorkspace?.id, loading, datasources, connectors]);

  useEffect(() => {
    const wid = currentWorkspace?.id;
    if (!wid) {
      datasetHydratedForWorkspaceRef.current = null;
      return;
    }
    if (datasetHydratedForWorkspaceRef.current && datasetHydratedForWorkspaceRef.current !== wid) {
      datasetHydratedForWorkspaceRef.current = null;
    }
  }, [currentWorkspace?.id]);

  return (
    <DatasourceContext.Provider value={{ selectedDatasourceId, setSelectedDatasourceId }}>
      {children}
    </DatasourceContext.Provider>
  );
}

export function useDatasource() {
  const context = useContext(DatasourceContext);
  if (context === undefined) {
    throw new Error('useDatasource must be used within a DatasourceProvider');
  }
  return context;
}

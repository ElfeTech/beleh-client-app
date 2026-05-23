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

  useEffect(() => {
    if (!user) {
      setSelectedDatasourceIdState(null);
      datasetHydratedForWorkspaceRef.current = null;
      return;
    }

    const wid = currentWorkspace?.id;
    if (!wid) {
      return;
    }

    if (!workspaceContext || workspaceContext.workspace.id !== wid) {
      return;
    }

    if (datasetHydratedForWorkspaceRef.current === wid) {
      return;
    }

    if (loading) {
      return;
    }

    const uid = user.uid;
    const serverDatasetId = workspaceContext.state.last_active_dataset_id ?? null;

    let chosen: string | null = null;
    if (isSourceInWorkspace(serverDatasetId, datasources, connectors)) {
      chosen = serverDatasetId as string;
    } else {
      if (serverDatasetId) {
        writeSelectedDatasetId(uid, wid, null);
      }
      const stored = readSelectedDatasetId(uid, wid);
      if (isSourceInWorkspace(stored, datasources, connectors)) {
        chosen = stored;
      } else if (stored) {
        writeSelectedDatasetId(uid, wid, null);
      }
    }

    setSelectedDatasourceId(chosen);
    datasetHydratedForWorkspaceRef.current = wid;
  }, [
    user,
    currentWorkspace?.id,
    workspaceContext,
    datasources,
    connectors,
    loading,
    setSelectedDatasourceId,
  ]);

  // Fallback: localStorage only after lists exist and only if still valid (never trust stale ids)
  useEffect(() => {
    if (!user?.uid || !currentWorkspace?.id || loading) return;
    const wid = currentWorkspace.id;
    if (datasetHydratedForWorkspaceRef.current === wid) return;
    if (datasources.length === 0 && connectors.length === 0) return;

    const stored = readSelectedDatasetId(user.uid, wid);
    if (!stored) return;
    if (isSourceInWorkspace(stored, datasources, connectors)) {
      setSelectedDatasourceId(stored);
      datasetHydratedForWorkspaceRef.current = wid;
    } else {
      writeSelectedDatasetId(user.uid, wid, null);
    }
  }, [user?.uid, currentWorkspace?.id, loading, datasources, connectors, setSelectedDatasourceId]);

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

import { createContext, useState, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { useWorkspace } from './WorkspaceContext';
import {
    readSelectedDatasetId,
    writeSelectedDatasetId,
} from '../lib/selectedDatasourceStorage';

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
        [user?.uid, currentWorkspace?.id]
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

        const validInWorkspace = (id: string | null | undefined) =>
            !!id &&
            (datasources.some((d) => d.id === id) || connectors.some((c) => c.id === id));

        let chosen: string | null = null;
        if (validInWorkspace(serverDatasetId)) {
            chosen = serverDatasetId as string;
        } else {
            const stored = readSelectedDatasetId(uid, wid);
            if (validInWorkspace(stored)) {
                chosen = stored;
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

    // Apply localStorage as soon as datasource lists exist, even if workspace-context API is still loading.
    useEffect(() => {
        if (!user?.uid || !currentWorkspace?.id || loading) return;
        const wid = currentWorkspace.id;
        if (datasetHydratedForWorkspaceRef.current === wid) return;
        if (workspaceContext && workspaceContext.workspace.id === wid) return;

        const stored = readSelectedDatasetId(user.uid, wid);
        if (!stored) return;
        const valid =
            datasources.some((d) => d.id === stored) || connectors.some((c) => c.id === stored);
        if (valid) {
            setSelectedDatasourceId(stored);
        }
    }, [
        user?.uid,
        currentWorkspace?.id,
        loading,
        datasources,
        connectors,
        workspaceContext,
        setSelectedDatasourceId,
    ]);

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

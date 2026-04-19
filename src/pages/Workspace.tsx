import { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { GenerativeChat } from '../components/chat/GenerativeChat';
import { useWorkspace } from '../context/WorkspaceContext';

export function Workspace() {
    const { id: workspaceId } = useParams<{ id: string }>();
    const location = useLocation();
    const {
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        refreshDatasources,
    } = useWorkspace();

    useEffect(() => {
        if (!workspaceId || workspaces.length === 0) return;
        const ws = workspaces.find((w) => w.id === workspaceId);
        if (ws && currentWorkspace?.id !== workspaceId) {
            setCurrentWorkspace(ws);
        }
    }, [workspaceId, workspaces, currentWorkspace?.id, setCurrentWorkspace]);

    // After visiting /datasets, returning to chat should reload sources (sessionStorage survives remounts)
    const NAV_PATH_KEY = 'ai-bi-last-nav-path';
    useEffect(() => {
        if (typeof sessionStorage === 'undefined' || !workspaceId) return;
        const prev = sessionStorage.getItem(NAV_PATH_KEY) ?? '';
        if (location.pathname === `/workspace/${workspaceId}`) {
            const fromDatasets =
                prev.includes(`/workspace/${workspaceId}/datasets`) ||
                (prev.includes('/datasets') && prev.includes(workspaceId));
            if (fromDatasets) {
                void refreshDatasources();
            }
        }
        sessionStorage.setItem(NAV_PATH_KEY, location.pathname);
    }, [location.pathname, workspaceId, refreshDatasources]);

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <GenerativeChat workspaceId={workspaceId} />
        </div>
    );
}

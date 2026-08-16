import { useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { GenerativeChat } from '../components/chat/GenerativeChat';
import { useAuth } from '../context/useAuth';
import { useWorkspace } from '../context/WorkspaceContext';
import { useSessionInUrl } from '../hooks/useSessionInUrl';
import { apiClient } from '../services/apiClient';

export function Workspace() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace, refreshDatasources, refreshConnectors } =
    useWorkspace();
  const earlyBindAttemptedRef = useRef<string | null>(null);

  useSessionInUrl(workspaceId);

  // Prefer list match when available.
  useEffect(() => {
    if (!workspaceId || workspaces.length === 0) return;
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws && currentWorkspace?.id !== workspaceId) {
      setCurrentWorkspace(ws);
    }
  }, [workspaceId, workspaces, currentWorkspace?.id, setCurrentWorkspace]);

  // URL-first bind: fetch the single workspace so sessions/context can start before the full list.
  useEffect(() => {
    if (!user || !workspaceId || workspaceId === 'undefined') return;
    if (currentWorkspace?.id === workspaceId) return;
    if (workspaces.some((w) => w.id === workspaceId)) return;
    if (earlyBindAttemptedRef.current === workspaceId) return;

    earlyBindAttemptedRef.current = workspaceId;
    let cancelled = false;

    void (async () => {
      try {
        const token = await user.getIdToken();
        const ws = await apiClient.getWorkspace(token, workspaceId);
        if (cancelled) return;
        setCurrentWorkspace((prev) => (prev?.id === workspaceId ? prev : ws));
      } catch (err) {
        console.warn('[Workspace] Early workspace bind failed; waiting for list:', err);
        earlyBindAttemptedRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, workspaceId, currentWorkspace?.id, workspaces, setCurrentWorkspace]);

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
        void Promise.all([refreshDatasources({ silent: true }), refreshConnectors({ silent: true })]);
      }
    }
    sessionStorage.setItem(NAV_PATH_KEY, location.pathname);
  }, [location.pathname, workspaceId, refreshDatasources, refreshConnectors]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <GenerativeChat workspaceId={workspaceId} />
    </div>
  );
}

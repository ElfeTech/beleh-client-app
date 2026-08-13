import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';

/**
 * Redirects to workspace chat when the workspace has no datasources or connectors.
 * Waits until workspace context + source lists are ready for this workspace id.
 */
export function RequireWorkspaceSources({ children }: Readonly<{ children: ReactNode }>) {
  const { id } = useParams<{ id: string }>();
  const { datasources, connectors, loading, workspaceContext } = useWorkspace();

  const sourcesReadyForWorkspace =
    Boolean(id) && workspaceContext?.workspace.id === id && !loading;

  if (!sourcesReadyForWorkspace) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8" aria-busy>
        <p className="text-sm text-[color:var(--text-muted)]">Loading workspace…</p>
      </div>
    );
  }

  const hasSources = datasources.length > 0 || connectors.length > 0;
  if (!hasSources && id) {
    return <Navigate to={`/workspace/${id}`} replace />;
  }

  return <>{children}</>;
}

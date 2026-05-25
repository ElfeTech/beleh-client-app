import { workspaceChatPath } from '../hooks/useSessionInUrl';
import { apiClient } from '../services/apiClient';
import { authService } from '../services/authService';

function readStoredWorkspaceId(): string | null {
  try {
    const id = localStorage.getItem('activeWorkspaceId');
    if (id && id !== 'undefined') return id;
  } catch {
    /* storage disabled */
  }
  return null;
}

function readStoredSessionId(): string | null {
  try {
    const id = localStorage.getItem('activeSessionId');
    if (!id || id === 'undefined' || id === '1') return null;
    return id;
  } catch {
    return null;
  }
}

/** Resolve post-auth destination: active workspace + session when available. */
export async function resolveAuthenticatedHomePath(): Promise<string> {
  const token =
    (await authService.getValidIdToken(false)) ?? (await authService.getValidIdToken(true));
  if (!token) return '/signin';

  const storedWorkspaceId = readStoredWorkspaceId();
  const sessionId = readStoredSessionId();

  if (storedWorkspaceId) {
    return workspaceChatPath(storedWorkspaceId, sessionId);
  }

  try {
    const workspace = await apiClient.getDefaultWorkspace(token);
    return workspaceChatPath(workspace.id, sessionId);
  } catch {
    return '/settings/workspaces';
  }
}

import { workspaceChatPath } from '../hooks/useSessionInUrl';
import { apiClient } from '../services/apiClient';
import { authService } from '../services/authService';
import { readActiveSessionId, readActiveWorkspaceId } from './uiMemory';

/** Resolve post-auth destination: active workspace + session when available. */
export async function resolveAuthenticatedHomePath(): Promise<string> {
  const token =
    (await authService.getValidIdToken(false)) ?? (await authService.getValidIdToken(true));
  if (!token) return '/signin';

  const storedWorkspaceId = readActiveWorkspaceId();
  const sessionId = readActiveSessionId();

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

import { workspaceChatPath } from '../hooks/useSessionInUrl';
import { apiClient } from '../services/apiClient';
import { authService } from '../services/authService';
import { readActiveSessionId, readActiveWorkspaceId, writeActiveSessionId } from './uiMemory';

/** Resolve post-auth destination: active workspace + session when available. */
export async function resolveAuthenticatedHomePath(): Promise<string> {
  const token =
    (await authService.getValidIdToken(false)) ?? (await authService.getValidIdToken(true));
  if (!token) return '/signin';

  const storedWorkspaceId = readActiveWorkspaceId();
  let sessionId = readActiveSessionId();

  const resolveWorkspaceId = async (): Promise<string | null> => {
    if (storedWorkspaceId) return storedWorkspaceId;
    try {
      const workspace = await apiClient.getDefaultWorkspace(token);
      return workspace.id;
    } catch {
      return null;
    }
  };

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return '/settings/workspaces';

  // Drop deep-linked / cached session ids that are not in this user's session list.
  if (sessionId && sessionId !== '1' && sessionId !== 'undefined') {
    try {
      const listed = await apiClient.listWorkspaceSessions(token, workspaceId);
      const exists = listed.items.some((s) => s.id === sessionId);
      if (!exists) {
        writeActiveSessionId(null);
        sessionId = null;
      }
    } catch {
      // Leave session id; chat hydrate will clear on 404 / missing list entry.
    }
  } else {
    sessionId = null;
  }

  return workspaceChatPath(workspaceId, sessionId);
}

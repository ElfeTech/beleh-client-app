import { apiClient } from '../services/apiClient';
import { authService } from '../services/authService';
import { clearInviteToken, peekInviteToken } from './inviteToken';
import { workspaceChatPath } from '../hooks/useSessionInUrl';
import { ApiRequestError } from '../utils/apiErrorMessage';

/**
 * After login/register (which may auto-accept via invite_token), best-effort
 * accept if a token remains. Returns a redirect path when a workspace was joined.
 */
export async function completePendingInviteAccept(): Promise<string | null> {
  const inviteToken = peekInviteToken();
  if (!inviteToken) return null;

  const authToken =
    (await authService.getValidIdToken(false)) ?? (await authService.getValidIdToken(true));
  if (!authToken) return null;

  try {
    const result = await apiClient.acceptInvitation(authToken, inviteToken);
    clearInviteToken();
    if (result.workspace_id) {
      return workspaceChatPath(result.workspace_id);
    }
  } catch (err) {
    // Already a member / already accepted via auth auto-accept , clear and continue.
    if (err instanceof ApiRequestError && err.status === 400) {
      clearInviteToken();
      return null;
    }
    // Leave token for AcceptInvitationPage if still recoverable; otherwise clear expired.
    if (err instanceof ApiRequestError && err.status === 410) {
      clearInviteToken();
    }
  }
  return null;
}

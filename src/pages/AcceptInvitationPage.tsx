import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workspaceChatPath } from '../hooks/useSessionInUrl';
import { clearInviteToken, peekInviteToken, persistInviteToken } from '../lib/inviteToken';
import { resolveAuthenticatedHomePath } from '../lib/resolveAuthenticatedHome';
import { apiClient } from '../services/apiClient';
import { authService } from '../services/authService';
import { formatInvitationErrorToast } from '../utils/apiErrorMessage';
import './AcceptInvitationPage.css';

type AcceptPhase = 'loading' | 'accepting' | 'success' | 'error' | 'need_auth';

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [phase, setPhase] = useState<AcceptPhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const tokenFromUrl = searchParams.get('token')?.trim() || null;

  useEffect(() => {
    if (tokenFromUrl) {
      persistInviteToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  useEffect(() => {
    if (authLoading) return;

    const token = tokenFromUrl || peekInviteToken();

    if (!token) {
      setPhase('error');
      setError(
        'This invite link is missing a token. Ask the workspace owner to send a new invite.',
      );
      return;
    }

    if (!user) {
      setPhase('need_auth');
      return;
    }

    if (attemptedRef.current) return;
    attemptedRef.current = true;

    let cancelled = false;
    (async () => {
      setPhase('accepting');
      try {
        const authToken =
          (await authService.getValidIdToken(false)) ?? (await authService.getValidIdToken(true));
        if (!authToken) {
          if (!cancelled) {
            setPhase('need_auth');
            attemptedRef.current = false;
          }
          return;
        }

        const result = await apiClient.acceptInvitation(authToken, token);
        clearInviteToken();
        if (cancelled) return;
        const targetId = result.workspace_id;
        setWorkspaceId(targetId ?? null);
        setPhase('success');
        if (targetId) {
          navigate(workspaceChatPath(targetId), { replace: true });
        } else {
          const home = await resolveAuthenticatedHomePath();
          if (!cancelled) navigate(home, { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        clearInviteToken();
        setError(formatInvitationErrorToast(err));
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, tokenFromUrl, navigate]);

  const inviteQuery = tokenFromUrl ? `?invite_token=${encodeURIComponent(tokenFromUrl)}` : '';

  if (phase === 'loading' || phase === 'accepting' || authLoading) {
    return (
      <div className="accept-invite-page">
        <div className="accept-invite-card">
          <p className="accept-invite-lede">Joining workspace…</p>
        </div>
      </div>
    );
  }

  if (phase === 'need_auth') {
    return (
      <div className="accept-invite-page">
        <div className="accept-invite-card">
          <h1 className="accept-invite-title">You&apos;re invited</h1>
          <p className="accept-invite-lede">
            Sign in with the email that received this invite to join the workspace.
          </p>
          <div className="accept-invite-actions">
            <Link className="btn-gradient-primary" to={`/signin${inviteQuery}`}>
              Sign in
            </Link>
            <Link className="accept-invite-link" to={`/signup${inviteQuery}`}>
              Create an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="accept-invite-page">
        <div className="accept-invite-card">
          <h1 className="accept-invite-title">Invite unavailable</h1>
          <p className="accept-invite-lede">{error}</p>
          <div className="accept-invite-actions">
            <Link className="btn-gradient-primary" to="/signin">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="accept-invite-page">
      <div className="accept-invite-card">
        <h1 className="accept-invite-title">You&apos;re in</h1>
        <p className="accept-invite-lede">
          {workspaceId ? 'Opening workspace…' : 'Invitation accepted.'}
        </p>
      </div>
    </div>
  );
}

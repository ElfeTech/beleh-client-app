import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { resolveAuthenticatedHomePath } from '../lib/resolveAuthenticatedHome';
import { captureInviteTokenFromLocation, persistInviteToken } from '../lib/inviteToken';
import { completePendingInviteAccept } from '../lib/completePendingInviteAccept';
import { safeReturnPath } from '../lib/publicRoutes';
import { AuthGatewayTransition } from '../components/auth/AuthGatewayTransition';
import { AuthGoogleSplitPage } from '../components/auth/AuthGoogleSplitPage';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { SITE_NAME } from '../constants/site';

export function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { user, loading: authLoadingState, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  useDocumentMeta({
    title: `Sign in | ${SITE_NAME}`,
    description: 'Sign in to Beleh AI to ask your data questions and explore workspaces.',
    path: '/signin',
  });

  useEffect(() => {
    const fromQuery = searchParams.get('invite_token')?.trim();
    if (fromQuery) {
      persistInviteToken(fromQuery);
    } else {
      captureInviteTokenFromLocation();
    }
  }, [searchParams]);

  useEffect(() => {
    if (authLoadingState || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const token =
          (await authService.getValidIdToken(false)) ?? (await authService.getValidIdToken(true));
        if (!token || cancelled) return;

        const invitePath = await completePendingInviteAccept();
        if (cancelled) return;
        if (invitePath) {
          navigate(invitePath, { replace: true });
          return;
        }

        const returnTo = safeReturnPath(searchParams.get('next'));
        if (returnTo) {
          navigate(returnTo, { replace: true });
          return;
        }

        const path = await resolveAuthenticatedHomePath();
        if (!cancelled) navigate(path, { replace: true });
      } catch {
        if (!cancelled) navigate('/', { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoadingState, navigate, searchParams]);

  const showGatewayTransition = authLoading || (!authLoadingState && !!user);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setAuthLoading(true);
      await signInWithGoogle();
    } catch (err) {
      setAuthLoading(false);
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      console.error(err);
    }
  };

  if (showGatewayTransition) {
    return <AuthGatewayTransition phase={user ? 'authorized' : 'signin'} />;
  }

  return (
    <AuthGoogleSplitPage
      mode="signin"
      error={error}
      authLoading={authLoading}
      onGoogleAuth={handleGoogleSignIn}
    />
  );
}

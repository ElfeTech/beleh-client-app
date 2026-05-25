import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { resolveAuthenticatedHomePath } from '../lib/resolveAuthenticatedHome';
import { AuthGatewayTransition } from '../components/auth/AuthGatewayTransition';
import { AuthGoogleSplitPage } from '../components/auth/AuthGoogleSplitPage';

export function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const { user, loading: authLoadingState, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoadingState || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const token =
          (await authService.getValidIdToken(false)) ?? (await authService.getValidIdToken(true));
        if (!token || cancelled) return;
        const path = await resolveAuthenticatedHomePath();
        if (!cancelled) navigate(path, { replace: true });
      } catch {
        if (!cancelled) navigate('/', { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoadingState, navigate]);

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

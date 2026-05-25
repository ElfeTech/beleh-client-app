import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService, GOOGLE_SIGNUP_FLOW_KEY } from '../services/authService';
import { resolveAuthenticatedHomePath } from '../lib/resolveAuthenticatedHome';
import { setNewUserFlag } from '../constants/demoData';
import { AuthGatewayTransition } from '../components/auth/AuthGatewayTransition';
import { AuthGoogleSplitPage } from '../components/auth/AuthGoogleSplitPage';

export function SignUp() {
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const { user, loading: authLoadingState, registerWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoadingState || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const token =
          (await authService.getValidIdToken(false)) ?? (await authService.getValidIdToken(true));
        if (!token || cancelled) return;

        try {
          if (localStorage.getItem(GOOGLE_SIGNUP_FLOW_KEY) === '1') {
            setNewUserFlag(true);
            localStorage.removeItem(GOOGLE_SIGNUP_FLOW_KEY);
          }
        } catch {
          /* storage disabled */
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
  }, [user, authLoadingState, navigate]);

  const showGatewayTransition = authLoading || (!authLoadingState && !!user);

  const handleGoogleSignUp = async () => {
    try {
      setError(null);
      setAuthLoading(true);
      await registerWithGoogle();
    } catch (err) {
      setAuthLoading(false);
      try {
        localStorage.removeItem(GOOGLE_SIGNUP_FLOW_KEY);
      } catch {
        /* ignore */
      }

      setError(err instanceof Error ? err.message : 'Google sign-up failed. Please try again.');
      console.error(err);
    }
  };

  if (showGatewayTransition) {
    return <AuthGatewayTransition phase={user ? 'authorized' : 'signin'} />;
  }

  return (
    <AuthGoogleSplitPage
      mode="signup"
      error={error}
      authLoading={authLoading}
      onGoogleAuth={handleGoogleSignUp}
    />
  );
}

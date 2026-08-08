import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { signInPathWithReturn } from '../../lib/publicRoutes';
import {
  invalidateSessionValidationCache,
  isSessionValidationFresh,
  markSessionValidated,
} from '../../lib/sessionValidationCache';
import { ApiRequestError } from '../../utils/apiErrorMessage';
import { AuthRestoreSpinner } from './AuthRestoreSpinner';
import { ServerErrorPage } from '../../pages/ServerErrorPage';

type GateStatus = 'checking' | 'ready' | 'unauthenticated' | 'server_error';

interface AuthSessionGateProps {
  children: ReactNode;
}

/**
 * Route-level auth session middleware for all non-public app routes.
 * Validates Firebase user + ID token + backend GET /api/users/me (TTL-cached).
 * Hard refresh uses a lightweight spinner; marketing gateway stays on SignIn/SignUp only.
 */
export function AuthSessionGate({ children }: AuthSessionGateProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<GateStatus>('checking');
  const [serverError, setServerError] = useState<Error | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (authLoading) {
      setStatus('checking');
      return;
    }

    let cancelled = false;

    const run = async () => {
      setServerError(null);

      if (!user) {
        invalidateSessionValidationCache();
        if (!cancelled) setStatus('unauthenticated');
        return;
      }

      // Persisted / in-memory TTL hit → render app immediately (soft-revalidate in background).
      if (isSessionValidationFresh(user.uid)) {
        if (!cancelled) setStatus('ready');
        void softRevalidate(user.uid, () => cancelled);
        return;
      }

      if (!cancelled) setStatus('checking');

      try {
        let token = await authService.getValidIdToken(false);
        if (cancelled) return;

        if (!token) {
          token = await authService.getValidIdToken(true);
        }
        if (cancelled) return;

        if (!token) {
          invalidateSessionValidationCache();
          setStatus('unauthenticated');
          return;
        }

        try {
          await apiClient.getUserMe(token);
        } catch (err) {
          if (cancelled) return;
          const statusCode = err instanceof ApiRequestError ? err.status : undefined;
          if (statusCode === 401) {
            const refreshed = await authService.getValidIdToken(true);
            if (cancelled) return;
            if (!refreshed) throw err;
            await apiClient.getUserMe(refreshed);
          } else {
            throw err;
          }
        }

        if (cancelled) return;
        markSessionValidated(user.uid);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const statusCode = err instanceof ApiRequestError ? err.status : undefined;

        if (statusCode === 401) {
          invalidateSessionValidationCache();
          try {
            await authService.signOut();
          } catch {
            /* ignore */
          }
          if (!cancelled) setStatus('unauthenticated');
          return;
        }

        setServerError(err instanceof Error ? err : new Error('Session validation failed'));
        setStatus('server_error');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, retryToken]);

  if (authLoading || status === 'checking') {
    return <AuthRestoreSpinner />;
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <Navigate
        to={signInPathWithReturn(location.pathname, location.search)}
        replace
        state={{ from: location }}
      />
    );
  }

  if (status === 'server_error') {
    return (
      <ServerErrorPage
        error={serverError}
        onRetry={() => {
          invalidateSessionValidationCache();
          setRetryToken((n) => n + 1);
        }}
      />
    );
  }

  return <>{children}</>;
}

/** Background revalidation when TTL says fresh — refresh stamp on success, ignore soft failures. */
async function softRevalidate(uid: string, isCancelled: () => boolean): Promise<void> {
  try {
    const token = await authService.getValidIdToken(false);
    if (isCancelled() || !token) return;
    await apiClient.getUserMe(token);
    if (isCancelled()) return;
    markSessionValidated(uid);
  } catch {
    /* keep serving; next navigation or hard miss will re-check */
  }
}

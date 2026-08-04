import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import { authService, clearSessionLocal } from '../../services/authService';
import { signInPathWithReturn } from '../../lib/publicRoutes';
import {
  invalidateSessionValidationCache,
  isSessionValidationFresh,
  markSessionValidated,
} from '../../lib/sessionValidationCache';
import { ApiRequestError } from '../../utils/apiErrorMessage';
import { AuthGatewayTransition } from './AuthGatewayTransition';
import { ServerErrorPage } from '../../pages/ServerErrorPage';

type GateStatus = 'checking' | 'ready' | 'unauthenticated' | 'server_error';

interface AuthSessionGateProps {
  children: ReactNode;
}

/**
 * Route-level auth session middleware for all non-public app routes.
 * Validates Firebase user + ID token + backend GET /api/users/me (TTL-cached).
 */
export function AuthSessionGate({ children }: AuthSessionGateProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<GateStatus>('checking');
  const [serverError, setServerError] = useState<Error | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const validate = useCallback(async () => {
    setStatus('checking');
    setServerError(null);

    if (!user) {
      invalidateSessionValidationCache();
      setStatus('unauthenticated');
      return;
    }

    if (isSessionValidationFresh(user.uid)) {
      setStatus('ready');
      return;
    }

    try {
      const token = await authService.getValidIdToken(true);
      if (!token) {
        clearSessionLocal();
        invalidateSessionValidationCache();
        setStatus('unauthenticated');
        return;
      }

      await apiClient.getUserMe(token);
      markSessionValidated(user.uid);
      setStatus('ready');
    } catch (err) {
      const statusCode = err instanceof ApiRequestError ? err.status : undefined;

      // Auth / identity failures , including 404 when Firebase user is not in the DB.
      const isAuthFailure =
        statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 400;

      if (isAuthFailure) {
        clearSessionLocal();
        invalidateSessionValidationCache();
        try {
          await authService.signOut();
        } catch {
          /* already cleared locally */
        }
        setStatus('unauthenticated');
        return;
      }

      // True server / availability problems , show 500 with retry.
      if (statusCode == null || statusCode >= 500) {
        setServerError(err instanceof Error ? err : new Error('Session validation failed'));
        setStatus('server_error');
        return;
      }

      // Other unexpected 4xx (e.g. 429) , retryable without forced sign-out.
      setServerError(err instanceof Error ? err : new Error('Session validation failed'));
      setStatus('server_error');
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) {
      setStatus('checking');
      return;
    }
    void validate();
  }, [authLoading, validate, retryToken]);

  if (authLoading || status === 'checking') {
    return <AuthGatewayTransition phase="authorized" />;
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

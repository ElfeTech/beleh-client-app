import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { isPublicPath, signInPathWithReturn } from '../../lib/publicRoutes';
import { invalidateSessionValidationCache } from '../../lib/sessionValidationCache';

/**
 * Global auth session watcher: when Firebase user becomes null on a protected
 * path after we previously observed a signed-in user (sign-out, session expiry),
 * redirect to sign-in with a safe return URL.
 *
 * Cold load with no session is handled by AuthSessionGate — do not redirect here
 * before a real authenticated → signed-out transition.
 */
export function AuthSessionWatcher() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hadUserRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (user) {
      hadUserRef.current = true;
      return;
    }

    // Cold load / never signed in this tab — Gate handles protected deep links.
    if (!hadUserRef.current) return;

    if (isPublicPath(location.pathname) || location.pathname === '/signin') {
      hadUserRef.current = false;
      return;
    }

    invalidateSessionValidationCache();
    navigate(signInPathWithReturn(location.pathname, location.search), {
      replace: true,
      state: { from: location },
    });
    hadUserRef.current = false;
  }, [user, loading, location.pathname, location.search, location, navigate]);

  return null;
}

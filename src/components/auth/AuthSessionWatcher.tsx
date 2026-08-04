import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { isPublicPath, signInPathWithReturn } from '../../lib/publicRoutes';
import { invalidateSessionValidationCache } from '../../lib/sessionValidationCache';

/**
 * Global auth session watcher: when Firebase user becomes null on a protected
 * path (sign-out, session expiry), redirect to sign-in with a safe return URL.
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

    // Only redirect after we previously observed a signed-in user, or when
    // landing on a protected path with no user (deep link without session).
    const onProtected = !isPublicPath(location.pathname);
    if (!onProtected) {
      hadUserRef.current = false;
      return;
    }

    invalidateSessionValidationCache();
    const to = signInPathWithReturn(location.pathname, location.search);
    // Avoid bouncing if already navigating to sign-in
    if (location.pathname === '/signin') return;
    navigate(to, { replace: true, state: { from: location } });
    hadUserRef.current = false;
  }, [user, loading, location.pathname, location.search, location, navigate]);

  return null;
}

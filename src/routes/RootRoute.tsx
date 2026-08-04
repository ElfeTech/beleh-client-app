import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { resolveAuthenticatedHomePath } from '../lib/resolveAuthenticatedHome';
import LandingPage from '../pages/LandingPage';

export function RootRoute() {
  const { user, loading } = useAuth();
  const [homePath, setHomePath] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) {
      setHomePath(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const path = await resolveAuthenticatedHomePath();
        if (!cancelled) setHomePath(path);
      } catch {
        if (!cancelled) setHomePath('/settings/workspaces');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading) {
    return null;
  }

  if (user) {
    if (homePath) {
      return <Navigate to={homePath} replace />;
    }
    return null;
  }

  return <LandingPage />;
}

import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { resolveAuthenticatedHomePath } from '../lib/resolveAuthenticatedHome';
import { ErrorPageShell } from '../components/errors/ErrorPageShell';

/**
 * Public 404 page for unknown routes.
 */
export function NotFoundPage() {
  const { user, loading } = useAuth();
  const [homePath, setHomePath] = useState('/');

  useEffect(() => {
    if (loading || !user) {
      setHomePath('/');
      return;
    }
    let cancelled = false;
    void resolveAuthenticatedHomePath()
      .then((path) => {
        if (!cancelled) setHomePath(path);
      })
      .catch(() => {
        if (!cancelled) setHomePath('/');
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const actions = user
    ? [
        { label: 'Go to workspace', to: homePath, variant: 'primary' as const },
        { label: 'Home', to: '/', variant: 'secondary' as const },
      ]
    : [
        { label: 'Home', to: '/', variant: 'primary' as const },
        { label: 'Sign in', to: '/signin', variant: 'secondary' as const },
      ];

  return (
    <ErrorPageShell
      code="404"
      title="Page not found"
      description="The page you’re looking for doesn’t exist or may have been moved."
      actions={actions}
    />
  );
}

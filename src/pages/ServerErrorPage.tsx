import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ErrorPageShell, type ErrorPageAction } from '../components/errors/ErrorPageShell';

interface ServerErrorPageProps {
  error?: Error | null;
  onRetry?: () => void;
}

/**
 * Full-page 500 / unexpected error UI.
 * Used by ErrorBoundary and AuthSessionGate validation failures.
 * Safe outside AuthProvider (user treated as signed-out).
 */
export function ServerErrorPage({ error, onRetry }: ServerErrorPageProps) {
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const isDev = import.meta.env.DEV;
  const detail = isDev && error?.message ? error.message : null;

  const actions: ErrorPageAction[] = [];

  if (onRetry) {
    actions.push({
      label: 'Try again',
      onClick: onRetry,
      variant: 'primary',
    });
  }

  actions.push({
    label: 'Go home',
    to: '/',
    variant: onRetry ? 'secondary' : 'primary',
  });

  if (!user) {
    actions.push({
      label: 'Sign in',
      to: '/signin',
      variant: 'secondary',
    });
  }

  return (
    <ErrorPageShell
      code="500"
      title="Something went wrong"
      description="An unexpected error occurred. You can try again or return home."
      detail={detail}
      actions={actions}
    />
  );
}

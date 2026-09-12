import type { ReactNode } from 'react';
import { AuthSessionGate } from './auth/AuthSessionGate';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * @deprecated Prefer AuthSessionGate directly.
 * Thin wrapper kept for call-site compatibility , delegates to AuthSessionGate.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <AuthSessionGate>{children}</AuthSessionGate>;
}

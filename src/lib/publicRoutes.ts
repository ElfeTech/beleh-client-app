/**
 * Paths that do not require a signed-in Firebase user.
 * Everything else must go through AuthSessionGate.
 */
export const PUBLIC_EXACT_PATHS = new Set([
  '/',
  '/pricing',
  '/signin',
  '/signup',
  '/invitations/accept',
  '/auth/provider/callback',
  '/error',
]);

/** Public paths that may still be used as post-auth `?next=` return targets. */
const RETURN_ALLOWED_PUBLIC_PATHS = new Set(['/pricing']);

/** Prefixes that remain public (OAuth / provider callbacks). */
export const PUBLIC_PATH_PREFIXES = ['/auth/', '/legal'] as const;

export function isPublicPath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/';
  if (PUBLIC_EXACT_PATHS.has(path)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Safe in-app return path after sign-in.
 * Rejects absolute URLs, protocol-relative URLs, and public auth/landing pages.
 */
export function safeReturnPath(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//')) return null;
  if (trimmed.includes('://')) return null;

  const pathOnly = trimmed.split('?')[0] || '/';
  if (RETURN_ALLOWED_PUBLIC_PATHS.has(pathOnly)) return trimmed;
  if (isPublicPath(pathOnly)) return null;
  // Avoid sending users back into a bare catch-all loop target.
  if (pathOnly === '*') return null;
  return trimmed;
}

/** Build /signin URL that returns the user to the intended app path after auth. */
export function signInPathWithReturn(fromPathname: string, fromSearch = ''): string {
  const next = safeReturnPath(`${fromPathname}${fromSearch}`);
  if (!next) return '/signin';
  return `/signin?next=${encodeURIComponent(next)}`;
}

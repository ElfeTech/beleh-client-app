/** sessionStorage key for invite token through Google auth popup. */
export const INVITE_TOKEN_SESSION_KEY = 'beleh_invite_token';

export function readInviteTokenFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const token = params.get('invite_token') ?? params.get('token');
    const trimmed = token?.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

export function persistInviteToken(token: string | null | undefined): void {
  try {
    const trimmed = token?.trim();
    if (!trimmed) {
      sessionStorage.removeItem(INVITE_TOKEN_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(INVITE_TOKEN_SESSION_KEY, trimmed);
  } catch {
    /* storage disabled */
  }
}

export function peekInviteToken(): string | null {
  try {
    const value = sessionStorage.getItem(INVITE_TOKEN_SESSION_KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function takeInviteToken(): string | null {
  const token = peekInviteToken();
  clearInviteToken();
  return token;
}

export function clearInviteToken(): void {
  try {
    sessionStorage.removeItem(INVITE_TOKEN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Capture invite token from URL into sessionStorage without logging the value. */
export function captureInviteTokenFromLocation(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  const token = readInviteTokenFromSearch(search);
  if (token) persistInviteToken(token);
  return token ?? peekInviteToken();
}

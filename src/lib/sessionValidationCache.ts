/** In-memory TTL so AuthSessionGate does not spam GET /api/users/me on every navigation. */
const SESSION_VALIDATION_TTL_MS = 60_000;

let lastValidatedUid: string | null = null;
let lastValidatedAt = 0;

export function isSessionValidationFresh(uid: string): boolean {
  if (!uid || lastValidatedUid !== uid) return false;
  return Date.now() - lastValidatedAt < SESSION_VALIDATION_TTL_MS;
}

export function markSessionValidated(uid: string): void {
  lastValidatedUid = uid;
  lastValidatedAt = Date.now();
}

export function invalidateSessionValidationCache(): void {
  lastValidatedUid = null;
  lastValidatedAt = 0;
}

import type { WorkspaceMember } from '../types/api';

/** Flatten nested `user` from WorkspaceMemberResponse for UI convenience. */
export function normalizeWorkspaceMember(raw: WorkspaceMember): WorkspaceMember {
  const email = raw.email ?? raw.user?.email ?? null;
  const display_name = raw.display_name ?? raw.user?.display_name ?? null;
  const photo_url = raw.photo_url ?? raw.user?.photo_url ?? null;
  return {
    ...raw,
    email,
    display_name,
    photo_url,
  };
}

/** Match membership to the signed-in Firebase user (uid or email). */
export function isWorkspaceMemberSelf(
  member: WorkspaceMember,
  firebaseUid: string | null | undefined,
  firebaseEmail: string | null | undefined,
): boolean {
  if (firebaseUid && (member.user?.uid === firebaseUid || member.user_id === firebaseUid)) {
    return true;
  }
  const memberEmail = (member.email ?? member.user?.email)?.toLowerCase();
  const selfEmail = firebaseEmail?.toLowerCase();
  return Boolean(memberEmail && selfEmail && memberEmail === selfEmail);
}

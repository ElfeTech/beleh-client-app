/**
 * Newest `updated_at` (falling back to `created_at`) first.
 * Invalid / missing dates sort to the end.
 */
export function sortByUpdatedAtDesc<
  T extends { updated_at?: string | null; created_at?: string | null },
>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.updated_at || a.created_at || '') || 0;
    const bTime = Date.parse(b.updated_at || b.created_at || '') || 0;
    return bTime - aTime;
  });
}

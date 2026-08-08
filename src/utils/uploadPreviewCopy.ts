/** Shared copy for Excel upload preview samples (sliced rows, not full sheet). */

export function formatPreviewSampleCaption(rowCount: number | null | undefined): string {
  const n = typeof rowCount === 'number' && rowCount > 0 ? rowCount : null;
  if (n == null) {
    return 'Showing a preview sample — not the full sheet. Full data imports after you confirm.';
  }
  return `Showing a preview sample (first ${n} row${n === 1 ? '' : 's'}) — not the full sheet.`;
}

export const SHEETS_PREVIEW_SUBCOPY =
  'Preview uses a sample of each sheet so you can choose what to import. Full data is ingested after you confirm.';

export function formatSheetPreviewHint(rowCount: number | null | undefined): string {
  const n = typeof rowCount === 'number' && rowCount > 0 ? rowCount : null;
  if (n == null) return 'Preview sample';
  return `Preview: first ${n} row${n === 1 ? '' : 's'}`;
}

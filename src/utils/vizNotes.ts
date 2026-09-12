/** Collapse whitespace for containment checks against narrative text. */
function normalizeNoteText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function noteKey(value: string): string {
  return normalizeNoteText(value).toLowerCase();
}

/** Deduplicate viz remap notes, dropping blanks. */
export function uniqueVizNotes(notes: string[] | undefined): string[] {
  if (!notes?.length) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const note of notes) {
    const trimmed = normalizeNoteText(note);
    if (!trimmed) continue;
    const key = noteKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function tidyNarrative(value: string): string {
  return value
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .join('\n\n')
    .replace(/ {2,}/g, ' ')
    .replace(/^[\s,.;:—-]+/, '')
    .trim();
}

function stripKpiRemapSentences(text: string): string {
  return text
    .split(/(?<=\.)\s+/)
    .filter((sentence) => !sentence.toLowerCase().includes('clearer as a kpi card'))
    .join(' ');
}

/**
 * Remove viz remap sentences from the assistant narrative.
 * The API often copies `meta.viz_notes` into `text` (and duplicates the array).
 */
export function stripVizNotesFromText(text: string, notes: string[]): string {
  if (!text.trim()) return '';

  let result = text;
  for (const note of notes) {
    const pattern = new RegExp(escapeRegExp(note).replaceAll(' ', String.raw`\s+`), 'gi');
    result = result.replace(pattern, ' ');
  }

  result = stripKpiRemapSentences(result);
  return tidyNarrative(result);
}

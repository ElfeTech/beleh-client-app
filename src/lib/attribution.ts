/**
 * Marketing attribution (UTM / click IDs / referrer).
 * First touch persists in localStorage, last touch in sessionStorage, so the
 * campaign survives the landing page -> /signup navigation and Google popup.
 */

export const FIRST_TOUCH_KEY = 'beleh_attribution_first';
export const LAST_TOUCH_KEY = 'beleh_attribution_last';

const TRACKED_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
] as const;

export type Attribution = Partial<Record<(typeof TRACKED_PARAMS)[number], string>> & {
  referrer?: string;
  landing_path?: string;
  captured_at?: string;
};

function readAttributionFromLocation(): Attribution | null {
  const params = new URLSearchParams(window.location.search);
  const found: Attribution = {};
  for (const key of TRACKED_PARAMS) {
    const value = params.get(key)?.trim();
    if (value) found[key] = value.slice(0, 200);
  }
  if (Object.keys(found).length === 0) return null;

  found.landing_path = window.location.pathname;
  found.captured_at = new Date().toISOString();
  return found;
}

function externalReferrer(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const url = new URL(document.referrer);
    return url.origin === window.location.origin ? undefined : url.origin;
  } catch {
    return undefined;
  }
}

function readStored(storage: Storage, key: string): Attribution | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

function writeStored(storage: Storage, key: string, value: Attribution): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage disabled */
  }
}

/** Capture attribution from the current URL. Returns the captured touch, if any. */
export function captureAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  const touch = readAttributionFromLocation();
  if (!touch) return null;

  const referrer = externalReferrer();
  if (referrer) touch.referrer = referrer;

  writeStored(sessionStorage, LAST_TOUCH_KEY, touch);
  if (!readStored(localStorage, FIRST_TOUCH_KEY)) writeStored(localStorage, FIRST_TOUCH_KEY, touch);
  return touch;
}

/** Flat first-touch fields (utm_source, ...) for dataLayer events. */
export function flattenAttribution(
  attribution: ReturnType<typeof getAttributionForSignup>,
): Record<string, string> {
  const first = attribution?.first_touch ?? {};
  const out: Record<string, string> = {};
  for (const key of TRACKED_PARAMS) if (first[key]) out[`first_${key}`] = first[key] as string;
  return out;
}

/** Attribution to send with sign-up: first touch, plus last touch when it differs. */
export function getAttributionForSignup(): {
  first_touch?: Attribution;
  last_touch?: Attribution;
} | null {
  if (typeof window === 'undefined') return null;
  const first = readStored(localStorage, FIRST_TOUCH_KEY);
  const last = readStored(sessionStorage, LAST_TOUCH_KEY);
  if (!first && !last) return null;
  return {
    ...(first ? { first_touch: first } : {}),
    ...(last && last.captured_at !== first?.captured_at ? { last_touch: last } : {}),
  };
}

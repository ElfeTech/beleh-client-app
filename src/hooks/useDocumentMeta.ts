import { useEffect } from 'react';
import { SITE_DESCRIPTION, SITE_OG_IMAGE, SITE_TITLE, SITE_URL } from '../constants/site';

function setMetaBySelector(selector: string, attr: 'content' | 'href', value: string): void {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/**
 * Keeps document title + primary social/canonical tags aligned on public routes.
 * Static tags in index.html remain the crawlable source of truth for first paint.
 */
export function useDocumentMeta(options?: {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}): void {
  const title = options?.title ?? SITE_TITLE;
  const description = options?.description ?? SITE_DESCRIPTION;
  const path = options?.path ?? '/';
  const noIndex = options?.noIndex ?? false;
  const url = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    setMetaBySelector('meta[name="description"]', 'content', description);
    setMetaBySelector(
      'meta[name="robots"]',
      'content',
      noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );
    setMetaBySelector('link[rel="canonical"]', 'href', url);
    setMetaBySelector('meta[property="og:url"]', 'content', url);
    setMetaBySelector('meta[property="og:title"]', 'content', title);
    setMetaBySelector('meta[property="og:description"]', 'content', description);
    setMetaBySelector('meta[property="og:image"]', 'content', SITE_OG_IMAGE);
    setMetaBySelector('meta[name="twitter:url"]', 'content', url);
    setMetaBySelector('meta[name="twitter:title"]', 'content', title);
    setMetaBySelector('meta[name="twitter:description"]', 'content', description);
    setMetaBySelector('meta[name="twitter:image"]', 'content', SITE_OG_IMAGE);

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, url, noIndex]);
}

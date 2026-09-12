import termsMarkdown from '../../../docs/legal-docs/terms-of-use.md?raw';
import privacyMarkdown from '../../../docs/legal-docs/privacy-policy.md?raw';
import cookiesMarkdown from '../../../docs/legal-docs/cookie-ploicy.md?raw';
import dpaMarkdown from '../../../docs/legal-docs/data-processing-agreement.md?raw';
import aupMarkdown from '../../../docs/legal-docs/acceptable-use-plocy.md?raw';

export type LegalDocument = {
  slug: string;
  title: string;
  updated: string;
  summary: string;
  markdown: string;
};

export const LEGAL_UPDATED = '15 August 2026';

/** Drop the H1 / last-updated preamble so the page chrome is not duplicated. */
function legalBody(raw: string): string {
  const divider = '\n---\n';
  const idx = raw.indexOf(divider);
  if (idx === -1) return raw.trim();
  return raw.slice(idx + divider.length).trim();
}

export const LEGAL_DOCS: LegalDocument[] = [
  {
    slug: 'terms',
    title: 'Terms of Use',
    updated: LEGAL_UPDATED,
    summary:
      'These Terms of Use are a binding legal agreement between Yulona FZE LLC and the person or entity accessing or using Beleh AI.',
    markdown: legalBody(termsMarkdown),
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    updated: LEGAL_UPDATED,
    summary:
      'How Yulona FZE LLC collects, uses, discloses, and protects personal data in connection with Beleh AI.',
    markdown: legalBody(privacyMarkdown),
  },
  {
    slug: 'cookies',
    title: 'Cookie Policy',
    updated: LEGAL_UPDATED,
    summary:
      'How Yulona FZE LLC uses cookies and similar technologies on Beleh AI and yulona.co.',
    markdown: legalBody(cookiesMarkdown),
  },
  {
    slug: 'dpa',
    title: 'Data Processing Agreement',
    updated: LEGAL_UPDATED,
    summary:
      'Processor terms for Customer Personal Data that Yulona FZE LLC processes on behalf of workspace customers using Beleh AI.',
    markdown: legalBody(dpaMarkdown),
  },
  {
    slug: 'aup',
    title: 'Acceptable Use Policy',
    updated: LEGAL_UPDATED,
    summary: 'Rules for using Beleh AI lawfully, including security, data, and AI-output restrictions.',
    markdown: legalBody(aupMarkdown),
  },
];

export const LEGAL_SLUGS = LEGAL_DOCS.map((d) => d.slug);

export function getLegalDocument(slug: string | null | undefined): LegalDocument | undefined {
  if (!slug) return undefined;
  return LEGAL_DOCS.find((d) => d.slug === slug);
}

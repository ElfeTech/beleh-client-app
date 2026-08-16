import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import type { LegalDocument } from '../../content/legal/documents';
import { SITE_URL } from '../../constants/site';
import './LegalDocumentView.css';

function LegalMarkdownLink({ href, children }: Readonly<{ href?: string; children: ReactNode }>) {
  if (!href) return <span>{children}</span>;
  if (href.startsWith('/')) {
    return <Link to={href}>{children}</Link>;
  }
  if (href.startsWith(SITE_URL)) {
    const path = href.slice(SITE_URL.length) || '/';
    return <Link to={path}>{children}</Link>;
  }
  if (href.startsWith('mailto:')) {
    return <a href={href}>{children}</a>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function LegalTable({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="legal-doc__table-wrap">
      <table>{children}</table>
    </div>
  );
}

const legalMarkdownComponents: Components = {
  a: ({ href, children }) => <LegalMarkdownLink href={href}>{children}</LegalMarkdownLink>,
  table: ({ children }) => <LegalTable>{children}</LegalTable>,
};

export function LegalDocumentView({ doc }: Readonly<{ doc: LegalDocument }>) {
  return (
    <article className="legal-doc">
      <header className="legal-doc__header">
        <h1 className="legal-doc__title">{doc.title}</h1>
        <p className="legal-doc__meta">Last updated: {doc.updated}</p>
        {doc.summary ? <p className="legal-doc__summary">{doc.summary}</p> : null}
      </header>
      <div className="legal-doc__body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={legalMarkdownComponents}>
          {doc.markdown}
        </ReactMarkdown>
      </div>
      <p className="legal-doc__disclaimer">
        These documents are provided for product transparency and do not constitute legal advice.
        Have counsel review them before relying on them for your organization.
      </p>
    </article>
  );
}

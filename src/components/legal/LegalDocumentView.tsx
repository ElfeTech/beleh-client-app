import type { LegalDocument } from '../../content/legal/documents';
import './LegalDocumentView.css';

export function LegalDocumentView({ doc }: Readonly<{ doc: LegalDocument }>) {
  return (
    <article className="legal-doc">
      <header className="legal-doc__header">
        <h1 className="legal-doc__title">{doc.title}</h1>
        <p className="legal-doc__meta">Last updated: {doc.updated}</p>
        {doc.summary ? <p className="legal-doc__summary">{doc.summary}</p> : null}
      </header>
      {doc.sections.map((section) => (
        <section key={section.heading} className="legal-doc__section">
          <h2>{section.heading}</h2>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
          {section.bullets && section.bullets.length > 0 ? (
            <ul>
              {section.bullets.map((item) => (
                <li key={item.slice(0, 48)}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      <p className="legal-doc__disclaimer">
        These documents are provided for product transparency and do not constitute legal advice.
        Have counsel review them before relying on them for your organization.
      </p>
    </article>
  );
}

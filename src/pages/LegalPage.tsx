import { Link, Navigate, useParams } from 'react-router-dom';
import { LEGAL_DOCS, getLegalDocument } from '../content/legal/documents';
import { LegalDocumentView } from '../components/legal/LegalDocumentView';
import logo from '../assets/logo.webp';
import './LegalPage.css';

export function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const doc = getLegalDocument(slug);

  if (!doc) {
    return <Navigate to="/legal/terms" replace />;
  }

  return (
    <div className="legal-page">
      <header className="legal-page__nav">
        <Link to="/" className="legal-page__brand">
          <img src={logo} alt="" className="legal-page__logo" />
          <span>beleh</span>
        </Link>
        <nav className="legal-page__links" aria-label="Legal documents">
          {LEGAL_DOCS.map((item) => (
            <Link
              key={item.slug}
              to={`/legal/${item.slug}`}
              className={item.slug === doc.slug ? 'is-active' : undefined}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </header>
      <main className="legal-page__main">
        <LegalDocumentView doc={doc} />
      </main>
      <footer className="legal-page__footer">
        <p>© {new Date().getFullYear()} Yulona. Beleh (ብልህ) is a product of Yulona.</p>
        <Link to="/">Back to home</Link>
      </footer>
    </div>
  );
}

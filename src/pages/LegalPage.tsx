import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LEGAL_DOCS, getLegalDocument } from '../content/legal/documents';
import { LegalDocumentView } from '../components/legal/LegalDocumentView';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { SITE_NAME } from '../constants/site';
import logo from '../assets/logo.webp';
import './LegalPage.css';

function canNavigateBack(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === 'number' ? idx > 0 : window.history.length > 1;
}

export function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const doc = getLegalDocument(slug);

  useDocumentMeta(
    doc
      ? {
          title: `${doc.title} | ${SITE_NAME}`,
          description: `${doc.title} for Beleh AI by Yulona.`,
          path: `/legal/${doc.slug}`,
        }
      : { path: '/legal/terms' },
  );

  const handleBack = () => {
    if (canNavigateBack()) {
      navigate(-1);
      return;
    }
    navigate('/', { replace: true });
  };

  if (!doc) {
    return <Navigate to="/legal/terms" replace />;
  }

  return (
    <div className="legal-page">
      <header className="legal-page__nav">
        <div className="legal-page__nav-start">
          <button type="button" className="legal-page__back" onClick={handleBack}>
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
            Back
          </button>
          <Link to="/" className="legal-page__brand">
            <img src={logo} alt="" className="legal-page__logo" />
            <span>beleh</span>
          </Link>
        </div>
        <nav className="legal-page__links" aria-label="Legal documents">
          {LEGAL_DOCS.map((item) => (
            <Link
              key={item.slug}
              to={`/legal/${item.slug}`}
              replace
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
        <button type="button" className="legal-page__footer-back" onClick={handleBack}>
          Close and go back
        </button>
      </footer>
    </div>
  );
}

import { Info } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { APP_BUILD_ID, APP_VERSION } from '../../lib/appMeta';
import { LEGAL_DOCS, getLegalDocument } from '../../content/legal/documents';
import { LegalDocumentView } from '../legal/LegalDocumentView';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import './SettingsShared.css';
import './AboutSection.css';

const SOCIAL_LINKS = [
  {
    name: 'X',
    handle: '@theyulona',
    href: 'https://x.com/theyulona',
    color: '#000',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    handle: 'Yulona',
    href: 'https://www.linkedin.com/company/theyulona/',
    color: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    handle: 'theyulona',
    href: 'https://www.facebook.com/theyulona',
    color: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M22 12.07C22 6.5 17.52 2 12 2S2 6.5 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H8.08v-2.9h2.36V9.84c0-2.34 1.4-3.63 3.52-3.63.99 0 2.03.18 2.03.18v2.24h-1.14c-1.13 0-1.48.7-1.48 1.42v1.71h2.52l-.4 2.9h-2.12V22c4.78-.75 8.44-4.91 8.44-9.93z" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    handle: '@theyulona',
    href: 'https://www.tiktok.com/@theyulona',
    color: '#111',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.83 2.83 0 11-2.83-2.83c.28 0 .54.04.79.1V9.4a6.26 6.26 0 00-.79-.05 6.29 6.29 0 106.29 6.29V8.77a8.16 8.16 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z" />
      </svg>
    ),
  },
] as const;

const LEGAL_ICONS: Record<string, string> = {
  terms: 'document',
  privacy: 'shield',
  cookies: 'cookie',
  dpa: 'database',
  aup: 'check',
};

function LegalIcon({ kind }: Readonly<{ kind: string }>) {
  if (kind === 'shield') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  if (kind === 'cookie') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <circle cx="8" cy="9" r="1" />
        <circle cx="15" cy="9" r="1" />
        <circle cx="10" cy="15" r="1" />
        <circle cx="15" cy="14" r="1" />
      </svg>
    );
  }
  if (kind === 'database') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    );
  }
  if (kind === 'check') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export function AboutSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDoc = getLegalDocument(searchParams.get('doc'));

  return (
    <div className="settings-page-section about-section">
      <SettingsSectionHeader
        breadcrumbLabel="ABOUT"
        title="About"
        description="Learn more about Beleh (ብልህ) and our mission"
        icon={<Info size={20} strokeWidth={1.75} />}
      />

      <div className="settings-card app-info-card">
        <div className="settings-card__head settings-card__head--tight">
          <h2 className="settings-card__title">Application</h2>
          <span className="settings-card__badge settings-card__badge--success">Operational</span>
        </div>
        <div className="app-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="app-name">
            <h2>Beleh (ብልህ)</h2>
            <p>Transform your data into insights</p>
          </div>
        </div>

        <div className="version-info">
          <div className="version-item">
            <span className="label">Version</span>
            <span className="value">{APP_VERSION}</span>
          </div>
          <div className="version-divider" />
          <div className="version-item">
            <span className="label">Build</span>
            <span className="value">{APP_BUILD_ID}</span>
          </div>
          <div className="version-divider" />
          <div className="version-item">
            <span className="label">Status</span>
            <span className="value status">
              <span className="status-dot" />
              All systems operational
            </span>
          </div>
        </div>
      </div>

      <div className="settings-card mission-card">
        <div className="mission-content">
          <div className="mission-quote-mark" aria-hidden="true">
            <svg viewBox="0 0 80 64" fill="currentColor">
              <path d="M18 42c0-10 6-18 16-20v8c-5 1-8 5-8 10h8v20H10V42h8zm34 0c0-10 6-18 16-20v8c-5 1-8 5-8 10h8v20H44V42h8z" />
            </svg>
          </div>
          <div className="mission-body">
            <p className="mission-quote">
              We believe everyone should have the power to understand their data. Our mission is to
              democratize data analytics by making it as simple as having a conversation.
            </p>
            <p className="mission-signature">The Beleh Team</p>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Legal</h2>
          <span className="settings-card__badge settings-card__badge--muted">Documents</span>
        </div>
        {activeDoc ? (
          <div className="legal-viewer">
            <button
              type="button"
              className="legal-back-btn"
              onClick={() => setSearchParams({}, { replace: true })}
            >
              ← All documents
            </button>
            <LegalDocumentView doc={activeDoc} />
            <p className="legal-public-link">
              Public URL:{' '}
              <Link to={`/legal/${activeDoc.slug}`}>yulona.co/legal/{activeDoc.slug}</Link>
            </p>
          </div>
        ) : (
          <div className="legal-list">
            {LEGAL_DOCS.map((doc) => (
              <button
                key={doc.slug}
                type="button"
                className="legal-item"
                onClick={() => setSearchParams({ doc: doc.slug })}
              >
                <div className="legal-icon">
                  <LegalIcon kind={LEGAL_ICONS[doc.slug] ?? 'document'} />
                </div>
                <span>{doc.title}</span>
                <svg
                  className="chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="social-section">
        <h3>Follow Us</h3>
        <div className="social-links">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.name}
              className="social-link"
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ '--social-color': social.color } as React.CSSProperties}
            >
              <div className="social-icon">{social.icon}</div>
              <div className="social-info">
                <span className="social-name">{social.name}</span>
                <span className="social-handle">{social.handle}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="about-footer">
        <p>© {new Date().getFullYear()} Yulona. Beleh (ብልህ) is a product of Yulona.</p>
      </div>
    </div>
  );
}

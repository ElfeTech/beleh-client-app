import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logo from '../../assets/logo.webp';
import { AUTH_BRAND_PANEL, AUTH_FORM_COPY, type AuthGoogleSplitMode } from './authBrandContent';
import '../../pages/SignIn.css';

export type { AuthGoogleSplitMode };

interface AuthGoogleSplitPageProps {
  mode: AuthGoogleSplitMode;
  error: string | null;
  authLoading: boolean;
  onGoogleAuth: () => void;
}

const FOOTER_COPY: Record<
  AuthGoogleSplitMode,
  { text: string; linkLabel: string; linkTo: string }
> = {
  signin: {
    text: "Don't have an account?",
    linkLabel: 'sign up',
    linkTo: '/signup',
  },
  signup: {
    text: 'Already have an account?',
    linkLabel: 'sign in',
    linkTo: '/signin',
  },
};

const LOADING_LABEL: Record<AuthGoogleSplitMode, string> = {
  signin: 'Signing in...',
  signup: 'Creating account...',
};

function AuthBrandHeroWaves() {
  return (
    <svg
      className="landing-hero-bg-svg"
      viewBox="0 0 1440 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g className="drift">
        <path
          d="M-40 560 C 140 500, 260 620, 440 560 S 740 480, 920 560 S 1220 620, 1400 560 S 1700 480, 1880 560"
          stroke="#2FE6B8"
          strokeWidth="1.4"
          fill="none"
          opacity=".22"
        />
        <path
          d="M680 560 C 860 500, 980 620, 1160 560 S 1460 480, 1640 560 S 1940 620, 2120 560 S 2420 480, 2600 560"
          stroke="#2FE6B8"
          strokeWidth="1.4"
          fill="none"
          opacity=".22"
        />
      </g>
      <g className="drift slow">
        <path
          d="M-40 620 C 160 560, 300 680, 500 610 S 820 540, 1000 610 S 1320 680, 1500 610 S 1820 540, 2000 610"
          stroke="#3B82F6"
          strokeWidth="1.2"
          fill="none"
          opacity=".18"
        />
        <path
          d="M680 620 C 880 560, 1020 680, 1220 610 S 1540 540, 1720 610 S 2040 680, 2220 610 S 2540 540, 2720 610"
          stroke="#3B82F6"
          strokeWidth="1.2"
          fill="none"
          opacity=".18"
        />
      </g>
      <g className="drift" style={{ animationDuration: '58s' }}>
        <path
          d="M-40 460 C 200 410, 340 500, 560 450 S 900 400, 1080 450 S 1420 500, 1560 450"
          stroke="#2FE6B8"
          strokeWidth="1"
          fill="none"
          opacity=".13"
        />
        <path
          d="M680 460 C 920 410, 1060 500, 1280 450 S 1620 400, 1800 450 S 2140 500, 2280 450"
          stroke="#2FE6B8"
          strokeWidth="1"
          fill="none"
          opacity=".13"
        />
      </g>
      <circle
        className="dot"
        cx="180"
        cy="180"
        r="2.5"
        fill="#2FE6B8"
        opacity=".5"
        style={{ animationDelay: '0s' }}
      />
      <circle
        className="dot"
        cx="1240"
        cy="140"
        r="2"
        fill="#3B82F6"
        opacity=".5"
        style={{ animationDelay: '1.2s' }}
      />
      <circle
        className="dot"
        cx="960"
        cy="260"
        r="2.5"
        fill="#2FE6B8"
        opacity=".4"
        style={{ animationDelay: '2.1s' }}
      />
      <circle
        className="dot"
        cx="320"
        cy="320"
        r="2"
        fill="#3B82F6"
        opacity=".4"
        style={{ animationDelay: '.6s' }}
      />
      <circle
        className="dot"
        cx="1380"
        cy="320"
        r="2.5"
        fill="#2FE6B8"
        opacity=".35"
        style={{ animationDelay: '3s' }}
      />
    </svg>
  );
}

const LEGAL_CONSENT_ERROR = 'Please agree to the Terms of Use and Privacy Policy to create an account.';

export function AuthGoogleSplitPage({
  mode,
  error,
  authLoading,
  onGoogleAuth,
}: AuthGoogleSplitPageProps) {
  const footer = FOOTER_COPY[mode];
  const brand = AUTH_BRAND_PANEL;
  const form = AUTH_FORM_COPY[mode];
  const consentId = useId();
  const consentRef = useRef<HTMLInputElement>(null);
  const [agreedToLegal, setAgreedToLegal] = useState(false);
  const [needsLegalConsent, setNeedsLegalConsent] = useState(false);

  const showLegalConsent = mode === 'signup';
  const consentInvalid = showLegalConsent && needsLegalConsent && !agreedToLegal;
  const displayedError = consentInvalid ? LEGAL_CONSENT_ERROR : error;

  const handleGoogleClick = () => {
    if (showLegalConsent && !agreedToLegal) {
      setNeedsLegalConsent(true);
      consentRef.current?.focus();
      return;
    }
    onGoogleAuth();
  };

  return (
    <div className="auth-split-page">
      <div className="auth-brand-panel auth-brand-panel--signin">
        <div className="signin-brand-atmosphere" aria-hidden>
          <div className="signin-brand-atmosphere__glow" />
          <AuthBrandHeroWaves />
        </div>

        <div className="brand-content brand-content--signin">
          <h1 className="signin-brand-title">
            {brand.titleLine1}{' '}
            <span className="signin-brand-title__accent">{brand.titleAccent}</span>
          </h1>

          <p className="signin-brand-description">{brand.description}</p>

          <div className="signin-brand-cards">
            {brand.featureCards.map(({ icon: Icon, title, description }) => (
              <article key={title} className="signin-brand-card">
                <div className="signin-brand-card__icon" aria-hidden>
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <div className="signin-brand-card__body">
                  <h2 className="signin-brand-card__title">{title}</h2>
                  <p className="signin-brand-card__text">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-form-panel auth-form-panel--signin">
        <div className="form-content">
          <Link to="/" className="signin-back-home">
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
            Back to home
          </Link>

          <div className="signin-form-brand">
            <Link to="/" aria-label="Beleh home">
              <img src={logo} alt="Beleh" className="signin-form-logo" />
            </Link>
          </div>

          <div className="form-header">
            <h2 className="form-title">
              <span className="title-dot">.</span>
              {form.title}
            </h2>
            <p className="form-subtitle">{form.subtitle}</p>
            <p className="form-subtitle form-subtitle--hint">{form.hint}</p>
          </div>

          {displayedError && (
            <div
              className="auth-error-message"
              role="alert"
              id={consentInvalid ? `${consentId}-error` : undefined}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{displayedError}</p>
            </div>
          )}

          {showLegalConsent ? (
            <div
              className={
                consentInvalid ? 'auth-legal-consent auth-legal-consent--invalid' : 'auth-legal-consent'
              }
            >
              <input
                ref={consentRef}
                id={consentId}
                type="checkbox"
                checked={agreedToLegal}
                aria-required="true"
                aria-invalid={consentInvalid || undefined}
                aria-describedby={consentInvalid ? `${consentId}-error` : undefined}
                onChange={(e) => {
                  setAgreedToLegal(e.target.checked);
                  if (e.target.checked) setNeedsLegalConsent(false);
                }}
              />
              <label htmlFor={consentId} className="auth-legal-consent__label">
                I agree to the{' '}
                <Link
                  to="/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Use
                </Link>{' '}
                and{' '}
                <Link
                  to="/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
          ) : null}

          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogleClick}
            disabled={authLoading}
          >
            {authLoading ? (
              <>
                <div className="btn-spinner" />
                <span>{LOADING_LABEL[mode]}</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="google-icon" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{form.buttonLabel}</span>
              </>
            )}
          </button>

          <div className="form-footer">
            <p>
              {footer.text} <Link to={footer.linkTo}>{footer.linkLabel}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

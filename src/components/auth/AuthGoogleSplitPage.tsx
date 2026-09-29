import { useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Moon, ShieldCheck, Sparkles, Sun } from 'lucide-react';
import logo from '../../assets/logo.webp';
import {
  AUTH_BRAND_PANEL,
  AUTH_FORM_COPY,
  AUTH_HERO_IMAGE,
  type AuthGoogleSplitMode,
} from './authBrandContent';
import { useTheme } from '../../context/ThemeContext';
import '../../pages/SignIn.css';
import './AuthSplitPage.css';

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

function AuthRotatingVector() {
  return (
    <svg
      className="auth-vector__svg"
      viewBox="0 0 1440 700"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <g>
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
      <g>
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
      <g>
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
      <circle cx="180" cy="180" r="2.5" fill="#2FE6B8" opacity=".5" />
      <circle cx="1240" cy="140" r="2" fill="#3B82F6" opacity=".5" />
      <circle cx="960" cy="260" r="2.5" fill="#2FE6B8" opacity=".4" />
      <circle cx="320" cy="320" r="2" fill="#3B82F6" opacity=".4" />
      <circle cx="1380" cy="320" r="2.5" fill="#2FE6B8" opacity=".35" />
    </svg>
  );
}

const LEGAL_CONSENT_ERROR =
  'Please agree to the Terms of Use and Privacy Policy to create an account.';

export function AuthGoogleSplitPage({
  mode,
  error,
  authLoading,
  onGoogleAuth,
}: AuthGoogleSplitPageProps) {
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');
  const nextSuffix = nextParam ? `?next=${encodeURIComponent(nextParam)}` : '';
  const footerBase = FOOTER_COPY[mode];
  const footer = {
    ...footerBase,
    linkTo: `${footerBase.linkTo}${nextSuffix}`,
  };
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

  const { theme, setThemePreference } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="auth2-page">
      <aside className="auth2-hero">
        {AUTH_HERO_IMAGE ? (
          <img className="auth2-hero__image" src={AUTH_HERO_IMAGE} alt="" />
        ) : (
          <div className="auth2-hero__placeholder" aria-hidden>
            <span>Hero image placeholder</span>
          </div>
        )}
        <div className="auth2-hero__scrim" aria-hidden />

        <Link to="/" className="auth2-hero__logo" aria-label="Beleh AI home">
          <img src={logo} alt="Beleh AI" />
        </Link>

        <div className="auth2-hero__copy">
          <p className="auth2-hero__eyebrow">{brand.eyebrow}</p>
          <h1 className="auth2-hero__title">
            {brand.titleLine1}
            <br />
            {brand.titleLine2}
          </h1>
          <p className="auth2-hero__description">{brand.description}</p>
        </div>
      </aside>

      <main className="auth2-panel">
        <div className="auth2-vector" aria-hidden>
          <AuthRotatingVector />
        </div>

        <header className="auth2-panel__top">
          <Link to="/" className="auth2-back">
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
            Home
          </Link>
          <button
            type="button"
            className="auth2-theme-toggle"
            onClick={() => setThemePreference(isLight ? 'dark' : 'light')}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {isLight ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
          </button>
        </header>

        <div className="auth2-form">
          <p className="auth2-form__eyebrow">
            <Sparkles size={16} strokeWidth={2} aria-hidden />
            Beleh AI Workspace
          </p>
          <h2 className="auth2-form__title">{form.title}</h2>
          <p className="auth2-form__subtitle">{form.subtitle}</p>

          {displayedError && (
            <div
              className="auth-error-message auth2-error"
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
                consentInvalid
                  ? 'auth-legal-consent auth-legal-consent--invalid'
                  : 'auth-legal-consent'
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
            className="auth2-google-btn"
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
                <span className="auth2-google-btn__icon">
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
                </span>
                <span className="auth2-google-btn__label">{form.buttonLabel}</span>
                <ArrowRight size={20} strokeWidth={2} aria-hidden />
              </>
            )}
          </button>

          <p className="auth2-hint">
            <ShieldCheck size={16} strokeWidth={2} aria-hidden />
            {form.hint}
          </p>

          <p className="auth2-switch">
            {footer.text} <Link to={footer.linkTo}>{footer.linkLabel}</Link>
          </p>
        </div>

        <footer className="auth2-panel__footer">
          <span className="auth2-panel__security">
            <Lock size={14} strokeWidth={2} aria-hidden />
            SOC 2 Type II · Beleh AI Security
          </span>
          <span className="auth2-panel__legal">
            <Link to="/legal/privacy">Privacy</Link>
            <span aria-hidden>·</span>
            <Link to="/legal/terms">Terms</Link>
          </span>
        </footer>
      </main>
    </div>
  );
}

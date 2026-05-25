import { Link } from 'react-router-dom';
import logo from '../../assets/logo.webp';
import { AUTH_BRAND_PANEL, AUTH_FORM_COPY, type AuthGoogleSplitMode } from './authBrandContent';
import { Sparkles } from 'lucide-react';
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

export function AuthGoogleSplitPage({
  mode,
  error,
  authLoading,
  onGoogleAuth,
}: AuthGoogleSplitPageProps) {
  const footer = FOOTER_COPY[mode];
  const brand = AUTH_BRAND_PANEL[mode];
  const form = AUTH_FORM_COPY[mode];

  return (
    <div className="auth-split-page">
      <div className="auth-brand-panel auth-brand-panel--signin">
        <div className="brand-content brand-content--signin">
          <header className="signin-brand-header">
            <p className="signin-brand-eyebrow">ASK. ANALYZE. DECIDE.</p>
            <div className="signin-brand-alpha-badge" aria-label="Alpha version 2.6">
              <span className="signin-brand-alpha-badge__dot" aria-hidden />
              ALPHA V0.1.0
            </div>
          </header>

          <p className="signin-brand-kicker">
            <Sparkles
              className="signin-brand-kicker__icon"
              size={14}
              strokeWidth={2.25}
              aria-hidden
            />
            {brand.kicker}
          </p>

          <h1 className="signin-brand-title">
            {brand.titleLine1}
            <span className="signin-brand-title__line">
              {brand.titlePrefix ? (
                <span className="signin-brand-title__to">{brand.titlePrefix}</span>
              ) : null}
              <span className="signin-brand-title__accent">{brand.titleAccent}</span>
            </span>
          </h1>

          <p className="signin-brand-description">{brand.description}</p>

          <div className="signin-brand-cards">
            {brand.featureCards.map(({ icon: Icon, title, description }) => (
              <article key={title} className="signin-brand-card">
                <div className="signin-brand-card__icon" aria-hidden>
                  <Icon size={20} strokeWidth={2} />
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
          <div className="signin-form-brand">
            <img src={logo} alt="Beleh" className="signin-form-logo" />
          </div>

          <div className="form-header">
            <h2 className="form-title">
              <span className="title-dot">.</span>
              {form.title}
            </h2>
            <p className="form-subtitle">{form.subtitle}</p>
            <p className="form-subtitle form-subtitle--hint">{form.hint}</p>
          </div>

          {error && (
            <div className="auth-error-message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
            </div>
          )}

          <button
            type="button"
            className="auth-google-btn"
            onClick={onGoogleAuth}
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

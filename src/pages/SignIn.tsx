import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Cpu, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import logo from '../assets/logo.webp';
import { AuthGatewayTransition } from '../components/auth/AuthGatewayTransition';
import './SignIn.css';

const BRAND_FEATURE_CARDS = [
  {
    icon: Sparkles,
    title: 'Real-Time Frictionless Insights',
    description:
      'Designed to help businesses see and understand their data in real-time, completely without friction.',
  },
  {
    icon: Cpu,
    title: 'Multiple Data Connection Options',
    description:
      'Connect seamlessly to files, cloud folders, spreadsheets, and databases instantly.',
  },
  {
    icon: Database,
    title: 'Legacy BI Replacement',
    description: 'A powerful, secure alternative to heavy legacy dashboards, engineered for speed.',
  },
] as const;

export function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const { user, loading: authLoadingState, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect to their workspace (don't show login again)
  useEffect(() => {
    if (authLoadingState || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const token =
          (await authService.getValidIdToken(false)) ?? (await authService.getValidIdToken(true));
        if (!token || cancelled) return;
        const workspace = await apiClient.getDefaultWorkspace(token);
        if (!cancelled) navigate(`/workspace/${workspace.id}`, { replace: true });
      } catch {
        if (!cancelled) navigate('/', { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoadingState, navigate]);

  const showGatewayTransition = authLoading || (!authLoadingState && !!user);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setAuthLoading(true);
      await signInWithGoogle();
    } catch (err) {
      setAuthLoading(false);
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      console.error(err);
    }
  };

  if (showGatewayTransition) {
    return <AuthGatewayTransition phase={user ? 'authorized' : 'signin'} />;
  }

  return (
    <div className="auth-split-page">
      {/* Left Panel - Branded */}
      <div className="auth-brand-panel auth-brand-panel--signin">
        <div className="brand-content brand-content--signin">
          <header className="signin-brand-header">
            <p className="signin-brand-eyebrow">ASK. ANALYZE. DECIDE.</p>
            <div className="signin-brand-alpha-badge" aria-label="Alpha version 2.6">
              <span className="signin-brand-alpha-badge__dot" aria-hidden />
              ALPHA V2.6
            </div>
          </header>

          <p className="signin-brand-kicker">
            <Sparkles
              className="signin-brand-kicker__icon"
              size={14}
              strokeWidth={2.25}
              aria-hidden
            />
            NEXT-GENERATION DATABASE ANALYTICS WORKSPACE
          </p>

          <h1 className="signin-brand-title">
            Welcome Back
            <span className="signin-brand-title__line">
              <span className="signin-brand-title__to">to </span>
              <span className="signin-brand-title__accent">Beleh Workspace</span>
            </span>
          </h1>

          <p className="signin-brand-description">
            Designed to help individuals and businesses see and understand their data in real-time —
            completely without friction. A modern, lightning-fast replacement for legacy BI tools,
            featuring multiple data source connection options.
          </p>

          <div className="signin-brand-cards">
            {BRAND_FEATURE_CARDS.map(({ icon: Icon, title, description }) => (
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

      {/* Right Panel - Form */}
      <div className="auth-form-panel auth-form-panel--signin">
        <div className="form-content">
          <div className="signin-form-brand">
            <img src={logo} alt="Beleh" className="signin-form-logo" />
          </div>

          <div className="form-header">
            <h2 className="form-title">
              <span className="title-dot">.</span>welcome
            </h2>
            <p className="form-subtitle">Login in to your account to continue</p>
            <p className="form-subtitle form-subtitle--hint">
              A Google sign-in window will open when you continue.
            </p>
          </div>

          {/* Error message */}
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

          {/* Google Sign In Button */}
          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogleSignIn}
            disabled={authLoading}
          >
            {authLoading ? (
              <>
                <div className="btn-spinner"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="google-icon">
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
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Footer */}
          <div className="form-footer">
            <p>
              Don't have an account? <Link to="/signup">sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

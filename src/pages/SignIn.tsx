import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import logo from '../assets/logo.webp';
import './SignIn.css';

export function SignIn() {
    const [error, setError] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [isSlow, setIsSlow] = useState(false);
    const { user, loading: authLoadingState, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    // If user is already logged in, redirect to their workspace (don't show login again)
    useEffect(() => {
        if (authLoadingState || !user) return;

        const token = authService.getAuthToken();
        if (!token) return;

        let cancelled = false;
        apiClient.getDefaultWorkspace(token).then(
            (workspace) => {
                if (!cancelled) navigate(`/workspace/${workspace.id}`, { replace: true });
            },
            () => {
                if (!cancelled) navigate('/', { replace: true });
            }
        );
        return () => { cancelled = true; };
    }, [user, authLoadingState, navigate]);

    // Don't show login form if user is already logged in (redirect in progress)
    if (!authLoadingState && user) {
        return (
            <div className="auth-split-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div className="auth-form-panel" style={{ maxWidth: '360px' }}>
                    <div className="form-content" style={{ textAlign: 'center' }}>
                        <div className="btn-spinner" style={{ margin: '0 auto 1rem' }} />
                        <p className="form-subtitle">Taking you to your workspace...</p>
                    </div>
                </div>
            </div>
        );
    }

    const handleGoogleSignIn = async () => {
        let timeoutId: any = null;
        try {
            setError(null);
            setAuthLoading(true);
            setIsSlow(false);

            // Set a timeout to show "still working" message if it takes longer than 5s
            timeoutId = setTimeout(() => {
                setIsSlow(true);
            }, 5000);

            await signInWithGoogle();

            // Get auth token and fetch default workspace
            const token = authService.getAuthToken();
            if (!token) {
                setError('Authentication token not found. Please try again.');
                return;
            }

            const workspace = await apiClient.getDefaultWorkspace(token);

            // Success - clear timeout before navigating
            if (timeoutId) clearTimeout(timeoutId);

            navigate(`/workspace/${workspace.id}`);
        } catch (err) {
            // Clear timeout on error
            if (timeoutId) clearTimeout(timeoutId);
            setAuthLoading(false);
            setIsSlow(false);

            // Don't show error if user just closed the popup
            if (err instanceof Error && err.message === 'POPUP_CLOSED') {
                return;
            }

            // Handle popup blocked
            if (err instanceof Error && err.message === 'POPUP_BLOCKED') {
                setError('Please allow popups for this site to sign in with Google.');
                return;
            }

            setError('Failed to sign in. Please try again.');
            console.error(err);
        }
    };

    return (
        <div className="auth-split-page">
            {/* Left Panel - Branded */}
            <div className="auth-brand-panel">
                <div className="brand-content">
                    <div className="brand-logo-wrapper">
                        <img src={logo} alt="Beleh" className="brand-logo" />
                        <span className="auth-alpha-badge">Alpha</span>
                    </div>
                    <h1 className="brand-title">Welcome Back to Beleh</h1>
                    <p className="brand-subtitle">
                        Continue transforming your data into insights.<br />
                        Your workspace is waiting.
                    </p>
                    <div className="brand-features">
                        <div className="brand-feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Instant AI-powered analytics</span>
                        </div>
                        <div className="brand-feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Natural language queries</span>
                        </div>
                        <div className="brand-feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Secure workspace isolation</span>
                        </div>
                    </div>
                    <div className="brand-divider">
                        <span>New to Beleh?</span>
                    </div>
                    <Link to="/signup" className="brand-btn">
                        Create Account
                    </Link>
                </div>
                {/* Curved Edge */}
            </div>

            {/* Right Panel - Form */}
            <div className="auth-form-panel">
                <div className="form-content">
                    {/* Mobile Logo */}
                    <div className="mobile-brand-header">
                        <div className="mobile-brand-bg">
                            <img src={logo} alt="Beleh" className="mobile-logo" />
                            <span className="auth-alpha-badge mobile">Alpha</span>
                        </div>
                    </div>

                    <div className="form-header">
                        <h2 className="form-title">
                            <span className="title-dot">.</span>welcome
                        </h2>
                        <p className="form-subtitle">Login in to your account to continue</p>
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

                    {/* Loading feedback */}
                    {authLoading && (
                        <div className="auth-loading-feedback">
                            <p className="loading-text">Authenticating... please wait</p>
                            {isSlow && (
                                <p className="auth-slow-message">Still working... almost there</p>
                            )}
                        </div>
                    )}

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

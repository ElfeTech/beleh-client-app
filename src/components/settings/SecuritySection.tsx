import { Shield } from 'lucide-react';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import './SettingsShared.css';
import './SecuritySection.css';

const COMING_SOON_BADGE = (
  <span className="settings-card__badge settings-card__badge--soon">Coming soon</span>
);

export function SecuritySection() {
  return (
    <div className="settings-page-section security-section">
      <SettingsSectionHeader
        breadcrumbLabel="SECURITY"
        title="Security"
        description="Manage your account security and authentication settings"
        icon={<Shield size={20} strokeWidth={1.75} />}
      />

      {/* Authentication Method */}
      <div className="settings-card settings-card--coming-soon" aria-disabled="true">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Authentication Method</h2>
          {COMING_SOON_BADGE}
        </div>

        <div className="auth-method-item">
          <div className="auth-icon google">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </div>
          <div className="auth-content">
            <h3>Google Sign-In</h3>
            <p>Link and manage your sign-in provider</p>
          </div>
          <span className="settings-status-pill settings-status-pill--muted">Unavailable</span>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="settings-card tfa-card settings-card--coming-soon" aria-disabled="true">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Two-Factor Authentication (2FA)</h2>
          {COMING_SOON_BADGE}
        </div>

        <div className="tfa-content">
          <div className="tfa-info">
            <div className="tfa-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div className="tfa-text">
              <h3>Authenticator App</h3>
              <p>
                Add an extra layer of security to your account by requiring a code from your
                authenticator app when signing in.
              </p>
            </div>
          </div>

          <span className="settings-card__badge settings-card__badge--soon">Coming soon</span>
        </div>

        <div className="security-tips">
          <h4>Why use 2FA?</h4>
          <ul>
            <li>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Protects against password theft and phishing
            </li>
            <li>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Required for enterprise compliance
            </li>
            <li>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Industry-standard security practice
            </li>
          </ul>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="settings-card settings-card--coming-soon" aria-disabled="true">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Active Sessions</h2>
          {COMING_SOON_BADGE}
        </div>

        <div className="sessions-list">
          <div className="session-item current">
            <div className="session-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="session-details">
              <div className="session-header">
                <h4>macOS • Chrome</h4>
                <span className="current-badge">Current session</span>
              </div>
              <p>San Francisco, CA • Last active: Just now</p>
            </div>
          </div>

          <div className="session-item">
            <div className="session-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
            <div className="session-details">
              <div className="session-header">
                <h4>iPhone • Safari</h4>
                <span className="settings-card__badge settings-card__badge--soon">Coming soon</span>
              </div>
              <p>San Francisco, CA • Last active: 2 hours ago</p>
            </div>
          </div>
        </div>

        <div className="security-sessions-footer">
          <span className="settings-card__badge settings-card__badge--soon">Coming soon</span>
        </div>
      </div>
    </div>
  );
}

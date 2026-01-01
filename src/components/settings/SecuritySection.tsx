import { useState } from 'react';
import './SecuritySection.css';

export function SecuritySection() {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [setupStep, setSetupStep] = useState<'scan' | 'verify' | 'backup' | 'complete'>('scan');

  // Mock QR code data
  const mockSecret = 'JBSWY3DPEHPK3PXP';
  const backupCodes = ['abc123-xyz789', 'def456-uvw012', 'ghi789-rst345', 'jkl012-opq678'];

  const handle2FAToggle = () => {
    if (is2FAEnabled) {
      // Show disable confirmation
      if (window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
        setIs2FAEnabled(false);
      }
    } else {
      setShow2FASetup(true);
      setSetupStep('scan');
    }
  };

  const handleVerifyCode = () => {
    if (verificationCode.length === 6) {
      setSetupStep('backup');
    }
  };

  const handleComplete2FASetup = () => {
    setIs2FAEnabled(true);
    setShow2FASetup(false);
    setSetupStep('scan');
    setVerificationCode('');
  };

  return (
    <div className="security-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-icon security">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div className="header-text">
          <h1>Security</h1>
          <p>Manage your account security and authentication settings</p>
        </div>
      </div>

      {/* Authentication Method */}
      <div className="settings-card">
        <div className="card-header">
          <h2>Authentication Method</h2>
          <span className="card-badge">Active</span>
        </div>
        
        <div className="auth-method-item">
          <div className="auth-icon google">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div className="auth-content">
            <h3>Google Sign-In</h3>
            <p>You're signed in with your Google account</p>
          </div>
          <span className="status-badge active">Connected</span>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="settings-card tfa-card">
        <div className="card-header">
          <h2>Two-Factor Authentication (2FA)</h2>
          <span className={`card-badge ${is2FAEnabled ? 'success' : 'warning'}`}>
            {is2FAEnabled ? 'Enabled' : 'Not Enabled'}
          </span>
        </div>

        <div className="tfa-content">
          <div className="tfa-info">
            <div className="tfa-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              {is2FAEnabled && (
                <div className="tfa-status-info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>2FA is active on your account</span>
                </div>
              )}
            </div>
          </div>
          
          <button 
            className={`tfa-toggle-btn ${is2FAEnabled ? 'enabled' : ''}`}
            onClick={handle2FAToggle}
          >
            {is2FAEnabled ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Disable 2FA
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Enable 2FA
              </>
            )}
          </button>
        </div>

        {/* Security Tips */}
        <div className="security-tips">
          <h4>Why use 2FA?</h4>
          <ul>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Protects against password theft and phishing
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Required for enterprise compliance
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Industry-standard security practice
            </li>
          </ul>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="settings-card">
        <div className="card-header">
          <h2>Active Sessions</h2>
          <button className="text-btn danger">Sign out all</button>
        </div>

        <div className="sessions-list">
          <div className="session-item current">
            <div className="session-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
            <div className="session-details">
              <div className="session-header">
                <h4>iPhone • Safari</h4>
                <button className="text-btn small">Revoke</button>
              </div>
              <p>San Francisco, CA • Last active: 2 hours ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {show2FASetup && (
        <div className="modal-backdrop" onClick={() => setShow2FASetup(false)}>
          <div className="tfa-setup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Set Up Two-Factor Authentication</h2>
              <button className="close-btn" onClick={() => setShow2FASetup(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Progress Steps */}
            <div className="setup-progress">
              <div className={`step ${setupStep === 'scan' || setupStep === 'verify' || setupStep === 'backup' ? 'active' : ''} ${setupStep !== 'scan' ? 'completed' : ''}`}>
                <div className="step-dot">1</div>
                <span>Scan</span>
              </div>
              <div className="step-line" />
              <div className={`step ${setupStep === 'verify' || setupStep === 'backup' ? 'active' : ''} ${setupStep === 'backup' ? 'completed' : ''}`}>
                <div className="step-dot">2</div>
                <span>Verify</span>
              </div>
              <div className="step-line" />
              <div className={`step ${setupStep === 'backup' ? 'active' : ''}`}>
                <div className="step-dot">3</div>
                <span>Backup</span>
              </div>
            </div>

            {setupStep === 'scan' && (
              <div className="setup-step-content">
                <div className="qr-section">
                  <div className="qr-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="3" height="3" />
                      <rect x="18" y="14" width="3" height="3" />
                      <rect x="14" y="18" width="3" height="3" />
                      <rect x="18" y="18" width="3" height="3" />
                    </svg>
                    <p>QR Code</p>
                  </div>
                  <p className="qr-instructions">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                </div>

                <div className="manual-entry">
                  <p>Or enter this code manually:</p>
                  <div className="secret-code">
                    <code>{mockSecret}</code>
                    <button className="copy-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    </button>
                  </div>
                </div>

                <button className="primary-btn" onClick={() => setSetupStep('verify')}>
                  Continue
                </button>
              </div>
            )}

            {setupStep === 'verify' && (
              <div className="setup-step-content">
                <div className="verify-section">
                  <div className="verify-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </div>
                  <h3>Enter verification code</h3>
                  <p>Enter the 6-digit code from your authenticator app</p>

                  <div className="code-input-container">
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="code-input"
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="secondary-btn" onClick={() => setSetupStep('scan')}>
                    Back
                  </button>
                  <button 
                    className="primary-btn" 
                    onClick={handleVerifyCode}
                    disabled={verificationCode.length !== 6}
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}

            {setupStep === 'backup' && (
              <div className="setup-step-content">
                <div className="backup-section">
                  <div className="backup-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                  <h3>Save your backup codes</h3>
                  <p>Store these codes somewhere safe. You can use them to access your account if you lose your authenticator.</p>

                  <div className="backup-codes">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="backup-code">
                        <span className="code-number">{index + 1}.</span>
                        <code>{code}</code>
                      </div>
                    ))}
                  </div>

                  <button className="copy-codes-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy all codes
                  </button>
                </div>

                <button className="primary-btn" onClick={handleComplete2FASetup}>
                  I've saved my codes
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


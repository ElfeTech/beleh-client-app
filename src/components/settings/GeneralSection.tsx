import { useState, useContext, useEffect, useCallback } from 'react';
import { updateProfile } from 'firebase/auth';
import { AuthContext } from '../../context/AuthContext';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService';
import './GeneralSection.css';

type LanguageCode = 'en' | 'en-gb' | 'es' | 'fr' | 'de';
type DateFormatCode = 'mdy' | 'dmy' | 'ymd';

function isThemePreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark';
}

function isLanguageCode(v: unknown): v is LanguageCode {
  return v === 'en' || v === 'en-gb' || v === 'es' || v === 'fr' || v === 'de';
}

function isDateFormatCode(v: unknown): v is DateFormatCode {
  return v === 'mdy' || v === 'dmy' || v === 'ymd';
}

export function GeneralSection() {
  const authContext = useContext(AuthContext);
  const firebaseUser = authContext?.user;
  const { themePreference, setThemePreference } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [dateFormat, setDateFormat] = useState<DateFormatCode>('mdy');

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const u = firebaseUser;
      if (!u) {
        setIsLoading(false);
        setDisplayName('');
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const token = await u.getIdToken();
        const me = await apiClient.getUserMe(token);
        if (cancelled) return;

        setDisplayName(me.display_name?.trim() || u.displayName || '');
        const prefs = me.preferences || {};
        if (isLanguageCode(prefs.language)) setLanguage(prefs.language);
        if (isDateFormatCode(prefs.date_format)) setDateFormat(prefs.date_format);
        if (isThemePreference(prefs.theme)) setThemePreference(prefs.theme);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load your settings.');
          setDisplayName(u.displayName || '');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser, setThemePreference]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setThemePreference(e.target.value as ThemePreference);
  };

  const handleSave = async () => {
    const u = firebaseUser;
    if (!u) return;

    const trimmed = displayName.trim();
    if (!trimmed) {
      setSaveError('Display name is required.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const token = await u.getIdToken();
      const me = await apiClient.patchUserMe(token, {
        display_name: trimmed,
        preferences: {
          language,
          date_format: dateFormat,
          theme: themePreference,
        },
      });

      await updateProfile(u, { displayName: trimmed });

      const prev = authService.getBackendUser() as Record<string, unknown> | null;
      authService.storeBackendUser({
        ...(prev && typeof prev === 'object' ? prev : {}),
        uid: me.uid,
        email: me.email,
        display_name: me.display_name,
        photo_url: me.photo_url,
      });

      setDisplayName(me.display_name?.trim() || trimmed);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3200);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenGoogleProfile = useCallback(() => {
    window.open('https://myaccount.google.com/profile', '_blank', 'noopener,noreferrer');
  }, []);

  const handleExportSnapshot = async () => {
    const u = firebaseUser;
    if (!u) return;

    setExporting(true);
    try {
      const token = await u.getIdToken();
      const me = await apiClient.getUserMe(token);
      const workspaces = await apiClient.listWorkspaces(token);

      const payload = {
        exported_at: new Date().toISOString(),
        profile: {
          uid: me.uid,
          email: me.email,
          display_name: me.display_name,
        },
        preferences: me.preferences,
        workspaces: workspaces.items.map((w) => ({
          id: w.id,
          name: w.name,
          is_default: w.is_default,
        })),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'beleh-settings-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteRequest = () => {
    const ok = window.confirm(
      'Account deletion is handled by our team so we can remove your data safely. Continue to email support?'
    );
    if (!ok) return;
    window.location.href =
      'mailto:support@beleh.ai?subject=Account%20deletion%20request&body=Please%20delete%20my%20account%20(email%20below).%0A%0A';
  };

  return (
    <div className="general-section">
      {loadError ? <div className="general-section__banner general-section__banner--error">{loadError}</div> : null}
      {saveError ? <div className="general-section__banner general-section__banner--error">{saveError}</div> : null}

      <div className="section-header">
        <div className="header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="header-text">
          <h1>General Settings</h1>
          <p>Manage your account details and personal information</p>
        </div>
      </div>

      <div className="settings-card profile-card">
        <div className="card-header">
          <h2>Profile Information</h2>
          <span className="card-badge">Personal</span>
        </div>

        <div className="profile-section">
          <div className="avatar-container">
            <div className="avatar-large">
              {firebaseUser?.photoURL ? (
                <img src={firebaseUser.photoURL} alt={firebaseUser.displayName || 'User'} />
              ) : (
                <span>{getInitials(displayName || firebaseUser?.email || 'U')}</span>
              )}
            </div>
            <button type="button" className="avatar-edit-btn" onClick={handleOpenGoogleProfile}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Google profile photo
            </button>
            <p className="avatar-hint">Profile photos are managed in your Google account.</p>
          </div>

          <div className="profile-form">
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                disabled={isLoading || !firebaseUser}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-badge">
                <input
                  id="email"
                  type="email"
                  value={firebaseUser?.email || ''}
                  disabled
                  className="disabled"
                />
                <span className="verified-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Verified
                </span>
              </div>
              <p className="form-hint">Email is managed by your Google sign-in.</p>
            </div>
          </div>
        </div>

        <div className="card-footer">
          <button
            type="button"
            className={`save-btn ${saveSuccess ? 'success' : ''}`}
            onClick={() => void handleSave()}
            disabled={isSaving || isLoading || !firebaseUser}
          >
            {isSaving ? (
              <>
                <span className="spinner-small"></span>
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved!
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </div>
      </div>

      <div className="settings-card preferences-card">
        <div className="card-header">
          <h2>Preferences</h2>
          <span className="card-badge card-badge--muted">Customization</span>
        </div>

        <div className="preference-items">
          <div className="preference-item">
            <div className="preference-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </div>
            <div className="preference-content">
              <div className="preference-text">
                <h3>Theme</h3>
                <p>Choose your preferred color scheme</p>
              </div>
              <select
                className="preference-select"
                value={themePreference}
                onChange={handleThemeChange}
                disabled={isLoading || !firebaseUser}
              >
                <option value="system">System default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>

          <div className="preference-item">
            <div className="preference-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            </div>
            <div className="preference-content">
              <div className="preference-text">
                <h3>Language</h3>
                <p>Interface language (stored for your account)</p>
              </div>
              <select
                className="preference-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                disabled={isLoading || !firebaseUser}
              >
                <option value="en">English (US)</option>
                <option value="en-gb">English (UK)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>

          <div className="preference-item">
            <div className="preference-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="preference-content">
              <div className="preference-text">
                <h3>Date format</h3>
                <p>How dates are shown in the app when formatted</p>
              </div>
              <select
                className="preference-select"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as DateFormatCode)}
                disabled={isLoading || !firebaseUser}
              >
                <option value="mdy">MM/DD/YYYY</option>
                <option value="dmy">DD/MM/YYYY</option>
                <option value="ymd">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-footer card-footer--split">
          <p className="card-footer-hint">Theme, language, and date format are saved with your profile.</p>
          <button
            type="button"
            className="save-btn save-btn--secondary"
            onClick={() => void handleSave()}
            disabled={isSaving || isLoading || !firebaseUser}
          >
            Save preferences
          </button>
        </div>
      </div>

      <div className="settings-card danger-card">
        <div className="card-header">
          <h2>Account actions</h2>
          <span className="card-badge danger">Danger zone</span>
        </div>

        <div className="danger-actions">
          <div className="danger-item">
            <div className="danger-content">
              <h3>Export snapshot</h3>
              <p>Download a JSON file with your profile, saved preferences, and workspace names.</p>
            </div>
            <button type="button" className="outline-btn" onClick={() => void handleExportSnapshot()} disabled={exporting || !firebaseUser}>
              {exporting ? (
                <>
                  <span className="spinner-small spinner-small--dark"></span>
                  Preparing…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download JSON
                </>
              )}
            </button>
          </div>

          <div className="danger-item">
            <div className="danger-content">
              <h3>Delete account</h3>
              <p>Permanently removing your account and data is done through support so we can verify identity and complete the process safely.</p>
            </div>
            <button type="button" className="danger-btn" onClick={handleDeleteRequest}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Request deletion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

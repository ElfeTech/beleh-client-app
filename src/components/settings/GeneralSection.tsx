import { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { User } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { AuthContext } from '../../context/AuthContext';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { ThemeSegmentControl } from './ThemeSegmentControl';
import { AlertDialog } from '../common/AlertDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './SettingsShared.css';
import './GeneralSection.css';

type SavedGeneralSettings = {
  displayName: string;
  theme: ThemePreference;
};

function isThemePreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark';
}

export function GeneralSection() {
  const authContext = useContext(AuthContext);
  const firebaseUser = authContext?.user;
  const { themePreference, setThemePreference } = useTheme();
  const themePreferenceRef = useRef(themePreference);
  themePreferenceRef.current = themePreference;

  const [displayName, setDisplayName] = useState('');
  const [savedSettings, setSavedSettings] = useState<SavedGeneralSettings | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportErrorAlert, setExportErrorAlert] = useState<string | null>(null);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const u = firebaseUser;
      if (!u) {
        setIsLoading(false);
        setDisplayName('');
        setSavedSettings(null);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const token = await u.getIdToken();
        const me = await apiClient.getUserMe(token);
        if (cancelled) return;

        const nextDisplayName = me.display_name?.trim() || u.displayName || '';
        const prefs = me.preferences || {};
        const nextTheme = isThemePreference(prefs.theme) ? prefs.theme : themePreferenceRef.current;

        setDisplayName(nextDisplayName);
        if (isThemePreference(prefs.theme)) setThemePreference(prefs.theme);
        setSavedSettings({
          displayName: nextDisplayName,
          theme: nextTheme,
        });
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load your settings.');
          const fallbackName = u.displayName || '';
          setDisplayName(fallbackName);
          setSavedSettings({
            displayName: fallbackName,
            theme: themePreferenceRef.current,
          });
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

  const hasChanges =
    savedSettings !== null &&
    (displayName.trim() !== savedSettings.displayName.trim() ||
      themePreference !== savedSettings.theme);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .substring(0, 2);
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
      setSavedSettings({
        displayName: me.display_name?.trim() || trimmed,
        theme: themePreference,
      });
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
      setExportErrorAlert(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccountConfirm = () => {
    setShowDeleteAccountConfirm(false);
    window.location.href =
      'mailto:hello@yulona.co?subject=Account%20deletion%20request&body=Please%20delete%20my%20account%20(email%20below).%0A%0A';
  };

  return (
    <div className="settings-page-section general-section">
      <SettingsSectionHeader
        breadcrumbLabel="GENERAL"
        title="General Settings"
        description="Manage your account details. Keep values synchronous for corporate compliance audits."
        icon={<User size={20} strokeWidth={1.75} />}
      />

      {loadError ? <div className="settings-banner settings-banner--error">{loadError}</div> : null}
      {saveError ? <div className="settings-banner settings-banner--error">{saveError}</div> : null}

      <div className="settings-card">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Profile Information</h2>
          <span className="settings-card__badge settings-card__badge--personal">Personal</span>
        </div>

        <div className="profile-layout">
          <div className="profile-layout__avatar">
            <div className="profile-avatar">
              {firebaseUser?.photoURL ? (
                <img src={firebaseUser.photoURL} alt={firebaseUser.displayName || 'User'} />
              ) : (
                <span>{getInitials(displayName || firebaseUser?.email || 'U')}</span>
              )}
            </div>
            <button
              type="button"
              className="settings-outline-btn profile-google-btn"
              onClick={handleOpenGoogleProfile}
            >
              Google profile photo
            </button>
            <p className="profile-avatar-hint">
              Profile photos are managed in your Google account.
            </p>
          </div>

          <div className="profile-layout__form">
            <div className="form-field">
              <label className="settings-label" htmlFor="displayName">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                className="settings-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                disabled={isLoading || !firebaseUser}
              />
            </div>

            <div className="form-field">
              <label className="settings-label" htmlFor="email">
                Email address
              </label>
              <div className="form-field__email-row">
                <input
                  id="email"
                  type="email"
                  className="settings-input is-readonly"
                  value={firebaseUser?.email || ''}
                  disabled
                />
                <span className="verified-badge">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Preferences</h2>
          <span className="settings-card__badge settings-card__badge--custom">Customization</span>
        </div>

        <div className="settings-row settings-row--start preference-row--theme">
          <div className="settings-row__text">
            <h3>System Visual Theme</h3>
            <p>Choose how Beleh renders dashboards and data tables across devices.</p>
          </div>
          <ThemeSegmentControl
            value={themePreference}
            onChange={setThemePreference}
            disabled={isLoading || !firebaseUser}
          />
        </div>
      </div>

      <div className="settings-card settings-card--danger">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Account actions</h2>
          <span className="settings-card__badge settings-card__badge--danger">Danger zone</span>
        </div>

        <div className="danger-actions">
          <div className="danger-row">
            <div>
              <h3>Export snapshot</h3>
              <p>Download a JSON file with your profile, saved preferences, and workspace names.</p>
            </div>
            <button
              type="button"
              className="settings-outline-btn"
              onClick={() => void handleExportSnapshot()}
              disabled={exporting || !firebaseUser}
            >
              {exporting ? 'Preparing…' : 'Download JSON'}
            </button>
          </div>
          <div className="danger-row">
            <div>
              <h3>Delete account</h3>
              <p>
                Permanently removing your account and data is done through support so we can verify
                identity and complete the process safely.
              </p>
            </div>
            <button
              type="button"
              className="danger-btn"
              onClick={() => setShowDeleteAccountConfirm(true)}
            >
              Request deletion
            </button>
          </div>
        </div>
      </div>

      <div className="settings-sticky-footer">
        <button
          type="button"
          className={`btn-gradient-primary ${saveSuccess ? 'is-success' : ''}`}
          onClick={() => void handleSave()}
          disabled={isSaving || isLoading || !firebaseUser || !hasChanges}
        >
          {isSaving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save changes'}
        </button>
      </div>

      <AlertDialog
        isOpen={exportErrorAlert !== null}
        title="Export failed"
        message={exportErrorAlert ?? ''}
        confirmText="OK"
        variant="danger"
        onClose={() => setExportErrorAlert(null)}
      />

      <ConfirmDialog
        isOpen={showDeleteAccountConfirm}
        title="Request account deletion?"
        message="Account deletion is handled by our team so we can remove your data safely. You will be taken to email support to continue."
        confirmText="Continue"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleDeleteAccountConfirm}
        onCancel={() => setShowDeleteAccountConfirm(false)}
      />
    </div>
  );
}

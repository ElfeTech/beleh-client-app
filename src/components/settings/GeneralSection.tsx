import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import './GeneralSection.css';

export function GeneralSection() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const { themePreference, setThemePreference } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setThemePreference(e.target.value as ThemePreference);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="general-section">
      {/* Header */}
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

      {/* Profile Card */}
      <div className="settings-card profile-card">
        <div className="card-header">
          <h2>Profile Information</h2>
          <span className="card-badge">Personal</span>
        </div>
        
        <div className="profile-section">
          <div className="avatar-container">
            <div className="avatar-large">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} />
              ) : (
                <span>{getInitials(user?.displayName || user?.email || 'U')}</span>
              )}
            </div>
            <button className="avatar-edit-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Change Photo
            </button>
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
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-badge">
                <input
                  id="email"
                  type="email"
                  value={user?.email || ''}
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
              <p className="form-hint">Email is managed by your authentication provider</p>
            </div>
          </div>
        </div>

        <div className="card-footer">
          <button 
            className={`save-btn ${saveSuccess ? 'success' : ''}`}
            onClick={handleSaveProfile}
            disabled={isSaving}
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
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Preferences Card */}
      <div className="settings-card preferences-card">
        <div className="card-header">
          <h2>Preferences</h2>
          <span className="card-badge">Customization</span>
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
              >
                <option value="system">System Default</option>
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
                <p>Select your preferred language</p>
              </div>
              <select className="preference-select">
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
                <h3>Date Format</h3>
                <p>How dates are displayed across the app</p>
              </div>
              <select className="preference-select">
                <option value="mdy">MM/DD/YYYY</option>
                <option value="dmy">DD/MM/YYYY</option>
                <option value="ymd">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions Card */}
      <div className="settings-card danger-card">
        <div className="card-header">
          <h2>Account Actions</h2>
          <span className="card-badge danger">Danger Zone</span>
        </div>

        <div className="danger-actions">
          <div className="danger-item">
            <div className="danger-content">
              <h3>Export Data</h3>
              <p>Download all your data including datasets, chats, and settings</p>
            </div>
            <button className="outline-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Data
            </button>
          </div>

          <div className="danger-item">
            <div className="danger-content">
              <h3>Delete Account</h3>
              <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
            </div>
            <button className="danger-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


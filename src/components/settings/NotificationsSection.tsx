import { useState } from 'react';
import './NotificationsSection.css';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export function NotificationsSection() {
  const [emailNotifications, setEmailNotifications] = useState<NotificationSetting[]>([
    { id: 'usage_alerts', title: 'Usage Alerts', description: 'Get notified when you reach 80% and 100% of your quota', enabled: true },
    { id: 'weekly_summary', title: 'Weekly Summary', description: 'Receive a weekly summary of your analytics activity', enabled: true },
    { id: 'new_features', title: 'New Features', description: 'Be the first to know about new features and updates', enabled: false },
    { id: 'tips_tricks', title: 'Tips & Tricks', description: 'Helpful tips to get the most out of our platform', enabled: false },
  ]);

  const [pushNotifications, setPushNotifications] = useState<NotificationSetting[]>([
    { id: 'query_complete', title: 'Query Complete', description: 'Notify when long-running queries finish', enabled: true },
    { id: 'dataset_ready', title: 'Dataset Ready', description: 'Notify when dataset processing completes', enabled: true },
    { id: 'team_activity', title: 'Team Activity', description: 'Updates about team member actions', enabled: false },
  ]);

  const toggleSetting = (
    settings: NotificationSetting[],
    setSettings: React.Dispatch<React.SetStateAction<NotificationSetting[]>>,
    id: string
  ) => {
    setSettings(settings.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const allEmailEnabled = emailNotifications.every(n => n.enabled);
  const allPushEnabled = pushNotifications.every(n => n.enabled);

  const toggleAllEmail = () => {
    const newValue = !allEmailEnabled;
    setEmailNotifications(emailNotifications.map(n => ({ ...n, enabled: newValue })));
  };

  const toggleAllPush = () => {
    const newValue = !allPushEnabled;
    setPushNotifications(pushNotifications.map(n => ({ ...n, enabled: newValue })));
  };

  return (
    <div className="notifications-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-icon notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </div>
        <div className="header-text">
          <h1>Notifications</h1>
          <p>Manage how and when you want to be notified</p>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="settings-card">
        <div className="card-header">
          <div className="header-with-icon">
            <div className="header-icon-small email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2>Email Notifications</h2>
          </div>
          <button 
            className={`toggle-all-btn ${allEmailEnabled ? 'enabled' : ''}`}
            onClick={toggleAllEmail}
          >
            {allEmailEnabled ? 'Disable All' : 'Enable All'}
          </button>
        </div>

        <div className="notification-list">
          {emailNotifications.map(notification => (
            <div key={notification.id} className="notification-item">
              <div className="notification-content">
                <h3>{notification.title}</h3>
                <p>{notification.description}</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notification.enabled}
                  onChange={() => toggleSetting(emailNotifications, setEmailNotifications, notification.id)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Push Notifications */}
      <div className="settings-card">
        <div className="card-header">
          <div className="header-with-icon">
            <div className="header-icon-small push">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <h2>Push Notifications</h2>
          </div>
          <button 
            className={`toggle-all-btn ${allPushEnabled ? 'enabled' : ''}`}
            onClick={toggleAllPush}
          >
            {allPushEnabled ? 'Disable All' : 'Enable All'}
          </button>
        </div>

        <div className="notification-list">
          {pushNotifications.map(notification => (
            <div key={notification.id} className="notification-item">
              <div className="notification-content">
                <h3>{notification.title}</h3>
                <p>{notification.description}</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notification.enabled}
                  onChange={() => toggleSetting(pushNotifications, setPushNotifications, notification.id)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>

        <div className="browser-permission-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p>Push notifications require browser permission. <button className="text-link">Enable in browser</button></p>
        </div>
      </div>

      {/* Notification Schedule */}
      <div className="settings-card">
        <div className="card-header">
          <h2>Quiet Hours</h2>
          <span className="card-badge">Optional</span>
        </div>

        <div className="quiet-hours-content">
          <div className="quiet-hours-info">
            <div className="quiet-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </div>
            <div className="quiet-text">
              <h3>Do Not Disturb</h3>
              <p>Pause all notifications during specific hours</p>
            </div>
          </div>

          <div className="quiet-hours-settings">
            <div className="time-range">
              <div className="time-input">
                <label>From</label>
                <select defaultValue="22:00">
                  <option value="20:00">8:00 PM</option>
                  <option value="21:00">9:00 PM</option>
                  <option value="22:00">10:00 PM</option>
                  <option value="23:00">11:00 PM</option>
                </select>
              </div>
              <span className="time-separator">to</span>
              <div className="time-input">
                <label>Until</label>
                <select defaultValue="08:00">
                  <option value="06:00">6:00 AM</option>
                  <option value="07:00">7:00 AM</option>
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                </select>
              </div>
            </div>

            <div className="weekday-selector">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <button 
                  key={index} 
                  className={`day-btn ${index === 0 || index === 6 ? 'active' : ''}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Actions */}
      <div className="actions-bar">
        <button className="save-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Save Preferences
        </button>
      </div>
    </div>
  );
}


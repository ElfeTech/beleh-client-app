import { useState } from 'react';
import { Bell } from 'lucide-react';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import './SettingsShared.css';
import './NotificationsSection.css';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

function NotificationToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="settings-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="settings-toggle__slider" />
    </label>
  );
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
    setSettings(settings.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const allEmailEnabled = emailNotifications.every((n) => n.enabled);
  const allPushEnabled = pushNotifications.every((n) => n.enabled);

  const toggleAllEmail = () => {
    const newValue = !allEmailEnabled;
    setEmailNotifications(emailNotifications.map((n) => ({ ...n, enabled: newValue })));
  };

  const toggleAllPush = () => {
    const newValue = !allPushEnabled;
    setPushNotifications(pushNotifications.map((n) => ({ ...n, enabled: newValue })));
  };

  return (
    <div className="settings-page-section notifications-section">
      <SettingsSectionHeader
        breadcrumbLabel="NOTIFICATIONS"
        title="Notifications"
        description="Manage how and when you want to be notified"
        icon={<Bell size={20} strokeWidth={1.75} />}
      />

      <div className="settings-card">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Email Notifications</h2>
          <button type="button" className="settings-outline-btn" onClick={toggleAllEmail}>
            {allEmailEnabled ? 'Disable all' : 'Enable all'}
          </button>
        </div>
        <div className="settings-list">
          {emailNotifications.map((notification) => (
            <div key={notification.id} className="settings-list-item">
              <div className="settings-row__text">
                <h3>{notification.title}</h3>
                <p>{notification.description}</p>
              </div>
              <NotificationToggle
                checked={notification.enabled}
                onChange={() => toggleSetting(emailNotifications, setEmailNotifications, notification.id)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Push Notifications</h2>
          <button type="button" className="settings-outline-btn" onClick={toggleAllPush}>
            {allPushEnabled ? 'Disable all' : 'Enable all'}
          </button>
        </div>
        <div className="settings-list">
          {pushNotifications.map((notification) => (
            <div key={notification.id} className="settings-list-item">
              <div className="settings-row__text">
                <h3>{notification.title}</h3>
                <p>{notification.description}</p>
              </div>
              <NotificationToggle
                checked={notification.enabled}
                onChange={() => toggleSetting(pushNotifications, setPushNotifications, notification.id)}
              />
            </div>
          ))}
        </div>
        <div className="settings-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p>
            Push notifications require browser permission.{' '}
            <button type="button" className="settings-text-btn">
              Enable in browser
            </button>
          </p>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card__head">
          <h2 className="settings-card__title">Quiet Hours</h2>
          <span className="settings-card__badge settings-card__badge--muted">Optional</span>
        </div>
        <div className="quiet-hours-block">
          <div className="settings-inline-group">
            <span className="settings-icon-chip" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </span>
            <div className="settings-row__text">
              <h3>Do Not Disturb</h3>
              <p>Pause all notifications during specific hours</p>
            </div>
          </div>
          <div className="quiet-hours-controls">
            <div className="quiet-time-field">
              <label className="settings-label">From</label>
              <select className="settings-select" defaultValue="22:00">
                <option value="20:00">8:00 PM</option>
                <option value="21:00">9:00 PM</option>
                <option value="22:00">10:00 PM</option>
                <option value="23:00">11:00 PM</option>
              </select>
            </div>
            <span className="quiet-hours-sep">to</span>
            <div className="quiet-time-field">
              <label className="settings-label">Until</label>
              <select className="settings-select" defaultValue="08:00">
                <option value="06:00">6:00 AM</option>
                <option value="07:00">7:00 AM</option>
                <option value="08:00">8:00 AM</option>
                <option value="09:00">9:00 AM</option>
              </select>
            </div>
          </div>
          <div className="quiet-days" role="group" aria-label="Days">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <button
                key={index}
                type="button"
                className={`quiet-day-btn ${index === 0 || index === 6 ? 'is-active' : ''}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-sticky-footer">
        <button type="button" className="btn-gradient-primary">
          Save preferences
        </button>
      </div>
    </div>
  );
}

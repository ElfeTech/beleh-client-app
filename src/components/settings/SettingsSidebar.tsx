import React from 'react';
import { Link } from 'react-router-dom';
import './SettingsSidebar.css';

export type SettingsSection =
  | 'general'
  | 'security'
  | 'workspaces'
  | 'members'
  | 'notifications'
  | 'billing'
  | 'help'
  | 'about';

interface SettingsSidebarProps {
  activeSection: SettingsSection | null;
  onSectionChange: (section: SettingsSection) => void;
  onSignOut: () => void;
}

interface MenuItem {
  id: SettingsSection;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  category: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'general',
    title: 'General',
    subtitle: 'Manage your account details',
    category: 'Account',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    subtitle: 'Password and authentication',
    category: 'Account',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: 'workspaces',
    title: 'Workspaces',
    subtitle: 'Manage your workspaces',
    category: 'Workspace',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'members',
    title: 'Members',
    subtitle: 'Invite and manage team members',
    category: 'Workspace',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Manage notification settings',
    category: 'Preferences',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    id: 'billing',
    title: 'Billing & Plans',
    subtitle: 'Manage subscription and payments',
    category: 'Billing',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'help',
    title: 'Help & Support',
    subtitle: 'Get help and contact support',
    category: 'Support',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'about',
    title: 'About',
    subtitle: 'Version and legal information',
    category: 'Support',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeSection,
  onSectionChange,
  onSignOut,
}) => {
  // Group menu items by category
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="settings-sidebar-container">
      <div className="settings-sidebar-header">
        <h3>Settings</h3>
      </div>

      <div className="settings-sidebar-content">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="settings-sidebar-section">
            <div className="settings-sidebar-section-title">{category}</div>
            <div className="settings-sidebar-menu">
              {items.map((item) => (
                <Link
                  key={item.id}
                  to={`/settings/${item.id}`}
                  className={`settings-sidebar-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => onSectionChange(item.id)}
                >
                  <div className="sidebar-item-icon">{item.icon}</div>
                  <div className="sidebar-item-content">
                    <div className="sidebar-item-title">{item.title}</div>
                    <div className="sidebar-item-subtitle">{item.subtitle}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="settings-sidebar-section">
          <button className="settings-sidebar-signout" onClick={onSignOut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

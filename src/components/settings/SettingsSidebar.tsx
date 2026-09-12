import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HIDDEN_SETTINGS_CATEGORIES, isSettingsNavSectionVisible } from './settingsNav';
import './SettingsSidebar.css';

export type SettingsSection =
  | 'general'
  | 'security'
  | 'workspaces'
  | 'members'
  | 'notifications'
  | 'usage'
  | 'billing'
  | 'help'
  | 'about';

interface SettingsSidebarProps {
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  },
  {
    id: 'usage',
    title: 'Usage Analytics',
    subtitle: 'Track consumption and quotas',
    category: 'Billing',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3v18h18M7 16l4-5 4 3 5-7"
        />
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ onSignOut }) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const { currentRole } = useWorkspace();

  const visibleMenuItems = menuItems.filter((item) =>
    isSettingsNavSectionVisible(item.id, currentRole),
  );

  const groupedItems = visibleMenuItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>,
  );

  const categoryOrder = ['Account', 'Workspace', 'Preferences', 'Billing', 'Support'].filter(
    (category) =>
      !HIDDEN_SETTINGS_CATEGORIES.includes(category) || (groupedItems[category]?.length ?? 0) > 0,
  );

  return (
    <aside className="settings-sidebar-container">
      <div className="settings-sidebar-profile">
        <div className="settings-sidebar-avatar">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || 'User'} />
          ) : (
            <span>{getInitials(user?.displayName || user?.email || 'U')}</span>
          )}
        </div>
        <div className="settings-sidebar-profile-text">
          <p className="settings-sidebar-profile-name">{user?.displayName || 'User'}</p>
          {user?.email ? <p className="settings-sidebar-profile-email">{user.email}</p> : null}
        </div>
      </div>

      <div className="settings-sidebar-content">
        {categoryOrder.map((category) => {
          const items = groupedItems[category];
          if (!items?.length) return null;
          return (
            <div key={category} className="settings-sidebar-section">
              <div className="settings-sidebar-section-title">{category}</div>
              <nav className="settings-sidebar-menu" aria-label={`${category} settings`}>
                {items.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`/settings/${item.id}`}
                    end
                    className={({ isActive }) =>
                      `settings-sidebar-item${isActive ? ' active' : ''}`
                    }
                  >
                    <div className="sidebar-item-icon">{item.icon}</div>
                    <div className="sidebar-item-content">
                      <div className="sidebar-item-title">{item.title}</div>
                      <div className="sidebar-item-subtitle">{item.subtitle}</div>
                    </div>
                  </NavLink>
                ))}
              </nav>
            </div>
          );
        })}

        <div className="settings-sidebar-section settings-sidebar-section--footer">
          <button type="button" className="settings-sidebar-signout" onClick={onSignOut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
};

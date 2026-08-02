import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { SettingsSidebar } from '../components/settings/SettingsSidebar';
import type { SettingsSection } from '../components/settings/SettingsSidebar';
import { UsageSection } from '../components/settings/UsageSection';
import { GeneralSection } from '../components/settings/GeneralSection';
import { SecuritySection } from '../components/settings/SecuritySection';
import { NotificationsSection } from '../components/settings/NotificationsSection';
import { HelpSection } from '../components/settings/HelpSection';
import { AboutSection } from '../components/settings/AboutSection';
import { MembersSection } from '../components/settings/MembersSection';
import { SettingsComplianceFooter } from '../components/settings/SettingsComplianceFooter';
import { WorkspacesPage } from './WorkspacesPage';
import UsageStatisticsPage from './UsageStatisticsPage';
import { isSettingsNavSectionVisible } from '../components/settings/settingsNav';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import './SettingsPage.css';

const VALID_SECTIONS = new Set<SettingsSection>([
  'general',
  'security',
  'workspaces',
  'members',
  'notifications',
  'usage',
  'billing',
  'help',
  'about',
]);

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useContext(AuthContext);
  const { currentRole } = useWorkspace();

  const user = authContext?.user;
  const signOut = authContext?.signOut || (async () => {});

  const getActiveSectionFromPath = (): SettingsSection | null => {
    const pathParts = location.pathname.split('/');
    const sectionIndex = pathParts.indexOf('settings') + 1;
    const section = pathParts[sectionIndex] as SettingsSection;
    return VALID_SECTIONS.has(section) ? section : null;
  };

  const [activeSection, setActiveSection] = useState<SettingsSection | null>(
    getActiveSectionFromPath(),
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobileMenu, setShowMobileMenu] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const section = getActiveSectionFromPath();
    setActiveSection(section);
    if (isMobile && section) {
      setShowMobileMenu(false);
    } else if (isMobile && !section) {
      setShowMobileMenu(true);
    }
  }, [location.pathname, isMobile]);

  if (!isMobile && location.pathname === '/settings') {
    return <Navigate to="/settings/general" replace />;
  }

  const sectionFromPath = getActiveSectionFromPath();
  // Only redirect once role is known so owners aren't bounced while workspace context loads.
  if (
    sectionFromPath &&
    currentRole != null &&
    !isSettingsNavSectionVisible(sectionFromPath, currentRole)
  ) {
    return <Navigate to="/settings/general" replace />;
  }

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    navigate(`/settings/${section}`);
    if (isMobile) {
      setShowMobileMenu(false);
    }
  };

  const handleBackToMenu = () => {
    setShowMobileMenu(true);
    setActiveSection(null);
    navigate('/settings');
  };

  const handleSignOutRequest = () => {
    setShowSignOutConfirm(true);
  };

  const handleSignOutConfirm = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/signin');
    } finally {
      setIsSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderSectionContent = () => {
    if (!activeSection) return null;

    switch (activeSection) {
      case 'general':
        return <GeneralSection />;
      case 'security':
        return <SecuritySection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'usage':
        return <UsageStatisticsPage embedded />;
      case 'billing':
        return <UsageSection />;
      case 'workspaces':
        return <WorkspacesPage />;
      case 'help':
        return <HelpSection />;
      case 'about':
        return <AboutSection />;
      case 'members':
        return <MembersSection />;
      default:
        return null;
    }
  };

  const renderDesktopContent = () => (
    <div className="settings-content-area">
      <div className="settings-content-scroll">
        <div className="settings-content-inner">
          <div className="settings-content-container">{renderSectionContent()}</div>
          <SettingsComplianceFooter />
        </div>
      </div>
    </div>
  );

  const renderMobileMenu = () => (
    <div className="settings-mobile-container">
      <div className="settings-mobile-profile">
        <div className="settings-avatar-large">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || 'User'} />
          ) : (
            <span>{getInitials(user?.displayName || user?.email || 'U')}</span>
          )}
        </div>
        <h2>{user?.displayName || 'User'}</h2>
        <p>{user?.email}</p>
      </div>

      <div className="settings-mobile-menu">
        <div className="settings-mobile-section">
          <h3 className="mobile-section-title">Account</h3>
          <div className="settings-menu">
            <button
              type="button"
              className="settings-menu-item"
              onClick={() => handleSectionChange('general')}
            >
              <div className="menu-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="menu-item-content">
                <span className="menu-item-title">General</span>
                <span className="menu-item-subtitle">Manage your account details</span>
              </div>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              className="settings-menu-item"
              onClick={() => handleSectionChange('security')}
            >
              <div className="menu-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div className="menu-item-content">
                <span className="menu-item-title">Security</span>
                <span className="menu-item-subtitle">Password and authentication</span>
              </div>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="settings-mobile-section">
          <h3 className="mobile-section-title">Workspace</h3>
          <div className="settings-menu">
            <button
              type="button"
              className="settings-menu-item"
              onClick={() => handleSectionChange('workspaces')}
            >
              <div className="menu-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="menu-item-content">
                <span className="menu-item-title">Workspaces</span>
                <span className="menu-item-subtitle">Switch and manage workspaces</span>
              </div>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            {isSettingsNavSectionVisible('members', currentRole) && (
              <button
                type="button"
                className="settings-menu-item"
                onClick={() => handleSectionChange('members')}
              >
                <div className="menu-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div className="menu-item-content">
                  <span className="menu-item-title">Members</span>
                  <span className="menu-item-subtitle">Invite and manage team members</span>
                </div>
                <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="settings-mobile-section settings-nav-hidden" aria-hidden="true">
          <h3 className="mobile-section-title">Preferences</h3>
          <div className="settings-menu">
            <button
              type="button"
              className="settings-menu-item"
              onClick={() => handleSectionChange('notifications')}
            >
              <div className="menu-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <div className="menu-item-content">
                <span className="menu-item-title">Notifications</span>
                <span className="menu-item-subtitle">Manage notification settings</span>
              </div>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="settings-mobile-section">
          <h3 className="mobile-section-title">Billing</h3>
          <div className="settings-menu">
            <button
              type="button"
              className="settings-menu-item"
              onClick={() => handleSectionChange('usage')}
            >
              <div className="menu-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3v18h18M7 16l4-5 4 3 5-7"
                  />
                </svg>
              </div>
              <div className="menu-item-content">
                <span className="menu-item-title">Usage Analytics</span>
                <span className="menu-item-subtitle">Track consumption and quotas</span>
              </div>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            {isSettingsNavSectionVisible('billing', currentRole) && (
              <button
                type="button"
                className="settings-menu-item"
                onClick={() => handleSectionChange('billing')}
              >
                <div className="menu-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <div className="menu-item-content">
                  <span className="menu-item-title">Billing & Plans</span>
                  <span className="menu-item-subtitle">Manage subscription and payments</span>
                </div>
                <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="settings-mobile-section">
          <h3 className="mobile-section-title">Support</h3>
          <div className="settings-menu">
            <button
              type="button"
              className="settings-menu-item settings-nav-hidden"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => handleSectionChange('help')}
            >
              <div className="menu-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="menu-item-content">
                <span className="menu-item-title">Help & Support</span>
                <span className="menu-item-subtitle">Get help and contact support</span>
              </div>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              className="settings-menu-item"
              onClick={() => handleSectionChange('about')}
            >
              <div className="menu-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="menu-item-content">
                <span className="menu-item-title">About</span>
                <span className="menu-item-subtitle">Version and legal information</span>
              </div>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        <button type="button" className="signout-btn" onClick={handleSignOutRequest}>
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
  );

  const renderMobileDetail = () => (
    <div className="settings-mobile-detail">
      <div className="settings-content-scroll">
        <div className="settings-content-inner">
          <div className="settings-mobile-header">
            <button type="button" className="back-to-menu-btn" onClick={handleBackToMenu}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Settings Menu
            </button>
          </div>
          <div className="settings-content-container">{renderSectionContent()}</div>
          <SettingsComplianceFooter />
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-page-container app-page-root">
      {!isMobile && (
        <>
          <SettingsSidebar onSignOut={handleSignOutRequest} />
          {renderDesktopContent()}
        </>
      )}

      {isMobile && showMobileMenu && renderMobileMenu()}
      {isMobile && !showMobileMenu && renderMobileDetail()}

      <ConfirmDialog
        isOpen={showSignOutConfirm}
        title="Sign out?"
        message="You will need to sign in again to access your workspaces and chats."
        confirmText="Sign out"
        cancelText="Cancel"
        variant="brand"
        isLoading={isSigningOut}
        onConfirm={handleSignOutConfirm}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </div>
  );
};

export default SettingsPage;

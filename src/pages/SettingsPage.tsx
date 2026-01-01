import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SettingsSidebar } from '../components/settings/SettingsSidebar';
import type { SettingsSection } from '../components/settings/SettingsSidebar';
import { ComingSoon } from '../components/settings/ComingSoon';
import { UsageSection } from '../components/settings/UsageSection';
import { GeneralSection } from '../components/settings/GeneralSection';
import { SecuritySection } from '../components/settings/SecuritySection';
import { NotificationsSection } from '../components/settings/NotificationsSection';
import { HelpSection } from '../components/settings/HelpSection';
import { AboutSection } from '../components/settings/AboutSection';
import { WorkspacesPage } from './WorkspacesPage';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useContext(AuthContext);

  const user = authContext?.user;
  const signOut = authContext?.signOut || (async () => {});

  // Parse active section from URL path
  const getActiveSectionFromPath = (): SettingsSection | null => {
    const pathParts = location.pathname.split('/');
    const sectionIndex = pathParts.indexOf('settings') + 1;
    const section = pathParts[sectionIndex] as SettingsSection;

    const validSections: SettingsSection[] = [
      'general',
      'security',
      'workspaces',
      'members',
      'notifications',
      'billing',
      'help',
      'about',
    ];

    return validSections.includes(section) ? section : null;
  };

  const [activeSection, setActiveSection] = useState<SettingsSection | null>(
    getActiveSectionFromPath()
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobileMenu, setShowMobileMenu] = useState(true);

  // Track mobile viewport changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync active section with URL
  useEffect(() => {
    const section = getActiveSectionFromPath();
    setActiveSection(section);

    // On mobile, if there's a section in URL, show detail view
    if (isMobile && section) {
      setShowMobileMenu(false);
    } else if (isMobile && !section) {
      setShowMobileMenu(true);
    }
  }, [location.pathname, isMobile]);

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    navigate(`/settings/${section}`);

    // On mobile, hide menu and show detail view
    if (isMobile) {
      setShowMobileMenu(false);
    }
  };

  const handleBackToMenu = () => {
    setShowMobileMenu(true);
    setActiveSection(null);
    navigate('/settings');
  };

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut();
      navigate('/signin');
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

  const renderContent = () => {
    if (!activeSection) {
      return (
        <div className="settings-welcome">
          <div className="settings-welcome-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <h2>Settings</h2>
            <p>Select a setting from the menu to get started</p>
          </div>
        </div>
      );
    }

    const sectionTitles: Record<SettingsSection, { title: string; description: string }> = {
      general: {
        title: 'General Settings',
        description: 'Manage your account details and personal information',
      },
      security: {
        title: 'Security',
        description: 'Manage your password and authentication settings',
      },
      workspaces: {
        title: 'Workspaces',
        description: 'Manage your workspaces and organize your data',
      },
      members: {
        title: 'Team Members',
        description: 'Invite and manage your workspace team members',
      },
      notifications: {
        title: 'Notifications',
        description: 'Customize your notification preferences',
      },
      billing: {
        title: 'Billing & Plans',
        description: 'Manage your subscription and payment methods',
      },
      help: {
        title: 'Help & Support',
        description: 'Get help and contact our support team',
      },
      about: {
        title: 'About',
        description: 'Version information and legal documents',
      },
    };

    const section = sectionTitles[activeSection];

    return (
      <div className="settings-content-container">
        {isMobile && (
          <div className="settings-mobile-header">
            <button className="back-to-menu-btn" onClick={handleBackToMenu}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Settings Menu
            </button>
          </div>
        )}
        {(() => {
          switch (activeSection) {
            case 'general':
              return <GeneralSection />;
            case 'security':
              return <SecuritySection />;
            case 'notifications':
              return <NotificationsSection />;
            case 'billing':
              return <UsageSection />;
            case 'workspaces':
              return <WorkspacesPage />;
            case 'help':
              return <HelpSection />;
            case 'about':
              return <AboutSection />;
            case 'members':
              return <ComingSoon title={section.title} description={section.description} />;
            default:
              return <ComingSoon title={section.title} description={section.description} />;
          }
        })()}
      </div>
    );
  };

  return (
    <div className="settings-page-container">
      {/* Desktop: Always show both sidebar and content */}
      {!isMobile && (
        <>
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            onSignOut={handleSignOut}
          />
          <div className="settings-content-area">
            <div className="settings-header-bar">
              <div className="settings-user-info">
                <div className="settings-avatar">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} />
                  ) : (
                    <span>{getInitials(user?.displayName || user?.email || 'U')}</span>
                  )}
                </div>
                <div className="settings-user-details">
                  <h2>{user?.displayName || 'User'}</h2>
                  <p>{user?.email}</p>
                </div>
              </div>
            </div>
            <div className="settings-content-wrapper">{renderContent()}</div>
          </div>
        </>
      )}

      {/* Mobile: Show menu or detail view based on state */}
      {isMobile && showMobileMenu && (
        <div className="settings-mobile-container">
          <div className="settings-header">
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
                <button className="settings-menu-item" onClick={() => handleSectionChange('general')}>
                  <div className="menu-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="menu-item-content">
                    <span className="menu-item-title">General</span>
                    <span className="menu-item-subtitle">Manage your account details</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button className="settings-menu-item" onClick={() => handleSectionChange('security')}>
                  <div className="menu-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="menu-item-content">
                    <span className="menu-item-title">Security</span>
                    <span className="menu-item-subtitle">Password and authentication</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="settings-mobile-section">
              <h3 className="mobile-section-title">Workspace</h3>
              <div className="settings-menu">
                <button className="settings-menu-item" onClick={() => handleSectionChange('members')}>
                  <div className="menu-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="menu-item-content">
                    <span className="menu-item-title">Members</span>
                    <span className="menu-item-subtitle">Invite and manage team members</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="settings-mobile-section">
              <h3 className="mobile-section-title">Preferences</h3>
              <div className="settings-menu">
                <button className="settings-menu-item" onClick={() => handleSectionChange('notifications')}>
                  <div className="menu-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="menu-item-content">
                    <span className="menu-item-title">Notifications</span>
                    <span className="menu-item-subtitle">Manage notification settings</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="settings-mobile-section">
              <h3 className="mobile-section-title">Billing</h3>
              <div className="settings-menu">
                <button className="settings-menu-item" onClick={() => handleSectionChange('billing')}>
                  <div className="menu-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="menu-item-content">
                    <span className="menu-item-title">Billing & Plans</span>
                    <span className="menu-item-subtitle">Manage subscription and payments</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="settings-mobile-section">
              <h3 className="mobile-section-title">Support</h3>
              <div className="settings-menu">
                <button className="settings-menu-item" onClick={() => handleSectionChange('help')}>
                  <div className="menu-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="menu-item-content">
                    <span className="menu-item-title">Help & Support</span>
                    <span className="menu-item-subtitle">Get help and contact support</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button className="settings-menu-item" onClick={() => handleSectionChange('about')}>
                  <div className="menu-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="menu-item-content">
                    <span className="menu-item-title">About</span>
                    <span className="menu-item-subtitle">Version and legal information</span>
                  </div>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="settings-mobile-section">
              <button className="signout-btn" onClick={handleSignOut}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Detail view */}
      {isMobile && !showMobileMenu && <div className="settings-mobile-detail">{renderContent()}</div>}
    </div>
  );
};

export default SettingsPage;

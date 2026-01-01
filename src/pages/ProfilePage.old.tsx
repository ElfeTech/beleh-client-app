import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  const user = authContext?.user;
  const signOut = authContext?.signOut || (async () => {});

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut();
      navigate('/signin');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-large">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || 'User'} />
          ) : (
            <span>{getInitials(user?.displayName || user?.email || 'U')}</span>
          )}
        </div>
        <h2>{user?.displayName || 'User'}</h2>
        <p>{user?.email}</p>
      </div>

      <div className="profile-sections">
        <div className="profile-section">
          <h3 className="section-title">Account</h3>
          <div className="profile-menu">
            <button className="profile-menu-item" onClick={() => alert('Coming soon!')}>
              <div className="menu-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="menu-item-content">
                <span className="menu-item-title">Account Info</span>
                <span className="menu-item-subtitle">Manage your account details</span>
              </div>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button className="profile-menu-item" onClick={() => alert('Coming soon!')}>
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

        <div className="profile-section">
          <h3 className="section-title">Workspace</h3>
          <div className="profile-menu">
            <button className="profile-menu-item" onClick={() => alert('Coming soon!')}>
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

        <div className="profile-section">
          <h3 className="section-title">Preferences</h3>
          <div className="profile-menu">
            <button className="profile-menu-item" onClick={() => alert('Coming soon!')}>
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

        <div className="profile-section">
          <h3 className="section-title">Billing</h3>
          <div className="profile-menu">
            <button className="profile-menu-item" onClick={() => alert('Coming soon!')}>
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

        <div className="profile-section">
          <h3 className="section-title">Support</h3>
          <div className="profile-menu">
            <button className="profile-menu-item" onClick={() => alert('Coming soon!')}>
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

            <button className="profile-menu-item" onClick={() => alert('Coming soon!')}>
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

        <div className="profile-section">
          <button className="signout-btn" onClick={handleSignOut}>
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

export default ProfilePage;

import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkspaceContext } from '../../context/WorkspaceContext';
import './BottomNav.css';

interface BottomNavProps {
  workspaceId: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ workspaceId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const workspaceContext = useContext(WorkspaceContext);
  const [showToast, setShowToast] = useState(false);

  const datasources = workspaceContext?.datasources || [];
  const hasDatasets = datasources.length > 0;

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('/datasets')) return 'datasets';
    if (path.includes('/sessions')) return 'sessions';
    if (path.includes('/profile')) return 'profile';
    return 'chat';
  };

  const currentTab = getCurrentTab();

  const handleTabClick = (tab: string) => {
    // Block sessions navigation if no datasets exist
    if (tab === 'sessions' && !hasDatasets) {
      setShowToast(true);
      // Auto-hide toast after 3 seconds
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    switch (tab) {
      case 'chat':
        navigate(`/workspace/${workspaceId}`);
        break;
      case 'datasets':
        navigate(`/workspace/${workspaceId}/datasets`);
        break;
      case 'sessions':
        navigate(`/workspace/${workspaceId}/sessions`);
        break;
      case 'profile':
        navigate(`/settings`);
        break;
    }
  };

  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-item ${currentTab === 'chat' ? 'active' : ''}`}
        onClick={() => handleTabClick('chat')}
        aria-label="Chat"
      >
        <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className="bottom-nav-label">Chat</span>
      </button>

      <button
        className={`bottom-nav-item ${currentTab === 'datasets' ? 'active' : ''}`}
        onClick={() => handleTabClick('datasets')}
        aria-label="Datasets"
      >
        <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
        <span className="bottom-nav-label">Datasets</span>
      </button>

      <button
        className={`bottom-nav-item ${currentTab === 'sessions' ? 'active' : ''} ${!hasDatasets ? 'disabled' : ''}`}
        onClick={() => handleTabClick('sessions')}
        aria-label="Sessions"
        aria-disabled={!hasDatasets}
      >
        <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span className="bottom-nav-label">Sessions</span>
      </button>

      <button
        className={`bottom-nav-item ${currentTab === 'profile' ? 'active' : ''}`}
        onClick={() => handleTabClick('profile')}
        aria-label="Profile"
      >
        <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="bottom-nav-label">Profile</span>
      </button>

      {/* Toast notification for disabled sessions */}
      {showToast && (
        <div className="bottom-nav-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Upload a dataset first to enable sessions</span>
        </div>
      )}
    </nav>
  );
};

export default BottomNav;

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

interface BottomNavProps {
  workspaceId: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ workspaceId }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('/datasets')) return 'datasets';
    if (path.includes('/profile') || path.startsWith('/settings')) return 'profile';
    return 'chat';
  };

  const currentTab = getCurrentTab();

  const handleTabClick = (tab: string) => {
    switch (tab) {
      case 'chat':
        navigate(`/workspace/${workspaceId}`);
        break;
      case 'datasets':
        navigate(`/workspace/${workspaceId}/datasets`);
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <span className="bottom-nav-label">Chat</span>
      </button>

      <button
        className={`bottom-nav-item ${currentTab === 'datasets' ? 'active' : ''}`}
        onClick={() => handleTabClick('datasets')}
        aria-label="Datasets"
      >
        <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
        <span className="bottom-nav-label">Datasets</span>
      </button>

      <button
        className={`bottom-nav-item ${currentTab === 'profile' ? 'active' : ''}`}
        onClick={() => handleTabClick('profile')}
        aria-label="Profile"
      >
        <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span className="bottom-nav-label">Profile</span>
      </button>
    </nav>
  );
};

export default BottomNav;

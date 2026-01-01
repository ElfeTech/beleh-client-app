import React from 'react';
import './ComingSoon.css';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ title, description }) => {
  return (
    <div className="coming-soon-container">
      <div className="coming-soon-content">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        <div className="coming-soon-badge">Coming Soon</div>
      </div>
    </div>
  );
};

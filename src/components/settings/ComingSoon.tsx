import React from 'react';
import { Clock } from 'lucide-react';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import './SettingsShared.css';
import './ComingSoon.css';

interface ComingSoonProps {
  title: string;
  description?: string;
  breadcrumbLabel?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  title,
  description,
  breadcrumbLabel,
}) => {
  const crumb = breadcrumbLabel || title.toUpperCase().replace(/\s+/g, ' ');

  return (
    <div className="coming-soon-container">
      <SettingsSectionHeader
        breadcrumbLabel={crumb}
        title={title}
        description={description || 'This area is under development.'}
        icon={<Clock size={20} strokeWidth={1.75} />}
      />
      <div className="settings-card coming-soon-content">
        <div className="coming-soon-badge">Coming Soon</div>
        <p className="coming-soon-lede">
          We are building this experience to match enterprise governance workflows.
        </p>
        <button type="button" className="btn-gradient-primary btn-gradient-primary--sm" disabled>
          + Send Invite
        </button>
      </div>
    </div>
  );
};

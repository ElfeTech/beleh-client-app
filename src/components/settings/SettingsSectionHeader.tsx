import type { ReactNode } from 'react';
import './SettingsSectionHeader.css';

interface SettingsSectionHeaderProps {
  breadcrumbLabel: string;
  title: string;
  description: string;
  icon: ReactNode;
}

export function SettingsSectionHeader({
  breadcrumbLabel,
  title,
  description,
  icon,
}: SettingsSectionHeaderProps) {
  return (
    <header className="settings-section-header">
      <p className="settings-section-header__crumb">
        SETTINGS <span aria-hidden>//</span> {breadcrumbLabel}
      </p>
      <div className="settings-section-header__title-row">
        <span className="settings-section-header__icon" aria-hidden>
          {icon}
        </span>
        <div>
          <h1 className="settings-section-header__title font-display">{title}</h1>
          <p className="settings-section-header__lede">{description}</p>
        </div>
      </div>
    </header>
  );
}

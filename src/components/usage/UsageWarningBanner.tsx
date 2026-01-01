import { useState, useEffect } from 'react';
import { useUsage } from '../../context/UsageContext';
import './UsageWarningBanner.css';

export function UsageWarningBanner() {
  const { summary, hasWarning } = useUsage();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissal when warnings change
  useEffect(() => {
    setIsDismissed(false);
  }, [summary?.warnings]);

  // Don't show if no warnings or dismissed
  if (!summary?.warnings || summary.warnings.length === 0 || isDismissed) {
    return null;
  }

  // Get the highest priority warning
  const criticalWarning = summary.warnings.find((w) => w.level === 'critical');
  const warning = criticalWarning || summary.warnings.find((w) => w.level === 'warning');

  if (!warning) return null;

  const isCritical = warning.level === 'critical';
  const isWarning = warning.level === 'warning';

  return (
    <div
      className={`usage-warning-banner ${
        isCritical ? 'critical' : isWarning ? 'warning' : 'info'
      }`}
      role="alert"
    >
      <div className="warning-icon">
        {isCritical ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
      </div>
      <div className="warning-content">
        <strong className="warning-title">
          {isCritical ? 'Limit Reached' : 'Usage Warning'}
        </strong>
        <p className="warning-message">{warning.message}</p>
      </div>
      <div className="warning-actions">
        {hasWarning('critical') && (
          <a href="/workspace/1/profile/billing" className="upgrade-link">
            Upgrade Plan
          </a>
        )}
        <button
          onClick={() => setIsDismissed(true)}
          className="dismiss-btn"
          aria-label="Dismiss warning"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

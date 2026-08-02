import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  canAccessBillingSettings,
  isUnlimitedLimit,
  isUsageHardLimit,
  isUsageSoftWarn,
  trialDaysLeft,
  usagePct,
} from '../../utils/workspaceAccess';
import { formatQuotaResetDate } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function CommonMenu() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { workspaceUsage, currentRole } = useWorkspace();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const showBilling = canAccessBillingSettings(currentRole);

  const handleSignOutConfirm = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };

  const tokensUsed = workspaceUsage?.llm_tokens_used;
  const tokensLimit = workspaceUsage?.llm_tokens_limit;
  const dailyUsed = workspaceUsage?.daily_llm_tokens_used;
  const dailyLimit = workspaceUsage?.daily_llm_tokens_limit;
  const resetLabel = formatQuotaResetDate(workspaceUsage?.reset_at);
  const daysLeft = workspaceUsage?.is_trial ? trialDaysLeft(workspaceUsage.trial_end) : null;

  const getUsageColor = () => {
    if (
      (tokensUsed != null && isUsageHardLimit(tokensUsed, tokensLimit)) ||
      (dailyUsed != null && isUsageHardLimit(dailyUsed, dailyLimit))
    ) {
      return 'var(--color-error)';
    }
    if (
      (tokensUsed != null && isUsageSoftWarn(tokensUsed, tokensLimit)) ||
      (dailyUsed != null && isUsageSoftWarn(dailyUsed, dailyLimit))
    ) {
      return 'var(--color-warning)';
    }
    return 'inherit';
  };

  const getUsageText = () => {
    if (!workspaceUsage) return 'Usage unavailable';
    const parts: string[] = [];
    if (tokensUsed != null && tokensLimit != null && !isUnlimitedLimit(tokensLimit)) {
      const pct = Math.round(usagePct(tokensUsed, tokensLimit));
      parts.push(`${pct}% AI tokens`);
    }
    if (dailyUsed != null && dailyLimit != null && !isUnlimitedLimit(dailyLimit)) {
      const pct = Math.round(usagePct(dailyUsed, dailyLimit));
      parts.push(`${pct}% daily`);
    }
    if (daysLeft != null) {
      parts.push(daysLeft === 0 ? 'trial ends today' : `${daysLeft}d trial left`);
    }
    if (parts.length === 0) {
      const ds = workspaceUsage.datasources_used;
      const dsLimit = workspaceUsage.datasources_limit;
      if (!isUnlimitedLimit(dsLimit)) {
        parts.push(`${ds} of ${dsLimit} sources`);
      }
    }
    if (resetLabel) parts.push(`resets ${resetLabel}`);
    return parts.join(' · ') || 'Usage available';
  };

  return (
    <>
      <div className="sidebar-footer">
        <div className="sidebar-footer-actions">
          <button
            className="footer-action-btn"
            title="Settings"
            onClick={() => navigate('/settings/general')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </button>
          <button
            className="footer-action-btn"
            title="Help & Support"
            onClick={() => navigate('/settings/help')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Help
          </button>
          {showBilling && (
            <button
              className="footer-action-btn"
              title="Billing"
              onClick={() => navigate('/settings/billing')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Billing
            </button>
          )}
          <button
            className="footer-action-btn"
            title="Sign out"
            onClick={() => setShowSignOutConfirm(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
        <div className="usage-info" style={{ color: getUsageColor() }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          {getUsageText()}
        </div>
      </div>

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
    </>
  );
}

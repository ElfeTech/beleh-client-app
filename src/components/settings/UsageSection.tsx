import { useState } from 'react';
import { useUsage } from '../../context/UsageContext';
import { format } from 'date-fns';
import { UpgradePlansModal } from './UpgradePlansModal';
import './UsageSection.css';

export function UsageSection() {
  const { currentUsage, summary, remaining, isLoading, error } = useUsage();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (isLoading && !currentUsage) {
    return (
      <div className="usage-section">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error && !currentUsage) {
    return (
      <div className="usage-section">
        <div className="error-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Failed to Load Usage Data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return '#EF4444';
    if (percentage >= 90) return '#EF4444';
    if (percentage >= 70) return '#F59E0B';
    return '#3B82F6';
  };

  const getProgressGradient = (percentage: number) => {
    if (percentage >= 100) return 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
    if (percentage >= 90) return 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
    if (percentage >= 70) return 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
    return 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const queryPercentage = remaining
    ? (remaining.queries_used / remaining.queries_limit) * 100
    : 0;

  const datasetsPercentage = currentUsage
    ? (currentUsage.metrics.datasets_used / currentUsage.metrics.datasets_limit) * 100
    : 0;

  const tokensPercentage = currentUsage
    ? (currentUsage.metrics.llm_tokens_used / currentUsage.metrics.llm_tokens_limit) * 100
    : 0;

  return (
    <div className="usage-section-modern">
      {/* Hero Section */}
      <div className="usage-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Usage & Billing</h1>
            <p>Monitor your usage, manage your subscription, and upgrade anytime</p>
          </div>
          {currentUsage?.reset_at && (
            <div className="cycle-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Resets {formatDate(currentUsage.reset_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Plan Overview Card */}
      {currentUsage?.plan && (
        <div className="plan-overview-card">
          <div className="plan-header-section">
            <div className="plan-info">
              <div className="plan-tier-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span>{currentUsage.plan.name} Plan</span>
              </div>
              <h2 className="plan-title">{currentUsage.plan.description}</h2>
              <div className="plan-price">
                <span className="price-amount">${currentUsage.plan.price_monthly}</span>
                <span className="price-period">per month</span>
              </div>
            </div>
            <button className="upgrade-btn-header" disabled /* onClick={() => setShowUpgradeModal(true)}*/>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Upgrade Plan
            </button>
          </div>
        </div>
      )}

      {/* Usage Stats Grid */}
      <div className="usage-stats-grid">
        {/* Queries Card */}
        <div className="stat-card queries-card">
          <div className="stat-card-header">
            <div className="stat-icon queries-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="stat-header-text">
              <h3>Queries</h3>
              <p>Monthly API queries</p>
            </div>
          </div>
          <div className="stat-numbers">
            <div className="stat-value">{remaining?.queries_used.toLocaleString() || 0}</div>
            <div className="stat-limit">of {remaining?.queries_limit.toLocaleString() || 0}</div>
          </div>
          <div className="stat-progress">
            <div className="progress-track">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(queryPercentage, 100)}%`,
                  background: getProgressGradient(queryPercentage),
                }}
              >
                <div className="progress-shimmer"></div>
              </div>
            </div>
            <div className="progress-labels">
              <span className="progress-percentage" style={{ color: getProgressColor(queryPercentage) }}>
                {queryPercentage.toFixed(0)}%
              </span>
              <span className="progress-remaining">{remaining?.queries_remaining.toLocaleString()} left</span>
            </div>
          </div>
        </div>

        {/* Datasets Card */}
        {currentUsage?.metrics && (
          <div className="stat-card datasets-card">
            <div className="stat-card-header">
              <div className="stat-icon datasets-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div className="stat-header-text">
                <h3>Datasets</h3>
                <p>Active data sources</p>
              </div>
            </div>
            <div className="stat-numbers">
              <div className="stat-value">{currentUsage.metrics.datasets_used}</div>
              <div className="stat-limit">of {currentUsage.metrics.datasets_limit}</div>
            </div>
            <div className="stat-progress">
              <div className="progress-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(datasetsPercentage, 100)}%`,
                    background: getProgressGradient(datasetsPercentage),
                  }}
                >
                  <div className="progress-shimmer"></div>
                </div>
              </div>
              <div className="progress-labels">
                <span className="progress-percentage" style={{ color: getProgressColor(datasetsPercentage) }}>
                  {datasetsPercentage.toFixed(0)}%
                </span>
                <span className="progress-remaining">{currentUsage.metrics.datasets_remaining} available</span>
              </div>
            </div>
          </div>
        )}

        {/* LLM Tokens Card */}
        {currentUsage?.metrics && (
          <div className="stat-card tokens-card">
            <div className="stat-card-header">
              <div className="stat-icon tokens-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="stat-header-text">
                <h3>LLM Tokens</h3>
                <p>AI processing tokens</p>
              </div>
            </div>
            <div className="stat-numbers">
              <div className="stat-value">{(currentUsage.metrics.llm_tokens_used / 1000).toFixed(1)}K</div>
              <div className="stat-limit">of {(currentUsage.metrics.llm_tokens_limit / 1000).toFixed(0)}K</div>
            </div>
            <div className="stat-progress">
              <div className="progress-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(tokensPercentage, 100)}%`,
                    background: getProgressGradient(tokensPercentage),
                  }}
                >
                  <div className="progress-shimmer"></div>
                </div>
              </div>
              <div className="progress-labels">
                <span className="progress-percentage" style={{ color: getProgressColor(tokensPercentage) }}>
                  {tokensPercentage.toFixed(0)}%
                </span>
                <span className="progress-remaining">
                  {(currentUsage.metrics.llm_tokens_remaining / 1000).toFixed(1)}K left
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warnings Section */}
      {summary?.warnings && summary.warnings.length > 0 && (
        <div className="alerts-section">
          <h3 className="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Usage Alerts
          </h3>
          <div className="alerts-list">
            {summary.warnings.map((warning, index) => (
              <div key={index} className={`alert-item alert-${warning.level}`}>
                <div className="alert-icon-wrapper">
                  {warning.level === 'critical' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                </div>
                <p className="alert-message">{warning.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Features Section */}
      {currentUsage?.plan?.limits && (
        <div className="features-section">
          <h3 className="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Plan Includes
          </h3>
          <div className="features-grid-modern">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="feature-content">
                <div className="feature-value">{currentUsage.plan.limits.monthly_query_limit.toLocaleString()}</div>
                <div className="feature-label">Queries per month</div>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <div className="feature-content">
                <div className="feature-value">{currentUsage.plan.limits.max_datasets}</div>
                <div className="feature-label">Datasets</div>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                </svg>
              </div>
              <div className="feature-content">
                <div className="feature-value">{(currentUsage.plan.limits.monthly_llm_token_limit / 1000).toFixed(0)}K</div>
                <div className="feature-label">AI tokens per month</div>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div className="feature-content">
                <div className="feature-value">{currentUsage.plan.limits.monthly_chart_renders_limit}</div>
                <div className="feature-label">Chart renders</div>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </div>
              <div className="feature-content">
                <div className="feature-value">{currentUsage.plan.limits.max_workspaces}</div>
                <div className="feature-label">Workspace{currentUsage.plan.limits.max_workspaces > 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {queryPercentage >= 70 && (
        <div className="upgrade-cta-modern">
          <div className="cta-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="cta-content">
            <h3>Running low on queries?</h3>
            <p>Upgrade to a higher plan for more capacity, advanced features, and priority support</p>
          </div>
          <button className="cta-button" onClick={() => setShowUpgradeModal(true)}>
            Explore Plans
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      )}

      {/* Upgrade Plans Modal */}
      {currentUsage?.plan && (
        <UpgradePlansModal
          isOpen={showUpgradeModal}
          currentPlanId={currentUsage.plan.id}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}

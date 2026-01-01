import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import type { Plan } from '../../types/usage';
import './UpgradePlansModal.css';

export interface UpgradePlansModalProps {
  isOpen: boolean;
  currentPlanId: string;
  onClose: () => void;
}

export function UpgradePlansModal({ isOpen, currentPlanId, onClose }: UpgradePlansModalProps) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const fetchPlans = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const token = await user.getIdToken();

      // Fetch available plans and current user's plan in parallel
      const [availablePlansResponse, currentPlanResponse] = await Promise.all([
        apiClient.getAvailablePlans(),
        apiClient.getCurrentPlan(token),
      ]);

      // Filter active plans and sort by price (smallest to largest)
      const activePlans = availablePlansResponse.plans
        .filter((plan) => plan.is_active)
        .sort((a, b) => a.price_monthly - b.price_monthly);

      setPlans(activePlans);

      // Set billing cycle from current plan response
      setBillingCycle(currentPlanResponse.billing_cycle);

    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError('Failed to load available plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const getPrice = (plan: Plan) => {
    return billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  };

  const isCurrentPlan = (planId: string) => planId === currentPlanId;

  const getPlanBadge = (tier: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      free: { label: 'Free', color: '#6B7280' },
      starter: { label: 'Starter', color: '#3B82F6' },
      pro: { label: 'Pro', color: '#8B5CF6' },
      enterprise: { label: 'Enterprise', color: '#EC4899' },
    };
    return badges[tier.toLowerCase()] || { label: tier, color: '#6B7280' };
  };

  const modalContent = (
    <div className="upgrade-modal-backdrop" onClick={handleBackdropClick} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" tabIndex={-1}>
      <div className="upgrade-modal-container">
        {/* Header */}
        <div className="upgrade-modal-header">
          <div className="upgrade-modal-title-section">
            <h2>Upgrade Your Plan</h2>
            <p>Choose the plan that fits your needs</p>
          </div>
          <button className="upgrade-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Billing Toggle */}
        <div className="billing-cycle-toggle">
          <button
            className={`toggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={`toggle-option ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <span className="toggle-badge">Save 20%</span>
          </button>
        </div>

        {/* Content */}
        <div className="upgrade-modal-content">
          {isLoading ? (
            <div className="upgrade-loading">
              <div className="spinner"></div>
              <p>Loading plans...</p>
            </div>
          ) : error ? (
            <div className="upgrade-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
              <button className="retry-btn" onClick={fetchPlans}>
                Try Again
              </button>
            </div>
          ) : (
            <div className="plans-grid">
              {plans.map((plan) => {
                const badge = getPlanBadge(plan.tier);
                const isCurrent = isCurrentPlan(plan.id);

                return (
                  <div key={plan.id} className={`plan-card ${isCurrent ? 'current-plan' : ''}`}>
                    {/* Plan Badge */}
                    <div className="plan-badge" style={{ background: badge.color }}>
                      {badge.label}
                    </div>

                    {/* Plan Header */}
                    <div className="plan-card-header">
                      <h3 className="plan-name">{plan.name}</h3>
                      <p className="plan-description">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="plan-price-section">
                      <div className="plan-price">
                        <span className="price-currency">$</span>
                        <span className="price-value">{getPrice(plan)}</span>
                        <span className="price-period">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="plan-features">
                      <div className="feature-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{plan.limits.monthly_query_limit.toLocaleString()} queries/month</span>
                      </div>
                      <div className="feature-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{plan.limits.max_datasets} datasets</span>
                      </div>
                      <div className="feature-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{(plan.limits.monthly_llm_token_limit / 1000).toFixed(0)}K AI tokens/month</span>
                      </div>
                      <div className="feature-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{plan.limits.max_workspaces} workspace{plan.limits.max_workspaces > 1 ? 's' : ''}</span>
                      </div>
                      <div className="feature-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{plan.limits.monthly_chart_renders_limit} chart renders/month</span>
                      </div>
                      <div className="feature-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>
                          {plan.limits.max_members_per_workspace} member{plan.limits.max_members_per_workspace > 1 ? 's' : ''} per
                          workspace
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button className={`plan-cta ${isCurrent ? 'current' : ''}`} disabled={isCurrent}>
                      {isCurrent ? 'Current Plan' : 'Upgrade to ' + plan.name}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

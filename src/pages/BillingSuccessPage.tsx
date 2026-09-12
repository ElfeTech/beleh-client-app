import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useUsage } from '../context/UsageContext';
import { apiClient } from '../services/apiClient';
import '../components/settings/UsageSection.css';

const POLL_INTERVAL_MS = 1500;
const MAX_WAIT_MS = 30_000;

/**
 * Post-Checkout return page. Polls subscription until webhook sync lands (or timeout),
 * then redirects to /settings/billing?upgraded=1.
 */
export function BillingSuccessPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUsageAfterAction, currentUsage } = useUsage();
  const [statusText, setStatusText] = useState('Confirming your subscription…');
  const startedAt = useRef(Date.now());
  const baselineTier = useRef<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (baselineTier.current == null && currentUsage?.plan?.tier) {
      baselineTier.current = currentUsage.plan.tier.toLowerCase();
    }
  }, [currentUsage?.plan?.tier]);

  useEffect(() => {
    if (!user || done.current) return;

    let cancelled = false;
    let timeoutId = 0;

    const finish = (upgraded: boolean) => {
      if (done.current || cancelled) return;
      done.current = true;
      void refreshUsageAfterAction();
      navigate(upgraded ? '/settings/billing?upgraded=1' : '/settings/billing', { replace: true });
    };

    const poll = async () => {
      if (cancelled || done.current) return;

      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= MAX_WAIT_MS) {
        setStatusText('Taking longer than expected , opening billing…');
        finish(true);
        return;
      }

      try {
        const token = await user.getIdToken();
        const sub = await apiClient.getBillingSubscription(token);
        const tier = sub.plan?.tier?.toLowerCase() ?? '';
        const paidActive =
          Boolean(sub.stripe_subscription_id) &&
          (sub.status === 'active' ||
            sub.status === 'trial' ||
            sub.status === 'trialing' ||
            sub.status === 'past_due');
        const tierChanged =
          baselineTier.current != null && tier !== '' && tier !== baselineTier.current;
        const notFree = tier !== '' && !tier.includes('free');

        if (paidActive && (tierChanged || notFree)) {
          setStatusText('Subscription confirmed. Redirecting…');
          finish(true);
          return;
        }
      } catch {
        // Keep polling , webhook may still be in flight
      }

      timeoutId = window.setTimeout(() => {
        void poll();
      }, POLL_INTERVAL_MS);
    };

    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setStatusText('Missing checkout session. Opening billing…');
      timeoutId = window.setTimeout(() => finish(false), 800);
    } else {
      void poll();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [user, navigate, refreshUsageAfterAction, searchParams]);

  return (
    <div className="settings-page-section billing-page" style={{ padding: '2rem' }}>
      <div className="billing-loading settings-card">
        <div className="billing-spinner" />
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Payment received</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{statusText}</p>
      </div>
    </div>
  );
}

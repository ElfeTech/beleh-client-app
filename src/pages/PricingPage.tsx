import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingNav, useLandingTheme } from '../components/landing/LandingNav';
import { LandingPricing } from '../components/landing/LandingPricing';
import { LandingFooter } from '../components/landing/LandingFooter';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useAuth } from '../context/useAuth';
import { SITE_NAME } from '../constants/site';
import './landing/landing.css';

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const { isLight, toggleTheme } = useLandingTheme();

  useDocumentMeta({
    title: `Pricing | ${SITE_NAME}`,
    description:
      'Compare Beleh AI plans and start your free trial. Upgrade anytime with secure Stripe checkout.',
    path: '/pricing',
  });

  useEffect(() => {
    if (authLoading || !user) return;
    navigate('/settings/billing', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (authLoading || user) {
    return null;
  }

  return (
    <div className="landing-page landing-page--pricing">
      <LandingNav isScrolled={isScrolled} isLight={isLight} onToggleTheme={toggleTheme} />
      <main>
        <LandingPricing standalone />
      </main>
      <LandingFooter />
    </div>
  );
}

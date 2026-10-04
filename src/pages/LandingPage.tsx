import { useEffect, useState } from 'react';
import { LandingNav } from '../components/landing/LandingNav';
import { LandingHero } from '../components/landing/LandingHero';
import { LandingProblem } from '../components/landing/LandingProblem';
import { LandingHow } from '../components/landing/LandingHow';
import { LandingFeatures } from '../components/landing/LandingFeatures';
import { LandingUseCases } from '../components/landing/LandingUseCases';
import { LandingTeam } from '../components/landing/LandingTeam';
import { LandingPricing } from '../components/landing/LandingPricing';
import { LandingFaq } from '../components/landing/LandingFaq';
import { LandingFinalCta } from '../components/landing/LandingFinalCta';
import { LandingFooter } from '../components/landing/LandingFooter';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import './landing/landing.css';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  useDocumentMeta({ path: '/' });

  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing-page">
      <LandingNav isScrolled={isScrolled} />
      <main>
        <LandingHero />
        <LandingProblem />
        <LandingHow />
        <LandingFeatures />
        <LandingUseCases />
        <LandingTeam />
        <LandingPricing />
        <LandingFaq />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}

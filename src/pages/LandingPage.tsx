import { useEffect, useState } from 'react';
import { LandingNav, useLandingTheme } from '../components/landing/LandingNav';
import { LandingHero } from '../components/landing/LandingHero';
import { LandingProblem } from '../components/landing/LandingProblem';
import { LandingHow } from '../components/landing/LandingHow';
import { LandingFeatures } from '../components/landing/LandingFeatures';
import { LandingSavings } from '../components/landing/LandingSavings';
import { LandingProof } from '../components/landing/LandingProof';
import { LandingPricing } from '../components/landing/LandingPricing';
import { LandingFinalCta } from '../components/landing/LandingFinalCta';
import { LandingFooter } from '../components/landing/LandingFooter';
import './landing/landing.css';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { isLight, toggleTheme } = useLandingTheme();

  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const root = document.querySelector('.landing-page');
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    const observeAll = () => {
      root.querySelectorAll('.landing-reveal:not(.in)').forEach((el) => io.observe(el));
    };
    observeAll();

    const mo = new MutationObserver(observeAll);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div className="landing-page">
      <LandingNav isScrolled={isScrolled} isLight={isLight} onToggleTheme={toggleTheme} />
      <LandingHero />
      <LandingProblem />
      <LandingHow />
      <LandingFeatures />
      <LandingSavings />
      <LandingProof />
      <LandingPricing />
      <LandingFinalCta />
      <LandingFooter />
    </div>
  );
}

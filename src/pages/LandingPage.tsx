import { useCallback, useEffect, useRef, useState } from 'react';
import { LandingNav } from '../components/landing/LandingNav';
import { LandingHero } from '../components/landing/LandingHero';
import { LandingStatsBand } from '../components/landing/LandingStatsBand';
import { ExplorerEngine } from '../components/landing/ExplorerEngine';
import { LandingCta } from '../components/landing/LandingCta';
import { LandingFooter } from '../components/landing/LandingFooter';
import type { ExplorerTabId } from '../components/landing/explorerEngineData';
import type { LandingNavSection } from '../components/landing/explorerEngineData';
import { NAV_SECTIONS } from '../components/landing/explorerEngineData';
import './landing/landing.css';
import '../components/landing/ExplorerEngine.css';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [explorerTab, setExplorerTab] = useState<ExplorerTabId>('features');
  const explorerRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSectionSelect = useCallback((section: LandingNavSection) => {
    const navItem = NAV_SECTIONS.find((n) => n.id === section);
    if (navItem?.tab) {
      setExplorerTab(navItem.tab);
      requestAnimationFrame(() => {
        explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    if (section === 'metrics') {
      metricsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="landing-page">
      <LandingNav isScrolled={isScrolled} onSectionSelect={handleSectionSelect} />
      <LandingHero />
      <div ref={metricsRef}>
        <LandingStatsBand />
      </div>
      <div ref={explorerRef}>
        <ExplorerEngine activeTab={explorerTab} onTabChange={setExplorerTab} />
      </div>
      <LandingCta />
      <LandingFooter />
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Menu, X } from 'lucide-react';
import logo from '../../assets/logo.webp';
import { NAV_SECTIONS, type LandingNavSection } from './explorerEngineData';

interface LandingNavProps {
  isScrolled: boolean;
  onSectionSelect: (section: LandingNavSection) => void;
}

const NAV_DOTS = ['#3b82f6', '#ec4899', '#14b8a6', '#a855f7'];

export function LandingNav({ isScrolled, onSectionSelect }: LandingNavProps) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: LandingNavSection) => {
    onSectionSelect(id);
    setMobileOpen(false);
  };

  return (
    <nav className={`landing-nav ${isScrolled ? 'landing-nav--scrolled' : ''}`}>
      <div className="landing-nav__inner">
        <button
          type="button"
          className="landing-nav__brand"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <img src={logo} alt="Beleh" className="landing-nav__logo" />
          <div className="landing-nav__brand-text">
            <span className="landing-nav__name">beleh</span>
            <span className="landing-nav__tagline">ASK · ANALYZE · DECIDE</span>
          </div>
          <span className="landing-nav__workspace-pill">Workspace</span>
        </button>

        <div className={`landing-nav__menu ${mobileOpen ? 'landing-nav__menu--open' : ''}`}>
          {NAV_SECTIONS.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className="landing-nav__link"
              onClick={() => handleNav(item.id)}
            >
              <span className="landing-nav__dot" style={{ background: NAV_DOTS[i] }} />
              {item.label}
            </button>
          ))}
          <span className="landing-nav__uptime">
            <span className="landing-nav__uptime-dot" />
            99.9% uptime
          </span>
        </div>

        <div className="landing-nav__actions">
          <button
            type="button"
            className="landing-nav__sign-in"
            onClick={() => navigate('/signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className="landing-btn landing-btn--gradient"
            onClick={() => navigate('/signup')}
          >
            Start free
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="landing-nav__mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

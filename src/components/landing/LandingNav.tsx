import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from '../../assets/logo.webp';

interface LandingNavProps {
  readonly isScrolled: boolean;
}

const NAV_LINKS = [
  { section: 'how', label: 'How it works' },
  { section: 'features', label: 'Features' },
  { section: 'use-cases', label: 'Use cases' },
  { section: 'pricing', label: 'Pricing', isPage: true },
  { section: 'faq', label: 'FAQ' },
] as const;

function NavLink({
  section,
  label,
  isPage,
  onPricingPage,
  onNavigate,
}: Readonly<{
  section: string;
  label: string;
  isPage?: boolean;
  onPricingPage: boolean;
  onNavigate: () => void;
}>) {
  if (isPage) {
    return onPricingPage ? (
      <a href="/pricing" onClick={onNavigate}>
        {label}
      </a>
    ) : (
      <Link to="/pricing" onClick={onNavigate}>
        {label}
      </Link>
    );
  }
  if (onPricingPage) {
    return (
      <Link to={{ pathname: '/', hash: section }} onClick={onNavigate}>
        {label}
      </Link>
    );
  }
  return (
    <a href={`#${section}`} onClick={onNavigate}>
      {label}
    </a>
  );
}

export function LandingNav({ isScrolled }: LandingNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const onPricingPage = location.pathname === '/pricing';

  const handleBrandClick = () => {
    setOpen(false);
    if (onPricingPage) {
      navigate('/');
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className={`landing-header${isScrolled ? ' scrolled' : ''}${open ? ' open' : ''}`}>
      <div className="landing-wrap">
        <nav className="landing-nav" aria-label="Primary">
          <button
            type="button"
            className="landing-brand"
            onClick={handleBrandClick}
            aria-label="Beleh home"
          >
            <img src={logo} alt="Beleh — Ask. Analyze. Decide." className="landing-brand__logo" />
          </button>

          <div className="landing-nav-links" id="landing-nav-links">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.section}
                section={link.section}
                label={link.label}
                isPage={'isPage' in link ? link.isPage : false}
                onPricingPage={onPricingPage}
                onNavigate={() => setOpen(false)}
              />
            ))}
            <button
              type="button"
              className="landing-nav-links__signin"
              onClick={() => navigate('/signin')}
            >
              Sign in
            </button>
          </div>

          <div className="landing-nav-cta">
            <button type="button" className="signin" onClick={() => navigate('/signin')}>
              Sign in
            </button>
            <button
              type="button"
              className="landing-btn landing-btn-primary"
              onClick={() => navigate('/signup')}
            >
              Start free trial
            </button>
            <button
              type="button"
              className="landing-menu-toggle"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="landing-nav-links"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

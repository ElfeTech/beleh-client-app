import { useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme, type Theme } from '../../context/ThemeContext';
import logo from '../../assets/logo.webp';

interface LandingNavProps {
  readonly isScrolled: boolean;
  readonly isLight: boolean;
  readonly onToggleTheme: () => void;
}

const NAV_SECTIONS = [
  { section: 'how', label: 'How it works' },
  { section: 'savings', label: 'Your savings' },
  { section: 'proof', label: 'Results' },
  { section: 'pricing', label: 'Pricing', isPricing: true },
] as const;

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12H1M23 12h-2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavSectionLink({
  section,
  label,
  isPricing,
  onPricingPage,
}: Readonly<{
  section: string;
  label: string;
  isPricing?: boolean;
  onPricingPage: boolean;
}>) {
  if (isPricing) {
    if (onPricingPage) {
      return <a href="/pricing">{label}</a>;
    }
    return <Link to="/pricing">{label}</Link>;
  }

  if (onPricingPage) {
    return <Link to={{ pathname: '/', hash: section }}>{label}</Link>;
  }

  return <a href={`#${section}`}>{label}</a>;
}

export function LandingNav({ isScrolled, isLight, onToggleTheme }: LandingNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const onPricingPage = location.pathname === '/pricing';

  const handleBrandClick = () => {
    if (onPricingPage) {
      navigate('/');
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className={`landing-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="landing-wrap">
        <nav className="landing-nav" aria-label="Primary">
          <button
            type="button"
            className="landing-brand"
            onClick={handleBrandClick}
            aria-label="Beleh home"
          >
            <img src={logo} alt="Beleh" className="landing-brand__logo" />
          </button>

          <div className="landing-nav-links">
            {NAV_SECTIONS.map((link) => (
              <NavSectionLink
                key={link.section}
                section={link.section}
                label={link.label}
                isPricing={'isPricing' in link ? link.isPricing : false}
                onPricingPage={onPricingPage}
              />
            ))}
          </div>

          <div className="landing-nav-cta">
            <button type="button" className="signin" onClick={() => navigate('/signin')}>
              Sign in
            </button>
            <button
              type="button"
              className="landing-theme-toggle"
              onClick={onToggleTheme}
              aria-label="Toggle light and dark mode"
              title="Toggle light / dark"
            >
              {isLight ? <MoonIcon /> : <SunIcon />}
            </button>
            <button
              type="button"
              className="landing-btn landing-btn-primary"
              onClick={() => navigate('/signup')}
            >
              Start free trial
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

function applyLandingThemeAttr(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.dataset.landingTheme = 'light';
  } else {
    delete document.documentElement.dataset.landingTheme;
  }
}

/**
 * Landing theme follows the shared app preference:
 * - default / stored `system` → OS light/dark
 * - user toggle → persist explicit `light` or `dark` in localStorage
 */
export function useLandingTheme() {
  const { theme, setThemePreference } = useTheme();
  const isLight = theme === 'light';

  useLayoutEffect(() => {
    applyLandingThemeAttr(theme);
    return () => {
      delete document.documentElement.dataset.landingTheme;
    };
  }, [theme]);

  return {
    isLight,
    toggleTheme: () => setThemePreference(isLight ? 'dark' : 'light'),
  };
}

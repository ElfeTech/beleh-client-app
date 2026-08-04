import { useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, type Theme } from '../../context/ThemeContext';
import logo from '../../assets/logo.webp';

interface LandingNavProps {
  isScrolled: boolean;
  isLight: boolean;
  onToggleTheme: () => void;
}

const NAV_LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#savings', label: 'Your savings' },
  { href: '#proof', label: 'Results' },
  { href: '#pricing', label: 'Pricing' },
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

export function LandingNav({ isScrolled, isLight, onToggleTheme }: LandingNavProps) {
  const navigate = useNavigate();

  return (
    <header className={`landing-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="landing-wrap">
        <nav className="landing-nav" aria-label="Primary">
          <button
            type="button"
            className="landing-brand"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Beleh home"
          >
            <img src={logo} alt="Beleh" className="landing-brand__logo" />
          </button>

          <div className="landing-nav-links">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
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

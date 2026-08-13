import { Link } from 'react-router-dom';
import logo from '../../assets/logo.webp';

const SOCIALS = [
  { label: 'Yulona on X', href: 'https://x.com/theyulona', icon: 'x' },
  {
    label: 'Yulona on LinkedIn',
    href: 'https://www.linkedin.com/company/theyulona/',
    icon: 'linkedin',
  },
  { label: 'Yulona on Facebook', href: 'https://www.facebook.com/theyulona', icon: 'facebook' },
  { label: 'Yulona on TikTok', href: 'https://www.tiktok.com/@theyulona', icon: 'tiktok' },
] as const;

function SocialIcon({ icon }: Readonly<{ icon: (typeof SOCIALS)[number]['icon'] }>) {
  if (icon === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    );
  }
  if (icon === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M22 12.07C22 6.5 17.52 2 12 2S2 6.5 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H8.08v-2.9h2.36V9.84c0-2.34 1.4-3.63 3.52-3.63.99 0 2.03.18 2.03.18v2.24h-1.14c-1.13 0-1.48.7-1.48 1.42v1.71h2.52l-.4 2.9h-2.12V22c4.78-.75 8.44-4.91 8.44-9.93z" />
      </svg>
    );
  }
  if (icon === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.83 2.83 0 11-2.83-2.83c.28 0 .54.04.79.1V9.4a6.26 6.26 0 00-.79-.05 6.29 6.29 0 106.29 6.29V8.77a8.16 8.16 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-wrap">
        <div className="landing-foot-top">
          <div className="landing-foot-brand">
            <a href="#top" className="landing-brand">
              <img src={logo} alt="" className="landing-brand__logo" />
              <span>beleh</span>
            </a>
            <p>
              Ask. Analyze. Decide. Beleh turns your business data into plain-English answers, so
              decisions don&apos;t wait on dashboards.
            </p>
            <div className="landing-foot-socials">
              {SOCIALS.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                >
                  <SocialIcon icon={social.icon} />
                </a>
              ))}
            </div>
          </div>
          <div className="landing-foot-cols">
            <div className="landing-foot-col">
              <h5>Product</h5>
              <a href="#how">How it works</a>
              <a href="#savings">Your savings</a>
              <a href="#pricing">Security</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="landing-foot-col">
              <h5>Company</h5>
              <a href="#top">About</a>
              <a href="#top">Careers</a>
              <a href="#top">Contact</a>
            </div>
            <div className="landing-foot-col">
              <h5>Resources</h5>
              <Link to="/legal/terms">Terms of use</Link>
              <Link to="/legal/privacy">Privacy policy</Link>
              <Link to="/legal/cookies">Cookie policy</Link>
              <Link to="/legal/dpa">Data processing</Link>
            </div>
          </div>
        </div>
        <div className="landing-foot-bottom">
          <span>© {new Date().getFullYear()} Yulona. All rights reserved.</span>
          <div className="landing-foot-badges">
            <span>SOC 2</span>
            <span>GDPR ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

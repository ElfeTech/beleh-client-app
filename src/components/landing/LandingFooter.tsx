import logo from '../../assets/logo.webp';

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <div className="landing-footer__brand">
          <img src={logo} alt="Beleh" />
        </div>
        <p className="landing-footer__copy">
          © {new Date().getFullYear()} ElfeTech. All rights reserved.
        </p>
        <div className="landing-footer__badges">
          <span className="landing-footer__badge">SOC 2</span>
          <span className="landing-footer__badge">GDPR ready</span>
        </div>
      </div>
    </footer>
  );
}

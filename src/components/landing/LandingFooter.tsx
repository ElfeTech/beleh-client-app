import logo from '../../assets/logo.webp';

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
              <a href="#top">Documentation</a>
              <a href="#proof">Research &amp; sources</a>
              <a href="#top">Status</a>
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

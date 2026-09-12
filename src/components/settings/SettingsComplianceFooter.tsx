import { Link } from 'react-router-dom';
import { formatAppVersionLabel } from '../../lib/appMeta';
import { openCookiePreferences } from '../../lib/cookieConsent';

/**
 * Lightweight settings footer: trust + version, without ops/debug jargon.
 * Detailed build metadata lives in Settings → About.
 */
export function SettingsComplianceFooter() {
  return (
    <footer className="settings-compliance-footer" aria-label="App info">
      <span>Your connection is encrypted</span>
      <span aria-hidden="true" className="settings-compliance-footer__sep">
        ·
      </span>
      <span>Beleh {formatAppVersionLabel()}</span>
      <span aria-hidden="true" className="settings-compliance-footer__sep">
        ·
      </span>
      <Link to="/legal/privacy" className="settings-compliance-footer__link">
        Privacy
      </Link>
      <span aria-hidden="true" className="settings-compliance-footer__sep">
        ·
      </span>
      <Link to="/legal/terms" className="settings-compliance-footer__link">
        Terms
      </Link>
      <span aria-hidden="true" className="settings-compliance-footer__sep">
        ·
      </span>
      <button
        type="button"
        className="settings-compliance-footer__link settings-compliance-footer__button"
        onClick={() => openCookiePreferences()}
      >
        Cookie settings
      </button>
    </footer>
  );
}

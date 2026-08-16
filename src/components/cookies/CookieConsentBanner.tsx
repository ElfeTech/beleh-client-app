import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  acceptAllCookies,
  getDefaultDeniedCategories,
  hasCookieConsentChoice,
  openCookiePreferences,
  readCookieConsent,
  rejectNonEssentialCookies,
  subscribeCookieConsentOpen,
  writeCookieConsent,
  type CookieConsentCategories,
} from '../../lib/cookieConsent';
import './CookieConsentBanner.css';

type View = 'hidden' | 'banner' | 'preferences';

export function CookieConsentBanner() {
  const [view, setView] = useState<View>('hidden');
  const [draft, setDraft] = useState<CookieConsentCategories>(getDefaultDeniedCategories);

  useEffect(() => {
    if (!hasCookieConsentChoice()) {
      setView('banner');
      setDraft(getDefaultDeniedCategories());
      return;
    }
    const existing = readCookieConsent();
    if (existing) setDraft(existing.categories);
  }, []);

  useEffect(() => {
    return subscribeCookieConsentOpen(() => {
      const existing = readCookieConsent();
      setDraft(existing?.categories ?? getDefaultDeniedCategories());
      setView('preferences');
    });
  }, []);

  if (view === 'hidden') return null;

  const saveCustom = () => {
    writeCookieConsent({
      preferences: draft.preferences,
      analytics: draft.analytics,
    });
    setView('hidden');
  };

  return (
    <div className="cookie-consent" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent__panel">
        {view === 'banner' ? (
          <>
            <div className="cookie-consent__copy">
              <h2 id="cookie-consent-title" className="cookie-consent__title">
                We use cookies
              </h2>
              <p className="cookie-consent__text">
                We use necessary cookies to run Beleh securely, and optional analytics cookies (Google
                Analytics and Microsoft Clarity) to understand how the product is used so we can improve
                it. See our{' '}
                <Link to="/legal/cookies" className="cookie-consent__link">
                  Cookie Policy
                </Link>{' '}
                and{' '}
                <Link to="/legal/privacy" className="cookie-consent__link">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="cookie-consent__actions">
              <button
                type="button"
                className="cookie-consent__btn cookie-consent__btn--ghost"
                onClick={() => {
                  rejectNonEssentialCookies();
                  setView('hidden');
                }}
              >
                Reject non-essential
              </button>
              <button
                type="button"
                className="cookie-consent__btn cookie-consent__btn--secondary"
                onClick={() => setView('preferences')}
              >
                Customize
              </button>
              <button
                type="button"
                className="cookie-consent__btn cookie-consent__btn--primary"
                onClick={() => {
                  acceptAllCookies();
                  setView('hidden');
                }}
              >
                Accept all
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cookie-consent__copy">
              <h2 id="cookie-consent-title" className="cookie-consent__title">
                Cookie preferences
              </h2>
              <p className="cookie-consent__text">
                Choose which optional cookies we may use. Necessary cookies stay on so sign-in and core
                features work.
              </p>
            </div>

            <ul className="cookie-consent__categories">
              <li className="cookie-consent__category">
                <div>
                  <p className="cookie-consent__cat-title">Necessary</p>
                  <p className="cookie-consent__cat-desc">
                    Authentication, security, and workspace session. Always on.
                  </p>
                </div>
                <span className="cookie-consent__always-on">Always on</span>
              </li>
              <li className="cookie-consent__category">
                <div>
                  <p className="cookie-consent__cat-title">Preferences</p>
                  <p className="cookie-consent__cat-desc">
                    Theme, sidebar layout, and similar settings stored on this device.
                  </p>
                </div>
                <label className="cookie-consent__switch">
                  <input
                    type="checkbox"
                    checked={draft.preferences}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, preferences: e.target.checked }))
                    }
                  />
                  <span className="cookie-consent__switch-ui" aria-hidden />
                  <span className="sr-only">Preferences cookies</span>
                </label>
              </li>
              <li className="cookie-consent__category">
                <div>
                  <p className="cookie-consent__cat-title">Analytics</p>
                  <p className="cookie-consent__cat-desc">
                    Google Analytics and Microsoft Clarity help us measure usage and improve Beleh.
                  </p>
                </div>
                <label className="cookie-consent__switch">
                  <input
                    type="checkbox"
                    checked={draft.analytics}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, analytics: e.target.checked }))
                    }
                  />
                  <span className="cookie-consent__switch-ui" aria-hidden />
                  <span className="sr-only">Analytics cookies</span>
                </label>
              </li>
            </ul>

            <div className="cookie-consent__actions">
              <button
                type="button"
                className="cookie-consent__btn cookie-consent__btn--ghost"
                onClick={() => {
                  if (hasCookieConsentChoice()) setView('hidden');
                  else setView('banner');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cookie-consent__btn cookie-consent__btn--primary"
                onClick={saveCustom}
              >
                Save preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Re-export for footers / settings without importing the lib directly. */
export { openCookiePreferences };

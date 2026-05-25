import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';

const CTA_PERKS = ['FREE TIER AVAILABLE', 'NO CREDIT CARD REQUIRED', 'CANCEL ANYTIME'];

export function LandingCta() {
  const navigate = useNavigate();

  return (
    <section className="landing-cta">
      <div className="landing-cta__glow landing-cta__glow--a" aria-hidden />
      <div className="landing-cta__glow landing-cta__glow--b" aria-hidden />
      <div className="landing-cta__card">
        <span className="landing-pill landing-pill--teal landing-pill--center">
          PLATFORM_BOOTSTRAPER_ACTIVE
        </span>
        <h2 className="landing-cta__title">Ready to Transform Your Data?</h2>
        <p className="landing-cta__subtitle">
          Join thousands of teams making smarter, instant decisions with Beleh. Start free. No
          credit card required.
        </p>
        <div className="landing-cta__buttons">
          <button
            type="button"
            className="landing-btn landing-btn--gradient landing-btn--lg"
            onClick={() => navigate('/signup')}
          >
            INITIALIZE_FREE
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="landing-btn landing-btn--glass landing-btn--lg"
            onClick={() => navigate('/signin')}
          >
            RESOLVE_LOGIN
          </button>
        </div>
        <ul className="landing-cta__perks">
          {CTA_PERKS.map((perk) => (
            <li key={perk}>
              <Check size={14} strokeWidth={3} />
              {perk}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

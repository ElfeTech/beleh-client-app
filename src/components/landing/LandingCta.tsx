import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';

const CTA_PERKS = ['Free tier available', 'No credit card required', 'Cancel anytime'];

export function LandingCta() {
  const navigate = useNavigate();

  return (
    <section className="landing-cta">
      <div className="landing-cta__glow landing-cta__glow--a" aria-hidden />
      <div className="landing-cta__glow landing-cta__glow--b" aria-hidden />
      <div className="landing-cta__card">
        <span className="landing-pill landing-pill--teal landing-pill--center">
          Start in minutes
        </span>
        <h2 className="landing-cta__title">Ready to transform your data?</h2>
        <p className="landing-cta__subtitle">
          Join teams making smarter, faster decisions with Beleh. Start free — no credit card
          required.
        </p>
        <div className="landing-cta__buttons">
          <button
            type="button"
            className="landing-btn landing-btn--gradient landing-btn--lg"
            onClick={() => navigate('/signup')}
          >
            Create free account
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="landing-btn landing-btn--glass landing-btn--lg"
            onClick={() => navigate('/signin')}
          >
            Sign in
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

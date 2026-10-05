import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LandingCtaSim } from './LandingCtaSim';

export function LandingFinalCta() {
  const navigate = useNavigate();
  return (
    <section className="landing-final" aria-labelledby="cta-title">
      <div className="landing-wrap landing-final__grid">
        <div className="landing-final__copy">
          <h2 id="cta-title">Ask your first question today</h2>
          <p>
            Start a free 7-day trial, connect a spreadsheet or database and see your own numbers
            turn into answers. No credit card needed.
          </p>
          <button
            type="button"
            className="landing-btn landing-btn-white landing-btn-lg"
            onClick={() => navigate('/signup')}
          >
            Start your free trial
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
        <LandingCtaSim />
      </div>
    </section>
  );
}

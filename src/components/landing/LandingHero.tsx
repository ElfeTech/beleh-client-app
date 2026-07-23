import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { LandingHelpChat } from './LandingHelpChat';

export function LandingHero() {
  const navigate = useNavigate();

  return (
    <section className="landing-hero" id="top">
      <div className="landing-hero__grid-bg" aria-hidden />
      <div className="landing-hero__glow landing-hero__glow--left" aria-hidden />
      <div className="landing-hero__glow landing-hero__glow--right" aria-hidden />

      <div className="landing-hero__container">
        <div className="landing-hero__copy">
          <span className="landing-pill landing-pill--success">
            <span className="landing-pill__dot" />
            Ready for your team
          </span>

          <h1 className="landing-hero__title">
            Turn data into decisions with{' '}
            <span className="landing-hero__gradient">AI Intelligence</span>
          </h1>

          <p className="landing-hero__subtitle">
            Ask questions in plain English. Get instant answers, clear charts, and actionable
            insights — without waiting on dashboards or writing SQL. Built for business teams who
            need answers today.
          </p>

          <div className="landing-hero__cta">
            <button
              type="button"
              className="landing-btn landing-btn--gradient"
              onClick={() => navigate('/signup')}
            >
              Get started free
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="landing-hero__telemetry">
            <span>Answers in seconds</span>
            <span>SOC 2 ready</span>
            <span>No SQL required</span>
          </div>
        </div>

        <div className="landing-hero__visual">
          <LandingHelpChat />
        </div>
      </div>
    </section>
  );
}

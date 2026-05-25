import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight } from 'lucide-react';
import { LiveSimulator } from './LiveSimulator';

interface LandingHeroProps {
  simulatorRunId: number;
  onSimulateLobby: () => void;
}

export function LandingHero({ simulatorRunId, onSimulateLobby }: LandingHeroProps) {
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
            DATABASE COMPILER ACTIVE
          </span>

          <h1 className="landing-hero__title">
            Turn data into decisions with{' '}
            <span className="landing-hero__gradient">AI Intelligence</span>
          </h1>

          <p className="landing-hero__subtitle">
            Ask questions in plain English. Get instant answers, beautiful charts, and actionable
            insights — completely without friction. A modern, lightning-fast replacement for heavy
            legacy BI tools featuring flexible database mappings.
          </p>

          <div className="landing-hero__cta">
            <button
              type="button"
              className="landing-btn landing-btn--outline"
              onClick={() => navigate('/signup')}
            >
              LAUNCH WORKSPACE
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              className="landing-btn landing-btn--ghost"
              onClick={onSimulateLobby}
            >
              <Play size={16} fill="currentColor" />
              SIMULATE_LOBBY
            </button>
          </div>

          <div className="landing-hero__telemetry">
            <span>12.8ms</span>
            <span>SOC-2</span>
            <span>0 SQL</span>
          </div>
        </div>

        <div className="landing-hero__visual">
          <LiveSimulator runId={simulatorRunId} />
        </div>
      </div>
    </section>
  );
}

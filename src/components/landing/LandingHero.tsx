import { useNavigate } from 'react-router-dom';
import { LandingHelpChat } from './LandingHelpChat';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingHero() {
  const navigate = useNavigate();

  return (
    <section className="landing-hero" id="top">
      <svg
        className="landing-hero-bg-svg"
        viewBox="0 0 1440 700"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <g className="drift">
          <path
            d="M-40 560 C 140 500, 260 620, 440 560 S 740 480, 920 560 S 1220 620, 1400 560 S 1700 480, 1880 560"
            stroke="#2FE6B8"
            strokeWidth="1.4"
            fill="none"
            opacity=".22"
          />
          <path
            d="M680 560 C 860 500, 980 620, 1160 560 S 1460 480, 1640 560 S 1940 620, 2120 560 S 2420 480, 2600 560"
            stroke="#2FE6B8"
            strokeWidth="1.4"
            fill="none"
            opacity=".22"
          />
        </g>
        <g className="drift slow">
          <path
            d="M-40 620 C 160 560, 300 680, 500 610 S 820 540, 1000 610 S 1320 680, 1500 610 S 1820 540, 2000 610"
            stroke="#3B82F6"
            strokeWidth="1.2"
            fill="none"
            opacity=".18"
          />
          <path
            d="M680 620 C 880 560, 1020 680, 1220 610 S 1540 540, 1720 610 S 2040 680, 2220 610 S 2540 540, 2720 610"
            stroke="#3B82F6"
            strokeWidth="1.2"
            fill="none"
            opacity=".18"
          />
        </g>
        <g className="drift" style={{ animationDuration: '58s' }}>
          <path
            d="M-40 460 C 200 410, 340 500, 560 450 S 900 400, 1080 450 S 1420 500, 1560 450"
            stroke="#2FE6B8"
            strokeWidth="1"
            fill="none"
            opacity=".13"
          />
          <path
            d="M680 460 C 920 410, 1060 500, 1280 450 S 1620 400, 1800 450 S 2140 500, 2280 450"
            stroke="#2FE6B8"
            strokeWidth="1"
            fill="none"
            opacity=".13"
          />
        </g>
        <circle
          className="dot"
          cx="180"
          cy="180"
          r="2.5"
          fill="#2FE6B8"
          opacity=".5"
          style={{ animationDelay: '0s' }}
        />
        <circle
          className="dot"
          cx="1240"
          cy="140"
          r="2"
          fill="#3B82F6"
          opacity=".5"
          style={{ animationDelay: '1.2s' }}
        />
        <circle
          className="dot"
          cx="960"
          cy="260"
          r="2.5"
          fill="#2FE6B8"
          opacity=".4"
          style={{ animationDelay: '2.1s' }}
        />
        <circle
          className="dot"
          cx="320"
          cy="320"
          r="2"
          fill="#3B82F6"
          opacity=".4"
          style={{ animationDelay: '.6s' }}
        />
        <circle
          className="dot"
          cx="1380"
          cy="320"
          r="2.5"
          fill="#2FE6B8"
          opacity=".35"
          style={{ animationDelay: '3s' }}
        />
      </svg>

      <div className="landing-wrap landing-hero-grid">
        <div>
          <div className="landing-hero-badge">
            <span className="pip">NEW</span>
            <span className="txt">Ask your data a question. Get a real answer.</span>
          </div>
          <h1>
            Your data has a lot to say about your business.
            <br />
            <span className="muted-word">Dashboards keep it quiet.</span>
            <br />
            <span className="live-word">Beleh sets it free.</span>
          </h1>
          <p className="lede">
            Stop waiting on reports that arrive too late to matter. Ask Beleh anything, in plain
            English, and hear back in seconds , no SQL, no analysts, no six-week backlog.
          </p>
          <div className="landing-hero-ctas">
            <button
              type="button"
              className="landing-btn landing-btn-primary landing-btn-lg"
              onClick={() => navigate('/signup')}
            >
              Start your free 7-day trial
            </button>
            <a href="#savings" className="landing-btn landing-btn-ghost-dark landing-btn-lg">
              See what you&apos;d save ↓
            </a>
          </div>
          <div className="landing-hero-fine">
            <span>
              <CheckIcon />
              No credit card required
            </span>
            <span>
              <CheckIcon />
              Cancel anytime
            </span>
            <span>
              <CheckIcon />
              SOC 2 ready
            </span>
          </div>
        </div>

        <LandingHelpChat />
      </div>
    </section>
  );
}

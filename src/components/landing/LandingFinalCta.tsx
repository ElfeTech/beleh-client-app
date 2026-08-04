import { useNavigate } from 'react-router-dom';

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

export function LandingFinalCta() {
  const navigate = useNavigate();

  return (
    <section className="landing-section landing-final-cta" id="get-started">
      <div className="landing-wrap inner">
        <div className="landing-eyebrow" style={{ justifyContent: 'center', color: '#fff' }}>
          <span className="dot" style={{ color: 'var(--teal)' }} />
          READY WHEN YOU ARE
        </div>
        <h2>Give your data its voice back.</h2>
        <p>
          Start a free 7-day trial. Connect a source, ask your first real question, and see what
          your business has been trying to tell you.
        </p>
        <button
          type="button"
          className="landing-btn landing-btn-primary landing-btn-lg"
          onClick={() => navigate('/signup')}
        >
          Start your free 7-day trial
        </button>
        <div className="fine">
          <span>
            <CheckIcon />
            No credit card required
          </span>
          <span>
            <CheckIcon />
            7-day free trial
          </span>
          <span>
            <CheckIcon />
            Cancel anytime
          </span>
        </div>
      </div>
    </section>
  );
}

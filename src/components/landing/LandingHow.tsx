export function LandingHow() {
  return (
    <section className="landing-section landing-how" id="how">
      <div className="landing-wrap">
        <div className="landing-section-head landing-reveal">
          <div className="landing-eyebrow on-light">
            <span className="dot" />
            HOW IT WORKS
          </div>
          <h2>From question to decision in one conversation.</h2>
          <p>No pipelines to build, no SQL to learn, no ticket to file with the analytics team.</p>
        </div>
        <div className="landing-how-steps landing-reveal">
          <div className="landing-step-card">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 7a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-5 4V7z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </div>
            <div className="step-idx">STEP 01 · CONNECT</div>
            <h3>Link your sources</h3>
            <p>
              Databases, spreadsheets, product analytics, payment logs , connect once and Beleh
              reads the shape of your business automatically.
            </p>
          </div>
          <div className="landing-step-card">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M18 18l-3-3M6 18l3-3M18 6l-3 3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="step-idx">STEP 02 · ASK</div>
            <h3>Ask in plain English</h3>
            <p>
              &quot;Which region churned the most last quarter?&quot; Type it like you&apos;d ask a
              colleague. No query language required, ever.
            </p>
          </div>
          <div className="landing-step-card">
            <div className="icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 19V9m6 10V5m6 14v-7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="step-idx">STEP 03 · DECIDE</div>
            <h3>Get an answer, not a chart to decode</h3>
            <p>
              Beleh replies with the number, the reasoning, and a visual , in seconds, so you can
              act while it&apos;s still relevant.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

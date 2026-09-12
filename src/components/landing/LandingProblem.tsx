export function LandingProblem() {
  return (
    <section className="landing-section landing-problem" id="problem">
      <div className="landing-wrap">
        <div className="landing-section-head landing-reveal">
          <div className="landing-eyebrow on-dark">
            <span className="dot" />
            THE COST OF SILENCE
          </div>
          <h2>While your dashboard loads, your competitors already decided.</h2>
          <p>
            Every day your data sits unread is a day someone downstream is guessing instead of
            knowing. The research is blunt about what that costs.
          </p>
        </div>
        <div className="landing-problem-grid landing-reveal">
          <div className="landing-problem-cell">
            <div className="big">$3.1T</div>
            <div className="cap">
              lost by U.S. businesses every year to poor data quality and the bad decisions it
              causes.
            </div>
            <div className="src">SOURCE: IBM</div>
          </div>
          <div className="landing-problem-cell">
            <div className="big">50%</div>
            <div className="cap">
              of employees lose over an hour a day hunting for the right numbers or fixing wrong
              ones.
            </div>
            <div className="src">SOURCE: GARTNER</div>
          </div>
          <div className="landing-problem-cell">
            <div className="big">6–8 wks</div>
            <div className="cap">
              is the average wait for a new dashboard , long after the question stopped being
              useful.
            </div>
            <div className="src">SOURCE: INDUSTRY BENCHMARKS</div>
          </div>
          <div className="landing-problem-cell">
            <div className="big">112%</div>
            <div className="cap">
              average ROI companies see once they actually put their BI investment to work.
            </div>
            <div className="src">SOURCE: NUCLEUS RESEARCH</div>
          </div>
        </div>
      </div>
    </section>
  );
}

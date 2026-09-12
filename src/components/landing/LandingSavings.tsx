import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const REDUCTION = 0.92;
const FTE_HOURS_YEAR = 52 * 40;

function fmtUSD(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function fmtNum(n: number) {
  return Math.round(n).toLocaleString('en-US');
}

export function LandingSavings() {
  const navigate = useNavigate();
  const [team, setTeam] = useState(8);
  const [hours, setHours] = useState(5);
  const [rate, setRate] = useState(45);

  const { dollarsSaved, hoursSaved, fte } = useMemo(() => {
    const annualHoursWasted = team * hours * 52;
    const saved = annualHoursWasted * REDUCTION;
    return {
      hoursSaved: saved,
      dollarsSaved: saved * rate,
      fte: saved / FTE_HOURS_YEAR,
    };
  }, [team, hours, rate]);

  return (
    <section className="landing-section landing-savings" id="savings">
      <div className="landing-wrap">
        <div className="landing-section-head landing-reveal">
          <div className="landing-eyebrow on-light">
            <span className="dot" />
            WHAT SILENCE IS COSTING YOU
          </div>
          <h2>Stop paying to wait. See it in real numbers.</h2>
          <p>
            Every hour your team spends chasing an answer is an hour it isn&apos;t deciding. Move
            the sliders to match your team, and watch what Beleh gives back , in dollars and hours.
          </p>
        </div>
        <div className="landing-savings-wrap landing-reveal">
          <div className="landing-calc-card">
            <div className="landing-calc-row">
              <div className="landing-calc-label">
                <span>People who ask for data or reports</span>
                <span className="val">
                  {team} {team === 1 ? 'person' : 'people'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={team}
                onChange={(e) => setTeam(Number(e.target.value))}
                aria-label="Team size"
              />
            </div>
            <div className="landing-calc-row">
              <div className="landing-calc-label">
                <span>Hours each person loses waiting, per week</span>
                <span className="val">{hours} hrs</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                aria-label="Hours lost per week"
              />
            </div>
            <div className="landing-calc-row">
              <div className="landing-calc-label">
                <span>Average fully-loaded hourly cost</span>
                <span className="val">${rate}/hr</span>
              </div>
              <input
                type="range"
                min={15}
                max={150}
                step={5}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                aria-label="Hourly cost"
              />
            </div>
          </div>
          <div className="landing-savings-result">
            <div className="inner">
              <div className="tag">Estimated annual savings with Beleh</div>
              <div className="big-num">{fmtUSD(dollarsSaved)}</div>
              <div className="big-cap">based on a conservative 92% cut in time-to-answer</div>
              <div className="sub-stats">
                <div>
                  <div className="n">{fmtNum(hoursSaved)}</div>
                  <div className="l">hours given back to your team every year</div>
                </div>
                <div>
                  <div className="n">{fte.toFixed(1)}×</div>
                  <div className="l">full-time analyst worth of capacity, without hiring</div>
                </div>
              </div>
              <button
                type="button"
                className="landing-btn landing-btn-primary"
                onClick={() => navigate('/signup')}
              >
                Start saving , free for 7 days
              </button>
              <div className="disclaimer">
                Estimate for illustration, based on your inputs and a 92% average reduction in
                time-to-answer reported by early Beleh customers. Your results will vary with your
                data and team.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

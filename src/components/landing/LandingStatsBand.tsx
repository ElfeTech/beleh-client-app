import { LANDING_STATS } from './explorerEngineData';

export function LandingStatsBand() {
  return (
    <section className="landing-stats" id="metrics">
      <div className="landing-stats__telemetry">
        <span>12.8ms EXEC_LATENCY</span>
        <span>SOC-2 SECURITY_ISOL</span>
        <span>0 SQL INTERFACE_DRIFT</span>
      </div>
      <div className="landing-stats__grid">
        {LANDING_STATS.map((stat) => {
          const Icon = stat.icon;
          const informative = 'informative' in stat && stat.informative;
          return (
            <div
              key={stat.label}
              className={`landing-stat-card landing-stat-card--${stat.accent} ${informative ? 'landing-stat-card--informative' : ''}`}
            >
              <div className="landing-stat-card__icon">
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <div className="landing-stat-card__value">{stat.value}</div>
              <div className="landing-stat-card__label">{stat.label}</div>
              {'detail' in stat && stat.detail ? (
                <p className="landing-stat-card__detail">{stat.detail}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

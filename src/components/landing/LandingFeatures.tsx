import { useEffect, useRef } from 'react';

const FEATURES = [
  {
    title: 'Answers in seconds',
    body: 'Ask a question mid-meeting and get a defensible number before the conversation moves on.',
  },
  {
    title: 'Zero SQL, ever',
    body: 'Everyone on the team can prompt the business, not just the two people who know the schema.',
  },
  {
    title: 'Enterprise-ready security',
    body: "SOC 2-ready architecture and role-based access, so opening it up doesn't mean opening everything up.",
  },
  {
    title: '99.9% uptime target',
    body: 'Built to be there the moment a question comes up , not just during business hours.',
  },
] as const;

function Waveform() {
  return (
    <div className="landing-waveform talking">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function LandingFeatures() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const timers: number[] = [];
    root.querySelectorAll<HTMLElement>('.landing-waveform').forEach((wf) => {
      const bars = wf.querySelectorAll<HTMLElement>('span');
      const id = window.setInterval(
        () => {
          bars.forEach((b) => {
            b.style.height = `${5 + Math.random() * 18}px`;
          });
        },
        500 + Math.random() * 300,
      );
      timers.push(id);
    });

    return () => timers.forEach((id) => window.clearInterval(id));
  }, []);

  return (
    <section className="landing-section landing-features">
      <div className="landing-wrap">
        <div className="landing-section-head landing-reveal">
          <div className="landing-eyebrow on-light">
            <span className="dot" />
            BUILT FOR BUSINESS TEAMS
          </div>
          <h2>Everything a data team promises. None of the wait.</h2>
        </div>
        <div className="landing-feat-grid landing-reveal" ref={gridRef}>
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feat-card">
              <Waveform />
              <h4>{f.title}</h4>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

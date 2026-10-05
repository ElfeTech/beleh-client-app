import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const SCENES = [
  {
    q: 'Which region grew fastest last quarter?',
    title: 'Revenue growth by region',
    kind: 'bars',
    insight: 'West leads at +24%',
  },
  {
    q: 'Show monthly revenue for this year',
    title: 'Monthly revenue',
    kind: 'line',
    insight: 'Up 18% since January',
  },
  {
    q: 'What share of sales is subscriptions?',
    title: 'Sales by product type',
    kind: 'donut',
    insight: 'Subscriptions are 61%',
  },
] as const;

const STEPS = ['Reading your data', 'Writing the query', 'Drawing the chart'] as const;
const SOURCES = [
  { label: 'CSV', y: 70, color: '#52c65a' },
  { label: 'Sheets', y: 190, color: '#00b2cc' },
  { label: 'SQL', y: 310, color: '#0592ee' },
] as const;

function Chart({ kind }: { kind: (typeof SCENES)[number]['kind'] }) {
  if (kind === 'bars') {
    return (
      <div className="cta-sim__bars">
        {[42, 68, 52, 96, 74].map((h, i) => (
          <span
            key={i}
            className={i === 3 ? 'is-top' : undefined}
            style={{ height: `${h}%`, animationDelay: `${0.15 + i * 0.09}s` }}
          />
        ))}
      </div>
    );
  }
  if (kind === 'line') {
    return (
      <svg className="cta-sim__line" viewBox="0 0 200 100" preserveAspectRatio="none">
        <path className="cta-sim__area" d="M0 80 L35 62 L70 70 L110 38 L150 30 L200 10 V100 H0Z" />
        <path
          className="cta-sim__stroke"
          pathLength={1}
          d="M0 80 L35 62 L70 70 L110 38 L150 30 L200 10"
        />
      </svg>
    );
  }
  return (
    <svg className="cta-sim__donut" viewBox="0 0 120 100">
      <g transform="rotate(-90 60 50)" fill="none" strokeWidth="16">
        <circle cx="60" cy="50" r="30" stroke="#dbf1fd" />
        <circle className="d1" cx="60" cy="50" r="30" stroke="#0592ee" pathLength={100} />
        <circle className="d2" cx="60" cy="50" r="30" stroke="#52c65a" pathLength={100} />
      </g>
    </svg>
  );
}

/** Closing-section simulation: data sources flow into Beleh, which types, thinks and charts. */
export function LandingCtaSim() {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [typed, setTyped] = useState(0);
  const [step, setStep] = useState(2);

  const current = SCENES[scene];

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setScene((s) => (s + 1) % SCENES.length), 6200);
    return () => window.clearInterval(timer);
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    let i = 0;
    const timers: number[] = [];
    const type = window.setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= current.q.length) window.clearInterval(type);
    }, 38);
    timers.push(window.setTimeout(() => setStep(0), current.q.length * 38 + 150));
    timers.push(window.setTimeout(() => setStep(1), current.q.length * 38 + 900));
    timers.push(window.setTimeout(() => setStep(2), current.q.length * 38 + 1650));
    return () => {
      window.clearInterval(type);
      timers.forEach((t) => window.clearTimeout(t));
      setTyped(0);
      setStep(-1);
    };
  }, [scene, current.q, reduce]);

  const question = reduce ? current.q : current.q.slice(0, typed);
  const done = step >= 2;

  return (
    <div
      className="cta-sim"
      role="img"
      aria-label="Animated demo: data sources feed Beleh, which answers a typed question with a chart"
    >
      <div className="cta-sim__ask">
        <span className="cta-sim__dot" aria-hidden />
        <span className="cta-sim__typed">
          {question}
          {!done && !reduce ? <i aria-hidden /> : null}
        </span>
      </div>

      <svg className="cta-sim__flow" viewBox="0 0 520 380" aria-hidden>
        {SOURCES.map((s) => (
          <g key={s.label}>
            <path
              className="cta-sim__wire"
              d={`M92 ${s.y} C 150 ${s.y}, 150 190, 178 190`}
              style={{ stroke: s.color }}
            />
            <rect x="24" y={s.y - 26} width="68" height="52" rx="14" fill="#fff" />
            <rect x="24" y={s.y - 26} width="68" height="6" rx="3" fill={s.color} />
            <text
              x="58"
              y={s.y + 8}
              textAnchor="middle"
              fontSize="15"
              fontWeight="800"
              fill="#0a2540"
            >
              {s.label}
            </text>
          </g>
        ))}
        <path className="cta-sim__wire cta-sim__wire--out" d="M248 190 H 286" />
        <circle className="cta-sim__ring cta-sim__ring--a" cx="212" cy="190" r="34" />
        <circle className="cta-sim__ring cta-sim__ring--b" cx="212" cy="190" r="34" />
        <circle cx="212" cy="190" r="32" fill="#fff" />
        <path
          d="M197 180 h30 a6 6 0 0 1 6 6 v12 a6 6 0 0 1 -6 6 h-17 l-9 8 v-8 a6 6 0 0 1 -6 -6 v-12 a6 6 0 0 1 6 -6z"
          fill="#0592ee"
        />
        <path
          d="M204 197 v-6 M212 197 v-10 M220 197 v-14"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>

      <div className={`cta-sim__card${done ? ' is-done' : ''}`}>
        <div className="cta-sim__card-head">{done ? current.title : 'Working on it…'}</div>
        {done ? (
          <div className="cta-sim__chart" key={scene}>
            <Chart kind={current.kind} />
          </div>
        ) : (
          <ul className="cta-sim__steps">
            {STEPS.map((label, i) => (
              <li key={label} className={i <= step ? 'is-on' : undefined}>
                <span aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        )}
        {done ? <div className="cta-sim__insight">{current.insight}</div> : null}
      </div>
    </div>
  );
}

import { AskSpot, ConnectSpot, DecideSpot } from './illustrations';

const STEPS = [
  {
    title: 'Connect your data',
    text: 'Upload a CSV or Excel file, link Google Sheets or connect a database. Beleh reads the structure and opens an overview for you.',
    Art: ConnectSpot,
    alt: 'A person connecting spreadsheet files to a database',
    from: '#0592ee',
    to: '#00b2cc',
  },
  {
    title: 'Ask a question',
    text: 'Type what you want to know, the way you would ask a colleague. Beleh writes the query, runs it and draws the chart.',
    Art: AskSpot,
    alt: 'A person typing a question into a laptop and getting a chat reply',
    from: '#00b2cc',
    to: '#52c65a',
  },
  {
    title: 'Decide with confidence',
    text: 'Share the chart with your team, ask the next question and move on the numbers instead of a hunch.',
    Art: DecideSpot,
    alt: 'Two colleagues pointing at a rising bar chart with a green check mark',
    from: '#52c65a',
    to: '#52c65a',
  },
] as const;

/** Curved, animated hand-off arrow drawn between two cards. */
function Connector({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <>
      <svg className="landing-link landing-link--h" viewBox="0 0 96 72" fill="none" aria-hidden>
        <defs>
          <linearGradient id={`${id}-h`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <path
          className="landing-link__path"
          d="M6 52 C 28 52, 30 14, 52 14 S 76 36, 84 36"
          stroke={`url(#${id}-h)`}
        />
        <path d="M76 26 L88 36 L76 46" stroke={to} className="landing-link__head" />
        <circle className="landing-link__dot landing-link__dot--h" r="5.5" fill={to} />
        <circle cx="6" cy="52" r="5" fill="#fff" stroke={from} strokeWidth="3" />
      </svg>
      <svg className="landing-link landing-link--v" viewBox="0 0 72 96" fill="none" aria-hidden>
        <defs>
          <linearGradient id={`${id}-v`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <path
          className="landing-link__path"
          d="M36 6 C 36 30, 12 32, 12 54 S 36 62, 36 82"
          stroke={`url(#${id}-v)`}
        />
        <path d="M24 74 L36 86 L48 74" stroke={to} className="landing-link__head" />
        <circle className="landing-link__dot landing-link__dot--v" r="5.5" fill={to} />
        <circle cx="36" cy="6" r="5" fill="#fff" stroke={from} strokeWidth="3" />
      </svg>
    </>
  );
}

export function LandingHow() {
  return (
    <section className="landing-section landing-how" id="how" aria-labelledby="how-title">
      <div className="landing-wrap">
        <header className="landing-section__head">
          <h2 id="how-title">From raw data to a decision in three steps</h2>
          <p className="landing-lede">
            No modelling, no dashboard builds, no training. If you can write a sentence, you can run
            your own business analytics.
          </p>
        </header>
        <ol className="landing-steps">
          {STEPS.map(({ title, text, Art, alt, from, to }, i) => (
            <li
              key={title}
              className="landing-step"
              style={{ ['--step' as string]: from, ['--step-next' as string]: to }}
            >
              <span className="landing-step__num" aria-hidden>
                {i + 1}
              </span>
              <Art className="landing-step__art" title={alt} />
              <h3>{title}</h3>
              <p>{text}</p>
              {i < STEPS.length - 1 ? <Connector id={`lk${i}`} from={from} to={to} /> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

import type { MouseEvent } from 'react';
import { Megaphone, Target, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { Avatar, C } from './illustrations';

interface UseCase {
  readonly role: string;
  readonly text: string;
  readonly ask: string;
  readonly tone: 'blue' | 'green' | 'sun' | 'coral';
  readonly chip: { readonly label: string; readonly Icon: LucideIcon };
  readonly avatar: Parameters<typeof Avatar>[0];
}

const CASES: readonly UseCase[] = [
  {
    role: 'Founders and owners',
    text: 'See how the business is really doing without opening five tools.',
    ask: 'How did revenue change month over month?',
    tone: 'blue',
    chip: { label: 'Revenue +18%', Icon: TrendingUp },
    avatar: { skin: 1, hair: 0, hairStyle: 'short', top: C.blue, bg: C.sky, beard: true },
  },
  {
    role: 'Sales leaders',
    text: 'Find the regions, reps and products that move the pipeline.',
    ask: 'Which sales reps beat their target this quarter?',
    tone: 'green',
    chip: { label: 'Quota 112%', Icon: Target },
    avatar: { skin: 3, hair: 0, hairStyle: 'afro', top: C.green, bg: C.mint },
  },
  {
    role: 'Finance teams',
    text: 'Track costs, margins and cash without waiting for month-end exports.',
    ask: 'Where did spending rise the most this year?',
    tone: 'sun',
    chip: { label: 'Costs −6%', Icon: Wallet },
    avatar: { skin: 0, hair: 2, hairStyle: 'bob', top: C.navySoft, bg: '#FFF3D6', glasses: true },
  },
  {
    role: 'Operations and marketing',
    text: 'Spot what is working, what is stuck and what to fix first.',
    ask: 'Which campaigns brought the most new customers?',
    tone: 'coral',
    chip: { label: 'CAC −21%', Icon: Megaphone },
    avatar: { skin: 2, hair: 1, hairStyle: 'bun', top: C.coral, bg: '#FFE3D6' },
  },
];

/** Pointer-driven tilt and spotlight, written straight to CSS variables to avoid re-renders. */
function trackPointer(e: MouseEvent<HTMLLIElement>) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--mx', `${x * 100}%`);
  el.style.setProperty('--my', `${y * 100}%`);
  el.style.setProperty('--rx', `${(0.5 - y) * 9}deg`);
  el.style.setProperty('--ry', `${(x - 0.5) * 11}deg`);
}

function resetPointer(e: MouseEvent<HTMLLIElement>) {
  const el = e.currentTarget;
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
}

export function LandingUseCases() {
  return (
    <section className="landing-section landing-usecases" id="use-cases" aria-labelledby="uc-title">
      <div className="landing-wrap">
        <header className="landing-section__head">
          <h2 id="uc-title">Business analytics for every team that runs on data</h2>
          <p className="landing-lede">
            Whatever your role, the questions are the same: what happened, why, and what next.
          </p>
        </header>
        <ul className="uc-grid">
          {CASES.map(({ role, text, ask, tone, chip, avatar }) => (
            <li
              key={role}
              className={`uc uc--${tone}`}
              onMouseMove={trackPointer}
              onMouseLeave={resetPointer}
            >
              <div className="uc__top" aria-hidden>
                <span className="uc__blob" />
                <span className="uc__ring" />
                <div className="uc__avatar">
                  <Avatar {...avatar} />
                </div>
              </div>
              <span className="uc__chip" aria-hidden>
                <chip.Icon size={14} />
                {chip.label}
              </span>
              <h3>{role}</h3>
              <p>{text}</p>
              <blockquote className="uc__ask">&ldquo;{ask}&rdquo;</blockquote>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

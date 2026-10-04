import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { HeroScene } from './illustrations';

const EXAMPLES = [
  {
    q: 'Which region grew fastest last quarter?',
    a: 'West grew 24%, ahead of every other region.',
  },
  {
    q: 'Show monthly revenue by product line.',
    a: 'Subscriptions now make up 61% of monthly revenue.',
  },
  {
    q: 'Which customers are most likely to churn?',
    a: '14 accounts have gone quiet for 30+ days.',
  },
] as const;

const step = (i: number): CSSProperties => ({ ['--i' as string]: i });

export function LandingHero() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % EXAMPLES.length), 4200);
    return () => window.clearInterval(timer);
  }, [reduce]);

  const example = EXAMPLES[index];

  return (
    <section className="landing-hero" id="top" aria-labelledby="hero-title">
      <div className="landing-wrap landing-hero__grid">
        <div className="landing-hero__copy">
          <h1 id="hero-title" className="landing-enter" style={step(1)}>
            AI business intelligence that answers in plain English
          </h1>
          <p className="landing-hero__lede landing-enter" style={step(2)}>
            Beleh connects to your spreadsheets and databases, then turns any question into a chart
            and a clear answer in seconds. No SQL, no dashboards to build, no waiting on an analyst.
          </p>
          <div className="landing-hero__ctas landing-enter" style={step(3)}>
            <button
              type="button"
              className="landing-btn landing-btn-primary landing-btn-lg"
              onClick={() => navigate('/signup')}
            >
              Start your free 7-day trial
              <ArrowRight size={18} aria-hidden />
            </button>
            <a href="#how" className="landing-btn landing-btn-ghost landing-btn-lg">
              See how it works
            </a>
          </div>
          <ul className="landing-hero__fine landing-enter" style={step(4)}>
            <li>
              <Check size={15} aria-hidden /> No credit card required
            </li>
            <li>
              <Check size={15} aria-hidden /> Works with CSV, Excel and databases
            </li>
            <li>
              <Check size={15} aria-hidden /> Cancel anytime
            </li>
          </ul>
        </div>

        <div className="landing-hero__art landing-enter landing-enter--art" style={step(2)}>
          <HeroScene
            className="landing-hero__scene"
            title="An analyst at a desk points to a large screen showing sales charts built by Beleh"
          />

          <div className="landing-float landing-float--ask" aria-live="polite">
            <span className="landing-float__who">You asked</span>
            <AnimatePresence mode="wait">
              <motion.p
                key={example.q}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                {example.q}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="landing-float landing-float--answer">
            <span className="landing-float__badge" aria-hidden>
              <Sparkles size={14} />
            </span>
            <div>
              <span className="landing-float__who">Beleh</span>
              <AnimatePresence mode="wait">
                <motion.p
                  key={example.a}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, delay: reduce ? 0 : 0.15 }}
                >
                  {example.a}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-wrap">
        <ul className="landing-hero__facts" aria-label="Beleh at a glance">
          <li>
            <strong>Seconds</strong>
            <span>from question to chart</span>
          </li>
          <li>
            <strong>Zero SQL</strong>
            <span>ask in everyday language</span>
          </li>
          <li>
            <strong>Any source</strong>
            <span>CSV, Excel, Google Sheets, databases</span>
          </li>
          <li>
            <strong>Whole team</strong>
            <span>shared workspaces and charts</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

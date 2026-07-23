import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import {
  COMPARISON_ROWS,
  EXPLORER_TABS,
  FEATURE_CARDS,
  PIPELINE_STEPS,
  PROBLEM_CARDS,
  type ExplorerTabId,
} from './explorerEngineData';
import './ExplorerEngine.css';

interface ExplorerEngineProps {
  activeTab: ExplorerTabId;
  onTabChange: (tab: ExplorerTabId) => void;
}

export function ExplorerEngine({ activeTab, onTabChange }: ExplorerEngineProps) {
  const [paused, setPaused] = useState(false);
  const activeMeta = EXPLORER_TABS.find((t) => t.id === activeTab)!;

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      const idx = EXPLORER_TABS.findIndex((t) => t.id === activeTabRef.current);
      const next = EXPLORER_TABS[(idx + 1) % EXPLORER_TABS.length];
      onTabChange(next.id);
    }, 8000);
    return () => clearInterval(id);
  }, [paused, onTabChange]);

  return (
    <section
      className="explorer-engine"
      id="explorer"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="explorer-engine__header">
        <span className="landing-pill landing-pill--teal">
          <span className="landing-pill__dot" />
          Explore Beleh
        </span>
        <h2 className="explorer-engine__title">See how it works</h2>
        <p className="explorer-engine__subtitle">
          Browse features, common BI challenges, and how Beleh compares to traditional tools.
        </p>
      </div>

      <div className="explorer-engine__tabs" role="tablist">
        {EXPLORER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`explorer-engine__tab ${isActive ? 'explorer-engine__tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <Icon size={16} strokeWidth={2} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="explorer-engine__panel">
        <p className="explorer-engine__diagnostic">Viewing: {activeMeta.diagnosticLabel}</p>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="explorer-engine__content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            {activeTab === 'features' && <FeaturesPanel />}
            {activeTab === 'problems' && <ProblemsPanel />}
            {activeTab === 'steps' && <StepsPanel />}
            {activeTab === 'comparison' && <ComparisonPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function FeaturesPanel() {
  return (
    <div className="explorer-features">
      {FEATURE_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.title}
            className={`explorer-feature-card explorer-feature-card--${card.accent}`}
          >
            <div className="explorer-feature-card__icon">
              <Icon size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ProblemsPanel() {
  return (
    <div className="explorer-problems">
      <h3 className="explorer-problems__headline">Traditional BI still gets in the way</h3>
      <p className="explorer-problems__sub">
        Teams spend more time waiting on dashboards and data pipelines than finding the insights
        that move the business forward.
      </p>
      <div className="explorer-problems__grid">
        {PROBLEM_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="explorer-problem-card">
              <span className="explorer-problem-card__warn">Challenge</span>
              <div className="explorer-problem-card__icon">
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <h4>{card.title}</h4>
              <p className="explorer-problem-card__stat">{card.stat}</p>
              <p className="explorer-problem-card__desc">{card.description}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StepsPanel() {
  return (
    <div className="explorer-steps">
      {PIPELINE_STEPS.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={step.vector} className="explorer-steps__item">
            {i > 0 && <span className="explorer-steps__arrow" aria-hidden />}
            <article className="explorer-step-card">
              <span className="explorer-step-card__vector">Step {step.vector}</span>
              <div className="explorer-step-card__icon">
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <h4>{step.title}</h4>
              <p>{step.description}</p>
            </article>
          </div>
        );
      })}
    </div>
  );
}

function ComparisonPanel() {
  return (
    <div className="explorer-comparison">
      <div className="explorer-comparison__head">
        <span>What matters</span>
        <span className="explorer-comparison__beleh">
          <span className="explorer-comparison__beleh-icon" aria-hidden />
          Beleh
        </span>
        <span>Traditional BI</span>
      </div>
      {COMPARISON_ROWS.map((row) => (
        <div key={row.criterion} className="explorer-comparison__row">
          <span className="explorer-comparison__criterion">{row.criterion}</span>
          <span className="explorer-comparison__beleh-val">
            <Check size={14} strokeWidth={3} />
            {row.beleh}
          </span>
          <span className="explorer-comparison__legacy-val">
            <X size={14} strokeWidth={2.5} />
            {row.legacy}
          </span>
        </div>
      ))}
    </div>
  );
}

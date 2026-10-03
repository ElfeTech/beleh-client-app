import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Sparkles } from 'lucide-react';
import type { OverviewHandoffPhase } from '../../hooks/useOverviewHandoff';

interface OverviewHandoffOverlayProps {
  active: boolean;
  phase: OverviewHandoffPhase;
  onSkip: () => void;
}

const STEPS: { id: string; label: string }[] = [
  { id: 'connected', label: 'Data connected' },
  { id: 'understand', label: 'Understanding your data' },
  { id: 'write', label: 'Writing your first insights' },
];

/** 0-based index of the step currently in progress. */
function activeStep(phase: OverviewHandoffPhase): number {
  return phase === 'syncing' ? 1 : 2;
}

/**
 * Full-screen "preparing your overview" moment shown between connecting a datasource and
 * landing in its auto-created first chat.
 */
export function OverviewHandoffOverlay({
  active,
  phase,
  onSkip,
}: Readonly<OverviewHandoffOverlayProps>) {
  const current = activeStep(phase);
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="overview-handoff"
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[color:var(--bg-primary)]/85 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-6 shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="mb-5 flex items-center gap-3">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="h-5 w-5" strokeWidth={2} />
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                  Preparing your overview
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Your first insights are on the way.
                </p>
              </div>
            </div>

            <ul className="space-y-3">
              {STEPS.map((step, i) => {
                const done = i < current;
                const running = i === current;
                return (
                  <motion.li
                    key={step.id}
                    className="flex items-center gap-3 text-sm"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: i <= current ? 1 : 0.4, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.12 }}
                  >
                    <span
                      className={
                        done
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white'
                          : 'flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--border-primary)] text-primary'
                      }
                    >
                      {done ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : running ? (
                        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
                      ) : null}
                    </span>
                    <span
                      className={
                        running
                          ? 'font-medium text-[color:var(--text-primary)]'
                          : 'text-[color:var(--text-muted)]'
                      }
                    >
                      {step.label}
                    </span>
                  </motion.li>
                );
              })}
            </ul>

            <button
              type="button"
              className="mt-6 w-full text-center text-xs font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              onClick={onSkip}
            >
              Skip, take me to my chats
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

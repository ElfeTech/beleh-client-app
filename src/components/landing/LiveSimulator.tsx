import { useEffect, useReducer, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import {
  SIMULATOR_AI_RESPONSE,
  SIMULATOR_BARS,
  SIMULATOR_TAGS,
  SIMULATOR_USER_PROMPT,
  type SimulatorPhase,
} from './liveSimulatorScript';
import './LiveSimulator.css';

interface LiveSimulatorProps {
  runId: number;
}

type SimState = {
  phase: SimulatorPhase;
  typedPrompt: string;
  typedUserBubble: string;
  showAiText: boolean;
  showChart: boolean;
  activeTag: string | null;
};

const IDLE: SimState = {
  phase: 'idle',
  typedPrompt: '',
  typedUserBubble: '',
  showAiText: true,
  showChart: true,
  activeTag: 'revenue',
};

function reducer(state: SimState, action: Partial<SimState>): SimState {
  return { ...state, ...action };
}

function usePrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function LiveSimulator({ runId }: LiveSimulatorProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [state, dispatch] = useReducer(reducer, IDLE);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  useEffect(() => {
    if (runId === 0) return;
    clearTimers();

    if (reducedMotion) {
      dispatch({
        phase: 'visualizing',
        typedPrompt: SIMULATOR_USER_PROMPT,
        typedUserBubble: SIMULATOR_USER_PROMPT,
        showAiText: true,
        showChart: true,
        activeTag: 'revenue',
      });
      return clearTimers;
    }

    dispatch({
      phase: 'typing',
      typedPrompt: '',
      typedUserBubble: '',
      showAiText: false,
      showChart: false,
      activeTag: null,
    });

    let i = 0;
    const typeNext = () => {
      if (i <= SIMULATOR_USER_PROMPT.length) {
        const slice = SIMULATOR_USER_PROMPT.slice(0, i);
        dispatch({ typedPrompt: slice, typedUserBubble: slice });
        i += 1;
        schedule(typeNext, 32);
      } else {
        dispatch({ phase: 'analyzing' });
        schedule(() => {
          dispatch({ phase: 'visualizing', showAiText: true });
          schedule(() => {
            dispatch({ showChart: true, activeTag: 'revenue' });
            schedule(() => {
              dispatch({
                phase: 'idle',
                typedPrompt: SIMULATOR_USER_PROMPT,
                typedUserBubble: SIMULATOR_USER_PROMPT,
              });
            }, 4000);
          }, 600);
        }, 1400);
      }
    };
    schedule(typeNext, 200);

    return clearTimers;
  }, [runId, reducedMotion]);

  const showUserBubble = state.phase !== 'idle' || state.typedUserBubble.length > 0;
  const showAnalyzing = state.phase === 'analyzing';
  const showVisual = state.phase === 'visualizing' || state.phase === 'idle';

  return (
    <div className="live-simulator" aria-live="polite">
      <div className="live-simulator__chrome">
        <div className="live-simulator__dots">
          <span className="live-simulator__dot live-simulator__dot--red" />
          <span className="live-simulator__dot live-simulator__dot--yellow" />
          <span className="live-simulator__dot live-simulator__dot--green" />
        </div>
        <span className="live-simulator__title">BELEH_LIVE_SIMULATOR</span>
        <span className="live-simulator__path">WORKSPACE://GATEWAY_01</span>
      </div>

      <div className="live-simulator__body">
        <AnimatePresence mode="wait">
          {showUserBubble && (
            <motion.div
              key="user"
              className="live-simulator__row live-simulator__row--user"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="live-simulator__bubble live-simulator__bubble--user">
                {state.typedUserBubble || SIMULATOR_USER_PROMPT}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="live-simulator__row live-simulator__row--ai">
          <div className="live-simulator__ai-avatar">AI</div>
          <div className="live-simulator__bubble live-simulator__bubble--ai">
            {showAnalyzing && (
              <p className="live-simulator__status">
                <span className="live-simulator__pulse" />
                SCANNING_CLUSTER // compiling schema vectors…
              </p>
            )}
            {showVisual && state.showAiText && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="live-simulator__ai-text"
              >
                {SIMULATOR_AI_RESPONSE}
              </motion.p>
            )}
            {showVisual && state.showChart && (
              <motion.div
                className="live-simulator__chart"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45 }}
              >
                <p className="live-simulator__chart-title">GLOBAL REVENUE INDEX / 100K USD</p>
                <div className="live-simulator__bars">
                  {SIMULATOR_BARS.map((bar, idx) => (
                    <div key={bar.id} className="live-simulator__bar-col">
                      <motion.div
                        className="live-simulator__bar"
                        style={{ background: bar.color }}
                        initial={{ height: 0 }}
                        animate={{ height: `${bar.height}%` }}
                        transition={{ delay: idx * 0.08, duration: 0.5, ease: 'easeOut' }}
                      />
                      <span className="live-simulator__bar-label">{bar.label}</span>
                    </div>
                  ))}
                </div>
                <div className="live-simulator__tags">
                  {SIMULATOR_TAGS.map((tag) => (
                    <span
                      key={tag.id}
                      className={`live-simulator__tag ${state.activeTag === tag.id ? 'live-simulator__tag--active' : ''}`}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="live-simulator__input-row">
        <div className="live-simulator__input">
          <span className="live-simulator__input-text">
            {state.typedPrompt || 'Ask anything about your data…'}
            {state.phase === 'typing' && <span className="live-simulator__caret" />}
          </span>
          <button type="button" className="live-simulator__send" aria-label="Send" tabIndex={-1}>
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

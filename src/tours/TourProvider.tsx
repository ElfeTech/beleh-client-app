import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { apiClient } from '../services/apiClient';
import type { TourStateEntry, TourStatus } from '../types/api';
import { TOUR_REGISTRY, type TourDefinition } from './tourDefinitions';
import { TourOverlay } from './TourOverlay';

type SeenMap = Record<string, TourStateEntry>;

interface TourContextValue {
  /** Manually start a tour (e.g. a "Replay tour" button) regardless of seen state. */
  startTour: (tourId: string) => void;
  activeTourId: string | null;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  activeTourId: null,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useTours(): TourContextValue {
  return useContext(TourContext);
}

const MIRROR_KEY_PREFIX = 'beleh:tours-seen:';
const AUTO_START_DELAY_MS = 1400;

function readMirror(uid: string): SeenMap {
  try {
    const raw = localStorage.getItem(`${MIRROR_KEY_PREFIX}${uid}`);
    const parsed = raw ? (JSON.parse(raw) as SeenMap) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMirror(uid: string, seen: SeenMap): void {
  try {
    localStorage.setItem(`${MIRROR_KEY_PREFIX}${uid}`, JSON.stringify(seen));
  } catch {
    /* storage unavailable */
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const uid = user?.uid ?? null;
  // Seed synchronously from the localStorage mirror, re-keyed per signed-in user
  // (render-phase adjustment — the React-sanctioned "reset state on prop change").
  const [seenState, setSeenState] = useState<{ uid: string | null; map: SeenMap | null }>(() => ({
    uid,
    map: uid ? readMirror(uid) : null,
  }));
  const [active, setActive] = useState<{ tour: TourDefinition; step: number } | null>(null);
  const attemptedRef = useRef<Set<string>>(new Set());
  const startTimerRef = useRef<number | null>(null);

  if (seenState.uid !== uid) {
    setSeenState({ uid, map: uid ? readMirror(uid) : null });
    setActive(null);
  }
  const seen = seenState.uid === uid ? seenState.map : null;

  const setSeen = useCallback(
    (updater: (prev: SeenMap | null) => SeenMap | null) => {
      setSeenState((prev) => (prev.uid === uid ? { uid, map: updater(prev.map) } : prev));
    },
    [uid],
  );

  // Authoritative server copy merges over the mirror.
  useEffect(() => {
    if (!user?.uid) return;
    attemptedRef.current = new Set();
    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const response = await apiClient.getMyTours(token);
        if (cancelled) return;
        setSeen((prev) => {
          const merged = { ...(prev ?? {}), ...response.tours };
          writeMirror(user.uid, merged);
          return merged;
        });
      } catch {
        // Offline / transient: the mirror still suppresses repeat tours.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, setSeen]);

  const persistInteraction = useCallback(
    (tour: TourDefinition, status: TourStatus, lastStep: number) => {
      const entry: TourStateEntry = {
        status,
        last_step: lastStep,
        updated_at: new Date().toISOString(),
      };
      setSeen((prev) => {
        const next = { ...(prev ?? {}), [tour.id]: entry };
        if (user?.uid) writeMirror(user.uid, next);
        return next;
      });
      if (user) {
        void user
          .getIdToken()
          .then((token) =>
            apiClient.recordTourState(token, tour.id, { status, last_step: lastStep }),
          )
          .catch(() => {
            // Mirror already suppresses locally; server sync retries next session.
          });
      }
    },
    [user, setSeen],
  );

  // Auto-start: first eligible unseen tour for the current route, once per session.
  useEffect(() => {
    if (!user || seen === null || active) return;
    const eligible = [...TOUR_REGISTRY]
      .sort((a, b) => a.priority - b.priority)
      .find(
        (tour) =>
          !seen[tour.id] &&
          !attemptedRef.current.has(tour.id) &&
          tour.startPath.test(location.pathname),
      );
    if (!eligible) return;

    startTimerRef.current = window.setTimeout(() => {
      // Re-check just before showing: another tab may have recorded it meanwhile.
      if (attemptedRef.current.has(eligible.id)) return;
      attemptedRef.current.add(eligible.id);
      setActive({ tour: eligible, step: 0 });
    }, AUTO_START_DELAY_MS);
    return () => {
      if (startTimerRef.current) window.clearTimeout(startTimerRef.current);
    };
  }, [user, seen, active, location.pathname]);

  const startTour = useCallback((tourId: string) => {
    const tour = TOUR_REGISTRY.find((t) => t.id === tourId);
    if (!tour) return;
    attemptedRef.current.add(tour.id);
    setActive({ tour, step: 0 });
  }, []);

  const handleComplete = useCallback(() => {
    if (!active) return;
    persistInteraction(active.tour, 'completed', active.tour.steps.length - 1);
    setActive(null);
  }, [active, persistInteraction]);

  const handleDismiss = useCallback(
    (lastStep: number) => {
      if (!active) return;
      persistInteraction(active.tour, 'dismissed', lastStep);
      setActive(null);
    },
    [active, persistInteraction],
  );

  return (
    <TourContext.Provider value={{ startTour, activeTourId: active?.tour.id ?? null }}>
      {children}
      {active ? (
        <TourOverlay
          tour={active.tour}
          stepIndex={active.step}
          onStepChange={(step) => setActive((prev) => (prev ? { ...prev, step } : prev))}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
        />
      ) : null}
    </TourContext.Provider>
  );
}

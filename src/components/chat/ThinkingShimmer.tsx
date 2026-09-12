import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import './ThinkingShimmer.css';

const DEFAULT_PHRASES = [
  'Analyzing your data…',
  'Checking the schema…',
  'Running the analysis…',
  'Preparing insights…',
];

/** Default time each phrase stays visible before rotating. */
const DEFAULT_INTERVAL_MS = 4200;

interface ThinkingShimmerProps {
  phrases?: string[];
  className?: string;
  /** How long each phrase stays visible before rotating. */
  intervalMs?: number;
}

function pickRandomIndex(length: number, exclude: number): number {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  // Avoid showing the same phrase twice in a row when possible.
  if (next === exclude) {
    next = (next + 1 + Math.floor(Math.random() * (length - 1))) % length;
  }
  return next;
}

/**
 * Rotating shimmer status text for in-flight assistant / support replies.
 * Walks phrases in order once, then loops in random order until unmounted.
 */
export function ThinkingShimmer({
  phrases = DEFAULT_PHRASES,
  className,
  intervalMs = DEFAULT_INTERVAL_MS,
}: Readonly<ThinkingShimmerProps>) {
  const list = phrases.length > 0 ? phrases : DEFAULT_PHRASES;
  const [index, setIndex] = useState(0);
  const completedPassRef = useRef(false);
  const listKey = list.join('\0');

  // Clamp / reset when the phrase list changes (e.g. phase updates mid-run).
  useEffect(() => {
    setIndex(0);
    completedPassRef.current = false;
  }, [listKey]);

  useEffect(() => {
    if (list.length <= 1) return;

    const id = window.setInterval(() => {
      setIndex((current) => {
        if (!completedPassRef.current) {
          const next = current + 1;
          if (next >= list.length) {
            completedPassRef.current = true;
            return pickRandomIndex(list.length, current);
          }
          return next;
        }
        return pickRandomIndex(list.length, current);
      });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [listKey, list.length, intervalMs]);

  const phrase = list[Math.min(index, list.length - 1)] ?? list[0];

  return (
    <div className={cn('thinking-shimmer', className)} role="status" aria-live="polite">
      <span key={phrase} className="thinking-shimmer__text">
        {phrase}
      </span>
      <span className="thinking-shimmer__bars" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

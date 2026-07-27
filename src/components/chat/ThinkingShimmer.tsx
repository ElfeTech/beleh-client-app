import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import './ThinkingShimmer.css';

const DEFAULT_PHRASES = [
  'Analyzing your data…',
  'Checking the schema…',
  'Running the analysis…',
  'Preparing insights…',
];

interface ThinkingShimmerProps {
  phrases?: string[];
  className?: string;
  /** How long each phrase stays visible before rotating. */
  intervalMs?: number;
}

/**
 * Rotating shimmer status text for in-flight assistant / support replies.
 */
export function ThinkingShimmer({
  phrases = DEFAULT_PHRASES,
  className,
  intervalMs = 2400,
}: Readonly<ThinkingShimmerProps>) {
  const [index, setIndex] = useState(0);
  const list = phrases.length > 0 ? phrases : DEFAULT_PHRASES;

  useEffect(() => {
    if (list.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [list, intervalMs]);

  return (
    <div className={cn('thinking-shimmer', className)} role="status" aria-live="polite">
      <span key={list[index]} className="thinking-shimmer__text">
        {list[index]}
      </span>
      <span className="thinking-shimmer__bars" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

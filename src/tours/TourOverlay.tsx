import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { TourDefinition, TourStep } from './tourDefinitions';
import './tours.css';

const SPOT_PADDING = 8;
const CARD_GAP = 14;
const EDGE = 16;
/** Cards are compact; flips/clamps use this estimate so no DOM measuring is needed. */
const CARD_H_ESTIMATE = 210;

interface TourOverlayProps {
  tour: TourDefinition;
  stepIndex: number;
  onStepChange: (index: number) => void;
  onComplete: () => void;
  onDismiss: (lastStep: number) => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function targetElement(step: TourStep): HTMLElement | null {
  if (!step.target) return null;
  return document.querySelector<HTMLElement>(step.target);
}

/** Index of the nearest renderable step from `from` in `direction` (target present or centered). */
function resolveStepIndex(tour: TourDefinition, from: number, direction: 1 | -1): number | null {
  for (let i = from; i >= 0 && i < tour.steps.length; i += direction) {
    const step = tour.steps[i];
    if (!step.target || targetElement(step)) return i;
  }
  return null;
}

function rectsDiffer(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a !== b;
  return (
    Math.abs(a.top - b.top) > 0.5 ||
    Math.abs(a.left - b.left) > 0.5 ||
    Math.abs(a.width - b.width) > 0.5 ||
    Math.abs(a.height - b.height) > 0.5
  );
}

/** Pure card placement from the spotlight rect — estimates height, clamps to viewport. */
function cardStyleFor(
  spot: Rect | null,
  preferred: TourStep['placement'],
  vw: number,
  vh: number,
): React.CSSProperties {
  const cardW = Math.min(360, vw - EDGE * 2);
  if (!spot) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: cardW };
  }
  let placement = preferred ?? 'auto';
  const fitsBelow = spot.top + spot.height + CARD_GAP + CARD_H_ESTIMATE <= vh - EDGE;
  const fitsAbove = spot.top - CARD_GAP - CARD_H_ESTIMATE >= EDGE;
  const fitsRight = spot.left + spot.width + CARD_GAP + cardW <= vw - EDGE;
  const fitsLeft = spot.left - CARD_GAP - cardW >= EDGE;

  if (placement === 'auto') placement = fitsBelow ? 'bottom' : 'top';
  if (placement === 'bottom' && !fitsBelow && fitsAbove) placement = 'top';
  if (placement === 'top' && !fitsAbove && fitsBelow) placement = 'bottom';
  if (placement === 'right' && !fitsRight) placement = fitsLeft ? 'left' : 'bottom';
  if (placement === 'left' && !fitsLeft) placement = fitsRight ? 'right' : 'bottom';

  const centeredLeft = Math.min(
    Math.max(EDGE, spot.left + spot.width / 2 - cardW / 2),
    vw - EDGE - cardW,
  );

  if (placement === 'top') {
    // Anchor by bottom edge so the card grows upward without measuring.
    return {
      bottom: Math.min(vh - EDGE, vh - spot.top + CARD_GAP),
      left: centeredLeft,
      width: cardW,
    };
  }
  if (placement === 'left' || placement === 'right') {
    const left =
      placement === 'right' ? spot.left + spot.width + CARD_GAP : spot.left - CARD_GAP - cardW;
    return {
      top: Math.min(Math.max(EDGE, spot.top + spot.height / 2), vh - EDGE),
      left: Math.min(Math.max(EDGE, left), vw - EDGE - cardW),
      transform: 'translateY(-50%)',
      width: cardW,
    };
  }
  return {
    top: Math.min(Math.max(EDGE, spot.top + spot.height + CARD_GAP), vh - EDGE - 120),
    left: centeredLeft,
    width: cardW,
  };
}

export function TourOverlay({
  tour,
  stepIndex,
  onStepChange,
  onComplete,
  onDismiss,
}: TourOverlayProps) {
  const step = tour.steps[stepIndex];
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isLast = resolveStepIndex(tour, stepIndex + 1, 1) === null;
  const isFirst = resolveStepIndex(tour, stepIndex - 1, -1) === null;

  const goNext = useCallback(() => {
    const next = resolveStepIndex(tour, stepIndex + 1, 1);
    if (next === null) onComplete();
    else onStepChange(next);
  }, [tour, stepIndex, onComplete, onStepChange]);

  const goBack = useCallback(() => {
    const prev = resolveStepIndex(tour, stepIndex - 1, -1);
    if (prev !== null) onStepChange(prev);
  }, [tour, stepIndex, onStepChange]);

  const dismiss = useCallback(() => onDismiss(stepIndex), [onDismiss, stepIndex]);

  // Track the target's rect every frame while this step is active — survives
  // scrolling, resizes, sidebar collapse, and async layout without listeners.
  useEffect(() => {
    let raf = 0;
    const track = () => {
      const el = step ? targetElement(step) : null;
      const next: Rect | null = el
        ? (() => {
            const r = el.getBoundingClientRect();
            return { top: r.top, left: r.left, width: r.width, height: r.height };
          })()
        : null;
      setRect((prev) => (rectsDiffer(prev, next) ? next : prev));
      raf = requestAnimationFrame(track);
    };
    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // Bring the target into view and focus the card on step change.
  useEffect(() => {
    const el = step ? targetElement(step) : null;
    el?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    cardRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Click on the spotlighted element advances (after the app's own handler).
  useEffect(() => {
    if (!step?.advanceOnClick) return;
    const el = targetElement(step);
    if (!el) return;
    const onClick = () => {
      window.setTimeout(goNext, 150);
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [step, goNext]);

  // Keyboard: Esc dismiss, arrows navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        dismiss();
      } else if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goBack();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dismiss, goNext, goBack]);

  const spot: Rect | null = useMemo(() => {
    if (!rect) return null;
    return {
      top: rect.top - SPOT_PADDING,
      left: rect.left - SPOT_PADDING,
      width: rect.width + SPOT_PADDING * 2,
      height: rect.height + SPOT_PADDING * 2,
    };
  }, [rect]);

  const cardStyle = useMemo<React.CSSProperties>(
    () => cardStyleFor(spot, step?.placement, window.innerWidth, window.innerHeight),
    [spot, step],
  );

  if (!step) return null;

  const allowClickThrough = Boolean(step.advanceOnClick && spot);

  const blockers = spot
    ? [
        { top: 0, left: 0, width: '100vw', height: Math.max(0, spot.top) },
        { top: spot.top, left: 0, width: Math.max(0, spot.left), height: spot.height },
        {
          top: spot.top,
          left: spot.left + spot.width,
          width: `calc(100vw - ${spot.left + spot.width}px)`,
          height: spot.height,
        },
        {
          top: spot.top + spot.height,
          left: 0,
          width: '100vw',
          height: `calc(100vh - ${spot.top + spot.height}px)`,
        },
      ]
    : [{ top: 0, left: 0, width: '100vw', height: '100vh' }];

  return createPortal(
    <div className="tour-root" data-tour-overlay>
      {blockers.map((b, i) => (
        <div key={i} className="tour-blocker" style={b as React.CSSProperties} />
      ))}
      {spot && !allowClickThrough ? (
        <div
          className="tour-blocker"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      ) : null}
      {spot ? (
        <div
          className="tour-spotlight"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
          aria-hidden
        />
      ) : (
        <div className="tour-dim" aria-hidden />
      )}

      <div
        ref={cardRef}
        className="tour-card"
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-label={`${tour.name} — step ${stepIndex + 1} of ${tour.steps.length}`}
        tabIndex={-1}
      >
        <div className="tour-card__top">
          <span className="tour-card__eyebrow">
            {tour.name} · {stepIndex + 1}/{tour.steps.length}
          </span>
          <button
            type="button"
            className="tour-card__close"
            onClick={dismiss}
            aria-label="Skip tour"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <h3 className="tour-card__title">{step.title}</h3>
        <p className="tour-card__body">{step.body}</p>
        {step.advanceOnClick ? (
          <p className="tour-card__hint">…or click the highlighted element to continue.</p>
        ) : null}
        <div className="tour-card__footer">
          <div className="tour-card__dots" aria-hidden>
            {tour.steps.map((s, i) => (
              <span key={s.id} className={`tour-card__dot${i === stepIndex ? ' is-active' : ''}`} />
            ))}
          </div>
          <div className="tour-card__actions">
            {!isFirst ? (
              <button type="button" className="tour-btn tour-btn--ghost" onClick={goBack}>
                Back
              </button>
            ) : (
              <button type="button" className="tour-btn tour-btn--ghost" onClick={dismiss}>
                Skip
              </button>
            )}
            <button type="button" className="tour-btn tour-btn--primary" onClick={goNext}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

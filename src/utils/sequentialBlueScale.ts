/** Sequential blue ramp shared by heatmap cells and choropleth regions. */

const LOW: [number, number, number] = [219, 234, 254]; // blue-100
const HIGH: [number, number, number] = [29, 78, 216]; // blue-700

function clamp01(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.min(1, Math.max(0, t));
}

/** t in [0, 1] → CSS rgb() between light and saturated blue. */
export function sequentialBlue(t: number): string {
  const k = clamp01(t);
  const ch = LOW.map((low, i) => Math.round(low + (HIGH[i] - low) * k));
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
}

/** Legible text color on top of sequentialBlue(t). */
export function sequentialBlueTextColor(t: number): string {
  return clamp01(t) > 0.55 ? '#ffffff' : '#1f2937';
}

/** Normalize a value into [0, 1] against a domain; constant domains sit mid-ramp. */
export function normalizeToDomain(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (max <= min) return 0.65;
  return clamp01((value - min) / (max - min));
}

export function formatScaleValue(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

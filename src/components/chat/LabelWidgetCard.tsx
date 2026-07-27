import './LabelWidgetCard.css';

interface LabelWidgetCardProps {
  label: string;
  value: string;
}

/** Format plain numeric strings for display (e.g. 31727 → 31,727) without touching currency/units. */
function formatKpiDisplayValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  // Already has grouping / is clearly non-numeric text
  if (/[a-zA-Z%$€£¥]/.test(trimmed)) return raw;
  if (/,/.test(trimmed) && !/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed)) return raw;

  const normalized = trimmed.replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return raw;

  const num = Number(normalized);
  if (!Number.isFinite(num)) return raw;

  const hasFraction = normalized.includes('.');
  return num.toLocaleString(undefined, {
    maximumFractionDigits: hasFraction ? 6 : 0,
    minimumFractionDigits: hasFraction ? Math.min(6, (normalized.split('.')[1] ?? '').length) : 0,
  });
}

export function LabelWidgetCard({ label, value }: LabelWidgetCardProps) {
  const display = formatKpiDisplayValue(value);

  return (
    <div className="label-widget-card" role="figure" aria-label={`${label}: ${display}`}>
      <p className="label-widget-card__label">{label}</p>
      <p className="label-widget-card__value">{display}</p>
    </div>
  );
}

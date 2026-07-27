import { useUsage } from '../../context/UsageContext';
import { formatUsd, usagePercentage } from '../../utils/formatters';
import '../settings/SettingsShared.css';
import './usageCards.css';

interface ValueMetricProps {
  label: string;
  amount: number | null | undefined;
  currency: string;
  emphasize?: boolean;
}

function ValueMetric({ label, amount, currency, emphasize = false }: Readonly<ValueMetricProps>) {
  return (
    <div className={`billing-value-metric${emphasize ? ' billing-value-metric--emphasize' : ''}`}>
      <span className="billing-value-metric__label">{label}</span>
      <span className="billing-value-metric__amount">
        {amount != null ? formatUsd(amount, currency) : '—'}
      </span>
    </div>
  );
}

export function PlanValueCard() {
  const { currentUsage, remaining } = useUsage();
  const value = currentUsage?.value;

  const hasValue =
    value != null &&
    (value.included_value_usd != null ||
      value.remaining_value_usd != null ||
      value.used_value_usd != null);

  if (!hasValue || !value) return null;

  const currency = value.currency ?? remaining?.currency ?? 'usd';
  const usedPct = value.value_used_pct ?? remaining?.value_used_pct ?? null;
  const barWidth = usagePercentage(usedPct ?? 0, 100);

  return (
    <div className="billing-value-card settings-card">
      <div className="billing-value-card__header">
        <div>
          <p className="billing-value-card__eyebrow">Plan value this cycle</p>
          <h4 className="billing-value-card__title">
            {value.remaining_value_usd != null
              ? `${formatUsd(value.remaining_value_usd, currency)} remaining`
              : 'Usage value'}
          </h4>
          <p className="billing-value-card__hint">
            Included plan price prorated by unused quota (queries, tokens, rows, charts).
          </p>
        </div>
        {usedPct != null && (
          <span className="billing-value-card__pct">{Math.round(usedPct)}% used</span>
        )}
      </div>
      <div className="billing-value-card__bar" aria-hidden>
        <div className="billing-value-card__fill" style={{ width: `${barWidth}%` }} />
      </div>
      <div className="billing-value-metrics">
        <ValueMetric label="Included" amount={value.included_value_usd} currency={currency} />
        <ValueMetric label="Used" amount={value.used_value_usd} currency={currency} />
        <ValueMetric
          label="Remaining"
          amount={value.remaining_value_usd}
          currency={currency}
          emphasize
        />
      </div>
    </div>
  );
}

import './LabelWidgetCard.css';

interface LabelWidgetCardProps {
  label: string;
  value: string;
}

export function LabelWidgetCard({ label, value }: LabelWidgetCardProps) {
  return (
    <div className="label-widget-card" role="figure" aria-label={`${label}: ${value}`}>
      <p className="label-widget-card__label">{label}</p>
      <p className="label-widget-card__value">{value}</p>
    </div>
  );
}

import './BillingCycleToggle.css';

export type BillingCycle = 'monthly' | 'yearly';

interface BillingCycleToggleProps {
  value: BillingCycle;
  onChange: (value: BillingCycle) => void;
  disabled?: boolean;
}

export function BillingCycleToggle({ value, onChange, disabled }: BillingCycleToggleProps) {
  return (
    <div className="billing-cycle-segment" role="group" aria-label="Billing cycle">
      <button
        type="button"
        className={`billing-cycle-segment__option ${value === 'monthly' ? 'billing-cycle-segment__option--selected' : ''}`}
        aria-pressed={value === 'monthly'}
        disabled={disabled}
        onClick={() => onChange('monthly')}
      >
        Monthly
      </button>
      <button
        type="button"
        className={`billing-cycle-segment__option ${value === 'yearly' ? 'billing-cycle-segment__option--selected' : ''}`}
        aria-pressed={value === 'yearly'}
        disabled={disabled}
        onClick={() => onChange('yearly')}
      >
        Annually
        <span className="billing-cycle-segment__save">-20%</span>
      </button>
    </div>
  );
}

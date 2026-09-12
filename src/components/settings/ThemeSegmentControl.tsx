import { Monitor, Sun, Moon } from 'lucide-react';
import type { ThemePreference } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import './ThemeSegmentControl.css';

const OPTIONS: { value: ThemePreference; label: string; short: string; icon: typeof Monitor }[] = [
  { value: 'system', label: 'System', short: 'SYSTEM', icon: Monitor },
  { value: 'light', label: 'Light', short: 'LIGHT', icon: Sun },
  { value: 'dark', label: 'Dark', short: 'DARK', icon: Moon },
];

interface ThemeSegmentControlProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
  disabled?: boolean;
}

export function ThemeSegmentControl({ value, onChange, disabled }: ThemeSegmentControlProps) {
  return (
    <div className="theme-segment" role="group" aria-label="System visual theme">
      {OPTIONS.map(({ value: optValue, label, short, icon: Icon }) => {
        const selected = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(optValue)}
            className={cn('theme-segment__option', selected && 'theme-segment__option--selected')}
          >
            <Icon className="theme-segment__icon" strokeWidth={2} aria-hidden />
            <span>{short}</span>
          </button>
        );
      })}
    </div>
  );
}

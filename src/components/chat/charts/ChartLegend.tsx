import React, { useState } from 'react';
import './ChartLegend.css';

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  disabled?: boolean;
}

interface ChartLegendProps {
  items: LegendItem[];
  onToggle?: (key: string) => void;
  layout?: 'horizontal' | 'vertical';
  interactive?: boolean;
  maxItems?: number;
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  items,
  onToggle,
  layout = 'horizontal',
  interactive = true,
  maxItems = 20,
}) => {
  const [disabledKeys, setDisabledKeys] = useState<Set<string>>(new Set());

  const handleToggle = (key: string) => {
    if (!interactive) return;

    const newDisabled = new Set(disabledKeys);
    if (newDisabled.has(key)) {
      newDisabled.delete(key);
    } else {
      // Don't allow disabling all items
      if (newDisabled.size < items.length - 1) {
        newDisabled.add(key);
      }
    }
    setDisabledKeys(newDisabled);
    onToggle?.(key);
  };

  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  return (
    <div className={`chart-legend chart-legend--${layout}`}>
      <div className="chart-legend__items">
        {displayItems.map((item) => {
          const isDisabled = disabledKeys.has(item.key);
          return (
            <button
              key={item.key}
              className={`chart-legend__item ${isDisabled ? 'chart-legend__item--disabled' : ''} ${interactive ? 'chart-legend__item--interactive' : ''}`}
              onClick={() => handleToggle(item.key)}
              disabled={!interactive}
              title={interactive ? (isDisabled ? 'Click to show' : 'Click to hide') : undefined}
            >
              <span
                className="chart-legend__color"
                style={{ backgroundColor: isDisabled ? '#d1d5db' : item.color }}
              />
              <span className="chart-legend__label">{item.label}</span>
            </button>
          );
        })}
      </div>
      {hasMore && (
        <div className="chart-legend__more">
          +{items.length - maxItems} more
        </div>
      )}
    </div>
  );
};

import { useState, useRef, useEffect } from 'react';
import type { ChartType, ChartTypeOption } from '../../../utils/chartCompatibility';
import { getChartTypeIcon } from '../../../utils/chartCompatibility';
import './ChartTypeSelector.css';

interface ChartTypeSelectorProps {
    options: ChartTypeOption[];
    selectedType: ChartType;
    onTypeChange: (type: ChartType) => void;
}

export function ChartTypeSelector({
    options,
    selectedType,
    onTypeChange,
}: ChartTypeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.type === selectedType) || options[0];

    // Don't show selector if there's only one option (table)
    if (options.length <= 1) {
        return null;
    }

    return (
        <div className="chart-type-selector" ref={dropdownRef}>
            <button
                className="chart-type-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                title="Change chart type"
            >
                <svg
                    className="chart-type-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d={getChartTypeIcon(selectedType)} />
                </svg>
                <span className="chart-type-label">{selectedOption?.label}</span>
                <svg
                    className={`chart-type-chevron ${isOpen ? 'open' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <div className="chart-type-dropdown" role="listbox">
                    <div className="chart-type-dropdown-header">
                        <span>Select visualization</span>
                    </div>
                    <div className="chart-type-options">
                        {options.map(option => (
                            <button
                                key={option.type}
                                className={`chart-type-option ${option.type === selectedType ? 'selected' : ''} ${option.recommended ? 'recommended' : ''}`}
                                onClick={() => {
                                    onTypeChange(option.type);
                                    setIsOpen(false);
                                }}
                                role="option"
                                aria-selected={option.type === selectedType}
                            >
                                <svg
                                    className="option-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d={getChartTypeIcon(option.type)} />
                                </svg>
                                <div className="option-content">
                                    <span className="option-label">
                                        {option.label}
                                        {option.recommended && option.type === selectedType && (
                                            <span className="recommended-badge">Current</span>
                                        )}
                                        {option.recommended && option.type !== selectedType && (
                                            <span className="recommended-badge">Recommended</span>
                                        )}
                                    </span>
                                    <span className="option-description">{option.description}</span>
                                </div>
                                {option.type === selectedType && (
                                    <svg
                                        className="check-icon"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

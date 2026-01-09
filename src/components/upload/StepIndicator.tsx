import React from 'react';
import './StepIndicator.css';

interface Step {
    id: number;
    label: string;
}

interface StepIndicatorProps {
    currentStep: number;
    steps: Step[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
    return (
        <div className="step-indicator-container">
            {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                    <div className={`step-item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                        <div className="step-number">
                            {currentStep > step.id ? (
                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                            ) : (
                                step.id
                            )}
                        </div>
                        <span className="step-label">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`step-line ${currentStep > step.id ? 'completed' : ''}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

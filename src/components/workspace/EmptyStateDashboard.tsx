import './EmptyStateDashboard.css';

interface EmptyStateDashboardProps {
    readonly onAddDataset: () => void;
    /** When provided and user hasn't completed demo, show "Start Demo" as primary CTA */
    readonly onStartDemo?: () => void;
    /** Whether to show the Start Demo option (e.g. new user, hasn't completed demo) */
    readonly showDemoCta?: boolean;
}

export function EmptyStateDashboard({ onAddDataset, onStartDemo, showDemoCta }: EmptyStateDashboardProps) {
    const showStartDemo = Boolean(showDemoCta && onStartDemo);

    return (
        <div className="empty-state-dashboard">
            <div className="empty-state-container">
                <div className="empty-state-card">
                    {/* Icon/Visual Element */}
                    <div className="empty-state-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                    </div>

                    {/* Main Content */}
                    <div className="empty-state-content">
                        <h1 className="empty-state-headline">
                            {showStartDemo ? 'See Beleh in Action' : 'Your Workspace is Ready for Action'}
                        </h1>
                        <p className="empty-state-description">
                            {showStartDemo
                                ? 'Try a quick demo: ask sample questions and see how AI turns your questions into charts and insights. Then upload your own data to get started for real.'
                                : 'This is where your insights come to life. Upload your first dataset to start chatting with your data, uncovering patterns, and generating reports—all in one place.'}
                        </p>
                    </div>

                    {/* CTAs: Start Demo (primary for new users) + Add Dataset */}
                    <div className="empty-state-cta-row">
                        {showStartDemo && (
                            <button
                                className="empty-state-cta empty-state-cta-primary"
                                onClick={onStartDemo}
                                aria-label="Start interactive demo"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                <span>Start Demo</span>
                            </button>
                        )}
                        <button
                            className={`empty-state-cta ${showStartDemo ? 'empty-state-cta-secondary' : ''}`}
                            onClick={onAddDataset}
                            aria-label="Add your first dataset"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>Add New Dataset</span>
                        </button>
                    </div>

                    {/* Optional Feature Highlights */}
                    <div className="empty-state-features">
                        <div className="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span>AI-Powered Insights</span>
                        </div>
                        <div className="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            <span>Smart Visualizations</span>
                        </div>
                        <div className="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                            <span>Real-time Analysis</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

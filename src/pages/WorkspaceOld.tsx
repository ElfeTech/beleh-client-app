import { useAuth } from '../context/AuthContext';
import './Workspace.css';

export function Workspace() {
    const { user } = useAuth();

    const initials = user?.displayName
        ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'GU';

    return (
        <div className="content-area">
            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card-header">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                        </svg>
                        Total Revenue
                    </div>
                    <div className="stat-value">$124,500</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Top Product
                    </div>
                    <div className="stat-value">Product A</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
                        </svg>
                        Campaign ROI
                    </div>
                    <div className="stat-value">340%</div>
                </div>
                <button className="upload-btn">
                    Upload Data
                </button>
            </div>

            {/* Chat Section */}
            <div className="chat-section">
                <div className="chat-messages">
                    {/* User Message */}
                    <div className="message user">
                        <div className="message-avatar">
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: 600
                            }}>
                                {initials}
                            </div>
                        </div>
                        <div className="message-content">
                            <div className="message-bubble">
                                Which product had the highest sales last month?
                            </div>
                        </div>
                    </div>

                    {/* AI Response */}
                    <div className="message ai">
                        <div className="message-avatar ai">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div className="message-content">
                            <div className="message-bubble">
                                The product with the highest sales last month was <strong>Product A</strong> with 12,300 units sold.
                            </div>

                            {/* Chart Response */}
                            <div className="chart-response">
                                <h3 className="chart-title">Top Product Sales - Last Month</h3>
                                <div className="chart-container">
                                    <div className="bar-chart">
                                        <div className="bar-item">
                                            <span className="bar-label">Product A</span>
                                            <div className="bar-track">
                                                <div className="bar-fill" style={{ width: '82%' }}></div>
                                            </div>
                                            <span className="bar-value">12,300</span>
                                        </div>
                                        <div className="chart-axis">
                                            <span>0</span>
                                            <span>Units Sold</span>
                                            <span>1500</span>
                                        </div>
                                    </div>
                                    <div className="chart-insights">
                                        <div className="insight-title">Product A: 12,300 Units</div>
                                        <div className="insight-item">
                                            <span className="dot"></span>
                                            Best Selling Item
                                        </div>
                                        <div className="insight-item">
                                            <span className="dot"></span>
                                            Sales surged by 25%
                                        </div>
                                    </div>
                                </div>

                                {/* Explanation */}
                                <div className="explanation-section">
                                    <h4 className="explanation-title">Explanation</h4>
                                    <p className="explanation-text">
                                        <strong>Product A</strong> was the best performer last month with <strong>12,300</strong> units sold, marking a 25% increase compared to the previous month.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat Input */}
                <div className="chat-input-container">
                    <div className="chat-input-wrapper">
                        <input
                            type="text"
                            placeholder="Ask a question about your data..."
                        />
                        <div className="input-actions">
                            <button className="input-action-btn" aria-label="Voice input">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="23" />
                                    <line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                            </button>
                            <button className="input-action-btn" aria-label="Emoji">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                    <line x1="9" y1="9" x2="9.01" y2="9" />
                                    <line x1="15" y1="9" x2="15.01" y2="9" />
                                </svg>
                            </button>
                            <button className="send-btn">Send</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import type { ChatWorkflowResponse } from '../../types/api';
import { ChartVisualization } from './ChartVisualization';
import './ChatMessage.css';

interface ChatMessageProps {
    message: {
        id: string;
        type: 'user' | 'ai';
        content: string;
        response?: ChatWorkflowResponse;
        timestamp: Date;
    };
    userInitials: string;
}

export function ChatMessage({ message, userInitials }: ChatMessageProps) {
    const isUser = message.type === 'user';

    return (
        <div className={`message ${message.type}`}>
            <div className={`message-avatar ${message.type === 'ai' ? 'ai' : ''}`}>
                {isUser ? (
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
                        {userInitials}
                    </div>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                )}
            </div>
            <div className="message-content">
                <div className="message-bubble">
                    {message.content}
                </div>

                {/* AI Response with Visualization */}
                {!isUser && message.response && (
                    <ChartVisualization response={message.response} />
                )}
            </div>
        </div>
    );
}

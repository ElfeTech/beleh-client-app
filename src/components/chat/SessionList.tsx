import { useState } from 'react';
import { useChatSession } from '../../context/ChatSessionContext';
import './SessionList.css';

interface SessionListProps {
    onNewSession: () => void;
    onDeleteSession: (sessionId: string) => void;
    isCreatingSession: boolean;
}

export function SessionList({ onNewSession, onDeleteSession, isCreatingSession }: SessionListProps) {
    const { sessions, activeSessionId, setActiveSessionId } = useChatSession();
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        setDeletingSessionId(sessionId);
        try {
            await onDeleteSession(sessionId);
        } finally {
            setDeletingSessionId(null);
        }
    };

    return (
        <div className="session-list-container">
            <div className="session-list-header">
                <h3>Sessions</h3>
                <button
                    className="new-session-btn"
                    onClick={onNewSession}
                    disabled={isCreatingSession}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Chat
                </button>
            </div>

            <div className="session-list">
                {sessions.length === 0 ? (
                    <div className="session-list-empty">
                        <p>No sessions yet</p>
                        <p className="session-list-empty-hint">Click "New Chat" to start</p>
                    </div>
                ) : (
                    sessions.map(session => (
                        <div
                            key={session.id}
                            className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                            onClick={() => setActiveSessionId(session.id)}
                        >
                            <div className="session-item-content">
                                <div className="session-item-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <div className="session-item-details">
                                    <div className="session-item-title">{session.title}</div>
                                    <div className="session-item-time">{formatDate(session.created_at)}</div>
                                </div>
                            </div>
                            <button
                                className="session-item-delete"
                                onClick={(e) => handleDelete(e, session.id)}
                                disabled={deletingSessionId === session.id}
                                title="Delete session"
                            >
                                {deletingSessionId === session.id ? (
                                    <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" opacity="0.25" />
                                        <path d="M12 2a10 10 0 0 1 10 10" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

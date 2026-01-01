import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { ChatSessionRead } from '../types/api';

interface ChatSessionContextType {
    sessions: ChatSessionRead[];
    setSessions: (sessions: ChatSessionRead[]) => void;
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    addSession: (session: ChatSessionRead) => ChatSessionRead;
    removeSession: (sessionId: string) => void;
}

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(undefined);

export { ChatSessionContext };

export function ChatSessionProvider({ children }: { children: ReactNode }) {
    const [sessions, setSessions] = useState<ChatSessionRead[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
        // Load from localStorage on mount
        return localStorage.getItem('activeSessionId');
    });

    // Persist active session to localStorage
    useEffect(() => {
        if (activeSessionId) {
            localStorage.setItem('activeSessionId', activeSessionId);
        } else {
            localStorage.removeItem('activeSessionId');
        }
    }, [activeSessionId]);

    const addSession = (session: ChatSessionRead) => {
        setSessions(prev => [session, ...prev]);
        return session;
    };

    const removeSession = (sessionId: string) => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (activeSessionId === sessionId) {
            setActiveSessionId(null);
        }
    };

    return (
        <ChatSessionContext.Provider
            value={{
                sessions,
                setSessions,
                activeSessionId,
                setActiveSessionId,
                addSession,
                removeSession,
            }}
        >
            {children}
        </ChatSessionContext.Provider>
    );
}

export function useChatSession() {
    const context = useContext(ChatSessionContext);
    if (!context) {
        throw new Error('useChatSession must be used within ChatSessionProvider');
    }
    return context;
}

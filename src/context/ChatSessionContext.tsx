import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ChatSessionRead } from '../types/api';
import { apiClient } from '../services/apiClient';
import { authService } from '../services/authService';
import { apiCacheManager } from '../utils/apiCacheManager';

interface ChatSessionContextType {
    sessions: ChatSessionRead[];
    setSessions: (sessions: ChatSessionRead[]) => void;
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    addSession: (session: ChatSessionRead) => ChatSessionRead;
    removeSession: (sessionId: string) => void;
    loadSessions: (datasourceId: string, force?: boolean) => Promise<ChatSessionRead[]>;
    invalidateSessions: (datasourceId: string) => void;
    isLoading: boolean;
}

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(undefined);

export { ChatSessionContext };

export function ChatSessionProvider({ children }: { children: ReactNode }) {
    const [sessions, setSessions] = useState<ChatSessionRead[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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

    /**
     * Load sessions for a datasource using unified cache manager
     * This automatically handles caching, deduplication, and stale-while-revalidate
     */
    const loadSessions = useCallback(async (datasourceId: string, force = false) => {
        const token = authService.getAuthToken();
        if (!token) return [];

        setIsLoading(true);

        try {
            const data = await apiCacheManager.fetch(
                'sessions',
                async (authToken: string, dsId: string) => {
                    const response = await apiClient.listChatSessions(authToken, dsId);
                    return response.items;
                },
                [token, datasourceId],
                force ? { ttl: 0 } : undefined // Force refresh by setting TTL to 0
            );

            setSessions(data);
            return data;
        } catch (err) {
            console.error('[ChatSessionContext] Failed to load sessions:', err);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Invalidate cached sessions for a datasource
     */
    const invalidateSessions = useCallback((datasourceId: string) => {
        const token = authService.getAuthToken();
        if (!token) return;

        apiCacheManager.invalidate('sessions', [token, datasourceId]);
        console.log('[ChatSessionContext] Invalidated sessions cache for datasource:', datasourceId);
    }, []);

    return (
        <ChatSessionContext.Provider
            value={{
                sessions,
                setSessions,
                activeSessionId,
                setActiveSessionId,
                addSession,
                removeSession,
                loadSessions,
                invalidateSessions,
                isLoading
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

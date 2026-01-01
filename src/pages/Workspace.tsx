import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatasource } from '../context/DatasourceContext';
import { useChatSession } from '../context/ChatSessionContext';
import { useUsage } from '../context/UsageContext';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import type { ChatWorkflowResponse, ChatMessageRead } from '../types/api';
import { ChatMessage } from '../components/chat/ChatMessage';
import { SessionList } from '../components/chat/SessionList';
import { EmptyStateDashboard } from '../components/workspace/EmptyStateDashboard';
import { UploadModal } from '../components/layout/UploadModal';
import MobileChatHeader from '../components/layout/MobileChatHeader';
import WorkspaceSwitcher from '../components/layout/WorkspaceSwitcher';
import { WorkspaceModal } from '../components/layout/WorkspaceModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWorkspace } from '../context/WorkspaceContext';
import './Workspace.css';

interface Message {
    id: string;
    type: 'user' | 'ai';
    content: string;
    response?: ChatWorkflowResponse;
    timestamp: Date;
}

export function Workspace() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id: workspaceId } = useParams<{ id: string }>();
    const { selectedDatasourceId, setSelectedDatasourceId } = useDatasource();
    const { setSessions, activeSessionId, setActiveSessionId, addSession, removeSession } = useChatSession();
    const { refreshUsage } = useUsage();
    const workspaceContext = useWorkspace();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
    const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Refs to track if we've already loaded sessions/messages for current datasource/session
    const loadedDatasourceRef = useRef<string | null>(null);
    const loadedSessionRef = useRef<string | null>(null);

    // AbortController for workspace switching to prevent race conditions
    const workspaceSwitchAbortController = useRef<AbortController | null>(null);

    // Use datasources from WorkspaceContext instead of local state
    const dataSources = workspaceContext.datasources;
    const isLoadingDataSources = workspaceContext.loading;

    const initials = user?.displayName
        ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'GU';

    const getInputPlaceholder = () => {
        if (!selectedDatasourceId) return "Select a datasource to start chatting...";
        return "Ask a question about your data...";
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Track mobile viewport changes
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadSessions = useCallback(async () => {
        if (!selectedDatasourceId) {
            return;
        }

        try {
            const token = authService.getAuthToken();
            if (!token) {
                return;
            }

            const sessionList = await apiClient.listChatSessions(token, selectedDatasourceId);
            setSessions(sessionList);

            // Try to restore the last active session from workspace state or localStorage
            let sessionToActivate: string | null = null;

            // First, try to load from workspace state
            if (workspaceId) {
                const context = await workspaceContext.loadWorkspaceContext(workspaceId);
                if (context?.state?.last_active_session_id &&
                    sessionList.some(s => s.id === context.state.last_active_session_id)) {
                    sessionToActivate = context.state.last_active_session_id;
                }
            }

            // Fallback to localStorage if no state found
            if (!sessionToActivate) {
                const savedActiveSession = localStorage.getItem(`activeSession_${selectedDatasourceId}`);
                if (savedActiveSession && sessionList.some(s => s.id === savedActiveSession)) {
                    sessionToActivate = savedActiveSession;
                }
            }

            // Set active session or default to first session
            if (sessionToActivate) {
                setActiveSessionId(sessionToActivate);
            } else if (sessionList.length > 0) {
                setActiveSessionId(sessionList[0].id);
            } 
        } catch (err) {
            console.error('[Workspace] Failed to load sessions:', err);
        }
    }, [selectedDatasourceId, workspaceId, workspaceContext, setSessions, setActiveSessionId]);

    const loadSessionMessages = useCallback(async (sessionId: string) => {
        try {
            const token = authService.getAuthToken();
            if (!token) return;

            const messagesData = await apiClient.getSessionMessages(token, sessionId);

            // Convert API messages to UI messages
            const uiMessages: Message[] = messagesData.map((msg: ChatMessageRead) => {

                const uiMessage: Message = {
                    id: msg.id,
                    type: msg.role === 'user' ? 'user' : 'ai',
                    content: msg.content,
                    response: msg.role === 'assistant' && msg.message_metadata ? {
                        intent: msg.message_metadata.intent,
                        execution: msg.message_metadata.execution,
                        visualization: msg.message_metadata.visualization || null,
                        insight: msg.message_metadata.insight || null,
                        session_id: msg.message_metadata.session_id,
                        message_id: msg.message_metadata.message_id,
                    } : undefined,
                    timestamp: new Date(msg.created_at),
                };

                return uiMessage;
            });

            setMessages(uiMessages);
        } catch (err) {
            console.error('Failed to load session messages:', err);
            // Check if it's a 404 (session doesn't exist on server yet - new session)
            const error = err as any;
            if (error?.response?.status === 404 || error?.status === 404) {
                // New session that doesn't exist on server yet - start with empty messages
                setMessages([]);
                setError(null); // Clear any previous errors
            } else {
                // Actual error loading messages
                console.error('Error loading messages:', error);
                setMessages([]);
                // Don't show error for new sessions, only for actual failures
            }
        }
    }, []);

    // Load workspace preferences when workspace changes
    useEffect(() => {
        const loadPreferences = async () => {
            if (!workspaceId) return;

            // Abort any pending workspace switch
            if (workspaceSwitchAbortController.current) {
                workspaceSwitchAbortController.current.abort();
            }

            const abortController = new AbortController();
            workspaceSwitchAbortController.current = abortController;

            try {
                const context = await workspaceContext.loadWorkspaceContext(workspaceId);

                // Check if this request was aborted
                if (abortController.signal.aborted) {
                    return;
                }

                if (context?.state) {

                    // Set the active dataset from state
                    if (context.state.last_active_dataset_id) {
                        setSelectedDatasourceId(context.state.last_active_dataset_id);
                    }

                    // Active session will be set when sessions are loaded
                } 
            } catch (error) {
                    console.error('[Workspace] Failed to load workspace context:', error);
            }
        };

        loadPreferences();

        return () => {
            // Cleanup on unmount or workspace change
            if (workspaceSwitchAbortController.current) {
                workspaceSwitchAbortController.current.abort();
            }
        };
    }, [workspaceId, workspaceContext, setSelectedDatasourceId]);

    // Load sessions when datasource changes
    useEffect(() => {
        if (selectedDatasourceId) {
            // Only load if we haven't already loaded for this datasource
            if (loadedDatasourceRef.current !== selectedDatasourceId) {
                loadedDatasourceRef.current = selectedDatasourceId;
                loadSessions();
            }
        } else {
            loadedDatasourceRef.current = null;
            setSessions([]);
            setActiveSessionId(null);
            setMessages([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDatasourceId]);

    // Load messages when active session changes
    useEffect(() => {
        if (activeSessionId) {
            // Only load if we haven't already loaded for this session
            if (loadedSessionRef.current !== activeSessionId) {
                loadedSessionRef.current = activeSessionId;
                loadSessionMessages(activeSessionId);
            }
        } else {
            loadedSessionRef.current = null;
            setMessages([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSessionId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Persist active session in localStorage
    useEffect(() => {
        if (activeSessionId && selectedDatasourceId) {
            localStorage.setItem(`activeSession_${selectedDatasourceId}`, activeSessionId);
        }
    }, [activeSessionId, selectedDatasourceId]);

    // Auto-save workspace state when dataset or session changes
    useEffect(() => {
        if (!workspaceId) return;

        // Save state in the background (non-blocking)
        workspaceContext.saveWorkspaceState(
            workspaceId,
            selectedDatasourceId,
            activeSessionId
        );
    }, [workspaceId, selectedDatasourceId, activeSessionId, workspaceContext]);

    const handleNewSession = async () => {
        if (!selectedDatasourceId || isCreatingSession) return null;

        setIsCreatingSession(true);
        setError(null);

        try {
            const token = authService.getAuthToken();
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const newSession = await apiClient.createChatSession(
                token,
                selectedDatasourceId,
                `Chat ${new Date().toLocaleDateString()}`
            );

            addSession(newSession);
            setActiveSessionId(newSession.id);
            return newSession.id;
        } catch (err) {
            console.error('[Workspace] Failed to create session:', err);
            setError('Failed to create new session');
            return null;
        } finally {
            setIsCreatingSession(false);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        try {
            const token = authService.getAuthToken();
            if (!token) {
                throw new Error('Authentication token not found');
            }

            await apiClient.deleteChatSession(token, sessionId);
            removeSession(sessionId);
        } catch (err) {
            console.error('Failed to delete session:', err);
            setError('Failed to delete session');
        }
    };

    const handleSendMessage = async () => {
        const question = inputValue.trim();
        if (!question || isLoading) return;

        if (!selectedDatasourceId) {
            setError('Please select a datasource first');
            return;
        }

        // Determine which session to use
        let sessionIdToUse = activeSessionId;


        // Create a new session if none exists
        if (!sessionIdToUse) {
            const newSessionId = await handleNewSession();
            if (!newSessionId) {
                setError('Failed to create session. Please try again.');
                return;
            }
            sessionIdToUse = newSessionId;
        } 

        setInputValue('');
        setError(null);

        // Add user message immediately
        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: question,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const token = authService.getAuthToken();
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // Send message to the active session
            const response = await apiClient.addMessageToSession(
                token,
                sessionIdToUse,
                question,
                selectedDatasourceId
            );


            // Add AI response
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: response.insight?.summary || 'Here are the results:',
                response: response,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, aiMessage]);

            // Refresh usage and datasources after successful query
            refreshUsage();
            workspaceContext.refreshDatasources();
        } catch (err) {
            console.error('Failed to send message:', err);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: 'Sorry, I encountered an error processing your request.',
                response: {
                    execution: {
                        status: 'ERROR',
                        execution_time_ms: 0,
                        row_count: 0,
                        columns: [],
                        rows: [],
                        cache_hit: false,
                        visualization_hint: null,
                        error_type: 'SYSTEM_ERROR',
                        message: err instanceof Error ? err.message : 'Unknown error occurred'
                    },
                    visualization: null,
                    insight: null,
                },
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleAddDataset = () => {
        setShowUploadModal(true);
    };

    const handleUploadSuccess = async () => {
        // Refresh datasources from WorkspaceContext
        await workspaceContext.refreshDatasources();
    };

    // Determine if workspace is empty
    const isWorkspaceEmpty = !isLoadingDataSources && dataSources.length === 0;

    // If workspace is empty, show the empty state dashboard
    if (isWorkspaceEmpty) {
        return (
            <div className="workspace-with-sessions">
                <div className="content-area" style={{ flex: 1 }}>
                    <EmptyStateDashboard onAddDataset={handleAddDataset} />
                </div>

                {showUploadModal && workspaceId && (
                    <UploadModal
                        workspaceId={workspaceId}
                        onClose={() => setShowUploadModal(false)}
                        onSuccess={handleUploadSuccess}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="workspace-with-sessions">
            {/* Desktop: Show session list sidebar */}
            {!isMobile && (
                <SessionList
                    onNewSession={handleNewSession}
                    onDeleteSession={handleDeleteSession}
                    isCreatingSession={isCreatingSession}
                />
            )}

            <div className={`content-area ${isMobile ? 'mobile' : ''}`}>
                {/* Mobile: Show sticky header with selectors */}
                {isMobile && (
                    <MobileChatHeader
                        onWorkspaceClick={() => setShowWorkspaceSwitcher(true)}
                        onDatasetClick={() => navigate(`/workspace/${workspaceId}/datasets`)}
                    />
                )}
                {/* Error Display */}
                {error && (
                    <div className="chat-error-banner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {/* Chat Section */}
                <div className="chat-section">
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <div className="chat-empty-state">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                <h3>Start a conversation</h3>
                                <p>Ask questions about your data and get AI-powered insights with visualizations</p>
                                {!selectedDatasourceId ? (
                                    <p className="warning-text">⚠️ Please select a datasource to get started</p>
                                ) : !activeSessionId ? (
                                    <p className="warning-text">Click "New Chat" to start a session</p>
                                ) : null}
                            </div>
                        ) : (
                            <>
                                {messages.map(message => (
                                    <ErrorBoundary key={message.id}>
                                        <ChatMessage
                                            message={message}
                                            userInitials={initials}
                                        />
                                    </ErrorBoundary>
                                ))}
                                {isLoading && (
                                    <div className="message ai loading">
                                        <div className="message-avatar ai">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                                <path d="M2 17l10 5 10-5" />
                                                <path d="M2 12l10 5 10-5" />
                                            </svg>
                                        </div>
                                        <div className="message-content">
                                            <div className="typing-indicator">
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="chat-input-container">
                        <div className="chat-input-wrapper">
                            <input
                                type="text"
                                placeholder={getInputPlaceholder()}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading || !selectedDatasourceId}
                            />
                            <div className="input-actions">
                                <button
                                    className="send-btn"
                                    onClick={handleSendMessage}
                                    disabled={isLoading || !inputValue.trim() || !selectedDatasourceId}
                                >
                                    {isLoading ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workspace switcher modal */}
            <WorkspaceSwitcher
                isOpen={showWorkspaceSwitcher}
                onClose={() => setShowWorkspaceSwitcher(false)}
                onCreateWorkspace={() => setShowCreateWorkspaceModal(true)}
            />

            {/* Workspace creation modal */}
            {showCreateWorkspaceModal && (
                <WorkspaceModal
                    onClose={() => setShowCreateWorkspaceModal(false)}
                    onSuccess={async () => {
                        // Refresh workspace list
                        await workspaceContext.refreshWorkspaces();
                        setShowCreateWorkspaceModal(false);
                        // Navigate to the newly created workspace
                        if (workspaceContext.workspaces.length > 0) {
                            const newWorkspace = workspaceContext.workspaces.at(-1);
                            if (newWorkspace) {
                                workspaceContext.setCurrentWorkspace(newWorkspace);
                                localStorage.setItem('activeWorkspaceId', newWorkspace.id);
                                navigate(`/workspace/${newWorkspace.id}`);
                            }
                        }
                    }}
                />
            )}
        </div>
    );
}

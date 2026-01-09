import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatasource } from '../context/DatasourceContext';
import { useChatSession } from '../context/ChatSessionContext';
import { useUsage } from '../context/UsageContext';
import { useFeedback } from '../context/FeedbackContext';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import type { ChatWorkflowResponse, ChatMessageRead } from '../types/api';
import { ChatMessage } from '../components/chat/ChatMessage';
import { EmptyStateDashboard } from '../components/workspace/EmptyStateDashboard';
import { UploadModal } from '../components/layout/UploadModal';
import MobileChatHeader from '../components/layout/MobileChatHeader';
import WorkspaceSwitcher from '../components/layout/WorkspaceSwitcher';
import { WorkspaceModal } from '../components/layout/WorkspaceModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWorkspace } from '../context/WorkspaceContext';
import { FEEDBACK_TRIGGERS } from '../types/feedback';
import './Workspace.css';

interface Message {
    id: string;
    type: 'user' | 'ai';
    content: string;
    response?: ChatWorkflowResponse;
    timestamp: Date;
    isLoading?: boolean;
    status?: 'sending' | 'sent' | 'error';
}

export function Workspace() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id: workspaceId } = useParams<{ id: string }>();
    const { selectedDatasourceId, setSelectedDatasourceId } = useDatasource();
    const { setSessions, activeSessionId, setActiveSessionId, addSession } = useChatSession();
    const { decrementQueryCount, refreshUsageAfterAction } = useUsage();
    const workspaceContext = useWorkspace();
    const { trackChatQuery, trackComplexQuery, showFeedback } = useFeedback();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialChatLoading, setIsInitialChatLoading] = useState(true);
    const [initialSyncError, setInitialSyncError] = useState<string | null>(null);
    const [processingStatus, setProcessingStatus] = useState('');
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
    const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesTopRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

    // Refs to track if we've already loaded sessions/messages for current datasource/session
    const loadedDatasourceRef = useRef<string | null>(null);
    const loadedSessionRef = useRef<string | null>(null);

    // Ref to track if initial messages have been loaded (for scroll on page refresh)
    const initialScrollDoneRef = useRef<boolean>(false);

    // AbortController for workspace switching to prevent race conditions
    const workspaceSwitchAbortController = useRef<AbortController | null>(null);

    // Pagination state for messages
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
    const previousScrollHeightRef = useRef<number>(0);
    const previousScrollTopRef = useRef<number>(0);
    const isLoadingOlderMessagesRef = useRef<boolean>(false);

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

    const scrollToBottom = (instant = false) => {
        messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    };

    // Auto-resize textarea based on content
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';

        // Calculate new height (limited to 3 lines)
        const lineHeight = 24; // Approximate line height in pixels
        const maxHeight = lineHeight * 3; // 3 lines
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);

        textarea.style.height = `${newHeight}px`;
    };

    // Track mobile viewport changes
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Check if we should show returning user feedback
    useEffect(() => {
        const timer = setTimeout(() => {
            showFeedback(FEEDBACK_TRIGGERS.RETURNING_USER);
        }, 2000); // Show after 2 seconds of being on the page

        return () => clearTimeout(timer);
    }, [showFeedback]);

    const loadSessions = useCallback(async () => {
        if (!selectedDatasourceId) {
            setIsInitialChatLoading(false);
            return;
        }

        try {
            setIsInitialChatLoading(true);
            setInitialSyncError(null);
            const token = authService.getAuthToken();
            if (!token) {
                setIsInitialChatLoading(false);
                return;
            }

            const response = await apiClient.listChatSessions(token, selectedDatasourceId);
            const sessionList = response.items;
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
            } else {
                // No sessions at all, so we're not loading messages
                setIsInitialChatLoading(false);
            }
        } catch (err: any) {
            console.error('[Workspace] Failed to load sessions:', err);
            setInitialSyncError(err.message || 'We had trouble loading your chat sessions. Please try again.');
            setIsInitialChatLoading(false);
        }
    }, [selectedDatasourceId, workspaceId, workspaceContext, setSessions, setActiveSessionId]);

    const loadSessionMessages = useCallback(async (sessionId: string, page: number = 1) => {
        try {
            if (page === 1) {
                setIsInitialChatLoading(true);
                setInitialSyncError(null);
            }
            const token = authService.getAuthToken();
            if (!token) {
                if (page === 1) setIsInitialChatLoading(false);
                return;
            }

            const response = await apiClient.getSessionMessagesPaginated(token, sessionId, { page, page_size: 20 });
            const messagesData = response.items;

            // Convert API messages to UI messages
            const uiMessages: Message[] = messagesData.map((msg: ChatMessageRead) => {
                // Determine message content, with validation for failed queries
                let messageContent = msg.content;

                // For AI messages, check if execution failed and override content if needed
                if (msg.role === 'assistant' && msg.message_metadata) {
                    const execution = msg.message_metadata.execution;
                    const insight = msg.message_metadata.insight;

                    // If query failed with no results, show the error message
                    if (execution?.status === 'FAILED' && execution?.row_count === 0) {
                        messageContent = execution?.message || 'Query execution failed. Please try rephrasing your question.';
                    } else if (!messageContent || messageContent === 'Here are the results:') {
                        // Fallback to insight summary if content is generic or empty
                        messageContent = insight?.summary || messageContent;
                    }
                }

                const uiMessage: Message = {
                    id: msg.id,
                    type: msg.role === 'user' ? 'user' : 'ai',
                    content: messageContent,
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

            // API returns messages in DESC order (newest first)
            // We need to reverse them for display (oldest first, newest at bottom)
            const reversedMessages = [...uiMessages].reverse();

            if (page === 1) {
                // Initial load - replace all messages
                setMessages(reversedMessages);
                setCurrentPage(1);
                setHasMoreMessages(response.has_next);

                // Scroll to bottom after messages are loaded (important for page refresh)
                // Use multiple timeouts to ensure DOM is fully rendered
                if (reversedMessages.length > 0) {
                    // Immediate scroll attempt
                    setTimeout(() => scrollToBottom(true), 50);
                    // Delayed scroll to ensure all content (charts, etc.) is rendered
                    setTimeout(() => scrollToBottom(true), 300);
                    // Mark initial scroll as done
                    initialScrollDoneRef.current = true;
                }
            } else {
                // Loading older messages - prepend to existing messages
                setMessages(prev => [...reversedMessages, ...prev]);
                setCurrentPage(page);
                setHasMoreMessages(response.has_next);
            }
        } catch (err: any) {
            console.error('Failed to load session messages:', err);
            if (page === 1) {
                setInitialSyncError(err.message || 'We couldn\'t retrieve your message history. Please try again.');
            }
        } finally {
            if (page === 1) setIsInitialChatLoading(false);
        }
    }, [setSelectedDatasourceId]); // Added dependency to keep it stable

    // Load more (older) messages when scrolling to top
    const loadMoreMessages = useCallback(async () => {
        if (!activeSessionId || isLoadingMoreMessages || !hasMoreMessages) return;

        setIsLoadingMoreMessages(true);
        isLoadingOlderMessagesRef.current = true;

        // Save current scroll position before loading
        const container = chatMessagesContainerRef.current;
        if (container) {
            previousScrollHeightRef.current = container.scrollHeight;
            previousScrollTopRef.current = container.scrollTop;
        }

        try {
            await loadSessionMessages(activeSessionId, currentPage + 1);
        } finally {
            setIsLoadingMoreMessages(false);
        }
    }, [activeSessionId, currentPage, hasMoreMessages, isLoadingMoreMessages, loadSessionMessages]);

    // Maintain scroll position after loading older messages
    useEffect(() => {
        // Only adjust scroll if we just loaded older messages
        if (!isLoadingOlderMessagesRef.current) return;

        const container = chatMessagesContainerRef.current;
        if (!container || previousScrollHeightRef.current === 0) return;

        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
            // Calculate the difference in scroll height and adjust scroll position
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - previousScrollHeightRef.current;

            if (scrollDiff > 0) {
                // Restore the scroll position by adding the height of new content
                container.scrollTop = previousScrollTopRef.current + scrollDiff;
            }

            // Reset the saved values and flag
            previousScrollHeightRef.current = 0;
            previousScrollTopRef.current = 0;
            isLoadingOlderMessagesRef.current = false;
        });
    }, [messages]);

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
                setIsInitialChatLoading(true);
                setInitialSyncError(null);
                const context = await workspaceContext.loadWorkspaceContext(workspaceId);

                // Check if this request was aborted
                if (abortController.signal.aborted) {
                    setIsInitialChatLoading(false);
                    return;
                }

                if (context?.state) {
                    // Set the active dataset from state
                    if (context.state.last_active_dataset_id) {
                        setSelectedDatasourceId(context.state.last_active_dataset_id);
                    }
                    // Active session will be set when sessions are loaded
                } else if (!context) {
                    // Context load returned null (already logged in WorkspaceContext)
                    setInitialSyncError('Failed to synchronize workspace settings.');
                }
            } catch (error: any) {
                console.error('[Workspace] Failed to load workspace context:', error);
                setInitialSyncError(error.message || 'Failed to synchronize workspace settings.');
            } finally {
                // Ensure we don't stay in loading state if context load fails
                // but only if we don't have a datasource that will trigger loadSessions
                // or if an error occurred
                if (!selectedDatasourceId || initialSyncError) {
                    setIsInitialChatLoading(false);
                }
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
                // Reset scroll flag when loading new session
                initialScrollDoneRef.current = false;
                loadSessionMessages(activeSessionId);
            }
        } else {
            loadedSessionRef.current = null;
            initialScrollDoneRef.current = false;
            setMessages([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSessionId]);

    // Auto-scroll to bottom when messages change (for new messages during chat)
    useEffect(() => {
        // Only smooth scroll for new messages added during chat session
        // Initial load scrolling is handled in loadSessionMessages
        if (initialScrollDoneRef.current && messages.length > 0) {
            scrollToBottom();
        }
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

    // IntersectionObserver for lazy loading older messages when scrolling to top
    useEffect(() => {
        const topSentinel = messagesTopRef.current;
        if (!topSentinel || !hasMoreMessages || isLoadingMoreMessages) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // When the top sentinel is visible, load more messages
                if (entries[0].isIntersecting && hasMoreMessages && !isLoadingMoreMessages) {
                    loadMoreMessages();
                }
            },
            {
                // Trigger when element is 200px before entering viewport
                rootMargin: '200px 0px 0px 0px',
                threshold: 0.1
            }
        );

        observer.observe(topSentinel);

        return () => {
            observer.disconnect();
        };
    }, [hasMoreMessages, isLoadingMoreMessages, loadMoreMessages]);

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
            setError('Failed to create new chat');
            return null;
        } finally {
            setIsCreatingSession(false);
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
                setError('Failed to create chat. Please try again.');
                return;
            }
            sessionIdToUse = newSessionId;
        }

        setInputValue('');
        setError(null);

        // Reset textarea height after sending
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Add user message immediately with 'sending' status
        const userMessageId = Date.now().toString();
        const userMessage: Message = {
            id: userMessageId,
            type: 'user',
            content: question,
            timestamp: new Date(),
            status: 'sending'
        };

        // Add a temporary AI "thinking" message
        const aiLoadingMessageId = (Date.now() + 1).toString();
        const aiLoadingMessage: Message = {
            id: aiLoadingMessageId,
            type: 'ai',
            content: '',
            timestamp: new Date(),
            isLoading: true
        };

        setMessages(prev => [...prev, userMessage, aiLoadingMessage]);
        setIsLoading(true);
        setProcessingStatus('Analyzing your request...');

        // Status update intervals
        const statusUpdates = [
            { time: 1500, status: 'Fetching your data...' },
            { time: 3500, status: 'Performing AI calculations...' },
            { time: 6000, status: 'Generating insights...' },
            { time: 8500, status: 'Finalizing visualization...' }
        ];

        const timerIds = statusUpdates.map(update =>
            setTimeout(() => setProcessingStatus(update.status), update.time)
        );

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


            // Determine AI message content based on execution status
            let aiMessageContent: string;

            if (response.execution?.status === 'FAILED' && response.execution?.row_count === 0) {
                // Show the error message from execution when query fails
                aiMessageContent = response.execution?.message || 'Query execution failed. Please try rephrasing your question.';
            } else {
                // Show the insight summary or default message
                aiMessageContent = response.insight?.summary || 'Here are the results:';
            }

            setMessages(prev => prev.map(msg => {
                if (msg.id === userMessageId) {
                    return { ...msg, status: 'sent' as const };
                }
                if (msg.id === aiLoadingMessageId) {
                    return {
                        ...msg,
                        id: (Date.now() + 2).toString(),
                        type: 'ai',
                        content: aiMessageContent,
                        response: response,
                        timestamp: new Date(),
                        isLoading: false
                    };
                }
                return msg;
            }));

            // Track chat query for feedback
            trackChatQuery();

            // Check if this was a complex query (GROUP BY, FILTER, RANK, aggregations, etc.)
            const isComplexQuery =
                question.toLowerCase().includes('group') ||
                question.toLowerCase().includes('filter') ||
                question.toLowerCase().includes('rank') ||
                question.toLowerCase().includes('top') ||
                question.toLowerCase().includes('bottom') ||
                question.toLowerCase().includes('average') ||
                question.toLowerCase().includes('sum') ||
                question.toLowerCase().includes('count') ||
                (response.execution?.visualization_hint &&
                    ['bar', 'line', 'pie'].includes(response.execution.visualization_hint));

            if (isComplexQuery) {
                trackComplexQuery();
                // Show accuracy feedback after complex query (longer delay so user can review)
                setTimeout(() => {
                    showFeedback(FEEDBACK_TRIGGERS.ACCURACY);
                }, 8000); // 8 seconds - give user time to review results
            } else {
                // Show data understanding feedback after dataset upload + 3 queries
                setTimeout(() => {
                    showFeedback(FEEDBACK_TRIGGERS.DATA_UNDERSTANDING);
                }, 5000); // 5 seconds - give user time to see results
            }

            // Update usage immediately with optimistic update, then force refresh for accurate data
            decrementQueryCount(); // Instant UI feedback
            refreshUsageAfterAction(); // Force refresh to get real usage data
            workspaceContext.refreshDatasources();
        } catch (err) {
            console.error('Failed to send message:', err);
            setMessages(prev => prev.map(msg => {
                if (msg.id === userMessageId) {
                    return { ...msg, status: 'error' as const };
                }
                if (msg.id === aiLoadingMessageId) {
                    return {
                        ...msg,
                        id: (Date.now() + 2).toString(),
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
                        isLoading: false
                    };
                }
                return msg;
            }));
        } finally {
            setIsLoading(false);
            setProcessingStatus('');
            // Clear any pending status update timers
            timerIds.forEach(id => clearTimeout(id));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        adjustTextareaHeight();
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
            {/* Sessions are now managed in the left sidebar WorkspaceMenu */}

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
                    <div className="chat-messages" ref={chatMessagesContainerRef}>
                        {isInitialChatLoading ? (
                            <div className="chat-loading-state">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <h3>Syncing your chats...</h3>
                                <p>Please wait, this will only take a moment.</p>
                            </div>
                        ) : initialSyncError ? (
                            <div className="chat-error-state">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <h3>Synchronization failed</h3>
                                <p>{initialSyncError}</p>
                                <button
                                    className="retry-sync-btn"
                                    onClick={() => activeSessionId ? loadSessionMessages(activeSessionId) : loadSessions()}
                                >
                                    Retry Synchronization
                                </button>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="chat-empty-state">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                <h3>Start a conversation</h3>
                                <p>Ask questions about your data and get AI-powered insights with visualizations</p>
                                {!selectedDatasourceId ? (
                                    <p className="warning-text">⚠️ Please select a datasource to get started</p>
                                ) : !activeSessionId ? (
                                    <p className="warning-text">Click "New Chat" to start</p>
                                ) : null}
                            </div>
                        ) : (
                            <>
                                {/* Sentinel element for loading older messages at the top */}
                                {hasMoreMessages && (
                                    <div ref={messagesTopRef} style={{ height: '20px', margin: '10px 0' }}>
                                        {isLoadingMoreMessages && (
                                            <div className="loading-more-indicator" style={{
                                                textAlign: 'center',
                                                padding: '10px',
                                                color: '#666',
                                                fontSize: '14px'
                                            }}>
                                                <div className="typing-indicator" style={{ display: 'inline-flex', gap: '4px' }}>
                                                    <span style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#666',
                                                        animation: 'pulse 1.4s infinite ease-in-out both',
                                                        animationDelay: '-0.32s'
                                                    }}></span>
                                                    <span style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#666',
                                                        animation: 'pulse 1.4s infinite ease-in-out both',
                                                        animationDelay: '-0.16s'
                                                    }}></span>
                                                    <span style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#666',
                                                        animation: 'pulse 1.4s infinite ease-in-out both'
                                                    }}></span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {messages.map(message => (
                                    <ErrorBoundary key={message.id}>
                                        <ChatMessage
                                            message={message}
                                            userInitials={initials}
                                            processingStatus={processingStatus}
                                        />
                                    </ErrorBoundary>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="chat-input-container">
                        <div className="chat-input-wrapper">
                            <textarea
                                ref={textareaRef}
                                placeholder={getInputPlaceholder()}
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading || isInitialChatLoading || !!initialSyncError || !selectedDatasourceId}
                                rows={1}
                            />
                            <div className="input-actions">
                                <button
                                    className="send-btn"
                                    onClick={handleSendMessage}
                                    disabled={isLoading || isInitialChatLoading || !!initialSyncError || !inputValue.trim() || !selectedDatasourceId}
                                    aria-label={isLoading ? 'Sending message' : 'Send message'}
                                >
                                    {isMobile ? (
                                        <svg className="send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    ) : (
                                        isLoading ? 'Sending...' : 'Send'
                                    )}
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

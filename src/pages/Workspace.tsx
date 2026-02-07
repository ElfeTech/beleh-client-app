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
import { ChatWelcome } from '../components/chat/ChatWelcome';
import { EmptyStateDashboard } from '../components/workspace/EmptyStateDashboard';
import { UploadModal } from '../components/layout/UploadModal';
import MobileChatHeader from '../components/layout/MobileChatHeader';
import WorkspaceSwitcher from '../components/layout/WorkspaceSwitcher';
import { WorkspaceModal } from '../components/layout/WorkspaceModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWorkspace } from '../context/WorkspaceContext';
import { FEEDBACK_TRIGGERS } from '../types/feedback';
import {
    hasCompletedDemo,
    isNewUserForDemo,
    setDemoCompleted,
    DEMO_PROMPTS,
    getDemoResponse,
    matchDemoPromptId,
} from '../constants/demoData';
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
    const { setSessions, activeSessionId, setActiveSessionId, addSession, loadSessions: loadSessionsContext } = useChatSession();
    const { decrementQueryCount, refreshUsageAfterAction } = useUsage();
    const workspaceContext = useWorkspace();
    const { workspaces, currentWorkspace, setCurrentWorkspace } = workspaceContext;
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
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [demoMessages, setDemoMessages] = useState<Message[]>([]);
    const demoMessagesEndRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesTopRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

    // Refs to track if we've already loaded sessions/messages for current datasource/session
    const loadedDatasourceRef = useRef<string | null>(null);
    const loadedSessionRef = useRef<string | null>(null);

    // Ref to track if initial messages have been loaded (for scroll on page refresh)
    const initialScrollDoneRef = useRef<boolean>(false);

    // Ref to track if we're currently hydrating from workspace context (to prevent saving during load)
    const isHydratingRef = useRef<boolean>(false);

    // Ref to track the last hydration timestamp (to prevent duplicate hydration in React StrictMode)
    const hydratedWorkspaceRef = useRef<number | null>(null);

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

    // Get the currently selected datasource for ChatWelcome
    const selectedDatasource = dataSources.find(ds => ds.id === selectedDatasourceId) || null;

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

    // Sync WorkspaceContext currentWorkspace with URL so datasources and last-active state load for the viewed workspace
    useEffect(() => {
        if (!workspaceId || !workspaces?.length) return;
        const workspace = workspaces.find((w: { id: string }) => w.id === workspaceId);
        if (workspace && currentWorkspace?.id !== workspaceId) {
            setCurrentWorkspace(workspace);
        }
    }, [workspaceId, workspaces, currentWorkspace?.id, setCurrentWorkspace]);

    // Check if we should show returning user feedback
    useEffect(() => {
        const timer = setTimeout(() => {
            showFeedback(FEEDBACK_TRIGGERS.RETURNING_USER);
        }, 2000); // Show after 2 seconds of being on the page

        return () => clearTimeout(timer);
    }, [showFeedback]);

    // Load sessions when datasource changes
    useEffect(() => {
        if (selectedDatasourceId) {
            // Only load if we haven't already loaded for this datasource
            if (loadedDatasourceRef.current !== selectedDatasourceId) {
                loadedDatasourceRef.current = selectedDatasourceId;

                // Use the context function which handles deduplication
                setIsInitialChatLoading(true);
                loadSessionsContext(selectedDatasourceId)
                    .then(sessions => {
                        // Sessions are set in context
                        // Handle active session logic if needed
                        if (sessions.length > 0 && !activeSessionId) {
                            setActiveSessionId(sessions[0].id);
                        } else if (sessions.length === 0) {
                            setIsInitialChatLoading(false);
                        }
                    })
                    .catch(err => {
                        console.error('[Workspace] Failed to load sessions:', err);
                        setInitialSyncError(err.message || 'We had trouble loading your chat sessions. Please try again.');
                        setIsInitialChatLoading(false);
                    });
            }
        } else {
            loadedDatasourceRef.current = null;
            // setSessions([]) is handled by context if we wanted, but here we can force clear
            // Actually, if we clear datasource, we should probably clear sessions locally or let context handle it
            setSessions([]);
            setActiveSessionId(null);
            setMessages([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDatasourceId]);

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

    // Hydrate workspace data in parallel to avoid waterfall (runs when user + workspaceId are available)
    useEffect(() => {
        const hydrateWorkspace = async () => {
            if (!workspaceId || !user) return;

            // Skip if we've already hydrated this workspace in the last 2 seconds
            // This prevents double-call in React StrictMode but allows re-hydration on page refresh
            const now = Date.now();
            const lastHydrationTime = hydratedWorkspaceRef.current;
            if (lastHydrationTime && (now - lastHydrationTime) < 2000) {
                console.log('[Workspace] Skipping duplicate hydration (too soon)');
                return;
            }

            console.log('[Workspace] Starting workspace hydration for:', workspaceId);

            // Abort any pending workspace switch
            if (workspaceSwitchAbortController.current) {
                workspaceSwitchAbortController.current.abort();
            }

            const abortController = new AbortController();
            workspaceSwitchAbortController.current = abortController;

            try {
                // Mark that we're hydrating to prevent auto-save during initial load
                isHydratingRef.current = true;
                hydratedWorkspaceRef.current = now;

                setIsInitialChatLoading(true);
                setInitialSyncError(null);

                // 1. Fetch Context first to know what to load (use user token so it's available after login)
                const token = await user.getIdToken();
                if (!token) throw new Error('Authentication token not found');

                const context = await workspaceContext.loadWorkspaceContext(workspaceId);

                // Check abort
                if (abortController.signal.aborted) {
                    setIsInitialChatLoading(false);
                    setIsInitialChatLoading(false);
                    return;
                }

                if (!context || !context.state) {
                    setInitialSyncError('Failed to synchronize workspace settings.');
                    setIsInitialChatLoading(false);
                    return;
                }

                // 2. Ensure datasources are loaded before proceeding
                // This is critical for mobile - we need datasources to auto-select
                let availableDatasources = workspaceContext.datasources;

                // If datasources are not loaded yet, fetch them directly
                if (availableDatasources.length === 0) {
                    console.log('[Workspace] Datasources not loaded, fetching directly...');
                    try {
                        // Fetch datasources directly using the same cache manager
                        const response = await apiClient.listWorkspaceDatasources(token, workspaceId);
                        availableDatasources = response.items;
                        console.log('[Workspace] Fetched datasources:', availableDatasources.length);

                        // Update context so UI (sidebar, selectedDatasource) has data without hard refresh
                        workspaceContext.setDatasources(availableDatasources);

                        // Also trigger context refresh in background so cache stays in sync
                        workspaceContext.refreshDatasources().catch(err => {
                            console.error('[Workspace] Background datasource refresh failed:', err);
                        });
                    } catch (err) {
                        console.error('[Workspace] Failed to fetch datasources:', err);
                        availableDatasources = [];
                    }
                } else {
                    console.log('[Workspace] Using cached datasources:', availableDatasources.length);
                }

                // 3. Prepare data based on context
                let datasetId = context.state.last_active_dataset_id;
                let sessionId = context.state.last_active_session_id;

                // Auto-select latest datasource if none is active (best UX for mobile users)
                if (!datasetId && availableDatasources.length > 0) {
                    // Sort by most recent (updated_at or created_at)
                    const sortedDatasources = [...availableDatasources].sort((a, b) => {
                        const dateA = new Date(a.updated_at || a.created_at).getTime();
                        const dateB = new Date(b.updated_at || b.created_at).getTime();
                        return dateB - dateA;
                    });

                    // Select the most recent datasource
                    const latestDatasource = sortedDatasources[0];
                    if (latestDatasource && latestDatasource.status === 'READY') {
                        datasetId = latestDatasource.id;
                        console.log('[Workspace] Auto-selected latest datasource:', latestDatasource.name);
                    }
                }

                // Update basic state immediately
                if (datasetId) setSelectedDatasourceId(datasetId);

                // Step 1: Fetch sessions first if we have a dataset
                let loadedSessions: any[] = [];
                if (datasetId) {
                    console.log('[Workspace] Loading sessions for datasetId:', datasetId);
                    try {
                        // ChatSessionContext handles deduplication
                        loadedSessions = await loadSessionsContext(datasetId);
                        loadedDatasourceRef.current = datasetId;
                        console.log('[Workspace] Loaded sessions count:', loadedSessions.length);

                        // Auto-select latest session if none is active (best UX for mobile users)
                        if (!sessionId && loadedSessions && loadedSessions.length > 0) {
                            // Sessions are already sorted by most recent in the API response
                            sessionId = loadedSessions[0].id;
                            console.log('[Workspace] Auto-selected latest session:', loadedSessions[0].title, 'ID:', sessionId);
                        } else if (!sessionId) {
                            console.log('[Workspace] ⚠️  No sessions available to auto-select');
                        } else {
                            console.log('[Workspace] Using session from context:', sessionId);
                        }
                    } catch (err) {
                        console.error('[Workspace] Failed to load sessions:', err);
                    }
                } else {
                    console.log('[Workspace] ⚠️  No datasetId, skipping session load');
                }

                // Step 2: Now fetch messages with the final sessionId (from context or auto-selected)
                console.log('[Workspace] About to load messages - sessionId:', sessionId, 'hasToken:', !!token);

                if (sessionId) {
                    console.log('[Workspace] ✅ Fetching messages for session:', sessionId);
                    try {
                        const messagesResponse = await apiClient.getSessionMessagesPaginated(token, sessionId, { page: 1, page_size: 20 });
                        const messagesData = messagesResponse.items;

                        // Process messages (using same logic as loadSessionMessages)
                        const uiMessages: Message[] = messagesData.map((msg: ChatMessageRead) => {
                            let messageContent = msg.content;
                            if (msg.role === 'assistant' && msg.message_metadata) {
                                const execution = msg.message_metadata.execution;
                                const insight = msg.message_metadata.insight;
                                if (execution?.status === 'FAILED' && execution?.row_count === 0) {
                                    messageContent = execution?.message || 'Query execution failed.';
                                } else if (!messageContent || messageContent === 'Here are the results:') {
                                    messageContent = insight?.summary || messageContent;
                                }
                            }
                            return {
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
                        });

                        const reversedMessages = [...uiMessages].reverse();
                        setMessages(reversedMessages);
                        setCurrentPage(1);
                        setHasMoreMessages(messagesResponse.has_next);
                        setActiveSessionId(sessionId);
                        loadedSessionRef.current = sessionId;

                        // Handle scroll
                        if (reversedMessages.length > 0) {
                            setTimeout(() => scrollToBottom(true), 50);
                            setTimeout(() => scrollToBottom(true), 300);
                            initialScrollDoneRef.current = true;
                        }

                        console.log('[Workspace] ✅ Loaded messages for session:', sessionId, '- Count:', reversedMessages.length);
                    } catch (msgErr) {
                        console.error('[Workspace] ❌ Failed to load messages:', msgErr);
                        // Still set the active session even if messages fail
                        setActiveSessionId(sessionId);
                        loadedSessionRef.current = sessionId;
                    }
                } else {
                    console.log('[Workspace] ⚠️  SKIPPING message load - no sessionId available');
                }

                // Check if we need to save auto-selected or context-loaded state to backend
                const needsStateSave = (context.state.last_active_dataset_id !== datasetId ||
                                       context.state.last_active_session_id !== sessionId) &&
                                      (datasetId || sessionId);

                console.log('[Workspace] State save check:', {
                    needsStateSave,
                    contextDataset: context.state.last_active_dataset_id,
                    currentDataset: datasetId,
                    contextSession: context.state.last_active_session_id,
                    currentSession: sessionId
                });

                if (needsStateSave) {
                    // Save state to backend (either auto-selected or restored from context)
                    console.log('[Workspace] ✅ SAVING workspace state to backend:', { workspaceId, datasetId, sessionId });

                    // Save immediately (debouncing handled by WorkspaceContext)
                    workspaceContext.saveWorkspaceState(workspaceId, datasetId, sessionId);

                    // Clear the hydrating flag after a delay to ensure save is queued
                    // The save is debounced for 500ms in WorkspaceContext, so we wait 600ms
                    setTimeout(() => {
                        isHydratingRef.current = false;
                        console.log('[Workspace] Hydration complete, auto-save now enabled');
                    }, 600);
                } else {
                    console.log('[Workspace] ⏭️  SKIPPING state save - state unchanged');
                    // Clear the hydrating flag immediately if no save needed
                    isHydratingRef.current = false;
                }

            } catch (error: any) {
                console.error('[Workspace] Failed to hydrate workspace:', error);
                setInitialSyncError(error.message || 'Failed to synchronize workspace settings.');
                // Clear hydrating flag on error too
                isHydratingRef.current = false;
            } finally {
                setIsInitialChatLoading(false);
            }
        };

        hydrateWorkspace();

        return () => {
            if (workspaceSwitchAbortController.current) {
                workspaceSwitchAbortController.current.abort();
            }
        };
        // Run when user is available (e.g. after login) and when workspaceId changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, user]);

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

    // Auto-save workspace state when dataset or session changes
    // Note: workspaceContext.saveWorkspaceState is stable and doesn't need to be in dependencies
    useEffect(() => {
        if (!workspaceId) return;

        // Skip saving during initial hydration to prevent redundant API calls
        // (we just loaded this state from the server, no need to save it back)
        if (isHydratingRef.current) {
            console.log('[Workspace] Skipping state save during hydration');
            return;
        }

        // Save state in the background (non-blocking)
        // This is debounced in WorkspaceContext (500ms), so rapid changes only result in one API call
        console.log('[Workspace] Auto-saving workspace state:', { workspaceId, selectedDatasourceId, activeSessionId });
        workspaceContext.saveWorkspaceState(
            workspaceId,
            selectedDatasourceId,
            activeSessionId
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, selectedDatasourceId, activeSessionId]);

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
        setProcessingStatus('Analyzing your request...');

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

    // Handle clicking on a sample prompt from ChatWelcome
    const handlePromptClick = (prompt: string) => {
        setInputValue(prompt);
        // Focus the textarea so user can edit or send
        textareaRef.current?.focus();
    };

    const handleAddDataset = () => {
        setShowUploadModal(true);
    };

    const handleStartDemo = () => {
        setIsDemoMode(true);
        setDemoMessages([]);
    };

    const handleDemoPromptClick = (promptText: string, promptId: string) => {
        const userMsg: Message = {
            id: `demo-user-${Date.now()}`,
            type: 'user',
            content: promptText,
            timestamp: new Date(),
        };
        const loadingId = `demo-ai-loading-${Date.now()}`;
        const loadingMsg: Message = {
            id: loadingId,
            type: 'ai',
            content: '',
            timestamp: new Date(),
            isLoading: true,
        };
        setDemoMessages(prev => [...prev, userMsg, loadingMsg]);

        const response = getDemoResponse(promptId);
        const aiMsg: Message = {
            id: `demo-ai-${Date.now()}`,
            type: 'ai',
            content: response.insight?.summary || 'Here are the results:',
            response,
            timestamp: new Date(),
        };

        setTimeout(() => {
            setDemoMessages(prev =>
                prev.map(m => (m.id === loadingId ? aiMsg : m))
            );
            demoMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 900);
    };

    const handleDemoSend = () => {
        const question = inputValue.trim();
        if (!question) return;
        const promptId = matchDemoPromptId(question);
        handleDemoPromptClick(question, promptId);
        setInputValue('');
    };

    const handleExitDemo = () => {
        setDemoCompleted();
        setIsDemoMode(false);
        setDemoMessages([]);
        setShowUploadModal(true);
    };

    const handleUploadSuccess = async () => {
        // Refresh datasources from WorkspaceContext
        await workspaceContext.refreshDatasources();
    };

    // Determine if workspace is empty
    const isWorkspaceEmpty = !isLoadingDataSources && dataSources.length === 0;
    const showDemoCta = isNewUserForDemo() && !hasCompletedDemo();

    // If workspace is empty and user is in demo mode, show demo chat
    if (isWorkspaceEmpty && isDemoMode) {
        return (
            <div className="workspace-with-sessions">
                <div className={`content-area ${isMobile ? 'mobile' : ''}`}>
                    <div className="demo-banner">
                        <span className="demo-badge">Demo</span>
                        <span className="demo-banner-text">Sample visualizations — try asking below</span>
                    </div>
                    <div className="chat-section">
                        <div className="chat-messages demo-chat-messages" ref={chatMessagesContainerRef}>
                            {demoMessages.length === 0 ? (
                                <div className="chat-welcome demo-welcome">
                                    <div className="chat-welcome-header">
                                        <div className="chat-welcome-icon demo-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                            </svg>
                                        </div>
                                        <h2 className="chat-welcome-title">
                                            Try a sample question
                                        </h2>
                                        <p className="chat-welcome-subtitle">
                                            Click any prompt to see how Beleh turns your question into a chart and insights. This uses sample data — upload your own to analyze real data.
                                        </p>
                                    </div>
                                    <div className="chat-welcome-prompts">
                                        <p className="prompts-label">Example prompts:</p>
                                        <div className="prompts-grid">
                                            {DEMO_PROMPTS.map((prompt) => (
                                                <button
                                                    key={prompt.id}
                                                    className="prompt-suggestion"
                                                    onClick={() => handleDemoPromptClick(prompt.text, prompt.id)}
                                                >
                                                    <span className="prompt-icon">{prompt.icon}</span>
                                                    <span className="prompt-text">{prompt.text}</span>
                                                    <svg className="prompt-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                    </svg>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {demoMessages.map((message) => (
                                        <ErrorBoundary key={message.id}>
                                            <ChatMessage
                                                message={message}
                                                userInitials={initials}
                                                processingStatus=""
                                            />
                                        </ErrorBoundary>
                                    ))}
                                    <div className="demo-upload-cta">
                                        <p>Ready to use your own data?</p>
                                        <button type="button" className="demo-upload-btn" onClick={handleExitDemo}>
                                            Upload your dataset
                                        </button>
                                    </div>
                                    <div ref={demoMessagesEndRef} />
                                </>
                            )}
                        </div>
                        <div className="chat-input-container">
                            <div className="chat-input-wrapper">
                                <textarea
                                    ref={textareaRef}
                                    placeholder="Ask another demo question or type your own..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleDemoSend();
                                        }
                                    }}
                                    rows={1}
                                />
                                <div className="input-actions">
                                    <button
                                        className="send-btn"
                                        onClick={handleDemoSend}
                                        disabled={!inputValue.trim()}
                                        aria-label="Send demo message"
                                    >
                                        {isMobile ? (
                                            <svg className="send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        ) : (
                                            'Send'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
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

    // If workspace is empty (and not in demo), show the empty state dashboard
    if (isWorkspaceEmpty) {
        return (
            <div className="workspace-with-sessions">
                <div className="content-area" style={{ flex: 1 }}>
                    <EmptyStateDashboard
                        onAddDataset={handleAddDataset}
                        onStartDemo={handleStartDemo}
                        showDemoCta={showDemoCta}
                    />
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
                                    onClick={() => activeSessionId ? loadSessionMessages(activeSessionId) : (selectedDatasourceId && loadSessionsContext(selectedDatasourceId))}
                                >
                                    Retry Synchronization
                                </button>
                            </div>
                        ) : messages.length === 0 ? (
                            selectedDatasourceId ? (
                                <ChatWelcome
                                    datasource={selectedDatasource}
                                    onPromptClick={handlePromptClick}
                                    userName={user?.displayName || undefined}
                                />
                            ) : (
                                <div className="chat-empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    <h3>Start a conversation</h3>
                                    <p>Ask questions about your data and get AI-powered insights with visualizations</p>
                                    <p className="warning-text">Please select a datasource to get started</p>
                                </div>
                            )
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
                                disabled={isInitialChatLoading || !!initialSyncError || !selectedDatasourceId}
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
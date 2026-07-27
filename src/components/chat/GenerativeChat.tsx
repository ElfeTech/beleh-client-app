import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Database } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectorWidget } from './ConnectorWidget';
import { ChatComposer } from './ChatComposer';
import { ChatWorkspaceHeader } from './ChatWorkspaceHeader';
import { AssistantAnalysisCard } from './AssistantAnalysisCard';
import { ChartVisualization } from './ChartVisualization';
import { SuggestedPrompts } from './SuggestedPrompts';
import { ChatWelcome } from './ChatWelcome';
import { ThinkingShimmer } from './ThinkingShimmer';
import { turnHasRichUi } from '../../utils/responseViewAvailability';
import { countSchemaTables } from '../../utils/datasourceDisplay';
import { ChatFailureCard } from './ChatFailureCard';
import { getWorkflowFailure, formatChatRequestError } from '../../utils/chatWorkflowStatus';
import type { WorkflowFailureInfo } from '../../utils/chatWorkflowStatus';
import { DatasourceConnectionPanel } from '../layout/DatasourceConnectionPanel';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useDatasource } from '../../context/DatasourceContext';
import { useChatSession } from '../../context/ChatSessionContext';
import { useAuth } from '../../context/useAuth';
import { useMessages } from '../../hooks/useApiData';
import { useChatRun } from '../../hooks/useChatRun';
import { apiClient } from '../../services/apiClient';
import type { AssistantTurnResponse, ChatMessageMetadata, ChatMessageRead } from '../../types/api';
import { getAskPromptsFromArtifacts } from '../../utils/artifactAdapters';
import { MarkdownText } from '../MarkdownText';
import { CopyTextButton } from './CopyTextButton';
import { readComposerDraft, writeComposerDraft } from '../../lib/uiMemory';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'widget' | 'chart';
  widgetType?: 'connector' | 'scheduler';
  data?: unknown;
  metadata?: ChatMessageMetadata | Record<string, unknown>;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  failure?: WorkflowFailureInfo;
  retryPrompt?: string;
}

export function GenerativeChat({ workspaceId: workspaceIdProp }: { workspaceId?: string }) {
  const { id: workspaceIdParam } = useParams<{ id: string }>();
  const workspaceId = workspaceIdProp ?? workspaceIdParam ?? '';
  const { user } = useAuth();
  const {
    datasources,
    connectors,
    currentWorkspace,
    loading: workspaceLoading,
    saveWorkspaceState,
    refreshConnectors,
    refreshWorkspaces,
    invalidateContextCache,
    loadWorkspaceContext,
  } = useWorkspace();
  const { selectedDatasourceId, setSelectedDatasourceId } = useDatasource();
  const { activeSessionId, setActiveSessionId, addSession, isNewChatDraft } = useChatSession();

  const {
    messages: apiMessages,
    loading: loadingHistory,
    refetch: refetchMessages,
  } = useMessages(activeSessionId);

  const [showConnectionPanel, setShowConnectionPanel] = useState(false);
  const [headerRefreshing, setHeaderRefreshing] = useState(false);

  const schemaTableCount = useMemo(
    () => countSchemaTables(selectedDatasourceId, datasources, connectors),
    [selectedDatasourceId, datasources, connectors],
  );

  const userInitial = useMemo(() => {
    const name = user?.displayName?.trim() || user?.email?.split('@')[0] || 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }
    return (parts[0]?.[0] ?? 'U').toUpperCase();
  }, [user?.displayName, user?.email]);

  const handleHeaderRefresh = useCallback(async () => {
    setHeaderRefreshing(true);
    try {
      await Promise.all([refreshWorkspaces(), refreshConnectors()]);
      if (currentWorkspace?.id) {
        await loadWorkspaceContext(currentWorkspace.id, true);
      }
    } finally {
      setHeaderRefreshing(false);
    }
  }, [refreshWorkspaces, refreshConnectors, loadWorkspaceContext, currentWorkspace?.id]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    // Avoid PATCH /state with localStorage ids before datasource lists have loaded
    if (workspaceLoading && datasources.length === 0 && connectors.length === 0) return;
    // Do not wipe last_active_session_id during boot before session restore completes
    if (!activeSessionId && !isNewChatDraft) return;
    saveWorkspaceState(currentWorkspace.id, selectedDatasourceId, activeSessionId);
  }, [
    selectedDatasourceId,
    activeSessionId,
    currentWorkspace?.id,
    saveWorkspaceState,
    workspaceLoading,
    datasources.length,
    connectors.length,
    isNewChatDraft,
  ]);

  // If the selected source was deleted or removed from the workspace, fall back to General
  useEffect(() => {
    if (selectedDatasourceId === null || selectedDatasourceId === '') return;
    // While lists are still empty during bootstrap, do not clear (hydration may set selection first)
    if (datasources.length === 0 && connectors.length === 0) return;
    const inDatasources = datasources.some((d) => d.id === selectedDatasourceId);
    const inConnectors = connectors.some((c) => c.id === selectedDatasourceId);
    if (!inDatasources && !inConnectors) {
      setSelectedDatasourceId(null);
    }
  }, [datasources, connectors, selectedDatasourceId, setSelectedDatasourceId]);

  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [draftHydrated, setDraftHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Composer draft persistence (per session / new-chat)
  useEffect(() => {
    if (!user?.uid) {
      setInput('');
      setDraftHydrated(false);
      return;
    }
    setInput(readComposerDraft(user.uid, activeSessionId));
    setDraftHydrated(true);
  }, [user?.uid, activeSessionId]);

  useEffect(() => {
    if (!draftHydrated || !user?.uid) return;
    writeComposerDraft(user.uid, activeSessionId, input);
  }, [draftHydrated, user?.uid, activeSessionId, input]);

  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current;
    const end = messagesEndRef.current;
    const apply = () => {
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      end?.scrollIntoView({ block: 'end', behavior: 'instant' });
    };
    apply();
    requestAnimationFrame(apply);
  }, []);

  // Sync API messages to local state
  useEffect(() => {
    if (apiMessages && apiMessages.length > 0) {
      const mapped: Message[] = apiMessages.map((m: ChatMessageRead) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.message_metadata,
        timestamp: new Date(m.created_at),
        status: 'sent',
      }));
      // Sort by timestamp ascending for display
      setLocalMessages(mapped.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
    } else if (!loadingHistory) {
      if (activeSessionId) {
        const welcome: Message = {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hello! I'm your AI Data Assistant. To get started, select a data source from the dropdown below or just start typing for a general conversation.",
          timestamp: new Date(),
        };
        setLocalMessages((prev) => {
          const hasRealThread = prev.some(
            (m) => m.role === 'user' || (m.role === 'assistant' && m.id !== 'welcome'),
          );
          if (hasRealThread) return prev;
          return [welcome];
        });
      } else {
        setLocalMessages([]);
      }
    }
  }, [apiMessages, loadingHistory, activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) {
      setLocalMessages([]);
    }
  }, [activeSessionId]);

  const ensureSession = useCallback(
    async (prompt: string, datasourceId: string | null) => {
      if (!user) throw new Error('Not signed in');
      const token = await user.getIdToken();
      const newSession = await apiClient.createWorkspaceSession(
        token,
        workspaceId,
        prompt.slice(0, 30),
        datasourceId || undefined,
      );
      addSession(newSession);
      setActiveSessionId(newSession.id);
      return newSession.id;
    },
    [user, workspaceId, addSession, setActiveSessionId],
  );

  const applyAssistantTurn = useCallback((response: AssistantTurnResponse, prompt: string) => {
    const workflowFailure = getWorkflowFailure(response);
    const turnMeta: ChatMessageMetadata = {
      artifacts: response.artifacts ?? [],
      meta: response.meta ?? {},
    };
    const assistantMessage: Message = workflowFailure
      ? {
          id: response.message_id || (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.text || workflowFailure.detail,
          metadata: turnMeta,
          failure: workflowFailure,
          retryPrompt: prompt,
          timestamp: new Date(),
          status: 'sent',
        }
      : {
          id: response.message_id || (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.text || "I've analyzed the data.",
          metadata: turnMeta,
          timestamp: new Date(),
          status: 'sent',
        };

    setLocalMessages((prev) => {
      const withoutFailureTail = workflowFailure
        ? prev.filter((m, i, arr) => {
            if (i !== arr.length - 1) return true;
            return !(m.role === 'assistant' && m.failure);
          })
        : prev;
      const updated = withoutFailureTail.map((m) => {
        if (m.role === 'user' && m.content === prompt) {
          return { ...m, status: 'sent' as const };
        }
        return m;
      });
      return [...updated, assistantMessage];
    });

    if (workflowFailure) {
      toast.error(workflowFailure.title);
    }
  }, []);

  const applyTurnFailure = useCallback((err: unknown, prompt: string) => {
    console.error('Failed to send message:', err);
    const failure = formatChatRequestError(err);
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: failure.detail,
      failure,
      retryPrompt: prompt,
      timestamp: new Date(),
    };
    setLocalMessages((prev) => {
      const updated = prev.map((m) => {
        if (m.role === 'user' && m.content === prompt) {
          return { ...m, status: 'error' as const };
        }
        return m;
      });
      return [...updated, errorMessage];
    });
    toast.error(failure.title);
  }, []);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Not signed in');
    return user.getIdToken();
  }, [user]);

  const {
    isWaiting,
    pendingPrompt,
    partialText,
    shimmerPhrases,
    send: sendRun,
    cancel: cancelRun,
  } = useChatRun({
    uid: user?.uid,
    sessionId: activeSessionId,
    workspaceId,
    selectedDatasourceId,
    getToken,
    ensureSession,
    restoreSessionId: setActiveSessionId,
    onComplete: applyAssistantTurn,
    onFailure: applyTurnFailure,
    refetchMessages: async () => {
      await refetchMessages();
    },
    historyReady: !loadingHistory,
  });

  // Restore optimistic user bubble when resuming a pending turn after refresh
  useEffect(() => {
    if (!isWaiting || !pendingPrompt) return;
    setLocalMessages((prev) => {
      const exists = prev.some(
        (m) => m.role === 'user' && m.content.trim() === pendingPrompt.trim(),
      );
      if (exists) {
        return prev.map((m) =>
          m.role === 'user' && m.content.trim() === pendingPrompt.trim()
            ? { ...m, status: 'sending' as const }
            : m,
        );
      }
      return [
        ...prev.filter((m) => m.id !== 'welcome'),
        {
          id: `pending-user-${Date.now()}`,
          role: 'user',
          content: pendingPrompt,
          timestamp: new Date(),
          status: 'sending',
        },
      ];
    });
  }, [isWaiting, pendingPrompt]);

  useLayoutEffect(() => {
    if (loadingHistory) return;
    scrollToBottom();
  }, [localMessages, isWaiting, loadingHistory, activeSessionId, scrollToBottom, partialText]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || loadingHistory) return;
    const content = container.firstElementChild;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < 160) {
        scrollToBottom();
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [loadingHistory, activeSessionId, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string, options?: { skipUserMessage?: boolean; bypassWaitingGuard?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || !user) return;
      if (isWaiting && !options?.bypassWaitingGuard) return;

      const userMessageId = Date.now().toString();
      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
        status: 'sending',
      };

      if (options?.skipUserMessage) {
        setLocalMessages((prev) => {
          const lastUser = [...prev].reverse().find((m) => m.role === 'user');
          if (!lastUser) return [...prev, userMessage];
          return prev.map((m) => (m.id === lastUser.id ? { ...m, status: 'sending' as const } : m));
        });
      } else {
        setLocalMessages((prev) => [...prev, userMessage]);
      }

      if (user.uid) {
        writeComposerDraft(user.uid, activeSessionId, '');
      }
      setInput('');

      await sendRun(trimmed, {
        skipUserMessage: options?.skipUserMessage,
        bypassWaitingGuard: options?.bypassWaitingGuard,
      });
    },
    [user, isWaiting, sendRun, activeSessionId],
  );

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input.trim();
    void sendMessage(text);
  };

  const handleWelcomePrompt = (prompt: string) => {
    setInput(prompt);
    void sendMessage(prompt);
  };

  const showWelcomeScreen = useMemo(() => {
    if (activeSessionId) return false;
    if (loadingHistory) return false;
    if ((apiMessages?.length ?? 0) > 0) return false;
    if (isWaiting) return false;
    return localMessages.length === 0;
  }, [activeSessionId, loadingHistory, apiMessages, localMessages, isWaiting]);

  const latestAssistantWithSuggestionsId = useMemo(() => {
    for (let i = localMessages.length - 1; i >= 0; i--) {
      const m = localMessages[i];
      if (m.role !== 'assistant' || m.id === 'welcome') continue;
      const meta = m.metadata as ChatMessageMetadata | undefined;
      const prompts = getAskPromptsFromArtifacts(meta?.artifacts ?? []);
      return prompts.length ? m.id : null;
    }
    return null;
  }, [localMessages]);

  const handleConnectorSelect = (connectorId: string) => {
    setInput(`I want to connect ${connectorId}`);
  };

  return (
    <div className="chat-container chat-container--enterprise relative z-0 flex min-h-0 flex-1 flex-col font-sans">
      {workspaceId ? (
        <ChatWorkspaceHeader
          workspaceId={workspaceId}
          selectedDatasourceId={selectedDatasourceId}
          datasources={datasources}
          connectors={connectors}
          onRefresh={() => void handleHeaderRefresh()}
          refreshing={headerRefreshing}
        />
      ) : null}

      <div
        ref={scrollRef}
        className="analytics-page flex-1 overflow-y-auto px-2 py-4 sm:px-4 md:px-6 lg:px-10 space-y-6 md:space-y-8"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:max-w-7xl md:gap-8">
          {showWelcomeScreen ? (
            <ChatWelcome
              onPromptClick={handleWelcomePrompt}
              schemaTableCount={schemaTableCount ?? undefined}
              disabled={isWaiting}
            />
          ) : null}
          <AnimatePresence initial={false}>
            {localMessages
              .filter((msg) => msg.id !== 'welcome')
              .map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'flex w-full',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {msg.role === 'user' ? (
                    <div className="chat-message-width--user user-request">
                      <div className="user-request__body">
                        <div className="user-request__bubble">
                          <p className="user-request__text">{msg.content}</p>
                        </div>
                        <div className="user-request__avatar" aria-hidden="true">
                          {userInitial}
                        </div>
                      </div>
                      <div className="user-request__header">
                        <CopyTextButton text={msg.content} label="prompt" />
                        <span className="user-request__time">
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {msg.status === 'sending' ? ' · Sending' : null}
                          {msg.status === 'error' ? ' · Failed' : null}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="chat-message-width--assistant flex flex-col gap-3">
                      {msg.failure ? (
                        <ChatFailureCard
                          title={msg.failure.title}
                          detail={msg.failure.detail}
                          canRetry={msg.failure.canRetry}
                          disabled={isWaiting}
                          onRetry={
                            msg.retryPrompt
                              ? () => {
                                  setLocalMessages((prev) =>
                                    prev.filter(
                                      (m, i, arr) =>
                                        !(
                                          i === arr.length - 1 &&
                                          m.role === 'assistant' &&
                                          m.failure
                                        ),
                                    ),
                                  );
                                  void sendMessage(msg.retryPrompt!, { skipUserMessage: true });
                                }
                              : undefined
                          }
                        />
                      ) : null}

                      {!msg.failure && msg.metadata ? (
                        (() => {
                          const meta = msg.metadata as ChatMessageMetadata;
                          if (turnHasRichUi(meta)) {
                            return (
                              <AssistantAnalysisCard
                                key={msg.id}
                                text={msg.content}
                                artifacts={meta.artifacts ?? []}
                                meta={meta.meta}
                                timestamp={msg.timestamp}
                                onAsk={(prompt) => void sendMessage(prompt)}
                                disabled={isWaiting}
                              />
                            );
                          }
                          return (
                            <>
                              {msg.content ? (
                                <div className="message-plain message-plain--assistant leading-relaxed">
                                  <div className="message-plain__toolbar">
                                    <CopyTextButton text={msg.content} label="response" />
                                  </div>
                                  <MarkdownText>{msg.content}</MarkdownText>
                                </div>
                              ) : null}
                              <ChartVisualization artifacts={meta.artifacts ?? []} />
                            </>
                          );
                        })()
                      ) : !msg.failure ? (
                        msg.content ? (
                          <div className="message-plain message-plain--assistant leading-relaxed">
                            <div className="message-plain__toolbar">
                              <CopyTextButton text={msg.content} label="response" />
                            </div>
                            <MarkdownText>{msg.content}</MarkdownText>
                          </div>
                        ) : null
                      ) : null}

                      {msg.type === 'widget' && msg.widgetType === 'connector' ? (
                        <div className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--panel-bg)] p-1">
                          <ConnectorWidget onSelect={handleConnectorSelect} />
                        </div>
                      ) : null}

                      {msg.role === 'assistant' &&
                        !msg.failure &&
                        msg.id === latestAssistantWithSuggestionsId &&
                        (() => {
                          const meta = msg.metadata as ChatMessageMetadata | undefined;
                          const suggested = getAskPromptsFromArtifacts(meta?.artifacts ?? []);
                          if (!suggested.length) return null;
                          return (
                            <SuggestedPrompts
                              prompts={suggested}
                              onSelect={(prompt) => void sendMessage(prompt)}
                              disabled={isWaiting}
                            />
                          );
                        })()}
                    </div>
                  )}
                </motion.div>
              ))}
          </AnimatePresence>
          {isWaiting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="chat-message-width--assistant message-plain message-plain--assistant flex flex-col gap-2">
                {partialText ? (
                  <div className="leading-relaxed opacity-80">
                    <MarkdownText>{partialText}</MarkdownText>
                  </div>
                ) : null}
                <ThinkingShimmer phrases={shimmerPhrases} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-px w-full shrink-0" aria-hidden />
        </div>
      </div>

      {/* Input Area — solid shell in dark mode; dropdown portals above */}
      <div className="chat-composer-dock relative z-30 shrink-0 overflow-visible p-4 md:p-6">
        <div className="relative mx-auto w-full max-w-6xl md:max-w-7xl">
          {!selectedDatasourceId && localMessages.length > 1 && (
            <div className="mb-4 flex justify-center">
              <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                Tip: Select a database for deep analysis
              </div>
            </div>
          )}
          {workspaceId ? (
            <ChatComposer
              workspaceId={workspaceId}
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              isWaiting={isWaiting}
              onStop={() => void cancelRun()}
              disabled={false}
              datasources={datasources}
              connectors={connectors}
              selectedDatasourceId={selectedDatasourceId}
              onDatasourceChange={setSelectedDatasourceId}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center">Missing workspace context</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mx-auto mt-4 flex max-w-6xl items-center gap-4 overflow-x-auto no-scrollbar md:max-w-7xl">
          <button
            type="button"
            className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--ds-surface-muted)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-muted)] transition-colors hover:text-primary"
            onClick={() => setShowConnectionPanel(true)}
          >
            <Database className="w-3.5 h-3.5" />
            Connect datasource
          </button>
          <p className="hidden sm:block text-[10px] text-[color:var(--text-muted)] ml-auto">
            Powered by Beleh Analytical Engine v0.1.0
            <span className="hidden md:inline"> // compliance guidelines applied</span>
          </p>
          {schemaTableCount != null ? (
            <p className="text-[10px] font-mono text-[color:var(--text-muted)]">
              Schema: {schemaTableCount} columns connected
            </p>
          ) : selectedDatasourceId ? (
            <p className="text-[10px] font-mono text-[color:var(--text-muted)]">
              Schema: connected
            </p>
          ) : null}
        </div>
      </div>

      {showConnectionPanel && workspaceId && (
        <DatasourceConnectionPanel
          workspaceId={workspaceId}
          hideFileSources
          onClose={() => setShowConnectionPanel(false)}
          onSuccess={async () => {
            const wid = currentWorkspace?.id;
            if (wid) {
              try {
                await refreshConnectors();
                invalidateContextCache(wid);
                await loadWorkspaceContext(wid, true);
              } catch {
                await refreshConnectors();
              }
            }
            toast.success('Datasource connected successfully.');
          }}
        />
      )}
    </div>
  );
}

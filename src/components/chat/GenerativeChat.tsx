import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Database, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectorWidget } from './ConnectorWidget';
import { ChatComposer } from './ChatComposer';
import { ChartVisualization } from './ChartVisualization';
import { ConnectorSelectionModal } from '../layout/ConnectorSelectionModal';
import { PostgresConnectorModal } from '../layout/PostgresConnectorModal';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useDatasource } from '../../context/DatasourceContext';
import { useChatSession } from '../../context/ChatSessionContext';
import { useAuth } from '../../context/useAuth';
import { useMessages } from '../../hooks/useApiData';
import { apiClient } from '../../services/apiClient';
import type { ChatMessageRead, ChatWorkflowResponse } from '../../types/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'widget' | 'chart';
  widgetType?: 'connector' | 'scheduler';
  data?: any;
  metadata?: any;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export function GenerativeChat({ workspaceId: workspaceIdProp }: { workspaceId?: string }) {
  const { id: workspaceIdParam } = useParams<{ id: string }>();
  const workspaceId = workspaceIdProp ?? workspaceIdParam ?? '';
  const { user } = useAuth();
  const {
    datasources,
    connectors,
    currentWorkspace,
    saveWorkspaceState,
    refreshConnectors,
    invalidateContextCache,
    loadWorkspaceContext,
  } = useWorkspace();
  const { selectedDatasourceId, setSelectedDatasourceId } = useDatasource();
  const { activeSessionId, setActiveSessionId, addSession, sessions: availableSessions } = useChatSession();

  const { messages: apiMessages, loading: loadingHistory, refetch: refetchMessages } = useMessages(activeSessionId);

  const [showConnectorSelectionModal, setShowConnectorSelectionModal] = useState(false);
  const [showPostgresModal, setShowPostgresModal] = useState(false);

  // Sync datasource from the active session when the user switches sessions in the sidebar.
  // On initial page load, do not overwrite a persisted workspace datasource with a "general" session (null dataset).
  const lastSessionDatasourceSyncRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeSessionId) {
      lastSessionDatasourceSyncRef.current = null;
      return;
    }
    if (availableSessions.length === 0) return;

    const currentSession = availableSessions.find((s) => s.id === activeSessionId);
    if (!currentSession) return;

    if (lastSessionDatasourceSyncRef.current === activeSessionId) {
      return;
    }

    const sessionSourceId =
      currentSession.dataset_id ?? (currentSession as { connector_id?: string | null }).connector_id ?? null;

    const switchingFromAnotherSession =
      lastSessionDatasourceSyncRef.current !== null &&
      lastSessionDatasourceSyncRef.current !== activeSessionId;

    if (switchingFromAnotherSession) {
      lastSessionDatasourceSyncRef.current = activeSessionId;
      setSelectedDatasourceId(sessionSourceId ?? null);
      return;
    }

    lastSessionDatasourceSyncRef.current = activeSessionId;
    if (sessionSourceId != null && sessionSourceId !== '') {
      setSelectedDatasourceId(sessionSourceId);
    }
  }, [activeSessionId, availableSessions, setSelectedDatasourceId]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    saveWorkspaceState(currentWorkspace.id, selectedDatasourceId, activeSessionId);
  }, [selectedDatasourceId, activeSessionId, currentWorkspace?.id, saveWorkspaceState]);

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
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync API messages to local state
  useEffect(() => {
    if (apiMessages && apiMessages.length > 0) {
      const mapped: Message[] = apiMessages.map((m: ChatMessageRead) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.message_metadata,
        timestamp: new Date(m.created_at),
        status: 'sent'
      }));
      // Sort by timestamp ascending for display
      setLocalMessages(mapped.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
    } else if (!loadingHistory) {
      const welcome: Message = {
        id: 'welcome',
        role: 'assistant',
        content:
          "Hello! I'm your AI Data Assistant. To get started, select a data source from the dropdown below or just start typing for a general conversation.",
        timestamp: new Date(),
      };
      // With an active session, avoid replacing optimistic/live thread with welcome when history is briefly empty (cache/refetch race).
      if (activeSessionId) {
        setLocalMessages((prev) => {
          const hasRealThread = prev.some(
            (m) => m.role === 'user' || (m.role === 'assistant' && m.id !== 'welcome')
          );
          if (hasRealThread) return prev;
          return [welcome];
        });
      } else {
        setLocalMessages([welcome]);
      }
    }
  }, [apiMessages, loadingHistory, activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;
    const text = input.trim();

    // 1. Show user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      status: 'sending'
    };

    setLocalMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = await user.getIdToken();
      let sessionId = activeSessionId;

      // 2. Create session if none exists
      if (!sessionId) {
        const newSession = await apiClient.createWorkspaceSession(
          token, 
          workspaceId, 
          text.slice(0, 30), 
          selectedDatasourceId || undefined
        );
        addSession(newSession);
        setActiveSessionId(newSession.id);
        sessionId = newSession.id;
      }

      // 3. Send message to backend
      const response = await apiClient.addMessageToSession(
        token,
        sessionId!,
        text,
        selectedDatasourceId || null // Ensure null is sent for "General" mode, not empty string
      );

      // 4. Update UI with AI response
      const assistantMessage: Message = {
        id: response.message_id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.insight?.summary || "I've analyzed the data.",
        metadata: {
            intent: response.intent,
            execution: response.execution,
            visualization: response.visualization,
            insight: response.insight
        },
        timestamp: new Date(),
        status: 'sent'
      };

      setLocalMessages((prev) => {
          // Update the user message status to 'sent' and add assistant message
          const updated = prev.map(m => m.id === userMessage.id ? { ...m, status: 'sent' as const } : m);
          return [...updated, assistantMessage];
      });

    } catch (err: any) {
      console.error('Failed to send message:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setLocalMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      void refetchMessages();
    }
  };

  const handleConnectorSelect = (connectorId: string) => {
    setInput(`I want to connect ${connectorId}`);
    // Focus or trigger send manually if desired
  };

  return (
    <div className="chat-container relative z-0 font-sans">
      {/* Messages Stream */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-4 sm:px-4 md:px-6 lg:px-10 space-y-6 md:space-y-8 scroll-smooth"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:max-w-7xl md:gap-8">
          <AnimatePresence initial={false}>
            {localMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex w-full",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "message-bubble group",
                  msg.role === 'user' ? "message-user" : "message-assistant"
                )}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2 text-[10px] font-bold tracking-widest text-primary uppercase">
                      <Sparkles className="w-3 h-3" />
                      AI Analyst
                    </div>
                  )}
                  <div className="leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  
                  {msg.metadata && (
                    <div className="mt-4 border-t border-[color:var(--ds-border-subtle)] pt-4">
                        <ChartVisualization response={msg.metadata as ChatWorkflowResponse} />
                    </div>
                  )}

                  {msg.type === 'widget' && msg.widgetType === 'connector' && (
                    <div className="mt-4 rounded-xl border border-[color:var(--ds-border-subtle)] bg-[color:var(--ds-surface-muted)] p-1">
                        <ConnectorWidget onSelect={handleConnectorSelect} />
                    </div>
                  )}

                  <div className={cn(
                    "mt-2 text-[9px] font-medium uppercase tracking-tighter opacity-40 group-hover:opacity-70 transition-opacity",
                    msg.role === 'user' ? "text-right" : "text-left"
                  )}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.status === 'sending' && " • Sending"}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="message-bubble message-assistant flex items-center gap-3 py-3.5">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-[color:var(--text-muted)] animate-pulse">Processing analysis...</span>
              </div>
            </motion.div>
          )}
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
              disabled={isLoading}
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
            onClick={() => setShowConnectorSelectionModal(true)}
          >
            <Database className="w-3.5 h-3.5" />
            Connect datasource
          </button>
          <div className="hidden md:block w-px h-3 bg-border/60 mx-1" />
          <p className="hidden md:block text-[9px] text-muted-foreground/60 font-black uppercase tracking-[0.2em] ml-auto">
            Analytical Engine v2.0
          </p>
        </div>
      </div>

      {showConnectorSelectionModal && (
        <ConnectorSelectionModal
          hideFileSources
          onClose={() => setShowConnectorSelectionModal(false)}
          onSelect={(type) => {
            setShowConnectorSelectionModal(false);
            if (type === 'postgres') {
              setShowPostgresModal(true);
            }
          }}
        />
      )}

      {showPostgresModal && workspaceId && (
        <PostgresConnectorModal
          workspaceId={workspaceId}
          onClose={() => setShowPostgresModal(false)}
          onSuccess={async () => {
            setShowPostgresModal(false);
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
            toast.success('PostgreSQL connector added successfully.');
          }}
        />
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectorWidget } from './ConnectorWidget';
import { ChatComposer } from './ChatComposer';
import { AssistantAnalysisCard } from './AssistantAnalysisCard';
import { ChartVisualization } from './ChartVisualization';
import { SuggestedPrompts } from './SuggestedPrompts';
import { ChatWelcome } from './ChatWelcome';
import { ChatThreadSkeleton } from './ChatThreadSkeleton';
import { ThinkingShimmer } from './ThinkingShimmer';
import { turnHasRichUi } from '../../utils/responseViewAvailability';
import { countSchemaTables } from '../../utils/datasourceDisplay';
import { ChatFailureCard } from './ChatFailureCard';
import { getWorkflowFailure, formatChatRequestError } from '../../utils/chatWorkflowStatus';
import type { WorkflowFailureInfo } from '../../utils/chatWorkflowStatus';
import { BI_CHAT_MAX_CHARS } from '../../constants/chatLimits';
import { DatasourceConnectionPanel } from '../layout/DatasourceConnectionPanel';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useDatasource } from '../../context/DatasourceContext';
import { useChatSession } from '../../context/ChatSessionContext';
import { useAuth } from '../../context/useAuth';
import { useMessages } from '../../hooks/useApiData';
import { useChatRun } from '../../hooks/useChatRun';
import { apiClient } from '../../services/apiClient';
import { ApiRequestError, isQuotaExceededError } from '../../utils/apiErrorMessage';
import { formatQuotaExceededAction, formatQuotaExceededMessage } from '../../utils/quotaExceededUi';
import { formatQuotaResetAt } from '../../utils/formatters';
import {
  BILLING_UPGRADE_HREF,
  canSendChat,
  canShowWorkspaceUpgradeCta,
  getChatQuotaBlockReason,
  isDatasourcesAtLimit,
  isUsageSoftWarn,
  normalizeBillingUpgradeHref,
  PLAN_LIMIT_REACHED_TOOLTIP,
  PLAN_MANAGED_BY_OWNER_COPY,
  workspaceLimitUpgradeMessage,
} from '../../utils/workspaceAccess';
import type {
  AssistantTurnResponse,
  ChatMessageMetadata,
  ChatMessageRead,
  WorkspaceDemoStatus,
} from '../../types/api';
import { getAskPromptsFromArtifacts } from '../../utils/artifactAdapters';
import { MarkdownText } from '../MarkdownText';
import { CopyTextButton } from './CopyTextButton';
import { readComposerDraft, writeComposerDraft } from '../../lib/uiMemory';
import { shuffleArray } from '../../lib/shuffleArray';
import {
  canShowDemoOnboardingCta,
  connectAndWaitReady,
  copyFromDemoStatus,
  findDemoDatasource,
  formatDemoConnectError,
  leaveWorkspaceDemo,
  persistDemoCopy,
  readDemoCopy,
  type DemoOnboardingCopy,
} from '../../lib/workspaceDemo';
import { resolveDemoSuggestedPrompts } from './ChatWelcome';

const CLARIFY_SOURCE_RE =
  /\b(which|what|select|choose|pick|specify|clarify).{0,40}\b(source|dataset|database|datasource|connector|table)\b|\b(source|dataset|database|datasource).{0,20}\b(which|clarify|specify)\b/i;

function looksLikeClarifySource(text: string): boolean {
  return CLARIFY_SOURCE_RE.test(text);
}

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
    workspaceContext,
    workspaceUsage,
    currentRole,
    loading: workspaceLoading,
    saveWorkspaceState,
    refreshConnectors,
    refreshDatasources,
    refreshWorkspaceUsage,
    invalidateContextCache,
    loadWorkspaceContext,
  } = useWorkspace();
  const { selectedDatasourceId, setSelectedDatasourceId } = useDatasource();
  const {
    activeSessionId,
    setActiveSessionId,
    addSession,
    touchSession,
    isNewChatDraft,
    sessionsReady,
    sessions,
  } = useChatSession();
  const [sourcePickerOpenRequest, setSourcePickerOpenRequest] = useState(0);
  const softNudgeKeyRef = useRef<string | null>(null);
  const [demoStatus, setDemoStatus] = useState<WorkspaceDemoStatus | null>(null);
  const [demoCopy, setDemoCopy] = useState<DemoOnboardingCopy | null>(null);
  const [demoConnecting, setDemoConnecting] = useState(false);
  const [demoStatusLoading, setDemoStatusLoading] = useState(false);
  /** Sample prompts the user already sent — excluded from later previews. */
  const [usedDemoPrompts, setUsedDemoPrompts] = useState<string[]>([]);

  const chatBlockReason = getChatQuotaBlockReason(workspaceUsage);
  const chatQuotaBlocked = !canSendChat(workspaceUsage);
  const isFreePlanUser = (workspaceUsage?.plan_tier ?? '').toLowerCase() === 'free';
  const hasWorkspaceSources = datasources.length > 0 || connectors.length > 0;
  /** Free plan: chat stays locked until a live source or sample demo is connected. */
  const sourceRequiredForChat = isFreePlanUser && !workspaceLoading && !hasWorkspaceSources;
  const showUpgrade = canShowWorkspaceUpgradeCta(currentRole);
  /** Always land on billing plans grid (query + hash) — do not use backend upgrade_url for in-app CTA. */
  const billingUpgradeHref = BILLING_UPGRADE_HREF;
  const upgradeHref = normalizeBillingUpgradeHref(
    workspaceUsage?.upgrade_url?.trim() || billingUpgradeHref,
  );
  const dailyResetLabel = formatQuotaResetAt(workspaceUsage?.daily_reset_at);

  const chatLockBanner = useMemo(() => {
    if (!chatBlockReason) return null;
    if (chatBlockReason === 'daily_credits') {
      return {
        message: dailyResetLabel
          ? `Daily limit reached , resets at ${dailyResetLabel}.`
          : 'Daily credit limit reached. Try again after the daily reset.',
        showUpgradeCta: false,
      };
    }
    if (chatBlockReason === 'plan_expired' || chatBlockReason === 'trial_ended') {
      return {
        message: showUpgrade
          ? 'Your free trial has ended. Upgrade to continue analyzing with AI.'
          : PLAN_MANAGED_BY_OWNER_COPY,
        showUpgradeCta: showUpgrade,
      };
    }
    return {
      message: showUpgrade
        ? 'This workspace has reached its credit quota.'
        : PLAN_MANAGED_BY_OWNER_COPY,
      showUpgradeCta: showUpgrade,
    };
  }, [chatBlockReason, dailyResetLabel, showUpgrade]);

  const {
    messages: apiMessages,
    loading: loadingHistory,
    error: messagesError,
    refetch: refetchMessages,
  } = useMessages(activeSessionId);

  // Invalid / foreign / deleted session , clear active id (URL hydrate strips ?session=).
  useEffect(() => {
    if (!messagesError || !activeSessionId) return;
    const status = messagesError instanceof ApiRequestError ? messagesError.status : undefined;
    if (status !== 404 && status !== 403) return;

    console.warn('[GenerativeChat] Session messages unavailable, clearing active session.', status);
    setActiveSessionId(null);
    if (currentWorkspace?.id) {
      void saveWorkspaceState(currentWorkspace.id, selectedDatasourceId, null);
    }
    toast.error('That chat is unavailable. Starting a new conversation.');
  }, [
    messagesError,
    activeSessionId,
    setActiveSessionId,
    currentWorkspace?.id,
    selectedDatasourceId,
    saveWorkspaceState,
  ]);

  const [showConnectionPanel, setShowConnectionPanel] = useState(false);

  const refreshDemoStatus = useCallback(async () => {
    if (!user || !workspaceId) {
      setDemoStatus(null);
      return;
    }
    setDemoStatusLoading(true);
    try {
      const token = await user.getIdToken();
      const status = await apiClient.getWorkspaceDemo(token, workspaceId);
      setDemoStatus(status);
      const fromApi = copyFromDemoStatus(status);
      const cached = readDemoCopy(workspaceId);
      if (fromApi) {
        const merged: DemoOnboardingCopy = {
          headline: fromApi.headline,
          message: fromApi.message,
          suggested_prompts:
            fromApi.suggested_prompts.length > 0
              ? fromApi.suggested_prompts
              : (cached?.suggested_prompts ?? []),
        };
        setDemoCopy(merged);
        persistDemoCopy(workspaceId, merged);
      } else if (status.connected && cached) {
        setDemoCopy(cached);
      } else if (status.connected) {
        setDemoCopy({
          headline: 'Explore sample data',
          message: 'Ask questions about the sample dataset.',
          suggested_prompts: [],
        });
      } else {
        setDemoCopy(null);
      }
    } catch (err) {
      console.warn('[Demo] Failed to load demo status:', err);
      setDemoStatus(null);
    } finally {
      setDemoStatusLoading(false);
    }
  }, [user, workspaceId]);

  useEffect(() => {
    void refreshDemoStatus();
  }, [refreshDemoStatus]);

  const showDemoCta = canShowDemoOnboardingCta({
    demoStatus,
    datasources,
    connectors,
    usage: workspaceUsage,
  });

  const handleStartDemo = useCallback(async () => {
    if (!user || !workspaceId || demoConnecting) return;
    if (isDatasourcesAtLimit(workspaceUsage)) {
      toast.error(workspaceLimitUpgradeMessage(currentRole, 'datasources'));
      return;
    }

    setDemoConnecting(true);
    try {
      const token = await user.getIdToken();
      const result = await connectAndWaitReady(token, workspaceId, {
        usage: workspaceUsage,
      });
      // Prefer connect-response prompts immediately so chips render as soon as READY.
      setDemoCopy(result.copy);
      persistDemoCopy(workspaceId, result.copy);
      setSelectedDatasourceId(result.datasource.id);

      try {
        const session = await apiClient.createChatSession(
          token,
          result.datasource.id,
          `Chat: ${result.datasource.name || 'demo'}`,
        );
        addSession(session);
        setActiveSessionId(session.id);
        await saveWorkspaceState(workspaceId, result.datasource.id, session.id);
      } catch (sessionErr) {
        console.warn('[Demo] Session bind failed:', sessionErr);
        await saveWorkspaceState(workspaceId, result.datasource.id, null);
      }

      await Promise.all([refreshDatasources(), refreshWorkspaceUsage(), refreshDemoStatus()]);
      // refreshDemoStatus may overwrite copy; keep connect prompts if status omits them.
      setDemoCopy((prev) => {
        const prompts = prev?.suggested_prompts?.length
          ? prev.suggested_prompts
          : result.copy.suggested_prompts;
        const next = {
          headline: prev?.headline?.trim() || result.copy.headline,
          message: prev?.message?.trim() || result.copy.message,
          suggested_prompts: prompts,
        };
        persistDemoCopy(workspaceId, next);
        return next;
      });
      toast.success(result.already_connected ? 'Sample data ready.' : 'Sample data connected.');
    } catch (err) {
      if (isQuotaExceededError(err)) {
        const action = formatQuotaExceededAction(err.quota.limit_type, currentRole, {
          workspaceId,
          upgradeUrl: err.quota.upgrade_url,
        });
        toast.error(formatQuotaExceededMessage(err, currentRole), {
          action: action.showCta
            ? { label: action.label, onClick: () => window.location.assign(action.href) }
            : undefined,
        });
      } else {
        toast.error(formatDemoConnectError(err, currentRole));
      }
      void refreshDatasources();
      void refreshWorkspaceUsage();
      void refreshDemoStatus();
    } finally {
      setDemoConnecting(false);
    }
  }, [
    user,
    workspaceId,
    demoConnecting,
    workspaceUsage,
    currentRole,
    setSelectedDatasourceId,
    addSession,
    setActiveSessionId,
    saveWorkspaceState,
    refreshDatasources,
    refreshWorkspaceUsage,
    refreshDemoStatus,
  ]);

  const handleRemoveDemo = useCallback(async () => {
    if (!user || !workspaceId) return;
    try {
      const token = await user.getIdToken();
      const demoDs = findDemoDatasource(datasources);
      await leaveWorkspaceDemo(token, workspaceId);
      if (demoDs && selectedDatasourceId === demoDs.id) {
        setSelectedDatasourceId(null);
      }
      await Promise.all([refreshDatasources(), refreshWorkspaceUsage(), refreshDemoStatus()]);
      toast.success('Sample data removed.');
    } catch (err) {
      toast.error(formatDemoConnectError(err, currentRole));
    }
  }, [
    user,
    workspaceId,
    datasources,
    selectedDatasourceId,
    setSelectedDatasourceId,
    refreshDatasources,
    refreshWorkspaceUsage,
    refreshDemoStatus,
    currentRole,
  ]);

  const handleLiveSourceConnected = useCallback(async () => {
    const wid = currentWorkspace?.id ?? workspaceId;
    if (!user || !wid) return;
    const hadDemo = Boolean(demoStatus?.connected) || datasources.some((d) => Boolean(d.is_demo));
    const demoId = findDemoDatasource(datasources)?.id ?? null;
    const silent = { silent: true } as const;
    try {
      const token = await user.getIdToken();
      await Promise.all([refreshConnectors(silent), refreshDatasources(silent)]);
      if (hadDemo) {
        await leaveWorkspaceDemo(token, wid);
        if (demoId && selectedDatasourceId === demoId) {
          setSelectedDatasourceId(null);
        }
      }
      await Promise.all([refreshDatasources(silent), refreshWorkspaceUsage(), refreshDemoStatus()]);
      invalidateContextCache(wid);
      await loadWorkspaceContext(wid, true);
    } catch {
      await Promise.all([refreshConnectors(silent), refreshDatasources(silent)]);
    }
  }, [
    user,
    currentWorkspace?.id,
    workspaceId,
    demoStatus?.connected,
    datasources,
    selectedDatasourceId,
    setSelectedDatasourceId,
    refreshDatasources,
    refreshConnectors,
    refreshWorkspaceUsage,
    refreshDemoStatus,
    invalidateContextCache,
    loadWorkspaceContext,
  ]);

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
      // Empty sessions use ChatWelcome (incl. demo suggested_prompts chips).
      // Do not inject a placeholder assistant bubble that would compete with it.
      setLocalMessages((prev) => {
        const hasRealThread = prev.some(
          (m) => m.role === 'user' || (m.role === 'assistant' && m.id !== 'welcome'),
        );
        if (hasRealThread) return prev;
        return [];
      });
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

  const applyAssistantTurn = useCallback(
    (response: AssistantTurnResponse, prompt: string) => {
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
      } else if (looksLikeClarifySource(response.text || '')) {
        setSourcePickerOpenRequest((n) => n + 1);
      }

      if (activeSessionId) {
        touchSession(activeSessionId);
      }

      void refreshWorkspaceUsage().then((usage) => {
        if (!usage) return;
        const resetKey = usage.reset_at ?? usage.daily_reset_at ?? 'cycle';
        const nudgeKey = `${currentWorkspace?.id ?? workspaceId}:${resetKey}`;
        if (softNudgeKeyRef.current === nudgeKey) return;
        const creditsWarn = isUsageSoftWarn(usage.credits_used ?? 0, usage.credits_limit);
        const dailyWarn = isUsageSoftWarn(usage.daily_credits_used ?? 0, usage.daily_credits_limit);
        if (!creditsWarn && !dailyWarn) return;
        softNudgeKeyRef.current = nudgeKey;
        const which = dailyWarn && !creditsWarn ? 'daily' : 'period';
        toast.message(
          showUpgrade
            ? which === 'daily'
              ? "You have used over 80% of today's credit allowance."
              : "You have used over 80% of this workspace's credit quota."
            : which === 'daily'
              ? `You have used over 80% of today's credit allowance. ${PLAN_MANAGED_BY_OWNER_COPY}`
              : `You have used over 80% of this workspace's credit quota. ${PLAN_MANAGED_BY_OWNER_COPY}`,
          {
            action:
              showUpgrade && which === 'period'
                ? {
                    label: 'Upgrade',
                    onClick: () => {
                      window.location.assign(BILLING_UPGRADE_HREF);
                    },
                  }
                : undefined,
          },
        );
      });
    },
    [
      refreshWorkspaceUsage,
      currentWorkspace?.id,
      workspaceId,
      showUpgrade,
      activeSessionId,
      touchSession,
    ],
  );

  const applyTurnFailure = useCallback(
    (err: unknown, prompt: string) => {
      console.error('Failed to send message:', err);
      void refreshWorkspaceUsage();

      let failure = formatChatRequestError(err);
      if (isQuotaExceededError(err)) {
        const action = formatQuotaExceededAction(err.quota.limit_type, currentRole, {
          workspaceId,
          upgradeUrl: err.quota.upgrade_url ?? workspaceUsage?.upgrade_url,
          resetAt: err.quota.reset_at ?? workspaceUsage?.daily_reset_at,
        });
        failure = {
          ...failure,
          detail: formatQuotaExceededMessage(err, currentRole),
          upgradeHref: action.showCta ? action.href : upgradeHref,
          showUpgradeCta: action.showCta,
          canRetry: false,
        };
      }

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
    },
    [refreshWorkspaceUsage, currentRole, workspaceId, workspaceUsage, upgradeHref],
  );

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
      const trimmed = text.trim().slice(0, BI_CHAT_MAX_CHARS);
      if (!trimmed || !user) return;
      if (isWaiting && !options?.bypassWaitingGuard) return;
      if (!canSendChat(workspaceUsage)) {
        toast.error(chatLockBanner?.message ?? PLAN_LIMIT_REACHED_TOOLTIP);
        return;
      }
      if (
        (workspaceUsage?.plan_tier ?? '').toLowerCase() === 'free' &&
        datasources.length === 0 &&
        connectors.length === 0
      ) {
        toast.error('Connect your data or explore sample data to start chatting.');
        return;
      }

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
    [
      user,
      isWaiting,
      sendRun,
      activeSessionId,
      workspaceUsage,
      chatLockBanner?.message,
      datasources.length,
      connectors.length,
    ],
  );

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input.trim();
    void sendMessage(text);
  };

  const handleWelcomePrompt = (prompt: string) => {
    const trimmed = prompt.trim();
    if (trimmed) {
      setUsedDemoPrompts((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    }
    setInput(prompt);
    void sendMessage(prompt);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    const trimmed = prompt.trim();
    if (trimmed) {
      setUsedDemoPrompts((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    }
    void sendMessage(prompt);
  };

  // Empty active sessions (e.g. right after demo connect) still show ChatWelcome
  // so API suggested_prompts can be clicked as the first user message.
  // Gate until session list + restore + history settle so refresh never flashes welcome prompts.
  const lastActiveSessionId = workspaceContext?.state?.last_active_session_id ?? null;
  const awaitingSessionRestore =
    sessionsReady &&
    !isNewChatDraft &&
    !activeSessionId &&
    Boolean(lastActiveSessionId) &&
    lastActiveSessionId !== '1' &&
    lastActiveSessionId !== 'undefined' &&
    sessions.some((s) => s.id === lastActiveSessionId);

  const workspaceContextPending =
    Boolean(currentWorkspace?.id) &&
    (!workspaceContext || workspaceContext.workspace.id !== currentWorkspace?.id);

  const sessionBootstrapPending =
    !isNewChatDraft && (!sessionsReady || workspaceContextPending || awaitingSessionRestore);

  const historyPending =
    Boolean(activeSessionId) &&
    activeSessionId !== 'undefined' &&
    activeSessionId !== '1' &&
    loadingHistory;

  const chatBodyPending = sessionBootstrapPending || historyPending;

  const showWelcomeScreen = useMemo(() => {
    if (chatBodyPending) return false;
    if (isWaiting) return false;
    if ((apiMessages?.length ?? 0) > 0) return false;
    const hasRealThread = localMessages.some(
      (m) => m.id !== 'welcome' && (m.role === 'user' || m.role === 'assistant'),
    );
    return !hasRealThread;
  }, [chatBodyPending, isWaiting, apiMessages, localMessages]);

  const hasDatasources = hasWorkspaceSources;
  // Avoid flashing the empty-state CTA before the first datasource/connector fetch settles.
  const sourcesReady =
    !workspaceLoading &&
    (hasDatasources || workspaceContext?.workspace.id === currentWorkspace?.id);

  const selectedIsDemo = useMemo(() => {
    if (!selectedDatasourceId) return Boolean(demoStatus?.connected);
    const ds = datasources.find((d) => d.id === selectedDatasourceId);
    return (
      Boolean(ds?.is_demo) ||
      Boolean(demoStatus?.connected && demoStatus.datasource?.id === selectedDatasourceId)
    );
  }, [selectedDatasourceId, datasources, demoStatus]);

  const latestAssistantId = useMemo(() => {
    for (let i = localMessages.length - 1; i >= 0; i--) {
      const m = localMessages[i];
      if (m.role === 'assistant' && m.id !== 'welcome' && !m.failure) return m.id;
    }
    return null;
  }, [localMessages]);

  /** Sample-datasource follow-ups: reshuffle remaining (unused) prompts per assistant turn. */
  const demoPromptPool = useMemo(
    () => resolveDemoSuggestedPrompts(demoCopy?.suggested_prompts),
    [demoCopy?.suggested_prompts],
  );

  const shuffledDemoFollowUps = useMemo(() => {
    if (!selectedIsDemo || !latestAssistantId) return [];
    const used = new Set(usedDemoPrompts.map((p) => p.trim()));
    const remaining = demoPromptPool.filter((p) => !used.has(p.trim()));
    return shuffleArray(remaining);
    // latestAssistantId intentionally triggers a fresh shuffle per response
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reshuffle when turn or used set changes
  }, [selectedIsDemo, latestAssistantId, demoPromptPool, usedDemoPrompts]);

  const demoSuggestionsExhausted =
    selectedIsDemo &&
    Boolean(latestAssistantId) &&
    demoPromptPool.length > 0 &&
    shuffledDemoFollowUps.length === 0;

  // Keep used set in sync with user messages that match the sample prompt pool.
  useEffect(() => {
    if (!selectedIsDemo || demoPromptPool.length === 0) return;
    const pool = new Set(demoPromptPool.map((p) => p.trim()));
    const fromThread = localMessages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.trim())
      .filter((text) => pool.has(text));
    if (fromThread.length === 0) return;
    setUsedDemoPrompts((prev) => {
      let changed = false;
      const next = [...prev];
      for (const text of fromThread) {
        if (!next.includes(text)) {
          next.push(text);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedIsDemo, demoPromptPool, localMessages]);

  useEffect(() => {
    if (!selectedIsDemo) setUsedDemoPrompts([]);
  }, [selectedIsDemo]);

  const latestAssistantWithSuggestionsId = useMemo(() => {
    if (
      selectedIsDemo &&
      latestAssistantId &&
      (shuffledDemoFollowUps.length > 0 || demoSuggestionsExhausted)
    ) {
      return latestAssistantId;
    }
    for (let i = localMessages.length - 1; i >= 0; i--) {
      const m = localMessages[i];
      if (m.role !== 'assistant' || m.id === 'welcome' || m.failure) continue;
      const meta = m.metadata as ChatMessageMetadata | undefined;
      const prompts = getAskPromptsFromArtifacts(meta?.artifacts ?? []);
      return prompts.length ? m.id : null;
    }
    return null;
  }, [
    localMessages,
    selectedIsDemo,
    latestAssistantId,
    shuffledDemoFollowUps.length,
    demoSuggestionsExhausted,
  ]);

  const handleConnectorSelect = (connectorId: string) => {
    setInput(`I want to connect ${connectorId}`);
  };

  const composerStatusLabel =
    schemaTableCount != null && schemaTableCount > 0
      ? ` · ${schemaTableCount} dataset${schemaTableCount === 1 ? '' : 's'} ready`
      : selectedDatasourceId
        ? ' · Data connected'
        : '';

  const composerPanel = (
    <div className="relative mx-auto w-full max-w-3xl md:max-w-4xl">
      {chatQuotaBlocked && chatLockBanner && (
        <div className="mb-3 flex flex-col items-center gap-2 rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--ds-surface-muted)] px-4 py-3 text-center text-sm text-[color:var(--text-secondary)]">
          <p>{chatLockBanner.message}</p>
          {chatLockBanner.showUpgradeCta ? (
            <Link
              to={upgradeHref}
              className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
            >
              Upgrade plan
            </Link>
          ) : null}
        </div>
      )}
      {!selectedDatasourceId &&
        localMessages.length > 1 &&
        !chatQuotaBlocked &&
        !sourceRequiredForChat && (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2"
              onClick={() => setSourcePickerOpenRequest((n) => n + 1)}
            >
              Tip: Choose a data source for deeper analysis
            </button>
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
          disabled={chatQuotaBlocked || demoConnecting || sourceRequiredForChat}
          disabledReason={
            chatQuotaBlocked
              ? PLAN_LIMIT_REACHED_TOOLTIP
              : sourceRequiredForChat
                ? 'Connect your data or explore sample data to start chatting.'
                : null
          }
          sourcePickerOpenRequest={sourcePickerOpenRequest}
          datasources={datasources}
          connectors={connectors}
          selectedDatasourceId={selectedDatasourceId}
          onDatasourceChange={setSelectedDatasourceId}
          onConnectDatasource={() => setShowConnectionPanel(true)}
          onRemoveDemo={() => void handleRemoveDemo()}
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center">Missing workspace context</p>
      )}

      <p className="mt-2.5 text-center text-[10px] text-[color:var(--text-muted)]">
        Powered by Beleh
        <span className="hidden md:inline"> · answers you can share with your team</span>
        {composerStatusLabel}
      </p>
    </div>
  );

  return (
    <div
      className={cn(
        'chat-container chat-container--enterprise relative z-0 flex min-h-0 flex-1 flex-col font-sans',
        showWelcomeScreen && 'chat-container--welcome-center',
      )}
    >
      {showWelcomeScreen ? (
        <div className="chat-empty-stage flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-3 py-6 sm:px-4 md:px-6">
          <ChatWelcome
            onPromptClick={handleWelcomePrompt}
            disabled={isWaiting || demoConnecting}
            hasDatasources={hasDatasources}
            sourcesLoading={!sourcesReady || demoStatusLoading}
            onConnectDatasource={() => setShowConnectionPanel(true)}
            showDemoCta={showDemoCta}
            onStartDemo={() => void handleStartDemo()}
            demoConnecting={demoConnecting}
            demoHeadline={demoCopy?.headline}
            demoMessage={demoCopy?.message}
            demoPrompts={demoCopy?.suggested_prompts}
            preferDemoPrompts={selectedIsDemo}
            usedPrompts={usedDemoPrompts}
          />
          <div className="chat-composer-dock chat-composer-dock--float relative z-30 w-full shrink-0 overflow-visible pt-4 md:pt-6">
            {composerPanel}
          </div>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="analytics-page flex-1 overflow-y-auto px-2 py-4 sm:px-4 md:px-6 lg:px-10 space-y-6 md:space-y-8"
          >
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 xl:max-w-[96rem] 2xl:max-w-[110rem] md:gap-8">
              {chatBodyPending ? (
                <ChatThreadSkeleton />
              ) : (
                <>
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
                                  upgradeHref={msg.failure.upgradeHref}
                                  showUpgradeCta={
                                    Boolean(msg.failure.quotaLimitType) &&
                                    (msg.failure.showUpgradeCta ?? showUpgrade)
                                  }
                                  upgradeLabel={
                                    msg.failure.quotaLimitType === 'datasets'
                                      ? 'View datasources'
                                      : msg.failure.quotaLimitType === 'members_per_workspace'
                                        ? 'Manage members'
                                        : 'Upgrade plan'
                                  }
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
                                          void sendMessage(msg.retryPrompt!, {
                                            skipUserMessage: true,
                                          });
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
                                        <div className="message-plain message-plain--assistant">
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
                                  <div className="message-plain message-plain--assistant">
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
                                  const fromArtifacts = getAskPromptsFromArtifacts(
                                    meta?.artifacts ?? [],
                                  );
                                  const suggested = selectedIsDemo
                                    ? shuffledDemoFollowUps
                                    : fromArtifacts;
                                  if (!suggested.length && !demoSuggestionsExhausted) return null;
                                  return (
                                    <SuggestedPrompts
                                      prompts={suggested}
                                      onSelect={handleSuggestedPrompt}
                                      disabled={isWaiting}
                                      label={
                                        selectedIsDemo ? 'Try another sample question' : undefined
                                      }
                                      exhaustedHint={
                                        demoSuggestionsExhausted
                                          ? "You've tried the sample questions — ask your own about this dataset to explore further."
                                          : null
                                      }
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
                          <div className="opacity-80">
                            <MarkdownText>{partialText}</MarkdownText>
                          </div>
                        ) : null}
                        <ThinkingShimmer phrases={shimmerPhrases} />
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} className="h-px w-full shrink-0" aria-hidden />
            </div>
          </div>

          <div className="chat-composer-dock chat-composer-dock--float relative z-30 shrink-0 overflow-visible px-3 pb-3 pt-2 md:px-6 md:pb-4">
            {composerPanel}
          </div>
        </>
      )}

      {showConnectionPanel && workspaceId && (
        <DatasourceConnectionPanel
          workspaceId={workspaceId}
          onClose={() => {
            setShowConnectionPanel(false);
            void Promise.all([
              refreshConnectors({ silent: true }),
              refreshDatasources({ silent: true }),
            ]);
          }}
          onSuccess={async () => {
            await handleLiveSourceConnected();
            toast.success('Datasource connected successfully.');
          }}
        />
      )}
    </div>
  );
}

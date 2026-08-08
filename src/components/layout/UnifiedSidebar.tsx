import { useState, useContext, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  LogOut,
  RefreshCw,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { NavLink, useLocation, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import logoImage from '../../assets/logo.webp';
import { ChatSessionContext, useChatSession } from '../../context/ChatSessionContext';
import { useAuth } from '../../context/useAuth';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUsage } from '../../context/UsageContext';
import { ContextMenu } from '../common/ContextMenu';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PromptDialog } from '../common/PromptDialog';
import { workspaceChatPath } from '../../hooks/useSessionInUrl';
import { WorkspaceRegionDropdown } from './WorkspaceRegionDropdown';
import {
  readActiveWorkspaceId,
  readSidebarCollapsed,
  writeSidebarCollapsed,
  UI_KEYS,
  type UiMemoryScope,
} from '../../lib/uiMemory';
import { useUiMemory } from '../../hooks/useUiMemory';
import { SEARCH_VISIBILITY_THRESHOLD } from '../../constants/pagination';
import './UnifiedSidebar.css';

function initialsFromUser(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const name = (displayName || '').trim();
  if (name) {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  const e = (email || '').trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return '?';
}

export type UnifiedSidebarVariant = 'rail' | 'drawer';

interface UnifiedSidebarProps {
  variant?: UnifiedSidebarVariant;
}

export function UnifiedSidebar({ variant = 'rail' }: UnifiedSidebarProps) {
  const isDrawer = variant === 'drawer';
  const { user, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() =>
    user?.uid ? readSidebarCollapsed(user.uid) : false,
  );
  const sidebarUid = user?.uid ?? '';
  const [sidebarIdentity, setSidebarIdentity] = useState(sidebarUid);
  if (sidebarIdentity !== sidebarUid) {
    setSidebarIdentity(sidebarUid);
    setIsCollapsed(sidebarUid ? readSidebarCollapsed(sidebarUid) : false);
  }

  const [refreshingChats, setRefreshingChats] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const sessionSearchScope: UiMemoryScope | null =
    user?.uid && workspaceId ? { kind: 'workspace', uid: user.uid, workspaceId } : null;
  const [sessionSearchQuery, setSessionSearchQuery] = useUiMemory(
    sessionSearchScope,
    UI_KEYS.workspaceSessionSearch,
    '',
  );
  const path = location.pathname;
  const { currentWorkspace, workspaces, workspaceUsage } = useWorkspace();
  const { summary, currentUsage } = useUsage();
  const chatContext = useContext(ChatSessionContext);
  const {
    loadWorkspaceSessions,
    loadMoreSessions,
    sessionsHasMore,
    isLoadingMoreSessions,
    invalidateWorkspaceSessions,
    isLoading: sessionsLoading,
  } = useChatSession();

  useEffect(() => {
    if (!user?.uid) return;
    writeSidebarCollapsed(user.uid, isCollapsed);
  }, [user?.uid, isCollapsed]);

  const sessions = chatContext?.sessions ?? [];
  const activeSessionId = chatContext?.activeSessionId ?? null;

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [actionSessionId, setActionSessionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showRenamePrompt, setShowRenamePrompt] = useState(false);
  const [renameDefaultTitle, setRenameDefaultTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const collapsed = !isDrawer && isCollapsed;

  const filteredSessions = useMemo(() => {
    const q = sessionSearchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) => {
      const title = (session.title || `Chat ${session.id.slice(0, 8)}`).toLowerCase();
      return title.includes(q) || session.id.toLowerCase().includes(q);
    });
  }, [sessions, sessionSearchQuery]);

  const handleSessionMenuClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget as HTMLElement);
    setActionSessionId(sessionId);
  };

  const handleRenameRequest = () => {
    if (!actionSessionId) return;
    const session = sessions.find((s) => s.id === actionSessionId);
    if (!session) return;
    setRenameDefaultTitle(session.title || '');
    setShowRenamePrompt(true);
    setMenuAnchorEl(null);
  };

  const handleRenameConfirm = async (newTitle: string) => {
    if (!actionSessionId) return;
    const session = sessions.find((s) => s.id === actionSessionId);
    if (!session || newTitle === session.title) {
      setShowRenamePrompt(false);
      setActionSessionId(null);
      return;
    }
    setIsRenaming(true);
    try {
      await chatContext?.renameSession(actionSessionId, newTitle);
      setShowRenamePrompt(false);
      setActionSessionId(null);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    const sessionId = actionSessionId;
    if (!sessionId) return;
    setIsDeleting(true);
    try {
      const ok = await chatContext?.deleteSession(sessionId);
      if (ok) {
        toast.success('Chat deleted');
        setShowDeleteConfirm(false);
        if (activeSessionId === sessionId && effectiveWorkspaceId) {
          navigate(workspaceChatPath(effectiveWorkspaceId), { replace: true });
        }
      } else {
        toast.error('Could not delete this chat. Please try again.');
      }
    } catch {
      toast.error('Could not delete this chat. Please try again.');
    } finally {
      setIsDeleting(false);
      setActionSessionId(null);
    }
  };

  const routeWorkspaceId = workspaceId && workspaceId !== 'undefined' ? workspaceId : null;
  let storedWorkspaceId: string | null = null;
  try {
    const v = readActiveWorkspaceId();
    if (v && v !== 'undefined') storedWorkspaceId = v;
  } catch {
    storedWorkspaceId = null;
  }

  const effectiveWorkspaceId = routeWorkspaceId ?? currentWorkspace?.id ?? storedWorkspaceId;
  const workspaceBase = effectiveWorkspaceId ? `/workspace/${effectiveWorkspaceId}` : '';

  const planLabel = useMemo(() => {
    const tier = workspaceUsage?.plan_tier;
    const name = summary?.plan_name || currentUsage?.plan?.name || tier || 'Free';
    return `${name} plan`.toUpperCase();
  }, [summary?.plan_name, currentUsage?.plan?.name, workspaceUsage?.plan_tier]);

  const usageFooterLine = useMemo(() => {
    if (!workspaceUsage) return null;
    const parts: string[] = [];
    const tUsed = workspaceUsage.credits_used;
    const tLimit = workspaceUsage.credits_limit;
    if (tUsed != null && tLimit != null && tLimit >= 0) {
      const pct = Math.min(100, Math.round((tUsed / tLimit) * 100));
      parts.push(`${pct}% credits`);
    }
    const dUsed = workspaceUsage.daily_credits_used;
    const dLimit = workspaceUsage.daily_credits_limit;
    if (dUsed != null && dLimit != null && dLimit >= 0) {
      const pct = Math.min(100, Math.round((dUsed / dLimit) * 100));
      parts.push(`${pct}% daily`);
    }
    if (workspaceUsage.is_trial && workspaceUsage.trial_end) {
      const end = new Date(workspaceUsage.trial_end).getTime();
      if (!Number.isNaN(end)) {
        const days = Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
        parts.push(days === 0 ? 'trial ends today' : `${days}d left`);
      }
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [workspaceUsage]);

  const handleSessionClick = (sessionId: string) => {
    if (!effectiveWorkspaceId) return;
    chatContext?.setActiveSessionId(sessionId);
    navigate(workspaceChatPath(effectiveWorkspaceId, sessionId));
  };

  const handleNewChat = () => {
    if (!effectiveWorkspaceId) return;
    chatContext?.startNewChat();
    navigate(`/workspace/${effectiveWorkspaceId}`, { replace: true });
  };

  const handleRefreshChats = async () => {
    if (!effectiveWorkspaceId) {
      toast.error('Open a workspace to refresh chats');
      return;
    }
    setRefreshingChats(true);
    try {
      invalidateWorkspaceSessions(effectiveWorkspaceId);
      await loadWorkspaceSessions(effectiveWorkspaceId, true);
      toast.success('Chat list refreshed');
    } catch (err) {
      console.error('Failed to refresh chat sessions:', err);
      toast.error('Could not refresh chats. Please try again.');
    } finally {
      setRefreshingChats(false);
    }
  };

  const handleSignOutConfirm = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/signin', { replace: true });
    } catch {
      navigate('/signin', { replace: true });
    } finally {
      setIsSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn('sidebar-nav-link', isActive && 'sidebar-nav-link--active');

  const settingsAreaActive =
    path.startsWith('/settings') && !path.startsWith('/settings/workspaces');

  return (
    <>
      <aside
        className={cn(
          'unified-sidebar flex flex-col transition-[width] duration-300 ease-out relative z-20 pointer-events-auto',
          isDrawer ? 'unified-sidebar--drawer w-full' : collapsed ? 'w-[3.75rem]' : 'w-[17.5rem]',
        )}
      >
        {!isDrawer && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="unified-sidebar__collapse-btn absolute -right-3 top-12 z-10 rounded-full p-1 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        )}

        <div
          className={cn('unified-sidebar__header', collapsed && 'flex flex-col items-center px-2')}
        >
          <div className={cn('unified-sidebar__brand-row', collapsed && 'justify-center')}>
            <img
              src={logoImage}
              alt="Beleh"
              className={cn(
                'unified-sidebar__logo object-contain object-left',
                collapsed
                  ? 'mx-auto h-6 w-auto max-w-[2.5rem]'
                  : 'h-7 w-auto max-w-[9.5rem] shrink-0',
              )}
            />
            {!collapsed && <span className="unified-sidebar__workspace-pill">Workspace</span>}
          </div>
          {!collapsed && (
            <p className="unified-sidebar__tagline font-display">Ask. Analyze. Decide.</p>
          )}
        </div>

        {!collapsed && workspaces.length > 0 ? <WorkspaceRegionDropdown /> : null}

        {!collapsed && workspaces.length === 0 ? (
          <p className="unified-sidebar__empty-workspace">
            Open Settings → Workspaces to get started.
          </p>
        ) : null}

        <nav className="unified-sidebar__nav">
          {effectiveWorkspaceId ? (
            <>
              <NavLink to={workspaceBase} end className={navClass}>
                <MessageSquare className="h-4 w-4 shrink-0" strokeWidth={2} />
                {!collapsed && <span>Chat</span>}
              </NavLink>
              <NavLink to={`${workspaceBase}/datasets`} className={navClass}>
                <Database className="h-4 w-4 shrink-0" strokeWidth={2} />
                {!collapsed && <span>Data sources</span>}
              </NavLink>
            </>
          ) : (
            <NavLink to="/settings/workspaces" className={navClass} end>
              <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2} />
              {!collapsed && <span>Workspaces</span>}
            </NavLink>
          )}

          {effectiveWorkspaceId && (
            <>
              {!collapsed ? <div className="unified-sidebar__divider border-t" /> : null}

              {!collapsed ? (
                <div className="unified-sidebar__sessions">
                  <div className="unified-sidebar__sessions-header">
                    <span className="sidebar-section-label">Recent chats</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => void handleRefreshChats()}
                        disabled={sessionsLoading || refreshingChats}
                        className="sidebar-icon-btn rounded-md p-1.5 disabled:opacity-40"
                        title="Refresh list"
                        aria-label="Refresh recent chats"
                      >
                        <RefreshCw
                          className={cn(
                            'h-3.5 w-3.5',
                            (sessionsLoading || refreshingChats) && 'animate-spin',
                          )}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={handleNewChat}
                        className="sidebar-icon-btn rounded-md p-1.5"
                        title="New chat"
                        aria-label="New chat"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {sessions.length > SEARCH_VISIBILITY_THRESHOLD && (
                    <div className="unified-sidebar__sessions-search">
                      <Search
                        className="unified-sidebar__sessions-search-icon"
                        size={16}
                        strokeWidth={2}
                        aria-hidden
                      />
                      <input
                        type="search"
                        className="unified-sidebar__sessions-search-input"
                        placeholder="Search chats…"
                        value={sessionSearchQuery}
                        onChange={(e) => setSessionSearchQuery(e.target.value)}
                        aria-label="Search recent chats"
                      />
                    </div>
                  )}
                  <div className="unified-sidebar__sessions-list no-scrollbar">
                    {filteredSessions.length > 0 ? (
                      <>
                        {filteredSessions.map((session) => (
                          <div
                            key={session.id}
                            className="sidebar-session-row group relative flex items-center"
                          >
                            <button
                              type="button"
                              onClick={() => handleSessionClick(session.id)}
                              className={cn(
                                'sidebar-session-btn flex-1',
                                activeSessionId === session.id && 'sidebar-session-btn--active',
                              )}
                            >
                              <span className="sidebar-session-title truncate">
                                {session.title || `Chat ${session.id.slice(0, 8)}`}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleSessionMenuClick(e, session.id)}
                              className={cn(
                                'sidebar-session-menu-btn',
                                menuAnchorEl &&
                                  actionSessionId === session.id &&
                                  'sidebar-session-menu-btn--open',
                              )}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {sessionsHasMore && !sessionSearchQuery.trim() && (
                          <button
                            type="button"
                            className="unified-sidebar__load-more"
                            disabled={isLoadingMoreSessions}
                            onClick={() => void loadMoreSessions()}
                          >
                            {isLoadingMoreSessions ? 'Loading…' : 'Load more chats'}
                          </button>
                        )}
                      </>
                    ) : sessions.length > 0 ? (
                      <div className="rounded-lg border border-dashed border-[color:var(--sidebar-border)] px-3 py-5 text-center">
                        <p className="sidebar-empty-hint mb-1">No matching chats</p>
                        <p className="text-[11px] text-[color:var(--sidebar-text-muted)]">
                          Try another search term.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-[color:var(--sidebar-border)] px-3 py-6 text-center">
                        <p className="sidebar-empty-hint mb-1">No chats yet</p>
                        <p className="text-[11px] text-[color:var(--sidebar-text-muted)]">
                          Open Chat and send a message to start.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 border-t border-[color:var(--sidebar-border)] pt-2">
                  <button
                    type="button"
                    onClick={() => void handleRefreshChats()}
                    disabled={sessionsLoading || refreshingChats}
                    className="sidebar-icon-btn rounded-md p-2 disabled:opacity-40"
                    title="Refresh chats"
                  >
                    <RefreshCw
                      className={cn(
                        'h-4 w-4',
                        (sessionsLoading || refreshingChats) && 'animate-spin',
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="sidebar-icon-btn rounded-md p-2"
                    title="New chat"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </nav>

        <footer className={cn('unified-sidebar__footer', collapsed && 'px-2')}>
          <NavLink
            to="/settings/general"
            title="Settings"
            className={() =>
              cn(
                'sidebar-settings-link',
                settingsAreaActive && 'sidebar-settings-link--active',
                collapsed && 'sidebar-settings-link--collapsed',
              )
            }
          >
            <span className="sidebar-settings-link__icon" aria-hidden>
              <Settings className="h-4 w-4 shrink-0" strokeWidth={2} />
            </span>
            {!collapsed && (
              <>
                <span className="sidebar-settings-link__text">
                  <span className="sidebar-settings-link__label">Settings</span>
                  <span className="sidebar-settings-link__sub">Account, billing &amp; more</span>
                </span>
                <ChevronRight
                  className="sidebar-settings-link__chevron h-4 w-4 shrink-0"
                  strokeWidth={2}
                />
              </>
            )}
          </NavLink>

          {user && (
            <div
              className={cn(
                'unified-sidebar__profile-row',
                collapsed && 'flex-col justify-center p-2',
              )}
            >
              <div className="unified-sidebar__avatar">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" />
                ) : (
                  initialsFromUser(user.displayName, user.email)
                )}
              </div>
              {!collapsed && (
                <div className="unified-sidebar__profile-text">
                  <p className="unified-sidebar__footer-name">{user.displayName || 'Account'}</p>
                  {user.email ? (
                    <p className="unified-sidebar__footer-email">{user.email}</p>
                  ) : null}
                  <p className="unified-sidebar__footer-plan">{planLabel}</p>
                  {usageFooterLine ? (
                    <p className="unified-sidebar__footer-usage">{usageFooterLine}</p>
                  ) : null}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                className="unified-sidebar__sign-out-btn"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </footer>

        <ContextMenu
          isOpen={Boolean(menuAnchorEl)}
          anchorEl={menuAnchorEl}
          onClose={() => setMenuAnchorEl(null)}
          items={[
            {
              id: 'rename',
              label: 'Rename',
              icon: <Pencil className="h-4 w-4" strokeWidth={2} />,
              onClick: handleRenameRequest,
            },
            {
              id: 'delete',
              label: 'Delete',
              icon: <Trash2 className="h-4 w-4" strokeWidth={2} />,
              variant: 'danger',
              onClick: () => setShowDeleteConfirm(true),
            },
          ]}
        />

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete chat session?"
          message="This will permanently delete this chat session and all its messages. This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setActionSessionId(null);
          }}
        />

        <ConfirmDialog
          isOpen={showSignOutConfirm}
          title="Sign out?"
          message="You will need to sign in again to access your workspaces and chats."
          confirmText="Sign out"
          cancelText="Cancel"
          variant="brand"
          isLoading={isSigningOut}
          onConfirm={handleSignOutConfirm}
          onCancel={() => setShowSignOutConfirm(false)}
        />

        <PromptDialog
          isOpen={showRenamePrompt}
          title="Rename chat"
          message="Choose a name that helps you find this conversation later."
          label="Session name"
          defaultValue={renameDefaultTitle}
          placeholder="e.g. Q4 revenue analysis"
          confirmText="Save"
          isLoading={isRenaming}
          onConfirm={handleRenameConfirm}
          onCancel={() => {
            setShowRenamePrompt(false);
            setActionSessionId(null);
          }}
        />
      </aside>
    </>
  );
}

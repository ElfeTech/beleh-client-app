import { useState, useContext, useMemo } from 'react';
import {
  MessageSquare,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  History,
  Sun,
  Moon,
  Monitor,
  LogOut,
  RefreshCw,
  LayoutGrid,
  ArrowLeft,
  TrendingUp,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { NavLink, useLocation, useParams, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import logoImage from '../../assets/logo.webp';
import { ChatSessionContext } from '../../context/ChatSessionContext';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import { useAuth } from '../../context/useAuth';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUsage } from '../../context/UsageContext';
import { ContextMenu } from '../common/ContextMenu';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './UnifiedSidebar.css';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light theme', icon: Sun },
  { value: 'dark', label: 'Dark theme', icon: Moon },
  { value: 'system', label: 'Match system', icon: Monitor },
];

function initialsFromUser(displayName: string | null | undefined, email: string | null | undefined): string {
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

export function UnifiedSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [refreshingChats, setRefreshingChats] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const path = location.pathname;
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { summary, currentUsage } = useUsage();
  const chatContext = useContext(ChatSessionContext);
  const { themePreference, setThemePreference } = useTheme();

  const sessions = chatContext?.sessions ?? [];
  const activeSessionId = chatContext?.activeSessionId ?? null;
  const refreshSessions = chatContext?.refreshSessions;
  const sessionsLoading = chatContext?.isLoading ?? false;

  // Session Actions State
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [actionSessionId, setActionSessionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSessionMenuClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget as HTMLElement);
    setActionSessionId(sessionId);
  };

  const handleRename = async () => {
    if (!actionSessionId) return;
    const session = sessions.find(s => s.id === actionSessionId);
    if (!session) return;
    
    const newTitle = window.prompt('Rename chat session:', session.title || '');
    if (newTitle !== null && newTitle.trim() !== '' && newTitle !== session.title) {
        await chatContext?.renameSession(actionSessionId, newTitle.trim());
    }
    setMenuAnchorEl(null);
    setActionSessionId(null);
  };

  const handleDelete = async () => {
    if (!actionSessionId) return;
    setIsDeleting(true);
    try {
        await chatContext?.deleteSession(actionSessionId);
        setShowDeleteConfirm(false);
    } finally {
        setIsDeleting(false);
        setActionSessionId(null);
    }
  };

  const routeWorkspaceId = workspaceId && workspaceId !== 'undefined' ? workspaceId : null;
  let storedWorkspaceId: string | null = null;
  try {
    const v = localStorage.getItem('activeWorkspaceId');
    if (v && v !== 'undefined') storedWorkspaceId = v;
  } catch {
    storedWorkspaceId = null;
  }

  const effectiveWorkspaceId = routeWorkspaceId ?? currentWorkspace?.id ?? storedWorkspaceId;
  const workspaceBase = effectiveWorkspaceId ? `/workspace/${effectiveWorkspaceId}` : '';
  const onSettingsRoute = path.startsWith('/settings');

  const planLabel = useMemo(() => {
    return summary?.plan_name || currentUsage?.plan?.name || 'Free';
  }, [summary?.plan_name, currentUsage?.plan?.name]);

  const workspaceLabel = currentWorkspace?.name || (effectiveWorkspaceId ? 'Workspace' : '');

  const handleSessionClick = (sessionId: string) => {
    if (!effectiveWorkspaceId) return;
    chatContext?.setActiveSessionId(sessionId);
    if (location.pathname !== workspaceBase) {
      navigate(workspaceBase);
    }
  };

  const handleNewChat = () => {
    if (!effectiveWorkspaceId) return;
    chatContext?.setActiveSessionId(null);
    navigate(workspaceBase);
  };

  const handleRefreshChats = async () => {
    if (!refreshSessions) return;
    setRefreshingChats(true);
    try {
      await refreshSessions();
    } finally {
      setRefreshingChats(false);
    }
  };

  const handleSignOut = async () => {
    if (!window.confirm('Sign out of your account?')) return;
    try {
      await signOut();
      navigate('/signin', { replace: true });
    } catch {
      navigate('/signin', { replace: true });
    }
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn('sidebar-nav-link', isActive && 'sidebar-nav-link--active');

  const settingsAreaActive =
    path.startsWith('/settings') && !path.startsWith('/settings/workspaces');

  return (
    <aside
      className={cn(
        'unified-sidebar flex flex-col transition-[width] duration-300 ease-out relative z-20 pointer-events-auto',
        isCollapsed ? 'w-[4.25rem]' : 'w-64'
      )}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="unified-sidebar__collapse-btn absolute -right-3 top-12 z-10 rounded-full p-1 transition-colors"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      <div
        className={cn(
          'flex shrink-0 items-center gap-3 px-4 pb-2 pt-6',
          isCollapsed && 'flex-col justify-center gap-2 px-2'
        )}
      >
        <img
          src={logoImage}
          alt="Beleh"
          className={cn(
            'unified-sidebar__logo object-contain object-left',
            isCollapsed ? 'mx-auto h-7 w-auto max-w-[2.75rem]' : 'h-9 w-auto max-w-[11rem] shrink-0'
          )}
        />
        {!isCollapsed && effectiveWorkspaceId && workspaceLabel ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              {workspaceLabel}
            </p>
          </div>
        ) : null}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 px-2 pb-2">
        {effectiveWorkspaceId ? (
          <>
            <NavLink to={workspaceBase} end className={navClass}>
              {onSettingsRoute ? (
                <ArrowLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
              ) : (
                <MessageSquare className="h-5 w-5 shrink-0" strokeWidth={2} />
              )}
              {!isCollapsed && <span>{onSettingsRoute ? 'Back to chat' : 'Chat'}</span>}
            </NavLink>
            <NavLink to={`${workspaceBase}/datasets`} className={navClass}>
              <Database className="h-5 w-5 shrink-0" strokeWidth={2} />
              {!isCollapsed && <span>Data sources</span>}
            </NavLink>
            <NavLink to={`${workspaceBase}/sessions`} className={navClass}>
              <History className="h-5 w-5 shrink-0" strokeWidth={2} />
              {!isCollapsed && <span>Sessions</span>}
            </NavLink>
            <NavLink to={`${workspaceBase}/statistics`} className={navClass}>
              <TrendingUp className="h-5 w-5 shrink-0" strokeWidth={2} />
              {!isCollapsed && <span>Usage Analytics</span>}
            </NavLink>
          </>
        ) : (
          <NavLink to="/settings/workspaces" className={navClass} end>
            <LayoutGrid className="h-5 w-5 shrink-0" strokeWidth={2} />
            {!isCollapsed && <span>Workspaces</span>}
          </NavLink>
        )}

        <NavLink
          to="/settings/general"
          className={() => cn('sidebar-nav-link', settingsAreaActive && 'sidebar-nav-link--active')}
        >
          <Settings className="h-5 w-5 shrink-0" strokeWidth={2} />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>

        {effectiveWorkspaceId && (
          <>
            <div className="unified-sidebar__divider mx-2 my-4 border-t" />

            {!isCollapsed ? (
              <div className="flex min-h-0 flex-1 flex-col px-1">
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
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
                        className={cn('h-3.5 w-3.5', (sessionsLoading || refreshingChats) && 'animate-spin')}
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
                <div className="no-scrollbar max-h-[40vh] space-y-1 overflow-y-auto pr-0.5">
                  {sessions.length > 0 ? (
                    sessions.slice(0, 12).map((session) => (
                      <div key={session.id} className="group relative flex items-center">
                        <button
                          type="button"
                          onClick={() => handleSessionClick(session.id)}
                          className={cn(
                            'sidebar-session-btn flex-1',
                            activeSessionId === session.id && 'sidebar-session-btn--active'
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
                            "absolute right-2 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all",
                            (menuAnchorEl && actionSessionId === session.id) && "opacity-100 bg-muted"
                          )}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-[color:var(--border-primary)] bg-[color:var(--ds-surface-muted)]/40 px-3 py-6 text-center">
                      <p className="sidebar-empty-hint mb-1">No chats yet</p>
                      <p className="text-[11px] text-[color:var(--text-muted)]">Open Chat and send a message to start.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 border-t border-[color:var(--border-primary)] pt-2">
                <button
                  type="button"
                  onClick={() => void handleRefreshChats()}
                  disabled={sessionsLoading || refreshingChats}
                  className="sidebar-icon-btn rounded-md p-2 disabled:opacity-40"
                  title="Refresh chats"
                >
                  <RefreshCw className={cn('h-4 w-4', (sessionsLoading || refreshingChats) && 'animate-spin')} />
                </button>
                <button type="button" onClick={handleNewChat} className="sidebar-icon-btn rounded-md p-2" title="New chat">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </nav>

      <div className={cn('unified-sidebar__footer shrink-0 border-t border-[color:var(--border-primary)]', isCollapsed ? 'px-2 py-3' : 'px-3 py-3')}>
        {!isCollapsed ? (
          <>
            <p className="sidebar-section-label mb-2 px-1">Appearance</p>
            <div className="sidebar-theme-shell mb-3 flex p-1" role="group" aria-label="Color theme">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                const selected = themePreference === value;
                return (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-pressed={selected}
                    onClick={() => setThemePreference(value)}
                    className={cn(
                      'sidebar-theme-option flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wide',
                      selected && 'sidebar-theme-option--selected'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span>{value === 'system' ? 'Auto' : value}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mb-2 flex flex-col items-center gap-1" role="group" aria-label="Color theme">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
              const selected = themePreference === value;
              return (
                <button
                  key={value}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={() => setThemePreference(value)}
                  className={cn(
                    'sidebar-theme-option flex h-9 w-9 items-center justify-center rounded-lg',
                    selected && 'sidebar-theme-option--selected'
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSignOut()}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[color:var(--error)] px-3 py-2.5 text-sm font-semibold text-[color:var(--error)] transition-colors hover:bg-[color:var(--error-light)]',
            isCollapsed && 'px-0 py-2'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Sign out</span>}
        </button>

        {user && (
          <div
            className={cn(
              'unified-sidebar__footer-profile mt-3 flex cursor-default items-center gap-3 rounded-xl p-2',
              isCollapsed && 'justify-center p-1'
            )}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[color:var(--border-primary)]"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-2 ring-[color:var(--border-primary)]">
                {initialsFromUser(user.displayName, user.email)}
              </div>
            )}
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="unified-sidebar__footer-name truncate">{user.displayName || 'Account'}</p>
                <p className="unified-sidebar__footer-plan truncate">{planLabel}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ContextMenu
        isOpen={Boolean(menuAnchorEl)}
        anchorEl={menuAnchorEl}
        onClose={() => {
            setMenuAnchorEl(null);
            setActionSessionId(null);
        }}
        items={[
          {
            id: 'rename',
            label: 'Rename',
            icon: <Pencil className="h-4 w-4" strokeWidth={2} />,
            onClick: handleRename,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" strokeWidth={2} />,
            variant: 'danger',
            onClick: () => {
              setMenuAnchorEl(null);
              setShowDeleteConfirm(true);
            },
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
    </aside>
  );
}

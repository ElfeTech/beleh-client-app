import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Mail,
  RefreshCw,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiClient } from '../../services/apiClient';
import type { WorkspaceInvitation, WorkspaceMember, WorkspaceRole } from '../../types/api';
import {
  canManageMembers,
  canShowWorkspaceUpgradeCta,
  isSeatsAtLimit,
  PLAN_LIMIT_REACHED_TOOLTIP,
  workspaceLimitUpgradeMessage,
} from '../../utils/workspaceAccess';
import {
  ApiRequestError,
  formatInvitationErrorToast,
  isQuotaExceededError,
} from '../../utils/apiErrorMessage';
import { formatQuotaExceededMessage } from '../../utils/quotaExceededUi';
import { isWorkspaceMemberSelf } from '../../utils/workspaceMembers';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import './SettingsShared.css';
import './MembersSection.css';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
type MembersTab = 'members' | 'invites';
type RoleFilter = 'all' | WorkspaceRole;

function initialsFrom(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name?.trim() || email?.trim() || '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function memberMatchesQuery(member: WorkspaceMember, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [
    member.display_name,
    member.email,
    member.user?.display_name,
    member.user?.email,
    member.role,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function inviteMatchesQuery(invite: WorkspaceInvitation, query: string): boolean {
  if (!query) return true;
  return invite.email.toLowerCase().includes(query.toLowerCase());
}

export function MembersSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentWorkspace,
    currentRole,
    workspaceUsage,
    refreshWorkspaceUsage,
    refreshWorkspaces,
    setCurrentWorkspace,
  } = useWorkspace();

  const [tab, setTab] = useState<MembersTab>('members');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [invitesTotal, setInvitesTotal] = useState(0);
  const [membersPage, setMembersPage] = useState(1);
  const [invitesPage, setInvitesPage] = useState(1);
  const [membersTotalPages, setMembersTotalPages] = useState(1);
  const [invitesTotalPages, setInvitesTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{
    userId: string;
    label: string;
    isSelf: boolean;
  } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<WorkspaceInvitation | null>(null);
  const [removing, setRemoving] = useState(false);
  const [selfMemberId, setSelfMemberId] = useState<string | null>(null);

  const isOwner = canManageMembers(currentRole);
  const seatsUsed = workspaceUsage?.seats_used ?? membersTotal + invitesTotal;
  const seatsLimit = workspaceUsage?.seats_limit ?? null;
  const seatsFull =
    workspaceUsage != null
      ? isSeatsAtLimit(workspaceUsage)
      : seatsLimit != null && seatsUsed >= seatsLimit;
  const showUpgrade = canShowWorkspaceUpgradeCta(currentRole);

  // Debounce search so we don't thrash while typing
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setMembersPage(1);
      setInvitesPage(1);
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const loadMembers = useCallback(async () => {
    if (!user || !currentWorkspace) {
      setMembers([]);
      setMembersTotal(0);
      return;
    }
    const token = await user.getIdToken();
    // API has no search/role filter , pull a larger window then filter client-side.
    const clientFilter = Boolean(searchQuery) || roleFilter !== 'all';
    const response = await apiClient.listWorkspaceMembers(token, currentWorkspace.id, {
      page: clientFilter ? 1 : membersPage,
      page_size: clientFilter ? 100 : pageSize,
    });

    let items = response.items;
    let total = response.total_items;
    let totalPages = response.total_pages;

    if (clientFilter && response.has_next && response.total_pages > 1) {
      const maxPages = Math.min(response.total_pages, 10);
      const rest = await Promise.all(
        Array.from({ length: maxPages - 1 }, (_, i) =>
          apiClient.listWorkspaceMembers(token, currentWorkspace.id, {
            page: i + 2,
            page_size: 100,
          }),
        ),
      );
      items = [...items, ...rest.flatMap((p) => p.items)];
      totalPages = 1;
    }

    const self = items.find((m) => isWorkspaceMemberSelf(m, user.uid, user.email));
    if (self) setSelfMemberId(self.user_id);

    setMembers(items);
    setMembersTotal(total);
    setMembersTotalPages(clientFilter ? 1 : Math.max(1, totalPages));
  }, [user, currentWorkspace, membersPage, pageSize, searchQuery, roleFilter]);

  const loadInvites = useCallback(async () => {
    if (!user || !currentWorkspace || !isOwner) {
      setInvitations([]);
      setInvitesTotal(0);
      setInvitesTotalPages(1);
      return;
    }
    const token = await user.getIdToken();

    // API returns all statuses and has no status filter , load pages, keep pending only.
    const first = await apiClient.listInvitations(token, currentWorkspace.id, {
      page: 1,
      page_size: 100,
    });
    let all = [...first.items];
    if (first.has_next && first.total_pages > 1) {
      const maxPages = Math.min(first.total_pages, 10);
      const rest = await Promise.all(
        Array.from({ length: maxPages - 1 }, (_, i) =>
          apiClient.listInvitations(token, currentWorkspace.id, {
            page: i + 2,
            page_size: 100,
          }),
        ),
      );
      all = [...all, ...rest.flatMap((p) => p.items)];
    }

    const pending = all.filter((i) => i.status === 'pending');
    const filtered = searchQuery
      ? pending.filter((i) => inviteMatchesQuery(i, searchQuery))
      : pending;

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
    const page = Math.min(invitesPage, totalPages);
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    setInvitations(pageItems);
    setInvitesTotal(filtered.length);
    setInvitesTotalPages(totalPages);
    if (page !== invitesPage) setInvitesPage(page);
  }, [user, currentWorkspace, isOwner, invitesPage, pageSize, searchQuery]);

  const load = useCallback(async () => {
    if (!user || !currentWorkspace) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      await Promise.all([loadMembers(), isOwner ? loadInvites() : Promise.resolve()]);
      await refreshWorkspaceUsage();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load members.');
      setMembers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentWorkspace, isOwner, loadMembers, loadInvites, refreshWorkspaceUsage]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleMembers = useMemo(() => {
    let list = members;
    if (roleFilter !== 'all') {
      list = list.filter((m) => m.role === roleFilter);
    }
    if (searchQuery) {
      list = list.filter((m) => memberMatchesQuery(m, searchQuery));
    }
    return list;
  }, [members, roleFilter, searchQuery]);

  const visibleInvites = invitations;

  const rangeLabel = (page: number, size: number, total: number, shown: number) => {
    if (total === 0 || shown === 0) return '0 of 0';
    if (searchQuery || roleFilter !== 'all') {
      return `${shown} match${shown === 1 ? '' : 'es'} (of ${total})`;
    }
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return `${start}–${end} of ${total}`;
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !currentWorkspace || !isOwner || seatsFull) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email address.');
      return;
    }

    setInviting(true);
    try {
      const token = await user.getIdToken();
      await apiClient.createInvitation(token, currentWorkspace.id, {
        email,
        role: 'member',
      });
      setInviteEmail('');
      toast.success(`Invite sent to ${email}`);
      setTab('invites');
      setInvitesPage(1);
      await load();
    } catch (err) {
      toast.error(
        isQuotaExceededError(err)
          ? formatQuotaExceededMessage(err, currentRole)
          : formatInvitationErrorToast(err, 'Could not send invite.'),
      );
      if (isQuotaExceededError(err)) {
        void refreshWorkspaceUsage();
      }
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (invitation: WorkspaceInvitation) => {
    if (!user || !currentWorkspace) return;
    setActionBusyId(invitation.id);
    try {
      const token = await user.getIdToken();
      await apiClient.resendInvitation(token, currentWorkspace.id, invitation.id);
      toast.success(`Invite resent to ${invitation.email}`);
      await load();
    } catch (err) {
      toast.error(formatInvitationErrorToast(err, 'Could not resend invite.'));
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!user || !currentWorkspace || !confirmRevoke) return;
    setRemoving(true);
    try {
      const token = await user.getIdToken();
      await apiClient.revokeInvitation(token, currentWorkspace.id, confirmRevoke.id);
      toast.success('Invite revoked');
      setConfirmRevoke(null);
      await load();
    } catch (err) {
      toast.error(formatInvitationErrorToast(err, 'Could not revoke invite.'));
    } finally {
      setRemoving(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!user || !currentWorkspace || !confirmRemove) return;
    setRemoving(true);
    try {
      const token = await user.getIdToken();
      await apiClient.removeWorkspaceMember(token, currentWorkspace.id, confirmRemove.userId);
      toast.success(confirmRemove.isSelf ? 'You left the workspace' : 'Member removed');
      setConfirmRemove(null);

      if (confirmRemove.isSelf) {
        const leftId = currentWorkspace.id;
        await refreshWorkspaces();
        try {
          const authTok = await user.getIdToken();
          const list = await apiClient.listWorkspaces(authTok);
          const remaining = list.items.filter((w) => w.id !== leftId);
          setCurrentWorkspace(remaining[0] ?? null);
          navigate(remaining[0] ? `/workspace/${remaining[0].id}` : '/settings/workspaces');
        } catch {
          setCurrentWorkspace(null);
          navigate('/settings/workspaces');
        }
        return;
      }
      await load();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not remove member.';
      toast.error(message);
    } finally {
      setRemoving(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="settings-page-section">
        <SettingsSectionHeader
          breadcrumbLabel="MEMBERS"
          title="Team Members"
          description="Select a workspace to manage members"
          icon={<Users size={20} strokeWidth={1.75} />}
        />
        <div className="settings-card">
          <p className="settings-row__text">
            No workspace selected. <Link to="/settings/workspaces">Choose a workspace</Link>.
          </p>
        </div>
      </div>
    );
  }

  const activePage = tab === 'members' ? membersPage : invitesPage;
  const activeTotalPages = tab === 'members' ? membersTotalPages : invitesTotalPages;
  const pagingDisabled = tab === 'members' && (Boolean(searchQuery) || roleFilter !== 'all');

  return (
    <div className="settings-page-section members-section">
      <SettingsSectionHeader
        breadcrumbLabel="MEMBERS"
        title="Team Members"
        description={`Invite and manage people in ${currentWorkspace.name}`}
        icon={<Users size={20} strokeWidth={1.75} />}
      />

      {loadError && (
        <div className="settings-banner settings-banner--error" role="alert">
          {loadError}
        </div>
      )}

      <div className="settings-card members-directory">
        <div className="members-directory__top">
          <div className="members-directory__stats" aria-live="polite">
            <div className="members-stat">
              <span className="members-stat__value">{loading ? ',' : membersTotal}</span>
              <span className="members-stat__label">Members</span>
            </div>
            {isOwner && (
              <div className="members-stat">
                <span className="members-stat__value">{loading ? ',' : invitesTotal}</span>
                <span className="members-stat__label">Pending</span>
              </div>
            )}
            {seatsLimit != null && (
              <div className="members-stat">
                <span className="members-stat__value">
                  {seatsUsed}/{seatsLimit}
                </span>
                <span className="members-stat__label">Seats</span>
              </div>
            )}
          </div>

          {isOwner && (
            <button
              type="button"
              className="btn-gradient-primary btn-gradient-primary--sm"
              onClick={() => setInviteOpen((o) => !o)}
              disabled={seatsFull}
              title={seatsFull ? PLAN_LIMIT_REACHED_TOOLTIP : 'Invite a teammate'}
            >
              <UserPlus size={16} strokeWidth={2} />
              Invite
            </button>
          )}
        </div>

        {isOwner && inviteOpen && (
          <form className="members-invite-form" onSubmit={handleInvite}>
            <div className="members-invite-form__field">
              <label className="settings-label" htmlFor="invite-email">
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                className="settings-input"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting || seatsFull}
                autoComplete="email"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn-gradient-primary btn-gradient-primary--sm"
              disabled={inviting || seatsFull || !inviteEmail.trim()}
              title={seatsFull ? PLAN_LIMIT_REACHED_TOOLTIP : undefined}
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </form>
        )}

        {seatsFull && isOwner && (
          <p className="members-limit-note">
            {workspaceLimitUpgradeMessage(currentRole, 'seats')}
            {showUpgrade ? (
              <>
                {' '}
                <Link to="/settings/billing?upgrade=1">Upgrade your plan</Link>.
              </>
            ) : null}
          </p>
        )}

        <div className="members-tabs" role="tablist" aria-label="Member directories">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'members'}
            className={`members-tab ${tab === 'members' ? 'is-active' : ''}`}
            onClick={() => setTab('members')}
          >
            Members
            <span className="members-tab__count">{membersTotal}</span>
          </button>
          {isOwner && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'invites'}
              className={`members-tab ${tab === 'invites' ? 'is-active' : ''}`}
              onClick={() => setTab('invites')}
            >
              Pending invites
              <span className="members-tab__count">{invitesTotal}</span>
            </button>
          )}
        </div>

        <div className="members-toolbar">
          <label className="members-search">
            <Search size={16} strokeWidth={2} aria-hidden />
            <input
              type="search"
              className="settings-input"
              placeholder={
                tab === 'members' ? 'Search by name or email…' : 'Search pending invites…'
              }
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search directory"
            />
          </label>

          {tab === 'members' && (
            <div className="members-role-filters" role="group" aria-label="Filter by role">
              {(
                [
                  ['all', 'All'],
                  ['owner', 'Owners'],
                  ['member', 'Members'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`members-chip ${roleFilter === value ? 'is-active' : ''}`}
                  onClick={() => {
                    setRoleFilter(value);
                    setMembersPage(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <label className="members-page-size">
            <span className="settings-label">Per page</span>
            <select
              className="settings-select"
              value={pageSize}
              disabled={Boolean(searchQuery)}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                setMembersPage(1);
                setInvitesPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="members-table-wrap" role="region" aria-label="Directory results">
          {loading ? (
            <p className="members-empty">Loading…</p>
          ) : tab === 'members' ? (
            visibleMembers.length === 0 ? (
              <p className="members-empty">
                {searchQuery || roleFilter !== 'all'
                  ? 'No members match your filters.'
                  : 'No members found.'}
              </p>
            ) : (
              <table className="members-table">
                <thead>
                  <tr>
                    <th scope="col">Person</th>
                    <th scope="col">Role</th>
                    <th scope="col" className="members-table__actions-col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((member) => {
                    const isSelf = isWorkspaceMemberSelf(member, user?.uid, user?.email);
                    const canRemove = (isOwner && !isSelf) || (isSelf && member.role !== 'owner');
                    return (
                      <tr key={member.user_id || member.id}>
                        <td>
                          <div className="members-list__identity">
                            {member.photo_url ? (
                              <img
                                className="members-avatar"
                                src={member.photo_url}
                                alt=""
                                width={36}
                                height={36}
                              />
                            ) : (
                              <span className="members-avatar members-avatar--fallback" aria-hidden>
                                {initialsFrom(member.display_name, member.email)}
                              </span>
                            )}
                            <div className="members-list__text">
                              <span className="members-list__name">
                                {member.display_name?.trim() || member.email || 'Unknown user'}
                                {isSelf ? ' (you)' : ''}
                              </span>
                              <span className="members-list__email">
                                {member.email || 'No email'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`settings-status-pill ${
                              member.role === 'owner'
                                ? 'settings-status-pill--success'
                                : 'settings-status-pill--muted'
                            }`}
                          >
                            {member.role === 'owner' ? 'Owner' : 'Member'}
                          </span>
                        </td>
                        <td className="members-table__actions-col">
                          {canRemove && (
                            <button
                              type="button"
                              className="settings-text-btn settings-text-btn--danger settings-text-btn--small"
                              onClick={() =>
                                setConfirmRemove({
                                  userId: member.user_id,
                                  label:
                                    member.display_name?.trim() || member.email || 'this member',
                                  isSelf,
                                })
                              }
                            >
                              {isSelf ? 'Leave' : 'Remove'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : visibleInvites.length === 0 ? (
            <p className="members-empty">
              {searchQuery ? 'No invites match your search.' : 'No pending invitations.'}
            </p>
          ) : (
            <table className="members-table">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Expires</th>
                  <th scope="col" className="members-table__actions-col">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleInvites.map((invite) => (
                  <tr key={invite.id}>
                    <td>
                      <div className="members-list__identity">
                        <span className="members-avatar members-avatar--fallback" aria-hidden>
                          <Mail size={16} strokeWidth={1.75} />
                        </span>
                        <div className="members-list__text">
                          <span className="members-list__name">{invite.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="members-list__email">{formatExpiry(invite.expires_at)}</span>
                    </td>
                    <td className="members-table__actions-col">
                      <div className="members-list__meta members-list__meta--actions">
                        <button
                          type="button"
                          className="settings-outline-btn"
                          disabled={actionBusyId === invite.id}
                          onClick={() => void handleResend(invite)}
                        >
                          <RefreshCw size={14} strokeWidth={2} />
                          Resend
                        </button>
                        <button
                          type="button"
                          className="settings-text-btn settings-text-btn--danger settings-text-btn--small"
                          disabled={actionBusyId === invite.id}
                          onClick={() => setConfirmRevoke(invite)}
                        >
                          <X size={14} strokeWidth={2} />
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="members-footer">
          <p className="members-footer__range">
            {tab === 'members'
              ? rangeLabel(membersPage, pageSize, membersTotal, visibleMembers.length)
              : rangeLabel(invitesPage, pageSize, invitesTotal, visibleInvites.length)}
          </p>
          <nav className="members-pagination" aria-label="Directory pagination">
            <button
              type="button"
              className="members-page-btn"
              disabled={pagingDisabled || activePage <= 1 || loading}
              onClick={() => {
                if (tab === 'members') setMembersPage((p) => Math.max(1, p - 1));
                else setInvitesPage((p) => Math.max(1, p - 1));
              }}
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden />
              Prev
            </button>
            <span className="members-page-indicator">
              Page {pagingDisabled ? 1 : activePage} of{' '}
              {pagingDisabled ? 1 : Math.max(1, activeTotalPages)}
            </span>
            <button
              type="button"
              className="members-page-btn"
              disabled={pagingDisabled || activePage >= activeTotalPages || loading}
              onClick={() => {
                if (tab === 'members') setMembersPage((p) => Math.min(activeTotalPages, p + 1));
                else setInvitesPage((p) => Math.min(activeTotalPages, p + 1));
              }}
            >
              Next
              <ChevronRight size={16} strokeWidth={2} aria-hidden />
            </button>
          </nav>
        </div>
      </div>

      {!isOwner && currentRole === 'member' && (
        <div className="settings-card">
          <div className="settings-card__head">
            <h2 className="settings-card__title">Leave workspace</h2>
          </div>
          <p className="members-hint">
            You will lose access to this workspace&apos;s data until invited again.
          </p>
          {user && selfMemberId && (
            <button
              type="button"
              className="settings-outline-btn"
              onClick={() =>
                setConfirmRemove({
                  userId: selfMemberId,
                  label: currentWorkspace.name,
                  isSelf: true,
                })
              }
            >
              Leave workspace
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmRemove}
        title={confirmRemove?.isSelf ? 'Leave workspace?' : 'Remove member?'}
        message={
          confirmRemove?.isSelf
            ? `Leave ${currentWorkspace.name}? You will need a new invite to rejoin.`
            : `Remove ${confirmRemove?.label ?? 'this member'} from the workspace?`
        }
        confirmText={confirmRemove?.isSelf ? 'Leave' : 'Remove'}
        variant="danger"
        isLoading={removing}
        onConfirm={() => void handleRemoveConfirm()}
        onCancel={() => setConfirmRemove(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmRevoke}
        title="Revoke invite?"
        message={`Revoke the pending invite for ${confirmRevoke?.email ?? 'this email'}?`}
        confirmText="Revoke"
        variant="danger"
        isLoading={removing}
        onConfirm={() => void handleRevokeConfirm()}
        onCancel={() => setConfirmRevoke(null)}
      />
    </div>
  );
}

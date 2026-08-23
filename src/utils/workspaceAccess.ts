import type { WorkspaceResponse, WorkspaceRole, WorkspaceUsageResponse } from '../types/api';
import { isWorkspaceMemberSelf } from './workspaceMembers';

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return value === 'owner' || value === 'member';
}

export function canManageMembers(role: WorkspaceRole | null | undefined): boolean {
  return role === 'owner';
}

export function canManageWorkspaceSettings(role: WorkspaceRole | null | undefined): boolean {
  return role === 'owner';
}

/**
 * Delete workspace: caller must be owner of *that* workspace; the default workspace is protected.
 * `role` must be resolved for the target workspace (owner role already implies creator/billing owner).
 * Do not compare `owner_id` to a Firebase uid , `owner_id` is a backend user UUID.
 */
export function canDeleteWorkspace(
  role: WorkspaceRole | null | undefined,
  workspace: Pick<WorkspaceResponse, 'is_default'> | null | undefined,
): boolean {
  if (!workspace || workspace.is_default) return false;
  return role === 'owner';
}

export function canRenameWorkspace(role: WorkspaceRole | null | undefined): boolean {
  return role === 'owner';
}

export function canCreateDatasource(role: WorkspaceRole | null | undefined): boolean {
  return role === 'owner' || role === 'member';
}

export function canCreateConnector(role: WorkspaceRole | null | undefined): boolean {
  return role === 'owner' || role === 'member';
}

/**
 * Edit/delete datasource or connector.
 * Owners: any resource. Members: only resources they created (user_id match).
 * If resourceUserId is missing, only owners may mutate.
 */
export function canEditOrDeleteResource(
  role: WorkspaceRole | null | undefined,
  resourceUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (role === 'owner') return true;
  if (role !== 'member' || !currentUserId || !resourceUserId) return false;
  return resourceUserId === currentUserId;
}

export function canShowWorkspaceUpgradeCta(role: WorkspaceRole | null | undefined): boolean {
  return role === 'owner';
}

/** Members list / invite UI: owned workspaces only (role owner). */
export function canAccessMembersSettings(role: WorkspaceRole | null | undefined): boolean {
  return role === 'owner';
}

/** Billing & plans: owned workspaces only , invited members use the owner's subscription. */
export function canAccessBillingSettings(role: WorkspaceRole | null | undefined): boolean {
  return role === 'owner';
}

/** Shared tooltip when a primary action is blocked by plan caps. */
export const PLAN_LIMIT_REACHED_TOOLTIP = 'Plan limit reached';

/** In-app billing page deep-link to the upgrade plans grid. */
export const BILLING_UPGRADE_HREF = '/settings/billing?upgrade=1#billing-plans';

/**
 * Ensure upgrade CTAs land on the plans section (not usage/consumption).
 * Leaves non-billing URLs unchanged; appends `#billing-plans` when missing.
 */
export function normalizeBillingUpgradeHref(href: string | null | undefined): string {
  const raw = href?.trim();
  if (!raw) return BILLING_UPGRADE_HREF;

  const isBillingPath =
    raw === '/settings/billing' ||
    raw.startsWith('/settings/billing?') ||
    raw.startsWith('/settings/billing#') ||
    /(?:^|\/\/)[^/]*\/settings\/billing(?:\?|#|$)/.test(raw);

  if (!isBillingPath) return raw;
  if (raw.includes('#billing-plans')) return raw;

  const hashIndex = raw.indexOf('#');
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  return `${withoutHash}#billing-plans`;
}

/** CTA labels when a plan resource cap blocks Add/Create. */
export const UPGRADE_TO_ADD_WORKSPACES_LABEL = 'Upgrade to add more workspaces';
export const UPGRADE_TO_ADD_DATASOURCES_LABEL = 'Upgrade to add more datasources';

/** Member-facing copy when billing is owned by the workspace owner. */
export const PLAN_MANAGED_BY_OWNER_COPY = "This workspace's plan is managed by the owner.";

/** Soft warn threshold for usage meters (contract: ≥80%). */
export const USAGE_SOFT_WARN_PCT = 80;
/** Hard / blocked threshold for usage meters (contract: 100%). */
export const USAGE_HARD_LIMIT_PCT = 100;

/** `limit < 0` (e.g. -1) means unlimited. */
export function isUnlimitedLimit(limit: number | null | undefined): boolean {
  return limit == null || limit < 0;
}

export function isResourceAtLimit(used: number, limit: number | null | undefined): boolean {
  if (isUnlimitedLimit(limit)) return false;
  return used >= (limit as number);
}

export function usagePct(used: number, limit: number | null | undefined): number {
  if (isUnlimitedLimit(limit) || (limit as number) === 0) return 0;
  return Math.min(100, Math.max(0, (used / (limit as number)) * 100));
}

export function isUsageSoftWarn(used: number, limit: number | null | undefined): boolean {
  const pct = usagePct(used, limit);
  return pct >= USAGE_SOFT_WARN_PCT && pct < USAGE_HARD_LIMIT_PCT;
}

export function isUsageHardLimit(used: number, limit: number | null | undefined): boolean {
  return usagePct(used, limit) >= USAGE_HARD_LIMIT_PCT;
}

export function isSeatsAtLimit(
  usage: {
    seats_used: number;
    seats_limit: number;
  } | null,
): boolean {
  if (!usage) return false;
  return isResourceAtLimit(usage.seats_used, usage.seats_limit);
}

export function isDatasourcesAtLimit(
  usage: {
    datasources_used: number;
    datasources_limit: number;
  } | null,
): boolean {
  if (!usage) return false;
  return isResourceAtLimit(usage.datasources_used, usage.datasources_limit);
}

export function isWorkspacesAtLimit(
  usage: {
    workspaces_used: number;
    workspaces_limit: number;
  } | null,
): boolean {
  if (!usage) return false;
  return isResourceAtLimit(usage.workspaces_used, usage.workspaces_limit);
}

export function isQueriesAtLimit(
  usage: {
    queries_used?: number;
    queries_limit?: number;
  } | null,
): boolean {
  if (!usage || usage.queries_used == null || usage.queries_limit == null) return false;
  return isResourceAtLimit(usage.queries_used, usage.queries_limit);
}

export function isCreditsAtLimit(
  usage: {
    credits_used?: number;
    credits_limit?: number;
  } | null,
): boolean {
  if (!usage || usage.credits_used == null || usage.credits_limit == null) return false;
  return isResourceAtLimit(usage.credits_used, usage.credits_limit);
}

export function isDailyCreditsAtLimit(
  usage: {
    daily_credits_used?: number;
    daily_credits_limit?: number;
  } | null,
): boolean {
  if (!usage || usage.daily_credits_used == null || usage.daily_credits_limit == null) {
    return false;
  }
  return isResourceAtLimit(usage.daily_credits_used, usage.daily_credits_limit);
}

export function isPlanExpired(
  usage: Pick<WorkspaceUsageResponse, 'plan_status'> | null | undefined,
): boolean {
  return usage?.plan_status === 'expired';
}

/** Trial flagged with trial_end in the past (or plan already expired). */
export function isTrialEnded(
  usage: Pick<WorkspaceUsageResponse, 'is_trial' | 'trial_end' | 'plan_status'> | null | undefined,
): boolean {
  if (!usage) return false;
  if (usage.plan_status === 'expired') return true;
  if (!usage.is_trial || !usage.trial_end) return false;
  const end = new Date(usage.trial_end);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() <= Date.now();
}

/** Whole days remaining until trial_end (ceil). Null when not applicable. */
export function trialDaysLeft(trialEnd: string | null | undefined): number | null {
  if (!trialEnd) return null;
  const end = new Date(trialEnd);
  if (Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export type ChatQuotaBlockReason =
  'plan_expired' | 'trial_ended' | 'credits' | 'daily_credits' | null;

/** Why chat is locked from workspace usage (UX only; backend still enforces). */
export function getChatQuotaBlockReason(
  usage: WorkspaceUsageResponse | null | undefined,
): ChatQuotaBlockReason {
  if (!usage) return null;
  if (isPlanExpired(usage)) return 'plan_expired';
  if (isTrialEnded(usage)) return 'trial_ended';
  if (isCreditsAtLimit(usage)) return 'credits';
  if (isDailyCreditsAtLimit(usage)) return 'daily_credits';
  return null;
}

/**
 * Pre-flight AI chat gate from workspace usage.
 * Does not check queries when queries_limit is unlimited (-1).
 */
export function canSendChat(usage: WorkspaceUsageResponse | null | undefined): boolean {
  return getChatQuotaBlockReason(usage) == null;
}

/** @deprecated Prefer canSendChat , kept as negation for existing call sites. */
export function isChatQuotaBlocked(usage: WorkspaceUsageResponse | null | undefined): boolean {
  return !canSendChat(usage);
}

export function workspaceLimitUpgradeMessage(
  role: WorkspaceRole | null | undefined,
  resource: 'seats' | 'datasources' | 'workspaces' | 'queries' | 'credits' | 'daily_credits',
): string {
  const labels = {
    seats: 'member seats',
    datasources: 'datasets',
    workspaces: 'workspaces',
    queries: 'monthly prompts',
    credits: 'credits',
    daily_credits: 'daily credits',
  } as const;
  if (resource === 'daily_credits') {
    return `This workspace has reached its daily credit limit.`;
  }
  if (canShowWorkspaceUpgradeCta(role)) {
    return `You've reached the ${labels[resource]} limit. Upgrade your plan for more.`;
  }
  return `This workspace has reached its ${labels[resource]} limit. ${PLAN_MANAGED_BY_OWNER_COPY}`;
}

export function resolveRoleFromContext(payload: {
  role?: WorkspaceRole;
  current_user_role?: WorkspaceRole;
  workspace?: { role?: WorkspaceRole };
}): WorkspaceRole | null {
  const candidate = payload.current_user_role ?? payload.role ?? payload.workspace?.role;
  return isWorkspaceRole(candidate) ? candidate : null;
}

export type WorkspaceOwnershipKind = 'owned' | 'shared';

type WorkspaceOwnershipFields = Pick<
  WorkspaceResponse,
  'role' | 'owner_id' | 'user_id' | 'tenant_id' | 'is_default' | 'members'
>;

/** Backend user UUID for the signed-in user, when discoverable from membership rows. */
export function resolveBackendUserId(
  workspaces: Pick<WorkspaceResponse, 'members'>[],
  firebaseUid: string | null | undefined,
  firebaseEmail?: string | null,
): string | null {
  for (const workspace of workspaces) {
    const self = workspace.members?.find((m) =>
      isWorkspaceMemberSelf(m, firebaseUid, firebaseEmail),
    );
    if (self?.user_id) return self.user_id;
  }
  return null;
}

/**
 * Resolve the signed-in user's role for a workspace.
 * Prefer explicit `role` from the API; otherwise match membership by Firebase uid/email.
 * Last resort: compare `owner_id` to the caller's backend user UUID (never Firebase uid).
 */
export function resolveCallerWorkspaceRole(
  workspace: Pick<WorkspaceResponse, 'role' | 'owner_id' | 'user_id' | 'members'>,
  firebaseUid: string | null | undefined,
  firebaseEmail?: string | null,
  backendUserId?: string | null,
): WorkspaceRole | null {
  if (isWorkspaceRole(workspace.role)) return workspace.role;

  const members = workspace.members;
  if (members?.length) {
    const self = members.find((m) => isWorkspaceMemberSelf(m, firebaseUid, firebaseEmail));
    if (self && isWorkspaceRole(self.role)) return self.role;
  }

  const ownerId = workspace.owner_id ?? workspace.user_id;
  if (backendUserId && ownerId) {
    return ownerId === backendUserId ? 'owner' : 'member';
  }

  return null;
}

/** True when the caller owns this workspace (role owner). */
export function isOwnedWorkspace(
  workspace: Pick<WorkspaceResponse, 'role' | 'owner_id' | 'user_id' | 'members'>,
  currentUserId: string | null | undefined,
  currentUserEmail?: string | null,
  backendUserId?: string | null,
): boolean {
  return (
    resolveCallerWorkspaceRole(workspace, currentUserId, currentUserEmail, backendUserId) ===
    'owner'
  );
}

/** Tenant of the caller's home/owned workspace when API returns `tenant_id`. */
export function resolveHomeTenantId(
  workspaces: WorkspaceOwnershipFields[],
  currentUserId: string | null | undefined,
  currentUserEmail?: string | null,
  backendUserId?: string | null,
): string | null {
  const owned = workspaces.filter((w) =>
    isOwnedWorkspace(w, currentUserId, currentUserEmail, backendUserId),
  );
  const preferred = owned.find((w) => w.is_default) ?? owned[0];
  return preferred?.tenant_id ?? null;
}

/**
 * Invited / other-tenant workspace.
 * Role is authoritative. Tenant mismatch is only used when home tenant is known from owned workspaces.
 * Unknown role is NOT treated as shared (avoids false positives when owner_id ≠ Firebase uid).
 */
export function isSharedWorkspace(
  workspace: Pick<WorkspaceResponse, 'tenant_id' | 'role' | 'owner_id' | 'user_id' | 'members'>,
  homeTenantId: string | null,
  currentUserId: string | null | undefined,
  currentUserEmail?: string | null,
  backendUserId?: string | null,
): boolean {
  const role = resolveCallerWorkspaceRole(
    workspace,
    currentUserId,
    currentUserEmail,
    backendUserId,
  );
  if (role === 'member') return true;
  if (role === 'owner') return false;

  if (homeTenantId && workspace.tenant_id) {
    return workspace.tenant_id !== homeTenantId;
  }

  return false;
}

export function getWorkspaceOwnershipKind(
  workspace: Pick<WorkspaceResponse, 'tenant_id' | 'role' | 'owner_id' | 'user_id' | 'members'>,
  homeTenantId: string | null,
  currentUserId: string | null | undefined,
  currentUserEmail?: string | null,
  backendUserId?: string | null,
): WorkspaceOwnershipKind {
  return isSharedWorkspace(workspace, homeTenantId, currentUserId, currentUserEmail, backendUserId)
    ? 'shared'
    : 'owned';
}

export function workspaceOwnershipLabel(kind: WorkspaceOwnershipKind): string {
  return kind === 'shared' ? 'Shared' : 'Yours';
}

/** Build ownership helpers once per workspaces list + signed-in user. */
export function createWorkspaceOwnershipHelper(
  workspaces: WorkspaceResponse[],
  firebaseUid: string | null | undefined,
  firebaseEmail?: string | null,
) {
  const backendUserId = resolveBackendUserId(workspaces, firebaseUid, firebaseEmail);
  const homeTenantId = resolveHomeTenantId(workspaces, firebaseUid, firebaseEmail, backendUserId);

  return {
    backendUserId,
    homeTenantId,
    /** Caller's role in a specific workspace (not the currently active one). */
    role(workspace: WorkspaceResponse): WorkspaceRole | null {
      return resolveCallerWorkspaceRole(workspace, firebaseUid, firebaseEmail, backendUserId);
    },
    kind(workspace: WorkspaceResponse): WorkspaceOwnershipKind {
      return getWorkspaceOwnershipKind(
        workspace,
        homeTenantId,
        firebaseUid,
        firebaseEmail,
        backendUserId,
      );
    },
    isShared(workspace: WorkspaceResponse): boolean {
      return isSharedWorkspace(workspace, homeTenantId, firebaseUid, firebaseEmail, backendUserId);
    },
  };
}

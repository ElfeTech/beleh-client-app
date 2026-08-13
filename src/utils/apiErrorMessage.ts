import type { DataSourceResponse, QuotaExceededDetail, QuotaLimitType } from '../types/api';

function messageFromRecord(obj: Record<string, unknown>): string | null {
  for (const key of ['message', 'error', 'reason', 'msg', 'description', 'detail']) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

const QUOTA_LIMIT_TYPES = new Set<string>([
  'queries',
  'credits',
  'daily_credits',
  'datasets',
  'members_per_workspace',
  'workspaces',
]);

function asQuotaLimitType(value: unknown): QuotaLimitType | null {
  return typeof value === 'string' && QUOTA_LIMIT_TYPES.has(value)
    ? (value as QuotaLimitType)
    : null;
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Parse nested FastAPI `detail` when error is `quota_exceeded`. */
export function extractQuotaExceededDetail(data: unknown): QuotaExceededDetail | null {
  if (data == null || typeof data !== 'object') return null;
  const body = data as Record<string, unknown>;

  const candidates: unknown[] = [body.detail, body];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const record = candidate as Record<string, unknown>;
    const error = record.error;
    const limitType = asQuotaLimitType(record.limit_type);
    if (error !== 'quota_exceeded' || !limitType) continue;
    return {
      error: 'quota_exceeded',
      limit_type: limitType,
      current_usage: numberOrZero(record.current_usage),
      limit: numberOrZero(record.limit),
      remaining: numberOrZero(record.remaining),
      reset_at: stringOrNull(record.reset_at),
      message: stringOrNull(record.message) ?? undefined,
      upgrade_url: stringOrNull(record.upgrade_url),
    };
  }
  return null;
}

/**
 * Extract a human-readable message from FastAPI / API error JSON bodies.
 */
export function extractApiErrorDetail(data: unknown): string | null {
  if (data == null) return null;

  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (typeof data !== 'object') return null;

  const body = data as Record<string, unknown>;
  const topLevel = messageFromRecord(body);
  if (topLevel) return topLevel;

  const detail = body.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string' && item.trim()) return item.trim();
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return messageFromRecord(record);
        }
        return null;
      })
      .filter((part): part is string => Boolean(part));
    if (parts.length > 0) return parts.join('; ');
  }

  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const fromDetail = messageFromRecord(detail as Record<string, unknown>);
    if (fromDetail) return fromDetail;
  }

  return null;
}

export function extractApiErrorCode(data: unknown): string | null {
  if (data == null || typeof data !== 'object') return null;
  const code = (data as Record<string, unknown>).code;
  return typeof code === 'string' && code.trim() ? code.trim() : null;
}

export function formatApiErrorMessage(data: unknown, status?: number): string {
  const detail = extractApiErrorDetail(data);
  if (detail) return detail;
  if (status === 410) {
    return 'This invite has expired or been revoked. Request a new invite.';
  }
  if (status != null) return `HTTP error! status: ${status}`;
  return 'Request failed';
}

/** Friendly toast copy for stable provider error codes. */
export function formatProviderErrorToast(code: string | null | undefined, detail: string): string {
  switch (code) {
    case 'PROVIDER_NOT_CONFIGURED':
      return 'Supabase OAuth is not configured on the server.';
    case 'PROVIDER_STATE_INVALID':
      return 'OAuth session expired. Please try connecting again.';
    case 'PROVIDER_TOKEN_EXCHANGE_FAILED':
      return 'Could not complete Supabase authorization.';
    case 'PROVIDER_CONNECTION_NOT_FOUND':
      return 'Organization connection lost. Please reconnect.';
    case 'PROVIDER_ORG_MISMATCH':
      return 'Organization does not match this connection.';
    case 'PROVIDER_PROJECT_NOT_FOUND':
      return 'That project is no longer visible; try refreshing.';
    case 'PROVIDER_PROJECT_INACTIVE':
      return 'That project is not active and cannot be connected.';
    case 'PROVIDER_FORBIDDEN':
      return 'You do not have permission for this action.';
    case 'PROVIDER_WORKSPACE_NOT_FOUND':
      return 'Workspace not found or you are no longer a member.';
    case 'PROVIDER_RATE_LIMITED':
      return 'Too many requests. Please wait a moment and try again.';
    case 'PROVIDER_CREDENTIALS_DISABLED':
      return 'Provider credentials are disabled for this environment.';
    case 'PROVIDER_ANON_KEY_UNAVAILABLE':
      return 'This project has no anon key available.';
    default:
      return detail;
  }
}

/** Friendly toast copy for stable billing error codes. */
export function formatBillingErrorToast(code: string | null | undefined, detail: string): string {
  switch (code) {
    case 'BILLING_NOT_CONFIGURED':
      return 'Billing is not configured on the server. Please try again later.';
    case 'BILLING_INVALID_PRICE':
      return 'That plan price is no longer available. Refresh and try again.';
    case 'BILLING_CHECKOUT_FAILED':
      return 'Could not start checkout. Please try again.';
    case 'BILLING_PORTAL_FAILED':
      return 'Could not open the billing portal. Please try again.';
    default:
      return detail;
  }
}

export class ApiRequestError extends Error {
  readonly status?: number;
  readonly code: string | null;
  readonly detail: string;

  constructor(message: string, options?: { status?: number; code?: string | null }) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options?.status;
    this.code = options?.code ?? null;
    this.detail = message;
  }
}

/** HTTP 429 / stream QUOTA_EXCEEDED with structured limit payload. */
export class QuotaExceededError extends ApiRequestError {
  readonly quota: QuotaExceededDetail;

  constructor(quota: QuotaExceededDetail, status = 429) {
    const message =
      quota.message?.trim() || `Plan limit reached for ${quota.limit_type.replaceAll('_', ' ')}.`;
    super(message, { status, code: 'quota_exceeded' });
    this.name = 'QuotaExceededError';
    this.quota = quota;
  }
}

/** Build a QuotaExceededError from stream/run failure payloads. */
export function quotaExceededFromStreamError(payload: {
  code?: string;
  error_code?: string;
  detail?: string;
  message?: string;
  limit_type?: string;
  current_usage?: number;
  limit?: number;
  remaining?: number;
  reset_at?: string | null;
  upgrade_url?: string | null;
}): QuotaExceededError | null {
  const code = (payload.code ?? payload.error_code ?? '').toUpperCase();
  const limitType = asQuotaLimitType(payload.limit_type);
  if (code !== 'QUOTA_EXCEEDED' && !limitType) return null;

  return new QuotaExceededError({
    error: 'quota_exceeded',
    // AI stream failures without a typed limit default to period credits (not queries).
    limit_type: limitType ?? 'credits',
    current_usage: numberOrZero(payload.current_usage),
    limit: numberOrZero(payload.limit),
    remaining: numberOrZero(payload.remaining),
    reset_at: stringOrNull(payload.reset_at),
    message: stringOrNull(payload.message) ?? stringOrNull(payload.detail) ?? undefined,
    upgrade_url: stringOrNull(payload.upgrade_url),
  });
}

export function isQuotaExceededError(error: unknown): error is QuotaExceededError {
  return error instanceof QuotaExceededError;
}

/** True when fetch was cancelled via AbortController (do not surface as a UI error). */
export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError'
  );
}

/** User-facing copy for dataset / connector delete failures. */
export function formatResourceDeleteError(
  error: unknown,
  resourceLabel: 'dataset' | 'connector' = 'dataset',
): string {
  const fallback = `Failed to delete ${resourceLabel}. Please try again.`;
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return `You don't have permission to delete this ${resourceLabel}.`;
    }
    if (error.status === 404) {
      return `${resourceLabel === 'dataset' ? 'Dataset' : 'Connector'} not found.`;
    }
    if (error.message.trim()) return error.message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

/** User-facing copy for invitation accept / create failures. */
export function formatInvitationErrorToast(
  error: unknown,
  fallback = 'Could not process invitation.',
): string {
  if (error instanceof QuotaExceededError) {
    return error.message;
  }
  if (error instanceof ApiRequestError) {
    if (error.status === 410) {
      return 'This invite has expired or been revoked. Request a new invite.';
    }
    if (error.status === 429 || error.code === 'quota_exceeded') {
      return error.message;
    }
    if (error.status === 400) {
      const lower = error.message.toLowerCase();
      if (lower.includes('full') || lower.includes('seat') || lower.includes('quota')) {
        return 'This workspace is full. Ask the owner to upgrade or free a seat.';
      }
      if (lower.includes('already') || lower.includes('duplicate') || lower.includes('member')) {
        return error.message;
      }
    }
    return error.message || fallback;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

/**
 * Best-effort message when a datasource finishes with status FAILED.
 */
export function extractDatasourceError(dataset: DataSourceResponse): string | null {
  if (dataset.ingestion_error?.trim()) {
    return dataset.ingestion_error.trim();
  }

  const meta = dataset.metadata_json;
  if (!meta) return null;

  const metaRecord = meta as Record<string, unknown>;
  const metaMessage = messageFromRecord(metaRecord);
  if (metaMessage) return metaMessage;

  const validation = meta.validation_result;
  if (validation?.message?.trim()) {
    return validation.message.trim();
  }

  const sheetMessages =
    validation?.sheets
      ?.filter((sheet) => sheet.status === 'invalid')
      .map((sheet) => {
        if (sheet.reason?.trim()) return sheet.reason.trim();
        if (sheet.issues?.length) return sheet.issues.join(', ');
        return null;
      })
      .filter((msg): msg is string => Boolean(msg)) ?? [];

  if (sheetMessages.length > 0) {
    return sheetMessages.join('; ');
  }

  return null;
}

export function formatDatasourceError(
  dataset: DataSourceResponse,
  fallback = 'Dataset processing failed',
): string {
  return extractDatasourceError(dataset) ?? fallback;
}

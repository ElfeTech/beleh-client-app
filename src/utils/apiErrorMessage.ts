import type { DataSourceResponse } from '../types/api';

function messageFromRecord(obj: Record<string, unknown>): string | null {
  for (const key of ['message', 'error', 'reason', 'msg', 'description', 'detail']) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
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
  return (
    extractApiErrorDetail(data) ??
    (status != null ? `HTTP error! status: ${status}` : 'Request failed')
  );
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

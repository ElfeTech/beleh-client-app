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

export function formatApiErrorMessage(data: unknown, status?: number): string {
  return (
    extractApiErrorDetail(data) ??
    (status != null ? `HTTP error! status: ${status}` : 'Request failed')
  );
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
  fallback = 'Dataset processing failed'
): string {
  return extractDatasourceError(dataset) ?? fallback;
}

import type { ConnectorResponse, ConnectorTablesResponse } from '../types/api';
import { isSchemaSyncInProgress } from '../lib/providerBind';
import { apiClient } from '../services/apiClient';

export type ConnectorSyncOutcome = 'completed' | 'failed' | 'timeout' | 'cancelled' | 'none';

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED']);
/** Bind starts the crawl; poll every 1–2s for up to ~60s. */
const POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function pickTargets(list: ConnectorResponse[], connectorId?: string): ConnectorResponse[] {
  if (connectorId) return list.filter((c) => c.id === connectorId);
  return list.filter((c) => isSchemaSyncInProgress(c.metadata_status));
}

function outcomeFromTargets(targets: ConnectorResponse[]): ConnectorSyncOutcome | null {
  if (targets.length === 0) return null;
  if (!targets.every((c) => TERMINAL_STATUSES.has(c.metadata_status))) return null;
  return targets.some((c) => c.metadata_status === 'FAILED') ? 'failed' : 'completed';
}

export interface PollConnectorSyncOptions {
  connectorId?: string;
  timeoutMs?: number;
  /** Return true to stop polling (e.g. component unmounted / workspace switched). */
  isCancelled?: () => boolean;
  /**
   * After a Supabase bind the companion may not be in the list on the first
   * refresh. Keep polling until it appears or we time out instead of returning
   * `none` immediately.
   */
  waitForCompanion?: boolean;
}

/**
 * Poll the connector list until schema sync settles for the target connector
 * (or every still-syncing connector when no id is given).
 *
 * Keeps the sidebar/catalog pills in sync with the backend after a connect —
 * without it a connector shows "Syncing" until the next manual refresh.
 *
 * Do not POST /sync from this helper: bind/create already starts the crawl.
 */
export async function pollConnectorSyncUntilSettled(
  refreshConnectors: (options?: { silent?: boolean }) => Promise<ConnectorResponse[]>,
  options?: PollConnectorSyncOptions,
): Promise<ConnectorSyncOutcome> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();
  const waitForCompanion = Boolean(options?.waitForCompanion || options?.connectorId);

  // Initial snapshot so a connector that is already settled returns immediately.
  let list = await refreshConnectors({ silent: true });
  while (!options?.isCancelled?.()) {
    const targets = pickTargets(list, options?.connectorId);
    const settled = outcomeFromTargets(targets);
    if (settled) return settled;

    const missing = targets.length === 0;
    if (missing && !waitForCompanion) return 'none';
    if (Date.now() - started >= timeoutMs) return missing ? 'none' : 'timeout';

    await sleep(POLL_INTERVAL_MS);
    list = await refreshConnectors({ silent: true });
  }
  return 'cancelled';
}

/**
 * Poll GET .../tables until metadata_status is terminal. Bind already started
 * the crawl — this must not call /sync.
 */
export async function waitForConnectorSchema(
  token: string,
  workspaceId: string,
  connectorId: string,
  options?: {
    timeoutMs?: number;
    isCancelled?: () => boolean;
  },
): Promise<ConnectorTablesResponse> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();

  for (;;) {
    if (options?.isCancelled?.()) {
      throw new Error('Schema sync cancelled');
    }
    const res = await apiClient.listConnectorTables(token, workspaceId, connectorId, {
      page: 1,
      page_size: 1,
    });
    if (res.metadata_status === 'COMPLETED') return res;
    if (res.metadata_status === 'FAILED') {
      throw new Error(res.schema_sync_error || 'Schema sync failed');
    }
    if (Date.now() - started >= timeoutMs) {
      throw new Error('Schema sync timed out');
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

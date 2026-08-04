import type {
  ConnectorResponse,
  DataSourceResponse,
  WorkspaceDemoConnectResponse,
  WorkspaceDemoStatus,
  WorkspaceUsageResponse,
} from '../types/api';
import { apiClient } from '../services/apiClient';
import { ApiRequestError, isQuotaExceededError } from '../utils/apiErrorMessage';
import { formatQuotaExceededMessage } from '../utils/quotaExceededUi';
import { isDatasourcesAtLimit } from '../utils/workspaceAccess';

const POLL_MS = 2000;
const POLL_MAX_MS = 90_000;

const DEMO_COPY_PREFIX = 'beleh_demo_copy:';

export type DemoOnboardingCopy = {
  headline: string;
  message: string;
  suggested_prompts: string[];
};

export function isDemoDatasource(
  ds: Pick<DataSourceResponse, 'is_demo'> | null | undefined,
): boolean {
  return Boolean(ds?.is_demo);
}

/** Live = real user data (not the Free-trial sample). */
export function hasLiveSources(
  datasources: DataSourceResponse[],
  connectors: ConnectorResponse[],
): boolean {
  const liveDs = datasources.some((d) => !isDemoDatasource(d));
  return liveDs || connectors.length > 0;
}

export function isFreeTrialUsage(
  usage: Pick<WorkspaceUsageResponse, 'plan_tier' | 'plan_status'> | null | undefined,
): boolean {
  if (!usage) return false;
  const tier = (usage.plan_tier ?? '').toLowerCase();
  return tier === 'free' && usage.plan_status === 'trial';
}

/**
 * Dual CTA eligibility: not connected, no live sources, free trial.
 */
export function canShowDemoOnboardingCta(options: {
  demoStatus: WorkspaceDemoStatus | null;
  datasources: DataSourceResponse[];
  connectors: ConnectorResponse[];
  usage: WorkspaceUsageResponse | null;
}): boolean {
  const { demoStatus, datasources, connectors, usage } = options;
  if (!demoStatus || demoStatus.connected) return false;
  if (hasLiveSources(datasources, connectors)) return false;
  return isFreeTrialUsage(usage);
}

export function findDemoDatasource(
  datasources: DataSourceResponse[],
): DataSourceResponse | undefined {
  return datasources.find((d) => isDemoDatasource(d) && d.status === 'READY');
}

function demoCopyKey(workspaceId: string): string {
  return `${DEMO_COPY_PREFIX}${workspaceId}`;
}

export function persistDemoCopy(workspaceId: string, copy: DemoOnboardingCopy): void {
  try {
    sessionStorage.setItem(demoCopyKey(workspaceId), JSON.stringify(copy));
  } catch {
    /* private mode */
  }
}

export function readDemoCopy(workspaceId: string): DemoOnboardingCopy | null {
  try {
    const raw = sessionStorage.getItem(demoCopyKey(workspaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoOnboardingCopy;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      headline: parsed.headline || 'Explore sample data',
      message: parsed.message || 'Ask questions about the sample dataset.',
      suggested_prompts: Array.isArray(parsed.suggested_prompts) ? parsed.suggested_prompts : [],
    };
  } catch {
    return null;
  }
}

export function clearDemoCopy(workspaceId: string): void {
  try {
    sessionStorage.removeItem(demoCopyKey(workspaceId));
  } catch {
    /* ignore */
  }
}

export function copyFromConnectResponse(res: WorkspaceDemoConnectResponse): DemoOnboardingCopy {
  return {
    headline: res.headline?.trim() || 'Explore sample data',
    message: res.message?.trim() || 'Ask questions about the sample dataset.',
    suggested_prompts: res.suggested_prompts ?? [],
  };
}

export function copyFromDemoStatus(status: WorkspaceDemoStatus): DemoOnboardingCopy | null {
  if (!status.connected) return null;
  const prompts = status.suggested_prompts;
  if (!status.headline && !status.message && (!prompts || prompts.length === 0)) {
    return null;
  }
  return {
    headline: status.headline?.trim() || 'Explore sample data',
    message: status.message?.trim() || 'Ask questions about the sample dataset.',
    suggested_prompts: prompts ?? [],
  };
}

async function pollDatasourceReady(
  token: string,
  datasourceId: string,
  signal?: AbortSignal,
): Promise<DataSourceResponse> {
  const deadline = Date.now() + POLL_MAX_MS;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const ds = await apiClient.getDatasource(token, datasourceId);
    if (ds.status === 'READY') return ds;
    if (ds.status === 'FAILED') {
      throw new Error(ds.ingestion_error?.trim() || 'Sample data failed to prepare.');
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error('Timed out waiting for sample data. Please try again.');
}

export type ConnectDemoResult = {
  datasource: DataSourceResponse;
  copy: DemoOnboardingCopy;
  already_connected: boolean;
};

/**
 * POST /demo/connect and poll until READY.
 */
export async function connectAndWaitReady(
  token: string,
  workspaceId: string,
  options?: {
    usage?: WorkspaceUsageResponse | null;
    signal?: AbortSignal;
  },
): Promise<ConnectDemoResult> {
  if (isDatasourcesAtLimit(options?.usage ?? null)) {
    throw new ApiRequestError('Plan limit reached for datasets.', {
      status: 429,
      code: 'quota_exceeded',
    });
  }

  const connected = await apiClient.connectWorkspaceDemo(token, workspaceId);
  let datasource = connected.datasource;

  if (datasource.status !== 'READY') {
    datasource = await pollDatasourceReady(token, datasource.id, options?.signal);
  }

  const copy = copyFromConnectResponse({ ...connected, datasource });
  persistDemoCopy(workspaceId, copy);

  return {
    datasource,
    copy,
    already_connected: connected.already_connected,
  };
}

export async function leaveWorkspaceDemo(token: string, workspaceId: string): Promise<void> {
  try {
    await apiClient.deleteWorkspaceDemo(token, workspaceId);
  } catch (err) {
    // Idempotent: already gone
    if (err instanceof ApiRequestError && err.status === 404) return;
    throw err;
  } finally {
    clearDemoCopy(workspaceId);
  }
}

/** After a live source is added: drop demo if still present. */
export async function ensureDemoRemovedAfterLiveSource(
  token: string,
  workspaceId: string,
  datasources: DataSourceResponse[],
): Promise<boolean> {
  const stillHasDemo = datasources.some((d) => isDemoDatasource(d));
  if (!stillHasDemo) {
    clearDemoCopy(workspaceId);
    return false;
  }
  await leaveWorkspaceDemo(token, workspaceId);
  return true;
}

export function formatDemoConnectError(err: unknown, role?: 'owner' | 'member' | null): string {
  if (isQuotaExceededError(err)) {
    return formatQuotaExceededMessage(err, role);
  }
  if (err instanceof ApiRequestError) {
    if (err.status === 403) {
      return err.message || 'Sample data is only available during the Free trial.';
    }
    if (err.status === 409) {
      return err.message || 'Your workspace already has live data. Sample data is unavailable.';
    }
    if (err.status === 503) {
      return err.message || 'Sample data is temporarily unavailable. Please try again later.';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Could not start sample data.';
}

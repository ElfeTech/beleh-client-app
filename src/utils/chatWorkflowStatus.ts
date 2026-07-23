import type { AssistantTurnResponse, UiArtifact } from '../types/api';
import {
  asChartData,
  asErrorData,
  asInsightData,
  asKpiData,
  asTableData,
  isChartArtifactType,
} from './artifactAdapters';

export interface WorkflowFailureInfo {
  title: string;
  detail: string;
  canRetry: boolean;
}

function findErrorArtifact(artifacts: UiArtifact[]): UiArtifact | undefined {
  return artifacts.find((a) => a.type === 'error');
}

function hasUsableSuccessContent(response: AssistantTurnResponse): boolean {
  const text = response.text?.trim() ?? '';
  if (text) return true;

  for (const a of response.artifacts ?? []) {
    if (a.type === 'kpi') {
      if (asKpiData(a.data).metrics.length > 0) return true;
      continue;
    }
    if (a.type === 'insight') {
      if (asInsightData(a.data).bullets.length > 0) return true;
      continue;
    }
    if (a.type === 'table') {
      const t = asTableData(a.data);
      if (t.columns.length > 0 && t.rows.length > 0) return true;
      continue;
    }
    if (isChartArtifactType(a.type)) {
      const c = asChartData(a.data);
      if (c.labels.length > 0 && c.datasets.length > 0) return true;
    }
  }
  return false;
}

export function getWorkflowFailure(response: AssistantTurnResponse): WorkflowFailureInfo | null {
  const artifacts = response.artifacts ?? [];
  const errorArt = findErrorArtifact(artifacts);

  // Partial multi-panel failure: keep rendering when other panels succeeded.
  if (errorArt && hasUsableSuccessContent(response)) {
    return null;
  }

  if (errorArt) {
    const { message } = asErrorData(errorArt.data);
    return {
      title: errorArt.title || 'Analysis could not be completed',
      detail: message || 'The query failed on the server. Check your data source and try again.',
      canRetry: true,
    };
  }

  const text = response.text?.trim() ?? '';
  const usable = artifacts.filter((a) => a.type !== 'error');
  if (!text && usable.length === 0) {
    return {
      title: 'No response from analysis',
      detail:
        'The server returned an empty result. Your question may need a different wording or data source.',
      canRetry: true,
    };
  }

  return null;
}

export function formatChatRequestError(err: unknown): WorkflowFailureInfo {
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (msg.includes('Authentication') || msg.includes('sign in')) {
      return {
        title: 'Session expired',
        detail: msg,
        canRetry: false,
      };
    }
    return {
      title: 'Request failed',
      detail: msg || 'Something went wrong while contacting the server.',
      canRetry: true,
    };
  }
  return {
    title: 'Request failed',
    detail: 'Something went wrong. Please check your connection and try again.',
    canRetry: true,
  };
}

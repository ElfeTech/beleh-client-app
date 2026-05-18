import type { ChatWorkflowResponse } from '../types/api';

export interface WorkflowFailureInfo {
  title: string;
  detail: string;
  canRetry: boolean;
}

export function getWorkflowFailure(response: ChatWorkflowResponse): WorkflowFailureInfo | null {
  const execution = response.execution;
  const status = execution?.status?.toUpperCase();

  if (status === 'FAILED' || status === 'ERROR') {
    return {
      title: 'Analysis could not be completed',
      detail:
        execution?.message?.trim() ||
        'The query failed on the server. Check your data source and try again.',
      canRetry: true,
    };
  }

  if (response.intent?.clarification_needed && response.intent.clarification_message) {
    return null;
  }

  const rowCount = execution?.row_count ?? 0;
  const hasRows = Array.isArray(execution?.rows) && execution.rows.length > 0;
  const hasVisualization = Boolean(response.visualization);
  const summary = response.insight?.summary?.trim();

  if (!hasVisualization && !hasRows && rowCount === 0 && !summary) {
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

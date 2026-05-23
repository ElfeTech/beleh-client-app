import type { ChatWorkflowResponse } from '../../types/api';
import { getResponseViewAvailability } from '../../utils/responseViewAvailability';
import './ChartVisualization.css';

interface ChartVisualizationProps {
  response: ChatWorkflowResponse;
}

/** Legacy/error/clarification-only visualization shell */
export function ChartVisualization({ response }: ChartVisualizationProps) {
  const { execution, intent } = response;
  const hasResults = execution && execution.row_count > 0;
  const needsClarification = intent?.clarification_needed && intent.clarification_message;
  const isExecutionFailed = execution?.status === 'FAILED' || execution?.status === 'ERROR';
  const availability = getResponseViewAvailability(response);

  if (availability.availableViews.length > 0) {
    return null;
  }

  if (needsClarification && (!hasResults || isExecutionFailed)) {
    return (
      <p className="message-plain message-plain--assistant leading-relaxed">
        {intent?.clarification_message}
      </p>
    );
  }

  if (execution && execution.status === 'FAILED' && execution.message) {
    return (
      <p className="message-plain message-plain--assistant leading-relaxed text-[color:var(--error)]">
        {execution.message}
      </p>
    );
  }

  return null;
}

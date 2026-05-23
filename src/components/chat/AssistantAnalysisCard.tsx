import { Clock, Database, Sparkles } from 'lucide-react';
import type { ChatWorkflowResponse } from '../../types/api';
import { getResponseViewAvailability } from '../../utils/responseViewAvailability';
import { ResponseViewTabs } from './ResponseViewTabs';
import './AssistantAnalysisCard.css';

interface AssistantAnalysisCardProps {
  response: ChatWorkflowResponse;
  summary: string;
  timestamp: Date;
  schemaTarget?: string | null;
}

export function AssistantAnalysisCard({
  response,
  summary,
  timestamp,
  schemaTarget,
}: AssistantAnalysisCardProps) {
  const { execution, intent } = response;
  const availability = getResponseViewAvailability(response);
  const needsClarification = intent?.clarification_needed && intent.clarification_message;
  const hasResults = (execution?.row_count ?? 0) > 0;

  const timeLabel = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <article className="assistant-analysis-card">
      <header className="assistant-analysis-card__header">
        <div className="assistant-analysis-card__avatar">
          <Sparkles className="h-4 w-4" strokeWidth={2} />
        </div>
        <div>
          <p className="assistant-analysis-card__title">Beleh AI Analyst</p>
          <p className="assistant-analysis-card__time">{timeLabel}</p>
        </div>
      </header>

      {summary ? <p className="assistant-analysis-card__summary">{summary}</p> : null}

      {execution && (execution.execution_time_ms != null || execution.row_count != null) ? (
        <div className="assistant-analysis-card__metrics">
          {execution.execution_time_ms != null ? (
            <span className="assistant-analysis-card__metric">
              <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              VPC execution: <strong>{execution.execution_time_ms.toFixed(1)}ms</strong>
            </span>
          ) : null}
          {execution.row_count != null ? (
            <span className="assistant-analysis-card__metric">
              <Database className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Rows scanned: <strong>{execution.row_count.toLocaleString()}</strong>
            </span>
          ) : null}
        </div>
      ) : null}

      {needsClarification && hasResults ? (
        <div className="assistant-analysis-card__clarification">
          <Sparkles
            className="h-4 w-4 shrink-0 text-[color:var(--accent-teal-500)]"
            strokeWidth={2}
          />
          <p>{intent.clarification_message}</p>
        </div>
      ) : null}

      {availability.availableViews.length > 0 ? (
        <ResponseViewTabs response={response} schemaTarget={schemaTarget} />
      ) : null}
    </article>
  );
}

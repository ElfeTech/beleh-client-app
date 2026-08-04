import { useState } from 'react';
import { Clock, Database, Sparkles } from 'lucide-react';
import type { AssistantTurnMeta, UiArtifact } from '../../types/api';
import { findPanelViewArtifacts } from '../../utils/artifactAdapters';
import { getPanelCount, getResponseViewAvailability } from '../../utils/responseViewAvailability';
import { ResponseViewTabs } from './ResponseViewTabs';
import { ArtifactRenderer, DATA_VIEW_ARTIFACT_TYPES } from './artifacts/artifactRegistry';
import { ArtifactPanelGrid } from './artifacts/ArtifactPanelGrid';
import { CopyTextButton } from './CopyTextButton';
import './AssistantAnalysisCard.css';
import './artifacts/artifacts.css';
import { MarkdownText } from '../MarkdownText';

interface AssistantAnalysisCardProps {
  text: string;
  artifacts: UiArtifact[];
  meta?: AssistantTurnMeta;
  timestamp: Date;
  onAsk?: (prompt: string) => void;
  disabled?: boolean;
}

export function AssistantAnalysisCard({
  text,
  artifacts,
  meta,
  timestamp,
  onAsk,
  disabled,
}: Readonly<AssistantAnalysisCardProps>) {
  const availability = getResponseViewAvailability(artifacts);
  const panelCount = getPanelCount(meta);
  const isMultiPanel = panelCount > 1 || availability.charts.length > 1;
  const panelViewArtifacts = isMultiPanel ? findPanelViewArtifacts(artifacts) : [];
  const hasDataViews = isMultiPanel
    ? panelViewArtifacts.length > 0
    : availability.availableViews.length > 0;
  const [filterValue, setFilterValue] = useState<string | null>(null);

  const timeLabel = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const panelErrorIds = new Set(
    isMultiPanel ? panelViewArtifacts.filter((a) => a.type === 'error').map((a) => a.id) : [],
  );

  const peripheral = artifacts.filter((a) => {
    if (DATA_VIEW_ARTIFACT_TYPES.has(a.type) && hasDataViews) return false;
    if (a.type === 'action_group') return false; // shown under message via SuggestedPrompts
    // Panel errors render in ArtifactPanelGrid; avoid duplicating them here.
    // Full-turn-only failures never reach this card (handled by getWorkflowFailure).
    if (a.type === 'error' && panelErrorIds.has(a.id)) return false;
    return true;
  });

  const kpiAndFilters = peripheral.filter((a) => a.type === 'kpi' || a.type === 'filter_bar');
  const afterViews = peripheral.filter((a) => a.type !== 'kpi' && a.type !== 'filter_bar');

  const context = {
    onAsk,
    disabled,
    filterValue,
    onFilterChange: setFilterValue,
    skipDataViews: hasDataViews,
  };

  return (
    <article className="assistant-analysis-card">
      <header className="assistant-analysis-card__header">
        <div className="assistant-analysis-card__avatar">
          <Sparkles className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="assistant-analysis-card__header-text">
          <p className="assistant-analysis-card__title">Beleh AI Analyst</p>
          <p className="assistant-analysis-card__time">{timeLabel}</p>
        </div>
        {text.trim() ? (
          <CopyTextButton text={text} label="response" className="assistant-analysis-card__copy" />
        ) : null}
      </header>

      {meta && (meta.latency_ms != null || meta.row_count != null) ? (
        <div className="assistant-analysis-card__metrics">
          {meta.latency_ms != null ? (
            <span className="assistant-analysis-card__metric">
              <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Execution Time: <strong>{(Number(meta.latency_ms) / 1000).toFixed(1)}s</strong>
            </span>
          ) : null}
          {meta.row_count != null ? (
            <span className="assistant-analysis-card__metric">
              <Database className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Rows scanned: <strong>{Number(meta.row_count).toLocaleString()}</strong>
            </span>
          ) : null}
        </div>
      ) : null}

      {kpiAndFilters.length > 0 ? (
        <div className="artifact-stack">
          {kpiAndFilters.map((a) => (
            <ArtifactRenderer key={a.id} artifact={a} context={context} />
          ))}
        </div>
      ) : null}

      {isMultiPanel && panelViewArtifacts.length > 0 ? (
        <ArtifactPanelGrid
          artifacts={panelViewArtifacts}
          multiColumn={panelCount > 1 || availability.charts.length > 1}
        />
      ) : null}

      {!isMultiPanel && hasDataViews ? (
        <ResponseViewTabs artifacts={artifacts} filterValue={filterValue} />
      ) : null}

      {meta?.viz_notes && meta.viz_notes.length > 0 ? (
        <ul className="assistant-analysis-card__viz-notes" aria-label="Visualization notes">
          {meta.viz_notes.map((note, i) => (
            <li key={`${i}-${note.slice(0, 24)}`}>{note}</li>
          ))}
        </ul>
      ) : null}

      {text ? (
        <div className="assistant-analysis-card__summary">
          <MarkdownText>{text}</MarkdownText>
        </div>
      ) : null}

      {afterViews.length > 0 ? (
        <div className="artifact-stack">
          {afterViews.map((a) => (
            <ArtifactRenderer key={a.id} artifact={a} context={context} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

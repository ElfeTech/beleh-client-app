import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Sparkles } from 'lucide-react';
import type { AssistantTurnMeta, UiArtifact } from '../../types/api';
import { findPanelViewArtifacts } from '../../utils/artifactAdapters';
import { getPanelCount, getResponseViewAvailability } from '../../utils/responseViewAvailability';
import { stripVizNotesFromText, uniqueVizNotes } from '../../utils/vizNotes';
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
  /** Cascade sections in one after another (used for the first-run overview). */
  staged?: boolean;
}

export function AssistantAnalysisCard({
  text,
  artifacts,
  meta,
  timestamp,
  onAsk,
  disabled,
  staged = false,
}: Readonly<AssistantAnalysisCardProps>) {
  const availability = getResponseViewAvailability(artifacts);
  const panelCount = getPanelCount(meta);
  const isMultiPanel = panelCount > 1 || availability.charts.length > 1;
  const panelViewArtifacts = isMultiPanel ? findPanelViewArtifacts(artifacts) : [];
  const hasDataViews = isMultiPanel
    ? panelViewArtifacts.length > 0
    : availability.availableViews.length > 0;
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const summaryText = useMemo(
    () => stripVizNotesFromText(text, uniqueVizNotes(meta?.viz_notes)),
    [meta?.viz_notes, text],
  );

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

  const filters = peripheral.filter((a) => a.type === 'filter_bar');
  const kpis = peripheral.filter((a) => a.type === 'kpi');
  const afterViews = peripheral.filter((a) => a.type !== 'kpi' && a.type !== 'filter_bar');

  /** Staggered fade/slide-in for the first-run overview; a no-op wrapper otherwise. */
  const reveal = (step: number) =>
    staged
      ? {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: 0.2 + step * 0.35, ease: 'easeOut' as const },
        }
      : {};

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
        {summaryText ? (
          <CopyTextButton
            text={summaryText}
            label="response"
            className="assistant-analysis-card__copy"
          />
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
        </div>
      ) : null}

      {summaryText ? (
        <motion.div className="assistant-analysis-card__summary" {...reveal(0)}>
          <MarkdownText>{summaryText}</MarkdownText>
        </motion.div>
      ) : null}

      {filters.length > 0 ? (
        <div className="artifact-stack artifact-stack--filters">
          {filters.map((a) => (
            <ArtifactRenderer key={a.id} artifact={a} context={context} />
          ))}
        </div>
      ) : null}

      {isMultiPanel && panelViewArtifacts.length > 0 ? (
        <motion.div {...reveal(1)}>
          <ArtifactPanelGrid
            artifacts={panelViewArtifacts}
            multiColumn={panelCount > 1 || availability.charts.length > 1}
          />
        </motion.div>
      ) : null}

      {!isMultiPanel && hasDataViews ? (
        <motion.div {...reveal(1)}>
          <ResponseViewTabs artifacts={artifacts} filterValue={filterValue} />
        </motion.div>
      ) : null}

      {kpis.length > 0 ? (
        <motion.div className="artifact-stack artifact-stack--kpis" {...reveal(2)}>
          {kpis.map((a) => (
            <ArtifactRenderer key={a.id} artifact={a} context={context} />
          ))}
        </motion.div>
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

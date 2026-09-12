import { Sparkles, Database, Play } from 'lucide-react';
import { useMemo } from 'react';
import { shuffleArray } from '../../lib/shuffleArray';
import './ChatWelcome.css';

const SAMPLE_FALLBACK_PROMPTS = [
  'Which products drove the most revenue this month?',
  'How did sales compare to last quarter?',
  'Which customers contributed the most growth?',
];

export function resolveDemoSuggestedPrompts(apiPrompts?: string[] | null): string[] {
  const fromApi = (apiPrompts ?? []).map((p) => p.trim()).filter(Boolean);
  return fromApi.length > 0 ? fromApi : [...SAMPLE_FALLBACK_PROMPTS];
}

interface ChatWelcomeProps {
  onPromptClick: (prompt: string) => void;
  disabled?: boolean;
  /** When false, sample prompts are replaced by connect / demo CTAs. */
  hasDatasources?: boolean;
  sourcesLoading?: boolean;
  onConnectDatasource?: () => void;
  /** Free-trial empty workspace: show Explore sample data. */
  showDemoCta?: boolean;
  onStartDemo?: () => void;
  demoConnecting?: boolean;
  /** When demo (or other) source is ready , prefer these over enterprise defaults. */
  demoHeadline?: string | null;
  demoMessage?: string | null;
  demoPrompts?: string[] | null;
  /** Force chip-style demo prompts when the selected source is the sample dataset. */
  preferDemoPrompts?: boolean;
  /** Prompts already sent — omit from welcome chips. */
  usedPrompts?: readonly string[];
}

export function ChatWelcome({
  onPromptClick,
  disabled,
  hasDatasources = true,
  sourcesLoading = false,
  onConnectDatasource,
  showDemoCta = false,
  onStartDemo,
  demoConnecting = false,
  demoHeadline,
  demoMessage,
  demoPrompts,
  preferDemoPrompts = false,
  usedPrompts = [],
}: Readonly<ChatWelcomeProps>) {
  const showEmptyOnboarding =
    !sourcesLoading && !hasDatasources && (Boolean(onConnectDatasource) || showDemoCta);
  const showDualCta = showEmptyOnboarding && showDemoCta && Boolean(onStartDemo);
  const showConnectOnly = showEmptyOnboarding && !showDualCta && Boolean(onConnectDatasource);

  const apiPrompts = (demoPrompts ?? []).filter((p) => p.trim().length > 0);
  const demoBoundWelcome = Boolean(
    preferDemoPrompts || demoHeadline?.trim() || demoMessage?.trim() || apiPrompts.length,
  );
  const usedKey = usedPrompts.join('\0');
  const demoPromptsKey = `${(demoPrompts ?? []).join('\0')}::${usedKey}`;
  const chipPrompts = useMemo(() => {
    const used = new Set(usedPrompts.map((p) => p.trim()).filter(Boolean));
    const remaining = resolveDemoSuggestedPrompts(demoPrompts).filter((p) => !used.has(p.trim()));
    return shuffleArray(remaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by demoPromptsKey
  }, [demoPromptsKey]);
  const useDemoPrompts = hasDatasources && demoBoundWelcome;
  const showDemoChips =
    !sourcesLoading && hasDatasources && useDemoPrompts && chipPrompts.length > 0;

  const title = showDualCta
    ? 'Try Beleh on sample data'
    : showConnectOnly
      ? 'Add a data source to begin'
      : demoHeadline?.trim() || 'Ask about your business';

  const subtitle = showDualCta
    ? 'Explore a ready-made sample dataset with suggested questions, or add your own files and databases.'
    : showConnectOnly
      ? 'Connect your sales, finance, or operations data to start asking questions in plain language.'
      : demoMessage?.trim() ||
        'Ask about revenue, customers, performance, or trends — get clear answers and charts instantly.';

  const busy = disabled || demoConnecting;

  return (
    <div
      className={`chat-welcome chat-welcome--enterprise${showEmptyOnboarding ? ' chat-welcome--no-sources' : ''}${!showEmptyOnboarding ? ' chat-welcome--compact' : ''}${sourcesLoading ? ' chat-welcome--loading' : ''}`}
    >
      <div className="chat-welcome-hero">
        <div className="chat-welcome-icon-stack" aria-hidden>
          <div className="chat-welcome-icon-main">
            {showEmptyOnboarding ? (
              <Database size={28} strokeWidth={1.75} />
            ) : (
              <Sparkles size={28} strokeWidth={1.75} />
            )}
          </div>
          {!showEmptyOnboarding ? (
            <div className="chat-welcome-icon-badge">
              <Database size={14} strokeWidth={2} />
            </div>
          ) : null}
        </div>
        {sourcesLoading ? (
          <div className="chat-welcome-skeleton-copy" aria-hidden>
            <div className="analytics-skeleton chat-welcome-skeleton-title" />
            <div className="analytics-skeleton chat-welcome-skeleton-sub" />
            <div className="analytics-skeleton chat-welcome-skeleton-sub chat-welcome-skeleton-sub--short" />
          </div>
        ) : (
          <>
            <h2 className="chat-welcome-title font-display">{title}</h2>
            <p className="chat-welcome-subtitle">{subtitle}</p>
          </>
        )}
      </div>

      {sourcesLoading ? (
        <div
          className="chat-welcome-skeleton-actions"
          aria-busy="true"
          aria-label="Loading workspace options"
        >
          <div className="analytics-skeleton chat-welcome-skeleton-btn" />
          <div className="analytics-skeleton chat-welcome-skeleton-btn chat-welcome-skeleton-btn--secondary" />
          <div className="chat-welcome-skeleton-chips">
            <div className="analytics-skeleton chat-welcome-skeleton-chip" />
            <div className="analytics-skeleton chat-welcome-skeleton-chip" />
            <div className="analytics-skeleton chat-welcome-skeleton-chip" />
          </div>
          <span className="sr-only">Loading workspace…</span>
        </div>
      ) : null}

      {showDualCta ? (
        <div className="chat-welcome-connect chat-welcome-connect--dual">
          <button
            type="button"
            className="btn-gradient-primary chat-welcome-connect__btn"
            disabled={busy}
            onClick={onStartDemo}
          >
            <Play size={18} strokeWidth={2.25} aria-hidden />
            {demoConnecting ? 'Preparing sample data…' : 'Explore sample data'}
          </button>
          {onConnectDatasource ? (
            <button
              type="button"
              className="chat-welcome-connect__btn chat-welcome-connect__btn--secondary"
              disabled={busy}
              onClick={onConnectDatasource}
            >
              <Database size={18} strokeWidth={2.25} aria-hidden />
              Add your data
            </button>
          ) : null}
        </div>
      ) : null}

      {showConnectOnly ? (
        <div className="chat-welcome-connect">
          <button
            type="button"
            className="btn-gradient-primary chat-welcome-connect__btn"
            disabled={busy}
            onClick={onConnectDatasource}
          >
            <Database size={18} strokeWidth={2.25} aria-hidden />
            Add your data
          </button>
        </div>
      ) : null}

      {showDemoChips ? (
        <div className="chat-welcome-prompts">
          <div className="chat-welcome-prompts-chips" role="list">
            {chipPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                role="listitem"
                className="chat-welcome-prompt-chip"
                disabled={busy}
                onClick={() => onPromptClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

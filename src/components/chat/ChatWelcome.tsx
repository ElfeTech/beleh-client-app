import { Sparkles, Database, Play } from 'lucide-react';
import { useMemo } from 'react';
import { shuffleArray } from '../../lib/shuffleArray';
import './ChatWelcome.css';

export interface EnterprisePromptCard {
  title: string;
  preview: string;
  prompt: string;
}

export const ENTERPRISE_DEFAULT_PROMPTS: EnterprisePromptCard[] = [
  {
    title: 'Top projects by token load',
    preview: 'Which top 5 projects have the largest token consumption this month?',
    prompt: 'Which top 5 projects have the largest token consumption this month?',
  },
  {
    title: 'Token cache ROI audit',
    preview: 'Calculate total enterprise token savings from cache hits vs cold queries.',
    prompt: 'Calculate total enterprise token savings from cache hits vs cold queries.',
  },
  {
    title: 'Connection pool metrics',
    preview: 'Show current database connection pool usage, wait time, and saturation.',
    prompt: 'Show current database connection pool usage, wait time, and saturation.',
  },
];

const SAMPLE_FALLBACK_PROMPTS = [
  'What tables are in this sample dataset?',
  'Summarize the key metrics in the sample data.',
  'What insights stand out in the sample data?',
];

export function resolveDemoSuggestedPrompts(apiPrompts?: string[] | null): string[] {
  const fromApi = (apiPrompts ?? []).map((p) => p.trim()).filter(Boolean);
  return fromApi.length > 0 ? fromApi : [...SAMPLE_FALLBACK_PROMPTS];
}

interface ChatWelcomeProps {
  onPromptClick: (prompt: string) => void;
  schemaTableCount?: number;
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
  schemaTableCount,
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
  const showPrompts =
    !sourcesLoading && hasDatasources && (!useDemoPrompts || chipPrompts.length > 0);

  const title = showDualCta
    ? 'Try Beleh on sample data'
    : showConnectOnly
      ? 'Add a data source to begin'
      : demoHeadline?.trim() || 'Enterprise AI Analytics Workspace';

  const subtitle = showDualCta
    ? 'Explore a ready-made sample dataset with suggested questions, or add your own files and databases.'
    : showConnectOnly
      ? 'Add a datasource or connect a database to start asking questions in natural language and generating charts.'
      : demoMessage?.trim() ||
        'Connect your business datasets and express your requests in natural language. The system converts raw questions into compliant SQL queries, generates responsive tabular matrices, and plots custom charts instantly.';

  const busy = disabled || demoConnecting;

  return (
    <div
      className={`chat-welcome chat-welcome--enterprise${showEmptyOnboarding ? ' chat-welcome--no-sources' : ''}`}
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
        <h2 className="chat-welcome-title font-display">{title}</h2>
        <p className="chat-welcome-subtitle">{subtitle}</p>
      </div>

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
            Add datasource / Connect DB
          </button>
        </div>
      ) : null}

      {showPrompts ? (
        <div className="chat-welcome-prompts">
          {useDemoPrompts ? (
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
          ) : (
            <div className="chat-welcome-prompts-row">
              {ENTERPRISE_DEFAULT_PROMPTS.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  className="chat-welcome-prompt-card"
                  disabled={busy}
                  onClick={() => onPromptClick(card.prompt)}
                >
                  <span className="chat-welcome-prompt-card__title">{card.title}</span>
                  <span className="chat-welcome-prompt-card__preview">{card.preview}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {!showEmptyOnboarding && showPrompts ? (
        <footer className="chat-welcome-footer">
          <p>
            Powered by Beleh Analytical Engine v0.1.0
            <span className="chat-welcome-footer__sep"> · </span>
            compliance guidelines applied.
          </p>
          <p className="chat-welcome-footer__schema">
            Schema:{' '}
            {schemaTableCount != null && schemaTableCount > 0
              ? `${schemaTableCount} Table${schemaTableCount === 1 ? '' : 's'} Connected`
              : 'No tables connected'}
          </p>
        </footer>
      ) : null}
    </div>
  );
}

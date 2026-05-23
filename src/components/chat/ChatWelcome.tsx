import { Sparkles, Database } from 'lucide-react';
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

interface ChatWelcomeProps {
  onPromptClick: (prompt: string) => void;
  schemaTableCount?: number;
  disabled?: boolean;
}

export function ChatWelcome({ onPromptClick, schemaTableCount, disabled }: ChatWelcomeProps) {
  return (
    <div className="chat-welcome chat-welcome--enterprise">
      <div className="chat-welcome-hero">
        <div className="chat-welcome-icon-stack" aria-hidden>
          <div className="chat-welcome-icon-main">
            <Sparkles size={28} strokeWidth={1.75} />
          </div>
          <div className="chat-welcome-icon-badge">
            <Database size={14} strokeWidth={2} />
          </div>
        </div>
        <h2 className="chat-welcome-title font-display">Enterprise AI Analytics Workspace</h2>
        <p className="chat-welcome-subtitle">
          Connect your business datasets and express your requests in natural language. The system
          converts raw questions into compliant SQL queries, generates responsive tabular matrices,
          and plots custom charts instantly.
        </p>
      </div>

      <div className="chat-welcome-prompts">
        <div className="chat-welcome-prompts-row">
          {ENTERPRISE_DEFAULT_PROMPTS.map((card) => (
            <button
              key={card.title}
              type="button"
              className="chat-welcome-prompt-card"
              disabled={disabled}
              onClick={() => onPromptClick(card.prompt)}
            >
              <span className="chat-welcome-prompt-card__title">{card.title}</span>
              <span className="chat-welcome-prompt-card__preview">{card.preview}</span>
            </button>
          ))}
        </div>
      </div>

      <footer className="chat-welcome-footer">
        <p>
          Powered by Beleh Analytical Engine v2.1
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
    </div>
  );
}

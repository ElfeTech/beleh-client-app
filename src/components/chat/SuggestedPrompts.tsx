import './SuggestedPrompts.css';

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({ prompts, onSelect, disabled }: SuggestedPromptsProps) {
  const filtered = prompts.map((p) => p.trim()).filter(Boolean);
  if (filtered.length === 0) return null;

  return (
    <div className="suggested-prompts">
      <p className="suggested-prompts__label">Suggested follow-ups</p>
      <div className="suggested-prompts__list">
        {filtered.map((prompt, index) => (
          <button
            key={`${index}-${prompt.slice(0, 32)}`}
            type="button"
            className="suggested-prompts__btn"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
          >
            <span className="suggested-prompts__text">{prompt}</span>
            <svg
              className="suggested-prompts__arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

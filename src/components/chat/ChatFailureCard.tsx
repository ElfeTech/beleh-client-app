import { AlertCircle, RotateCcw } from 'lucide-react';
import './ChatFailureCard.css';

interface ChatFailureCardProps {
  title: string;
  detail: string;
  canRetry?: boolean;
  onRetry?: () => void;
  disabled?: boolean;
}

export function ChatFailureCard({
  title,
  detail,
  canRetry = true,
  onRetry,
  disabled,
}: ChatFailureCardProps) {
  return (
    <div className="chat-failure-card" role="alert">
      <div className="chat-failure-card__icon" aria-hidden>
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="chat-failure-card__body">
        <p className="chat-failure-card__title">{title}</p>
        <p className="chat-failure-card__detail">{detail}</p>
        {canRetry && onRetry && (
          <button
            type="button"
            className="chat-failure-card__retry"
            disabled={disabled}
            onClick={onRetry}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

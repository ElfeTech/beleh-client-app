import { AlertCircle, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarkdownText } from '../MarkdownText';
import './ChatFailureCard.css';

interface ChatFailureCardProps {
  title: string;
  detail: string;
  canRetry?: boolean;
  onRetry?: () => void;
  disabled?: boolean;
  upgradeHref?: string | null;
  showUpgradeCta?: boolean;
  upgradeLabel?: string;
}

export function ChatFailureCard({
  title,
  detail,
  canRetry = true,
  onRetry,
  disabled,
  upgradeHref,
  showUpgradeCta,
  upgradeLabel = 'Upgrade plan',
}: ChatFailureCardProps) {
  return (
    <div className="chat-failure-card" role="alert">
      <div className="chat-failure-card__icon" aria-hidden>
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="chat-failure-card__body">
        <p className="chat-failure-card__title">{title}</p>
        <MarkdownText className="chat-failure-card__detail">{detail}</MarkdownText>
        <div className="chat-failure-card__actions">
          {showUpgradeCta && upgradeHref ? (
            <Link to={upgradeHref} className="chat-failure-card__retry">
              {upgradeLabel}
            </Link>
          ) : null}
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
    </div>
  );
}

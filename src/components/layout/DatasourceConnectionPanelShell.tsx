import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import './DatasourceConnectionPanel.css';

export interface PanelChromeProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  headerActions?: React.ReactNode;
  closeDisabled?: boolean;
}

export function PanelChrome({
  title,
  subtitle,
  eyebrow,
  canGoBack,
  onBack,
  onClose,
  headerActions,
  closeDisabled,
}: PanelChromeProps) {
  return (
    <header className="ds-conn-panel__chrome">
      <div className="ds-conn-panel__chrome-left">
        {canGoBack ? (
          <button
            type="button"
            className="ds-conn-panel__icon-btn"
            onClick={onBack}
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
        ) : (
          <span className="ds-conn-panel__chrome-spacer" aria-hidden />
        )}
        <div className="ds-conn-panel__chrome-text">
          {eyebrow ? <p className="ds-conn-panel__eyebrow">{eyebrow}</p> : null}
          <h2 className="ds-conn-panel__title" id="ds-conn-panel-title">
            {title}
          </h2>
          {subtitle ? <p className="ds-conn-panel__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      <div className="ds-conn-panel__chrome-right">
        {headerActions}
        <button
          type="button"
          className="ds-conn-panel__icon-btn"
          onClick={onClose}
          aria-label="Close"
          disabled={closeDisabled}
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

interface DatasourceConnectionPanelShellProps {
  children: React.ReactNode;
}

/**
 * Right half-screen (desktop) / full-bleed (mobile) sliding panel shell.
 * Dismissal is deliberately limited to the chrome close button so an in-progress
 * connector flow is never lost to a stray backdrop click or Escape press.
 */
export function DatasourceConnectionPanelShell({ children }: DatasourceConnectionPanelShellProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const content = (
    <div className="ds-conn-panel-backdrop">
      <div
        className="ds-conn-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-conn-panel-title"
      >
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Eraser, HelpCircle, RefreshCw, X } from 'lucide-react';
import { APP_HELP_DB_NAME } from '../../lib/landingHelpDb';
import { usePlatformHelpChat } from '../../hooks/useLandingHelpChat';
import { LANDING_HELP_SUGGESTED_PROMPTS } from '../landing/landingHelpPrompts';
import { MarkdownText } from '../MarkdownText';
import { cn } from '../../lib/utils';
import './SupportHelpBubble.css';

interface SupportHelpBubbleProps {
  /** Lift above mobile bottom nav when present */
  elevateForBottomNav?: boolean;
}

export function SupportHelpBubble({ elevateForBottomNav = false }: SupportHelpBubbleProps) {
  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) setActivated(true);
      return next;
    });
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        'support-help-bubble',
        elevateForBottomNav && 'support-help-bubble--elevated',
        open && 'support-help-bubble--open',
      )}
    >
      {activated ? (
        <div className={cn('support-help-panel-wrap', !open && 'support-help-panel-wrap--hidden')}>
          <SupportHelpPanel onClose={() => setOpen(false)} />
        </div>
      ) : null}

      <button
        type="button"
        className="support-help-bubble__fab"
        aria-label={open ? 'Close help chat' : 'Open help chat'}
        aria-expanded={open}
        onClick={toggle}
      >
        {open ? (
          <X className="h-6 w-6" strokeWidth={2.25} />
        ) : (
          <HelpCircle className="h-6 w-6" strokeWidth={2.25} />
        )}
      </button>
    </div>,
    document.body,
  );
}

function SupportHelpPanel({ onClose }: { onClose: () => void }) {
  const {
    messages,
    sessionReady,
    sessionError,
    isStreaming,
    streamError,
    sendMessage,
    clearChat,
    retrySession,
  } = usePlatformHelpChat({ persistenceDb: APP_HELP_DB_NAME });

  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const disabled = !sessionReady || Boolean(sessionError) || isStreaming;
  const showSuggestions = messages.length === 0 && sessionReady && !sessionError;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    void sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section className="support-help-panel" aria-label="Product help chat">
      <header className="support-help-panel__header">
        <div className="support-help-panel__heading">
          <HelpCircle className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
          <div>
            <p className="support-help-panel__title">Ask Beleh</p>
            <p className="support-help-panel__subtitle">Product help</p>
          </div>
        </div>
        <div className="support-help-panel__actions">
          <button
            type="button"
            className="support-help-panel__icon-btn"
            disabled={!sessionReady || isStreaming}
            onClick={() => void clearChat()}
            aria-label="Clear conversation"
            title="Clear"
          >
            <Eraser className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            className="support-help-panel__icon-btn"
            onClick={onClose}
            aria-label="Close help"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <div className="support-help-panel__body" ref={listRef}>
        {!sessionReady && !sessionError && (
          <p className="support-help-panel__status">Initializing help session…</p>
        )}

        {sessionError && (
          <div className="support-help-panel__banner support-help-panel__banner--error">
            <p>{sessionError}</p>
            <button type="button" onClick={() => void retrySession()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {streamError && !sessionError && (
          <div className="support-help-panel__banner support-help-panel__banner--warn">
            <p>{streamError}</p>
          </div>
        )}

        {showSuggestions && (
          <div className="support-help-panel__suggestions">
            <p className="support-help-panel__suggestions-label">Try asking</p>
            <div className="support-help-panel__chips">
              {LANDING_HELP_SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="support-help-panel__chip"
                  disabled={disabled}
                  onClick={() => void sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('support-help-panel__row', `support-help-panel__row--${msg.role}`)}
          >
            {msg.role === 'assistant' && (
              <div className="support-help-panel__avatar" aria-hidden>
                AI
              </div>
            )}
            <div
              className={cn(
                'support-help-panel__msg',
                `support-help-panel__msg--${msg.role}`,
                msg.status === 'error' && 'support-help-panel__msg--error',
              )}
            >
              {msg.role === 'assistant' ? (
                <>
                  <MarkdownText>{msg.content}</MarkdownText>
                  {msg.status === 'streaming' && (
                    <span className="support-help-panel__caret" aria-hidden />
                  )}
                </>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
      </div>

      <form className="support-help-panel__composer" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="support-help-panel__input"
          rows={1}
          placeholder="Ask anything about the platform…"
          value={input}
          disabled={disabled}
          onChange={(e) => {
            setInput(e.target.value);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
          }}
          onKeyDown={handleKeyDown}
          aria-label="Message"
        />
        <button
          type="submit"
          className="support-help-panel__send"
          disabled={disabled || !input.trim()}
          aria-label="Send message"
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </form>
    </section>
  );
}

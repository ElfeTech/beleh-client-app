import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUpRight, Eraser, RefreshCw } from 'lucide-react';
import { useLandingHelpChat } from '../../hooks/useLandingHelpChat';
import { LANDING_HELP_SUGGESTED_PROMPTS } from './landingHelpPrompts';
import { MarkdownText } from '../MarkdownText';
import './LandingHelpChat.css';

export function LandingHelpChat() {
  const {
    messages,
    sessionReady,
    sessionError,
    isStreaming,
    streamError,
    sendMessage,
    clearChat,
    retrySession,
  } = useLandingHelpChat();

  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const disabled = !sessionReady || Boolean(sessionError) || isStreaming;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

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

  const showSuggestions = messages.length === 0 && sessionReady && !sessionError;

  return (
    <div className="landing-help-chat" aria-label="Ask about Beleh">
      <div className="landing-help-chat__chrome">
        <div className="landing-help-chat__dots">
          <span className="landing-help-chat__dot landing-help-chat__dot--red" />
          <span className="landing-help-chat__dot landing-help-chat__dot--yellow" />
          <span className="landing-help-chat__dot landing-help-chat__dot--green" />
        </div>
        <span className="landing-help-chat__title">Ask Beleh</span>
        <div className="landing-help-chat__chrome-actions">
          <button
            type="button"
            className="landing-help-chat__clear"
            disabled={!sessionReady || isStreaming}
            onClick={() => void clearChat()}
            aria-label="Clear conversation"
          >
            <Eraser size={12} strokeWidth={2.25} />
            Clear
          </button>
          <span className="landing-help-chat__path">Product help</span>
        </div>
      </div>

      <div className="landing-help-chat__body" ref={listRef}>
        {!sessionReady && !sessionError && (
          <p className="landing-help-chat__status">Initializing help session…</p>
        )}

        {sessionError && (
          <div className="landing-help-chat__banner landing-help-chat__banner--error">
            <p>{sessionError}</p>
            <button type="button" onClick={() => void retrySession()}>
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {streamError && !sessionError && (
          <div className="landing-help-chat__banner landing-help-chat__banner--warn">
            <p>{streamError}</p>
          </div>
        )}

        {showSuggestions && (
          <div className="landing-help-chat__suggestions">
            <p className="landing-help-chat__suggestions-label">Try asking</p>
            <div className="landing-help-chat__suggestion-chips">
              {LANDING_HELP_SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="landing-help-chat__chip"
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
            className={`landing-help-chat__row landing-help-chat__row--${msg.role}`}
          >
            {msg.role === 'assistant' && (
              <div className="landing-help-chat__avatar" aria-hidden>
                AI
              </div>
            )}
            <div
              className={`landing-help-chat__bubble landing-help-chat__bubble--${msg.role} ${msg.status === 'error' ? 'landing-help-chat__bubble--error' : ''}`}
            >
              {msg.role === 'assistant' ? (
                <div className="landing-help-chat__text">
                  <MarkdownText>{msg.content}</MarkdownText>
                  {msg.status === 'streaming' && (
                    <span className="landing-help-chat__caret" aria-hidden />
                  )}
                </div>
              ) : (
                <span className="landing-help-chat__text">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <form className="landing-help-chat__composer" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="landing-help-chat__input"
          rows={1}
          placeholder="Ask anything about the platform…"
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Message"
        />
        <button
          type="submit"
          className="landing-help-chat__send"
          disabled={disabled || !input.trim()}
          aria-label="Send message"
        >
          <ArrowUpRight size={16} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}

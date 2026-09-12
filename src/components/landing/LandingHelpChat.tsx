import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePlatformHelpChat } from '../../hooks/useLandingHelpChat';
import { LANDING_HELP_DB_NAME } from '../../lib/landingHelpDb';
import { LANDING_HELP_SUGGESTED_PROMPTS } from './landingHelpPrompts';
import { MarkdownText } from '../MarkdownText';
import { HELP_CHAT_MAX_CHARS } from '../../constants/chatLimits';
import './LandingHelpChat.css';

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2v4M12 18v4M2 12h4M18 12h4"
        stroke="#06110d"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12h16M13 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  } = usePlatformHelpChat({ persistenceDb: LANDING_HELP_DB_NAME });

  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const disabled = !sessionReady || Boolean(sessionError) || isStreaming;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || disabled) return;
    setInput('');
    void sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const showSuggestions = messages.length === 0 && sessionReady && !sessionError;

  return (
    <div className="landing-demo-panel" id="askBeleh" aria-label="Ask about Beleh">
      <div className="landing-demo-topbar">
        <div className="who">
          <span className="ico">
            <SparkIcon />
          </span>
          <div>
            <b>Ask Beleh</b>
            <small>Questions about the platform</small>
          </div>
        </div>
        <button
          type="button"
          className="clear-btn"
          disabled={!sessionReady || isStreaming}
          onClick={() => void clearChat()}
        >
          Clear
        </button>
      </div>

      <div className="landing-demo-chips">
        {LANDING_HELP_SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chip"
            disabled={disabled}
            onClick={() => void sendMessage(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="landing-demo-body" ref={listRef}>
        {!sessionReady && !sessionError && (
          <div className="landing-demo-msg ai">
            <span className="ico">
              <SparkIcon />
            </span>
            <div className="bubble">Initializing help session…</div>
          </div>
        )}

        {sessionError && (
          <div className="landing-demo-banner landing-demo-banner--error">
            <p>{sessionError}</p>
            <button type="button" onClick={() => void retrySession()}>
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {streamError && !sessionError && (
          <div className="landing-demo-banner landing-demo-banner--warn">
            <p>{streamError}</p>
          </div>
        )}

        {showSuggestions && (
          <div className="landing-demo-msg ai">
            <span className="ico">
              <SparkIcon />
            </span>
            <div className="bubble">
              Hi , I&apos;m the Beleh assistant. Ask me anything about the platform: pricing,
              security, how connections work, or whether you&apos;ll ever have to write SQL (you
              won&apos;t).
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`landing-demo-msg ${msg.role === 'user' ? 'user' : 'ai'}`}>
            {msg.role === 'assistant' && (
              <span className="ico">
                <SparkIcon />
              </span>
            )}
            {msg.role === 'user' ? (
              msg.content
            ) : (
              <div className={`bubble ${msg.status === 'error' ? 'bubble--error' : ''}`}>
                {msg.status === 'streaming' && !msg.content ? (
                  <div className="landing-demo-typing" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </div>
                ) : (
                  <>
                    <MarkdownText>{msg.content}</MarkdownText>
                    {msg.status === 'streaming' && (
                      <span className="landing-demo-caret" aria-hidden />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <form className="landing-demo-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask anything about the platform…"
          autoComplete="off"
          value={input}
          disabled={disabled}
          maxLength={HELP_CHAT_MAX_CHARS}
          onChange={(e) => setInput(e.target.value.slice(0, HELP_CHAT_MAX_CHARS))}
          onKeyDown={handleKeyDown}
          aria-label="Message"
        />
        <span className="landing-demo-char-count" aria-live="polite">
          {input.length}/{HELP_CHAT_MAX_CHARS}
        </span>
        <button
          type="submit"
          className="send"
          disabled={disabled || !input.trim() || input.length > HELP_CHAT_MAX_CHARS}
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

import './AuthRestoreSpinner.css';

/**
 * Minimal circular spinner for session restore / hard refresh.
 * Intentionally no marketing copy — keep cold loads fast and quiet.
 */
export function AuthRestoreSpinner() {
  return (
    <div className="auth-restore-screen" role="status" aria-live="polite" aria-busy="true">
      <svg className="auth-restore-spinner" viewBox="0 0 48 48" aria-hidden>
        <circle className="auth-restore-spinner__track" cx="24" cy="24" r="20" />
        <circle className="auth-restore-spinner__arc" cx="24" cy="24" r="20" />
      </svg>
      <span className="sr-only">Loading</span>
    </div>
  );
}

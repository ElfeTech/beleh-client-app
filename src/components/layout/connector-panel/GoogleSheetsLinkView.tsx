import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { apiClient } from '../../../services/apiClient';
import { invalidateSheetsBindingsCache } from '../../../lib/providerCache';
import type { SheetBinding, SheetsServiceAccountInfo } from '../../../types/sheets';
import '../../settings/SettingsShared.css';
import '../ConnectorModals.css';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

interface GoogleSheetsLinkViewProps {
  workspaceId: string;
  onCancel: () => void;
  onBound: (binding?: SheetBinding) => void;
}

/** Link a sheet that the user shared (Viewer) with our service account — no OAuth. */
export function GoogleSheetsLinkView({
  workspaceId,
  onCancel,
  onBound,
}: GoogleSheetsLinkViewProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [serviceAccount, setServiceAccount] = useState<SheetsServiceAccountInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importing, setImporting] = useState<SheetBinding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearPoll, [clearPoll]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const info = await apiClient.getSheetsServiceAccount(token);
        if (!cancelled) setServiceAccount(info);
      } catch {
        if (!cancelled) setServiceAccount({ enabled: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const copyEmail = async () => {
    if (!serviceAccount?.email) return;
    try {
      await navigator.clipboard.writeText(serviceAccount.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy. Select the email and copy it manually.');
    }
  };

  const startPolling = (binding: SheetBinding) => {
    clearPoll();
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    setImporting(binding);

    const poll = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const bindings = await apiClient.listSheetBindings(token, workspaceId);
        const latest = bindings.find((b) => b.id === binding.id);
        if (!latest) return;
        setImporting(latest);

        if (latest.sync_status === 'READY') {
          clearPoll();
          toast.success(`${latest.spreadsheet_name} is ready.`);
          onBound(latest);
        } else if (latest.sync_status === 'FAILED') {
          clearPoll();
          setImporting(null);
          setIsSaving(false);
          setError(latest.sync_error || 'Failed to import spreadsheet.');
        } else if (Date.now() > deadline) {
          clearPoll();
          toast.message(
            'Still importing — this is taking longer than usual. It will appear in your datasets once ready.',
          );
          onBound(latest);
        }
      } catch {
        if (Date.now() > deadline) {
          clearPoll();
          setImporting(null);
          setIsSaving(false);
          toast.error('Lost track of the import. Check the datasets list shortly.');
        }
      }
    };

    pollTimerRef.current = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    void poll();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !url.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const binding = await apiClient.createSheetLinkBinding(token, workspaceId, {
        spreadsheet_url: url.trim(),
        description: description.trim() || null,
      });
      invalidateSheetsBindingsCache(workspaceId);
      startPolling(binding);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link spreadsheet');
      setIsSaving(false);
    }
  };

  const unavailable = serviceAccount !== null && !serviceAccount.enabled;
  const isLoading = isSaving || importing !== null;

  return (
    <div className="ds-conn-embed ds-conn-panel__body">
      <form onSubmit={handleSubmit} className="enterprise-pg-form">
        <div className="enterprise-pg-body">
          <section className="enterprise-pg-section">
            <p className="enterprise-pg-connstring-hint">
              Share your sheet with our service account by adding the email below in the “Add
              people” field. Only <strong>Viewer</strong> access is needed. The first row of each
              tab must contain unique column headers.
            </p>
            {serviceAccount?.enabled && serviceAccount.email && (
              <div className="form-group">
                <label htmlFor="gsheets-sa-email" className="enterprise-label">
                  Service account email
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="gsheets-sa-email"
                    type="text"
                    readOnly
                    className="enterprise-input"
                    value={serviceAccount.email}
                    onFocus={(ev) => ev.currentTarget.select()}
                  />
                  <button
                    type="button"
                    className="enterprise-teal-outline-btn"
                    onClick={copyEmail}
                    aria-label="Copy service account email"
                  >
                    {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                  </button>
                </div>
              </div>
            )}
            {unavailable && (
              <div className="form-error enterprise-inline-error">
                Linking a Google Sheet by URL isn’t available right now.
              </div>
            )}
          </section>

          <section className="enterprise-pg-section">
            <div className="enterprise-pg-fields">
              <div className="form-group">
                <label htmlFor="gsheets-description" className="enterprise-label">
                  Description (optional)
                </label>
                <input
                  id="gsheets-description"
                  type="text"
                  className="enterprise-input"
                  value={description}
                  onChange={(ev) => setDescription(ev.target.value)}
                  placeholder="e.g. Q3 sales tracker"
                  maxLength={500}
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="gsheets-url" className="enterprise-label">
                  Spreadsheet URL
                </label>
                <input
                  id="gsheets-url"
                  type="url"
                  className="enterprise-input"
                  value={url}
                  onChange={(ev) => setUrl(ev.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </section>

          {importing && (
            <div className="enterprise-test-result enterprise-test-result--ok">
              <span>Importing {importing.spreadsheet_name}…</span>
            </div>
          )}
          {error && <div className="form-error enterprise-inline-error">{error}</div>}
        </div>

        <footer className="enterprise-pg-footer">
          <button
            type="button"
            className="enterprise-text-btn"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <div className="enterprise-pg-footer-actions">
            <button
              type="submit"
              className="btn-gradient-primary enterprise-pg-submit"
              disabled={isLoading || !url.trim() || unavailable}
            >
              <FileSpreadsheet size={16} strokeWidth={2} aria-hidden />
              {importing ? 'Importing…' : isSaving ? 'Linking…' : 'Link sheet'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

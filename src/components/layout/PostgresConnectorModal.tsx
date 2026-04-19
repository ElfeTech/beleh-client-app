import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Database, Globe, Lock, Link2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/useAuth';
import { parsePostgresConnectionString } from '../../lib/parsePostgresConnectionString';
import type { ParsedPostgresFields } from '../../lib/parsePostgresConnectionString';
import './UploadModal.css';
import './ConnectorModals.css';

interface PostgresConnectorModalProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function mergeFormFromPartial(
  prev: {
    name: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  },
  partial: Partial<ParsedPostgresFields>
) {
  const next = { ...prev };
  if (partial.host !== undefined && partial.host.trim() !== '') {
    next.host = partial.host.trim();
  }
  if (partial.port !== undefined && Number.isFinite(partial.port) && partial.port > 0) {
    next.port = partial.port;
  }
  if (partial.database !== undefined) {
    next.database = partial.database;
  }
  if (partial.username !== undefined) {
    next.username = partial.username;
  }
  if (partial.password !== undefined) {
    next.password = partial.password;
  }
  if (partial.ssl !== undefined) {
    next.ssl = partial.ssl;
  }
  if (!prev.name.trim() && partial.database !== undefined && partial.database.trim() !== '') {
    next.name = partial.database.trim();
  }
  return next;
}

export function PostgresConnectorModal({ workspaceId, onClose, onSuccess }: PostgresConnectorModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStringInput, setConnectionStringInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
    if (testStatus) setTestStatus(null);
  };

  const applyFromConnectionString = (raw?: string) => {
    const src = raw ?? connectionStringInput;
    const result = parsePostgresConnectionString(src);
    if (!result.ok) {
      setParseError(result.error);
      setParseWarnings([]);
      return false;
    }
    setParseError(null);
    setParseWarnings(result.warnings);
    setFormData((prev) => mergeFormFromPartial(prev, result.partial));
    setTestStatus(null);
    return true;
  };

  const handleConnectionStringChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setConnectionStringInput(e.target.value);
    setParseError(null);
    setParseWarnings([]);
    if (testStatus) setTestStatus(null);
  };

  const handleConnectionStringPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    setConnectionStringInput((prev) => {
      const next = prev.slice(0, start) + pasted + prev.slice(end);
      queueMicrotask(() => {
        const parsed = parsePostgresConnectionString(next);
        if (parsed.ok) {
          setParseError(null);
          setParseWarnings(parsed.warnings);
          setFormData((fd) => mergeFormFromPartial(fd, parsed.partial));
          setTestStatus(null);
        }
      });
      return next;
    });
    e.preventDefault();
  };

  const handleConnectionStringBlur = () => {
    const t = connectionStringInput.trim();
    if (t.length < 3) return;
    const looksParseable =
      /postgres(ql)?:\/\//i.test(t) ||
      /^jdbc:\s*postgres/i.test(t) ||
      (/=/.test(t) && /\b(host|hostaddr|dbname|database|port|user|password|sslmode)\s*=/i.test(t));
    if (!looksParseable) return;
    applyFromConnectionString();
  };

  const handleTestConnection = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    setTestStatus(null);

    try {
      const token = await user.getIdToken();
      const result = await apiClient.testPostgresConnection(token, workspaceId, {
        host: formData.host,
        port: formData.port,
        database: formData.database,
        username: formData.username,
        password: formData.password,
        ssl: formData.ssl,
      });
      setTestStatus({
        success: result.success,
        message: result.message,
      });
    } catch (err) {
      setTestStatus({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      await apiClient.createPostgresConnector(token, workspaceId, {
        name: formData.name,
        type: 'postgresql',
        config: {
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          ssl: formData.ssl,
        },
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connector');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-container enterprise-pg-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pg-modal-title"
      >
        <div className="enterprise-pg-head">
          <div className="enterprise-pg-head-main">
            <div className="enterprise-pg-icon" aria-hidden>
              <Database size={22} strokeWidth={1.75} />
            </div>
            <div>
              <h2 id="pg-modal-title">Connect Postgres</h2>
              <p className="enterprise-pg-sub">Configure your data pipeline.</p>
            </div>
          </div>
          {!isLoading && (
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
              <X size={20} strokeWidth={2} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="modal-body enterprise-pg-form">
          <div className="connector-form enterprise-form-stack">
            <div className="form-group">
              <label htmlFor="pg-conn-string" className="enterprise-label">
                <span className="enterprise-pg-connstring-label">
                  <Link2 size={14} strokeWidth={2} aria-hidden className="enterprise-pg-connstring-label-icon" />
                  Connection string
                </span>
              </label>
              <p className="enterprise-pg-connstring-hint">
                Paste a <code className="enterprise-pg-code">postgresql://</code> or <code className="enterprise-pg-code">postgres://</code> URI,{' '}
                <code className="enterprise-pg-code">jdbc:postgresql://…</code>, <code className="enterprise-pg-code">export DATABASE_URL=…</code>, or libpq{' '}
                <code className="enterprise-pg-code">host=… port=…</code> form. The form fills automatically on paste or when you leave this field; you can still edit
                every value below.
              </p>
              <textarea
                id="pg-conn-string"
                className="enterprise-textarea"
                value={connectionStringInput}
                onChange={handleConnectionStringChange}
                onPaste={handleConnectionStringPaste}
                onBlur={handleConnectionStringBlur}
                placeholder="postgresql://user:password@host:5432/dbname?sslmode=require"
                rows={3}
                spellCheck={false}
                disabled={isLoading}
                autoComplete="off"
              />
              <div className="enterprise-pg-connstring-actions">
                <button
                  type="button"
                  className="secondary-btn enterprise-outline-btn"
                  onClick={() => applyFromConnectionString()}
                  disabled={isLoading || !connectionStringInput.trim()}
                >
                  Parse &amp; fill form
                </button>
              </div>
              {parseError && <p className="enterprise-parse-hint enterprise-parse-hint--error">{parseError}</p>}
              {!parseError && parseWarnings.length > 0 && (
                <ul className="enterprise-parse-warning-list">
                  {parseWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="enterprise-pg-divider" aria-hidden />

            <div className="form-group">
              <label htmlFor="conn-name" className="enterprise-label">
                Display name
              </label>
              <input
                id="conn-name"
                name="name"
                type="text"
                className="enterprise-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Production Sales DB"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-row enterprise-host-row">
              <div className="form-group enterprise-grow">
                <label htmlFor="conn-host" className="enterprise-label">
                  Host
                </label>
                <div className="enterprise-input-affix">
                  <Globe className="enterprise-input-affix-icon" size={18} strokeWidth={1.75} aria-hidden />
                  <input
                    id="conn-host"
                    name="host"
                    type="text"
                    className="enterprise-input enterprise-input--indent"
                    value={formData.host}
                    onChange={handleChange}
                    placeholder="localhost"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="form-group enterprise-port">
                <label htmlFor="conn-port" className="enterprise-label">
                  Port
                </label>
                <input
                  id="conn-port"
                  name="port"
                  type="number"
                  className="enterprise-input"
                  value={formData.port}
                  onChange={handleChange}
                  placeholder="5432"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="conn-db" className="enterprise-label">
                Database name
              </label>
              <input
                id="conn-db"
                name="database"
                type="text"
                className="enterprise-input"
                value={formData.database}
                onChange={handleChange}
                placeholder="my_analytics_db"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="conn-user" className="enterprise-label">
                  Username
                </label>
                <input
                  id="conn-user"
                  name="username"
                  type="text"
                  className="enterprise-input"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="postgres"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="conn-pass" className="enterprise-label">
                  Password
                </label>
                <div className="enterprise-input-affix">
                  <Lock className="enterprise-input-affix-icon" size={18} strokeWidth={1.75} aria-hidden />
                  <input
                    id="conn-pass"
                    name="password"
                    type="password"
                    className="enterprise-input enterprise-input--indent"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required={!isLoading}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="ssl-toggle-group">
              <div className="ssl-info">
                <span className="ssl-label">SSL connection</span>
                <span className="ssl-desc">Encrypt traffic to the database</span>
              </div>
              <label className="switch">
                <input type="checkbox" name="ssl" checked={formData.ssl} onChange={handleChange} disabled={isLoading} />
                <span className="slider" />
              </label>
            </div>

            {testStatus && (
              <div className={`test-result ${testStatus.success ? 'success' : 'error'}`}>
                {testStatus.success ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                )}
                <span>{testStatus.message}</span>
              </div>
            )}

            {error && (
              <div className="form-error enterprise-inline-error">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <div className="enterprise-pg-footer">
            <button type="button" className="enterprise-text-btn" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <div className="enterprise-pg-footer-actions">
              <button
                type="button"
                className="secondary-btn enterprise-outline-btn"
                onClick={handleTestConnection}
                disabled={isLoading || !formData.host || !formData.database}
              >
                {isLoading ? 'Testing…' : 'Test connection'}
              </button>
              <button
                type="submit"
                className="primary-btn enterprise-submit-btn"
                disabled={isLoading || !formData.name || !testStatus?.success}
              >
                {isLoading ? 'Saving…' : 'Initialize connection'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

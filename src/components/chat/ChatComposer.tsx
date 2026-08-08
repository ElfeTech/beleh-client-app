import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Search, Database, FileText, Send, Square } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { DataSourceResponse, ConnectorResponse } from '../../types/api';
import { BI_CHAT_MAX_CHARS } from '../../constants/chatLimits';

export interface ChatComposerProps {
  workspaceId: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** When waiting for a reply, send becomes stop */
  isWaiting?: boolean;
  onStop?: () => void;
  disabled?: boolean;
  /** Tooltip when send is disabled due to plan limits. */
  disabledReason?: string | null;
  datasources: DataSourceResponse[];
  connectors?: ConnectorResponse[];
  selectedDatasourceId: string | null;
  onDatasourceChange: (id: string | null) => void;
  /** Imperatively open the source picker (e.g. clarify-which-source). */
  sourcePickerOpenRequest?: number;
  /** Open add-datasource / connect-DB flow from the composer toolbar. */
  onConnectDatasource?: () => void;
  /** Remove Free-trial sample datasource (DELETE /demo). */
  onRemoveDemo?: () => void;
}

export type ChatComposerHandle = {
  openSourcePicker: () => void;
};

function formatSourceType(ds: DataSourceResponse): string {
  const raw = (ds.type || ds.mime_type || 'DATA').toUpperCase();
  if (raw.includes('POSTGRES') || raw === 'SQL') return 'POSTGRES';
  if (raw.includes('EXCEL') || raw.includes('SPREADSHEET') || raw === 'XLSX') return 'EXCEL';
  if (raw.includes('CSV')) return 'CSV';
  if (raw.includes('MONGO')) return 'MONGODB';
  return raw.replace(/\s+/g, '_').slice(0, 16);
}

const COMPOSER_MIN_ROWS = 2;
/** Grow with content up to this many lines, then scroll. */
const COMPOSER_MAX_ROWS = 4;

function tagLabel(
  selectedDatasourceId: string | null,
  datasources: DataSourceResponse[],
  connectors: ConnectorResponse[] = [],
): { label: string; isDemo: boolean } {
  if (selectedDatasourceId === null || selectedDatasourceId === '') {
    return { label: 'All sources', isDemo: false };
  }

  const ds = datasources.find((d) => d.id === selectedDatasourceId);
  if (ds) {
    const name = ds.name.length > 20 ? `${ds.name.slice(0, 20)}…` : ds.name;
    return { label: `Analyzing: ${name}`, isDemo: Boolean(ds.is_demo) };
  }

  const connector = connectors.find((c) => c.id === selectedDatasourceId);
  if (connector) {
    const name = connector.name.length > 20 ? `${connector.name.slice(0, 20)}…` : connector.name;
    return { label: `Analyzing: ${name}`, isDemo: false };
  }

  return { label: 'All sources', isDemo: false };
}

export function ChatComposer({
  workspaceId,
  value,
  onChange,
  onSubmit,
  isWaiting = false,
  onStop,
  disabled,
  disabledReason,
  datasources,
  connectors = [],
  selectedDatasourceId,
  onDatasourceChange,
  sourcePickerOpenRequest = 0,
  onConnectDatasource,
  onRemoveDemo,
}: ChatComposerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const sourceTag = useMemo(
    () => tagLabel(selectedDatasourceId, datasources, connectors),
    [selectedDatasourceId, datasources, connectors],
  );

  useEffect(() => {
    if (sourcePickerOpenRequest > 0) {
      setOpen(true);
    }
  }, [sourcePickerOpenRequest]);

  const syncTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const styles = getComputedStyle(ta);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 22;
    const paddingY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const minHeight = lineHeight * COMPOSER_MIN_ROWS + paddingY;
    const maxHeight = lineHeight * COMPOSER_MAX_ROWS + paddingY;

    ta.style.height = 'auto';
    const contentHeight = ta.scrollHeight;
    const next = Math.min(Math.max(contentHeight, minHeight), maxHeight);
    ta.style.height = `${next}px`;
    ta.style.overflowY = contentHeight > maxHeight + 1 ? 'auto' : 'hidden';
  }, []);

  useLayoutEffect(() => {
    syncTextareaHeight();
  }, [value, syncTextareaHeight]);

  useEffect(() => {
    const onResize = () => syncTextareaHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncTextareaHeight]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const allSources = [
      ...datasources.map((ds) => ({ ...ds, sourceKind: 'datasource' as const })),
      ...connectors.map((c) => ({ ...c, sourceKind: 'connector' as const })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    if (!q) return allSources;

    return allSources.filter((s) => {
      const type =
        s.sourceKind === 'datasource'
          ? formatSourceType(s as DataSourceResponse)
          : (s as ConnectorResponse).type.toUpperCase();

      return (
        s.name.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q) ||
        ((s as { status?: string }).status || '').toLowerCase().includes(q)
      );
    });
  }, [datasources, connectors, query]);

  const updatePanelPosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(Math.max(r.width, 280), 420);
    setPanelStyle({
      position: 'fixed',
      left: Math.max(8, r.left),
      top: r.top - 6,
      width: w,
      transform: 'translateY(-100%)',
      zIndex: 500,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, updatePanelPosition, datasources.length, connectors.length]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updatePanelPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const pick = useCallback(
    (id: string | null) => {
      onDatasourceChange(id);
      setOpen(false);
      setQuery('');
    },
    [onDatasourceChange],
  );

  const charCount = value.length;
  const overCharLimit = charCount > BI_CHAT_MAX_CHARS;
  const canSend = value.trim().length > 0 && !disabled && !isWaiting && !overCharLimit;
  const showStop = isWaiting && typeof onStop === 'function';

  const dropdownPanel =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={popoverRef}
        id={listId}
        role="listbox"
        style={panelStyle}
        className={cn(
          'rounded-xl border shadow-2xl py-2 outline-none',
          'border-[color:var(--border-primary)] bg-[color:var(--bg-card)] text-[color:var(--text-primary)]',
          'ring-1 ring-black/5 dark:ring-white/10',
          'max-h-[min(20rem,52vh)] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200',
        )}
      >
        <div className="shrink-0 border-b border-[color:var(--border-primary)] px-2 pb-2">
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sources…"
              className="w-full rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--ds-surface-muted)] py-2 pl-9 pr-3 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
              aria-label="Filter sources"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1">
          <button
            type="button"
            role="option"
            aria-selected={selectedDatasourceId === null || selectedDatasourceId === ''}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all active:scale-[0.99]',
              selectedDatasourceId === null || selectedDatasourceId === ''
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)]',
            )}
            onClick={() => pick(null)}
          >
            {selectedDatasourceId === null || selectedDatasourceId === '' ? (
              <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <div className="flex flex-col">
              <span>All sources</span>
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider opacity-80',
                  selectedDatasourceId === null || selectedDatasourceId === ''
                    ? 'text-primary-foreground/85'
                    : 'text-[color:var(--text-muted)]',
                )}
              >
                Workspace
              </span>
            </div>
          </button>

          <div className="my-1 h-px bg-[color:var(--border-primary)]/60 mx-2" />

          {datasources.length === 0 && connectors.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[color:var(--text-muted)]">
              <p className="mb-2">No sources available.</p>
              <Link
                to={`/workspace/${workspaceId}/datasets`}
                className="text-xs font-bold text-primary hover:underline uppercase tracking-wider"
                onClick={() => setOpen(false)}
              >
                Add datasource
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[color:var(--text-muted)]">
              <p>No sources match your search.</p>
            </div>
          ) : (
            filtered.map((s) => {
              const selected = selectedDatasourceId === s.id;
              const isDatasource = s.sourceKind === 'datasource';
              let ready = false;
              let statusLabel = '';

              if (isDatasource) {
                ready = (s as DataSourceResponse).status === 'READY';
                statusLabel = (s as DataSourceResponse).status;
              } else {
                const c = s as ConnectorResponse;
                const meta = c.metadata_status;
                // Allow selection as soon as the connector is active; metadata may still be catching up.
                ready = c.status === 'ACTIVE' && meta !== 'FAILED';
                statusLabel = meta === 'COMPLETED' ? c.status : `METADATA ${meta}`;
              }

              const typeLabel = isDatasource
                ? formatSourceType(s as DataSourceResponse)
                : (s as ConnectorResponse).type.toUpperCase();

              return (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={!ready}
                  title={
                    !ready
                      ? `This source is ${statusLabel.replace(/_/g, ' ').toLowerCase()} and cannot be queried yet.`
                      : undefined
                  }
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all active:scale-[0.99]',
                    selected && 'bg-primary text-primary-foreground shadow-sm',
                    !selected &&
                      ready &&
                      'text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)]',
                    !ready && 'cursor-not-allowed opacity-40 grayscale',
                  )}
                  onClick={() => ready && pick(s.id)}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      selected ? 'bg-white/20' : 'bg-[color:var(--ds-surface-muted)]',
                    )}
                  >
                    {isDatasource ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="block truncate font-semibold">{s.name}</span>
                      {isDatasource && (s as DataSourceResponse).is_demo ? (
                        <span
                          className={cn(
                            'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                            selected
                              ? 'bg-white/20 text-primary-foreground'
                              : 'bg-[color-mix(in_srgb,var(--accent-teal-500)_14%,transparent)] text-[color:var(--accent-teal-600)]',
                          )}
                        >
                          Sample data
                        </span>
                      ) : null}
                      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </div>
                    <span
                      className={cn(
                        'block text-[10px] font-bold uppercase tracking-widest',
                        selected ? 'text-primary-foreground/80' : 'text-[color:var(--text-muted)]',
                      )}
                    >
                      {typeLabel} • {statusLabel.toLowerCase()}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>,
      document.body,
    );

  return (
    <div ref={rootRef} className="chat-composer-float relative z-40 w-full">
      <div
        className={cn(
          'chat-composer-float__card flex w-full flex-col rounded-2xl border shadow-[0_8px_30px_-12px_rgba(15,17,21,0.18)] transition-[box-shadow,border-color]',
          'border-[color:var(--border-primary)] bg-[color:var(--panel-bg)]',
          'focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/20',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, BI_CHAT_MAX_CHARS))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          placeholder={
            selectedDatasourceId === null || selectedDatasourceId === ''
              ? 'Ask about revenue, customers, trends, or performance...'
              : 'Ask about revenue, customers, trends, or performance...'
          }
          disabled={disabled || isWaiting}
          rows={COMPOSER_MIN_ROWS}
          wrap="soft"
          maxLength={BI_CHAT_MAX_CHARS}
          className={cn(
            'composer-textarea w-full resize-none bg-transparent px-3.5 pt-3.5 pb-2 outline-none',
            'text-[color:var(--chat-surface-text,var(--text-primary))] placeholder:text-[color:var(--text-muted)]',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        />

        <div className="chat-composer-float__toolbar flex items-center gap-1.5 border-t border-[color:var(--border-primary)] px-2 py-1.5 md:px-2.5">
          <button
            type="button"
            className={cn(
              'inline-flex shrink-0 max-w-[42%] items-center gap-1 rounded-lg bg-[color:var(--bg-tertiary)] px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-[color:var(--text-primary)] sm:max-w-none',
              'hover:bg-[color:var(--bg-card-hover)] active:scale-[0.98] transition-all',
            )}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((o) => !o)}
            title="Select data source"
          >
            <Database className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2.25} />
            <span className="truncate">{sourceTag.label}</span>
            {sourceTag.isDemo ? (
              <span className="hidden sm:inline shrink-0 rounded bg-[color-mix(in_srgb,var(--accent-teal-500)_18%,transparent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[color:var(--accent-teal-600)]">
                Sample
              </span>
            ) : null}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 opacity-80 transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>

          {onRemoveDemo && datasources.some((d) => d.is_demo && d.id === selectedDatasourceId) ? (
            <button
              type="button"
              className="hidden sm:inline-flex shrink-0 items-center rounded-lg px-2 py-1.5 text-[10px] font-semibold text-[color:var(--text-muted)] hover:bg-[color:var(--bg-tertiary)] hover:text-[color:var(--text-primary)]"
              onClick={onRemoveDemo}
              title="Remove sample data"
            >
              Remove sample
            </button>
          ) : null}

          {onConnectDatasource ? (
            <button
              type="button"
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-[color:var(--border-primary)] bg-transparent px-2.5 py-1.5',
                'text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]',
                'transition-colors hover:border-primary/40 hover:text-primary',
              )}
              onClick={onConnectDatasource}
              title="Connect a database"
            >
              <Database className="h-3.5 w-3.5" strokeWidth={2.25} />
              Connect DB
            </button>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn(
                'tabular-nums text-[10px] font-medium tracking-wide',
                overCharLimit || charCount >= BI_CHAT_MAX_CHARS
                  ? 'text-[color:var(--color-error,#ef4444)]'
                  : charCount >= BI_CHAT_MAX_CHARS * 0.9
                    ? 'text-[color:var(--color-warning,#f59e0b)]'
                    : 'text-[color:var(--text-muted)]',
              )}
              aria-live="polite"
            >
              {charCount.toLocaleString()} / {BI_CHAT_MAX_CHARS.toLocaleString()}
            </span>
            {showStop ? (
              <button
                type="button"
                onClick={() => onStop?.()}
                aria-label="Stop generating"
                title="Stop"
                className={cn(
                  'composer-send-btn flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-[0.97]',
                  'composer-send-btn--active text-white shadow-md hover:opacity-95',
                )}
              >
                <Square className="h-3.5 w-3.5 fill-current" strokeWidth={2.25} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => canSend && onSubmit()}
                disabled={!canSend}
                aria-label="Send message"
                title={disabled && disabledReason ? disabledReason : undefined}
                className={cn(
                  'composer-send-btn flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-[0.97]',
                  canSend
                    ? 'composer-send-btn--active text-white shadow-md hover:opacity-95'
                    : 'cursor-not-allowed bg-[color:var(--bg-tertiary)] text-[color:var(--text-muted)]',
                )}
              >
                <Send className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>

      {dropdownPanel}
    </div>
  );
}

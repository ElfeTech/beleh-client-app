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
import { Check, ChevronDown, Search, Database, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { DataSourceResponse, ConnectorResponse } from '../../types/api';

export interface ChatComposerProps {
  workspaceId: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  datasources: DataSourceResponse[];
  connectors?: ConnectorResponse[];
  selectedDatasourceId: string | null;
  onDatasourceChange: (id: string | null) => void;
}

function formatSourceType(ds: DataSourceResponse): string {
  const raw = (ds.type || ds.mime_type || 'DATA').toUpperCase();
  if (raw.includes('POSTGRES') || raw === 'SQL') return 'POSTGRES';
  if (raw.includes('EXCEL') || raw.includes('SPREADSHEET') || raw === 'XLSX') return 'EXCEL';
  if (raw.includes('CSV')) return 'CSV';
  if (raw.includes('MONGO')) return 'MONGODB';
  return raw.replace(/\s+/g, '_').slice(0, 16);
}

function tagLabel(
  selectedDatasourceId: string | null,
  datasources: DataSourceResponse[],
  connectors: ConnectorResponse[] = []
): string {
  if (selectedDatasourceId === null || selectedDatasourceId === '') return 'GENERAL';

  const ds = datasources.find((d) => d.id === selectedDatasourceId);
  if (ds) {
    const upper = ds.name.toUpperCase();
    return upper.length > 16 ? `${upper.slice(0, 16)}…` : upper;
  }

  const connector = connectors.find((c) => c.id === selectedDatasourceId);
  if (connector) {
    const upper = connector.name.toUpperCase();
    return upper.length > 16 ? `${upper.slice(0, 16)}…` : upper;
  }

  return 'GENERAL';
}

export function ChatComposer({
  workspaceId,
  value,
  onChange,
  onSubmit,
  disabled,
  datasources,
  connectors = [],
  selectedDatasourceId,
  onDatasourceChange,
}: ChatComposerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const allSources = [...datasources.map((ds) => ({ ...ds, sourceKind: 'datasource' as const })), ...connectors.map((c) => ({ ...c, sourceKind: 'connector' as const }))].sort((a, b) => a.name.localeCompare(b.name));

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
    [onDatasourceChange]
  );

  const canSend = value.trim().length > 0 && !disabled;

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
          'max-h-[min(20rem,52vh)] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200'
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
                : 'text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)]'
            )}
            onClick={() => pick(null)}
          >
            {selectedDatasourceId === null || selectedDatasourceId === '' ? (
              <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <div className="flex flex-col">
              <span>General Intelligence</span>
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider opacity-80',
                  selectedDatasourceId === null || selectedDatasourceId === ''
                    ? 'text-primary-foreground/85'
                    : 'text-[color:var(--text-muted)]'
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
                Add a source
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
                statusLabel =
                  meta === 'COMPLETED'
                    ? c.status
                    : `METADATA ${meta}`;
              }

              const typeLabel = isDatasource ? formatSourceType(s as DataSourceResponse) : (s as ConnectorResponse).type.toUpperCase();

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
                    !selected && ready && 'text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)]',
                    !ready && 'cursor-not-allowed opacity-40 grayscale'
                  )}
                  onClick={() => ready && pick(s.id)}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      selected ? 'bg-white/20' : 'bg-[color:var(--ds-surface-muted)]'
                    )}
                  >
                    {isDatasource ? <FileText className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="block truncate font-semibold">{s.name}</span>
                      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </div>
                    <span
                      className={cn(
                        'block text-[10px] font-bold uppercase tracking-widest',
                        selected ? 'text-primary-foreground/80' : 'text-[color:var(--text-muted)]'
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
      document.body
    );

  return (
    <div ref={rootRef} className="relative z-40 w-full">
      <div
        className={cn(
          'flex w-full min-h-[52px] md:min-h-[56px] items-stretch gap-1.5 md:gap-2 rounded-2xl border px-2 py-1.5 md:px-3 md:py-2 shadow-sm transition-[box-shadow,border-color]',
          'border-[color:var(--border-primary)] bg-[color:var(--bg-primary)]',
          'focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/20',
          'dark:border-border/80 dark:bg-[color:var(--bg-card)] dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.65)]'
        )}
      >
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 max-w-[40%] items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1.5 text-[11px] font-extrabold tracking-wide text-primary sm:max-w-none',
            'hover:bg-primary/15 active:scale-[0.98] transition-all'
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="truncate">{tagLabel(selectedDatasourceId, datasources, connectors)}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 opacity-80 transition-transform', open && 'rotate-180')} />
        </button>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          placeholder={selectedDatasourceId === null || selectedDatasourceId === '' ? 'Ask a general question...' : 'Query selected source…'}
          disabled={disabled}
          rows={1}
          className={cn(
            'min-h-0 flex-1 resize-none bg-transparent py-2 text-sm leading-snug text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]',
            'disabled:cursor-not-allowed disabled:opacity-60'
          )}
        />

        <button
          type="button"
          onClick={() => canSend && onSubmit()}
          disabled={!canSend}
          className={cn(
            'self-center shrink-0 rounded-xl px-4 py-2 text-[11px] font-extrabold tracking-widest transition-all active:scale-[0.97]',
            canSend ? 'bg-primary text-primary-foreground shadow-sm hover:opacity-95' : 'cursor-not-allowed bg-muted text-muted-foreground'
          )}
        >
          SEND
        </button>
      </div>

      {dropdownPanel}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { CheckSquare, FileSpreadsheet, RefreshCw, Search, Square } from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { apiClient } from '../../../services/apiClient';
import { invalidateSheetsBindingsCache } from '../../../lib/providerCache';
import { ApiRequestError, formatProviderErrorToast } from '../../../utils/apiErrorMessage';
import type { ProviderConnection } from '../../../types/provider';
import type { ExcelSheet } from '../../../types/api';
import type {
  SheetBinding,
  SheetSpreadsheet,
  SheetTab,
  SheetTabPreview,
} from '../../../types/sheets';
import { SHEETS_CACHE_KEYS } from '../../../types/sheets';
import { useApiData } from '../../../hooks/useApiData';
import { HeaderRowPicker } from '../../upload/HeaderSelection';
import { ConnectionEmptyProjectsIcon, ConnectionLoadErrorIcon } from './ConnectorStateIcons';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

function previewToExcelSheet(preview: SheetTabPreview): ExcelSheet {
  return {
    name: preview.title,
    status: 'READY',
    needs_user_input: false,
    preview_rows: preview.preview_rows,
    selected: true,
  };
}

interface GoogleSheetsPickerViewProps {
  workspaceId: string;
  connection: ProviderConnection;
  onBound: (binding?: SheetBinding) => void;
}

export function GoogleSheetsPickerView({
  workspaceId,
  connection,
  onBound,
}: GoogleSheetsPickerViewProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SheetSpreadsheet | null>(null);
  const [selectedTabs, setSelectedTabs] = useState<Set<string> | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [importingBinding, setImportingBinding] = useState<SheetBinding | null>(null);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [headerQueue, setHeaderQueue] = useState<SheetTabPreview[] | null>(null);
  const [headerIndex, setHeaderIndex] = useState(0);
  const [headerChoices, setHeaderChoices] = useState<Record<string, number>>({});
  const pollTimerRef = useRef<number | null>(null);
  const pollDeadlineRef = useRef<number>(0);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearPoll, [clearPoll]);

  const pollBinding = useCallback(
    async (bindingId: string) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const bindings = await apiClient.listSheetBindings(token, workspaceId);
        const latest = bindings.find((b) => b.id === bindingId);
        if (!latest) return;

        setImportingBinding(latest);

        if (latest.sync_status === 'READY') {
          clearPoll();
          toast.success(`${latest.spreadsheet_name} is ready.`);
          onBound(latest);
          return;
        }
        if (latest.sync_status === 'FAILED') {
          clearPoll();
          toast.error(
            formatProviderErrorToast(null, latest.sync_error || 'Failed to import spreadsheet.'),
          );
          setImportingBinding(null);
          return;
        }
        if (Date.now() > pollDeadlineRef.current) {
          clearPoll();
          toast.message(
            'Still importing — this is taking longer than usual. It will appear in your datasets once ready.',
          );
          onBound(latest);
        }
      } catch {
        // Transient errors: keep polling until the timeout elapses.
        if (Date.now() > pollDeadlineRef.current) {
          clearPoll();
          setImportingBinding(null);
          toast.error('Lost track of the import. Check the datasets list shortly.');
        }
      }
    },
    [user, workspaceId, clearPoll, onBound],
  );

  const startPolling = useCallback(
    (binding: SheetBinding) => {
      clearPoll();
      pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
      setImportingBinding(binding);
      pollTimerRef.current = window.setInterval(
        () => void pollBinding(binding.id),
        POLL_INTERVAL_MS,
      );
      void pollBinding(binding.id);
    },
    [clearPoll, pollBinding],
  );

  const fetchSpreadsheets = useCallback(async () => {
    if (!user) return { spreadsheets: [] };
    const token = await user.getIdToken();
    return apiClient.listSpreadsheets(token, connection.id, query.trim() || undefined);
  }, [user, connection.id, query]);

  const {
    data: spreadsheetsResult,
    loading: spreadsheetsLoading,
    error: spreadsheetsError,
    refetch: refetchSpreadsheets,
  } = useApiData(
    SHEETS_CACHE_KEYS.spreadsheets(connection.id),
    fetchSpreadsheets,
    [user?.uid, connection.id, query],
    { immediate: Boolean(user), ttl: 30_000, dependencies: [user?.uid, connection.id, query] },
  );

  const needsReconnect =
    spreadsheetsError instanceof ApiRequestError &&
    spreadsheetsError.code === 'PROVIDER_CONNECTION_NOT_FOUND';

  const spreadsheets = useMemo(() => spreadsheetsResult?.spreadsheets ?? [], [spreadsheetsResult]);

  const fetchTabs = useCallback(async () => {
    if (!user || !selected) return [];
    const token = await user.getIdToken();
    return apiClient.listSheetTabs(token, connection.id, selected.id);
  }, [user, connection.id, selected]);

  const {
    data: tabs,
    loading: tabsLoading,
    error: tabsError,
  } = useApiData<SheetTab[]>(
    selected ? SHEETS_CACHE_KEYS.tabs(connection.id, selected.id) : 'sheets:tabs:none',
    fetchTabs,
    [user?.uid, connection.id, selected?.id],
    {
      immediate: Boolean(user && selected),
      ttl: 30_000,
      dependencies: [user?.uid, connection.id, selected?.id],
      onSuccess: (fetchedTabs) => {
        // All tabs selected by default, mirroring the Excel multi-sheet import UX.
        setSelectedTabs(new Set(fetchedTabs.map((t) => t.title)));
      },
    },
  );

  const handleSelectSpreadsheet = (spreadsheet: SheetSpreadsheet) => {
    setSelected(spreadsheet);
    setSelectedTabs(null);
    setHeaderQueue(null);
    setHeaderChoices({});
  };

  const toggleTab = (title: string) => {
    setSelectedTabs((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const allTabsSelected = tabs != null && selectedTabs != null && selectedTabs.size === tabs.length;

  /** Step 1 of connecting: load a raw preview per selected tab so the user can confirm the header row. */
  const handleReviewHeaders = async () => {
    if (!user || !selected || loadingPreviews) return;
    if (!selectedTabs || selectedTabs.size === 0) {
      toast.error('Select at least one tab to import.');
      return;
    }
    setLoadingPreviews(true);
    try {
      const token = await user.getIdToken();
      const titles = Array.from(selectedTabs);
      const previews = await Promise.all(
        titles.map((title) => apiClient.previewSheetTab(token, connection.id, selected.id, title)),
      );
      setHeaderChoices(Object.fromEntries(previews.map((p) => [p.title, p.detected_header_row])));
      setHeaderQueue(previews);
      setHeaderIndex(0);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to preview spreadsheet tabs';
      const code = err instanceof ApiRequestError ? err.code : null;
      toast.error(formatProviderErrorToast(code, detail));
    } finally {
      setLoadingPreviews(false);
    }
  };

  /** Step 2: after confirming every tab's header row, actually create the binding. */
  const handleConnect = async () => {
    if (!user || !selected || connecting) return;
    setConnecting(true);
    try {
      const token = await user.getIdToken();
      const importAllTabs =
        tabs != null && selectedTabs != null && selectedTabs.size === tabs.length;
      const binding = await apiClient.createSheetBinding(token, workspaceId, {
        connection_id: connection.id,
        spreadsheet_id: selected.id,
        spreadsheet_name: selected.name,
        spreadsheet_url: selected.url ?? undefined,
        // Omit selected_tabs entirely when everything is selected, matching the
        // backend's "empty/null = all tabs" contract (keeps future new tabs included).
        selected_tabs: importAllTabs ? undefined : Array.from(selectedTabs ?? []),
        header_row_by_tab: headerChoices,
      });
      invalidateSheetsBindingsCache(workspaceId);
      toast.message(`Importing ${selected.name}…`);
      startPolling(binding);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to connect spreadsheet';
      const code = err instanceof ApiRequestError ? err.code : null;
      toast.error(formatProviderErrorToast(code, detail));
    } finally {
      setConnecting(false);
    }
  };

  if (importingBinding) {
    return (
      <div className="ds-conn-list ds-conn-panel__body">
        <div className="ds-conn-empty">
          <div className="ds-conn-empty__icon" aria-hidden>
            <RefreshCw size={32} strokeWidth={1.75} className="ds-conn-spin" />
          </div>
          <h3 className="ds-conn-empty__title">Importing {importingBinding.spreadsheet_name}</h3>
          <p className="ds-conn-empty__copy">
            Reading your spreadsheet and building the dataset. This usually takes a few seconds —
            you can keep this panel open.
          </p>
        </div>
      </div>
    );
  }

  if (headerQueue && headerQueue.length > 0) {
    const currentPreview = headerQueue[headerIndex];
    const isLastTab = headerIndex === headerQueue.length - 1;
    const currentSheet = previewToExcelSheet(currentPreview);
    const currentChoice = headerChoices[currentPreview.title];

    return (
      <>
        <div className="ds-conn-panel__body" style={{ display: 'flex', flexDirection: 'column' }}>
          <HeaderRowPicker
            sheet={currentSheet}
            selectedRow={currentChoice}
            onSelectRow={(rowIndex) =>
              setHeaderChoices((prev) => ({ ...prev, [currentPreview.title]: rowIndex }))
            }
            progressLabel={
              headerQueue.length > 1 ? `${headerIndex + 1} of ${headerQueue.length}` : null
            }
          />
        </div>

        <footer className="ds-conn-panel__footer">
          <button
            type="button"
            className="ds-conn-list__add-btn"
            onClick={() => {
              if (headerIndex === 0) {
                setHeaderQueue(null);
              } else {
                setHeaderIndex((i) => i - 1);
              }
            }}
          >
            <span className="label">Back</span>
          </button>
          <button
            type="button"
            className="ds-conn-empty__cta"
            onClick={() => {
              if (isLastTab) {
                void handleConnect();
              } else {
                setHeaderIndex((i) => i + 1);
              }
            }}
            disabled={connecting || currentChoice == null}
          >
            {connecting ? 'Connecting…' : isLastTab ? 'Connect spreadsheet' : 'Next tab'}
          </button>
        </footer>
      </>
    );
  }

  if (selected) {
    return (
      <>
        <div className="ds-conn-list ds-conn-panel__body">
          <div className="ds-conn-list__binding">
            <span>
              Importing tabs from <strong>{selected.name}</strong>
            </span>
            <div className="ds-conn-list__binding-actions">
              <button
                type="button"
                className="ds-conn-list__add-btn"
                onClick={() => {
                  setSelected(null);
                  setSelectedTabs(null);
                }}
              >
                <span className="label">Choose a different spreadsheet</span>
              </button>
            </div>
          </div>

          <div className="ds-conn-list__toolbar">
            <span className="ds-conn-catalog__section-label" style={{ marginBottom: 0 }}>
              {selectedTabs?.size ?? 0} of {tabs?.length ?? 0} tabs selected
            </span>
            <button
              type="button"
              className="ds-conn-list__add-btn"
              onClick={() =>
                setSelectedTabs(allTabsSelected ? new Set() : new Set(tabs?.map((t) => t.title)))
              }
            >
              <span className="label">{allTabsSelected ? 'Clear all' : 'Select all'}</span>
            </button>
          </div>

          {tabsLoading && <p className="ds-conn-list__loading">Loading tabs…</p>}

          {tabsError && !tabsLoading && (
            <div className="ds-conn-empty ds-conn-empty--error">
              <div className="ds-conn-empty__icon" aria-hidden>
                <ConnectionLoadErrorIcon />
              </div>
              <h3 className="ds-conn-empty__title">Couldn't load tabs</h3>
              <p className="ds-conn-empty__copy">
                {tabsError.message || 'Something went wrong while reading this spreadsheet.'}
              </p>
            </div>
          )}

          {!tabsLoading && !tabsError && tabs && tabs.length > 0 && (
            <div className="ds-conn-list__rows">
              {tabs.map((tab) => {
                const checked = selectedTabs?.has(tab.title) ?? false;
                return (
                  <button
                    key={tab.title}
                    type="button"
                    className="ds-conn-list__row"
                    onClick={() => toggleTab(tab.title)}
                    aria-pressed={checked}
                  >
                    <div className="ds-conn-list__row-icon" aria-hidden>
                      {checked ? (
                        <CheckSquare size={20} strokeWidth={1.75} />
                      ) : (
                        <Square size={20} strokeWidth={1.75} />
                      )}
                    </div>
                    <div className="ds-conn-list__row-text">
                      <span className="ds-conn-list__row-title">{tab.title}</span>
                      <span className="ds-conn-list__row-meta">
                        {tab.row_count ?? '?'} rows × {tab.col_count ?? '?'} columns
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="ds-conn-panel__footer">
          <button
            type="button"
            className="ds-conn-empty__cta"
            onClick={() => void handleReviewHeaders()}
            disabled={loadingPreviews || !selectedTabs || selectedTabs.size === 0}
          >
            {loadingPreviews ? 'Loading previews…' : 'Review headers'}
          </button>
        </footer>
      </>
    );
  }

  return (
    <div className="ds-conn-list ds-conn-panel__body">
      {!needsReconnect && (
        <div className="ds-conn-list__toolbar">
          <div className="ds-conn-catalog__search">
            <Search
              size={18}
              strokeWidth={2}
              aria-hidden
              className="ds-conn-catalog__search-icon"
            />
            <input
              type="search"
              className="ds-conn-catalog__search-input"
              placeholder="Search spreadsheets…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search spreadsheets"
            />
          </div>
        </div>
      )}

      {spreadsheetsLoading && <p className="ds-conn-list__loading">Loading spreadsheets…</p>}

      {spreadsheetsError && !spreadsheetsLoading && (
        <div className="ds-conn-empty ds-conn-empty--error">
          <div className="ds-conn-empty__icon" aria-hidden>
            <ConnectionLoadErrorIcon />
          </div>
          <h3 className="ds-conn-empty__title">Couldn't load spreadsheets</h3>
          <p className="ds-conn-empty__copy">
            {needsReconnect
              ? `The Google account grant for ${connection.organization} is missing or was revoked. Reconnect it from the accounts list.`
              : spreadsheetsError.message ||
                'Something went wrong while listing your spreadsheets.'}
          </p>
          <button
            type="button"
            className="ds-conn-empty__cta"
            onClick={() => void refetchSpreadsheets()}
          >
            Try again
          </button>
        </div>
      )}

      {!spreadsheetsLoading && !spreadsheetsError && spreadsheets.length === 0 && (
        <div className="ds-conn-empty">
          <div className="ds-conn-empty__icon" aria-hidden>
            <ConnectionEmptyProjectsIcon />
          </div>
          <h3 className="ds-conn-empty__title">No spreadsheets found</h3>
          <p className="ds-conn-empty__copy">
            {query.trim()
              ? 'Try a different search.'
              : `No Google Sheets spreadsheets are available for ${connection.organization}.`}
          </p>
        </div>
      )}

      {!spreadsheetsLoading && !spreadsheetsError && spreadsheets.length > 0 && (
        <div className="ds-conn-list__rows">
          {spreadsheets.map((sheet) => (
            <button
              key={sheet.id}
              type="button"
              className="ds-conn-list__row"
              onClick={() => handleSelectSpreadsheet(sheet)}
            >
              <div className="ds-conn-list__row-icon" aria-hidden>
                <FileSpreadsheet size={20} strokeWidth={1.75} />
              </div>
              <div className="ds-conn-list__row-text">
                <span className="ds-conn-list__row-title">{sheet.name}</span>
                <span className="ds-conn-list__row-meta">
                  {sheet.modified_time
                    ? `Modified ${formatDistanceToNow(new Date(sheet.modified_time), { addSuffix: true })}`
                    : 'Tap to choose tabs'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

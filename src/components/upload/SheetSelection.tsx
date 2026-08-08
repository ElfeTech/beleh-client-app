import type { ExcelSheet } from '../../types/api';
import { formatSheetPreviewHint, SHEETS_PREVIEW_SUBCOPY } from '../../utils/uploadPreviewCopy';
import './SheetSelection.css';

interface SheetSelectionProps {
  sheets: ExcelSheet[];
  onToggleSheet: (sheetName: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
}

export function SheetSelection({
  sheets,
  onToggleSheet,
  onSelectAll,
  onClearAll,
}: Readonly<SheetSelectionProps>) {
  const selectedCount = sheets.filter((s) => s.selected).length;
  const allSelected = selectedCount === sheets.length && sheets.length > 0;

  return (
    <div className="sheet-selection-container">
      <div className="sheet-selection-header">
        <h3>Choose sheets to import</h3>
        <p>{SHEETS_PREVIEW_SUBCOPY}</p>
      </div>

      <div className="sheet-selection-toolbar">
        <span className="sheet-selection-count">
          {selectedCount} of {sheets.length} selected
        </span>
        <div className="sheet-selection-toolbar-actions">
          <button
            type="button"
            className="sheet-selection-text-btn"
            onClick={onSelectAll}
            disabled={allSelected || !onSelectAll}
          >
            Select all
          </button>
          <button
            type="button"
            className="sheet-selection-text-btn"
            onClick={onClearAll}
            disabled={selectedCount === 0 || !onClearAll}
          >
            Clear
          </button>
        </div>
      </div>

      <ul className="sheet-checklist" role="list">
        {sheets.map((sheet) => {
          const previewCount = sheet.preview_rows?.length ?? 0;
          return (
            <li key={sheet.name}>
              <button
                type="button"
                className={`sheet-check-row ${sheet.selected ? 'is-selected' : ''}`}
                onClick={() => onToggleSheet(sheet.name)}
                aria-pressed={sheet.selected}
              >
                <span
                  className={`sheet-check-box ${sheet.selected ? 'is-checked' : ''}`}
                  aria-hidden
                >
                  {sheet.selected ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  ) : null}
                </span>
                <span className="sheet-check-body">
                  <span className="sheet-check-name" title={sheet.name}>
                    {sheet.name}
                  </span>
                  <span className="sheet-check-meta">
                    <span className="sheet-check-hint">{formatSheetPreviewHint(previewCount)}</span>
                    {sheet.needs_user_input ? (
                      <span className="sheet-check-pill">Header needed</span>
                    ) : (
                      <span className="sheet-check-pill sheet-check-pill--ready">Ready</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import type { ExcelSheet } from '../../types/api';
import { formatPreviewSampleCaption } from '../../utils/uploadPreviewCopy';
import './HeaderSelection.css';

export interface HeaderRowPickerProps {
  sheet: ExcelSheet;
  selectedRow: number | undefined;
  onSelectRow: (rowIndex: number) => void;
  /** e.g. "2 of 3" when confirming multiple sheets */
  progressLabel?: string | null;
}

const getExcelColumnName = (index: number): string => {
  let name = '';
  let i = index;
  while (i >= 0) {
    name = String.fromCharCode((i % 26) + 65) + name;
    i = Math.floor(i / 26) - 1;
  }
  return name;
};

/** Single-sheet header row picker — navigation lives in the parent wizard footer. */
export function HeaderRowPicker({
  sheet,
  selectedRow,
  onSelectRow,
  progressLabel,
}: Readonly<HeaderRowPickerProps>) {
  const previewRows = sheet.preview_rows ?? [];
  const columnCount = previewRows[0]?.length ?? 0;

  return (
    <div className="header-row-picker">
      <div className="header-row-picker__head">
        <div className="header-row-picker__title-row">
          <h3 className="header-row-picker__title">{sheet.name}</h3>
          {progressLabel ? (
            <span className="header-row-picker__progress">{progressLabel}</span>
          ) : null}
        </div>
        <p className="header-row-picker__prompt">Tap the row that has the column titles.</p>
        <p className="header-row-picker__caption">
          {formatPreviewSampleCaption(previewRows.length)}
        </p>
        {sheet.reason ? <p className="header-row-picker__tip">{sheet.reason}</p> : null}
      </div>

      {previewRows.length > 0 ? (
        <div className="header-row-picker__table-wrap">
          <table className="header-row-picker__table">
            <thead>
              <tr>
                <th className="header-row-picker__index-h">#</th>
                {Array.from({ length: columnCount }, (_, i) => (
                  <th key={i} className="header-row-picker__col-h">
                    {getExcelColumnName(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => {
                const isSelected = selectedRow === rowIndex;
                return (
                  <tr
                    key={rowIndex}
                    className={`header-row-picker__row ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => onSelectRow(rowIndex)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectRow(rowIndex);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    aria-label={`Select row ${rowIndex + 1} as header`}
                  >
                    <td className="header-row-picker__index">
                      {isSelected ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="14"
                          height="14"
                          aria-hidden
                        >
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      ) : (
                        rowIndex + 1
                      )}
                    </td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="header-row-picker__cell">
                        {cell?.toString() || (
                          <span className="header-row-picker__empty">Empty</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="header-row-picker__empty-msg">No preview sample available for this sheet.</p>
      )}
    </div>
  );
}

/** @deprecated Prefer HeaderRowPicker — kept for any lingering imports. */
export const HeaderSelection = HeaderRowPicker;

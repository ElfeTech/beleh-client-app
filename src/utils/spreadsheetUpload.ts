/** Backend hard limit for CSV / Excel datasource uploads. */
export const MAX_SPREADSHEET_UPLOAD_BYTES = 100 * 1024 * 1024;

const ALLOWED_SPREADSHEET_EXTENSIONS = ['.csv', '.xlsx', '.xls'] as const;

export function formatSpreadsheetFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function spreadsheetUploadHint(): string {
  return `CSV and Excel · max ${formatSpreadsheetFileSize(MAX_SPREADSHEET_UPLOAD_BYTES)}`;
}

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0) return '';
  return fileName.slice(dot).toLowerCase();
}

export function validateSpreadsheetUpload(file: File): string | null {
  const ext = fileExtension(file.name);
  if (
    !ALLOWED_SPREADSHEET_EXTENSIONS.includes(ext as (typeof ALLOWED_SPREADSHEET_EXTENSIONS)[number])
  ) {
    return 'Use a CSV or Excel file (.csv, .xlsx, or .xls).';
  }
  if (file.size > MAX_SPREADSHEET_UPLOAD_BYTES) {
    return `${file.name} is ${formatSpreadsheetFileSize(file.size)}. Maximum allowed size is ${formatSpreadsheetFileSize(MAX_SPREADSHEET_UPLOAD_BYTES)}.`;
  }
  return null;
}

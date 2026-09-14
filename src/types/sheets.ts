/** Google Sheets datasource API types , /api/v1/sheets/* and /api/v1/workspaces/{id}/sheets/* */

export interface SheetSpreadsheet {
  id: string;
  name: string;
  modified_time?: string | null;
  url?: string | null;
}

export interface SheetSpreadsheetListResponse {
  spreadsheets: SheetSpreadsheet[];
  next_page_token?: string | null;
}

export interface SheetTab {
  title: string;
  sheet_id: number;
  row_count?: number | null;
  col_count?: number | null;
}

export interface SheetTabPreview {
  title: string;
  preview_rows: unknown[][];
  detected_header_row: number;
}

export interface SheetBindingCreateRequest {
  connection_id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  spreadsheet_url?: string | null;
  selected_tabs?: string[] | null;
  /** Tab title -> 0-based header row index. Omit a tab to auto-detect its header. */
  header_row_by_tab?: Record<string, number> | null;
  refresh_interval_minutes?: number;
}

export type SheetSyncStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface SheetBinding {
  id: string;
  workspace_id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  spreadsheet_url?: string | null;
  selected_tabs?: string[] | null;
  header_row_by_tab?: Record<string, number> | null;
  datasource_id: string | null;
  refresh_interval_minutes: number;
  last_synced_at: string | null;
  sync_status: SheetSyncStatus;
  sync_error: string | null;
  created_at: string;
}

export interface SheetSyncResponse {
  scheduled: boolean;
}

/** Cache keys (semantic , used with apiCacheManager) */
export const SHEETS_CACHE_KEYS = {
  connections: 'sheets:connections',
  spreadsheets: (connectionId: string) => `sheets:spreadsheets:${connectionId}`,
  tabs: (connectionId: string, spreadsheetId: string) =>
    `sheets:tabs:${connectionId}:${spreadsheetId}`,
  bindings: (workspaceId: string) => `sheets:bindings:${workspaceId}`,
} as const;

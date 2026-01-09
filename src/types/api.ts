// API Types based on backend schema

export interface UserCreate {
  token: string;
}

export interface UserResponse {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  user_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCreate {
  name: string;
}

export interface DataSourceColumn {
  name: string;
  type: string;
  role: string;
  null_percentage: number;
  sample_values: any[];
}

export interface SampleRow {
  row_index: number;
  values: any[];
}

export interface BackendExcelSheet {
  sheet_name: string;
  sheet_index: number;
  status: 'invalid' | 'valid';
  issues: string[];
  reason: string;
  total_rows: number;
  total_columns: number;
  detected_header_row?: number;
  sample_rows: SampleRow[];
  suggested_action: string;
  is_fixable: boolean;
}

export interface ValidationResult {
  status: string;
  file_id: string;
  file_name: string;
  file_type: string;
  sheets: BackendExcelSheet[];
  total_sheets: number;
  valid_sheets: number;
  invalid_sheets: number;
  message: string;
}

export interface ExcelSheet {
  name: string;
  status: 'READY' | 'NEEDS_ATTENTION';
  needs_user_input: boolean;
  preview_rows?: any[][];
  column_names?: string[];
  selected: boolean;
  reason?: string;
  issues?: string[];
}

export interface DataSourceMetadataJson {
  row_count?: number;
  col_count?: number;
  columns?: DataSourceColumn[];
  duckdb_path?: string;
  ingested_at?: string;
  validation_result?: ValidationResult;
  requires_user_input?: boolean;
}

export interface WorkspaceInfo {
  name: string;
  description: string;
  id: string;
  owner_id: string;
  created_at: string;
  is_default: boolean;
}

export interface OwnerInfo {
  email: string;
  display_name: string;
  photo_url: string;
  id: string;
  uid: string;
  is_active: boolean;
}

export interface DataSourceResponse {
  id: string;
  name: string;
  type: string;
  is_first_row_header: boolean;
  user_id: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'NEEDS_INPUT';
  file_size: number;
  mime_type: string;
  duckdb_storage_path: string;
  ingestion_error: string | null;
  metadata_json: DataSourceMetadataJson | null;
  sheets?: ExcelSheet[];
  needs_user_input?: boolean;
  current_sheet_preview?: any[][];
  created_at: string;
  updated_at: string;
  workspace?: WorkspaceInfo;
  owner?: OwnerInfo;
}

export interface SheetRecoveryConfig {
  sheet_name: string;
  header_row_index: number;
}

export interface DataSourceRecoveryRequest {
  datasource_id: string;
  sheets_to_ingest: string[];
  sheet_configurations: SheetRecoveryConfig[];
}

export interface DataSourceRecoveryResponse {
  status: string;
  datasource_id: string;
  sheets: BackendExcelSheet[];
  ingestion_started: boolean;
  message: string;
}

export interface DataSourceMetadata {
  id: string;
  name: string;
  type: string;
  file_type: string;
  row_count: number;
  column_count: number;
  columns: string[];
  file_size?: number;
  created_at: string;
  updated_at: string;
}

// Chat API Types
export interface IntentRequest {
  prompt: string;
  dataset_id: string;
}

export interface ChatWorkflowResponse {
  intent?: IntentMetadata;
  execution?: ExecutionMetadata;
  visualization?: VisualizationRecommendation | null;
  insight?: InsightResponse | null;
  session_id?: string;
  message_id?: string;
}

export interface QueryResult {
  columns: string[];
  data: Record<string, any>[];
  row_count: number;
}

export interface FieldEncoding {
  field: string;
  type: 'categorical' | 'quantitative' | 'temporal';
  label: string;
  format?: string;
}

export interface SortingConfig {
  field: string;
  order: 'ascending' | 'descending';
}

export interface VisualizationRecommendation {
  // New backend format uses 'type', old format uses 'visualization_type'
  type?:
  | 'line' | 'multiline' | 'bar' | 'stacked_bar' | 'heatmap' | 'scatter' | 'pie' | 'table' | 'auto';
  visualization_type?:
  // Backend format (lowercase with underscores)
  | 'line' | 'multiline' | 'bar' | 'stacked_bar' | 'heatmap' | 'scatter' | 'pie' | 'table' | 'auto'
  // Legacy frontend format (uppercase with underscores) - for backward compatibility
  | 'BAR_CHART' | 'LINE_CHART' | 'PIE_CHART' | 'SCATTER_PLOT' | 'TABLE' | 'HEATMAP'
  | 'MULTI_LINE_CHART' | 'GROUPED_BAR_CHART' | 'STACKED_BAR_CHART' | 'NONE';
  title: string;
  description: string;
  // New backend format uses 'dimensions', old format uses 'encoding'
  dimensions?: {
    x?: string;
    y?: string;
    color?: string;
    size?: string;
    series?: string;
    facet?: string;
  };
  encoding?: {
    x?: FieldEncoding;
    y?: FieldEncoding;
    color?: FieldEncoding;
    size?: FieldEncoding;
    series?: FieldEncoding;
    facet?: FieldEncoding;
  };
  sorting?: SortingConfig;
  data_preview?: Record<string, any>[];
  render_fallback?: string;
  fallback_reason?: string | null;
  fallback_type?: string;
  dimension_count?: number;
  use_fallback?: boolean;
  time_grain?: string;
  confidence?: number;
}

export interface SupportingFact {
  [key: string]: any;
}

export interface InsightResponse {
  summary: string;
  key_insights: string[];
  supporting_facts: SupportingFact[];
  limitations: string;
  confidence: number;
}

// Chat Session Types
export interface ChatSessionCreate {
  title?: string;
}

export interface ChatSessionRead {
  id: string;
  dataset_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// Message metadata from API
export interface IntentMetadata {
  intent: string;
  confidence: number;
  entities: any;
  visualization: string;
  clarification_needed: boolean;
  clarification_message?: string;
}

export interface ExecutionMetadata {
  status: string;
  execution_time_ms: number;
  row_count: number;
  columns: Array<{ name: string; type: string }>;
  rows: Record<string, any>[];
  cache_hit: boolean;
  visualization_hint: string | null;
  error_type: string | null;
  message: string | null;
}

export interface ChatMessageMetadata {
  intent?: IntentMetadata;
  execution?: ExecutionMetadata;
  visualization?: VisualizationRecommendation;
  insight?: InsightResponse;
  session_id?: string;
  message_id?: string;
}

export interface ChatMessageRead {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  message_metadata?: ChatMessageMetadata;
  created_at: string;
}

// Workspace State Types
export interface WorkspaceState {
  workspace_id: string;
  user_id: string;
  last_active_session_id: string | null;
  last_active_dataset_id: string | null;
}

export interface WorkspaceContextResponse {
  workspace: WorkspaceResponse;
  state: WorkspaceState;
  active_session_title: string | null;
  active_dataset_name: string | null;
}

export interface UpdateWorkspaceStateRequest {
  last_active_session_id?: string | null;
  last_active_dataset_id?: string | null;
}

// Pagination Types
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// Dataset Preview Types
export interface DatasetTableColumn {
  name: string;
  type: string;
}

export interface DatasetTable {
  table_name: string;
  row_count: number;
  column_count: number;
  columns: DatasetTableColumn[];
}

export interface DatasetTablesResponse {
  dataset_id: string;
  tables: DatasetTable[];
}

export interface DatasetTablePreviewResponse {
  table_name: string;
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
  columns: DatasetTableColumn[];
  rows: any[][];
}

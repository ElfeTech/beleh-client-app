// API Types based on backend schema

/** POST `/api/auth/register` | `/login` , Firebase ID token + optional invite auto-accept. */
export interface AuthTokenRequest {
  token: string;
  invite_token?: string;
}

/** @deprecated Prefer AuthTokenRequest */
export type UserCreate = AuthTokenRequest;

export interface UserResponse {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

/** GET/PATCH `/api/users/me` , profile + merged UI preferences (JSON). */
export interface UserMeResponse {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  preferences: Record<string, unknown>;
}

export interface UserMePatch {
  display_name?: string | null;
  preferences?: Record<string, unknown>;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export type WorkspaceRole = 'owner' | 'member';

export interface WorkspaceResponse {
  id: string;
  name: string;
  /** @deprecated Prefer owner_id , legacy alias some payloads may still use. */
  user_id?: string;
  /** Workspace creator / billing boundary owner (backend user UUID). */
  owner_id?: string;
  tenant_id?: string;
  is_default: boolean;
  /** Caller's role in this workspace when returned by list/context. */
  role?: WorkspaceRole;
  /** Memberships when included on workspace payloads. */
  members?: WorkspaceMember[];
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCreate {
  name: string;
}

export type WorkspaceInvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface WorkspaceMemberUser {
  id: string;
  uid: string;
  email: string;
  display_name?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
}

export interface WorkspaceMember {
  id?: string;
  /** Backend user UUID (used for DELETE /members/{userId}). */
  user_id: string;
  role: WorkspaceRole;
  status: 'active' | string;
  joined_at?: string;
  /** Nested profile when returned by list/accept APIs. */
  user?: WorkspaceMemberUser | null;
  /** Flattened convenience fields (normalized client-side when nested). */
  email?: string | null;
  display_name?: string | null;
  photo_url?: string | null;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceInvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkspaceInvitationCreate {
  email: string;
  role?: 'member';
}

export type WorkspacePlanStatus = 'trial' | 'active' | 'expired' | (string & {});

export interface WorkspaceUsageResponse {
  seats_used: number;
  seats_limit: number;
  datasources_used: number;
  datasources_limit: number;
  workspaces_used: number;
  workspaces_limit: number;
  queries_used?: number;
  queries_limit?: number;
  llm_tokens_used?: number;
  llm_tokens_limit?: number;
  /** Remaining period AI tokens when provided by the API. */
  llm_tokens_remaining?: number;
  daily_llm_tokens_used?: number;
  daily_llm_tokens_limit?: number;
  daily_llm_tokens_remaining?: number;
  daily_reset_at?: string | null;
  reset_at?: string | null;
  is_trial?: boolean;
  trial_end?: string | null;
  plan_status?: WorkspacePlanStatus | null;
  plan_tier?: string | null;
  upgrade_url?: string | null;
}

export type QuotaLimitType =
  | 'queries'
  | 'llm_tokens'
  | 'daily_llm_tokens'
  | 'datasets'
  | 'members_per_workspace'
  | 'workspaces';

export interface QuotaExceededDetail {
  error: 'quota_exceeded';
  limit_type: QuotaLimitType;
  current_usage: number;
  limit: number;
  remaining: number;
  reset_at?: string | null;
  message?: string;
  upgrade_url?: string | null;
}

export interface AcceptInvitationResponse {
  /** Present when API includes it; otherwise resolved client-side after accept. */
  workspace_id?: string;
  member?: WorkspaceMember;
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
  /** True when this is the Free-trial sample dataset. */
  is_demo?: boolean;
}

/** GET /api/workspaces/{id}/demo */
export interface WorkspaceDemoStatus {
  connected: boolean;
  is_demo?: boolean;
  datasource?: DataSourceResponse | null;
  suggested_prompts?: string[];
  headline?: string | null;
  message?: string | null;
}

/** POST /api/workspaces/{id}/demo/connect */
export interface WorkspaceDemoConnectResponse {
  already_connected: boolean;
  is_demo: boolean;
  datasource: DataSourceResponse;
  suggested_prompts: string[];
  headline: string;
  message: string;
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
  dataset_id: string | null;
}

export type ArtifactType =
  | 'kpi'
  | 'table'
  | 'column'
  | 'bar'
  | 'line'
  | 'area'
  | 'doughnut'
  | 'pie'
  | 'scatter'
  | 'insight'
  | 'action_group'
  | 'filter_bar'
  | 'empty_state'
  | 'error';

/** Category + part-to-whole + correlation charts in the generative-UI registry. */
export type ChartArtifactType = 'column' | 'bar' | 'line' | 'area' | 'doughnut' | 'pie' | 'scatter';

export type ActionStyle = 'primary' | 'secondary' | 'ghost';
export type ActionKind = 'ask' | 'run_tool' | 'navigate';

export interface KpiMetric {
  label: string;
  value: string;
  sub?: string | null;
  delta_pct?: number | null;
}

export interface KpiData {
  metrics: KpiMetric[];
}

export interface TableData {
  columns: string[];
  rows: unknown[][];
  page_size?: number;
}

export interface ChartDataset {
  label: string;
  data: number[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  source_tool_call_id?: string | null;
}

export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
}

export interface ScatterDataset {
  label: string;
  points: ScatterPoint[];
}

/** Scatter-only payload (not ChartData). */
export interface ScatterData {
  datasets: ScatterDataset[];
  x_label?: string;
  y_label?: string;
  source_tool_call_id?: string | null;
}

export interface InsightData {
  bullets: string[];
  limitations?: string | null;
  confidence?: number | null;
}

export interface ActionItem {
  id: string;
  label: string;
  style?: ActionStyle;
  kind?: ActionKind;
  payload?: Record<string, unknown>;
}

export interface ActionGroupData {
  actions: ActionItem[];
}

export interface FilterOption {
  id: string;
  label: string;
  value: string;
}

export interface FilterBarData {
  filters: FilterOption[];
}

export interface EmptyStateData {
  message: string;
}

export interface ErrorData {
  message: string;
  code?: string | null;
}

export interface UiArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  version: number;
  data: Record<string, unknown>;
}

export interface AssistantTurnMeta {
  model?: string | null;
  tools_used?: string[];
  latency_ms?: number | null;
  row_count?: number | null;
  /** SQL panels finalized; missing → treat as 1 for older messages */
  panel_count?: number | null;
  validation_warnings?: string[];
  /** Optional viz remaps / notes; usually also covered in narrative text */
  viz_notes?: string[];
}

export interface AssistantTurnResponse {
  message_id?: string | null;
  role: 'assistant';
  text: string;
  artifacts: UiArtifact[];
  meta: AssistantTurnMeta;
  session_id?: string | null;
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

/** Legacy chart encoding shape used by older chart components */
export interface VisualizationRecommendation {
  type?:
    | 'line'
    | 'multiline'
    | 'bar'
    | 'stacked_bar'
    | 'heatmap'
    | 'scatter'
    | 'pie'
    | 'table'
    | 'auto';
  visualization_type?:
    | 'line'
    | 'multiline'
    | 'bar'
    | 'stacked_bar'
    | 'heatmap'
    | 'scatter'
    | 'pie'
    | 'table'
    | 'auto'
    | 'BAR_CHART'
    | 'LINE_CHART'
    | 'PIE_CHART'
    | 'SCATTER_PLOT'
    | 'TABLE'
    | 'HEATMAP'
    | 'MULTI_LINE_CHART'
    | 'GROUPED_BAR_CHART'
    | 'STACKED_BAR_CHART'
    | 'NONE';
  title: string;
  description: string;
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

// Chat Session Types
export interface ChatSessionCreate {
  title?: string;
  dataset_id?: string;
}

export interface ChatSessionRead {
  id: string;
  dataset_id: string;
  connector_id?: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/** Persisted assistant turn metadata (history rehydrate) */
export interface ChatMessageMetadata {
  artifacts?: UiArtifact[];
  meta?: AssistantTurnMeta;
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
  /** Caller's role when returned by resolve_workspace_context. */
  role?: WorkspaceRole;
  current_user_role?: WorkspaceRole;
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
  /** Present on some connector payloads; otherwise inferred from `schema.table` names. */
  schema_name?: string | null;
  row_count: number;
  column_count: number;
  columns: DatasetTableColumn[];
}

export interface DatasetTablesResponse {
  dataset_id: string;
  tables: DatasetTable[];
  page?: number;
  page_size?: number;
  total_items?: number;
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
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

// Connector Types
export type ConnectorStatus = 'ACTIVE' | 'INACTIVE' | 'FAILED' | 'SYNCING';
export type MetadataStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface ConnectorCreate {
  name: string;
  type: 'postgresql';
  config: PostgreSQLConfig;
}

export interface ConnectorResponse {
  id: string;
  name: string;
  type: string;
  status: ConnectorStatus;
  metadata_status: MetadataStatus;
  last_sync_at: string | null;
  workspace_id: string;
  /** Creator; used for member edit/delete gating when present. */
  user_id?: string;
  created_at: string;
  updated_at: string | null;
}

export interface ConnectionTestRequest extends PostgreSQLConfig {}

export interface ConnectionTestResponse {
  success: boolean;
  message: string;
  db_info?: Record<string, any>;
}

export interface ConnectorTablesResponse {
  connector_id: string;
  metadata_status: MetadataStatus;
  tables: DatasetTable[];
  page?: number;
  page_size?: number;
  total_items?: number;
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
}

// Usage and Plan Type Definitions
// Matches backend API contract for /api/usage/* endpoints

// Plan Types
export interface PlanLimits {
  monthly_query_limit: number;
  monthly_llm_token_limit: number;
  monthly_rows_scanned_limit: number;
  monthly_chart_renders_limit: number;
  max_datasets: number;
  max_workspaces: number;
  max_members_per_workspace: number;
}

export interface PlanFeatures {
  [key: string]: boolean | string | number;
}

export interface Plan {
  id: string;
  name: string;
  tier: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  limits: PlanLimits;
  features: PlanFeatures;
  is_active: boolean;
}

export interface PlanResponse {
  plan: Plan;
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
}

export interface PlanListResponse {
  plans: Plan[];
}

// Usage Metrics from actual API
export interface UsageMetrics {
  queries_used: number;
  queries_limit: number;
  queries_remaining: number;
  llm_tokens_used: number;
  llm_tokens_limit: number;
  llm_tokens_remaining: number;
  rows_scanned_used: number;
  rows_scanned_limit: number;
  rows_scanned_remaining: number;
  chart_renders_used: number;
  chart_renders_limit: number;
  chart_renders_remaining: number;
  datasets_used: number;
  datasets_limit: number;
  datasets_remaining: number;
}

// Current Usage Response from /api/usage/
export interface CurrentUsageResponse {
  user_id: string;
  workspace_id: string | null;
  plan: Plan;
  metrics: UsageMetrics;
  billing_cycle_start: string;
  billing_cycle_end: string;
  reset_at: string;
  last_updated: string;
}

export interface RemainingQuotaResponse {
  queries_remaining: number;
  queries_used: number;
  queries_limit: number;
  percentage_used: number;
  can_execute_query: boolean;
  reset_date: string;
}

export interface UsageSummary {
  queries_percentage: number;
  datasources_percentage: number;
  members_percentage: number;
  plan_name: string;
  reset_date: string;
  warnings: UsageWarning[];
}

export interface UsageWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
  metric: 'queries' | 'datasources' | 'members' | 'tokens' | 'rows' | 'charts';
  percentage: number;
}

// Quota Check
export interface QuotaCheckRequest {
  operation: 'query' | 'datasource' | 'member';
  workspace_id?: string;
}

export interface QuotaCheckResponse {
  allowed: boolean;
  reason?: string;
  current_usage: number;
  limit: number;
  percentage_used: number;
}

// Historical Usage
export interface DailyUsage {
  date: string;
  queries_count: number;
  unique_users: number;
}

export interface MonthlyAggregate {
  month: string;
  queries_total: number;
  queries_average_per_day: number;
  unique_users: number;
}

export interface HistoricalUsageResponse {
  daily_usage: DailyUsage[];
  monthly_aggregates: MonthlyAggregate[];
  workspace_id: string | null;
}

// Local State Types
export interface UsageState {
  currentUsage: CurrentUsageResponse | null;
  summary: UsageSummary | null;
  remaining: RemainingQuotaResponse | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

export interface UsageContextValue extends UsageState {
  refreshUsage: () => Promise<void>;
  checkQuota: (operation: 'query' | 'datasource' | 'member') => Promise<QuotaCheckResponse>;
  hasWarning: (level: 'warning' | 'critical') => boolean;
  canExecuteQuery: boolean;
}

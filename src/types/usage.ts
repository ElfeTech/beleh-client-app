// Usage and Plan Type Definitions
// Matches backend API contract for /api/usage/* endpoints

/** Credit conversion metadata returned on usage / plan payloads. */
export interface CreditInfo {
  tokens_per_credit: number;
  credit_cost_usd: number | null;
  currency?: string;
}

// Plan Types
export interface PlanLimits {
  monthly_query_limit: number;
  monthly_credit_limit: number;
  daily_credit_limit?: number;
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
  /** Display-only list prices (cents) used for strikethrough pricing. */
  compare_at_price_monthly?: number | null;
  compare_at_price_yearly?: number | null;
  discount_label?: string | null;
  discount_percent_monthly?: number | null;
  discount_percent_yearly?: number | null;
  limits: PlanLimits;
  features: PlanFeatures;
  is_active: boolean;
  tokens_per_credit?: number;
  credit_cost_usd?: number | null;
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
  credits_used: number;
  credits_limit: number;
  credits_remaining: number;
  daily_credits_used?: number;
  daily_credits_limit?: number;
  daily_credits_remaining?: number;
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

/** Included plan price prorated by remaining quota (from GET /api/usage/). Display as-is. */
export interface PlanValueBlock {
  included_value_usd: number | null;
  used_value_usd: number | null;
  remaining_value_usd: number | null;
  value_used_pct: number | null;
  currency: string;
  basis?: string;
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
  daily_reset_at?: string | null;
  last_updated: string;
  value?: PlanValueBlock | null;
  credit?: CreditInfo | null;
  tokens_per_credit?: number;
  credit_cost_usd?: number | null;
  is_trial?: boolean;
  trial_end?: string | null;
  plan_status?: string | null;
}

/**
 * Remaining quota , includes API $ fields plus client-derived query counters
 * used by existing UI (sidebar, banners).
 */
export interface RemainingQuotaResponse {
  queries_remaining: number;
  queries_used: number;
  queries_limit: number;
  percentage_used: number;
  can_execute_query: boolean;
  reset_date: string;
  credits_remaining?: number;
  daily_credits_remaining?: number;
  daily_credits_limit?: number;
  tokens_per_credit?: number;
  credit_cost_usd?: number | null;
  included_value_usd?: number | null;
  used_value_usd?: number | null;
  remaining_value_usd?: number | null;
  value_used_pct?: number | null;
  currency?: string;
  is_unlimited?: boolean;
}

export interface UsageSummary {
  queries_percentage: number;
  datasources_percentage: number;
  members_percentage: number;
  credits_used_pct?: number;
  tokens_per_credit?: number;
  credit_cost_usd?: number | null;
  plan_name: string;
  reset_date: string;
  warnings: UsageWarning[];
  remaining_value_usd?: number | null;
  value_used_pct?: number | null;
  included_value_usd?: number | null;
  used_value_usd?: number | null;
  currency?: string;
}

export interface UsageWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
  metric: 'queries' | 'datasources' | 'members' | 'credits' | 'daily_credits' | 'rows' | 'charts';
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
  queries: number;
  credits: number;
  rows_scanned: number;
  chart_renders: number;
}

export interface MonthlyUsage {
  period_start: string;
  period_end: string;
  total_queries: number;
  total_credits: number;
  total_rows_scanned: number;
  total_chart_renders: number;
}

export interface HistoricalUsageResponse {
  user_id: string;
  workspace_id: string | null;
  daily_usage: DailyUsage[];
  monthly_usage: MonthlyUsage[];
  total_period: MonthlyUsage | null;
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
  getHistoricalUsage: (
    days?: number,
    workspaceId?: string,
  ) => Promise<HistoricalUsageResponse | null>;
  canExecuteQuery: boolean;
  decrementQueryCount: () => void;
  refreshUsageAfterAction: () => Promise<void>;
}

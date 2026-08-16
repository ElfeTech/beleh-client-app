import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Activity, Zap, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { useUsage } from '../context/UsageContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/useAuth';
import {
  BILLING_UPGRADE_HREF,
  canShowWorkspaceUpgradeCta,
  isUnlimitedLimit,
  PLAN_MANAGED_BY_OWNER_COPY,
} from '../utils/workspaceAccess';
import { PlanValueCard } from '../components/usage/PlanValueCard';
import { QuotaUsageGrid } from '../components/usage/QuotaUsageGrid';
import { SettingsSectionHeader } from '../components/settings/SettingsSectionHeader';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import type { HistoricalUsageResponse } from '../types/usage';
import { formatCreditCount } from '../utils/formatters';
import { useUiMemory } from '../hooks/useUiMemory';
import { UI_KEYS, type UiMemoryScope } from '../lib/uiMemory';
import './UsageStatisticsPage.css';

const TICK_STYLE = {
  fill: 'var(--text-muted)',
  fontSize: 10,
  fontWeight: 600,
  fontFamily: 'var(--font-mono)',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--panel-bg)',
  borderColor: 'var(--border-primary)',
  borderRadius: '12px',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  boxShadow: 'var(--shadow-md)',
};

function TimeRangeControls({
  timeRange,
  onChange,
  disabled,
}: Readonly<{
  timeRange: number;
  onChange: (n: number) => void;
  disabled: boolean;
}>) {
  return (
    <div className="time-range-selector__controls">
      {[7, 30, 90].map((range) => (
        <button
          key={range}
          type="button"
          disabled={disabled}
          onClick={() => onChange(range)}
          className={cn('range-btn', timeRange === range && 'active')}
        >
          {range}D
        </button>
      ))}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <div className="stats-grid">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn('analytics-skeleton analytics-skeleton-kpi', `analytics-stagger-${i}`)}
          />
        ))}
      </div>
      <div className="charts-layout">
        <div className="analytics-skeleton analytics-skeleton-chart-lg analytics-stagger-5" />
        <div className="charts-layout__secondary">
          <div className="analytics-skeleton analytics-skeleton-chart-sm analytics-stagger-5" />
        </div>
      </div>
    </>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  iconClassName,
  plotClassName,
  children,
}: Readonly<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClassName: string;
  plotClassName: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="analytics-chart-card">
      <div className="chart-header flex items-center gap-2">
        <div className={cn('p-2 rounded-lg', iconClassName)}>{icon}</div>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className={plotClassName}>{children}</div>
    </div>
  );
}

interface UsageStatisticsPageProps {
  embedded?: boolean;
}

const UsageStatisticsPage: React.FC<UsageStatisticsPageProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { id: routeWorkspaceId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { currentWorkspace, currentRole } = useWorkspace();
  const workspaceId = routeWorkspaceId ?? currentWorkspace?.id;
  const { currentUsage, getHistoricalUsage } = useUsage();
  const [history, setHistory] = useState<HistoricalUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const usageRangeScope: UiMemoryScope | null =
    user?.uid && workspaceId ? { kind: 'workspace', uid: user.uid, workspaceId } : null;
  const [timeRange, setTimeRangeRaw] = useUiMemory(usageRangeScope, UI_KEYS.usageTimeRange, 30);
  const setTimeRange = (n: number) => setTimeRangeRaw(n);
  const showUpgrade = canShowWorkspaceUpgradeCta(currentRole);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const data = await getHistoricalUsage(timeRange, workspaceId);
      setHistory(data);
      setLoading(false);
    };

    void fetchHistory();
  }, [getHistoricalUsage, timeRange, workspaceId]);

  const periodLabel = useMemo(() => `Last ${timeRange} days`, [timeRange]);

  const creditMeter = useMemo(() => {
    const metrics = currentUsage?.metrics;
    if (!metrics) return null;
    const used = metrics.credits_used ?? 0;
    const limit = metrics.credits_limit ?? 0;
    const remaining =
      metrics.credits_remaining != null
        ? Math.max(0, metrics.credits_remaining)
        : isUnlimitedLimit(limit)
          ? null
          : Math.max(0, limit - used);
    return { used, limit, remaining };
  }, [currentUsage]);

  const stats = useMemo(() => {
    const creditsUsed = creditMeter?.used ?? history?.total_period?.total_credits ?? 0;
    const creditsUnlimited = creditMeter != null && isUnlimitedLimit(creditMeter.limit);
    const creditsDetail =
      creditMeter == null
        ? 'From selected reporting window'
        : creditsUnlimited
          ? `${formatCreditCount(creditsUsed)} used · Unlimited plan`
          : `${formatCreditCount(creditMeter.remaining ?? 0)} left of ${formatCreditCount(creditMeter.limit)} allocated`;

    return [
      {
        label: 'Total Prompts',
        value: String(history?.total_period?.total_queries ?? 0),
        detail: periodLabel,
        icon: Activity,
        accent: 'var(--kpi-accent-teal)',
        iconClass:
          'text-[color:var(--accent-teal-500)] bg-[color-mix(in_srgb,var(--accent-teal-500)_12%,transparent)]',
      },
      {
        label: 'AI Credits',
        value: formatCreditCount(creditsUsed),
        detail: creditsDetail,
        icon: Zap,
        accent: 'var(--kpi-accent-amber)',
        iconClass: 'text-amber-500 bg-amber-500/10',
      },
      {
        label: 'Charts Generated',
        value: String(history?.total_period?.total_chart_renders ?? 0),
        detail: periodLabel,
        icon: BarChart3,
        accent: 'var(--kpi-accent-purple)',
        iconClass: 'text-purple-500 bg-purple-500/10',
      },
    ];
  }, [history, creditMeter, periodLabel]);

  const chartData =
    history?.daily_usage.map((d) => ({
      ...d,
      formattedDate: format(parseISO(d.date), 'MMM dd'),
    })) ?? [];

  const hasChartData = chartData.length > 0;
  const isInitialLoad = loading && !history;

  return (
    <div
      className={cn(
        'usage-stats-container analytics-page',
        embedded ? 'usage-stats-container--embedded' : 'app-page-root--scroll',
      )}
    >
      <div className="usage-stats-inner">
        {embedded ? (
          <>
            <SettingsSectionHeader
              breadcrumbLabel="USAGE ANALYTICS"
              title="Usage Analytics"
              description="Detailed breakdown of your analytical consumption and API resource usage."
              icon={<TrendingUp size={20} strokeWidth={1.75} />}
            />
            <div className="usage-stats-embedded-controls">
              {!isInitialLoad && (
                <p className="usage-stats-period-label font-mono">{periodLabel}</p>
              )}
              <div className="time-range-selector">
                <span className="app-data-label">Reporting window</span>
                <TimeRangeControls
                  timeRange={timeRange}
                  onChange={setTimeRange}
                  disabled={loading}
                />
              </div>
            </div>
          </>
        ) : (
          <header className="usage-stats-header">
            <div>
              <div className="usage-stats-header__icon">
                <TrendingUp className="h-5 w-5" strokeWidth={2} />
              </div>
              <h1 className="app-page-title">Usage Analytics</h1>
              <p className="app-page-subtitle mt-1">
                Detailed breakdown of your analytical consumption and API resource usage.
              </p>
              {!isInitialLoad && (
                <p className="usage-stats-period-label font-mono">{periodLabel}</p>
              )}
            </div>

            <div className="time-range-selector">
              <span className="app-data-label">Reporting window</span>
              <TimeRangeControls timeRange={timeRange} onChange={setTimeRange} disabled={loading} />
            </div>
          </header>
        )}

        {isInitialLoad ? (
          <AnalyticsSkeleton />
        ) : (
          <>
            <div className="stats-grid">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={cn('stat-card analytics-fade-in', `analytics-stagger-${i + 1}`)}
                  style={{ '--stat-accent': stat.accent } as React.CSSProperties}
                >
                  <div className="stat-card__top">
                    <span className="stat-label">{stat.label}</span>
                    <div className={cn('stat-card__icon', stat.iconClass)}>
                      <stat.icon className="h-4 w-4" strokeWidth={2} />
                    </div>
                  </div>
                  <span className="stat-value">{stat.value}</span>
                  {stat.detail ? <span className="stat-detail">{stat.detail}</span> : null}
                </div>
              ))}
            </div>

            <section className="analytics-live-usage analytics-fade-in analytics-stagger-5">
              {showUpgrade ? <PlanValueCard /> : null}
              {!showUpgrade ? (
                <p className="text-sm text-[color:var(--text-secondary)] mb-3">
                  {PLAN_MANAGED_BY_OWNER_COPY}
                </p>
              ) : null}
              <QuotaUsageGrid mode={showUpgrade ? 'personal' : 'workspace'} />
            </section>

            {hasChartData ? (
              <div className="charts-layout analytics-fade-in analytics-stagger-5">
                <div className="charts-layout__primary">
                  <ChartCard
                    title="Prompt Volume"
                    subtitle="Daily analytical requests across this period"
                    icon={<Activity className="h-4 w-4" strokeWidth={2} />}
                    iconClassName="text-[color:var(--accent-teal-500)] bg-[color-mix(in_srgb,var(--accent-teal-500)_12%,transparent)]"
                    plotClassName="chart-plot"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-stroke)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--chart-stroke)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="var(--border-primary)"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="formattedDate"
                          axisLine={false}
                          tickLine={false}
                          tick={TICK_STYLE}
                          dy={10}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={TICK_STYLE} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Area
                          type="monotone"
                          dataKey="queries"
                          stroke="var(--chart-stroke)"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorQueries)"
                          animationDuration={1200}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <div className="charts-layout__secondary">
                  <ChartCard
                    title="Credit Usage"
                    subtitle="AI credits used each day"
                    icon={<Zap className="h-4 w-4" strokeWidth={2} />}
                    iconClassName="text-amber-500 bg-amber-500/10"
                    plotClassName="chart-plot"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="var(--border-primary)"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="formattedDate"
                          axisLine={false}
                          tickLine={false}
                          tick={TICK_STYLE}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={TICK_STYLE} />
                        <Tooltip
                          cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }}
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value) => [
                            typeof value === 'number' ? value.toLocaleString() : String(value),
                            'Credits',
                          ]}
                        />
                        <Bar
                          dataKey="credits"
                          name="Credits"
                          fill="var(--chart-stroke)"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </div>
            ) : (
              <div className="analytics-empty-charts analytics-fade-in analytics-stagger-5">
                <p>No usage recorded for {periodLabel.toLowerCase()}.</p>
                <p className="mt-2 text-xs">Send prompts in Chat to populate this dashboard.</p>
              </div>
            )}

            {currentUsage && (
              <footer className="usage-footer-card analytics-fade-in analytics-stagger-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[color:var(--accent-teal-600)] flex items-center justify-center text-white shadow-md">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold font-display">
                        {currentUsage.plan.name} Tier
                      </h4>
                      <p className="usage-footer-card__reset mt-1">
                        Billing cycle resets {format(parseISO(currentUsage.reset_at), 'PPP')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="px-6 py-2.5 rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--panel-bg)] font-bold text-xs uppercase tracking-widest text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-tertiary)] transition-colors"
                    >
                      Download Report
                    </button>
                    {showUpgrade && (
                      <button
                        type="button"
                        className="px-6 py-2.5 rounded-xl bg-[color:var(--accent-teal-600)] text-white font-bold text-xs uppercase tracking-widest shadow-md hover:opacity-90 transition-all active:scale-[0.98]"
                        onClick={() => navigate(BILLING_UPGRADE_HREF)}
                      >
                        Upgrade Capacity
                      </button>
                    )}
                  </div>
                </div>
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UsageStatisticsPage;

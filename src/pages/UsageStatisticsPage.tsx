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
import { Activity, Database, Zap, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { useUsage } from '../context/UsageContext';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import type { HistoricalUsageResponse } from '../types/usage';
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
}: {
  timeRange: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
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
        {[1, 2, 3, 4].map((i) => (
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
          <div className="analytics-skeleton analytics-skeleton-chart-sm analytics-stagger-6" />
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
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClassName: string;
  plotClassName: string;
  children: React.ReactNode;
}) {
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

const UsageStatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: workspaceId } = useParams<{ id: string }>();
  const { currentUsage, getHistoricalUsage } = useUsage();
  const [history, setHistory] = useState<HistoricalUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

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

  const stats = useMemo(
    () => [
      {
        label: 'Total Queries',
        value: history?.total_period?.total_queries ?? 0,
        icon: Activity,
        accent: 'var(--kpi-accent-teal)',
        iconClass:
          'text-[color:var(--accent-teal-500)] bg-[color-mix(in_srgb,var(--accent-teal-500)_12%,transparent)]',
      },
      {
        label: 'Tokens Consumed',
        value: `${((history?.total_period?.total_llm_tokens ?? 0) / 1000).toFixed(1)}k`,
        icon: Zap,
        accent: 'var(--kpi-accent-amber)',
        iconClass: 'text-amber-500 bg-amber-500/10',
      },
      {
        label: 'Rows Scanned',
        value: (history?.total_period?.total_rows_scanned ?? 0).toLocaleString(),
        icon: Database,
        accent: 'var(--success)',
        iconClass: 'text-emerald-500 bg-emerald-500/10',
      },
      {
        label: 'Charts Generated',
        value: history?.total_period?.total_chart_renders ?? 0,
        icon: BarChart3,
        accent: 'var(--kpi-accent-purple)',
        iconClass: 'text-purple-500 bg-purple-500/10',
      },
    ],
    [history],
  );

  const chartData =
    history?.daily_usage.map((d) => ({
      ...d,
      formattedDate: format(parseISO(d.date), 'MMM dd'),
      tokensK: (d.llm_tokens / 1000).toFixed(2),
    })) ?? [];

  const hasChartData = chartData.length > 0;
  const isInitialLoad = loading && !history;

  return (
    <div className="usage-stats-container analytics-page app-page-root--scroll">
      <div className="usage-stats-inner">
        <header className="usage-stats-header">
          <div>
            <div className="usage-stats-header__icon">
              <TrendingUp className="h-5 w-5" strokeWidth={2} />
            </div>
            <h1 className="app-page-title">Usage Analytics</h1>
            <p className="app-page-subtitle mt-1">
              Detailed breakdown of your analytical consumption and API resource usage.
            </p>
            {!isInitialLoad && <p className="usage-stats-period-label font-mono">{periodLabel}</p>}
          </div>

          <div className="time-range-selector">
            <span className="app-data-label">Reporting window</span>
            <TimeRangeControls timeRange={timeRange} onChange={setTimeRange} disabled={loading} />
          </div>
        </header>

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
                </div>
              ))}
            </div>

            {hasChartData ? (
              <div className="charts-layout analytics-fade-in analytics-stagger-5">
                <div className="charts-layout__primary">
                  <ChartCard
                    title="Query Volume"
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
                    title="Token Efficiency"
                    subtitle="LLM compute resources (in thousands)"
                    icon={<Zap className="h-4 w-4" strokeWidth={2} />}
                    iconClassName="text-amber-500 bg-amber-500/10"
                    plotClassName="chart-plot chart-plot--compact"
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
                        />
                        <Bar
                          dataKey="tokensK"
                          name="Tokens (k)"
                          fill="var(--chart-stroke)"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Data Intensity"
                    subtitle="Rows scanned per request"
                    icon={<Database className="h-4 w-4" strokeWidth={2} />}
                    iconClassName="text-emerald-500 bg-emerald-500/10"
                    plotClassName="chart-plot chart-plot--compact"
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
                        />
                        <Bar
                          dataKey="rows_scanned"
                          name="Rows"
                          fill="var(--success)"
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
                <p className="mt-2 text-xs">Run queries in Chat to populate this dashboard.</p>
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
                    <button
                      type="button"
                      className="px-6 py-2.5 rounded-xl bg-[color:var(--accent-teal-600)] text-white font-bold text-xs uppercase tracking-widest shadow-md hover:opacity-90 transition-all active:scale-[0.98]"
                      onClick={() => navigate('/settings/billing')}
                    >
                      Upgrade Capacity
                    </button>
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

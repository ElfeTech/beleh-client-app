import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { 
  Activity, 
  Database, 
  Zap, 
  TrendingUp, 
  ArrowUpRight, 
  BarChart3,
  Layers,
} from 'lucide-react';
import { useUsage } from '../context/UsageContext';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import type { HistoricalUsageResponse } from '../types/usage';
import './UsageStatisticsPage.css';

const UsageStatisticsPage: React.FC = () => {
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

    fetchHistory();
  }, [getHistoricalUsage, timeRange, workspaceId]);

  const stats = [
    {
      label: 'Total Queries',
      value: history?.total_period?.total_queries || 0,
      icon: Activity,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      label: 'Tokens Consumed',
      value: `${((history?.total_period?.total_llm_tokens || 0) / 1000).toFixed(1)}k`,
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      label: 'Rows Scanned',
      value: history?.total_period?.total_rows_scanned?.toLocaleString() || 0,
      icon: Database,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Charts Generated',
      value: history?.total_period?.total_chart_renders || 0,
      icon: BarChart3,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    }
  ];

  const chartData = history?.daily_usage.map(d => ({
    ...d,
    formattedDate: format(parseISO(d.date), 'MMM dd'),
    tokensK: (d.llm_tokens / 1000).toFixed(2)
  })) || [];

  if (loading && !history) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-muted-foreground">Aggregating consumption reports...</p>
      </div>
    );
  }

  return (
    <div className="usage-stats-container app-page-root app-page-root--scroll animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="usage-stats-inner">
        <header className="usage-stats-header">
        <div className="header-content">
          <div className="header-badge">
            <TrendingUp className="w-3 h-3" />
            <span>Consumption Insights</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Usage Analytics</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Detailed breakdown of your analytical consumption and API resource usage.
          </p>
        </div>

        <div className="header-actions">
          <div className="time-range-selector">
            {[7, 30, 90].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "range-btn",
                  timeRange === range ? "active" : ""
                )}
              >
                {range} Days
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Grid Stats */}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card-glass group">
            <div className="stat-card-inner">
              <div className={cn("stat-icon-box", stat.bg, stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className="stat-value">{stat.value}</span>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5" />
                    Live
                  </span>
                </div>
              </div>
            </div>
            <div className="stat-card-shimmer"></div>
          </div>
        ))}
      </div>

      <div className="charts-main-grid">
        {/* Main Consumption Chart */}
        <div className="chart-card-full col-span-2">
          <div className="chart-header">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Query Volume</h3>
                <p className="text-[11px] text-muted-foreground">Daily analytical requests across this period</p>
              </div>
            </div>
          </div>
          <div className="h-[300px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" opacity={0.5} />
                <XAxis 
                  dataKey="formattedDate" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600}}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-primary)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="queries" 
                  stroke="var(--primary-500)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorQueries)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tokens and Rows Breakdown */}
        <div className="chart-card-half">
           <div className="chart-header">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Token Efficiency</h3>
                <p className="text-[11px] text-muted-foreground">LLM compute resources (in thousands)</p>
              </div>
            </div>
          </div>
          <div className="h-[250px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" opacity={0.5} />
                <XAxis 
                   dataKey="formattedDate" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600}}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600}}
                />
                <Tooltip 
                   cursor={{fill: 'var(--bg-secondary)', opacity: 0.4}}
                   contentStyle={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-primary)',
                    borderRadius: '12px'
                  }} 
                />
                <Bar 
                  dataKey="tokensK" 
                  name="Tokens (k)"
                  fill="var(--primary-500)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

         <div className="chart-card-half">
           <div className="chart-header">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Data Intensity</h3>
                <p className="text-[11px] text-muted-foreground">Rows scanned per request</p>
              </div>
            </div>
          </div>
          <div className="h-[250px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" opacity={0.5} />
                <XAxis 
                   dataKey="formattedDate" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600}}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600}}
                />
                <Tooltip 
                   cursor={{fill: 'var(--bg-secondary)', opacity: 0.4}}
                   contentStyle={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-primary)',
                    borderRadius: '12px'
                  }} 
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
          </div>
        </div>
      </div>

      {/* Plan Details Footer */}
      {currentUsage && (
        <footer className="usage-footer-card">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                  <Layers className="w-6 h-6" />
               </div>
               <div>
                  <h4 className="font-bold text-lg">{currentUsage.plan.name} Tier</h4>
                  <p className="text-sm text-muted-foreground font-medium">Your current monthly billing cycle resets in {format(parseISO(currentUsage.reset_at), 'PPP')}</p>
               </div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-2.5 rounded-xl border border-border bg-background font-bold text-xs uppercase tracking-widest hover:bg-muted transition-colors">
                Download Report
              </button>
              <button className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95">
                Upgrade Capacity
              </button>
            </div>
          </div>
        </footer>
      )}
      </div>
    </div>
  );
};

export default UsageStatisticsPage;

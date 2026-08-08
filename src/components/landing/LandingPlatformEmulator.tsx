import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import logoImage from '../../assets/logo.webp';
import {
  EMULATOR_CHART_COLORS,
  EMULATOR_CHARTS_DELAY_MS,
  EMULATOR_DEMO_URL,
  EMULATOR_LOOP_PAUSE_MS,
  EMULATOR_META_DELAY_MS,
  EMULATOR_SEND_FLASH_MS,
  EMULATOR_SIDEBAR_SESSIONS,
  EMULATOR_STREAM_WORD_MS,
  EMULATOR_THINK_DELAY_MS,
  EMULATOR_TURNS,
  EMULATOR_TYPE_CHAR_MS,
  type EmulatorTurn,
  type NamedValue,
} from './emulatorDemoScript';
import './LandingPlatformEmulator.css';

type Phase =
  'idle' | 'composing' | 'sending' | 'thinking' | 'meta' | 'charts' | 'streaming' | 'done';

type CompletedTurn = {
  turn: EmulatorTurn;
  prompt: string;
  summary: string;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function truncateTitle(text: string, max = 36): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function tooltipLabel(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function ChartTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: Record<string, unknown> }>;
}>) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const label = tooltipLabel(row.payload?.name ?? row.name);
  return (
    <div className="lpe-tooltip">
      <div className="lpe-tooltip-label">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name ?? String(entry.value)} className="lpe-tooltip-value">
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  );
}

function ChartShell({
  children,
  tall,
}: Readonly<{
  children: ReactNode;
  tall?: boolean;
}>) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Defer mount so flex/grid parents have measured width before Recharts sizes.
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!cancelled) setReady(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={tall ? 'lpe-chart-wrap tall' : 'lpe-chart-wrap'}>{ready ? children : null}</div>
  );
}

function DonutChart({ data, title }: Readonly<{ data: NamedValue[]; title: string }>) {
  return (
    <div className="lpe-viz-card">
      <div className="lpe-viz-title">{title}</div>
      <ChartShell>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={1}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="42%"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((item, i) => (
                <Cell
                  key={item.name}
                  fill={EMULATOR_CHART_COLORS[i % EMULATOR_CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="square"
              iconSize={9}
              wrapperStyle={{ fontSize: 11, color: '#6b7280' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}

function VerticalBarChart({ data, title }: Readonly<{ data: NamedValue[]; title: string }>) {
  return (
    <div className="lpe-viz-card">
      <div className="lpe-viz-title">{title}</div>
      <ChartShell tall>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={1}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              height={50}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
            <Bar
              dataKey="value"
              name="Count"
              radius={[6, 6, 0, 0]}
              barSize={26}
              isAnimationActive={false}
            >
              {data.map((item, i) => (
                <Cell
                  key={item.name}
                  fill={EMULATOR_CHART_COLORS[i % EMULATOR_CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}

function KpiCard({
  sectionLabel,
  label,
  value,
}: Readonly<{
  sectionLabel: string;
  label: string;
  value: string;
}>) {
  return (
    <div className="lpe-viz-card">
      <div className="lpe-section-label">{sectionLabel}</div>
      <div className="lpe-kpi">
        <div className="lpe-kpi-label">{label}</div>
        <div className="lpe-kpi-value">{value}</div>
      </div>
    </div>
  );
}

function AreaViz({
  title,
  data,
}: Readonly<{
  title: string;
  data: Array<{ name: string; Hour: number; 'Total Requests': number }>;
}>) {
  return (
    <div className="lpe-viz-card">
      <div className="lpe-viz-title">{title}</div>
      <ChartShell tall>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={1}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              height={50}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="top"
              height={24}
              iconType="circle"
              wrapperStyle={{ fontSize: 11, color: '#6b7280' }}
            />
            <Area
              type="monotone"
              dataKey="Hour"
              stroke={EMULATOR_CHART_COLORS[0]}
              fill={EMULATOR_CHART_COLORS[0]}
              fillOpacity={0.28}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="Total Requests"
              stroke={EMULATOR_CHART_COLORS[1]}
              fill={EMULATOR_CHART_COLORS[1]}
              fillOpacity={0.28}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}

type SchemaKpiVisuals = Extract<EmulatorTurn, { visuals: { kind: 'schema-kpi' } }>['visuals'];

function SchemaKpiVisual({ visuals: v }: Readonly<{ visuals: SchemaKpiVisuals }>) {
  return (
    <div className="lpe-viz-grid">
      <div className="lpe-viz-card">
        <div className="lpe-section-label">{v.tableLabel}</div>
        <table className="lpe-schema-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {v.columns.map((col) => (
              <tr key={col.name}>
                <td className="name">{col.name}</td>
                <td className="type">{col.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="lpe-insight">{v.insight}</p>
      </div>
      <div className="lpe-viz-stack">
        <KpiCard sectionLabel="VISIBILITY" label={v.kpiLabel} value={v.kpiValue} />
        <VerticalBarChart data={v.bar} title={v.barTitle} />
      </div>
    </div>
  );
}

function TurnVisuals({ turn }: Readonly<{ turn: EmulatorTurn }>) {
  const { visuals } = turn;
  if (visuals.kind === 'donut-bar') {
    return (
      <div className="lpe-viz-grid">
        <DonutChart data={visuals.donut} title={visuals.donutTitle} />
        <VerticalBarChart data={visuals.bar} title={visuals.barTitle} />
      </div>
    );
  }
  if (visuals.kind === 'schema-kpi') {
    return <SchemaKpiVisual visuals={visuals} />;
  }
  return (
    <div className="lpe-viz-grid">
      <KpiCard
        sectionLabel={visuals.sectionLabel}
        label={visuals.kpiLabel}
        value={visuals.kpiValue}
      />
      <AreaViz title={visuals.areaTitle} data={visuals.area} />
    </div>
  );
}

/** Keep chart trees stable while assistant summary streams (avoids Recharts remount/blank). */
const MemoTurnVisuals = memo(TurnVisuals);

function AiAvatar() {
  return (
    <div className="lpe-avatar ai" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12l15-7-4 14-3.5-5.5L4 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 11V8a4 4 0 118 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChatNavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6.5A2.5 2.5 0 017.5 4h9A2.5 2.5 0 0119 6.5v7A2.5 2.5 0 0116.5 16H10l-4 3v-3.5A2.5 2.5 0 015 13.5v-7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DatasetNavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12a8 8 0 11-2.3-5.6M20 4v5h-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssistantBlock({
  turn,
  showMeta,
  showCharts,
  summaryText,
  streaming,
}: Readonly<{
  turn: EmulatorTurn;
  showMeta: boolean;
  showCharts: boolean;
  summaryText: string;
  streaming: boolean;
}>) {
  return (
    <div className="lpe-assistant lpe-fade-in">
      <div className="lpe-assistant-card">
        <div className="lpe-assistant-head">
          <AiAvatar />
          <div>
            <div className="lpe-assistant-title">Beleh AI Analyst</div>
            <div className="lpe-assistant-time">{turn.assistantTime}</div>
          </div>
        </div>

        {showMeta ? (
          <div className="lpe-meta-row lpe-fade-in">
            <span className="lpe-meta-item">
              <ClockIcon />
              Execution Time: <strong>{turn.executionTime}</strong>
            </span>
            <span className="lpe-meta-item">
              <DbIcon />
              Rows scanned: <strong>{turn.rowsScanned}</strong>
            </span>
          </div>
        ) : null}

        {showCharts ? <MemoTurnVisuals turn={turn} /> : null}

        {'note' in turn && turn.note && showCharts ? (
          <p className="lpe-note lpe-fade-in">{turn.note}</p>
        ) : null}

        {summaryText ? (
          <p className="lpe-summary">
            {summaryText}
            {streaming ? <span className="lpe-cursor" aria-hidden /> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ThinkingBlock() {
  return (
    <div className="lpe-thinking" aria-hidden>
      <div className="lpe-thinking-dots">
        <span />
        <span />
        <span />
      </div>
      <span className="lpe-thinking-label">Analyzing workspace sources…</span>
    </div>
  );
}

export function LandingPlatformEmulator() {
  const rootRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const runningRef = useRef(false);
  const visibleRef = useRef(false);

  const [completed, setCompleted] = useState<CompletedTurn[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [composerText, setComposerText] = useState('');
  const [activePrompt, setActivePrompt] = useState('');
  const [streamedSummary, setStreamedSummary] = useState('');
  const [sessionPulse, setSessionPulse] = useState(false);
  const [headerRefreshing, setHeaderRefreshing] = useState(false);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const resetLoop = () => {
    clearTimers();
    runningRef.current = false;
    setCompleted([]);
    setTurnIndex(0);
    setPhase('idle');
    setComposerText('');
    setActivePrompt('');
    setStreamedSummary('');
    setSessionPulse(false);
    setHeaderRefreshing(false);
  };

  const showFinalState = () => {
    clearTimers();
    runningRef.current = false;
    setCompleted(
      EMULATOR_TURNS.map((turn) => ({
        turn,
        prompt: turn.prompt,
        summary: turn.summary,
      })),
    );
    setTurnIndex(EMULATOR_TURNS.length);
    setPhase('done');
    setComposerText('');
    setActivePrompt('');
    setStreamedSummary('');
  };

  const finishTurn = (index: number, prior: CompletedTurn[], turn: EmulatorTurn) => {
    const nextCompleted: CompletedTurn[] = [
      ...prior,
      { turn, prompt: turn.prompt, summary: turn.summary },
    ];
    setCompleted(nextCompleted);
    setComposerText('');
    setActivePrompt('');
    setStreamedSummary('');
    setPhase('done');
    setSessionPulse(true);
    schedule(() => setSessionPulse(false), 650);
    schedule(() => runTurn(index + 1, nextCompleted), EMULATOR_LOOP_PAUSE_MS);
  };

  const streamSummary = (index: number, prior: CompletedTurn[], turn: EmulatorTurn) => {
    if (!visibleRef.current) return;
    setPhase('streaming');
    const words = turn.summary.split(/(\s+)/);
    let wordIdx = 0;
    let acc = '';

    const streamNext = () => {
      if (!visibleRef.current) return;
      if (wordIdx >= words.length) {
        finishTurn(index, prior, turn);
        return;
      }
      acc += words[wordIdx];
      wordIdx += 1;
      setStreamedSummary(acc);
      schedule(streamNext, EMULATOR_STREAM_WORD_MS);
    };

    streamNext();
  };

  const revealChartsThenStream = (index: number, prior: CompletedTurn[], turn: EmulatorTurn) => {
    if (!visibleRef.current) return;
    setPhase('charts');
    setHeaderRefreshing(false);
    schedule(() => streamSummary(index, prior, turn), EMULATOR_CHARTS_DELAY_MS);
  };

  const startThinking = (index: number, prior: CompletedTurn[], turn: EmulatorTurn) => {
    if (!visibleRef.current) return;
    setPhase('thinking');
    setHeaderRefreshing(true);
    schedule(() => {
      if (!visibleRef.current) return;
      setPhase('meta');
      schedule(() => revealChartsThenStream(index, prior, turn), EMULATOR_META_DELAY_MS);
    }, EMULATOR_THINK_DELAY_MS);
  };

  const composePrompt = (index: number, prior: CompletedTurn[], turn: EmulatorTurn) => {
    let charIdx = 0;
    setPhase('composing');
    setComposerText('');
    setActivePrompt('');

    const typeNext = () => {
      if (!visibleRef.current) return;
      charIdx += 1;
      setComposerText(turn.prompt.slice(0, charIdx));
      if (charIdx < turn.prompt.length) {
        schedule(typeNext, EMULATOR_TYPE_CHAR_MS);
        return;
      }
      setPhase('sending');
      schedule(() => {
        if (!visibleRef.current) return;
        setComposerText('');
        setActivePrompt(turn.prompt);
        startThinking(index, prior, turn);
      }, EMULATOR_SEND_FLASH_MS);
    };

    schedule(typeNext, 320);
  };

  const runTurn = (index: number, prior: CompletedTurn[]) => {
    if (!visibleRef.current) return;
    const turn = EMULATOR_TURNS[index];
    if (!turn) {
      schedule(() => {
        if (!visibleRef.current) return;
        resetLoop();
        schedule(() => startPlayback(), 400);
      }, EMULATOR_LOOP_PAUSE_MS);
      return;
    }

    runningRef.current = true;
    setTurnIndex(index);
    setComposerText('');
    setActivePrompt('');
    setStreamedSummary('');

    if (prefersReducedMotion()) {
      finishTurn(index, prior, turn);
      return;
    }

    composePrompt(index, prior, turn);
  };

  const startPlayback = () => {
    if (runningRef.current) return;
    if (prefersReducedMotion()) {
      showFinalState();
      return;
    }
    clearTimers();
    setCompleted([]);
    setTurnIndex(0);
    setComposerText('');
    setActivePrompt('');
    setStreamedSummary('');
    runTurn(0, []);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
          if (!visibleRef.current) {
            visibleRef.current = true;
            startPlayback();
          }
        } else if (!entry.isIntersecting) {
          visibleRef.current = false;
          resetLoop();
        }
      },
      { threshold: [0, 0.25, 0.5] },
    );

    io.observe(root);
    return () => {
      io.disconnect();
      clearTimers();
      runningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only observer
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [completed, composerText, activePrompt, streamedSummary, phase, turnIndex]);

  const activeTurn = turnIndex < EMULATOR_TURNS.length ? EMULATOR_TURNS[turnIndex] : null;
  const showActiveUser = Boolean(
    activeTurn &&
    activePrompt &&
    (phase === 'thinking' ||
      phase === 'meta' ||
      phase === 'charts' ||
      phase === 'streaming' ||
      phase === 'sending'),
  );
  const showThinking = Boolean(activeTurn && phase === 'thinking');
  const showActiveAssistant = Boolean(
    activeTurn && (phase === 'meta' || phase === 'charts' || phase === 'streaming'),
  );

  const sidebarSessions = useMemo(() => {
    const live =
      activeTurn && (phase === 'composing' || phase === 'sending' || showActiveUser)
        ? [
            {
              id: activeTurn.id,
              title: truncateTitle(activeTurn.sessionTitle || activeTurn.prompt),
              active: true,
            },
          ]
        : completed.length
          ? [
              {
                id: completed[completed.length - 1].turn.id,
                title: truncateTitle(
                  completed[completed.length - 1].turn.sessionTitle ||
                    completed[completed.length - 1].prompt,
                ),
                active: true,
              },
            ]
          : [];

    const seeds = EMULATOR_SIDEBAR_SESSIONS.filter(
      (title) => !live.some((s) => s.title.startsWith(title.slice(0, 18))),
    ).map((title, i) => ({
      id: `seed-${i}`,
      title: truncateTitle(title),
      active: false,
    }));

    return [...live, ...seeds].slice(0, 5);
  }, [activeTurn, phase, showActiveUser, completed]);

  const composerDisplay = phase === 'composing' || phase === 'sending' ? composerText : '';

  return (
    <section className="landing-section landing-emulator" id="demo" ref={rootRef}>
      <div className="landing-wrap">
        <div className="landing-section-head center landing-reveal">
          <div className="landing-eyebrow on-light">
            <span className="dot" />
            <span>SEE IT IN ACTION</span>
          </div>
          <h2>Ask once. Get the number, the chart, and the why.</h2>
          <p>
            Watch Beleh turn a plain-English question into execution stats, visuals, and a clear
            answer — the same flow you get inside the product.
          </p>
        </div>
      </div>

      <div
        className="lpe-browser landing-reveal"
        aria-label="Beleh workspace running in a browser window"
      >
        <div className="lpe-chrome" aria-hidden>
          <div className="lpe-traffic">
            <span className="close" />
            <span className="min" />
            <span className="max" />
          </div>
          <div className="lpe-urlbar">
            <LockIcon />
            <span className="lpe-urlbar-text">
              <em>https://</em>
              {EMULATOR_DEMO_URL}
            </span>
          </div>
          <div className="lpe-chrome-actions">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="lpe-app">
          <aside className="lpe-sidebar" aria-hidden>
            <div className="lpe-side-brand">
              <div className="lpe-side-brand-row">
                <img src={logoImage} alt="" className="lpe-side-logo" />
                <span className="lpe-side-pill">Workspace</span>
              </div>
              <p className="lpe-side-tagline">Ask. Analyze. Decide.</p>
            </div>

            <div className="lpe-side-region">
              <div className="lpe-side-region-label">Active region</div>
              <div className="lpe-side-region-value">
                My Workspace
                <ChevronIcon />
              </div>
            </div>

            <div className="lpe-side-nav">
              <div className="lpe-side-nav-item active">
                <ChatNavIcon />
                Chat
              </div>
              <div className="lpe-side-nav-item">
                <DatasetNavIcon />
                Data sources
              </div>
            </div>

            <div className="lpe-side-sessions">
              <div className="lpe-side-sessions-label">Recent chats</div>
              {sidebarSessions.map((session) => (
                <div
                  key={session.id}
                  className={`lpe-side-session${session.active ? ' active' : ''}${
                    session.active && sessionPulse ? ' pulse' : ''
                  }`}
                >
                  {session.title}
                </div>
              ))}
            </div>

            <div className="lpe-side-foot">
              <div className="lpe-side-settings">
                <SettingsIcon />
                Settings
              </div>
              <div className="lpe-side-user">
                <div className="lpe-side-user-avatar">JD</div>
                <div className="lpe-side-user-meta">
                  <div className="lpe-side-user-name">Jone Deo</div>
                  <div className="lpe-side-user-email">jone@beleh.ai</div>
                </div>
                <span className="lpe-side-plan">STANDARD</span>
              </div>
            </div>
          </aside>

          <div className="lpe-main">
            <div className="lpe-topbar" aria-hidden>
              <div className="lpe-topbar-left">
                <span className="lpe-topbar-source">
                  <DbIcon />
                  All sources
                  <ChevronIcon />
                </span>
                <span className="lpe-topbar-status">
                  No datasource selected · analyzing all workspace sources
                </span>
              </div>
              <div className="lpe-topbar-right">
                <div className="lpe-cluster">
                  Cluster status
                  <br />
                  <strong>Standby // All sources</strong>
                </div>
                <div className={`lpe-topbar-icon${headerRefreshing ? ' spinning' : ''}`}>
                  <RefreshIcon />
                </div>
              </div>
            </div>

            <div className="lpe-scroll" ref={scrollRef}>
              {completed.map((item) => (
                <div key={item.turn.id} className="lpe-turn">
                  <div className="lpe-user-row">
                    <div className="lpe-user-meta">
                      <div className="lpe-user-bubble">{item.prompt}</div>
                      <span className="lpe-user-time">{item.turn.userTime}</span>
                    </div>
                    <div className="lpe-avatar user" aria-hidden>
                      {item.turn.userInitials}
                    </div>
                  </div>
                  <AssistantBlock
                    turn={item.turn}
                    showMeta
                    showCharts
                    summaryText={item.summary}
                    streaming={false}
                  />
                </div>
              ))}

              {showActiveUser && activeTurn ? (
                <div className="lpe-user-row lpe-fade-in">
                  <div className="lpe-user-meta">
                    <div className="lpe-user-bubble">{activePrompt}</div>
                    <span className="lpe-user-time">{activeTurn.userTime}</span>
                  </div>
                  <div className="lpe-avatar user" aria-hidden>
                    {activeTurn.userInitials}
                  </div>
                </div>
              ) : null}

              {showThinking ? <ThinkingBlock /> : null}

              {showActiveAssistant && activeTurn ? (
                <AssistantBlock
                  turn={activeTurn}
                  showMeta={phase === 'meta' || phase === 'charts' || phase === 'streaming'}
                  showCharts={phase === 'charts' || phase === 'streaming'}
                  summaryText={streamedSummary}
                  streaming={phase === 'streaming'}
                />
              ) : null}
            </div>

            <div className="lpe-tip">TIP: SELECT A DATABASE FOR DEEP ANALYSIS</div>

            <div className={`lpe-composer${phase === 'sending' ? ' sending' : ''}`} aria-hidden>
              <div className={`lpe-composer-placeholder${composerDisplay ? ' has-text' : ''}`}>
                {composerDisplay || 'Ask about revenue, customers, trends, or performance...'}
                {phase === 'composing' ? <span className="lpe-cursor" aria-hidden /> : null}
              </div>
              <div className="lpe-composer-bar">
                <div className="lpe-composer-left">
                  <span className="lpe-chip">
                    <DbIcon />
                    All sources
                    <ChevronIcon />
                  </span>
                  <span className="lpe-chip">
                    <DbIcon />
                    CONNECT DB
                  </span>
                </div>
                <div className={`lpe-send${phase === 'sending' ? ' active' : ''}`}>
                  <SendIcon />
                </div>
              </div>
            </div>

            <div className="lpe-footer">
              Powered by Beleh Analytical Engine v0.1.0 // compliance guidelines applied.
            </div>

            <div className="lpe-help-fab" aria-hidden>
              ?
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
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
import {
  EMULATOR_CHART_COLORS,
  EMULATOR_CHARTS_DELAY_MS,
  EMULATOR_LOOP_PAUSE_MS,
  EMULATOR_META_DELAY_MS,
  EMULATOR_STREAM_WORD_MS,
  EMULATOR_TURNS,
  EMULATOR_TYPE_CHAR_MS,
  type EmulatorTurn,
  type NamedValue,
} from './emulatorDemoScript';
import './LandingPlatformEmulator.css';

type Phase = 'idle' | 'typing' | 'meta' | 'charts' | 'streaming' | 'done';

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

function DonutChart({ data, title }: Readonly<{ data: NamedValue[]; title: string }>) {
  return (
    <div className="lpe-viz-card">
      <div className="lpe-viz-title">{title}</div>
      <div className="lpe-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="42%"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={2}
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
              height={36}
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, color: '#6b7280' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VerticalBarChart({ data, title }: Readonly<{ data: NamedValue[]; title: string }>) {
  return (
    <div className="lpe-viz-card">
      <div className="lpe-viz-title">{title}</div>
      <div className="lpe-chart-wrap tall">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              height={50}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
            <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]} barSize={28}>
              {data.map((item, i) => (
                <Cell
                  key={item.name}
                  fill={EMULATOR_CHART_COLORS[i % EMULATOR_CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
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
      <div className="lpe-chart-wrap tall">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              height={50}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="circle"
              wrapperStyle={{ fontSize: 12, color: '#6b7280' }}
            />
            <Area
              type="monotone"
              dataKey="Hour"
              stroke={EMULATOR_CHART_COLORS[0]}
              fill={EMULATOR_CHART_COLORS[0]}
              fillOpacity={0.28}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Total Requests"
              stroke={EMULATOR_CHART_COLORS[1]}
              fill={EMULATOR_CHART_COLORS[1]}
              fillOpacity={0.28}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TurnVisuals({ turn }: Readonly<{ turn: EmulatorTurn }>) {
  if (turn.visuals.kind === 'donut-bar') {
    return (
      <div className="lpe-viz-grid">
        <DonutChart data={turn.visuals.donut} title={turn.visuals.donutTitle} />
        <VerticalBarChart data={turn.visuals.bar} title={turn.visuals.barTitle} />
      </div>
    );
  }
  return (
    <div className="lpe-viz-grid">
      <KpiCard
        sectionLabel={turn.visuals.sectionLabel}
        label={turn.visuals.kpiLabel}
        value={turn.visuals.kpiValue}
      />
      <AreaViz title={turn.visuals.areaTitle} data={turn.visuals.area} />
    </div>
  );
}

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

        {showCharts ? <TurnVisuals turn={turn} /> : null}

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

export function LandingPlatformEmulator() {
  const rootRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const runningRef = useRef(false);
  const visibleRef = useRef(false);

  const [completed, setCompleted] = useState<CompletedTurn[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [typedPrompt, setTypedPrompt] = useState('');
  const [streamedSummary, setStreamedSummary] = useState('');

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
    setTypedPrompt('');
    setStreamedSummary('');
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
    setTypedPrompt('');
    setStreamedSummary('');
  };

  const finishTurn = (index: number, prior: CompletedTurn[], turn: EmulatorTurn) => {
    const nextCompleted: CompletedTurn[] = [
      ...prior,
      { turn, prompt: turn.prompt, summary: turn.summary },
    ];
    setCompleted(nextCompleted);
    setTypedPrompt('');
    setStreamedSummary('');
    setPhase('done');
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
    schedule(() => streamSummary(index, prior, turn), EMULATOR_CHARTS_DELAY_MS);
  };

  const typePrompt = (index: number, prior: CompletedTurn[], turn: EmulatorTurn) => {
    let charIdx = 0;

    const typeNext = () => {
      if (!visibleRef.current) return;
      charIdx += 1;
      setTypedPrompt(turn.prompt.slice(0, charIdx));
      if (charIdx < turn.prompt.length) {
        schedule(typeNext, EMULATOR_TYPE_CHAR_MS);
        return;
      }
      setPhase('meta');
      schedule(() => revealChartsThenStream(index, prior, turn), EMULATOR_META_DELAY_MS);
    };

    schedule(typeNext, 280);
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
    setTypedPrompt('');
    setStreamedSummary('');
    setPhase('typing');

    if (prefersReducedMotion()) {
      finishTurn(index, prior, turn);
      return;
    }

    typePrompt(index, prior, turn);
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
    setTypedPrompt('');
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
  }, [completed, typedPrompt, streamedSummary, phase, turnIndex]);

  const activeTurn = turnIndex < EMULATOR_TURNS.length ? EMULATOR_TURNS[turnIndex] : null;
  const showActiveUser = Boolean(activeTurn && phase !== 'idle' && phase !== 'done' && typedPrompt);
  const showActiveAssistant = Boolean(
    activeTurn && (phase === 'meta' || phase === 'charts' || phase === 'streaming'),
  );

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
            answer the same flow you get inside the product.
          </p>
        </div>

        <div className="lpe-frame landing-reveal" aria-label="Beleh platform emulator">
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
              <div className="lpe-user-row">
                <div className="lpe-user-meta">
                  <div className="lpe-user-bubble">
                    {typedPrompt}
                    {phase === 'typing' ? <span className="lpe-cursor" aria-hidden /> : null}
                  </div>
                  {phase !== 'typing' ? (
                    <span className="lpe-user-time">{activeTurn.userTime}</span>
                  ) : null}
                </div>
                <div className="lpe-avatar user" aria-hidden>
                  {activeTurn.userInitials}
                </div>
              </div>
            ) : null}

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

          <div className="lpe-composer" aria-hidden>
            <div className="lpe-composer-placeholder">
              Ask Beleh AI Analyst to query schemas, calculate savings, or produce charts...
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
              <div className="lpe-send">
                <SendIcon />
              </div>
            </div>
          </div>

          <div className="lpe-footer">
            Powered by Beleh Analytical Engine v0.1.0 // compliance guidelines applied.
          </div>
        </div>
      </div>
    </section>
  );
}

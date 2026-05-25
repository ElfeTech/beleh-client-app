import type { LucideIcon } from 'lucide-react';
import {
  Sparkles,
  BarChart3,
  ShieldCheck,
  Zap,
  Cpu,
  Users,
  Skull,
  Gamepad2,
  BookOpen,
  FlaskConical,
  CloudLightning,
  Command,
  Upload,
  MessageCircle,
  LineChart,
} from 'lucide-react';

export type ExplorerTabId = 'features' | 'problems' | 'steps' | 'comparison';

export const EXPLORER_TABS: {
  id: ExplorerTabId;
  label: string;
  icon: LucideIcon;
  diagnosticLabel: string;
}[] = [
  { id: 'features', label: 'CORE MAPPINGS', icon: Zap, diagnosticLabel: 'FEATURES' },
  { id: 'problems', label: 'FATAL BI FRICTION', icon: Skull, diagnosticLabel: 'PROBLEMS' },
  { id: 'steps', label: 'PIPELINE ROUTING', icon: Gamepad2, diagnosticLabel: 'STEPS' },
  { id: 'comparison', label: 'SPECS LEDGER', icon: BookOpen, diagnosticLabel: 'COMPARISON' },
];

export const LANDING_STATS = [
  { value: '10x', label: 'FASTER INSIGHTS', icon: Sparkles, accent: 'blue' },
  { value: '0', label: 'SQL REQUIRED', icon: Command, accent: 'cyan' },
  { value: '99.9%', label: 'UPTIME INTENSITY', icon: ShieldCheck, accent: 'green' },
  {
    value: 'α0.1.0',
    label: 'ALPHA RELEASE',
    detail: 'Preview build — features ship weekly; production metrics arrive after GA',
    icon: FlaskConical,
    accent: 'purple',
    informative: true,
  },
] as const;

export const FEATURE_CARDS = [
  {
    title: 'AI-POWERED INTELLIGENCE',
    description:
      'Natural language queries powered by advanced database intelligence that deeply understands your business context.',
    icon: Sparkles,
    accent: 'blue',
  },
  {
    title: 'INSTANT VISUALIZATIONS',
    description:
      'Beautiful responsive charts, bar graphs, and telemetry files generated automatically. Export with one click.',
    icon: BarChart3,
    accent: 'cyan',
  },
  {
    title: 'ENTERPRISE SECURITY',
    description:
      'Bank-level credential masking, SSL encryption, SOC 2 compliant protocols, and isolated secure tenant environments.',
    icon: ShieldCheck,
    accent: 'green',
  },
  {
    title: 'LIGHTNING FAST LATENCY',
    description:
      'Get answers in milliseconds. Cached database pathways handle massive datasets of any density effortlessly.',
    icon: Zap,
    accent: 'purple',
  },
  {
    title: 'SMART SCHEMA DISCOVERY',
    description:
      'Automatically maps columns, tables relationships, key constraints, and indices with zero setting manual overrides.',
    icon: Cpu,
    accent: 'pink',
  },
  {
    title: 'TEAM COLLABORATION HUB',
    description:
      'Share chat threads, historical logs, or analytical graphs across Slack or email to alignment sync instantly.',
    icon: Users,
    accent: 'indigo',
  },
] as const;

export const PROBLEM_CARDS = [
  {
    title: 'WEEKS TO BUILD DASHBOARDS',
    stat: '6-8 weeks wait',
    description:
      'Traditional BI tools require extensive pipeline updates and analytics engineering bottlenecks before you see any value. Time is money.',
    icon: CloudLightning,
  },
  {
    title: 'SQL SKILLS REQUIRED',
    stat: '78% non-technical',
    description:
      "Not everyone knows SQL. Your team shouldn't have to draft queries or write script files just to inspect yesterday's growth indexes.",
    icon: Command,
  },
  {
    title: 'BOTTLENECKED BY EXPERTS',
    stat: '3-5 days wait time',
    description:
      'Waiting for data analysts to compile ad-hoc reports creates massive business friction. Decisions get postponed. Opportunities get lost.',
    icon: Users,
  },
] as const;

export const PIPELINE_STEPS = [
  {
    vector: '01',
    title: 'UPLOAD YOUR DATA',
    description: 'CSV, Excel, or connect database servers directly in seconds. Drag, drop, done.',
    icon: Upload,
  },
  {
    vector: '02',
    title: 'ASK QUESTIONS',
    description: 'Type naturally in plain English like you are asking an experienced colleague.',
    icon: MessageCircle,
  },
  {
    vector: '03',
    title: 'GET INSIGHTS',
    description: 'Instant charts, analytics, and actionable answers generated with zero latency.',
    icon: LineChart,
  },
] as const;

export const COMPARISON_ROWS = [
  {
    criterion: 'Time to First Insight',
    beleh: 'MINUTES',
    legacy: 'Weeks',
  },
  {
    criterion: 'Query Interface',
    beleh: 'NATURAL LANGUAGE / ENGLISH',
    legacy: 'SQL / Complex Dashboards',
  },
  {
    criterion: 'Setup Required',
    beleh: 'ZERO SETTING OVERRIDES',
    legacy: 'Extensive BI projects',
  },
  {
    criterion: 'Learning Curve',
    beleh: 'NONE (TYPE LIKE CHAT)',
    legacy: 'Weeks of custom training',
  },
  {
    criterion: 'For Non-Technical Users',
    beleh: 'PERFECT. INSTANT MATCHES.',
    legacy: 'Extremely difficult',
  },
  {
    criterion: 'Enterprise Cost structures',
    beleh: 'AFFORDABLE ON DEMAND',
    legacy: 'Expensive user licenses',
  },
] as const;

export type LandingNavSection = 'features' | 'problems' | 'steps' | 'metrics';

export const NAV_SECTIONS: { id: LandingNavSection; label: string; tab?: ExplorerTabId }[] = [
  { id: 'features', label: 'Features', tab: 'features' },
  { id: 'problems', label: 'Why Beleh?', tab: 'problems' },
  { id: 'steps', label: 'How It Works', tab: 'steps' },
  { id: 'metrics', label: 'Metrics' },
];

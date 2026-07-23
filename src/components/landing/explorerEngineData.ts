import type { LucideIcon } from 'lucide-react';
import {
  Sparkles,
  BarChart3,
  ShieldCheck,
  Zap,
  Cpu,
  Users,
  AlertTriangle,
  ListOrdered,
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
  { id: 'features', label: 'Features', icon: Zap, diagnosticLabel: 'Features' },
  { id: 'problems', label: 'Why Beleh?', icon: AlertTriangle, diagnosticLabel: 'Challenges' },
  { id: 'steps', label: 'How it works', icon: ListOrdered, diagnosticLabel: 'Getting started' },
  { id: 'comparison', label: 'Compare', icon: BookOpen, diagnosticLabel: 'Comparison' },
];

export const LANDING_STATS = [
  { value: '10x', label: 'Faster insights', icon: Sparkles, accent: 'blue' },
  { value: '0', label: 'SQL required', icon: Command, accent: 'cyan' },
  { value: '99.9%', label: 'Uptime target', icon: ShieldCheck, accent: 'green' },
  {
    value: 'α0.1.0',
    label: 'Alpha release',
    detail: 'Preview build — features ship weekly; production metrics arrive after GA',
    icon: FlaskConical,
    accent: 'purple',
    informative: true,
  },
] as const;

export const FEATURE_CARDS = [
  {
    title: 'AI-powered answers',
    description:
      'Ask in plain language and get answers that understand your business data and context.',
    icon: Sparkles,
    accent: 'blue',
  },
  {
    title: 'Instant charts',
    description:
      'Clear charts and summaries generated automatically — export or share with one click.',
    icon: BarChart3,
    accent: 'cyan',
  },
  {
    title: 'Enterprise security',
    description:
      'Encryption, SOC 2–aligned practices, and isolated workspaces so your data stays protected.',
    icon: ShieldCheck,
    accent: 'green',
  },
  {
    title: 'Built for speed',
    description:
      'Get answers in seconds, not days. Designed for the pace of modern decision-making.',
    icon: Zap,
    accent: 'purple',
  },
  {
    title: 'Smart data mapping',
    description:
      'Automatically understands your tables and relationships so you can start asking questions right away.',
    icon: Cpu,
    accent: 'pink',
  },
  {
    title: 'Built for teams',
    description: 'Share insights, threads, and charts with colleagues so everyone stays aligned.',
    icon: Users,
    accent: 'indigo',
  },
] as const;

export const PROBLEM_CARDS = [
  {
    title: 'Weeks to build dashboards',
    stat: '6–8 weeks wait',
    description:
      'Traditional BI often needs long projects before you see value. Decisions can’t wait that long.',
    icon: CloudLightning,
  },
  {
    title: 'SQL skills required',
    stat: 'Most teams aren’t technical',
    description:
      'Your team shouldn’t need to write queries just to understand what happened yesterday.',
    icon: Command,
  },
  {
    title: 'Bottlenecked by experts',
    stat: '3–5 days wait time',
    description:
      'Waiting on analysts for ad-hoc reports slows everyone down. Opportunities get missed.',
    icon: Users,
  },
] as const;

export const PIPELINE_STEPS = [
  {
    vector: '01',
    title: 'Connect your data',
    description: 'Upload a file or connect a database in minutes — then you’re ready to ask.',
    icon: Upload,
  },
  {
    vector: '02',
    title: 'Ask questions',
    description: 'Type naturally in plain English, like you’re asking a trusted colleague.',
    icon: MessageCircle,
  },
  {
    vector: '03',
    title: 'Get insights',
    description: 'Instant charts and clear answers you can act on right away.',
    icon: LineChart,
  },
] as const;

export const COMPARISON_ROWS = [
  {
    criterion: 'Time to first insight',
    beleh: 'Minutes',
    legacy: 'Weeks',
  },
  {
    criterion: 'How you ask',
    beleh: 'Plain English',
    legacy: 'SQL / complex dashboards',
  },
  {
    criterion: 'Setup required',
    beleh: 'Minimal',
    legacy: 'Lengthy BI projects',
  },
  {
    criterion: 'Learning curve',
    beleh: 'Chat-simple',
    legacy: 'Weeks of training',
  },
  {
    criterion: 'For business users',
    beleh: 'Built for them',
    legacy: 'Hard without specialists',
  },
  {
    criterion: 'Cost model',
    beleh: 'Affordable & flexible',
    legacy: 'Expensive seat licenses',
  },
] as const;

export type LandingNavSection = 'features' | 'problems' | 'steps' | 'metrics';

export const NAV_SECTIONS: { id: LandingNavSection; label: string; tab?: ExplorerTabId }[] = [
  { id: 'features', label: 'Features', tab: 'features' },
  { id: 'problems', label: 'Why Beleh?', tab: 'problems' },
  { id: 'steps', label: 'How it works', tab: 'steps' },
  { id: 'metrics', label: 'Highlights' },
];

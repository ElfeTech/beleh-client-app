export const EMULATOR_CHART_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
];

export type NamedValue = { name: string; value: number };

export type AreaPoint = {
  name: string;
  Hour: number;
  'Total Requests': number;
};

export type EmulatorTurn =
  | {
      id: string;
      prompt: string;
      sessionTitle: string;
      userInitials: string;
      userTime: string;
      assistantTime: string;
      executionTime: string;
      rowsScanned: number;
      summary: string;
      visuals: {
        kind: 'donut-bar';
        donutTitle: string;
        donut: NamedValue[];
        barTitle: string;
        bar: NamedValue[];
      };
    }
  | {
      id: string;
      prompt: string;
      sessionTitle: string;
      userInitials: string;
      userTime: string;
      assistantTime: string;
      executionTime: string;
      rowsScanned: number;
      summary: string;
      note?: string;
      visuals: {
        kind: 'kpi-area';
        sectionLabel: string;
        kpiLabel: string;
        kpiValue: string;
        areaTitle: string;
        area: AreaPoint[];
      };
    }
  | {
      id: string;
      prompt: string;
      sessionTitle: string;
      userInitials: string;
      userTime: string;
      assistantTime: string;
      executionTime: string;
      rowsScanned: number;
      summary: string;
      visuals: {
        kind: 'schema-kpi';
        tableLabel: string;
        columns: Array<{ name: string; type: string }>;
        insight: string;
        kpiLabel: string;
        kpiValue: string;
        barTitle: string;
        bar: NamedValue[];
      };
    };

/** Seed recent chats shown in the fake sidebar before / between turns. */
export const EMULATOR_SIDEBAR_SESSIONS = [
  'how many users are total that have created projects',
  'I want to see which project categories grow fastest',
  'Which top 5 projects have the largest budgets',
  'how many users have create project this month',
] as const;

export const EMULATOR_TURNS: EmulatorTurn[] = [
  {
    id: 'payments',
    prompt:
      'can you give me the number of payment transactions performed today, group them by status and currency type and the failure reason if there are any failed transactions.',
    sessionTitle: 'payment transactions by status and currency',
    userInitials: 'JD',
    userTime: '05:18 PM',
    assistantTime: '05:19 PM',
    executionTime: '2.4s',
    rowsScanned: 18,
    summary:
      'Today there were 6 payment transactions in total. All 6 are in pending status — none have completed or failed yet, so there are no failure reasons to report. The mix spans five currencies: NGN, RWF, USD, XOF, and ZAR.',
    visuals: {
      kind: 'donut-bar',
      donutTitle: "Today's transactions by currency",
      donut: [
        { name: 'NGN', value: 2 },
        { name: 'RWF', value: 1 },
        { name: 'USD', value: 1 },
        { name: 'XOF', value: 1 },
        { name: 'ZAR', value: 1 },
      ],
      barTitle: "Today's payments by status & currency",
      bar: [
        { name: 'NGN', value: 2 },
        { name: 'RWF', value: 1 },
        { name: 'USD', value: 1 },
        { name: 'XOF', value: 1 },
        { name: 'ZAR', value: 1 },
      ],
    },
  },
  {
    id: 'schema-plans',
    prompt: 'Show me the Plan table schema and how many plans are public vs private.',
    sessionTitle: 'Plan schema and public vs private',
    userInitials: 'JD',
    userTime: '05:21 PM',
    assistantTime: '05:21 PM',
    executionTime: '1.1s',
    rowsScanned: 31,
    summary:
      'The Plan table exposes pricing and visibility fields — status, sortOrder, isPopular, isPublic, and priceUsd. Of the plans scanned, most are private; a smaller set is marked public and ready for marketplace listing.',
    visuals: {
      kind: 'schema-kpi',
      tableLabel: 'Plan · 31 rows',
      columns: [
        { name: 'status', type: 'USER-DEFINED' },
        { name: 'sortOrder', type: 'integer' },
        { name: 'isPopular', type: 'boolean' },
        { name: 'isPublic', type: 'boolean' },
        { name: 'priceUsd', type: 'numeric' },
      ],
      insight:
        'PaymentTransaction and Plan share pricing signals — aggregate amount by month for trend charts, or filter isPublic to size the catalog.',
      kpiLabel: 'PUBLIC PLANS',
      kpiValue: '8',
      barTitle: 'Plans by visibility',
      bar: [
        { name: 'Private', value: 23 },
        { name: 'Public', value: 8 },
      ],
    },
  },
  {
    id: 'projects',
    prompt: 'Show me the global project count by source, and request volume by day and hour.',
    sessionTitle: 'global project count and request volume',
    userInitials: 'JD',
    userTime: '05:24 PM',
    assistantTime: '05:24 PM',
    executionTime: '1.8s',
    rowsScanned: 20,
    note: 'Global Projects by Source: a single aggregated value is clearer as a KPI card.',
    summary:
      'There are 20 global projects, all from the IONOS source. Request volume peaks mid-window and stays elevated across consecutive hours.',
    visuals: {
      kind: 'kpi-area',
      sectionLabel: 'GLOBAL PROJECTS BY SOURCE',
      kpiLabel: 'PROJECT COUNT',
      kpiValue: '20',
      areaTitle: 'Domain requests by day & hour',
      area: [
        { name: '2', Hour: 8, 'Total Requests': 3 },
        { name: '4', Hour: 12, 'Total Requests': 5 },
        { name: '4', Hour: 18, 'Total Requests': 7 },
        { name: '4', Hour: 14, 'Total Requests': 6 },
        { name: '4', Hour: 9, 'Total Requests': 4 },
        { name: '5', Hour: 16, 'Total Requests': 8 },
        { name: '5', Hour: 20, 'Total Requests': 11 },
        { name: '5', Hour: 15, 'Total Requests': 9 },
      ],
    },
  },
];

export const EMULATOR_LOOP_PAUSE_MS = 2800;
export const EMULATOR_THINK_DELAY_MS = 900;
export const EMULATOR_META_DELAY_MS = 400;
export const EMULATOR_CHARTS_DELAY_MS = 700;
export const EMULATOR_TYPE_CHAR_MS = 22;
export const EMULATOR_STREAM_WORD_MS = 38;
export const EMULATOR_SEND_FLASH_MS = 280;

export const EMULATOR_DEMO_URL = 'beleh.yulona.co/workspace/demo/chat?session=live-preview';

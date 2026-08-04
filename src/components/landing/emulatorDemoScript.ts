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
    };

export const EMULATOR_TURNS: EmulatorTurn[] = [
  {
    id: 'payments',
    prompt:
      'can you give me the number of payment transactions performed today, group them by status and currency type and the failure reason if there are any failed transactions.',
    userInitials: 'KG',
    userTime: '05:18 PM',
    assistantTime: '05:19 PM',
    executionTime: '42.8s',
    rowsScanned: 18,
    summary:
      'Today there were 6 payment transactions in total. All 6 are in pending status — none have completed or failed yet, so there are no failure reasons to report. The mix spans five currencies: NGN, RWF, USD, XOF, and ZAR, with most volume concentrated in a few corridors.',
    visuals: {
      kind: 'donut-bar',
      donutTitle: "Today's transactions by type/status/state/currency",
      donut: [
        { name: 'NGN', value: 2 },
        { name: 'RWF', value: 1 },
        { name: 'USD', value: 1 },
        { name: 'XOF', value: 1 },
        { name: 'ZAR', value: 1 },
      ],
      barTitle: "Today's payment transactions by status and currency",
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
    id: 'projects',
    prompt: 'Show me the global project count by source, and request volume by day and hour.',
    userInitials: 'KG',
    userTime: '11:04 PM',
    assistantTime: '11:05 PM',
    executionTime: '22.3s',
    rowsScanned: 1,
    note: 'Global Projects by Source: You asked for a column chart, but a single aggregated value is clearer as a KPI card.',
    summary:
      'There are 20 global projects, all from the IONOS source. Request volume peaks mid-window and stays elevated across consecutive hours — Hour tracks the denser series while Total Requests stays lower underneath.',
    visuals: {
      kind: 'kpi-area',
      sectionLabel: 'GLOBAL PROJECTS BY SOURCE',
      kpiLabel: 'PROJECT COUNT',
      kpiValue: '20',
      areaTitle: 'All Domain Requests by Day & Hour (Heatmap)',
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

export const EMULATOR_LOOP_PAUSE_MS = 3200;
export const EMULATOR_META_DELAY_MS = 450;
export const EMULATOR_CHARTS_DELAY_MS = 350;
export const EMULATOR_TYPE_CHAR_MS = 28;
export const EMULATOR_STREAM_WORD_MS = 42;

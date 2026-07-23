/**
 * Demo mode: sample prompts and dummy AssistantTurnResponse payloads
 * for first-time users to see how the platform works without uploading data.
 */

import type { AssistantTurnResponse, ChartArtifactType, UiArtifact } from '../types/api';
import { DEMO_NEW_USER_KEY, DEMO_STORAGE_KEY } from './clientStorageKeys';

export function isNewUserForDemo(): boolean {
  return localStorage.getItem(DEMO_NEW_USER_KEY) !== 'false';
}

export function setNewUserFlag(flag: boolean): void {
  localStorage.setItem(DEMO_NEW_USER_KEY, String(flag));
}

export function hasCompletedDemo(): boolean {
  return localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
}

export function setDemoCompleted(): void {
  localStorage.setItem(DEMO_STORAGE_KEY, 'true');
  localStorage.setItem(DEMO_NEW_USER_KEY, 'false');
}

export interface DemoPromptItem {
  id: string;
  icon: string;
  text: string;
  description: string;
}

export const DEMO_PROMPTS: DemoPromptItem[] = [
  {
    id: 'overview',
    icon: '📊',
    text: 'Give me an overview of the data',
    description: 'See a summary with key metrics and a bar chart',
  },
  {
    id: 'trend',
    icon: '📈',
    text: 'Show me revenue trend over the last 6 months',
    description: 'Explore a time series line chart',
  },
  {
    id: 'comparison',
    icon: '📉',
    text: 'Compare sales by region',
    description: 'Compare categories with a bar chart',
  },
  {
    id: 'distribution',
    icon: '🥧',
    text: 'What is the distribution of market share by segment?',
    description: 'View proportions in a pie chart',
  },
];

function makeTurn(
  chartType: ChartArtifactType,
  title: string,
  labels: string[],
  values: number[],
  datasetLabel: string,
  columns: string[],
  rows: unknown[][],
  text: string,
  bullets: string[],
): AssistantTurnResponse {
  const chartArtifact: UiArtifact = {
    id: `demo-chart-${chartType}`,
    type: chartType,
    title,
    version: 1,
    data: {
      labels,
      datasets: [{ label: datasetLabel, data: values }],
      source_tool_call_id: 'demo',
    },
  };

  const tableArtifact: UiArtifact = {
    id: `demo-table-${chartType}`,
    type: 'table',
    title: 'Results',
    version: 1,
    data: {
      columns,
      rows,
      page_size: 50,
    },
  };

  const insightArtifact: UiArtifact = {
    id: `demo-insight-${chartType}`,
    type: 'insight',
    title: 'Key insights',
    version: 1,
    data: {
      bullets,
      limitations: 'This is a demo with sample data. Upload your own data for real insights.',
      confidence: 0.9,
    },
  };

  const actionArtifact: UiArtifact = {
    id: `demo-actions-${chartType}`,
    type: 'action_group',
    title: 'Suggested follow-ups',
    version: 1,
    data: {
      actions: [
        {
          id: 'a1',
          label: 'Show me a breakdown by category',
          style: 'primary',
          kind: 'ask',
          payload: { prompt: 'Show me a breakdown by category' },
        },
        {
          id: 'a2',
          label: 'What is the trend over time?',
          style: 'secondary',
          kind: 'ask',
          payload: { prompt: 'What is the trend over time?' },
        },
        {
          id: 'a3',
          label: 'Compare the top and bottom performers',
          style: 'secondary',
          kind: 'ask',
          payload: { prompt: 'Compare the top and bottom performers' },
        },
      ],
    },
  };

  return {
    role: 'assistant',
    text,
    artifacts: [chartArtifact, tableArtifact, insightArtifact, actionArtifact],
    meta: {
      model: 'demo',
      tools_used: ['demo'],
      latency_ms: 120,
      row_count: rows.length,
      validation_warnings: [],
    },
  };
}

const DEMO_OVERVIEW_RESPONSE: AssistantTurnResponse = makeTurn(
  'bar',
  'Top Products by Revenue',
  ['Electronics', 'Apparel', 'Home & Garden', 'Sports', 'Books'],
  [124500, 89200, 67100, 54300, 41200],
  'Revenue',
  ['product', 'revenue'],
  [
    ['Electronics', 124500],
    ['Apparel', 89200],
    ['Home & Garden', 67100],
    ['Sports', 54300],
    ['Books', 41200],
  ],
  'Electronics leads with $124.5K in revenue, followed by Apparel ($89.2K) and Home & Garden ($67.1K). Top 5 categories account for the majority of total revenue.',
  ['Electronics is the top revenue driver.', 'Apparel and Home & Garden show strong performance.'],
);

const DEMO_TREND_RESPONSE: AssistantTurnResponse = makeTurn(
  'line',
  'Revenue Trend (Last 6 Months)',
  ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
  [72000, 78500, 82100, 93400, 108200, 95200],
  'Revenue',
  ['month', 'revenue'],
  [
    ['Aug', 72000],
    ['Sep', 78500],
    ['Oct', 82100],
    ['Nov', 93400],
    ['Dec', 108200],
    ['Jan', 95200],
  ],
  'Revenue grew from $72K in August to a peak of $108.2K in December, with a slight dip in January. Strong upward trend in the second half of the period.',
  ['Peak revenue in December.', 'Consistent growth from Aug to Dec.'],
);

const DEMO_COMPARISON_RESPONSE: AssistantTurnResponse = makeTurn(
  'bar',
  'Sales by Region',
  ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East'],
  [185000, 142000, 128000, 67000, 48000],
  'Sales',
  ['region', 'sales'],
  [
    ['North America', 185000],
    ['Europe', 142000],
    ['Asia Pacific', 128000],
    ['Latin America', 67000],
    ['Middle East', 48000],
  ],
  'North America leads with $185K in sales, followed by Europe ($142K) and Asia Pacific ($128K). Regional performance aligns with market size and investment.',
  ['North America and Europe are the top two regions.', 'Asia Pacific shows strong potential.'],
);

const DEMO_DISTRIBUTION_RESPONSE: AssistantTurnResponse = makeTurn(
  'pie',
  'Market Share by Segment',
  ['Enterprise', 'SMB', 'Consumer', 'Startup'],
  [38, 28, 22, 12],
  'Share',
  ['segment', 'share'],
  [
    ['Enterprise', 38],
    ['SMB', 28],
    ['Consumer', 22],
    ['Startup', 12],
  ],
  'Enterprise holds the largest share at 38%, followed by SMB (28%) and Consumer (22%). Startup segment accounts for 12% of the market.',
  [
    'Enterprise is the dominant segment.',
    'SMB and Consumer together represent half of the market.',
  ],
);

const DEMO_RESPONSE_MAP: Record<string, AssistantTurnResponse> = {
  overview: DEMO_OVERVIEW_RESPONSE,
  trend: DEMO_TREND_RESPONSE,
  comparison: DEMO_COMPARISON_RESPONSE,
  distribution: DEMO_DISTRIBUTION_RESPONSE,
};

/** Get demo response by prompt id; fallback to overview if no match */
export function getDemoResponse(promptId: string): AssistantTurnResponse {
  return DEMO_RESPONSE_MAP[promptId] ?? DEMO_OVERVIEW_RESPONSE;
}

/** Match user prompt text to a demo prompt id for consistent chart type */
export function matchDemoPromptId(userText: string): string {
  const lower = userText.toLowerCase().trim();
  if (lower.includes('trend') || (lower.includes('revenue') && lower.includes('month')))
    return 'trend';
  if (lower.includes('region') || (lower.includes('compare') && lower.includes('sales')))
    return 'comparison';
  if (
    lower.includes('distribution') ||
    lower.includes('market share') ||
    lower.includes('segment') ||
    lower.includes('pie')
  )
    return 'distribution';
  return 'overview';
}

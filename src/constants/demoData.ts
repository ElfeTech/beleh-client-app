/**
 * Demo mode: sample prompts and dummy ChatWorkflowResponse payloads
 * for first-time users to see how the platform works without uploading data.
 */

import type { ChatWorkflowResponse } from '../types/api';

const DEMO_STORAGE_KEY = 'beleh_has_completed_demo';
const DEMO_NEW_USER_KEY = 'beleh_is_new_user';

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

function makeResponse(
    type: 'bar' | 'line' | 'pie',
    title: string,
    description: string,
    xField: string,
    yField: string,
    columns: Array<{ name: string; type: string }>,
    rows: Record<string, any>[],
    summary: string,
    keyInsights: string[] = []
): ChatWorkflowResponse {
    return {
        intent: {
            intent: 'visualize',
            confidence: 0.95,
            entities: {},
            visualization: type,
            clarification_needed: false,
        },
        execution: {
            status: 'SUCCESS',
            execution_time_ms: 120,
            row_count: rows.length,
            columns,
            rows,
            cache_hit: false,
            visualization_hint: type,
            error_type: null,
            message: null,
        },
        visualization: {
            type,
            visualization_type: type,
            title,
            description,
            encoding: {
                x: { field: xField, type: type === 'line' ? 'temporal' : 'categorical', label: xField.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                y: { field: yField, type: 'quantitative', label: yField.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
            },
        },
        insight: {
            summary,
            key_insights: keyInsights.length ? keyInsights : [summary],
            supporting_facts: [],
            limitations: 'This is a demo with sample data. Upload your own data for real insights.',
            confidence: 0.9,
        },
    };
}

/** Bar chart: overview / top metrics */
const DEMO_OVERVIEW_RESPONSE: ChatWorkflowResponse = makeResponse(
    'bar',
    'Top Products by Revenue',
    'Revenue by product category (sample data)',
    'product',
    'revenue',
    [
        { name: 'product', type: 'VARCHAR' },
        { name: 'revenue', type: 'DOUBLE' },
    ],
    [
        { product: 'Electronics', revenue: 124500 },
        { product: 'Apparel', revenue: 89200 },
        { product: 'Home & Garden', revenue: 67100 },
        { product: 'Sports', revenue: 54300 },
        { product: 'Books', revenue: 41200 },
    ],
    'Electronics leads with $124.5K in revenue, followed by Apparel ($89.2K) and Home & Garden ($67.1K). Top 5 categories account for the majority of total revenue.',
    ['Electronics is the top revenue driver.', 'Apparel and Home & Garden show strong performance.']
);

/** Line chart: trend over time */
const DEMO_TREND_RESPONSE: ChatWorkflowResponse = makeResponse(
    'line',
    'Revenue Trend (Last 6 Months)',
    'Monthly revenue over time (sample data)',
    'month',
    'revenue',
    [
        { name: 'month', type: 'VARCHAR' },
        { name: 'revenue', type: 'DOUBLE' },
    ],
    [
        { month: 'Aug', revenue: 72000 },
        { month: 'Sep', revenue: 78500 },
        { month: 'Oct', revenue: 82100 },
        { month: 'Nov', revenue: 93400 },
        { month: 'Dec', revenue: 108200 },
        { month: 'Jan', revenue: 95200 },
    ],
    'Revenue grew from $72K in August to a peak of $108.2K in December, with a slight dip in January. Strong upward trend in the second half of the period.',
    ['Peak revenue in December.', 'Consistent growth from Aug to Dec.']
);

/** Bar chart: comparison by region */
const DEMO_COMPARISON_RESPONSE: ChatWorkflowResponse = makeResponse(
    'bar',
    'Sales by Region',
    'Total sales comparison across regions (sample data)',
    'region',
    'sales',
    [
        { name: 'region', type: 'VARCHAR' },
        { name: 'sales', type: 'DOUBLE' },
    ],
    [
        { region: 'North America', sales: 185000 },
        { region: 'Europe', sales: 142000 },
        { region: 'Asia Pacific', sales: 128000 },
        { region: 'Latin America', sales: 67000 },
        { region: 'Middle East', sales: 48000 },
    ],
    'North America leads with $185K in sales, followed by Europe ($142K) and Asia Pacific ($128K). Regional performance aligns with market size and investment.',
    ['North America and Europe are the top two regions.', 'Asia Pacific shows strong potential.']
);

/** Pie chart: distribution */
const DEMO_DISTRIBUTION_RESPONSE: ChatWorkflowResponse = makeResponse(
    'pie',
    'Market Share by Segment',
    'Distribution of market share across segments (sample data)',
    'segment',
    'share',
    [
        { name: 'segment', type: 'VARCHAR' },
        { name: 'share', type: 'DOUBLE' },
    ],
    [
        { segment: 'Enterprise', share: 38 },
        { segment: 'SMB', share: 28 },
        { segment: 'Consumer', share: 22 },
        { segment: 'Startup', share: 12 },
    ],
    'Enterprise holds the largest share at 38%, followed by SMB (28%) and Consumer (22%). Startup segment accounts for 12% of the market.',
    ['Enterprise is the dominant segment.', 'SMB and Consumer together represent half of the market.']
);

const DEMO_RESPONSE_MAP: Record<string, ChatWorkflowResponse> = {
    overview: DEMO_OVERVIEW_RESPONSE,
    trend: DEMO_TREND_RESPONSE,
    comparison: DEMO_COMPARISON_RESPONSE,
    distribution: DEMO_DISTRIBUTION_RESPONSE,
};

/** Get demo response by prompt id; fallback to overview if no match */
export function getDemoResponse(promptId: string): ChatWorkflowResponse {
    return DEMO_RESPONSE_MAP[promptId] ?? DEMO_OVERVIEW_RESPONSE;
}

/** Match user prompt text to a demo prompt id for consistent chart type */
export function matchDemoPromptId(userText: string): string {
    const lower = userText.toLowerCase().trim();
    if (lower.includes('trend') || lower.includes('revenue') && lower.includes('month')) return 'trend';
    if (lower.includes('region') || lower.includes('compare') && lower.includes('sales')) return 'comparison';
    if (lower.includes('distribution') || lower.includes('market share') || lower.includes('segment') || lower.includes('pie')) return 'distribution';
    return 'overview';
}

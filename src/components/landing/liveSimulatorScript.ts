export const SIMULATOR_USER_PROMPT = 'What were our top performing products last quarter?';

export const SIMULATOR_AI_RESPONSE =
  'Based on your Q3 sales logs, here are the top 5 products by aggregate revenue:';

export const SIMULATOR_BARS = [
  {
    id: 'PROD_A',
    label: 'PROD_A',
    height: 100,
    color: 'linear-gradient(180deg, #3b82f6, #06b6d4)',
  },
  { id: 'PROD_B', label: 'PROD_B', height: 78, color: 'linear-gradient(180deg, #06b6d4, #10b981)' },
  { id: 'PROD_C', label: 'PROD_C', height: 65, color: 'linear-gradient(180deg, #10b981, #84cc16)' },
  { id: 'PROD_D', label: 'PROD_D', height: 52, color: 'linear-gradient(180deg, #8b5cf6, #a855f7)' },
  { id: 'PROD_E', label: 'PROD_E', height: 40, color: 'linear-gradient(180deg, #f43f5e, #fb7185)' },
] as const;

export const SIMULATOR_TAGS = [
  { id: 'revenue', label: 'REVENUE_INDEX' },
  { id: 'pings', label: 'RESPONSE_PINGS' },
  { id: 'budget', label: 'SAVED_BUDGETS' },
] as const;

export type SimulatorPhase = 'idle' | 'typing' | 'analyzing' | 'visualizing';

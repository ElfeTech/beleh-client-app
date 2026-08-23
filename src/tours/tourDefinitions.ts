/**
 * Declarative feature-tour registry.
 *
 * A tour runs once per user, ever: any interaction (finishing OR dismissing)
 * is persisted via /api/users/me/tours and the tour never auto-starts again.
 * Ship a new feature → append a new TourDefinition here with a fresh id; every
 * user who has not interacted with that id sees it on their next visit.
 *
 * Steps anchor to `[data-tour="…"]` attributes in the app chrome. A step with
 * no target renders as a centered card. Anchored steps whose target is not in
 * the DOM are skipped silently, so tours degrade gracefully across layouts.
 */

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** CSS selector for the element to spotlight; omit for a centered card. */
  target?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Clicking the spotlighted element also advances to the next step. */
  advanceOnClick?: boolean;
}

export interface TourDefinition {
  /** Stable id persisted server-side — never rename after shipping. */
  id: string;
  name: string;
  /** The tour may auto-start only on matching routes. */
  startPath: RegExp;
  /** Lower runs first when several tours are eligible. */
  priority: number;
  steps: TourStep[];
}

const platformOnboarding: TourDefinition = {
  id: 'platform-onboarding',
  name: 'Welcome tour',
  startPath: /^\/workspace\//,
  priority: 10,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Beleh 👋',
      body: 'Beleh turns questions into live analysis of your own data. This 60-second tour shows you around — you can leave at any time.',
    },
    {
      id: 'workspace-switcher',
      target: '[data-tour="workspace-switcher"]',
      placement: 'right',
      title: 'Your workspaces',
      body: 'Each workspace keeps its own data sources, chats, and team. Switch between them — or create a new one — right here.',
    },
    {
      id: 'nav-chat',
      target: '[data-tour="nav-chat"]',
      placement: 'right',
      title: 'Chat is home base',
      body: 'Ask questions in plain language — “revenue by country last quarter” — and get charts, KPIs, and insights back.',
    },
    {
      id: 'nav-datasets',
      target: '[data-tour="nav-datasets"]',
      placement: 'right',
      title: 'Your data sources',
      body: 'Upload CSV or Excel files, or connect PostgreSQL and Supabase. Everything you connect lives here.',
    },
    {
      id: 'composer',
      target: '[data-tour="composer"]',
      placement: 'top',
      title: 'Ask anything',
      body: 'Type a question and press Enter. Pick which source to analyze with the selector on the left of the composer.',
    },
    {
      id: 'nav-settings',
      target: '[data-tour="nav-settings"]',
      placement: 'right',
      title: 'Settings & your team',
      body: 'Invite members, manage workspaces, and track usage and billing from Settings whenever you need it.',
    },
    {
      id: 'finish',
      title: 'You’re all set',
      body: 'That’s the essentials. Connect a data source and ask your first question — Beleh handles the SQL, charts, and summaries.',
    },
  ],
};

const insightsToolkit: TourDefinition = {
  id: 'insights-toolkit-2026-08',
  name: 'New chart tools',
  startPath: /^\/workspace\//,
  priority: 20,
  steps: [
    {
      id: 'intro',
      title: 'New: richer visualizations ✨',
      body: 'Your analyses can now render heatmaps (pattern grids like “orders by day × hour”) and world maps for country-level metrics. Just ask for them.',
    },
    {
      id: 'composer',
      target: '[data-tour="composer"]',
      placement: 'top',
      title: 'Try it from here',
      body: 'For example: “show signups by country on a map” or “plot orders by weekday and hour as a heatmap”.',
    },
    {
      id: 'export',
      title: 'Export any chart',
      body: 'Every chart now has a PNG download button, and you can switch chart types on the fly from the response’s plot view.',
    },
  ],
};

export const TOUR_REGISTRY: TourDefinition[] = [platformOnboarding, insightsToolkit];

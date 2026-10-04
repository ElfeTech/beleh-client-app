export interface FaqItem {
  readonly q: string;
  readonly a: string;
}

/** Single source for the visible FAQ and the FAQPage structured data. */
export const LANDING_FAQ: readonly FaqItem[] = [
  {
    q: 'What is AI business intelligence?',
    a: 'AI business intelligence is business analytics you can talk to. Instead of building dashboards or writing SQL, you ask a question in everyday language and the AI queries your data, draws the right chart and explains what it found.',
  },
  {
    q: 'How is Beleh different from traditional BI tools?',
    a: 'Traditional BI tools need someone to model the data and build every dashboard before anyone can use it. Beleh skips that step. You connect a data source, ask what you want to know, and get a chart and answer straight away, then follow up with the next question in the same chat.',
  },
  {
    q: 'Do I need to know SQL or have a data team?',
    a: 'No. Beleh writes and runs the queries for you. Founders, sales leads, finance managers and operations teams can explore their own data without waiting on an analyst.',
  },
  {
    q: 'What data can I connect to Beleh?',
    a: 'You can upload CSV and Excel files, connect Google Sheets, or link a database. Once a source is connected, Beleh opens an overview of it automatically so you can start asking questions right away.',
  },
  {
    q: 'How long does it take to get my first chart?',
    a: 'Usually a few minutes from sign-up. Connect a file or database, ask your first question, and the chart appears in seconds.',
  },
  {
    q: 'What kinds of charts and analysis does Beleh create?',
    a: 'Beleh picks the chart that fits your question, including bar, line, pie, heatmap and map charts, and writes a short plain-English explanation alongside it. You can keep refining with follow-up questions.',
  },
  {
    q: 'Is my business data secure?',
    a: 'Each workspace is kept separate and protected by secure sign-in. You can read our privacy policy and data processing terms at any time, and manage your cookie preferences from the footer.',
  },
  {
    q: 'Can my whole team use Beleh together?',
    a: 'Yes. Create a workspace, invite teammates, and share data sources and charts so everyone works from the same numbers.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. Every new account starts with a free 7-day trial and no credit card is required. Pick a plan when you are ready to keep going.',
  },
];

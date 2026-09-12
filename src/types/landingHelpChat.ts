export type LandingHelpMessageRole = 'user' | 'assistant';
export type LandingHelpMessageStatus = 'streaming' | 'done' | 'error';

export interface LandingHelpMessage {
  id: string;
  role: LandingHelpMessageRole;
  content: string;
  status: LandingHelpMessageStatus;
}

export type FeedbackType =
  | 'DATA_UNDERSTANDING'
  | 'ACCURACY'
  | 'RETURNING_USER'
  | 'UX'
  | 'GENERAL';

export interface FeedbackTrigger {
  type: FeedbackType;
  question: string;
  context?: string;
}

export interface FeedbackSubmission {
  feedback_type: FeedbackType;
  question: string;
  rating?: number; // 1-5 stars
  response?: string;
  session_id?: string;
  metadata?: {
    action_trigger?: string;
    platform_area?: string;
    [key: string]: any;
  };
}

export interface FeedbackState {
  lastShownTimestamp?: number;
  dismissedInSession: Set<FeedbackType>;
  submittedTypes: FeedbackType[];
  datasetUploadCount: number;
  chatQueryCount: number;
  complexQueryCount: number;
  visualizationInteractionCount: number;
  lastVisitTimestamp?: number;
}

export const FEEDBACK_TRIGGERS: Record<FeedbackType, FeedbackTrigger> = {
  DATA_UNDERSTANDING: {
    type: 'DATA_UNDERSTANDING',
    question: 'Did Beleh understand your data correctly?',
  },
  ACCURACY: {
    type: 'ACCURACY',
    question: 'Was this insight accurate and useful?',
  },
  RETURNING_USER: {
    type: 'RETURNING_USER',
    question: 'How does Beleh feel to use so far?',
  },
  UX: {
    type: 'UX',
    question: 'How do you like the charts and visualizations?',
  },
  GENERAL: {
    type: 'GENERAL',
    question: 'Anything we could improve?',
  },
};

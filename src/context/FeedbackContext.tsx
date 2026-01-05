import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { FeedbackType, FeedbackTrigger, FeedbackSubmission, FeedbackState } from '../types/feedback';
import { apiClient } from '../services/apiClient';
import { useAuth } from './AuthContext';

interface FeedbackContextValue {
  showFeedback: (trigger: FeedbackTrigger) => void;
  dismissFeedback: () => void;
  submitFeedback: (rating?: number, comment?: string) => Promise<void>;
  currentTrigger: FeedbackTrigger | null;
  isVisible: boolean;
  isSubmitting: boolean;
  trackDatasetUpload: () => void;
  trackChatQuery: () => void;
  trackComplexQuery: () => void;
  trackVisualizationInteraction: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

const STORAGE_KEY = 'feedback_state';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * ONE_DAY_MS;
const THREE_DAYS_MS = 3 * ONE_DAY_MS;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

const getInitialState = (): FeedbackState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        dismissedInSession: new Set<FeedbackType>(),
      };
    } catch {
      // Invalid stored state
    }
  }

  return {
    dismissedInSession: new Set<FeedbackType>(),
    submittedTypes: [],
    datasetUploadCount: 0,
    chatQueryCount: 0,
    complexQueryCount: 0,
    visualizationInteractionCount: 0,
  };
};

const saveState = (state: FeedbackState) => {
  const toSave = {
    ...state,
    dismissedInSession: undefined, // Don't persist session-only state
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
};

export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<FeedbackState>(getInitialState);
  const [currentTrigger, setCurrentTrigger] = useState<FeedbackTrigger | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Track user return on mount
  useEffect(() => {
    const now = Date.now();
    const lastVisit = state.lastVisitTimestamp;

    if (lastVisit) {
      const timeSinceLastVisit = now - lastVisit;
      if (timeSinceLastVisit >= TWO_DAYS_MS && timeSinceLastVisit <= THREE_DAYS_MS) {
        // User returned after 2-3 days - DON'T update timestamp yet
        // Let the feedback logic check first, then update after showing/dismissing
      } else {
        // Not in the 2-3 day window, update timestamp
        setState(prev => ({ ...prev, lastVisitTimestamp: now }));
      }
    } else {
      // First visit
      setState(prev => ({ ...prev, lastVisitTimestamp: now }));
    }
  }, []);

  const shouldShowFeedback = useCallback((type: FeedbackType): boolean => {
    // Don't show if already dismissed in this session
    if (state.dismissedInSession.has(type)) {
      return false;
    }

    // Don't show if already submitted this type
    if (state.submittedTypes.includes(type)) {
      return false;
    }

    // Rate limiting: Don't show feedback more than once per day
    if (state.lastShownTimestamp) {
      const timeSinceLastShown = Date.now() - state.lastShownTimestamp;
      if (timeSinceLastShown < ONE_DAY_MS) {
        return false;
      }
    }

    // Type-specific logic
    switch (type) {
      case 'DATA_UNDERSTANDING':
        return state.datasetUploadCount >= 1 && state.chatQueryCount >= 3;

      case 'ACCURACY':
        return state.complexQueryCount >= 1;

      case 'RETURNING_USER': {
        const lastVisit = state.lastVisitTimestamp;
        if (!lastVisit) return false;
        const timeSinceLastVisit = Date.now() - lastVisit;
        return timeSinceLastVisit >= TWO_DAYS_MS && timeSinceLastVisit <= THREE_DAYS_MS;
      }

      case 'UX':
        return state.visualizationInteractionCount >= 1;

      case 'GENERAL': {
        // Show general feedback max once per week
        if (state.lastShownTimestamp) {
          const timeSinceLastShown = Date.now() - state.lastShownTimestamp;
          return timeSinceLastShown >= ONE_WEEK_MS;
        }
        return Math.random() < 0.1; // 10% chance
      }

      default:
        return false;
    }
  }, [state]);

  const showFeedback = useCallback((trigger: FeedbackTrigger) => {
    if (!shouldShowFeedback(trigger.type)) {
      return;
    }

    setCurrentTrigger(trigger);
    setIsVisible(true);
    setState(prev => ({
      ...prev,
      lastShownTimestamp: Date.now(),
    }));
  }, [shouldShowFeedback]);

  const dismissFeedback = useCallback(() => {
    if (currentTrigger) {
      const updates: Partial<FeedbackState> = {
        dismissedInSession: new Set([...state.dismissedInSession, currentTrigger.type]),
      };

      // If dismissing RETURNING_USER feedback, update the last visit timestamp
      if (currentTrigger.type === 'RETURNING_USER') {
        updates.lastVisitTimestamp = Date.now();
      }

      setState(prev => ({ ...prev, ...updates }));
    }
    setIsVisible(false);
    setCurrentTrigger(null);
  }, [currentTrigger, state.dismissedInSession]);

  const submitFeedback = useCallback(async (rating?: number, comment?: string) => {
    if (!currentTrigger || !user) return;

    setIsSubmitting(true);

    try {
      const token = await user.getIdToken();

      // Get session_id from localStorage if available
      const sessionId = localStorage.getItem('activeSessionId') || undefined;

      const submission: FeedbackSubmission = {
        feedback_type: currentTrigger.type,
        question: currentTrigger.question,
        rating,
        response: comment,
        session_id: sessionId,
        metadata: {
          action_trigger: currentTrigger.type.toLowerCase(),
          platform_area: 'chat',
          context: currentTrigger.context,
        },
      };

      // Submit to backend (fire and forget)
      apiClient.submitFeedback(token, submission).catch(err => {
        console.error('[Feedback] Submission failed:', err);
      });

      // Update local state
      const updates: Partial<FeedbackState> = {
        submittedTypes: [...state.submittedTypes, currentTrigger.type],
      };

      // If submitting RETURNING_USER feedback, update the last visit timestamp
      if (currentTrigger.type === 'RETURNING_USER') {
        updates.lastVisitTimestamp = Date.now();
      }

      setState(prev => ({ ...prev, ...updates }));

      // Close modal
      setIsVisible(false);
      setCurrentTrigger(null);
    } catch (error) {
      console.error('[Feedback] Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentTrigger, user]);

  // Tracking methods
  const trackDatasetUpload = useCallback(() => {
    setState(prev => ({
      ...prev,
      datasetUploadCount: prev.datasetUploadCount + 1,
    }));
  }, []);

  const trackChatQuery = useCallback(() => {
    setState(prev => ({
      ...prev,
      chatQueryCount: prev.chatQueryCount + 1,
    }));
  }, []);

  const trackComplexQuery = useCallback(() => {
    setState(prev => ({
      ...prev,
      complexQueryCount: prev.complexQueryCount + 1,
    }));
  }, []);

  const trackVisualizationInteraction = useCallback(() => {
    setState(prev => ({
      ...prev,
      visualizationInteractionCount: prev.visualizationInteractionCount + 1,
    }));
  }, []);

  const value: FeedbackContextValue = {
    showFeedback,
    dismissFeedback,
    submitFeedback,
    currentTrigger,
    isVisible,
    isSubmitting,
    trackDatasetUpload,
    trackChatQuery,
    trackComplexQuery,
    trackVisualizationInteraction,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
};

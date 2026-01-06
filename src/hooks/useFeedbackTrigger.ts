import { useEffect, useRef } from 'react';
import { useFeedback } from '../context/FeedbackContext';
import { FEEDBACK_TRIGGERS } from '../types/feedback';
import type { FeedbackType } from '../types/feedback';

export const useFeedbackTrigger = (
  type: FeedbackType,
  shouldTrigger: boolean,
  delay: number = 1000
) => {
  const { showFeedback } = useFeedback();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (shouldTrigger && !hasTriggered.current) {
      hasTriggered.current = true;

      const timer = setTimeout(() => {
        showFeedback(FEEDBACK_TRIGGERS[type]);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [shouldTrigger, type, delay, showFeedback]);
};

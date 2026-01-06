import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFeedback } from '../../context/FeedbackContext';
import './FeedbackModal.css';

const FeedbackModal = () => {
  const { currentTrigger, isVisible, isSubmitting, dismissFeedback, submitFeedback } = useFeedback();
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset state when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      setRating(undefined);
      setComment('');
      setHoveredStar(null);
      setShowSuccess(false);
    }
  }, [isVisible]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible && !isSubmitting) {
        dismissFeedback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, isSubmitting, dismissFeedback]);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  const handleSubmit = async () => {
    await submitFeedback(rating, comment.trim() || undefined);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  if (!isVisible || !currentTrigger) {
    return null;
  }

  const modalContent = (
    <div className="feedback-modal-backdrop" onClick={dismissFeedback}>
      <div className="feedback-modal-content" onClick={(e) => e.stopPropagation()}>
        {showSuccess ? (
          <div className="feedback-success">
            <div className="feedback-success-icon">✓</div>
            <p className="feedback-success-message">Thank you for your feedback!</p>
          </div>
        ) : (
          <>
            <div className="feedback-header">
              <h3 className="feedback-title">{currentTrigger.question}</h3>
              <p className="feedback-subtitle">Takes 10 seconds · Optional</p>
            </div>

            <div className="feedback-body">
              <div className="feedback-rating">
                <div className="feedback-stars">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`feedback-star ${
                        (hoveredStar !== null ? value <= hoveredStar : value <= (rating || 0))
                          ? 'feedback-star-filled'
                          : ''
                      }`}
                      onClick={() => handleStarClick(value)}
                      onMouseEnter={() => setHoveredStar(value)}
                      onMouseLeave={() => setHoveredStar(null)}
                      disabled={isSubmitting}
                      aria-label={`Rate ${value} stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="feedback-textarea"
                placeholder="Your feedback helps improve Beleh (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting}
                maxLength={500}
                rows={4}
              />

              <div className="feedback-char-count">
                {comment.length}/500
              </div>
            </div>

            <div className="feedback-footer">
              <button
                type="button"
                className="feedback-button feedback-button-secondary"
                onClick={dismissFeedback}
                disabled={isSubmitting}
              >
                Not now
              </button>
              <button
                type="button"
                className="feedback-button feedback-button-primary"
                onClick={handleSubmit}
                disabled={isSubmitting || (!rating && !comment.trim())}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default FeedbackModal;

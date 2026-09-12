/**
 * localStorage keys cleared on sign-out (user-scoped).
 * Theme preference (`ai-bi-theme-preference`) is intentionally excluded.
 */
export const FEEDBACK_STATE_STORAGE_KEY = 'feedback_state';

export const DEMO_STORAGE_KEY = 'beleh_has_completed_demo';
export const DEMO_NEW_USER_KEY = 'beleh_is_new_user';

export const SESSION_CLEAR_LOCALSTORAGE_KEYS: readonly string[] = [
  'activeWorkspaceId',
  'activeSessionId',
  DEMO_STORAGE_KEY,
  DEMO_NEW_USER_KEY,
  FEEDBACK_STATE_STORAGE_KEY,
];

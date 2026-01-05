/**
 * Feedback System Test Helpers
 * Copy-paste these functions into your browser console for easy testing
 */

// 🔍 View current feedback state
function viewFeedbackState() {
  const state = JSON.parse(localStorage.getItem('feedback_state') || '{}');
  console.log('📊 Current Feedback State:');
  console.table({
    'Dataset Uploads': state.datasetUploadCount || 0,
    'Chat Queries': state.chatQueryCount || 0,
    'Complex Queries': state.complexQueryCount || 0,
    'Chart Interactions': state.visualizationInteractionCount || 0,
    'Last Visit': state.lastVisitTimestamp
      ? new Date(state.lastVisitTimestamp).toLocaleString()
      : 'Never',
    'Last Feedback Shown': state.lastShownTimestamp
      ? new Date(state.lastShownTimestamp).toLocaleString()
      : 'Never'
  });
  console.log('✅ Submitted Types:', state.submittedTypes || []);
  return state;
}

// 🔄 Reset all feedback state (triggers will work again)
function resetFeedbackState() {
  localStorage.removeItem('feedback_state');
  console.log('✅ Feedback state reset. Reload page to apply.');
  console.log('Run: location.reload()');
}

// ⏰ Simulate returning user after 2.5 days
function simulateReturningUser() {
  const state = JSON.parse(localStorage.getItem('feedback_state') || '{}');
  const twoDaysAgo = Date.now() - (2.5 * 24 * 60 * 60 * 1000);
  state.lastVisitTimestamp = twoDaysAgo;
  state.submittedTypes = []; // Clear submission history
  state.lastShownTimestamp = undefined; // Clear rate limit
  localStorage.setItem('feedback_state', JSON.stringify(state));
  console.log('✅ Simulated returning user (visited 2.5 days ago)');
  console.log('📍 IMPORTANT: Reload page to trigger RETURNING_USER feedback');
  console.log('   The feedback will appear 2 seconds after page load');
  console.log('Run: location.reload()');
}

// 📈 Set counters to trigger specific feedback
function setCounters(uploads = 0, queries = 0, complexQueries = 0, chartInteractions = 0) {
  const state = JSON.parse(localStorage.getItem('feedback_state') || '{}');
  state.datasetUploadCount = uploads;
  state.chatQueryCount = queries;
  state.complexQueryCount = complexQueries;
  state.visualizationInteractionCount = chartInteractions;
  state.submittedTypes = []; // Clear submission history
  state.lastShownTimestamp = undefined; // Clear rate limit
  localStorage.setItem('feedback_state', JSON.stringify(state));
  console.log('✅ Counters set:', { uploads, queries, complexQueries, chartInteractions });
  console.log('Reload page to apply changes');
}

// 🎯 Trigger DATA_UNDERSTANDING (need 1 upload + 3 queries)
function triggerDataUnderstanding() {
  setCounters(1, 2, 0, 0); // 1 upload, 2 queries (next query will trigger)
  console.log('✅ Ready for DATA_UNDERSTANDING feedback');
  console.log('Send 1 more chat query to trigger');
}

// 🎯 Trigger ACCURACY (need 1 complex query)
function triggerAccuracy() {
  setCounters(1, 5, 0, 0); // Already have uploads/queries
  console.log('✅ Ready for ACCURACY feedback');
  console.log('Send a complex query (with "top", "average", "group", etc.) to trigger');
}

// 🎯 Trigger UX (need 1 chart interaction)
function triggerUX() {
  setCounters(1, 5, 1, 0); // Already have queries
  console.log('✅ Ready for UX feedback');
  console.log('Expand a chart to trigger');
}

// 🚫 Clear submission history (show feedbacks again)
function clearSubmissions() {
  const state = JSON.parse(localStorage.getItem('feedback_state') || '{}');
  state.submittedTypes = [];
  state.lastShownTimestamp = undefined;
  localStorage.setItem('feedback_state', JSON.stringify(state));
  console.log('✅ Submission history cleared');
  console.log('All feedbacks can trigger again (subject to conditions)');
}

// 🕐 Remove rate limiting (show feedback immediately)
function removeRateLimit() {
  const state = JSON.parse(localStorage.getItem('feedback_state') || '{}');
  state.lastShownTimestamp = undefined;
  localStorage.setItem('feedback_state', JSON.stringify(state));
  console.log('✅ Rate limit removed');
}

// 🧹 Full reset (nuclear option)
function fullReset() {
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ All app state cleared');
  console.log('Reload and sign in again: location.reload()');
}

// 📋 Print all available test helpers
function helpFeedbackTesting() {
  console.log(`
🧪 Feedback Testing Helpers Available:

📊 Status & Info:
  viewFeedbackState()          - View current feedback state

🔄 Reset Functions:
  resetFeedbackState()         - Reset all feedback state
  clearSubmissions()           - Clear submission history only
  removeRateLimit()            - Remove 24h rate limit
  fullReset()                  - Clear ALL app data (nuclear option)

🎯 Trigger Specific Feedback:
  triggerDataUnderstanding()   - Prepare DATA_UNDERSTANDING trigger
  triggerAccuracy()            - Prepare ACCURACY trigger
  triggerUX()                  - Prepare UX trigger
  simulateReturningUser()      - Simulate 2.5 day gap (RETURNING_USER)

⚙️ Manual Setup:
  setCounters(uploads, queries, complexQueries, charts)

Example Usage:
  viewFeedbackState()          // Check current state
  triggerAccuracy()            // Set up for accuracy feedback
  // Send a complex query...   // Trigger appears!
  clearSubmissions()           // Make feedbacks available again

Run helpFeedbackTesting() anytime to see this menu again.
  `);
}

// Auto-run help on load
console.log('✅ Feedback test helpers loaded!');
console.log('Run: helpFeedbackTesting() to see available commands');

// Export for global access
window.feedbackTest = {
  viewState: viewFeedbackState,
  reset: resetFeedbackState,
  simulateReturn: simulateReturningUser,
  setCounters,
  triggerDataUnderstanding,
  triggerAccuracy,
  triggerUX,
  clearSubmissions,
  removeRateLimit,
  fullReset,
  help: helpFeedbackTesting
};

console.log('Or use: feedbackTest.help()');

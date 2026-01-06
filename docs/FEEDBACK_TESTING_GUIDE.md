# Feedback System Testing Guide

## ✅ Contract Now Matches Backend

The frontend now sends feedback with the correct structure:

```json
{
  "feedback_type": "UX",
  "question": "How do you like the charts and visualizations?",
  "response": "Great! Very intuitive.",
  "rating": 5,
  "session_id": "current-session-uuid",
  "metadata": {
    "action_trigger": "ux",
    "platform_area": "chat",
    "context": "optional-context-string"
  }
}
```

## 🧪 How to Test Each Feedback Trigger

### 1. DATA_UNDERSTANDING Feedback
**Trigger:** After dataset upload + 3 chat queries
**Question:** "Did Beleh understand your data correctly?"

**Steps to Test:**
1. Start the dev server: `npm run dev`
2. Sign in to the app
3. Upload a dataset (CSV file)
   - Go to workspace
   - Click "Add Dataset" or upload button
   - Wait for dataset to process to READY status
4. Send 3 chat queries about the data
   - Example: "What's the total sales?"
   - Example: "Show me top products"
   - Example: "What's the average price?"
5. **After the 3rd query**, wait 5 seconds (gives you time to review results)
6. Feedback modal should appear with the DATA_UNDERSTANDING question

**To verify in console:**
```javascript
// Open browser console and check localStorage
JSON.parse(localStorage.getItem('feedback_state'))
// Should show: { datasetUploadCount: 1, chatQueryCount: 3, ... }
```

---

### 2. ACCURACY Feedback
**Trigger:** After complex query (GROUP BY, FILTER, aggregations)
**Question:** "Was this insight accurate and useful?"

**Steps to Test:**
1. In an existing chat session with a dataset
2. Send a **complex query** with keywords like:
   - "Show me **top** 10 products by sales"
   - "What's the **average** price per category?"
   - "**Group** sales by region"
   - "**Filter** products with price > 100"
   - "**Rank** customers by revenue"
   - "**Count** total orders per month"
3. **Wait 8 seconds** after response (gives you time to review the data)
4. Feedback modal should appear with ACCURACY question

**Detection keywords:**
- group, filter, rank, top, bottom, average, sum, count
- OR if response has visualization (bar/line/pie chart)

---

### 3. RETURNING_USER Feedback
**Trigger:** User returns after 2-3 days
**Question:** "How does Beleh feel to use so far?"

**Steps to Test (Quick Method):**
1. Open browser DevTools Console
2. Manually set last visit timestamp to 2.5 days ago:
```javascript
const feedback_state = JSON.parse(localStorage.getItem('feedback_state') || '{}');
const twoDaysAgo = Date.now() - (2.5 * 24 * 60 * 60 * 1000);
feedback_state.lastVisitTimestamp = twoDaysAgo;
localStorage.setItem('feedback_state', JSON.stringify(feedback_state));
```
3. Refresh the page
4. Wait 2 seconds
5. Feedback modal should appear with RETURNING_USER question

**Steps to Test (Real Method):**
1. Visit the app today
2. Don't visit for 2-3 days
3. Return and open workspace
4. Feedback should trigger after 2 seconds

---

### 4. UX Feedback
**Trigger:** After chart expansion/interaction
**Question:** "How do you like the charts and visualizations?"

**Steps to Test:**
1. Send a query that generates a chart:
   - "Show me sales by month" (line chart)
   - "What's the distribution by category?" (bar chart)
   - "Show top 5 products" (bar chart)
2. When chart appears, click the **expand/fullscreen button** (⛶ icon)
3. **Wait 5 seconds** (gives you time to explore the chart)
4. Feedback modal should appear with UX question

---

### 5. GENERAL Feedback
**Trigger:** Random (10% chance), max once per week
**Question:** "Anything we could improve?"

**Steps to Test:**
1. This triggers randomly with 10% probability
2. To force it for testing, temporarily modify the code:

Open `src/context/FeedbackContext.tsx` and change line ~136:
```typescript
// FROM:
return Math.random() < 0.1; // 10% chance

// TO:
return true; // Always show (for testing)
```

3. Refresh the page and interact with the app
4. Feedback should appear

**Remember to revert this change after testing!**

---

## 🔍 Manual Testing with Browser Console

### Force Show Any Feedback Type

Open browser console and run:

```javascript
// Get feedback context (requires React DevTools)
// OR manually trigger by clearing state:

// Clear all feedback history
localStorage.removeItem('feedback_state');
location.reload();

// Now all feedbacks will be eligible to show
```

### Check Current State

```javascript
// View current feedback state
const state = JSON.parse(localStorage.getItem('feedback_state') || '{}');
console.table({
  'Dataset Uploads': state.datasetUploadCount || 0,
  'Chat Queries': state.chatQueryCount || 0,
  'Complex Queries': state.complexQueryCount || 0,
  'Chart Interactions': state.visualizationInteractionCount || 0,
  'Submitted Types': state.submittedTypes || [],
  'Last Visit': state.lastVisitTimestamp ? new Date(state.lastVisitTimestamp).toLocaleString() : 'Never'
});
```

### Reset Specific Counters

```javascript
const state = JSON.parse(localStorage.getItem('feedback_state') || '{}');

// Reset to trigger DATA_UNDERSTANDING (need 1 upload + 3 queries)
state.datasetUploadCount = 0;
state.chatQueryCount = 0;

// Reset to trigger ACCURACY (need 1 complex query)
state.complexQueryCount = 0;

// Reset to trigger UX (need 1 chart interaction)
state.visualizationInteractionCount = 0;

// Clear submission history (will show feedbacks again)
state.submittedTypes = [];

localStorage.setItem('feedback_state', JSON.stringify(state));
location.reload();
```

---

## 📡 Verify API Calls

### Monitor Network Requests

1. Open DevTools → Network tab
2. Filter by "feedback"
3. Trigger any feedback and submit
4. You should see:
   - **Request URL:** `POST http://localhost:8000/api/feedback`
   - **Request Headers:** `Authorization: Bearer ...`
   - **Request Payload:**
     ```json
     {
       "feedback_type": "ACCURACY",
       "question": "Was this insight accurate and useful?",
       "rating": 5,
       "response": "Great results!",
       "session_id": "abc-123-xyz",
       "metadata": {
         "action_trigger": "accuracy",
         "platform_area": "chat"
       }
     }
     ```

### Check Console Logs

The app logs feedback events:
- `[Feedback] Submission failed:` - if API call fails (expected if backend not running)
- Look for any errors in console

---

## 🎯 Complete Test Scenario

**Full End-to-End Test:**

1. **Fresh Start**
   ```javascript
   localStorage.removeItem('feedback_state');
   location.reload();
   ```

2. **Upload Dataset** → Track: `datasetUploadCount++`

3. **Send 3 queries:**
   - Query 1: "Show all data" → Track: `chatQueryCount++`
   - Query 2: "What's the total?" → Track: `chatQueryCount++`
   - Query 3: "Show top 5 by sales" (complex) → Track: `chatQueryCount++`, `complexQueryCount++`
   - **Expect:** DATA_UNDERSTANDING or ACCURACY feedback appears

4. **Dismiss feedback** → Won't show again in this session

5. **Expand a chart** → Track: `visualizationInteractionCount++`
   - **Expect:** UX feedback appears

6. **Submit feedback:**
   - Rate 5 stars
   - Type: "Love it!"
   - Click Submit
   - **Expect:** Success checkmark, modal closes

7. **Refresh page** → That specific feedback won't show again

8. **Test rate limiting:**
   - Trigger another feedback type
   - Should only show if >24 hours since last feedback

---

## 🐛 Troubleshooting

### Feedback Not Showing?

Check these conditions:
1. **Already submitted?** Check `state.submittedTypes` in localStorage
2. **Already dismissed?** Refresh page (session dismissals reset)
3. **Rate limited?** Check `state.lastShownTimestamp` (must be >24h ago)
4. **Counters not met?** Verify counts in localStorage
5. **Not authenticated?** Must be signed in

### API Call Failing?

```javascript
// Check in console:
// [Feedback] Submission failed: ...
```

- Ensure backend is running on `localhost:8000`
- Check `/api/feedback` endpoint exists
- Verify authentication token is valid

### Reset Everything

```javascript
// Nuclear option - clear all app state
localStorage.clear();
sessionStorage.clear();
location.reload();
// Sign in again and start fresh
```

---

## 📊 Expected Behavior Summary

| Trigger | Min Requirements | Delay After Trigger | Rate Limit | Resets On |
|---------|-----------------|---------------------|------------|-----------|
| DATA_UNDERSTANDING | 1 upload + 3 queries | 5 seconds | 24h | Never (once submitted) |
| ACCURACY | 1 complex query | 8 seconds | 24h | Never (once submitted) |
| RETURNING_USER | Visit after 2-3 days | 2 seconds | 24h | Never (once submitted) |
| UX | 1 chart interaction | 5 seconds | 24h | Never (once submitted) |
| GENERAL | Random 10% | Immediate | 1 week | Never (once submitted) |

**Global Rules:**
- ✅ Max 1 feedback per 24 hours (across all types)
- ✅ Once submitted, that type never shows again
- ✅ Dismissing only prevents showing in current session
- ✅ Delays give users time to review data before being prompted

---

## 🎉 Success Criteria

- [x] Modal appears with correct question
- [x] Star rating works (1-5 stars)
- [x] Text input accepts feedback (max 500 chars)
- [x] "Not now" dismisses modal
- [x] Submit shows success animation
- [x] API call sends correct JSON structure
- [x] Feedback doesn't show again after submission
- [x] Rate limiting works (24h cooldown)
- [x] Mobile responsive
- [x] Keyboard accessible (ESC to close)

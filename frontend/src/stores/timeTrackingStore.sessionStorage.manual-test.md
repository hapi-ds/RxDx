# Manual Test Plan: sessionStorage UI State Persistence

## Overview
This document describes manual testing procedures to verify that the sessionStorage persistence for UI state (selected task and search query) works correctly.

## Test Environment
- Browser: Chrome/Firefox/Safari (any modern browser)
- Page: `/time-tracking`

## Prerequisites
- User must be logged in
- At least 3-5 tasks should exist in the system

---

## Test Case 1: Selected Task Persistence

### Steps:
1. Navigate to `/time-tracking` page
2. Select a task from the task list (click on it)
3. Verify the task is highlighted/selected
4. Navigate away to another page (e.g., `/workitems`)
5. Navigate back to `/time-tracking` page

### Expected Result:
- The previously selected task should still be highlighted/selected
- The task details should be displayed in the timer panel

### Verification:
- Open browser DevTools > Application > Session Storage
- Check for key: `rxdx_session_selected_task`
- Value should be the task ID (UUID format)

---

## Test Case 2: Search Query Persistence

### Steps:
1. Navigate to `/time-tracking` page
2. Type a search query in the search input (e.g., "authentication")
3. Verify the task list is filtered
4. Navigate away to another page (e.g., `/workitems`)
5. Navigate back to `/time-tracking` page

### Expected Result:
- The search input should still contain "authentication"
- The task list should still be filtered to show only matching tasks

### Verification:
- Open browser DevTools > Application > Session Storage
- Check for key: `rxdx_session_search_query`
- Value should be "authentication"

---

## Test Case 3: Combined State Persistence

### Steps:
1. Navigate to `/time-tracking` page
2. Type a search query (e.g., "test")
3. Select a task from the filtered results
4. Navigate away to another page
5. Navigate back to `/time-tracking` page

### Expected Result:
- Both the search query and selected task should be restored
- The search input should contain "test"
- The selected task should be highlighted

### Verification:
- Open browser DevTools > Application > Session Storage
- Check for both keys:
  - `rxdx_session_selected_task` (should have task ID)
  - `rxdx_session_search_query` (should have "test")

---

## Test Case 4: Clear Search Query

### Steps:
1. Navigate to `/time-tracking` page
2. Type a search query (e.g., "database")
3. Verify sessionStorage contains the query
4. Clear the search input (delete all text or click clear button)
5. Check sessionStorage again

### Expected Result:
- The `rxdx_session_search_query` key should be removed from sessionStorage
- Task list should show all tasks (unfiltered)

### Verification:
- Open browser DevTools > Application > Session Storage
- The `rxdx_session_search_query` key should not exist

---

## Test Case 5: Deselect Task

### Steps:
1. Navigate to `/time-tracking` page
2. Select a task
3. Verify sessionStorage contains the task ID
4. Deselect the task (press Escape or click elsewhere)
5. Check sessionStorage again

### Expected Result:
- The `rxdx_session_selected_task` key should be removed from sessionStorage
- No task should be highlighted in the list

### Verification:
- Open browser DevTools > Application > Session Storage
- The `rxdx_session_selected_task` key should not exist

---

## Test Case 6: New Browser Tab (sessionStorage Isolation)

### Steps:
1. Navigate to `/time-tracking` page in Tab 1
2. Select a task and enter a search query
3. Open a new tab (Tab 2)
4. Navigate to `/time-tracking` in Tab 2

### Expected Result:
- Tab 2 should NOT have the selected task or search query from Tab 1
- sessionStorage is isolated per tab
- Each tab maintains its own UI state

### Verification:
- Tab 1 should have its own sessionStorage values
- Tab 2 should have empty/default sessionStorage values
- Changes in one tab should not affect the other

---

## Test Case 7: Page Refresh (sessionStorage Persistence)

### Steps:
1. Navigate to `/time-tracking` page
2. Select a task and enter a search query
3. Press F5 or Ctrl+R to refresh the page

### Expected Result:
- After refresh, the selected task should still be selected
- The search query should still be in the search input
- sessionStorage persists across page refreshes

### Verification:
- Open browser DevTools > Application > Session Storage
- Values should remain the same before and after refresh

---

## Test Case 8: Browser Close (sessionStorage Cleared)

### Steps:
1. Navigate to `/time-tracking` page
2. Select a task and enter a search query
3. Verify sessionStorage contains the values
4. Close the browser completely
5. Reopen the browser and navigate to `/time-tracking`

### Expected Result:
- sessionStorage should be cleared when browser is closed
- No task should be selected
- Search input should be empty

### Verification:
- Open browser DevTools > Application > Session Storage
- Both keys should not exist after browser restart

---

## Test Case 9: Error Handling - sessionStorage Quota Exceeded

### Steps:
1. Open browser DevTools > Console
2. Fill sessionStorage with large data to exceed quota:
   ```javascript
   for (let i = 0; i < 1000; i++) {
     sessionStorage.setItem(`test_${i}`, 'x'.repeat(10000));
   }
   ```
3. Navigate to `/time-tracking` page
4. Try to select a task or enter a search query

### Expected Result:
- The application should not crash
- An error should be logged to console
- The UI should still function normally (even if persistence fails)

### Verification:
- Check console for error message: "Failed to save ... to sessionStorage"
- Application should remain functional

---

## Test Case 10: Error Handling - Corrupted sessionStorage Data

### Steps:
1. Navigate to `/time-tracking` page
2. Open browser DevTools > Console
3. Manually corrupt sessionStorage:
   ```javascript
   sessionStorage.setItem('rxdx_session_selected_task', '{invalid json}');
   ```
4. Refresh the page

### Expected Result:
- The application should not crash
- Invalid data should be ignored
- Default state should be used (no task selected)

### Verification:
- Check console for error message (if any)
- Application should load normally with default state

---

## Test Case 11: Keyboard Shortcut Integration

### Steps:
1. Navigate to `/time-tracking` page
2. Select a task using arrow keys (↓ or ↑)
3. Navigate away and return

### Expected Result:
- The task selected via keyboard should be persisted
- sessionStorage should contain the task ID

### Verification:
- Keyboard navigation should trigger the same persistence as mouse clicks

---

## Test Case 12: Active Tracking State (localStorage vs sessionStorage)

### Steps:
1. Navigate to `/time-tracking` page
2. Select a task and start tracking
3. Check both localStorage and sessionStorage

### Expected Result:
- Active tracking should be in localStorage (not sessionStorage)
- Selected task should be in sessionStorage
- These are separate concerns with different storage mechanisms

### Verification:
- localStorage should have: `rxdx_active_tracking`
- sessionStorage should have: `rxdx_session_selected_task`
- Active tracking persists across browser restarts
- Selected task does NOT persist across browser restarts

---

## Success Criteria

All test cases should pass with the following outcomes:
- ✅ Selected task ID persists in sessionStorage
- ✅ Search query persists in sessionStorage
- ✅ State is restored when returning to the page
- ✅ State is cleared when explicitly cleared by user
- ✅ sessionStorage is isolated per browser tab
- ✅ sessionStorage persists across page refreshes
- ✅ sessionStorage is cleared when browser is closed
- ✅ Error handling prevents crashes
- ✅ Corrupted data is handled gracefully
- ✅ Integration with keyboard shortcuts works correctly
- ✅ localStorage and sessionStorage are used appropriately

---

## Notes

- sessionStorage is used for temporary UI state (selected task, search query)
- localStorage is used for persistent state (active tracking)
- sessionStorage is automatically cleared when the browser tab/window is closed
- localStorage persists until explicitly cleared
- This design ensures users don't lose their active tracking session, but UI state is reset when they close the browser

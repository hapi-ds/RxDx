# End-to-End Test Scenarios

## Task 20.2: End-to-End Testing

This document describes end-to-end test scenarios for the graph and table UI enhancements. These tests should be performed manually or with an E2E testing framework like Playwright or Cypress.

### Test Environment Setup

1. Start the backend server: `cd backend && uvx uvicorn app.main:app --reload`
2. Start the frontend dev server: `cd frontend && npm run dev`
3. Ensure test database is populated with sample data
4. Clear browser session storage and cookies before each test

---

## Scenario 1: Filter → Bulk Edit → Verify Flow

**Objective**: Test the complete workflow of filtering work items, selecting multiple items, performing bulk edit, and verifying the changes.

### Prerequisites
- User is logged in
- At least 10 work items exist with mixed types (requirement, task, test, risk, document)
- At least 5 items have status "draft"

### Test Steps

1. **Navigate to Table Page**
   - Click on "Table" in the navigation menu
   - Verify: Table page loads successfully
   - Verify: All work items are displayed (no filter applied)

2. **Apply Filter**
   - Click on the "Filter" button/dropdown
   - Uncheck all types except "task" and "test"
   - Click "Apply" or close the filter dropdown
   - Verify: Only tasks and tests are displayed
   - Verify: Requirements, risks, and documents are hidden
   - Verify: Item count reflects filtered results

3. **Enter Bulk Edit Mode**
   - Click "Bulk Edit" button
   - Verify: Checkboxes appear next to each item
   - Verify: "Select All" checkbox appears in table header

4. **Select Items**
   - Click "Select All" checkbox
   - Verify: All visible items are selected
   - Verify: Selection count is displayed (e.g., "5 items selected")
   - Uncheck 2 items
   - Verify: Selection count updates (e.g., "3 items selected")

5. **Open Bulk Edit Modal**
   - Click "Bulk Edit" or "Edit Selected" button
   - Verify: Bulk edit modal opens
   - Verify: Modal shows count of selected items
   - Verify: Form fields are displayed (status, priority, assigned_to)

6. **Fill Bulk Edit Form**
   - Check "Update Status" checkbox
   - Select "active" from status dropdown
   - Check "Update Priority" checkbox
   - Enter "2" in priority field
   - Leave "assigned_to" unchecked
   - Verify: Only checked fields are enabled

7. **Submit Bulk Edit**
   - Click "Save" or "Apply Changes" button
   - Verify: Loading indicator appears
   - Verify: Modal shows progress (if applicable)
   - Wait for completion

8. **Verify Changes**
   - Verify: Success message appears (e.g., "Successfully updated 3 items")
   - Verify: Modal closes automatically or has close button
   - Verify: Table refreshes with updated data
   - Verify: Selected items now show status "active"
   - Verify: Selected items now show priority "2"
   - Verify: Unselected items remain unchanged

9. **Verify Persistence**
   - Refresh the page (F5)
   - Verify: Changes persist after page reload
   - Verify: Filter state is restored (still showing only tasks and tests)

### Expected Results
- ✅ Filter correctly limits visible items
- ✅ Bulk selection works correctly
- ✅ Bulk edit updates only selected items
- ✅ Changes persist in database
- ✅ UI updates reflect changes immediately
- ✅ No errors in console

### Error Cases to Test
- Try to submit bulk edit with no fields checked → Should show validation error
- Try to submit with invalid priority value → Should show validation error
- Simulate network error during bulk update → Should show error message and allow retry

---

## Scenario 2: Table → Graph → Edit → Return Flow

**Objective**: Test navigation between Table and Graph views, editing a node in the graph, and returning to verify changes.

### Prerequisites
- User is logged in
- At least 5 work items exist with relationships
- Graph visualization is working

### Test Steps

1. **Start on Table Page**
   - Navigate to Table page
   - Apply filter to show only "requirement" type
   - Note the title and status of the first requirement (e.g., "User Authentication", status: "draft")
   - Verify: Only requirements are displayed

2. **Navigate to Graph Explorer**
   - Click "Graph" in the navigation menu
   - Verify: Graph Explorer page loads
   - Verify: Graph visualization renders
   - Verify: Nodes and edges are visible

3. **Apply Filter in Graph**
   - Open node type filter
   - Select "WorkItem" type
   - Within WorkItem, select only "requirement" and "task"
   - Apply filter
   - Verify: Only requirement and task nodes are visible
   - Verify: Other node types are hidden
   - Verify: Edges connected to hidden nodes are also hidden

4. **Search for Node**
   - Enter "User Authentication" in search box
   - Verify: Search results appear
   - Click on the search result
   - Verify: Graph centers on the selected node
   - Verify: Node is highlighted

5. **Edit Node**
   - With node selected, verify Node Editor panel opens
   - Change status from "draft" to "active"
   - Change priority from "1" to "3"
   - Add or modify description
   - Click "Save" button
   - Verify: Loading indicator appears on save button
   - Verify: Success message appears
   - Verify: Node remains selected after save

6. **Verify in Graph**
   - Verify: Node display updates with new status
   - Verify: No errors in console
   - Verify: Graph remains interactive

7. **Return to Table Page**
   - Click "Table" in navigation menu
   - Verify: Table page loads
   - Verify: Filter state is restored (showing only requirements)

8. **Verify Changes in Table**
   - Find the "User Authentication" item in the table
   - Verify: Status shows "active" (updated value)
   - Verify: Priority shows "3" (updated value)
   - Verify: Description matches what was entered

9. **Test Filter Persistence**
   - Navigate back to Graph
   - Verify: Graph filter is restored (showing requirements and tasks)
   - Navigate back to Table
   - Verify: Table filter is restored (showing only requirements)

### Expected Results
- ✅ Navigation between pages works smoothly
- ✅ Filter states are independent for Table and Graph
- ✅ Node edits in Graph are reflected in Table
- ✅ Changes persist across navigation
- ✅ Search functionality works correctly
- ✅ Node selection and highlighting work
- ✅ No data loss during navigation

### Error Cases to Test
- Try to save node with empty title → Should show validation error
- Navigate away while edit is in progress → Should prompt to save or discard
- Edit node that was deleted by another user → Should show appropriate error

---

## Scenario 3: Logout → Login → Filter Restore Flow

**Objective**: Test that filter state is cleared on logout and does not persist after login.

### Prerequisites
- User is logged in
- Test user credentials are available

### Test Steps

1. **Set Up Filter State**
   - Navigate to Table page
   - Apply filter: Select only "task" and "test" types
   - Verify: Filter is applied and only tasks/tests are visible
   - Navigate to Graph Explorer
   - Apply filter: Select "WorkItem", "Project", and "Phase" types
   - Verify: Filter is applied in graph

2. **Verify Session Storage**
   - Open browser DevTools → Application/Storage → Session Storage
   - Find key "rxdx_node_filters"
   - Verify: Value contains filter state for both table and graph
   - Note the filter values

3. **Logout**
   - Click "Logout" button in navigation or user menu
   - Verify: Logout confirmation (if applicable)
   - Confirm logout
   - Verify: Redirected to login page
   - Verify: User is logged out

4. **Verify Session Storage Cleared**
   - Open browser DevTools → Application/Storage → Session Storage
   - Verify: "rxdx_node_filters" key is removed
   - Verify: Session storage is empty or only contains non-sensitive data

5. **Login Again**
   - Enter username and password
   - Click "Login" button
   - Verify: Successfully logged in
   - Verify: Redirected to home page or last visited page

6. **Check Table Page Filter**
   - Navigate to Table page
   - Verify: All work item types are displayed (default state)
   - Verify: No filter is applied
   - Verify: Filter dropdown shows all types selected

7. **Check Graph Page Filter**
   - Navigate to Graph Explorer
   - Verify: All node types are displayed (default state)
   - Verify: No filter is applied
   - Verify: Filter dropdown shows all types selected

8. **Verify Fresh Session**
   - Open browser DevTools → Application/Storage → Session Storage
   - Verify: "rxdx_node_filters" key does not exist yet
   - Apply a new filter
   - Verify: New filter state is saved to session storage

### Expected Results
- ✅ Filter state is cleared on logout
- ✅ Session storage is cleared on logout
- ✅ After login, filters reset to default (all types)
- ✅ New session starts with clean state
- ✅ No data leakage between sessions
- ✅ User can set new filters after login

### Security Considerations
- Verify no sensitive data remains in session storage after logout
- Verify no authentication tokens remain after logout
- Verify user cannot access protected pages after logout

---

## Additional Test Scenarios

### Scenario 4: Relationship Creation and Editing

1. Navigate to Graph Explorer
2. Click "Connection Mode" button
3. Click on source node (e.g., a task)
4. Click on target node (e.g., a requirement)
5. Select relationship type (e.g., "IMPLEMENTS")
6. Verify: New edge appears in graph
7. Click on the new edge
8. Verify: Relationship Editor opens
9. Change relationship type to "DEPENDS_ON"
10. Click "Save"
11. Verify: Edge updates with new type
12. Click "Delete" button
13. Confirm deletion
14. Verify: Edge is removed from graph

### Scenario 5: Performance with Large Datasets

1. Load page with 1000+ work items
2. Measure page load time (should be < 3 seconds)
3. Apply filter
4. Measure filter application time (should be < 500ms)
5. Perform bulk edit on 100 items
6. Measure bulk update time
7. Verify: UI remains responsive throughout
8. Verify: No memory leaks (check DevTools Memory tab)

### Scenario 6: Error Recovery

1. Disconnect network (DevTools → Network → Offline)
2. Try to load Table page
3. Verify: Error message appears
4. Verify: Retry button is available
5. Reconnect network
6. Click retry
7. Verify: Page loads successfully
8. Repeat for bulk edit, node save, relationship operations

### Scenario 7: Concurrent Edits

1. Open application in two browser tabs
2. In Tab 1: Edit a work item, change status to "active"
3. In Tab 2: Edit the same work item, change priority to "2"
4. Save in Tab 1
5. Save in Tab 2
6. Verify: Conflict detection or last-write-wins behavior
7. Refresh both tabs
8. Verify: Final state is consistent

---

## Test Execution Checklist

For each scenario, verify:

- [ ] All steps complete successfully
- [ ] No JavaScript errors in console
- [ ] No network errors (except in error scenarios)
- [ ] UI updates reflect data changes
- [ ] Loading states are shown appropriately
- [ ] Success/error messages are clear and helpful
- [ ] Navigation works correctly
- [ ] Browser back/forward buttons work
- [ ] Page refresh preserves appropriate state
- [ ] Accessibility: keyboard navigation works
- [ ] Accessibility: screen reader announces changes
- [ ] Performance: operations complete within time limits

## Test Data Requirements

- Minimum 20 work items with varied types
- At least 10 relationships between items
- Multiple users for testing assignments
- Mix of statuses: draft, active, completed, archived
- Mix of priorities: 1-5
- Some items with long titles/descriptions
- Some items with special characters in titles

## Browser Testing

Each scenario should be tested in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest) - if on macOS
- Edge (latest)

## Mobile Testing

Key scenarios should be tested on:
- Mobile Chrome (Android)
- Mobile Safari (iOS)
- Tablet devices

## Automation Recommendations

These scenarios can be automated using:
- **Playwright**: Recommended for cross-browser E2E testing
- **Cypress**: Alternative for E2E testing with great developer experience
- **Selenium**: For compatibility with existing test infrastructure

Example Playwright test structure:
```typescript
test('Filter → Bulk Edit → Verify Flow', async ({ page }) => {
  await page.goto('/table');
  await page.click('[data-testid="filter-button"]');
  await page.click('[data-testid="filter-task"]');
  await page.click('[data-testid="bulk-edit-button"]');
  // ... rest of test
});
```

## Reporting

For each test run, document:
- Date and time of test
- Browser and version
- Test environment (dev/staging/production)
- Pass/fail status for each scenario
- Screenshots of failures
- Console errors (if any)
- Performance metrics
- Any deviations from expected behavior

## Success Criteria

All scenarios must:
- Complete without errors
- Meet performance requirements
- Provide good user experience
- Handle errors gracefully
- Maintain data integrity
- Work across supported browsers

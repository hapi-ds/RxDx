# Implementation Plan: Frontend Navigation and Versioning

## Overview

This implementation plan breaks down the frontend navigation and versioning enhancements into discrete, incremental coding tasks. Each task builds on previous work and focuses on connecting existing components, adding new routes, and improving the version control UX. All changes are frontend-only using React, TypeScript, and React Router.

## Tasks

- [x] 1. Create NavigationHeader component and update AppLayout
  - [x] 1.1 Create NavigationHeader component with all navigation links
    - Create `frontend/src/components/common/NavigationHeader.tsx`
    - Implement navItems array with paths: /requirements, /graph, /tests, /risks, /schedule, /kanban, /documents
    - Use `useLocation` hook to determine active route
    - Apply active state styling to current route link
    - Include user info display and logout button
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 1.2 Write unit tests for NavigationHeader
    - Test all navigation links are rendered
    - Test active state is applied correctly for each route
    - Test logout button triggers logout callback
    - _Requirements: 1.1, 1.3_
  
  - [x] 1.3 Update AppLayout to use NavigationHeader component
    - Replace inline header in `frontend/src/App.tsx` with NavigationHeader
    - Ensure header is only shown when authenticated
    - Export NavigationHeader from common/index.ts
    - _Requirements: 1.5, 1.6_

- [ ] 2. Create PlaceholderPage component and placeholder pages
  - [ ] 2.1 Create reusable PlaceholderPage component
    - Create `frontend/src/components/common/PlaceholderPage.tsx`
    - Accept props: title, description, icon
    - Display "Coming Soon" message
    - Include link back to Requirements page
    - Use consistent styling with application
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 2.2 Write property test for PlaceholderPage content rendering
    - **Property 7: Placeholder Page Content Rendering**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  
  - [ ] 2.3 Create placeholder page instances for Tests, Risks, Schedule, Kanban, Documents
    - Create `frontend/src/pages/TestsPage.tsx` using PlaceholderPage
    - Create `frontend/src/pages/RisksPage.tsx` using PlaceholderPage
    - Create `frontend/src/pages/SchedulePage.tsx` using PlaceholderPage
    - Create `frontend/src/pages/KanbanPage.tsx` using PlaceholderPage
    - Create `frontend/src/pages/DocumentsPage.tsx` using PlaceholderPage
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 3. Update App.tsx routing configuration
  - [ ] 3.1 Add routes for all pages including GraphExplorer
    - Add route for /graph pointing to existing GraphExplorer component
    - Add routes for /tests, /risks, /schedule, /kanban, /documents
    - Wrap all new routes with ProtectedRoute
    - Update catch-all route to redirect appropriately
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_
  
  - [ ] 3.2 Write property tests for route protection
    - **Property 5: Unknown Route Redirect**
    - **Property 6: Route Protection**
    - **Validates: Requirements 2.8, 2.9**

- [ ] 4. Checkpoint - Navigation and routing complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify navigation works between all pages
  - Verify GraphExplorer page loads correctly

- [ ] 5. Create version display components
  - [ ] 5.1 Create VersionIndicator component
    - Create `frontend/src/components/workitems/VersionIndicator.tsx`
    - Display version number in badge/pill style
    - Accept version string and optional className props
    - Use consistent styling with existing badges
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ] 5.2 Create VersionPreview component
    - Create `frontend/src/components/workitems/VersionPreview.tsx`
    - Calculate and display next version number
    - Show informational message about version creation
    - Handle both new items (v1.0) and edits (increment minor)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ] 5.3 Create version utility functions
    - Create `frontend/src/utils/versionUtils.ts`
    - Implement calculateNextVersion function
    - Implement parseVersion function
    - Export utility functions
    - _Requirements: 7.3_
  
  - [ ] 5.4 Write property test for version calculation
    - **Property 11: Next Version Calculation**
    - **Validates: Requirements 7.3**

- [ ] 6. Update WorkItemForm with version UX improvements
  - [ ] 6.1 Update WorkItemForm button text logic
    - Change button text from "Update Work Item" to "Save Changes" when editing
    - Keep "Create Work Item" for new items
    - Ensure consistency across all WorkItem types
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 6.2 Add VersionIndicator to WorkItemForm
    - Display VersionIndicator when editing existing item
    - Position near form title/header area
    - Hide when creating new item
    - _Requirements: 6.1, 6.4_
  
  - [ ] 6.3 Add VersionPreview to WorkItemForm
    - Display VersionPreview near submit button
    - Show next version for edits, v1.0 for new items
    - Use informational styling
    - _Requirements: 7.1, 7.2, 7.3, 7.6_
  
  - [ ] 6.4 Write property tests for WorkItemForm version display
    - **Property 8: Button Text Based on Edit Mode**
    - **Property 9: Version Indicator on Edit**
    - **Property 10: Version Preview on Edit**
    - **Validates: Requirements 5.2, 5.4, 6.1, 7.1**

- [ ] 7. Enhance WorkItemDetail version display
  - [ ] 7.1 Enhance version badge visibility in WorkItemDetail
    - Make version badge more prominent in header
    - Add version count indicator (e.g., "v1.2 (5 versions)")
    - Position near title for visibility
    - _Requirements: 8.1, 8.2, 9.1_
  
  - [ ] 7.2 Improve View History button prominence
    - Make "View History" button more visible in actions
    - Show only when version history is available
    - Add version count to button text
    - _Requirements: 8.3, 9.3_
  
  - [ ] 7.3 Write property tests for WorkItemDetail version display
    - **Property 12: Version Badge Display**
    - **Property 13: View History Visibility**
    - **Property 14: Version Count Display**
    - **Validates: Requirements 8.1, 8.3, 9.1, 9.3**

- [ ] 8. Enhance VersionHistory component
  - [ ] 8.1 Add current version highlighting in VersionHistory
    - Highlight the current/selected version in timeline
    - Use distinct visual style for current version
    - Ensure highlighting updates when selection changes
    - _Requirements: 9.4_
  
  - [ ] 8.2 Ensure change descriptions are displayed
    - Verify change_description is rendered when available
    - Style change descriptions appropriately
    - Handle missing change descriptions gracefully
    - _Requirements: 9.5_
  
  - [ ] 8.3 Write property tests for VersionHistory
    - **Property 16: Current Version Highlighting**
    - **Property 17: Change Description Display**
    - **Validates: Requirements 9.4, 9.5**

- [ ] 9. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify navigation works correctly
  - Verify version UX improvements are visible
  - Test edit flow shows version preview
  - Test version history displays correctly

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All changes are frontend-only - backend APIs already exist

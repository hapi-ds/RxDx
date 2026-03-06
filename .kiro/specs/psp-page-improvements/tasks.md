# Implementation Plan: PSP Page Improvements

## Overview

This implementation plan addresses critical fixes and enhancements to the Project Structure Plan (PSP) Matrix page. The focus is on fixing the existing 500 error in PSPService, creating a comprehensive Medical Device Development template, and enhancing the matrix visualization with filtering, export, and interactive features.

**Key Context**:
- Database: PostgreSQL 14+ with Apache AGE extension (NOT Neo4j)
- Existing Services: PhaseService, DepartmentService, WorkpackageService, PSPService all exist
- Main Issue: PSPService.get_matrix_data() has 500 error due to null handling
- Approach: Fix and enhance existing code, don't rebuild from scratch

## Tasks

- [x] 1. Fix PSPService null handling and enhance backend infrastructure
  - [x] 1.1 Fix PSPService.get_matrix_data() null handling (CRITICAL)
    - Fix the 500 error by adding null filtering for OPTIONAL MATCH results
    - Filter out entries where id is None from phases, departments, and workpackages
    - Ensure null foreign keys (phase_id, department_id) are explicitly set to None
    - Add comprehensive logging for empty data scenarios
    - Test with empty database and partial data scenarios
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 1.2 Enhance Cypher query with proper NEXT traversal
    - Update the matrix query to find root phases (no incoming NEXT)
    - Add OPTIONAL MATCH for NEXT relationship traversal
    - Compute path_length for phase ordering
    - Order phases by root_created and path_length
    - Ensure query works via ag_catalog.cypher() function (PostgreSQL + AGE)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.3 Create Pydantic schemas for PSP entities
    - Create backend/app/schemas/psp.py with PhaseBase, PhaseResponse
    - Add DepartmentBase, DepartmentResponse schemas
    - Add WorkpackageBase, WorkpackageCreate, WorkpackageUpdate, WorkpackageResponse
    - Add PSPMatrixResponse schema (phases, departments, workpackages)
    - Add PSPStatistics schema with counts and coverage metrics
    - Add field validators for status enum and numeric constraints
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 1.4 Create PSP API endpoints
    - Create backend/app/api/v1/psp.py router
    - Add GET /api/v1/psp/matrix endpoint (returns PSPMatrixResponse)
    - Add GET /api/v1/psp/phases endpoint (returns ordered phases)
    - Add GET /api/v1/psp/departments endpoint (returns departments)
    - Add GET /api/v1/psp/workpackages endpoint with filters
    - Add GET /api/v1/psp/statistics endpoint
    - Add POST /api/v1/psp/workpackages endpoint
    - Add PATCH /api/v1/psp/workpackages/{id} endpoint
    - Add DELETE /api/v1/psp/workpackages/{id} endpoint
    - Register router in main.py
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10_

  - [x] 1.5 Implement PSPService.get_statistics() method
    - Count total phases, departments, workpackages
    - Count workpackages by status (draft, active, completed, archived)
    - Calculate coverage percentage (cells with workpackages / total cells)
    - Calculate average workpackages per cell
    - Return PSPStatistics schema
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 1.6 Add comprehensive error handling and logging
    - Add try-catch blocks for database errors in PSPService
    - Log query execution time for performance monitoring
    - Log warnings for empty data scenarios
    - Return appropriate HTTP status codes (400, 404, 500)
    - Include error context in log messages
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 1.7 Write unit tests for PSPService
    - Test get_matrix_data() with empty database
    - Test get_matrix_data() with null filtering
    - Test get_ordered_phases() with NEXT relationships
    - Test get_statistics() computation
    - Test create_workpackage() validation
    - Test error handling paths
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.8 Write integration tests for PSP API endpoints
    - Test GET /api/v1/psp/matrix with data
    - Test GET /api/v1/psp/matrix with empty database
    - Test POST /api/v1/psp/workpackages with valid data
    - Test POST /api/v1/psp/workpackages with invalid phase_id
    - Test PATCH /api/v1/psp/workpackages/{id}
    - Test DELETE /api/v1/psp/workpackages/{id}
    - _Requirements: 17.1, 17.6, 17.7, 17.8_

- [x] 2. Checkpoint - Verify backend fixes
  - Ensure all tests pass, verify 500 error is fixed, ask the user if questions arise.

- [-] 3. Remove redundant foreign key properties from graph database
  - [x] 3.1 Update Pydantic schemas to remove phase_id and department_id properties
    - Remove phase_id and department_id from WorkpackageBase in backend/app/schemas/psp.py
    - Remove phase_id from WorkpackageBase in backend/app/schemas/workpackage.py
    - Keep phase_id and department_id ONLY in WorkpackageCreate (for API input)
    - Remove phase_id and department_id from WorkpackageResponse (use relationships)
    - Update field validators to not reference these properties
    - _Requirements: 11.3, 11.4, 11.10, 11.11_

  - [x] 3.2 Rewrite PSPService to use relationship traversal instead of N+1 queries
    - Replace get_matrix_data() implementation with single efficient Cypher query
    - Use MATCH patterns to traverse BELONGS_TO and LINKED_TO_DEPARTMENT relationships
    - Remove all references to phase_id and department_id properties in queries
    - Return phase_id and department_id in response by traversing relationships
    - Ensure query handles null relationships gracefully
    - _Requirements: 11.10, 11.11, 1.5, 3.1_

  - [x] 3.3 Update WorkpackageService to not store phase_id property on nodes
    - Remove phase_id from properties dict in create_workpackage()
    - Remove phase_id from update_props in update_workpackage()
    - Keep relationship creation/update logic (BELONGS_TO, LINKED_TO_DEPARTMENT)
    - Update get_workpackage() to traverse relationships for phase_id and department_id
    - Update list_workpackages_by_phase() to use relationship traversal
    - _Requirements: 11.4, 11.10_

  - [x] 3.4 Update template validator to not require phase_id property
    - Remove phase_id validation from workpackage schema in backend/app/schemas/template.py
    - Validate that BELONGS_TO relationships exist instead
    - Validate that LINKED_TO_DEPARTMENT relationships exist instead
    - _Requirements: 12.1, 12.2_

  - [x] 3.5 Update API endpoints to filter by relationships
    - Update GET /api/v1/psp/workpackages to use relationship-based filtering
    - Update Cypher queries to use MATCH patterns instead of property filters
    - Remove phase_id and department_id from query parameters (use relationship traversal)
    - _Requirements: 11.11, 17.4_

  - [x] 3.6 Update progress utilities to traverse relationships
    - Update backend/app/utils/progress_utils.py to use relationship traversal
    - Remove any phase_id or department_id property references
    - Use MATCH patterns to find related phases and departments
    - _Requirements: 11.10, 11.11_

  - [x] 3.7 Search for and fix other foreign key anti-patterns
    - Search codebase for company_id, project_id, user_id properties on nodes
    - Identify which should be relationships instead of properties
    - Create tasks to fix similar anti-patterns in other services
    - Document relationship-only approach in coding standards
    - _Requirements: 11.4, 11.10, 11.11_

  - [x] 3.8 Update spec documents to mandate relationship-only approach
    - Update requirements.md to explicitly forbid foreign key properties
    - Update design.md to show relationship traversal patterns
    - Add examples of correct vs incorrect graph database usage
    - _Requirements: 11.4, 11.10, 11.11_

  - [ ]* 3.9 Run full test suite and fix broken tests
    - Run backend tests: uvx pytest
    - Fix tests that expect phase_id/department_id properties
    - Update test fixtures to use relationship traversal
    - Verify all PSP-related tests pass
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10_

- [ ] 4. Checkpoint - Verify relationship-only implementation
  - Ensure no foreign key properties remain on workpackage nodes, verify all queries use relationship traversal, ask the user if questions arise.

- [ ] 5. Create comprehensive Medical Device Development PSP template
  - [x] 3.1 Create psp-comprehensive.yaml template structure
    - Create backend/templates/modular/psp-comprehensive.yaml
    - Add metadata section (name, version, description, author)
    - Define 8 phases in chronological order (POC → Post-Market)
    - Define 12 departments (R&D, Systems Eng, Software, Hardware, QA, Regulatory, Clinical, Manufacturing, Supply Chain, Risk Mgmt, Documentation, Project Mgmt)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Add phase definitions with realistic Medical Device lifecycle
    - Phase 0: Proof of Concept (POC) - status: completed
    - Phase 1: Project Definition - status: completed
    - Phase 2: Concept Phase - status: active
    - Phase 3: Design & Development - status: active
    - Phase 4: Design Transfer - status: draft
    - Phase 5: Validation - status: draft
    - Phase 6: Market Release - status: draft
    - Phase 7: Post-Market - status: draft
    - Include descriptions referencing ISO 13485, ISO 14971, IEC 62304, IEC 60601
    - _Requirements: 2.2, 2.13_

  - [x] 3.3 Add department definitions with descriptions
    - Research & Development (R&D) - Innovation and technology development
    - Systems Engineering - Requirements management and system architecture
    - Software Engineering - Software design, implementation, and testing
    - Hardware Engineering - Electronics, mechanics, and hardware integration
    - Quality Assurance (QA) - Testing, verification, and quality control
    - Regulatory Affairs - Compliance, submissions, and regulatory strategy
    - Clinical Affairs - Clinical evaluation, trials, and medical expertise
    - Manufacturing - Production planning, process development, and scale-up
    - Supply Chain - Procurement, vendor management, and logistics
    - Risk Management - Risk analysis, mitigation, and safety assessment
    - Documentation - Technical writing, document control, and records management
    - Project Management - Planning, coordination, and stakeholder management
    - _Requirements: 2.3_

  - [x] 3.4 Create 60+ workpackages distributed across phase-department intersections
    - POC Phase: 6 workpackages (Feasibility Study, Technology Assessment, Prototype Development, Initial Risk Assessment, Market Research, Regulatory Strategy Planning)
    - Project Definition: 6 workpackages (Business Case, Project Charter, Resource Planning, Quality Management Plan, Risk Management Plan, Documentation Plan)
    - Concept Phase: 8 workpackages (User Needs Analysis, Design Input Specification, System Architecture, Software Requirements, Hardware Requirements, Preliminary Hazard Analysis, Regulatory Requirements, Supplier Identification)
    - Design & Development: 12 workpackages (Software Architecture, Software Detailed Design, Software Implementation, Software Unit Testing, Hardware Detailed Design, Mechanical Design, Risk Analysis ISO 14971, Design Verification Testing, Electrical Safety Testing, EMC Testing, Usability Engineering, DHF Compilation)
    - Design Transfer: 6 workpackages (Manufacturing Process Development, Process Validation IQ/OQ/PQ, Manufacturing Instructions, Supplier Qualification, Design Transfer Review, Device Master Record)
    - Validation: 6 workpackages (Clinical Evaluation Report, Design Validation Testing, Software Validation, Usability Validation, Risk Management Report, Design Review)
    - Market Release: 6 workpackages (510(k) Submission, CE Mark Technical File, Labeling and IFU, Manufacturing Scale-Up, Product Launch Plan, Training Materials)
    - Post-Market: 6 workpackages (Post-Market Surveillance Plan, Complaint Handling System, Vigilance Reporting, CAPA System, Periodic Safety Update Report, Product Lifecycle Management)
    - _Requirements: 2.4, 2.8, 2.10, 2.11, 2.12_

  - [x] 3.5 Add realistic workpackage properties
    - Include realistic names referencing Medical Device standards
    - Add descriptions mentioning ISO 13485, ISO 14971, IEC 62304, IEC 60601, FDA 21 CFR Part 820, FDA 21 CFR Part 11
    - Set varied statuses (completed for POC/Project Def, active for Concept/Design Dev, draft for later phases)
    - Add estimated_hours reflecting realistic effort distribution
    - Add actual_hours for completed workpackages
    - Set order field for workpackages within same phase-department cell
    - _Requirements: 2.8, 2.9, 2.13, 2.15_

  - [x] 3.6 Define NEXT relationships for phase ordering
    - Create NEXT relationship from POC → Project Definition
    - Create NEXT relationship from Project Definition → Concept Phase
    - Create NEXT relationship from Concept Phase → Design & Development
    - Create NEXT relationship from Design & Development → Design Transfer
    - Create NEXT relationship from Design Transfer → Validation
    - Create NEXT relationship from Validation → Market Release
    - Create NEXT relationship from Market Release → Post-Market
    - _Requirements: 2.5_

  - [x] 3.7 Define workpackage relationships
    - Add BELONGS_TO relationships linking each workpackage to its phase
    - Add LINKED_TO_DEPARTMENT relationships linking each workpackage to its department
    - Ensure every workpackage has both relationships
    - _Requirements: 2.6, 2.7_

  - [x] 3.8 Add template validation
    - Validate all phase_id references exist in phases section
    - Validate all department_id references exist in departments section
    - Validate NEXT relationships form a valid chain (no cycles)
    - Validate each phase has at most one outgoing NEXT relationship
    - Validate each phase has at most one incoming NEXT relationship
    - Validate minimum workpackage counts per phase (5+) and department (4+)
    - Validate coverage ≥65% of phase-department intersections
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 3.9 Write template loading tests
    - Test loading psp-comprehensive.yaml template
    - Verify all 8 phases are created with correct properties
    - Verify all 12 departments are created
    - Verify 60+ workpackages are created
    - Verify NEXT relationships are created correctly
    - Verify BELONGS_TO relationships are created
    - Verify LINKED_TO_DEPARTMENT relationships are created
    - Verify phase ordering is correct
    - Verify workpackages appear in correct matrix cells
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10_

- [ ] 6. Checkpoint - Verify template creation
  - Ensure template loads without errors, verify all relationships are correct, ask the user if questions arise.

- [ ] 7. Enhance frontend PSP store with filtering and CRUD operations
  - [ ] 5.1 Add filter state to PSPStore
    - Add searchQuery: string state
    - Add statusFilter: string | null state
    - Add phaseFilter: string | null state
    - Add departmentFilter: string | null state
    - Add statistics: PSPStatistics | null state
    - Add modal state (selectedWorkpackage, isWorkpackageModalOpen, isCreateModalOpen, createModalContext)
    - _Requirements: 7.1, 7.3, 7.5, 7.7_

  - [ ] 5.2 Add filter actions to PSPStore
    - Implement setSearchQuery(query: string)
    - Implement setStatusFilter(status: string | null)
    - Implement setPhaseFilter(phaseId: string | null)
    - Implement setDepartmentFilter(deptId: string | null)
    - Implement clearFilters() to reset all filters
    - _Requirements: 7.1, 7.3, 7.5, 7.7, 7.9_

  - [ ] 5.3 Add filter selectors to PSPStore
    - Implement getWorkpackagesForCell(deptId, phaseId) with filter application
    - Implement getFilteredWorkpackages() for export
    - Implement getFilteredPhases() for phase filter
    - Implement getFilteredDepartments() for department filter
    - Use memoization to avoid redundant calculations
    - _Requirements: 7.2, 7.4, 7.6, 7.8, 13.2_

  - [ ] 5.4 Add CRUD actions to PSPStore
    - Implement createWorkpackage(data: WorkpackageCreate)
    - Implement updateWorkpackage(id: string, updates: WorkpackageUpdate)
    - Implement deleteWorkpackage(id: string)
    - Update matrixGrid after CRUD operations
    - Handle API errors with user-friendly messages
    - _Requirements: 17.6, 17.7, 17.8, 4.5_

  - [ ] 5.5 Add modal state management
    - Implement openWorkpackageModal(workpackage: MatrixWorkpackage)
    - Implement closeWorkpackageModal()
    - Implement openCreateModal(phaseId: string, deptId: string)
    - Implement closeCreateModal()
    - _Requirements: 6.1, 6.5_

  - [ ] 5.6 Add statistics fetching
    - Implement fetchStatistics() action
    - Call GET /api/v1/psp/statistics endpoint
    - Store statistics in state
    - Handle errors gracefully
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ] 5.7 Enhance error handling in store
    - Extract user-friendly error messages from API errors
    - Provide retry options for network errors
    - Log errors with context using logger service
    - Clear error state on successful operations
    - _Requirements: 4.5, 4.6_

  - [ ]* 5.8 Write store tests
    - Test matrixGrid computation with various workpackage distributions
    - Test getWorkpackagesForCell with filters
    - Test filter selectors (getFilteredPhases, getFilteredDepartments, getFilteredWorkpackages)
    - Test CRUD operations update state correctly
    - Test error handling paths
    - _Requirements: 19.8, 19.9, 19.10_

- [ ] 6. Enhance PSPMatrixView component with filters and interactions
  - [ ] 6.1 Create MatrixHeader component
    - Add search input with debounced onChange handler
    - Add status filter dropdown (draft, active, completed, archived, all)
    - Add phase filter dropdown (populated from phases)
    - Add department filter dropdown (populated from departments)
    - Add "Clear Filters" button
    - Add "Export" button with dropdown (PNG, PDF, CSV)
    - Add "Help" button to open help modal
    - Style with consistent spacing and alignment
    - _Requirements: 7.1, 7.3, 7.5, 7.7, 7.9, 8.1, 16.3_

  - [ ] 6.2 Create StatisticsPanel component
    - Display total phases count with icon
    - Display total departments count with icon
    - Display total workpackages count with icon
    - Display workpackages by status breakdown (draft, active, completed, archived)
    - Display coverage percentage with visual indicator
    - Display average workpackages per cell
    - Use color coding and icons for visual clarity
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [ ] 6.3 Create LegendPanel component
    - Display status color legend (draft: gray, active: blue, completed: green, archived: orange)
    - Explain rows represent departments
    - Explain columns represent phases
    - Add compact, collapsible design
    - _Requirements: 16.1, 16.2_

  - [ ] 6.4 Enhance MatrixGrid component with filtering
    - Apply phase filter to show only selected phase columns
    - Apply department filter to show only selected department rows
    - Pass searchQuery and statusFilter to WorkpackageCard
    - Maintain fixed column widths for consistent layout
    - Maintain fixed row heights with scrollable cell content
    - Support horizontal scrolling for many phases
    - _Requirements: 5.1, 5.2, 5.10, 5.11, 5.12, 7.6, 7.8_

  - [ ] 6.5 Enhance WorkpackageCard component
    - Apply highlighting when card matches search query
    - Apply dimming when card doesn't match search query
    - Show workpackage name, status badge, and ID
    - Add hover effect with elevation
    - Make card clickable to open detail modal
    - Use status color coding (draft: gray, active: blue, completed: green, archived: orange)
    - _Requirements: 5.5, 5.6, 6.1, 6.2, 7.2_

  - [ ] 6.6 Create WorkpackageModal component
    - Display workpackage name in header
    - Display full description
    - Display status with color badge
    - Display phase name
    - Display department name
    - Display estimated hours and actual hours
    - Display created_at and updated_at timestamps
    - Add "Edit" button linking to workpackage edit page
    - Add "Close" button
    - Support keyboard navigation (Escape to close)
    - _Requirements: 6.1, 6.3, 6.4, 15.6_

  - [ ] 6.7 Create CreateWorkpackageModal component
    - Pre-populate phase_id and department_id (disabled fields)
    - Display phase name and department name for context
    - Add name input field with validation
    - Add description textarea
    - Add status select dropdown
    - Add estimated_hours input
    - Add "Create" button
    - Add "Cancel" button
    - Validate form before submission
    - Call createWorkpackage action on submit
    - Close modal on success
    - Display error message on failure
    - _Requirements: 6.5, 6.6_

  - [ ] 6.8 Add empty cell click handling
    - Detect clicks on empty cells (phase-department intersections with no workpackages)
    - Extract phaseId and departmentId from cell
    - Call openCreateModal with phase and department IDs
    - Show visual feedback on hover (border highlight)
    - _Requirements: 6.5, 6.6_

  - [ ] 6.9 Add tooltips for phases and departments
    - Show phase description on phase header hover
    - Show department description on department row header hover
    - Use debounced rendering for performance
    - _Requirements: 5.7, 5.8, 13.4_

  - [ ] 6.10 Enhance loading and empty states
    - Show centered loading spinner with "Loading PSP Matrix..." message on initial load
    - Show small loading indicator in header on refresh
    - Show empty state with guidance when no phases exist
    - Show empty state with guidance when no departments exist
    - Show empty matrix grid with message when no workpackages exist
    - Show error state with retry button on error
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 6.11 Write component tests
    - Test PSPMatrixView renders with valid data
    - Test PSPMatrixView renders empty state
    - Test PSPMatrixView renders loading state
    - Test PSPMatrixView renders error state with retry button
    - Test search filtering highlights matching workpackages
    - Test status filter shows only selected status
    - Test phase filter shows only selected phase
    - Test department filter shows only selected department
    - Test workpackage card click opens modal
    - Test empty cell click opens create modal
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

- [ ] 7. Checkpoint - Verify frontend enhancements
  - Ensure all components render correctly, filters work, modals open/close, ask the user if questions arise.

- [ ] 8. Implement export functionality
  - [ ] 8.1 Create PSPExporter utility class
    - Create frontend/src/utils/pspExport.ts
    - Add exportAsPNG method using html2canvas
    - Add exportAsPDF method using jsPDF
    - Add exportAsCSV method with proper escaping
    - Add generateFilename helper with timestamp support
    - Add downloadFile helper to trigger browser download
    - _Requirements: 8.1, 8.2, 8.6, 8.7_

  - [ ] 8.2 Implement PNG export
    - Capture matrix element using html2canvas with scale: 2
    - Convert canvas to blob
    - Generate filename with timestamp
    - Trigger browser download
    - Handle errors gracefully
    - _Requirements: 8.3_

  - [ ] 8.3 Implement PDF export
    - Capture matrix element using html2canvas
    - Create PDF with landscape orientation
    - Add image to PDF with proper dimensions
    - Generate filename with timestamp
    - Trigger browser download
    - _Requirements: 8.4_

  - [ ] 8.4 Implement CSV export
    - Create CSV headers (ID, Name, Description, Status, Phase, Department, Estimated Hours, Actual Hours, Created At, Updated At)
    - Map workpackages to CSV rows with phase and department names
    - Escape CSV values properly (quotes, commas, newlines)
    - Generate filename with timestamp
    - Create blob and trigger download
    - _Requirements: 8.5_

  - [ ] 8.5 Add export button to MatrixHeader
    - Add "Export" button with dropdown menu
    - Add PNG, PDF, CSV options
    - Call appropriate PSPExporter method on selection
    - Show loading indicator during export
    - Show success/error toast after export
    - _Requirements: 8.1, 8.2_

  - [ ]* 8.6 Write export tests
    - Test PNG export generates file
    - Test PDF export generates file
    - Test CSV export includes all workpackage data
    - Test filename includes timestamp
    - Test CSV escaping handles special characters
    - _Requirements: 8.3, 8.4, 8.5, 8.6_

- [ ] 9. Add responsive design and accessibility features
  - [ ] 9.1 Add responsive breakpoints
    - Desktop (>1200px): Show all columns without scrolling if ≤7 phases
    - Tablet (768px-1200px): Enable horizontal scrolling, reduce cell padding
    - Mobile (<768px): Switch to card-based layout, one phase at a time
    - _Requirements: 14.1, 14.2, 14.3_

  - [ ] 9.2 Implement mobile card-based layout
    - Show one phase at a time with navigation buttons
    - Display department names as section headers
    - Stack workpackage cards vertically
    - Add phase navigation (Previous/Next buttons)
    - _Requirements: 14.3, 14.4, 14.5_

  - [ ] 9.3 Add keyboard navigation
    - Support Tab key to navigate between interactive elements
    - Support Arrow keys to navigate matrix cells
    - Support Enter key to activate workpackage cards and empty cells
    - Support Escape key to close modals
    - Show visible focus indicators on all interactive elements
    - _Requirements: 15.3, 15.4, 15.5, 15.6_

  - [ ] 9.4 Add ARIA labels and semantic HTML
    - Use semantic table elements (table, thead, tbody, th, td)
    - Add ARIA labels for all interactive elements
    - Add ARIA live regions for dynamic content changes
    - Add alt text for visual indicators
    - Support screen reader navigation of table structure
    - _Requirements: 15.1, 15.2, 15.8, 15.9, 15.10_

  - [ ] 9.5 Ensure WCAG AA color contrast
    - Verify all text has 4.5:1 contrast ratio against background
    - Adjust status badge colors if needed
    - Test with color contrast analyzer
    - _Requirements: 15.7_

  - [ ] 9.6 Ensure touch targets are adequate
    - Make all touch targets at least 44x44 pixels on mobile
    - Add adequate spacing between interactive elements
    - Test on mobile devices
    - _Requirements: 14.7_

  - [ ]* 9.7 Write accessibility tests
    - Test keyboard navigation works for all interactive elements
    - Test screen reader announces dynamic content changes
    - Test focus indicators are visible
    - Test ARIA labels are present
    - Test color contrast meets WCAG AA
    - _Requirements: 15.3, 15.4, 15.7, 15.9_

- [ ] 10. Add help modal and legend
  - [ ] 10.1 Create HelpModal component
    - Add "What is PSP?" section explaining the matrix concept
    - Add "How to Read" section explaining rows (departments) and columns (phases)
    - Add "How to Interact" section explaining cell clicks and card clicks
    - Add "Filters" section explaining search and filter options
    - Add "Export" section explaining export formats
    - Include visual examples with screenshots or diagrams
    - Add "Don't show again" checkbox with localStorage persistence
    - _Requirements: 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

  - [ ] 10.2 Add help button to MatrixHeader
    - Add help icon button in header
    - Open HelpModal on click
    - Check localStorage for "don't show again" preference
    - _Requirements: 16.3, 16.4_

  - [ ] 10.3 Enhance LegendPanel with explanations
    - Add status color legend with descriptions
    - Add explanation of matrix structure (rows = departments, columns = phases)
    - Make legend collapsible to save space
    - _Requirements: 16.1, 16.2_

- [ ] 11. Add performance optimizations
  - [ ] 11.1 Add virtualization for large matrices
    - Use react-window or react-virtualized for cell rendering
    - Render only visible cells in viewport
    - Maintain smooth 60fps scrolling
    - Test with 100+ workpackages
    - _Requirements: 13.1, 13.7_

  - [ ] 11.2 Add memoization to components
    - Use React.memo for WorkpackageCard to prevent unnecessary re-renders
    - Use useMemo for expensive computations (matrixGrid, filtered data)
    - Use useCallback for event handlers
    - _Requirements: 13.2, 13.3_

  - [ ] 11.3 Add data caching to store
    - Cache matrix data for 5 minutes
    - Check cache before fetching
    - Add force parameter to bypass cache
    - Store lastFetched timestamp
    - _Requirements: 13.5, 13.6_

  - [ ] 11.4 Debounce search and tooltip rendering
    - Debounce search input onChange handler (300ms)
    - Debounce tooltip rendering on hover (200ms)
    - _Requirements: 13.4_

- [ ] 12. Final checkpoint - Integration testing
  - Ensure all tests pass, verify end-to-end flows work, ask the user if questions arise.

- [ ] 13. Documentation
  - [ ] 13.1 Create PSP user guide
    - Create docs/psp-user-guide.md
    - Explain purpose and benefits of PSP Matrix
    - Include screenshots of matrix visualization
    - Explain how to create phases, departments, and workpackages
    - Explain how to use filters and search
    - Explain how to export the matrix
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

  - [ ] 13.2 Create PSP developer guide
    - Create docs/psp-developer-guide.md
    - Explain data model and relationships (Phase, Department, Workpackage, NEXT, BELONGS_TO, LINKED_TO_DEPARTMENT)
    - Explain backend service architecture (PSPService, PhaseService, DepartmentService, WorkpackageService)
    - Explain frontend store and component structure
    - Include examples of creating custom PSP templates
    - Document API endpoints with request/response examples
    - _Requirements: 20.7, 20.8, 20.9, 20.10, 20.11, 20.12_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Focus on fixing existing PSPService, not rebuilding from scratch
- Database is PostgreSQL + Apache AGE, NOT Neo4j
- Existing services (PhaseService, DepartmentService, WorkpackageService) are fully implemented
- Template should demonstrate realistic Medical Device Development lifecycle
- Export functionality enhances usability for stakeholders
- Accessibility and responsive design ensure broad usability

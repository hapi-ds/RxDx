# Requirements Document

## Introduction

This document defines requirements for improving the Project Structure Plan (PSP) Matrix page in the RxDx project management system. The PSP Matrix is a critical visualization tool that displays the intersection of project phases (columns) and organizational departments (rows), with workpackages populating the cells. The current implementation has a 500 error and lacks comprehensive demonstration data. This feature will fix the error, create a comprehensive template, and enhance the visualization.

## Glossary

- **PSP**: Project Structure Plan - A matrix-based project planning tool
- **Phase**: A chronological stage in the project lifecycle (e.g., Planning, Design, Development)
- **Department**: An organizational unit responsible for specific work (e.g., Engineering, QA, Regulatory)
- **Workpackage**: A discrete unit of work assigned to a specific phase and department
- **Matrix_View**: The grid visualization showing phases as columns and departments as rows
- **NEXT_Relationship**: A graph database relationship linking phases in chronological order
- **BELONGS_TO_Relationship**: A graph database relationship linking a workpackage to a phase
- **LINKED_TO_DEPARTMENT_Relationship**: A graph database relationship linking a workpackage to a department
- **Backend_Service**: The PSPService class that queries and transforms data
- **Frontend_Store**: The Zustand store managing PSP state
- **Template_System**: The YAML-based system for loading demonstration data
- **Cypher_Query**: Graph database query language (executed via PostgreSQL + Apache AGE)
- **Relationship-Only_Approach**: Graph database design principle where associations are stored ONLY as relationships, NOT as foreign key properties on nodes (exception: user_id is allowed because users are not part of the AGE graph database)

## Requirements

### Requirement 1: Fix 500 Error in PSP Matrix Endpoint

**User Story:** As a project manager, I want the PSP Matrix page to load without errors, so that I can view the project structure.

#### Acceptance Criteria

1. WHEN THE Backend_Service executes the Cypher_Query, THE Backend_Service SHALL handle cases where no phases exist
2. WHEN THE Backend_Service executes the Cypher_Query, THE Backend_Service SHALL handle cases where no departments exist
3. WHEN THE Backend_Service executes the Cypher_Query, THE Backend_Service SHALL handle cases where no workpackages exist
4. WHEN THE Backend_Service executes the Cypher_Query, THE Backend_Service SHALL handle cases where phases have no NEXT relationships
5. WHEN THE Cypher_Query returns null values from OPTIONAL MATCH clauses, THE Backend_Service SHALL filter out null entries before returning data
6. WHEN THE Backend_Service encounters a database error, THE Backend_Service SHALL log the error with context and return a descriptive error message
7. WHEN THE API endpoint receives a request, THE API endpoint SHALL return HTTP 200 with empty arrays if no data exists
8. WHEN THE API endpoint encounters an error, THE API endpoint SHALL return appropriate HTTP status codes (400, 500) with error details

### Requirement 2: Create Comprehensive Medical Device Development PSP Template

**User Story:** As a system administrator, I want a comprehensive PSP template based on realistic Medical Device Development lifecycle, so that I can demonstrate the system with industry-relevant phases and departments.

#### Acceptance Criteria

1. THE Template_System SHALL include a new modular template file named "psp-comprehensive.yaml"
2. THE psp-comprehensive.yaml template SHALL define Medical Device Development phases in chronological order:
   - Phase 1: Proof of Concept (POC) - Initial feasibility and technology validation
   - Phase 2: Project Definition - Business case, scope, and resource planning
   - Phase 3: Concept Phase - User needs, intended use, and high-level requirements
   - Phase 4: Design & Development - Detailed design, implementation, and verification
   - Phase 5: Design Transfer - Manufacturing preparation and process validation
   - Phase 6: Validation - Clinical evaluation and final product validation
   - Phase 7: Market Release - Regulatory submission and product launch
   - Phase 8: Post-Market - Surveillance, maintenance, and continuous improvement
3. THE psp-comprehensive.yaml template SHALL define organizational departments relevant to Medical Device Development:
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
4. THE psp-comprehensive.yaml template SHALL define at least 60 workpackages distributed across phase-department intersections
5. WHEN phases are defined in the template, THE Template_System SHALL create NEXT relationships linking phases in chronological order from POC through Post-Market
6. WHEN workpackages are defined in the template, THE Template_System SHALL create BELONGS_TO relationships linking workpackages to phases
7. WHEN workpackages are defined in the template, THE Template_System SHALL create LINKED_TO_DEPARTMENT relationships linking workpackages to departments
8. THE psp-comprehensive.yaml template SHALL include realistic Medical Device workpackage names such as:
   - "Feasibility Study" (POC, R&D)
   - "User Needs Analysis" (Concept, Clinical Affairs)
   - "Design Input Specification" (Concept, Systems Engineering)
   - "Software Architecture Design" (Design & Development, Software Engineering)
   - "Risk Analysis (ISO 14971)" (Design & Development, Risk Management)
   - "Design Verification Testing" (Design & Development, QA)
   - "Process Validation (IQ/OQ/PQ)" (Design Transfer, Manufacturing)
   - "Clinical Evaluation Report" (Validation, Clinical Affairs)
   - "510(k) Submission" (Market Release, Regulatory Affairs)
   - "Post-Market Surveillance Plan" (Post-Market, Quality Assurance)
9. THE psp-comprehensive.yaml template SHALL include varied workpackage statuses reflecting project progression:
   - completed: For early phases (POC, Project Definition)
   - active: For current phases (Concept, Design & Development)
   - draft: For upcoming phases (Design Transfer, Validation)
   - archived: For superseded or cancelled workpackages
10. THE psp-comprehensive.yaml template SHALL ensure every phase has at least 5 workpackages
11. THE psp-comprehensive.yaml template SHALL ensure every department has at least 4 workpackages
12. THE psp-comprehensive.yaml template SHALL include workpackages for at least 65% of phase-department intersections
13. THE psp-comprehensive.yaml template SHALL include realistic descriptions referencing Medical Device standards:
   - ISO 13485 (Quality Management Systems)
   - ISO 14971 (Risk Management)
   - IEC 62304 (Software Lifecycle)
   - IEC 60601 (Medical Electrical Equipment Safety)
   - FDA 21 CFR Part 820 (Quality System Regulation)
   - FDA 21 CFR Part 11 (Electronic Records)
14. THE psp-comprehensive.yaml template SHALL demonstrate realistic phase transitions showing how departments shift focus across the lifecycle
15. THE psp-comprehensive.yaml template SHALL include workpackages with estimated hours reflecting realistic effort distribution across phases and departments

### Requirement 3: Enhance Phase Ordering Logic

**User Story:** As a project manager, I want phases to display in chronological order, so that I can understand the project timeline.

#### Acceptance Criteria

1. WHEN THE Backend_Service queries phases, THE Backend_Service SHALL traverse NEXT relationships to determine phase order
2. WHEN multiple phase chains exist (disconnected graphs), THE Backend_Service SHALL order chains by the earliest created_at timestamp
3. WHEN phases within a chain are retrieved, THE Backend_Service SHALL order them by path length from the root phase
4. WHEN a phase has no incoming NEXT relationship, THE Backend_Service SHALL identify it as a root phase
5. WHEN THE Backend_Service returns phases, THE Backend_Service SHALL include an order field indicating the chronological position
6. WHEN THE Frontend_Store receives phases, THE Frontend_Store SHALL preserve the order provided by the backend

### Requirement 4: Improve Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can diagnose issues quickly.

#### Acceptance Criteria

1. WHEN THE Backend_Service executes a Cypher_Query, THE Backend_Service SHALL log the query execution time
2. WHEN THE Backend_Service encounters a database error, THE Backend_Service SHALL log the error with query text and parameters
3. WHEN THE Backend_Service returns empty data, THE Backend_Service SHALL log a warning with context
4. WHEN THE API endpoint receives a request, THE API endpoint SHALL log the request with user context
5. WHEN THE Frontend_Store encounters an API error, THE Frontend_Store SHALL extract and display a user-friendly error message
6. WHEN THE Frontend_Store encounters a network error, THE Frontend_Store SHALL display a retry option
7. WHEN THE Matrix_View component displays an error, THE Matrix_View component SHALL include a retry button

### Requirement 5: Enhance Matrix Visualization

**User Story:** As a project manager, I want an improved matrix visualization, so that I can easily understand the project structure.

#### Acceptance Criteria

1. THE Matrix_View SHALL display phases as columns in chronological order
2. THE Matrix_View SHALL display departments as rows in alphabetical order
3. THE Matrix_View SHALL display workpackage cards in cells at phase-department intersections
4. WHEN a cell contains multiple workpackages, THE Matrix_View SHALL display all workpackages in a scrollable container
5. WHEN a workpackage card is displayed, THE Matrix_View SHALL show the workpackage name, status, and ID
6. WHEN a workpackage status is displayed, THE Matrix_View SHALL use color coding (draft: gray, active: blue, completed: green, archived: orange)
7. THE Matrix_View SHALL display phase descriptions in tooltips on hover
8. THE Matrix_View SHALL display department descriptions in tooltips on hover
9. WHEN the matrix is empty, THE Matrix_View SHALL display an empty state message with guidance
10. THE Matrix_View SHALL be responsive and support horizontal scrolling for many phases
11. THE Matrix_View SHALL maintain fixed column widths for consistent layout
12. THE Matrix_View SHALL maintain fixed row heights with scrollable cell content

### Requirement 6: Add Workpackage Cell Interactions

**User Story:** As a project manager, I want to interact with workpackage cells, so that I can view details and take actions.

#### Acceptance Criteria

1. WHEN a user clicks on a workpackage card, THE Matrix_View SHALL display a modal with workpackage details
2. WHEN a user hovers over a workpackage card, THE Matrix_View SHALL highlight the card
3. WHEN a workpackage modal is displayed, THE Matrix_View SHALL show the full workpackage name, description, status, phase, and department
4. WHEN a workpackage modal is displayed, THE Matrix_View SHALL include a link to edit the workpackage
5. WHEN a user clicks on an empty cell, THE Matrix_View SHALL display an option to create a new workpackage for that phase-department intersection
6. WHEN a user creates a workpackage from a cell, THE Matrix_View SHALL pre-populate the phase and department fields

### Requirement 7: Add Matrix Filtering and Search

**User Story:** As a project manager, I want to filter and search the matrix, so that I can focus on specific areas.

#### Acceptance Criteria

1. THE Matrix_View SHALL include a search input that filters workpackages by name
2. WHEN a user enters search text, THE Matrix_View SHALL highlight matching workpackages and dim non-matching ones
3. THE Matrix_View SHALL include a status filter dropdown
4. WHEN a user selects a status filter, THE Matrix_View SHALL show only workpackages with that status
5. THE Matrix_View SHALL include a phase filter dropdown
6. WHEN a user selects a phase filter, THE Matrix_View SHALL show only the selected phase column
7. THE Matrix_View SHALL include a department filter dropdown
8. WHEN a user selects a department filter, THE Matrix_View SHALL show only the selected department row
9. THE Matrix_View SHALL include a "Clear Filters" button
10. WHEN a user clicks "Clear Filters", THE Matrix_View SHALL reset all filters and show the full matrix

### Requirement 8: Add Matrix Export Functionality

**User Story:** As a project manager, I want to export the matrix, so that I can share it with stakeholders.

#### Acceptance Criteria

1. THE Matrix_View SHALL include an "Export" button in the header
2. WHEN a user clicks "Export", THE Matrix_View SHALL display export format options (PNG, PDF, CSV)
3. WHEN a user selects PNG export, THE Matrix_View SHALL generate a PNG image of the visible matrix
4. WHEN a user selects PDF export, THE Matrix_View SHALL generate a PDF document with the full matrix
5. WHEN a user selects CSV export, THE Matrix_View SHALL generate a CSV file with workpackage data including phase and department
6. WHEN an export is generated, THE Matrix_View SHALL include a timestamp in the filename
7. WHEN an export is generated, THE Matrix_View SHALL trigger a browser download

### Requirement 9: Improve Loading and Empty States

**User Story:** As a user, I want clear feedback during loading and when no data exists, so that I understand the system state.

#### Acceptance Criteria

1. WHEN THE Matrix_View is loading data for the first time, THE Matrix_View SHALL display a centered loading spinner with message "Loading PSP Matrix..."
2. WHEN THE Matrix_View is refreshing data, THE Matrix_View SHALL display a small loading indicator in the header
3. WHEN no phases exist, THE Matrix_View SHALL display an empty state with message "No phases configured. Please create phases with NEXT relationships."
4. WHEN no departments exist, THE Matrix_View SHALL display an empty state with message "No departments configured. Please create organizational departments."
5. WHEN no workpackages exist but phases and departments exist, THE Matrix_View SHALL display the empty matrix grid with a message "No workpackages defined. Click cells to create workpackages."
6. WHEN an error occurs, THE Matrix_View SHALL display an error message with a retry button
7. WHEN a user clicks retry, THE Matrix_View SHALL clear the error and refetch data

### Requirement 10: Add Matrix Statistics Summary

**User Story:** As a project manager, I want to see summary statistics, so that I can understand the overall project status.

#### Acceptance Criteria

1. THE Matrix_View SHALL display a statistics panel above the matrix
2. THE statistics panel SHALL show the total number of phases
3. THE statistics panel SHALL show the total number of departments
4. THE statistics panel SHALL show the total number of workpackages
5. THE statistics panel SHALL show the count of workpackages by status (draft, active, completed, archived)
6. THE statistics panel SHALL show the percentage of cells with workpackages (coverage)
7. THE statistics panel SHALL show the average number of workpackages per cell
8. WHEN statistics are displayed, THE statistics panel SHALL use visual indicators (icons, colors) for clarity

### Requirement 11: Enforce Relationship-Only Graph Database Approach

**User Story:** As a developer, I want an enhanced data model that follows graph database principles, so that the system uses relationships as the source of truth without redundant foreign key properties.

**CRITICAL PRINCIPLE**: The graph database MUST use relationships ONLY for associations between graph entities, NOT foreign key properties stored on nodes. This ensures data integrity, prevents inconsistencies, and leverages the full power of graph traversal.

**EXCEPTION**: user_id properties ARE allowed because users are stored in PostgreSQL (not in the AGE graph database) and cannot be linked via graph relationships.

#### Acceptance Criteria

1. THE Phase node SHALL include properties: id, name, description, status, order, created_at, updated_at
2. THE Phase node SHALL NOT include project_id property (use BELONGS_TO relationship instead)
3. THE Department node SHALL include properties: id, name, description, manager_user_id, created_at, updated_at
4. THE Department node SHALL NOT include company_id property (use PARENT_OF relationship instead)
5. THE Department node MAY include manager_user_id property (exception: users are not in graph database)
6. THE Workpackage node SHALL include properties: id, name, description, status, order, estimated_hours, actual_hours, created_at, updated_at
7. THE Workpackage node SHALL NOT include phase_id or department_id properties (relationships are the source of truth)
8. THE Resource node SHALL NOT include department_id property (use BELONGS_TO relationship instead)
9. THE Sprint node SHALL NOT include project_id property (use BELONGS_TO relationship instead)
10. THE Milestone node SHALL NOT include project_id property (use BELONGS_TO relationship instead)
11. THE Backlog node SHALL NOT include project_id property (use BELONGS_TO relationship instead)
12. THE NEXT relationship SHALL link phases in chronological order with no additional properties
13. THE BELONGS_TO relationship SHALL link entities to their parent entities (Phase->Project, Workpackage->Phase, Sprint->Project, Resource->Department, Milestone->Project, Backlog->Project)
14. THE LINKED_TO_DEPARTMENT relationship SHALL link workpackages to departments with no additional properties
15. THE PARENT_OF relationship SHALL link companies to departments with no additional properties
16. WHEN a phase is created, THE Backend_Service SHALL create a BELONGS_TO relationship to the project, NOT store project_id as a property
17. WHEN a workpackage is created, THE Backend_Service SHALL create BELONGS_TO and LINKED_TO_DEPARTMENT relationships, NOT store phase_id or department_id as properties
18. WHEN a department is created, THE Backend_Service SHALL create a PARENT_OF relationship from the company, NOT store company_id as a property
19. WHEN querying workpackages, THE Backend_Service SHALL traverse relationships to determine phase and department associations, NOT read from node properties
20. WHEN filtering workpackages by phase or department, THE Backend_Service SHALL use relationship traversal in Cypher queries, NOT property-based filtering
21. WHEN the Template_System loads entities, THE Template_System SHALL create relationships from foreign key fields in YAML but SHALL NOT store those fields as node properties
22. WHEN the Template_Validator validates templates, THE Template_Validator SHALL validate that required relationships exist, NOT that foreign key properties are present

### Requirement 12: Add Template Validation

**User Story:** As a system administrator, I want template validation, so that I can ensure data integrity when loading templates.

#### Acceptance Criteria

1. WHEN THE Template_System loads a PSP template, THE Template_System SHALL validate that all phase IDs referenced in workpackages exist
2. WHEN THE Template_System loads a PSP template, THE Template_System SHALL validate that all department IDs referenced in workpackages exist
3. WHEN THE Template_System loads a PSP template, THE Template_System SHALL validate that NEXT relationships form a valid chain (no cycles)
4. WHEN THE Template_System loads a PSP template, THE Template_System SHALL validate that each phase has at most one outgoing NEXT relationship
5. WHEN THE Template_System loads a PSP template, THE Template_System SHALL validate that each phase has at most one incoming NEXT relationship
6. WHEN THE Template_System detects validation errors, THE Template_System SHALL return a detailed error message listing all issues
7. WHEN THE Template_System successfully validates a template, THE Template_System SHALL log a success message with entity counts

### Requirement 13: Improve Frontend Performance

**User Story:** As a user, I want fast matrix rendering, so that I can work efficiently with large project structures.

#### Acceptance Criteria

1. WHEN THE Matrix_View renders a matrix with more than 50 workpackages, THE Matrix_View SHALL use virtualization for cell rendering
2. WHEN THE Frontend_Store computes the matrix grid, THE Frontend_Store SHALL use memoization to avoid redundant calculations
3. WHEN THE Matrix_View re-renders, THE Matrix_View SHALL use React.memo for workpackage cards to prevent unnecessary re-renders
4. WHEN THE Matrix_View displays tooltips, THE Matrix_View SHALL debounce tooltip rendering to improve performance
5. WHEN THE Frontend_Store fetches matrix data, THE Frontend_Store SHALL cache the data for 5 minutes
6. WHEN THE Frontend_Store has cached data, THE Frontend_Store SHALL not refetch unless explicitly requested
7. WHEN THE Matrix_View scrolls horizontally, THE Matrix_View SHALL maintain smooth 60fps scrolling

### Requirement 14: Add Responsive Design

**User Story:** As a user on different devices, I want the matrix to be usable on various screen sizes, so that I can access it anywhere.

#### Acceptance Criteria

1. WHEN THE Matrix_View is displayed on a screen wider than 1200px, THE Matrix_View SHALL show all columns without horizontal scrolling if there are 7 or fewer phases
2. WHEN THE Matrix_View is displayed on a screen between 768px and 1200px, THE Matrix_View SHALL enable horizontal scrolling and reduce cell padding
3. WHEN THE Matrix_View is displayed on a screen smaller than 768px, THE Matrix_View SHALL switch to a card-based layout showing one phase at a time
4. WHEN THE Matrix_View is in mobile layout, THE Matrix_View SHALL include phase navigation buttons
5. WHEN THE Matrix_View is in mobile layout, THE Matrix_View SHALL display department names as section headers
6. THE Matrix_View SHALL maintain readability at all screen sizes
7. THE Matrix_View SHALL ensure touch targets are at least 44x44 pixels on mobile devices

### Requirement 15: Add Accessibility Features

**User Story:** As a user with accessibility needs, I want the matrix to be accessible, so that I can use assistive technologies.

#### Acceptance Criteria

1. THE Matrix_View SHALL use semantic HTML table elements (table, thead, tbody, th, td)
2. THE Matrix_View SHALL include ARIA labels for all interactive elements
3. THE Matrix_View SHALL support keyboard navigation (Tab, Arrow keys, Enter, Escape)
4. WHEN a user navigates with keyboard, THE Matrix_View SHALL show visible focus indicators
5. WHEN a user presses Enter on a workpackage card, THE Matrix_View SHALL open the workpackage modal
6. WHEN a user presses Escape in a modal, THE Matrix_View SHALL close the modal
7. THE Matrix_View SHALL ensure color contrast meets WCAG AA standards (4.5:1 for text)
8. THE Matrix_View SHALL include alt text for all visual indicators
9. THE Matrix_View SHALL announce dynamic content changes to screen readers using ARIA live regions
10. THE Matrix_View SHALL support screen reader navigation of the table structure

### Requirement 16: Add Matrix Legend and Help

**User Story:** As a new user, I want a legend and help information, so that I can understand the matrix visualization.

#### Acceptance Criteria

1. THE Matrix_View SHALL display a legend showing status color coding
2. THE Matrix_View SHALL display a legend showing the meaning of rows (departments) and columns (phases)
3. THE Matrix_View SHALL include a help icon in the header
4. WHEN a user clicks the help icon, THE Matrix_View SHALL display a modal with usage instructions
5. THE help modal SHALL explain how to read the matrix
6. THE help modal SHALL explain how to interact with cells
7. THE help modal SHALL explain how to use filters and search
8. THE help modal SHALL include visual examples
9. THE help modal SHALL include a "Don't show again" checkbox
10. WHEN a user checks "Don't show again", THE Matrix_View SHALL store the preference in local storage

### Requirement 17: Add Backend API Enhancements

**User Story:** As a frontend developer, I want enhanced API endpoints, so that I can build rich features.

#### Acceptance Criteria

1. THE Backend_Service SHALL provide an endpoint GET /api/v1/psp/matrix that returns the full matrix data
2. THE Backend_Service SHALL provide an endpoint GET /api/v1/psp/phases that returns all phases in order
3. THE Backend_Service SHALL provide an endpoint GET /api/v1/psp/departments that returns all departments
4. THE Backend_Service SHALL provide an endpoint GET /api/v1/psp/workpackages that returns all workpackages with phase and department IDs
5. THE Backend_Service SHALL provide an endpoint GET /api/v1/psp/statistics that returns matrix statistics
6. THE Backend_Service SHALL provide an endpoint POST /api/v1/psp/workpackages that creates a new workpackage with phase and department
7. THE Backend_Service SHALL provide an endpoint PATCH /api/v1/psp/workpackages/{id} that updates a workpackage
8. THE Backend_Service SHALL provide an endpoint DELETE /api/v1/psp/workpackages/{id} that deletes a workpackage
9. WHEN THE Backend_Service creates or updates a workpackage, THE Backend_Service SHALL validate that the phase and department exist
10. WHEN THE Backend_Service deletes a workpackage, THE Backend_Service SHALL remove all relationships

### Requirement 18: Add Template Application Testing

**User Story:** As a developer, I want automated tests for template application, so that I can ensure templates load correctly.

#### Acceptance Criteria

1. THE Backend_Service SHALL include a test that loads the psp-comprehensive.yaml template
2. THE test SHALL verify that all phases are created with correct properties
3. THE test SHALL verify that all departments are created with correct properties
4. THE test SHALL verify that all workpackages are created with correct properties
5. THE test SHALL verify that NEXT relationships are created correctly between phases
6. THE test SHALL verify that BELONGS_TO relationships are created correctly between workpackages and phases
7. THE test SHALL verify that LINKED_TO_DEPARTMENT relationships are created correctly between workpackages and departments
8. THE test SHALL verify that the matrix query returns the expected data structure
9. THE test SHALL verify that phase ordering is correct
10. THE test SHALL verify that workpackages appear in the correct matrix cells

### Requirement 19: Add Frontend Component Tests

**User Story:** As a developer, I want frontend component tests, so that I can ensure UI reliability.

#### Acceptance Criteria

1. THE Matrix_View component SHALL have a test that verifies rendering with valid data
2. THE Matrix_View component SHALL have a test that verifies rendering with empty data
3. THE Matrix_View component SHALL have a test that verifies rendering with loading state
4. THE Matrix_View component SHALL have a test that verifies rendering with error state
5. THE Matrix_View component SHALL have a test that verifies workpackage card click handling
6. THE Matrix_View component SHALL have a test that verifies filter functionality
7. THE Matrix_View component SHALL have a test that verifies search functionality
8. THE Frontend_Store SHALL have a test that verifies matrix grid computation
9. THE Frontend_Store SHALL have a test that verifies getWorkpackagesForCell selector
10. THE Frontend_Store SHALL have a test that verifies error handling

### Requirement 20: Add Documentation

**User Story:** As a user and developer, I want comprehensive documentation, so that I can understand and use the PSP feature.

#### Acceptance Criteria

1. THE project SHALL include a PSP user guide in docs/psp-user-guide.md
2. THE user guide SHALL explain the purpose and benefits of the PSP Matrix
3. THE user guide SHALL include screenshots of the matrix visualization
4. THE user guide SHALL explain how to create phases, departments, and workpackages
5. THE user guide SHALL explain how to use filters and search
6. THE user guide SHALL explain how to export the matrix
7. THE project SHALL include a PSP developer guide in docs/psp-developer-guide.md
8. THE developer guide SHALL explain the data model and relationships
9. THE developer guide SHALL explain the backend service architecture
10. THE developer guide SHALL explain the frontend store and component structure
11. THE developer guide SHALL include examples of creating custom PSP templates
12. THE developer guide SHALL include API endpoint documentation with examples

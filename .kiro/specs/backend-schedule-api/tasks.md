# Implementation Plan: Backend Schedule API

## Overview

This plan implements REST API endpoints for project scheduling, integrating the existing SchedulerService with the frontend schedule components. The implementation follows the RxDx architecture patterns and enables project managers to calculate, retrieve, and manually adjust project schedules.

## Tasks

- [ ] 1. Create Pydantic schemas for new API models
  - Create `GanttChartData` schema for Gantt chart visualization
  - Create `TaskDependencyView` schema for dependency visualization
  - Create `ScheduleStatistics` schema for schedule metrics
  - Create `ScheduleCalculateRequest` schema for calculation requests
  - Add schemas to `backend/app/schemas/schedule.py`
  - _Requirements: 1.1, 4.1, 10.1_

- [ ] 2. Implement ScheduleAPIService
  - [ ] 2.1 Create service class structure
    - Create `backend/app/services/schedule_api_service.py`
    - Define `ScheduleAPIService` class with dependencies
    - Implement dependency injection function `get_schedule_api_service`
    - _Requirements: 1.1, 2.1_

  - [ ] 2.2 Implement schedule calculation method
    - Implement `calculate_schedule` method
    - Fetch tasks from WorkItem system
    - Convert WorkItems to ScheduleTaskCreate
    - Call SchedulerService
    - Update WorkItem dates on success
    - _Requirements: 1.1, 1.2, 7.1, 7.2_

  - [ ]* 2.3 Write property test for schedule calculation
    - **Property 1: Schedule Calculation Determinism**
    - **Validates: Requirements 1.1, 1.2**

  - [ ] 2.4 Implement schedule retrieval method
    - Implement `get_schedule` method
    - Support version parameter for historical retrieval
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.5 Write property test for schedule retrieval
    - **Property 5: Schedule Retrieval Consistency**
    - **Validates: Requirements 2.3, 2.4**

  - [ ] 2.6 Implement schedule update method
    - Implement `update_schedule` method
    - Apply manual adjustments
    - Update WorkItem dates
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7_

  - [ ]* 2.7 Write property test for manual adjustments
    - **Property 6: Manual Adjustment Preservation**
    - **Validates: Requirements 3.6, 3.7**

  - [ ] 2.8 Implement Gantt data method
    - Implement `get_gantt_data` method
    - Fetch task dependencies
    - Calculate critical path
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 2.9 Write property test for Gantt data
    - **Property 7: Gantt Data Completeness**
    - **Validates: Requirements 4.2, 4.3**

  - [ ] 2.10 Implement statistics method
    - Implement `get_statistics` method
    - Calculate task counts by status
    - Calculate completion percentage
    - Calculate resource utilization
    - Determine schedule health
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [ ]* 2.11 Write property test for statistics
    - **Property 10: Statistics Calculation Correctness**
    - **Validates: Requirements 10.1-10.8**

- [ ] 3. Checkpoint - Ensure service layer tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 4. Implement API endpoints
  - [ ] 4.1 Create schedule router
    - Create `backend/app/api/v1/schedule.py`
    - Define router with prefix `/schedule`
    - Import required dependencies
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [ ] 4.2 Implement POST /schedule/calculate endpoint
    - Implement `calculate_schedule` endpoint
    - Add authentication and authorization checks
    - Handle errors and return appropriate status codes
    - Add structured logging
    - _Requirements: 1.1, 1.2, 1.3, 15.1, 15.2_

  - [ ]* 4.3 Write integration test for calculate endpoint
    - Test successful calculation
    - Test infeasible schedule
    - Test authentication required
    - Test authorization required
    - _Requirements: 1.1, 1.2, 1.3, 15.1, 15.2_

  - [ ] 4.4 Implement GET /schedule/{project_id} endpoint
    - Implement `get_schedule` endpoint
    - Support version query parameter
    - Handle 404 for non-existent schedules
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 4.5 Write integration test for get schedule endpoint
    - Test successful retrieval
    - Test 404 for non-existent schedule
    - Test version parameter
    - _Requirements: 2.1, 2.2_

  - [ ] 4.6 Implement PATCH /schedule/{project_id} endpoint
    - Implement `update_schedule` endpoint
    - Add authentication and authorization checks
    - Validate adjustments
    - Handle constraint violations
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 15.3, 15.4_

  - [ ]* 4.7 Write integration test for update endpoint
    - Test successful update
    - Test constraint violation
    - Test authorization required
    - _Requirements: 3.1, 3.4, 3.5, 15.4_

  - [ ] 4.8 Implement GET /schedule/{project_id}/gantt endpoint
    - Implement `get_gantt_data` endpoint
    - Handle 404 for non-existent schedules
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.9 Write integration test for Gantt endpoint
    - Test successful retrieval
    - Test 404 for non-existent schedule
    - _Requirements: 4.1, 4.6_

  - [ ] 4.10 Implement GET /schedule/{project_id}/statistics endpoint
    - Implement `get_statistics` endpoint
    - Handle 404 for non-existent schedules
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [ ]* 4.11 Write integration test for statistics endpoint
    - Test successful retrieval
    - Test 404 for non-existent schedule
    - _Requirements: 10.1_

  - [ ] 4.12 Implement GET /schedule/{project_id}/export endpoint
    - Implement `export_schedule` endpoint
    - Return complete schedule data
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 4.13 Implement POST /schedule/{project_id}/import endpoint
    - Implement `import_schedule` endpoint
    - Validate imported data
    - Add authentication and authorization checks
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8, 15.5_

  - [ ]* 4.14 Write property test for export/import round trip
    - **Property 11: Export/Import Round Trip**
    - **Validates: Requirements 9.1-9.8**

  - [ ] 4.15 Register schedule router in API
    - Update `backend/app/api/v1/__init__.py`
    - Add schedule router to api_router
    - _Requirements: 1.1_

- [ ] 5. Checkpoint - Ensure API endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement helper methods
  - [ ] 6.1 Implement WorkItem to ScheduleTask conversion
    - Implement `_convert_workitems_to_schedule_tasks` method
    - Extract dependencies from WorkItems
    - Map WorkItem fields to ScheduleTaskCreate fields
    - _Requirements: 7.1_

  - [ ]* 6.2 Write unit test for conversion
    - Test conversion with various WorkItem configurations
    - Test dependency extraction
    - _Requirements: 7.1_

  - [ ] 6.3 Implement WorkItem date update
    - Implement `_update_workitem_dates` method
    - Update start_date and end_date for scheduled tasks
    - _Requirements: 7.2_

  - [ ]* 6.4 Write property test for WorkItem integration
    - **Property 10: WorkItem Integration Round Trip**
    - **Validates: Requirements 7.2**

  - [ ] 6.5 Implement task dependency fetching
    - Implement `_fetch_task_dependencies` method
    - Query WorkItem system for dependencies
    - Convert to TaskDependencyView format
    - _Requirements: 4.3_

  - [ ] 6.6 Implement critical path calculation
    - Implement `_calculate_critical_path` method
    - Build dependency graph
    - Find longest path through graph
    - _Requirements: 4.4, 10.6_

  - [ ]* 6.7 Write unit test for critical path
    - Test with known critical paths
    - Test with parallel tasks
    - Test with complex dependencies
    - _Requirements: 4.4_

  - [ ] 6.8 Implement statistics calculation
    - Implement `_calculate_statistics` method
    - Count tasks by status
    - Calculate completion percentage
    - Determine schedule health
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [ ] 7. Implement property-based tests
  - [ ]* 7.1 Write property test for dependency preservation
    - **Property 2: Dependency Preservation**
    - **Validates: Requirements 1.4**

  - [ ]* 7.2 Write property test for resource constraints
    - **Property 3: Resource Capacity Constraints**
    - **Validates: Requirements 1.5**

  - [ ]* 7.3 Write property test for deadline compliance
    - **Property 4: Deadline Compliance**
    - **Validates: Requirements 1.6**

  - [ ]* 7.4 Write property test for version monotonicity
    - **Property 9: Version Increment Monotonicity**
    - **Validates: Requirements 6.2**

  - [ ]* 7.5 Write property test for conflict detection
    - **Property 8: Conflict Detection Completeness**
    - **Validates: Requirements 5.1, 5.8**

- [ ] 8. Update frontend schedule service
  - [ ] 8.1 Remove placeholder methods
    - Remove "coming soon" error throws from `calculateSchedule`
    - Remove "coming soon" error throws from `getSchedule`
    - Remove "coming soon" error throws from `getGanttData`
    - _Requirements: 1.1, 2.1, 4.1_

  - [ ] 8.2 Implement calculateSchedule method
    - Call POST /api/v1/schedule/calculate
    - Handle response and errors
    - Map response to ScheduleResult interface
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 8.3 Implement getSchedule method
    - Call GET /api/v1/schedule/{project_id}
    - Handle response and errors
    - Map ProjectSchedule to ScheduleResult
    - _Requirements: 2.1, 2.2_

  - [ ] 8.4 Implement getGanttData method
    - Call GET /api/v1/schedule/{project_id}/gantt
    - Handle response and errors
    - Return ScheduledTask array
    - _Requirements: 4.1, 4.2_

  - [ ] 8.5 Add TypeScript interfaces for new types
    - Add GanttChartData interface
    - Add ScheduleStatistics interface
    - Add ProjectSchedule interface
    - _Requirements: 4.1, 10.1_

- [ ] 9. Update frontend schedule page
  - [ ] 9.1 Remove "coming soon" message from SchedulePage
    - Update `frontend/src/pages/SchedulePage.tsx`
    - Remove placeholder content
    - Add real schedule loading logic
    - _Requirements: 4.1_

  - [ ] 9.2 Implement schedule data loading
    - Use scheduleService.getGanttData
    - Handle loading and error states
    - Pass data to GanttChart component
    - _Requirements: 4.1, 4.2_

  - [ ] 9.3 Add schedule calculation UI
    - Add button to trigger schedule calculation
    - Show calculation progress
    - Handle calculation errors
    - Display conflicts if infeasible
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 9.4 Add schedule statistics display
    - Fetch statistics from API
    - Display key metrics (completion %, task counts)
    - Show schedule health indicator
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 10. Update Kanban board integration
  - [ ] 10.1 Update KanbanBoard to show schedule dates
    - Display scheduled start/end dates on task cards
    - Highlight tasks on critical path
    - _Requirements: 11.1, 11.6, 11.7_

  - [ ] 10.2 Update task status changes to preserve dates
    - When moving tasks between columns, preserve schedule dates
    - Update WorkItem status without changing dates
    - _Requirements: 11.2, 11.3_

- [ ] 11. Add error handling and logging
  - [ ] 11.1 Add structured logging to service methods
    - Log schedule calculations with duration
    - Log manual adjustments with user ID
    - Log errors with full context
    - _Requirements: 14.1, 14.2, 14.5, 14.6, 14.7_

  - [ ] 11.2 Implement error response formatting
    - Create consistent error response structure
    - Include error codes and context
    - Add descriptive error messages
    - _Requirements: 14.2, 14.3, 14.4_

  - [ ]* 11.3 Write integration tests for error handling
    - Test 400 errors for validation failures
    - Test 404 errors for not found
    - Test 401/403 errors for auth failures
    - Test 500 errors for server errors
    - _Requirements: 14.2_

- [ ] 12. Add performance monitoring
  - [ ] 12.1 Add performance logging
    - Log calculation duration for all operations
    - Log task count and resource count
    - Log performance metrics
    - _Requirements: 13.8_

  - [ ] 12.2 Add timeout handling
    - Set 60-second timeout for schedule calculations
    - Return timeout error if exceeded
    - _Requirements: 13.7_

- [ ] 13. Documentation and deployment
  - [ ] 13.1 Update API documentation
    - Add OpenAPI documentation for all endpoints
    - Include request/response examples
    - Document error responses
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [ ] 13.2 Update README
    - Document schedule API endpoints
    - Add usage examples
    - Document environment variables
    - _Requirements: 1.1_

  - [ ] 13.3 Add environment variables
    - Add SCHEDULE_CALCULATION_TIMEOUT
    - Add SCHEDULE_MAX_TASKS
    - Add SCHEDULE_CACHE_TTL
    - _Requirements: 13.7_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Run full test suite
  - Verify all integration tests pass
  - Verify all property tests pass
  - Check test coverage meets 80% minimum
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement graph database entity schemas
  - [ ] 15.1 Create Project schemas
    - Create `backend/app/schemas/project.py`
    - Implement `ProjectBase`, `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`
    - Add validation for status field
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [ ] 15.2 Create Phase schemas
    - Implement `PhaseBase`, `PhaseCreate`, `PhaseUpdate`, `PhaseResponse`
    - Add validation for order field
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [ ] 15.3 Create Workpackage schemas
    - Implement `WorkpackageBase`, `WorkpackageCreate`, `WorkpackageUpdate`, `WorkpackageResponse`
    - Add validation for order field
    - _Requirements: 18.10, 18.11, 18.12, 18.13, 18.14_

  - [ ] 15.4 Create Resource schemas
    - Implement `ResourceBase`, `ResourceCreate`, `ResourceUpdate`, `ResourceResponse`
    - Add validation for type field (person, machine, equipment, facility, other)
    - Add validation for availability field
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.6, 19.7_

  - [ ] 15.5 Create Department schemas
    - Implement `DepartmentBase`, `DepartmentCreate`, `DepartmentUpdate`, `DepartmentResponse`
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [ ] 16. Extend GraphService for new entities
  - [ ] 16.1 Add Project node methods
    - Implement `create_project_node` method
    - Implement `update_project_node` method
    - Implement `delete_project_node` method (with cascade)
    - Implement `get_project_node` method
    - _Requirements: 16.1, 16.20_

  - [ ] 16.2 Add Phase node methods
    - Implement `create_phase_node` method (with BELONGS_TO relationship)
    - Implement `update_phase_node` method
    - Implement `delete_phase_node` method (with cascade)
    - Implement `get_phase_node` method
    - _Requirements: 16.2, 16.8, 16.21_

  - [ ] 16.3 Add Workpackage node methods
    - Implement `create_workpackage_node` method (with BELONGS_TO relationship)
    - Implement `update_workpackage_node` method
    - Implement `delete_workpackage_node` method
    - Implement `get_workpackage_node` method
    - _Requirements: 16.3, 16.9, 16.22_

  - [ ] 16.4 Add Resource node methods
    - Implement `create_resource_node` method (with BELONGS_TO relationship to department)
    - Implement `update_resource_node` method
    - Implement `delete_resource_node` method (with validation)
    - Implement `get_resource_node` method
    - _Requirements: 16.4, 16.6, 16.11, 16.23_

  - [ ] 16.5 Add Department node methods
    - Implement `create_department_node` method (with PARENT_OF relationship)
    - Implement `update_department_node` method
    - Implement `delete_department_node` method (with validation)
    - Implement `get_department_node` method
    - _Requirements: 16.5, 16.24_

  - [ ] 16.6 Add resource allocation methods
    - Implement `allocate_resource_to_project` method (ALLOCATED_TO relationship)
    - Implement `assign_resource_to_task` method (ASSIGNED_TO relationship)
    - Implement `get_resource_allocations` method
    - Implement `get_resource_assignments` method
    - _Requirements: 16.12, 16.13, 19.9, 19.10_

  - [ ] 16.7 Add graph traversal methods
    - Implement `get_project_hierarchy` method (Project → Phase → Workpackage → Task)
    - Implement `get_department_resources` method
    - Implement `get_project_resources` method
    - Implement `get_workpackage_tasks` method
    - _Requirements: 16.15, 16.16, 16.17, 16.18, 16.19_

  - [ ]* 16.8 Write unit tests for graph methods
    - Test node creation with relationships
    - Test cascade deletion
    - Test graph traversal queries
    - _Requirements: 16.1-16.24_

- [ ] 17. Implement Project service and API
  - [ ] 17.1 Create ProjectService
    - Create `backend/app/services/project_service.py`
    - Implement `create_project` method
    - Implement `get_project` method
    - Implement `update_project` method
    - Implement `delete_project` method
    - Implement `list_projects` method
    - Implement `get_project_hierarchy` method
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ] 17.2 Create Project API endpoints
    - Create `backend/app/api/v1/projects.py`
    - Implement POST /projects endpoint
    - Implement GET /projects endpoint (with filtering)
    - Implement GET /projects/{project_id} endpoint
    - Implement PATCH /projects/{project_id} endpoint
    - Implement DELETE /projects/{project_id} endpoint
    - Implement GET /projects/{project_id}/hierarchy endpoint
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.8_

  - [ ]* 17.3 Write integration tests for Project API
    - Test project CRUD operations
    - Test project hierarchy retrieval
    - Test filtering and search
    - _Requirements: 17.1-17.10_

- [ ] 18. Implement Phase and Workpackage services and APIs
  - [ ] 18.1 Create PhaseService
    - Create `backend/app/services/phase_service.py`
    - Implement `create_phase` method
    - Implement `get_phase` method
    - Implement `update_phase` method
    - Implement `delete_phase` method
    - Implement `list_phases` method
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [ ] 18.2 Create Phase API endpoints
    - Create `backend/app/api/v1/phases.py`
    - Implement POST /projects/{project_id}/phases endpoint
    - Implement GET /projects/{project_id}/phases endpoint
    - Implement GET /phases/{phase_id} endpoint
    - Implement PATCH /phases/{phase_id} endpoint
    - Implement DELETE /phases/{phase_id} endpoint
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [ ] 18.3 Create WorkpackageService
    - Create `backend/app/services/workpackage_service.py`
    - Implement `create_workpackage` method
    - Implement `get_workpackage` method
    - Implement `update_workpackage` method
    - Implement `delete_workpackage` method
    - Implement `list_workpackages` method
    - _Requirements: 18.10, 18.11, 18.12, 18.13, 18.14_

  - [ ] 18.4 Create Workpackage API endpoints
    - Create `backend/app/api/v1/workpackages.py`
    - Implement POST /phases/{phase_id}/workpackages endpoint
    - Implement GET /phases/{phase_id}/workpackages endpoint
    - Implement GET /workpackages/{workpackage_id} endpoint
    - Implement PATCH /workpackages/{workpackage_id} endpoint
    - Implement DELETE /workpackages/{workpackage_id} endpoint
    - _Requirements: 18.10, 18.11, 18.12, 18.13, 18.14_

  - [ ]* 18.5 Write integration tests for Phase and Workpackage APIs
    - Test phase CRUD operations
    - Test workpackage CRUD operations
    - Test hierarchy relationships
    - Test cascade deletion
    - _Requirements: 18.1-18.20_

- [ ] 19. Implement Resource service and API
  - [ ] 19.1 Create ResourceService
    - Create `backend/app/services/resource_service.py`
    - Implement `create_resource` method
    - Implement `get_resource` method
    - Implement `update_resource` method
    - Implement `delete_resource` method (with validation)
    - Implement `list_resources` method (with filtering)
    - Implement `allocate_to_project` method
    - Implement `assign_to_task` method
    - Implement `calculate_utilization` method
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.9, 19.10, 19.19_

  - [ ] 19.2 Create Resource API endpoints
    - Create `backend/app/api/v1/resources.py`
    - Implement POST /resources endpoint
    - Implement GET /resources endpoint (with filtering by type, department, skills)
    - Implement GET /resources/{resource_id} endpoint
    - Implement PATCH /resources/{resource_id} endpoint
    - Implement DELETE /resources/{resource_id} endpoint
    - Implement POST /resources/{resource_id}/allocate endpoint
    - Implement POST /resources/{resource_id}/assign endpoint
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.9, 19.10_

  - [ ]* 19.3 Write integration tests for Resource API
    - Test resource CRUD operations
    - Test resource allocation to projects
    - Test resource assignment to tasks
    - Test utilization calculation
    - Test filtering by type, department, skills
    - _Requirements: 19.1-19.20_

- [ ] 20. Implement Department service and API
  - [ ] 20.1 Create DepartmentService
    - Create `backend/app/services/department_service.py`
    - Implement `create_department` method
    - Implement `get_department` method
    - Implement `update_department` method
    - Implement `delete_department` method (with validation)
    - Implement `list_departments` method
    - Implement `get_department_resources` method
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [ ] 20.2 Create Department API endpoints
    - Create `backend/app/api/v1/departments.py`
    - Implement POST /departments endpoint
    - Implement GET /departments endpoint
    - Implement GET /departments/{department_id} endpoint
    - Implement PATCH /departments/{department_id} endpoint
    - Implement DELETE /departments/{department_id} endpoint
    - Implement GET /departments/{department_id}/resources endpoint
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.9_

  - [ ]* 20.3 Write integration tests for Department API
    - Test department CRUD operations
    - Test hierarchical department structures
    - Test resource listing
    - Test deletion validation
    - _Requirements: 20.1-20.10_

- [ ] 21. Update WorkItem service for graph relationships
  - [ ] 21.1 Add project relationship to WorkItems
    - Update `create_workitem` to create BELONGS_TO relationship to Project
    - Update `create_workitem` to create BELONGS_TO relationship to Workpackage (for tasks)
    - _Requirements: 16.7, 16.10_

  - [ ] 21.2 Update task assignment to use Resources
    - Update task assignment logic to use Resource nodes instead of user IDs
    - Create ASSIGNED_TO relationships from Resources to Tasks
    - _Requirements: 16.12, 19.10_

- [ ] 22. Update SchedulerService to use graph-based Resources
  - [ ] 22.1 Update resource fetching
    - Update `_fetch_resources` method to query Resource nodes from graph
    - Extract capacity from Resource node properties
    - Check Resource availability status
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ] 22.2 Update resource allocation tracking
    - Query existing ALLOCATED_TO relationships
    - Calculate current resource utilization
    - Prevent over-allocation
    - _Requirements: 8.3, 8.9, 8.10_

  - [ ] 22.3 Update schedule calculation to create resource assignments
    - Create ASSIGNED_TO relationships when tasks are scheduled
    - Update Resource utilization metrics
    - _Requirements: 8.5, 8.6_

  - [ ]* 22.4 Write integration tests for resource-based scheduling
    - Test scheduling with graph-based resources
    - Test resource capacity constraints
    - Test resource allocation tracking
    - _Requirements: 8.1-8.10_

- [ ] 23. Update graph database initialization
  - [ ] 23.1 Update schema initialization
    - Add Project, Phase, Workpackage, Resource, Department to supported node types
    - Add new relationship types (ALLOCATED_TO, PARENT_OF)
    - Update `initialize_graph_schema` method
    - _Requirements: 16.1-16.5_

  - [ ] 23.2 Create migration script for existing data
    - Create script to migrate existing project references to Project nodes
    - Create script to create default departments
    - Create script to create Resource nodes from existing resource data
    - _Requirements: 16.1, 16.4, 16.5_

- [ ] 24. Update frontend for graph entities
  - [ ] 24.1 Create TypeScript interfaces
    - Create Project, Phase, Workpackage, Resource, Department interfaces
    - Add to `frontend/src/types/index.ts`
    - _Requirements: 17.1, 18.1, 19.1, 20.1_

  - [ ] 24.2 Create API service methods
    - Create `projectService.ts` with CRUD methods
    - Create `phaseService.ts` with CRUD methods
    - Create `workpackageService.ts` with CRUD methods
    - Create `resourceService.ts` with CRUD methods
    - Create `departmentService.ts` with CRUD methods
    - _Requirements: 17.1-17.5, 18.1-18.4, 19.1-19.5, 20.1-20.4_

  - [ ] 24.3 Create project management UI components
    - Create ProjectList component
    - Create ProjectForm component
    - Create ProjectHierarchy component (showing phases and workpackages)
    - _Requirements: 17.2, 17.3_

  - [ ] 24.4 Create resource management UI components
    - Create ResourceList component
    - Create ResourceForm component
    - Create ResourceAllocation component
    - _Requirements: 19.2, 19.3_

- [ ] 25. Final integration and testing
  - [ ] 25.1 Test complete project hierarchy
    - Create project with phases, workpackages, and tasks
    - Verify graph relationships are correct
    - Test hierarchy traversal queries
    - _Requirements: 16.18_

  - [ ] 25.2 Test resource allocation workflow
    - Create resources and departments
    - Allocate resources to projects
    - Assign resources to tasks
    - Calculate and verify utilization
    - _Requirements: 19.9, 19.10, 19.11, 19.19_

  - [ ] 25.3 Test schedule calculation with graph resources
    - Create schedule using graph-based resources
    - Verify resource constraints are respected
    - Verify ASSIGNED_TO relationships are created
    - _Requirements: 8.1-8.10_

  - [ ] 25.4 Run full test suite
    - Run all unit tests
    - Run all integration tests
    - Run all property tests
    - Verify 80% code coverage
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end API functionality
- **New tasks (15-25)** implement the graph database entity structure with Projects, Phases, Workpackages, Resources, and Departments
- **Users remain in PostgreSQL** - they are NOT created as graph nodes
- **Resources are graph nodes** - they are the project management entities used for scheduling

# Implementation Tasks: Backend Schedule API

## Overview

This task list implements the backend schedule API with dual-methodology project management (classic + agile), graph database integration using Apache AGE, and skill-based resource allocation.

**Key Features:**
- Company → Department → Resource organizational hierarchy
- Tasks as WorkItem nodes (type='task') - integrated with requirements, risks, tests
- Milestones as separate Milestone nodes - used only for project scheduling
- Skills-based resource matching
- Mutually exclusive Backlog/Sprint relationships
- Resource allocation with lead flag
- Department-based resource allocation

---

## Phase 1: Graph Database Schema Setup

### Task 1.1: Create Company Node Type
- [x] Create Company vertex label in Apache AGE graph
- [x] Add Company node creation in graph service
- [x] Add Company CRUD endpoints
- [x] Write unit tests for Company operations
- [x] Write property test: Company nodes have valid UUIDs

**Details:**
- Properties: id, name, description, created_at, updated_at
- Endpoint: POST /api/v1/companies
- Endpoint: GET /api/v1/companies/{id}
- Endpoint: PUT /api/v1/companies/{id}
- Endpoint: DELETE /api/v1/companies/{id}

### Task 1.2: Update Department Node Type
- [x] Add company_id property to Department nodes
- [x] Create PARENT_OF relationship from Company to Department
- [x] Update Department creation to require company_id
- [x] Update Department endpoints to include company relationship
- [x] Write migration script for existing Departments
- [x] Write unit tests for Company-Department relationship
- [x] Write property test: All Departments belong to a Company

**Details:**
- Add company_id to Department properties
- Update graph queries to include Company relationship
- Migration: Assign existing departments to default company

### Task 1.3: Add Task-Specific Properties to WorkItem
- [x] Add skills_needed property to WorkItem(type='task') (array of strings)
- [x] Add workpackage_id property to WorkItem(type='task') for quick lookup
- [x] Add story_points property to WorkItem(type='task')
- [x] Add done property to WorkItem(type='task')
- [x] Add start_date, end_date, due_date properties to WorkItem(type='task')
- [x] Update WorkItem schemas to include task-specific properties
- [x] Write unit tests for task properties
- [x] Write property test: skills_needed is always an array
- [x] Write property test: All tasks have valid workpackage_id when assigned

**Details:**
- Tasks remain as WorkItem nodes with type='task'
- Properties: skills_needed (for resource matching), workpackage_id (for quick lookup), story_points, done, start_date, end_date, due_date
- No separate Task node type - use existing WorkItem infrastructure

### Task 1.4: Create Milestone Node Type
- [x] Create Milestone vertex label in Apache AGE graph
- [x] Add Milestone node creation in graph service
- [x] Create Milestone schemas (MilestoneBase, MilestoneCreate, MilestoneUpdate, MilestoneResponse)
- [x] Add validation for target_date (must be future date for new milestones)
- [x] Add validation for is_manual_constraint (boolean)
- [x] Create MilestoneService for CRUD operations
- [x] Add Milestone CRUD endpoints
- [x] Write unit tests for Milestone operations
- [x] Write property test: is_manual_constraint is always boolean
- [x] Write property test: All milestones have valid project_id

**Details:**
- Milestones are separate Milestone nodes (NOT WorkItem)
- Properties: id, title, description, target_date, is_manual_constraint, completion_criteria, status, project_id, version, created_by, created_at, updated_at
- Query pattern: `MATCH (m:Milestone)` not `MATCH (w:WorkItem {type: 'milestone'})`
- Used exclusively for project scheduling, not general work tracking
- No versioning/signing complexity like WorkItems

### Task 1.5: Create LINKED_TO_DEPARTMENT Relationship
- [ ] Create LINKED_TO_DEPARTMENT edge label in Apache AGE
- [ ] Add relationship creation in graph service
- [ ] Add endpoint: POST /api/v1/workpackages/{id}/link-department/{dept_id}
- [ ] Add endpoint: DELETE /api/v1/workpackages/{id}/link-department/{dept_id}
- [ ] Add endpoint: GET /api/v1/workpackages/{id}/department
- [ ] Write unit tests for department linking
- [ ] Write property test: Workpackage can link to at most one Department

**Details:**
- From: Workpackage
- To: Department
- Properties: None
- Purpose: Department-based resource allocation

### Task 1.6: Update ALLOCATED_TO Relationship
- [ ] Add "lead" boolean property to ALLOCATED_TO relationship
- [ ] Update relationship to support Project OR Task targets
- [ ] Update graph service to handle dual target types
- [ ] Update resource allocation endpoints
- [ ] Write migration script: Add lead=false to existing allocations
- [ ] Write unit tests for lead flag functionality
- [ ] Write property test: lead is always boolean
- [ ] Write property test: Resource allocated to Project XOR Task

**Details:**
- Properties: allocation_percentage, lead, start_date, end_date
- lead=true: Primary/responsible resource
- lead=false: Supporting/collaborating resource

### Task 1.7: Update Backlog/Sprint Relationships (Mutual Exclusivity)
- [ ] Add constraint validation: Task cannot have both IN_BACKLOG and ASSIGNED_TO_SPRINT
- [ ] Update sprint assignment to remove IN_BACKLOG relationship
- [ ] Update backlog addition to remove ASSIGNED_TO_SPRINT relationship
- [ ] Add endpoint: POST /api/v1/tasks/{id}/move-to-backlog
- [ ] Add endpoint: POST /api/v1/tasks/{id}/move-to-sprint/{sprint_id}
- [ ] Write unit tests for mutual exclusivity
- [ ] Write property test: Task has IN_BACKLOG XOR ASSIGNED_TO_SPRINT XOR neither
- [ ] Write property test: Moving to sprint removes backlog relationship

**Details:**
- Enforce: A task can be IN_BACKLOG OR ASSIGNED_TO_SPRINT, never both
- When assigned to sprint → remove IN_BACKLOG
- When removed from sprint → create IN_BACKLOG (if status="ready")

### Task 1.8: Create Additional Task Relationships
- [ ] Create has_risk edge label in Apache AGE
- [ ] Create implements edge label in Apache AGE
- [ ] Add has_risk relationship creation in graph service
- [ ] Add implements relationship creation in graph service
- [ ] Add endpoint: POST /api/v1/tasks/{id}/link-risk/{risk_id}
- [ ] Add endpoint: POST /api/v1/tasks/{id}/link-requirement/{req_id}
- [ ] Add endpoint: GET /api/v1/tasks/{id}/risks
- [ ] Add endpoint: GET /api/v1/tasks/{id}/requirements
- [ ] Write unit tests for task relationships
- [ ] Write property test: Task can have multiple has_risk relationships
- [ ] Write property test: Task can have multiple implements relationships

**Details:**
- has_risk: Task → Risk (WorkItem)
- implements: Task → Requirement (WorkItem)
- Tasks can have many domain relationships

---

## Phase 2: Pydantic Schemas

### Task 2.1: Create Company Schemas
- [ ] Create CompanyBase schema
- [ ] Create CompanyCreate schema
- [ ] Create CompanyUpdate schema
- [ ] Create CompanyResponse schema
- [ ] Add validation for company name (min 1, max 200 chars)
- [ ] Write unit tests for schema validation

### Task 2.2: Update Department Schemas
- [ ] Add company_id to DepartmentBase
- [ ] Add company relationship to DepartmentResponse
- [ ] Update DepartmentCreate to require company_id
- [ ] Write unit tests for updated schemas

### Task 2.3: Update WorkItem Schemas for Task Properties
- [ ] Update TaskBase (WorkItem) schema to include skills_needed field
- [ ] Update TaskCreate (WorkItem) schema to include task-specific properties
- [ ] Update TaskUpdate (WorkItem) schema to include task-specific properties
- [ ] Update TaskResponse (WorkItem) schema to include task-specific properties
- [ ] Add validator for skills_needed (must be array)
- [ ] Add validator for workpackage_id (must exist)
- [ ] Write unit tests for Task (WorkItem) schemas
- [ ] Write property test: skills_needed validation

**Details:**
- Tasks are WorkItem nodes with type='task'
- skills_needed: list[str] | None
- Validate skills are non-empty strings
- Use existing WorkItem schema infrastructure

### Task 2.4: Milestone Schemas Already Complete ✅
- [x] MilestoneBase schema created
- [x] MilestoneCreate schema created
- [x] MilestoneUpdate schema created
- [x] MilestoneResponse schema created
- [x] Validator for target_date added
- [x] Validator for is_manual_constraint added
- [x] Unit tests for Milestone schemas written

**Note:** Milestone schemas completed in Task 1.4

### Task 2.5: Update Resource Schemas
- [ ] Add skills field to ResourceBase (list[str])
- [ ] Add lead field to ResourceAllocation schema
- [ ] Update ResourceResponse to include skills
- [ ] Add validator for skills (non-empty strings)
- [ ] Write unit tests for updated schemas

### Task 2.6: Create Workpackage-Department Link Schemas
- [ ] Create WorkpackageDepartmentLink schema
- [ ] Create WorkpackageDepartmentLinkResponse schema
- [ ] Add validation for department_id existence
- [ ] Write unit tests for link schemas

---

## Phase 3: Service Layer

### Task 3.1: Create CompanyService
- [ ] Implement create_company method
- [ ] Implement get_company method
- [ ] Implement update_company method
- [ ] Implement delete_company method (cascade to departments)
- [ ] Implement list_companies method
- [ ] Add error handling for company operations
- [ ] Write unit tests for CompanyService
- [ ] Write property test: Company deletion cascades to departments

### Task 3.2: Update DepartmentService
- [ ] Update create_department to create PARENT_OF from Company
- [ ] Update get_department to include company relationship
- [ ] Add get_departments_by_company method
- [ ] Update delete_department to check for resources
- [ ] Write unit tests for updated DepartmentService

### Task 3.3: Update WorkItemService for Task Properties
- [ ] Update create_workitem to handle task-specific properties (skills_needed, workpackage_id, etc.)
- [ ] Update get_workitem to return task-specific properties
- [ ] Update update_workitem to handle task-specific properties
- [ ] Add automatic BELONGS_TO Workpackage relationship when workpackage_id is provided
- [ ] Add automatic IN_BACKLOG when status="ready"
- [ ] Add skills_needed handling in WorkItem creation/update
- [ ] Write unit tests for task-specific properties in WorkItemService
- [ ] Write property test: Tasks (WorkItem type='task') always belong to Workpackage
- [ ] Write property test: Ready tasks automatically in backlog

**Details:**
- Tasks are WorkItem nodes with type='task'
- Query pattern: MATCH (w:WorkItem {type: 'task'})
- Use existing WorkItemService infrastructure
- Support version history via NEXT_VERSION

### Task 3.4: MilestoneService Already Complete ✅
- [x] create_milestone method implemented (creates Milestone node)
- [x] get_milestone method implemented
- [x] update_milestone method implemented
- [x] delete_milestone method implemented
- [x] list_milestones method implemented
- [x] Milestone dependency management added
- [x] Unit tests for MilestoneService written
- [x] Property test: Milestones always belong to Project written

**Note:** MilestoneService completed in Task 1.4

### Task 3.5: Update ResourceService for Skills Matching
- [ ] Add get_resources_by_skills method
- [ ] Add match_resources_to_task method (skill-based)
- [ ] Update allocate_resource to support lead flag
- [ ] Update allocate_resource to support Project OR Task
- [ ] Add get_lead_resources method
- [ ] Write unit tests for skill matching
- [ ] Write property test: Skill matching returns resources with all required skills
- [ ] Write property test: Lead resources prioritized in allocation

**Details:**
- Match task.skills_needed with resource.skills
- Prioritize resources with lead=true
- Support both project-level and task-level allocation

### Task 3.6: Create WorkpackageDepartmentService
- [ ] Implement link_workpackage_to_department method
- [ ] Implement unlink_workpackage_from_department method
- [ ] Implement get_workpackage_department method
- [ ] Implement get_department_resources_for_workpackage method
- [ ] Write unit tests for linking service
- [ ] Write property test: Workpackage links to at most one department

### Task 3.7: Update BacklogService for Mutual Exclusivity
- [ ] Update add_task_to_backlog to check for sprint assignment
- [ ] Update add_task_to_backlog to remove ASSIGNED_TO_SPRINT if exists
- [ ] Add validation: Cannot add task to backlog if in sprint
- [ ] Write unit tests for mutual exclusivity
- [ ] Write property test: Adding to backlog removes sprint assignment

### Task 3.8: Update SprintService for Mutual Exclusivity
- [ ] Update assign_task_to_sprint to remove IN_BACKLOG
- [ ] Update remove_task_from_sprint to create IN_BACKLOG (if ready)
- [ ] Update complete_sprint to handle incomplete tasks (return to backlog)
- [ ] Add validation: Cannot assign task to sprint if in backlog
- [ ] Write unit tests for mutual exclusivity
- [ ] Write property test: Assigning to sprint removes backlog relationship
- [ ] Write property test: Sprint completion returns incomplete tasks to backlog

---

## Phase 4: Schedule Service Integration

### Task 4.1: Update SchedulerService for Skills-Based Allocation
- [ ] Add skill matching to resource allocation algorithm
- [ ] Prioritize resources with matching skills
- [ ] Prioritize lead resources in allocation
- [ ] Add get_matching_resources_for_task method
- [ ] Update schedule calculation to use skill-based matching
- [ ] Write unit tests for skill-based allocation
- [ ] Write property test: Allocated resources have required skills
- [ ] Write property test: Lead resources allocated before non-lead

**Details:**
- Match task.skills_needed with resource.skills
- Use set intersection for skill matching
- Prioritize: lead=true, then skill match quality, then capacity

### Task 4.2: Add Department-Based Resource Allocation
- [ ] Add get_department_resources method to scheduler
- [ ] Update resource allocation to check LINKED_TO_DEPARTMENT
- [ ] Prioritize department resources for workpackage tasks
- [ ] Write unit tests for department-based allocation
- [ ] Write property test: Department resources allocated to linked workpackages

**Details:**
- Query: Workpackage → LINKED_TO_DEPARTMENT → Department → BELONGS_TO → Resources
- Match skills_needed with department resource skills

### Task 4.3: Update Schedule Calculation for WorkItem Tasks
- [ ] Update schedule_project to query WorkItem nodes with type='task'
- [ ] Update task date updates to use WorkItem nodes (type='task')
- [ ] Maintain compatibility with existing schedule schemas
- [ ] Write unit tests for WorkItem task scheduling
- [ ] Write property test: Scheduled tasks have valid dates

**Details:**
- Query pattern: MATCH (w:WorkItem {type: 'task'})
- Tasks are WorkItem nodes, not separate Task nodes
- Use existing WorkItem infrastructure

### Task 4.4: Add Sprint Boundary Constraints
- [ ] Add sprint boundary validation to scheduler
- [ ] Enforce: Tasks in sprint must fit within sprint dates
- [ ] Add conflict detection for sprint capacity exceeded
- [ ] Write unit tests for sprint constraints
- [ ] Write property test: Sprint tasks scheduled within sprint boundaries

---

## Phase 5: API Endpoints

### Task 5.1: Company Endpoints
- [ ] POST /api/v1/companies - Create company
- [ ] GET /api/v1/companies - List companies
- [ ] GET /api/v1/companies/{id} - Get company
- [ ] PUT /api/v1/companies/{id} - Update company
- [ ] DELETE /api/v1/companies/{id} - Delete company (cascade)
- [ ] GET /api/v1/companies/{id}/departments - Get company departments
- [ ] Add authentication and authorization
- [ ] Write integration tests for company endpoints

### Task 5.2: Update Department Endpoints
- [ ] Update POST /api/v1/departments to require company_id
- [ ] Update GET /api/v1/departments/{id} to include company
- [ ] Add GET /api/v1/departments/{id}/company - Get department's company
- [ ] Write integration tests for updated endpoints

### Task 5.3: Task Endpoints via WorkItem API
- [ ] Update POST /api/v1/workitems to support task-specific properties (skills_needed, workpackage_id, etc.)
- [ ] Update GET /api/v1/workitems with type='task' filter to list tasks
- [ ] Update GET /api/v1/workitems/{id} to return task-specific properties
- [ ] Update PUT /api/v1/workitems/{id} to support task-specific properties
- [ ] Add POST /api/v1/workitems/{id}/link-risk/{risk_id} - Link to risk
- [ ] Add POST /api/v1/workitems/{id}/link-requirement/{req_id} - Link to requirement
- [ ] Add GET /api/v1/workitems/{id}/risks - Get task risks
- [ ] Add GET /api/v1/workitems/{id}/requirements - Get task requirements
- [ ] Add authentication and authorization
- [ ] Write integration tests for task endpoints

**Details:**
- Tasks are WorkItem nodes with type='task'
- Use existing WorkItem endpoints with type filtering
- Support filtering by skills_needed
- Support filtering by backlog/sprint status

### Task 5.4: Milestone Endpoints Already Complete ✅
- [x] POST /api/v1/milestones - Create milestone (Milestone node)
- [x] GET /api/v1/milestones - List milestones
- [x] GET /api/v1/milestones/{id} - Get milestone
- [x] PUT /api/v1/milestones/{id} - Update milestone
- [x] DELETE /api/v1/milestones/{id} - Delete milestone
- [ ] POST /api/v1/milestones/{id}/dependencies/{task_id} - Add dependency
- [ ] DELETE /api/v1/milestones/{id}/dependencies/{task_id} - Remove dependency
- [ ] GET /api/v1/milestones/{id}/dependencies - Get dependencies
- [x] Authentication and authorization added
- [x] Integration tests for milestone endpoints written

**Note:** Basic Milestone endpoints completed in Task 1.4. Dependency management endpoints still needed.

### Task 5.5: Workpackage-Department Link Endpoints
- [ ] POST /api/v1/workpackages/{id}/link-department/{dept_id} - Link to department
- [ ] DELETE /api/v1/workpackages/{id}/link-department - Unlink department
- [ ] GET /api/v1/workpackages/{id}/department - Get linked department
- [ ] GET /api/v1/workpackages/{id}/available-resources - Get department resources
- [ ] Write integration tests for linking endpoints

### Task 5.6: Update Resource Allocation Endpoints
- [ ] Update POST /api/v1/resources/{id}/allocate to support lead flag
- [ ] Update POST /api/v1/resources/{id}/allocate to support Project OR Task
- [ ] Add GET /api/v1/resources/match-skills - Match resources by skills
- [ ] Add GET /api/v1/tasks/{id}/recommended-resources - Get skill-matched resources
- [ ] Add GET /api/v1/projects/{id}/lead-resources - Get lead resources
- [ ] Write integration tests for allocation endpoints

### Task 5.7: Update Backlog Endpoints for Mutual Exclusivity
- [ ] Update POST /api/v1/backlogs/{id}/tasks/{task_id} to remove sprint assignment
- [ ] Add validation: Cannot add task already in sprint
- [ ] Add GET /api/v1/tasks/{id}/backlog-status - Check if in backlog
- [ ] Write integration tests for backlog mutual exclusivity

### Task 5.8: Update Sprint Endpoints for Mutual Exclusivity
- [ ] Update POST /api/v1/sprints/{id}/tasks/{task_id} to remove backlog relationship
- [ ] Update DELETE /api/v1/sprints/{id}/tasks/{task_id} to return to backlog
- [ ] Update POST /api/v1/sprints/{id}/complete to handle incomplete tasks
- [ ] Add validation: Cannot assign task already in backlog
- [ ] Add GET /api/v1/tasks/{id}/sprint-status - Check if in sprint
- [ ] Write integration tests for sprint mutual exclusivity

---

## Phase 6: Frontend Integration

### Task 6.1: Update TypeScript Interfaces
- [ ] Add Company interface
- [ ] Update Department interface with company_id
- [ ] Update Task interface with skills_needed
- [ ] Update Milestone interface (separate from WorkItem)
- [ ] Add ResourceAllocation interface with lead flag
- [ ] Add WorkpackageDepartmentLink interface
- [ ] Write type tests for new interfaces

### Task 6.2: Update API Service
- [ ] Add CompanyService methods
- [ ] Update DepartmentService methods
- [ ] Update WorkItemService methods for task-specific properties (skills_needed, etc.)
- [ ] Milestone API service methods already complete ✅
- [ ] Update ResourceService for skills and lead flag
- [ ] Add WorkpackageDepartmentService methods
- [ ] Write unit tests for API service methods

**Details:**
- Tasks use WorkItem API with type='task' filter
- Milestones use separate Milestone API (already implemented)

### Task 6.3: Create Company Management UI
- [ ] Create CompanyList component
- [ ] Create CompanyForm component
- [ ] Create CompanyDetail component
- [ ] Add company CRUD operations
- [ ] Add company-department hierarchy view
- [ ] Write component tests

### Task 6.4: Update Task Form for Skills
- [ ] Add skills_needed multi-select field
- [ ] Add skill autocomplete/suggestions
- [ ] Add recommended resources display (skill-matched)
- [ ] Update task creation to include skills
- [ ] Write component tests

### Task 6.5: Update Resource Allocation UI
- [ ] Add lead checkbox to resource allocation form
- [ ] Add skill matching indicator
- [ ] Add lead resource badge/indicator
- [ ] Update resource allocation to support Project OR Task
- [ ] Write component tests

### Task 6.6: Update Workpackage UI for Department Linking
- [ ] Add department selection to workpackage form
- [ ] Add department resources display
- [ ] Add link/unlink department actions
- [ ] Write component tests

### Task 6.7: Update Backlog/Sprint UI for Mutual Exclusivity
- [ ] Add visual indicator: Task in backlog vs. sprint
- [ ] Disable sprint assignment for tasks in backlog
- [ ] Disable backlog addition for tasks in sprint
- [ ] Add "Move to Sprint" action (removes from backlog)
- [ ] Add "Return to Backlog" action (removes from sprint)
- [ ] Write component tests

---

## Phase 7: Testing

### Task 7.1: Property-Based Tests for Graph Constraints
- [ ] Write property test: Company → Department hierarchy is acyclic
- [ ] Write property test: All Tasks (WorkItem type='task') belong to exactly one Workpackage
- [ ] Write property test: Task (WorkItem) has IN_BACKLOG XOR ASSIGNED_TO_SPRINT XOR neither
- [ ] Write property test: Resource allocated to Project XOR Task (not both)
- [ ] Write property test: Workpackage links to at most one Department
- [ ] Write property test: All Milestones belong to exactly one Project

**Validates: Requirements 16.1-16.78**

**Details:**
- Tasks are WorkItem nodes with type='task'
- Milestones are separate Milestone nodes

### Task 7.2: Property-Based Tests for Skills Matching
- [ ] Write property test: Allocated resources have all required skills
- [ ] Write property test: Lead resources prioritized in allocation
- [ ] Write property test: Department resources match workpackage tasks
- [ ] Write property test: Skill matching returns non-empty set when matches exist

**Validates: Requirements 16.19-16.22, 16.27-16.35**

### Task 7.3: Property-Based Tests for Mutual Exclusivity
- [ ] Write property test: Adding to backlog removes sprint assignment
- [ ] Write property test: Assigning to sprint removes backlog relationship
- [ ] Write property test: Sprint completion returns incomplete tasks to backlog
- [ ] Write property test: Task status="ready" creates IN_BACKLOG if not in sprint

**Validates: Requirements 16.41-16.46, 21.7-21.16, 22.10-22.23**

### Task 7.4: Integration Tests for Complete Workflows
- [ ] Test: Create company → department → resource → project workflow
- [ ] Test: Create task → assign skills → match resources → allocate
- [ ] Test: Create task → ready status → backlog → sprint → complete
- [ ] Test: Link workpackage to department → allocate department resources
- [ ] Test: Create milestone → add dependencies → schedule with constraints
- [ ] Test: Sprint incomplete → tasks return to backlog

### Task 7.5: Performance Tests
- [ ] Test: Schedule calculation with 1000 tasks and skill matching
- [ ] Test: Resource matching query performance (1000 resources)
- [ ] Test: Graph traversal performance (deep hierarchy)
- [ ] Test: Concurrent schedule calculations

---

## Phase 8: Migration and Deployment

### Task 8.1: Data Migration Scripts
- [ ] Write migration: Create Company nodes for existing data
- [ ] Write migration: Add company_id to existing Departments
- [ ] Write migration: Add task-specific properties to existing WorkItem(type='task') nodes
- [ ] Write migration: Add lead=false to existing ALLOCATED_TO relationships
- [ ] Write migration: Add skills=[] to existing Resources
- [ ] Test migrations on staging data
- [ ] Write rollback scripts

**Details:**
- NO conversion needed - Tasks remain as WorkItem(type='task')
- Milestones already implemented as separate nodes
- Only add new properties to existing WorkItem tasks

### Task 8.2: Database Schema Updates
- [ ] Create Company vertex label in AGE
- [ ] Create Milestone vertex label in AGE (already done ✅)
- [ ] Create LINKED_TO_DEPARTMENT edge label
- [ ] Create has_risk edge label
- [ ] Create implements edge label
- [ ] Update ALLOCATED_TO edge properties
- [ ] Create indexes for performance

**Details:**
- NO Task vertex label needed - Tasks use WorkItem label with type='task'
- Milestone vertex label already created in Task 1.4
- Focus on relationships and new organizational entities

### Task 8.3: Documentation Updates
- [ ] Update API documentation (OpenAPI/Swagger)
- [ ] Update graph schema documentation
- [ ] Create migration guide
- [ ] Update user guide for new features
- [ ] Document that Tasks remain as WorkItem(type='task'), not separate nodes
- [ ] Document that Milestones are separate Milestone nodes

**Details:**
- Clarify architecture: Tasks = WorkItem nodes, Milestones = Milestone nodes
- Document query patterns for both entity types
- Explain rationale for architectural decisions

### Task 8.4: Deployment
- [ ] Deploy database schema changes
- [ ] Run data migrations
- [ ] Deploy backend services
- [ ] Deploy frontend updates
- [ ] Verify health checks
- [ ] Monitor for errors

---

## Summary

**Total Tasks**: 8 phases, 48 main tasks, ~200 sub-tasks

**Estimated Effort**: 
- Phase 1 (Graph Schema): 2-3 weeks
- Phase 2 (Schemas): 1 week
- Phase 3 (Services): 2-3 weeks
- Phase 4 (Scheduler): 1-2 weeks
- Phase 5 (API): 2 weeks
- Phase 6 (Frontend): 2-3 weeks
- Phase 7 (Testing): 2 weeks
- Phase 8 (Migration): 1 week

**Total**: 13-17 weeks

**Critical Path**:
1. Graph schema setup (Phase 1)
2. Service layer (Phase 3)
3. Scheduler integration (Phase 4)
4. API endpoints (Phase 5)
5. Frontend integration (Phase 6)

**Dependencies**:
- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 1, 2
- Phase 4 depends on Phase 3
- Phase 5 depends on Phase 3, 4
- Phase 6 depends on Phase 5
- Phase 7 can run in parallel with Phases 4-6
- Phase 8 depends on all previous phases

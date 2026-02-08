# Implementation Plan: Template Graph Entities

## Overview

This implementation extends the RxDx template system to support all graph database entities (Companies, Departments, Resources, Projects, Sprints, Phases, Workpackages, Backlogs, Milestones) with their relationships. The implementation follows the existing template system architecture and maintains backward compatibility.

## Tasks

- [ ] 1. Extend JSON Schema for graph entities
  - Update `backend/templates/schema.json` to add schemas for all new entity types
  - Add Company, Department, Resource schemas
  - Add Project, Sprint, Phase, Workpackage, Backlog, Milestone schemas
  - Extend relationship types enum to include new relationship types
  - Add validation rules for properties (enums, ranges, formats)
  - _Requirements: 1.1-1.6, 2.1-2.3, 7.1, 12.1-12.10_

- [ ] 2. Extend Pydantic schemas for graph entities
  - [ ] 2.1 Add new enumerations to `backend/app/schemas/template.py`
    - Add ResourceType, ResourceAvailability, ProjectStatus, SprintStatus, MilestoneStatus enums
    - Extend RelationshipType enum with new types (ASSIGNED_TO_SPRINT, IN_BACKLOG, LINKED_TO_DEPARTMENT, ALLOCATED_TO, PARENT_OF, BELONGS_TO)
    - _Requirements: 7.5, 11.1-11.11_
  
  - [ ] 2.2 Add entity schemas to `backend/app/schemas/template.py`
    - Add TemplateCompany, TemplateDepartment, TemplateResource schemas
    - Add TemplateProject, TemplateSprint, TemplatePhase, TemplateWorkpackage, TemplateBacklog, TemplateMilestone schemas
    - Add field validators for date constraints (sprint end_date > start_date)
    - Add field validators for order constraints (phase.order >= 1, workpackage.order >= 1)
    - _Requirements: 1.1-1.6, 2.1-2.3, 12.1, 12.6, 12.7_
  
  - [ ] 2.3 Extend TemplateRelationshipExtended schema
    - Add allocation_percentage and lead fields
    - Add validators to ensure these fields are only set for ALLOCATED_TO relationships
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 2.4 Update TemplateDefinition schema
    - Add fields for all new entity types (companies, departments, resources, projects, sprints, phases, workpackages, backlogs, milestones)
    - Update relationships field to use TemplateRelationshipExtended
    - _Requirements: 1.1-1.6, 2.1-2.3, 9.3_

- [ ] 2.5 Write property test for Pydantic schema validation
  - **Property 15: Schema Validation**
  - **Validates: Requirements 7.1**

- [ ] 3. Extend template validator
  - [ ] 3.1 Add graph entity reference validation to `backend/app/services/template_validator.py`
    - Add validate_graph_entity_references method
    - Validate company_id references in departments
    - Validate department_id references in resources
    - Validate project_id references in sprints, phases, backlogs, milestones
    - Validate phase_id references in workpackages
    - Validate manager_user_id references in departments
    - _Requirements: 2.6, 7.2, 10.4_
  
  - [ ] 3.2 Add relationship constraint validation
    - Add validate_relationship_constraints method
    - Validate task-sprint/backlog mutual exclusivity
    - Validate workpackage single-department constraint
    - Validate ALLOCATED_TO relationships have allocation_percentage
    - Validate allocation_percentage is between 0 and 100
    - _Requirements: 3.3, 4.2, 5.3, 7.3_
  
  - [ ] 3.3 Add date constraint validation
    - Validate sprint start_date < end_date in validate_constraints method
    - _Requirements: 7.4, 12.1_
  
  - [ ] 3.4 Update validate_references method
    - Extend to validate all new relationship types
    - Validate entity references for new relationship types
    - _Requirements: 3.5, 4.3, 5.4, 7.2_

- [ ] 3.5 Write property tests for validation
  - **Property 3: User Reference Validation**
  - **Property 5: Task Assignment Mutual Exclusivity**
  - **Property 6: Sprint and Backlog Reference Validation**
  - **Property 8: Workpackage Single Department Constraint**
  - **Property 9: Workpackage-Department Reference Validation**
  - **Property 11: Allocation Percentage Validation**
  - **Property 12: Resource Allocation Reference Validation**
  - **Property 16: Entity Reference Validation**
  - **Property 17: Relationship Constraint Validation**
  - **Property 18: Date Constraint Validation**
  - **Property 19: Comprehensive Error Collection**
  - **Property 23: Sprint Date Validation**
  - **Property 24: Property Validation**
  - **Validates: Requirements 2.6, 3.3, 3.5, 4.2, 4.3, 5.3, 5.4, 7.2, 7.3, 7.4, 7.6, 12.1-12.10**

- [ ] 4. Checkpoint - Ensure validation tests pass
  - Ensure all validation tests pass, ask the user if questions arise.

- [ ] 5. Extend template service for graph entities
  - [ ] 5.1 Add _apply_companies method to `backend/app/services/template_service.py`
    - Generate deterministic UUIDs for companies
    - Check for existing companies
    - Create Company nodes in graph database
    - Return results and company_map
    - _Requirements: 2.1, 4.1, 6.1, 6.3_
  
  - [ ] 5.2 Add _apply_departments method
    - Generate deterministic UUIDs for departments
    - Check for existing departments
    - Create Department nodes in graph database
    - Create PARENT_OF relationships from companies to departments
    - Return results and department_map
    - _Requirements: 2.2, 2.4, 4.1, 6.1, 6.3_
  
  - [ ] 5.3 Add _apply_resources method
    - Generate deterministic UUIDs for resources
    - Check for existing resources
    - Create Resource nodes in graph database
    - Create BELONGS_TO relationships from resources to departments
    - Return results and resource_map
    - _Requirements: 2.3, 2.5, 4.1, 6.1, 6.3_
  
  - [ ] 5.4 Add _apply_projects method
    - Generate deterministic UUIDs for projects
    - Check for existing projects
    - Create Project nodes in graph database
    - Return results and project_map
    - _Requirements: 1.1, 4.1, 6.1, 6.3_
  
  - [ ] 5.5 Add _apply_sprints method
    - Generate deterministic UUIDs for sprints
    - Check for existing sprints
    - Create Sprint nodes in graph database
    - Create BELONGS_TO relationships from sprints to projects
    - Return results and sprint_map
    - _Requirements: 1.2, 1.7, 4.1, 6.1, 6.3_
  
  - [ ] 5.6 Add _apply_phases method
    - Generate deterministic UUIDs for phases
    - Check for existing phases
    - Create Phase nodes in graph database
    - Create BELONGS_TO relationships from phases to projects
    - Return results and phase_map
    - _Requirements: 1.3, 1.7, 4.1, 6.1, 6.3_
  
  - [ ] 5.7 Add _apply_workpackages method
    - Generate deterministic UUIDs for workpackages
    - Check for existing workpackages
    - Create Workpackage nodes in graph database
    - Create BELONGS_TO relationships from workpackages to phases
    - Return results and workpackage_map
    - _Requirements: 1.4, 1.7, 4.1, 6.1, 6.3_
  
  - [ ] 5.8 Add _apply_backlogs method
    - Generate deterministic UUIDs for backlogs
    - Check for existing backlogs
    - Create Backlog nodes in graph database
    - Create BELONGS_TO relationships from backlogs to projects
    - Return results and backlog_map
    - _Requirements: 1.6, 1.7, 4.1, 6.1, 6.3_
  
  - [ ] 5.9 Add _apply_milestones method
    - Generate deterministic UUIDs for milestones
    - Check for existing milestones
    - Create Milestone nodes in graph database
    - Create BELONGS_TO relationships from milestones to projects
    - Return results and milestone_map
    - _Requirements: 1.5, 1.7, 4.1, 6.1, 6.3_
  
  - [ ] 5.10 Update apply_template method
    - Add calls to all new _apply_* methods in correct order
    - Pass entity maps between methods for reference resolution
    - Maintain backward compatibility (new sections are optional)
    - _Requirements: 9.1, 9.2, 10.1_
  
  - [ ] 5.11 Update _apply_relationships method
    - Extend to handle new relationship types
    - Handle ASSIGNED_TO_SPRINT and IN_BACKLOG relationships
    - Handle LINKED_TO_DEPARTMENT relationships
    - Handle ALLOCATED_TO relationships with properties
    - Handle PARENT_OF and BELONGS_TO relationships
    - _Requirements: 3.1, 3.2, 4.1, 5.1, 5.2, 11.1-11.11_

- [ ] 5.12 Write property tests for entity creation
  - **Property 1: Project Management Entity Creation**
  - **Property 2: Organizational Entity Creation**
  - **Property 4: Sprint and Backlog Assignment**
  - **Property 7: Workpackage-Department Linking**
  - **Property 10: Resource Allocation Creation**
  - **Property 13: Deterministic UUID Generation**
  - **Property 14: Template Application Idempotency**
  - **Property 21: Entity Creation Order**
  - **Property 22: Relationship Type Support**
  - **Validates: Requirements 1.1-1.7, 2.1-2.5, 3.1, 3.2, 4.1, 5.1, 5.2, 6.1, 6.3, 10.1, 11.1-11.11**

- [ ] 6. Checkpoint - Ensure service tests pass
  - Ensure all service tests pass, ask the user if questions arise.

- [ ] 7. Create comprehensive example template
  - [ ] 7.1 Create `backend/templates/gantt-chart-demo-full.yaml`
    - Include all entity types (companies, departments, resources, projects, sprints, phases, workpackages, backlogs, milestones, workitems)
    - Include all relationship types
    - Demonstrate complete project structure
    - _Requirements: 8.2, 8.5_

- [ ] 8. Create modular example templates
  - [ ] 8.1 Create `backend/templates/modular/company-acme.yaml`
    - Define Acme Corp company with departments and resources
    - _Requirements: 13.3_
  
  - [ ] 8.2 Create `backend/templates/modular/users-acme.yaml`
    - Define users for Acme Corp
    - _Requirements: 13.3_
  
  - [ ] 8.3 Create `backend/templates/modular/project-medical-device.yaml`
    - Define medical device project with sprints, phases, workpackages, backlogs, milestones
    - Reference users from users-acme.yaml using deterministic UUIDs
    - _Requirements: 13.2, 13.3, 13.5_
  
  - [ ] 8.4 Create `backend/templates/modular/requirements-medical-device.yaml`
    - Define requirements, tasks, tests, risks for medical device project
    - Reference project entities from project-medical-device.yaml
    - _Requirements: 13.2, 13.3, 13.5_

- [ ] 8.5 Write property tests for modular templates
  - **Property 25: Modular Template Composition**
  - **Property 26: Cross-Template Entity References**
  - **Property 27: Flexible Application Order**
  - **Validates: Requirements 13.1, 13.2, 13.4**

- [ ] 9. Update documentation
  - [ ] 9.1 Update `backend/templates/README.md`
    - Document all new entity types and their properties
    - Document all new relationship types
    - Provide examples for each entity type
    - Explain modular template composition
    - Explain cross-template entity references
    - Provide template naming conventions
    - _Requirements: 8.1, 8.3, 13.7, 13.8_
  
  - [ ] 9.2 Add migration guide
    - Document how to extend existing templates with graph entities
    - Provide before/after examples
    - _Requirements: 8.3_

- [ ] 10. Write integration tests
  - Test complete template application with all entity types
  - Test modular template application in sequence
  - Test backward compatibility with existing templates
  - Test dry-run mode
  - Test error scenarios
  - **Property 20: Backward Compatibility**
  - **Validates: Requirements 9.1, 9.2**

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Run full test suite (unit tests, property tests, integration tests)
  - Verify test coverage meets requirements (>80%)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- The implementation maintains backward compatibility with existing templates
- Modular templates enable separation of concerns (company structure, users, projects, requirements)

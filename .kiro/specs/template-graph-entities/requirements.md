# Requirements Document

## Introduction

The RxDx template system currently supports creating Users (PostgreSQL) and WorkItems (graph database) with relationships between workitems. However, the system uses Apache AGE graph database to model organizational structures and project management entities that cannot be created through templates. This feature extends the template system to support all graph database entities, enabling complete project and organizational structure definition in templates.

## Glossary

- **Template**: YAML file defining project structure, users, workitems, and graph entities
- **Graph_Entity**: Node in the Apache AGE graph database (Company, Department, Resource, Project, Sprint, Phase, Workpackage, Backlog, Milestone)
- **WorkItem**: Specialized graph entity for requirements, tasks, tests, and risks
- **Relationship**: Directed edge between graph nodes (e.g., BELONGS_TO, PARENT_OF, ALLOCATED_TO)
- **Deterministic_UUID**: UUID generated from template name and entity ID for idempotency
- **Template_Service**: Backend service that parses and applies templates
- **Graph_Service**: Backend service that interacts with Apache AGE graph database
- **Idempotent**: Operation that produces the same result when applied multiple times

## Requirements

### Requirement 1: Project Structure Definition

**User Story:** As a project manager, I want to define complete project structures in templates, so that I can quickly set up new projects with sprints, phases, workpackages, backlogs, and milestones.

#### Acceptance Criteria

1. WHEN a template defines Project nodes, THE Template_Service SHALL create Project nodes in the graph database with all specified properties (id, name, status, created_at, updated_at)
2. WHEN a template defines Sprint nodes, THE Template_Service SHALL create Sprint nodes linked to projects with all specified properties (id, name, goal, start_date, end_date, status, project_id, capacity_hours, capacity_story_points, actual_velocity_hours, actual_velocity_story_points, created_at, updated_at)
3. WHEN a template defines Phase nodes, THE Template_Service SHALL create Phase nodes linked to projects with all specified properties (id, name, order, created_at)
4. WHEN a template defines Workpackage nodes, THE Template_Service SHALL create Workpackage nodes linked to phases with all specified properties (id, name, order, phase_id, created_at)
5. WHEN a template defines Milestone nodes, THE Template_Service SHALL create Milestone nodes linked to projects with all specified properties (id, name, due_date, status, project_id, created_at)
6. WHEN a template defines Backlog nodes, THE Template_Service SHALL create Backlog nodes linked to projects with all specified properties (id, name, project_id, created_at)
7. WHEN project entities are created, THE Template_Service SHALL create BELONGS_TO relationships from child entities to parent entities (Sprint->Project, Phase->Project, Workpackage->Phase, Milestone->Project, Backlog->Project)

### Requirement 2: Organizational Structure Definition

**User Story:** As an organization admin, I want to define organizational structures in templates, so that I can set up companies, departments, and resources with their relationships.

#### Acceptance Criteria

1. WHEN a template defines Company nodes, THE Template_Service SHALL create Company nodes in the graph database with all specified properties (id, name, description, created_at, updated_at)
2. WHEN a template defines Department nodes, THE Template_Service SHALL create Department nodes with all specified properties (id, name, description, manager_user_id, company_id, created_at)
3. WHEN a template defines Resource nodes, THE Template_Service SHALL create Resource nodes with all specified properties (id, name, type, capacity, department_id, skills, availability, created_at)
4. WHEN organizational entities are created, THE Template_Service SHALL create PARENT_OF relationships from companies to departments
5. WHEN organizational entities are created, THE Template_Service SHALL create BELONGS_TO relationships from resources to departments
6. WHEN a Department references a manager_user_id, THE Template_Service SHALL validate that the user exists before creating the department

### Requirement 3: Sprint and Backlog Task Assignment

**User Story:** As a project manager, I want to assign tasks to sprints or backlogs in templates, so that sprint planning is pre-configured.

#### Acceptance Criteria

1. WHEN a template defines ASSIGNED_TO_SPRINT relationships, THE Template_Service SHALL create relationships from tasks to sprints in the graph database
2. WHEN a template defines IN_BACKLOG relationships, THE Template_Service SHALL create relationships from tasks to backlogs in the graph database
3. WHEN a task is assigned to a sprint, THE Template_Service SHALL validate that the task is not already in a backlog (mutual exclusivity)
4. WHEN a task is assigned to a backlog, THE Template_Service SHALL validate that the task is not already in a sprint (mutual exclusivity)
5. WHEN creating sprint or backlog assignments, THE Template_Service SHALL validate that the referenced sprint, backlog, and task entities exist

### Requirement 4: Workpackage-Department Linking

**User Story:** As a project manager, I want to link workpackages to departments in templates, so that resource allocation is pre-configured.

#### Acceptance Criteria

1. WHEN a template defines LINKED_TO_DEPARTMENT relationships, THE Template_Service SHALL create relationships from workpackages to departments in the graph database
2. WHEN a workpackage is linked to a department, THE Template_Service SHALL enforce that a workpackage can only link to one department
3. WHEN creating workpackage-department links, THE Template_Service SHALL validate that the referenced workpackage and department entities exist

### Requirement 5: Resource Allocation

**User Story:** As a resource manager, I want to allocate resources to projects and tasks in templates, so that resource planning is pre-configured.

#### Acceptance Criteria

1. WHEN a template defines ALLOCATED_TO relationships for projects, THE Template_Service SHALL create relationships from resources to projects with allocation_percentage and lead properties
2. WHEN a template defines ALLOCATED_TO relationships for tasks, THE Template_Service SHALL create relationships from resources to tasks with allocation_percentage and lead properties
3. WHEN creating resource allocations, THE Template_Service SHALL validate that allocation_percentage is between 0 and 100
4. WHEN creating resource allocations, THE Template_Service SHALL validate that the referenced resource, project, and task entities exist
5. WHEN creating resource allocations, THE Template_Service SHALL validate that lead is a boolean value

### Requirement 6: Deterministic UUID Generation

**User Story:** As a template author, I want deterministic UUID generation for all graph entities, so that templates are idempotent and can be safely re-applied.

#### Acceptance Criteria

1. FOR ALL graph entities, THE Template_Service SHALL generate UUIDs using the deterministic UUID function based on template name and entity ID
2. WHEN a template is applied multiple times, THE Template_Service SHALL generate identical UUIDs for the same entities
3. WHEN an entity with a generated UUID already exists, THE Template_Service SHALL skip creation and log the skipped entity
4. WHEN applying a template, THE Template_Service SHALL check for existing entities before attempting creation

### Requirement 7: Comprehensive Validation

**User Story:** As a template author, I want comprehensive validation for graph entities, so that I catch errors before template application.

#### Acceptance Criteria

1. WHEN a template is validated, THE Template_Service SHALL validate all graph entity structures against the JSON Schema
2. WHEN a template is validated, THE Template_Service SHALL check that all entity references are resolvable (e.g., project_id references an existing project)
3. WHEN a template is validated, THE Template_Service SHALL check relationship constraints (e.g., workpackage can only link to one department, task cannot be in both sprint and backlog)
4. WHEN a template is validated, THE Template_Service SHALL check date constraints (e.g., sprint end_date must be after start_date)
5. WHEN a template is validated, THE Template_Service SHALL check enum values (e.g., resource type must be person/machine/equipment/facility/other, sprint status must be planning/active/completed/cancelled)
6. WHEN validation fails, THE Template_Service SHALL return all validation errors, not just the first error
7. WHEN validation fails, THE Template_Service SHALL provide clear error messages indicating the field path, invalid value, and expected format

### Requirement 8: Documentation and Examples

**User Story:** As a developer, I want clear documentation and examples, so that I can create templates with graph entities.

#### Acceptance Criteria

1. THE JSON Schema SHALL document all graph entity properties with descriptions, types, and constraints
2. THE Template_Service SHALL provide an example template that includes all graph entity types
3. THE Template_Service SHALL provide README documentation explaining the template structure for graph entities
4. WHEN validation errors occur, THE Template_Service SHALL provide error messages that clearly indicate what's wrong and how to fix it
5. THE example template SHALL demonstrate all relationship types including new ones (ASSIGNED_TO_SPRINT, IN_BACKLOG, LINKED_TO_DEPARTMENT, ALLOCATED_TO)

### Requirement 9: Backward Compatibility

**User Story:** As a system administrator, I want existing templates to continue working, so that template system upgrades don't break existing functionality.

#### Acceptance Criteria

1. WHEN an existing template without graph entities is applied, THE Template_Service SHALL process it successfully without errors
2. WHEN the template schema is extended, THE Template_Service SHALL maintain backward compatibility with existing template structures
3. WHEN new graph entity sections are added to the schema, THE Template_Service SHALL make them optional (not required)

### Requirement 10: Application Order and Dependencies

**User Story:** As a template author, I want entities to be created in the correct order, so that dependencies are satisfied and relationships can be established.

#### Acceptance Criteria

1. WHEN a template is applied, THE Template_Service SHALL create entities in this order: Users, Companies, Departments, Resources, Projects, Phases, Workpackages, Sprints, Backlogs, Milestones, WorkItems, Relationships
2. WHEN creating relationships, THE Template_Service SHALL validate that both source and target entities exist
3. WHEN a relationship references a non-existent entity, THE Template_Service SHALL return a validation error with the missing entity ID
4. WHEN creating entities with foreign key references (e.g., department.manager_user_id), THE Template_Service SHALL validate that the referenced entity exists

### Requirement 11: Extended Relationship Types

**User Story:** As a template author, I want to define all relationship types in templates, so that I can model complete project structures.

#### Acceptance Criteria

1. THE Template_Service SHALL support IMPLEMENTS relationships (Task -> Requirement)
2. THE Template_Service SHALL support TESTED_BY relationships (Requirement -> Test)
3. THE Template_Service SHALL support MITIGATES relationships (Requirement -> Risk)
4. THE Template_Service SHALL support DEPENDS_ON relationships (WorkItem -> WorkItem)
5. THE Template_Service SHALL support ASSIGNED_TO_SPRINT relationships (Task -> Sprint)
6. THE Template_Service SHALL support IN_BACKLOG relationships (Task -> Backlog)
7. THE Template_Service SHALL support LINKED_TO_DEPARTMENT relationships (Workpackage -> Department)
8. THE Template_Service SHALL support ALLOCATED_TO relationships (Resource -> Project or Task) with allocation_percentage and lead properties
9. THE Template_Service SHALL support PARENT_OF relationships (Company -> Department)
10. THE Template_Service SHALL support BELONGS_TO relationships (Resource -> Department, Sprint -> Project, Phase -> Project, Workpackage -> Phase, Milestone -> Project, Backlog -> Project)
11. WHEN a relationship type is not recognized, THE Template_Service SHALL return a validation error

### Requirement 12: Property Validation

**User Story:** As a template author, I want property validation for all graph entities, so that I catch data errors before template application.

#### Acceptance Criteria

1. WHEN a Sprint is defined, THE Template_Service SHALL validate that start_date is before end_date
2. WHEN a Sprint is defined, THE Template_Service SHALL validate that status is one of: planning, active, completed, cancelled
3. WHEN a Resource is defined, THE Template_Service SHALL validate that type is one of: person, machine, equipment, facility, other
4. WHEN a Resource is defined, THE Template_Service SHALL validate that availability is one of: available, unavailable, limited
5. WHEN a Milestone is defined, THE Template_Service SHALL validate that status is one of: pending, in_progress, completed, cancelled
6. WHEN a Phase is defined, THE Template_Service SHALL validate that order is a positive integer
7. WHEN a Workpackage is defined, THE Template_Service SHALL validate that order is a positive integer
8. WHEN a Resource allocation is defined, THE Template_Service SHALL validate that allocation_percentage is between 0 and 100
9. WHEN string properties are defined, THE Template_Service SHALL validate maximum length constraints
10. WHEN required properties are missing, THE Template_Service SHALL return a validation error

### Requirement 13: Modular Template Composition

**User Story:** As a template author, I want to create modular templates that can be composed together, so that I can maintain separate templates for organizational structure, users, project management, and requirements management.

#### Acceptance Criteria

1. WHEN multiple templates are applied to the same system, THE Template_Service SHALL merge entities from all templates without conflicts
2. WHEN a template references entities from another template, THE Template_Service SHALL support cross-template entity references using deterministic UUIDs
3. THE Template_Service SHALL provide example modular templates: company-structure.yaml (companies, departments, resources), users.yaml (users), project-management.yaml (projects, sprints, phases, workpackages, backlogs, milestones), requirements-management.yaml (requirements, tasks, tests, risks, relationships)
4. WHEN applying modular templates, THE Template_Service SHALL allow templates to be applied in any order as long as dependencies are satisfied
5. WHEN a modular template references an entity from another template, THE Template_Service SHALL use the same deterministic UUID generation to ensure consistency
6. WHEN a modular template is applied and a referenced entity doesn't exist, THE Template_Service SHALL return a clear validation error indicating which template should be applied first
7. THE documentation SHALL explain how to structure modular templates and how to reference entities across templates
8. THE documentation SHALL provide guidance on template naming conventions for modular templates (e.g., company-acme.yaml, users-acme.yaml, project-medical-device.yaml)

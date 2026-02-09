# Quick Start
- Start with docker compose up -d
- Apply templates with
  - docker compose exec backend uv run python scripts/seed_data.py --template TEMPLATE
  - TEMPLATE: modular/company-acme
  - TEMPLATE: modular/project-medical-device
  - TEMPLATE: modular/requirements-medical-device
  - TEMPLATE: modular/users-acme

Keep this sequence - else linking to none existing resources can cause errors

# RxDx Template System

This directory contains YAML templates for seeding the RxDx system with users, organizational structures, projects, and workitems. Templates provide a declarative way to define complex project structures that can be applied idempotently to the database.

## Table of Contents

- [Overview](#overview)
- [Template Structure](#template-structure)
- [Entity Types](#entity-types)
- [Relationship Types](#relationship-types)
- [Available Templates](#available-templates)
- [Modular Templates](#modular-templates)
- [Usage](#usage)
- [Deterministic UUIDs](#deterministic-uuids)
- [Validation](#validation)
- [Best Practices](#best-practices)

## Overview

Templates are YAML files that define:
- **Users**: User accounts with roles and permissions
- **Organizational Structure**: Companies, departments, and resources
- **Project Management**: Projects, sprints, phases, workpackages, backlogs, and milestones
- **Workitems**: Requirements, tasks, tests, and risks
- **Relationships**: Connections between entities

Templates are **idempotent** - applying the same template multiple times produces the same result as applying it once. This is achieved through deterministic UUID generation based on template name and entity IDs.

## Template Structure

Every template must include:

```yaml
metadata:
  name: template-name          # Unique template identifier
  version: 1.0.0               # Semantic version
  description: Description     # Human-readable description
  author: Author Name          # Template author

settings:
  default_password: password123  # Default password for users

users: []                      # List of users
companies: []                  # List of companies (optional)
departments: []                # List of departments (optional)
resources: []                  # List of resources (optional)
projects: []                   # List of projects (optional)
sprints: []                    # List of sprints (optional)
phases: []                     # List of phases (optional)
workpackages: []               # List of workpackages (optional)
backlogs: []                   # List of backlogs (optional)
milestones: []                 # List of milestones (optional)

workitems:
  requirements: []             # List of requirements
  tasks: []                    # List of tasks
  tests: []                    # List of tests
  risks: []                    # List of risks

relationships: []              # List of relationships
```

## Entity Types

### Users

User accounts with authentication and role-based access control.

```yaml
users:
  - id: user-admin              # Template-local ID
    email: admin@example.com    # Unique email address
    full_name: Admin User       # Full name
    role: admin                 # Role: admin, project_manager, validator, auditor, user
    is_active: true             # Account status
    password: custom123         # Optional: overrides default_password
```

**Roles:**
- `admin` - Full system access
- `project_manager` - Project management and user oversight
- `validator` - Validation and approval workflows
- `auditor` - Read-only audit access
- `user` - Standard user access

### Companies

Top-level organizational entities.

```yaml
companies:
  - id: company-acme
    name: Acme Corporation
    description: Leading medical device manufacturer
```

### Departments

Organizational units within companies.

```yaml
departments:
  - id: dept-engineering
    name: Engineering Department
    description: Software and hardware engineering
    company_id: company-acme           # Reference to company
    manager_user_id: user-manager      # Reference to user (optional)
```

### Resources

Human or equipment resources allocated to work.

```yaml
resources:
  - id: resource-dev1
    name: John Developer
    type: human                        # human or equipment
    availability: full_time            # full_time, part_time, available, unavailable
    cost_per_hour: 75.0               # Optional: hourly cost
    department_id: dept-engineering    # Reference to department
    user_id: user-dev1                # Reference to user (optional, for human resources)
```

**Resource Types:**
- `human` - Human resources (developers, testers, etc.)
- `equipment` - Equipment resources (servers, test equipment, etc.)

**Availability:**
- `full_time` - Full-time availability
- `part_time` - Part-time availability
- `available` - Available (for equipment)
- `unavailable` - Unavailable

### Projects

Top-level project containers.

```yaml
projects:
  - id: project-medical-device
    name: Medical Device Software v2.0
    description: Next generation medical device control software
    status: active                     # planning, active, on_hold, completed, cancelled
    start_date: 2024-01-01T00:00:00Z  # ISO 8601 format
    end_date: 2024-12-31T23:59:59Z    # ISO 8601 format
    owner_id: user-pm                  # Reference to user (optional)
```

**Project Status:**
- `planning` - Project in planning phase
- `active` - Active project
- `on_hold` - Project on hold
- `completed` - Completed project
- `cancelled` - Cancelled project

### Sprints

Time-boxed iterations within projects (Agile/Scrum).

```yaml
sprints:
  - id: sprint-1
    name: Sprint 1 - Foundation
    description: Core infrastructure and authentication
    start_date: 2024-01-01T00:00:00Z
    end_date: 2024-01-14T23:59:59Z
    status: completed                  # planning, active, completed, cancelled
    goal: Establish project foundation
    project_id: project-medical-device # Reference to project
```

**Sprint Status:**
- `planning` - Sprint in planning
- `active` - Active sprint
- `completed` - Completed sprint
- `cancelled` - Cancelled sprint

### Phases

Sequential project phases (Waterfall/V-Model).

```yaml
phases:
  - id: phase-planning
    name: Planning Phase
    description: Project planning and requirements gathering
    order: 1                           # Sequential order (1, 2, 3, ...)
    project_id: project-medical-device # Reference to project
```

### Workpackages

Work units within phases.

```yaml
workpackages:
  - id: wp-requirements
    name: Requirements Analysis
    description: Gather and document system requirements
    order: 1                           # Sequential order within phase
    phase_id: phase-planning           # Reference to phase
```

### Backlogs

Collections of work items (Product Backlog, Technical Debt, etc.).

```yaml
backlogs:
  - id: backlog-product
    name: Product Backlog
    description: Main product backlog for all features
    project_id: project-medical-device # Reference to project
```

### Milestones

Key project milestones and deliverables.

```yaml
milestones:
  - id: milestone-alpha
    name: Alpha Release
    description: First internal alpha release
    due_date: 2024-03-31T23:59:59Z
    status: pending                    # pending, at_risk, completed, missed
    project_id: project-medical-device # Reference to project
```

**Milestone Status:**
- `pending` - Not yet reached
- `at_risk` - At risk of being missed
- `completed` - Completed on time
- `missed` - Missed deadline

### Workitems

#### Requirements

System requirements with acceptance criteria.

```yaml
workitems:
  requirements:
    - id: req-auth
      title: User Authentication System
      description: Secure user authentication with RBAC
      status: active                   # draft, active, completed, archived
      priority: 5                      # 1-5 (5 = highest)
      acceptance_criteria: Users can securely log in with email and password
      business_value: Essential for system security
      source: security                 # Source of requirement
      created_by: user-pm              # Reference to user
```

#### Tasks

Work tasks to be completed.

```yaml
workitems:
  tasks:
    - id: task-auth-backend
      title: Implement Authentication Backend
      description: Develop JWT-based authentication service
      status: completed                # draft, active, completed, archived
      priority: 5                      # 1-5 (5 = highest)
      estimated_hours: 16              # Estimated effort
      actual_hours: 14                 # Actual effort (optional)
      assigned_to: user-dev1           # Reference to user (optional)
      created_by: user-pm              # Reference to user
```

#### Tests

Test cases for validation.

```yaml
workitems:
  tests:
    - id: test-auth-login
      title: Test User Login
      description: Verify successful user authentication
      status: active
      priority: 5
      test_type: integration           # unit, integration, system, acceptance
      test_steps: |
        1. Navigate to login page
        2. Enter valid credentials
        3. Click login button
      expected_result: User is authenticated and redirected
      test_status: passed              # not_run, passed, failed, blocked
      assigned_to: user-qa
      created_by: user-pm
```

#### Risks

Project risks with mitigation strategies.

```yaml
workitems:
  risks:
    - id: risk-security
      title: Security Vulnerability Risk
      description: Potential security vulnerabilities
      status: active
      priority: 5
      severity: 8                      # 1-10 (10 = highest)
      occurrence: 3                    # 1-10 (10 = most likely)
      detection: 4                     # 1-10 (10 = hardest to detect)
      mitigation_actions: Regular security audits and penetration testing
      risk_owner: user-pm              # Reference to user (optional)
      created_by: user-pm
```

**Note:** RPN (Risk Priority Number) is automatically calculated as: `severity × occurrence × detection`

## Relationship Types

Relationships connect entities in the graph database.

### Workitem Relationships

```yaml
relationships:
  # Requirement to Task
  - from_id: req-auth
    to_id: task-auth-backend
    type: PARENT_OF                    # Requirement decomposes into task

  # Task to Test
  - from_id: task-auth-backend
    to_id: test-auth-login
    type: TESTED_BY                    # Task is tested by test

  # Requirement to Requirement
  - from_id: req-parent
    to_id: req-child
    type: DEPENDS_ON                   # Dependency relationship

  # Risk to Requirement
  - from_id: risk-security
    to_id: req-auth
    type: MITIGATES                    # Risk mitigates requirement
```

### Sprint/Backlog Relationships

```yaml
relationships:
  # Task to Sprint
  - from_id: task-auth-backend
    to_id: sprint-1
    type: ASSIGNED_TO_SPRINT           # Task assigned to sprint

  # Task to Backlog
  - from_id: task-future
    to_id: backlog-product
    type: IN_BACKLOG                   # Task in backlog
```

**Note:** A task can be assigned to either a sprint OR a backlog, but not both.

### Organizational Relationships

```yaml
relationships:
  # Company to Department (created automatically)
  - from_id: company-acme
    to_id: dept-engineering
    type: PARENT_OF                    # Company owns department

  # Resource to Department (created automatically)
  - from_id: resource-dev1
    to_id: dept-engineering
    type: BELONGS_TO                   # Resource belongs to department

  # Workpackage to Department
  - from_id: wp-implementation
    to_id: dept-engineering
    type: LINKED_TO_DEPARTMENT         # Workpackage linked to department
```

### Resource Allocation Relationships

```yaml
relationships:
  # Resource to Workpackage
  - from_id: resource-dev1
    to_id: wp-implementation
    type: ALLOCATED_TO
    allocation_percentage: 80.0        # Percentage of time allocated (0-100)
    lead: true                         # Is this the lead resource?
```

**Supported Relationship Types:**
- `PARENT_OF` - Parent-child hierarchy
- `DEPENDS_ON` - Dependency relationship
- `TESTED_BY` - Testing relationship
- `MITIGATES` - Risk mitigation
- `ASSIGNED_TO_SPRINT` - Sprint assignment
- `IN_BACKLOG` - Backlog membership
- `LINKED_TO_DEPARTMENT` - Department linkage
- `ALLOCATED_TO` - Resource allocation (with properties)
- `BELONGS_TO` - Organizational membership

## Available Templates

### Single-File Templates

#### `default.yaml`
Basic seed data with example users and workitems for development and testing.

#### `minimal.yaml`
Minimal template with just essential users for quick setup.

#### `software-only.yaml`
Software development focused template without medical device specifics.

#### `medical-device.yaml`
Medical device development template with regulatory compliance focus.

#### `gantt-chart-demo-full.yaml`
Comprehensive demo template with all entity types for Gantt chart visualization. Includes:
- Complete organizational structure (companies, departments, resources)
- Full project management structure (projects, sprints, phases, workpackages, backlogs, milestones)
- Comprehensive workitems (requirements, tasks, tests, risks)
- All relationship types demonstrated

### Modular Templates

Modular templates can be applied sequentially to build up a complete system. They use deterministic UUIDs for cross-template entity references.

#### `modular/users-acme.yaml`
User accounts for Acme Corporation (20 users across all roles).

#### `modular/company-acme.yaml`
Acme Corporation organizational structure with departments and resources.

#### `modular/project-medical-device.yaml`
Medical Device Software v2.0 project structure with sprints, phases, workpackages, backlogs, and milestones.

#### `modular/requirements-medical-device.yaml`
Requirements, tasks, tests, and risks for the medical device project with complete relationship graph.

**Application Order:**
1. `users-acme.yaml` - Create users first
2. `company-acme.yaml` - Create organizational structure
3. `project-medical-device.yaml` - Create project structure
4. `requirements-medical-device.yaml` - Create workitems and relationships

## Usage

### Applying Templates via API

```bash
# Apply a template
curl -X POST http://localhost:8000/api/v1/templates/default/apply \
  -H "Authorization: Bearer $TOKEN"

# Dry-run mode (preview without applying)
curl -X POST http://localhost:8000/api/v1/templates/default/apply?dry_run=true \
  -H "Authorization: Bearer $TOKEN"
```

### Applying Modular Templates

```bash
# Apply modular templates in sequence
curl -X POST http://localhost:8000/api/v1/templates/users-acme/apply \
  -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:8000/api/v1/templates/company-acme/apply \
  -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:8000/api/v1/templates/project-medical-device/apply \
  -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:8000/api/v1/templates/requirements-medical-device/apply \
  -H "Authorization: Bearer $TOKEN"
```

### Listing Available Templates

```bash
curl http://localhost:8000/api/v1/templates \
  -H "Authorization: Bearer $TOKEN"
```

### Validating Templates

```bash
curl http://localhost:8000/api/v1/templates/default/validate \
  -H "Authorization: Bearer $TOKEN"
```

## Deterministic UUIDs

Templates use deterministic UUID generation to ensure idempotency. The UUID for each entity is generated from:

```
UUID = SHA256(template_name + ":" + entity_id)
```

This means:
- The same entity in the same template always gets the same UUID
- Applying a template multiple times is safe (idempotent)
- Cross-template references work using the same entity IDs

**Example:**
```yaml
# In users-acme.yaml
users:
  - id: user-pm1
    email: pm1@acme.example.com
    # Will generate UUID: deterministic_uuid("users-acme:user-pm1")

# In project-medical-device.yaml
projects:
  - id: project-medical-device
    owner_id: user-pm1  # References the same UUID
```

## Validation

Templates are validated before application:

### Schema Validation
- Validates against JSON Schema (`schema.json`)
- Checks required fields and data types
- Validates enums and value ranges

### Reference Validation
- Ensures all user references exist
- Validates entity references (company_id, department_id, etc.)
- Checks relationship endpoints exist

### Constraint Validation
- Email format validation
- Date constraint validation (e.g., sprint end_date > start_date)
- Priority and severity ranges
- Mutual exclusivity (e.g., task can't be in both sprint and backlog)

### Business Rule Validation
- Workpackage single-department constraint
- ALLOCATED_TO relationships must have allocation_percentage
- Allocation percentage must be 0-100

## Best Practices

### Template Design

1. **Use Descriptive IDs**: Use meaningful IDs like `user-pm1` instead of `u1`
2. **Group Related Entities**: Keep related entities together in the file
3. **Add Comments**: Use YAML comments to explain complex structures
4. **Version Templates**: Update version number when making changes
5. **Test Templates**: Always validate before applying to production

### Modular Templates

1. **Separate Concerns**: Split large templates into logical modules
2. **Define Dependencies**: Document which templates must be applied first
3. **Use Consistent IDs**: Use the same entity IDs across related templates
4. **Minimize Duplication**: Don't duplicate users across templates

### Entity References

1. **Reference by ID**: Always use entity IDs for references, not names
2. **Check References**: Ensure referenced entities exist in the template or were created by a previous template
3. **Use Optional References**: Make references optional where appropriate (e.g., assigned_to)

### Relationships

1. **Define After Entities**: Define relationships after all entities are defined
2. **Validate Endpoints**: Ensure both from_id and to_id exist
3. **Use Correct Types**: Use the appropriate relationship type for the connection
4. **Add Properties**: Include allocation_percentage for ALLOCATED_TO relationships

### Idempotency

1. **Unique IDs**: Use unique IDs within each template
2. **Stable IDs**: Don't change entity IDs once a template is applied
3. **Safe Reapplication**: Design templates to be safely reapplied
4. **Test Idempotency**: Apply templates multiple times in testing

## Template Naming Conventions

- Use kebab-case for template names: `medical-device-v2.yaml`
- Use descriptive names that indicate content: `users-acme.yaml`
- For modular templates, use prefixes: `modular/company-acme.yaml`
- Version templates when making breaking changes: `project-v2.yaml`

## Troubleshooting

### Common Issues

**Validation Errors:**
- Check that all referenced entities exist
- Verify date formats are ISO 8601
- Ensure enums use valid values

**Duplicate Entities:**
- Templates are idempotent - reapplying creates no duplicates
- Check entity IDs are unique within the template

**Missing References:**
- Ensure referenced users exist in the template or were created previously
- For modular templates, apply in the correct order

**Relationship Errors:**
- Verify both endpoints exist
- Check relationship type is valid
- Ensure allocation_percentage is set for ALLOCATED_TO relationships

## Schema Reference

The complete JSON Schema is available in `schema.json`. It defines:
- All entity types and their properties
- Required vs optional fields
- Data types and formats
- Validation rules and constraints
- Enum values

## Contributing

When creating new templates:

1. Follow the structure defined in this README
2. Validate against `schema.json`
3. Test application in a development environment
4. Document any special requirements or dependencies
5. Add examples to this README if introducing new patterns

## Support

For issues or questions:
- Check the validation errors for specific guidance
- Review existing templates for examples
- Consult the API documentation
- Contact the RxDx development team

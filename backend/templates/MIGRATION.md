# Template Migration Guide

This guide explains how to extend existing templates with the new graph entity types (companies, departments, resources, projects, sprints, phases, workpackages, backlogs, milestones) introduced in the template system enhancement.

## Table of Contents

- [Overview](#overview)
- [Backward Compatibility](#backward-compatibility)
- [Migration Steps](#migration-steps)
- [Before and After Examples](#before-and-after-examples)
- [Common Migration Patterns](#common-migration-patterns)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

## Overview

The template system has been extended to support:
- **Organizational entities**: Companies, Departments, Resources
- **Project management entities**: Projects, Sprints, Phases, Workpackages, Backlogs, Milestones
- **Enhanced relationships**: New relationship types and properties

**Good News:** All existing templates continue to work without modification. The new entity types are optional.

## Backward Compatibility

### What Still Works

✅ **Existing templates work unchanged:**
- Templates with only users and workitems
- Templates without organizational structure
- Templates without project management entities
- All existing relationship types

✅ **No breaking changes:**
- Existing entity IDs remain valid
- Existing relationship types unchanged
- Existing validation rules still apply

### What's New (Optional)

🆕 **New optional sections:**
```yaml
companies: []        # Optional
departments: []      # Optional
resources: []        # Optional
projects: []         # Optional
sprints: []          # Optional
phases: []           # Optional
workpackages: []     # Optional
backlogs: []         # Optional
milestones: []       # Optional
```

🆕 **New relationship types:**
- `ASSIGNED_TO_SPRINT` - Assign tasks to sprints
- `IN_BACKLOG` - Add tasks to backlogs
- `LINKED_TO_DEPARTMENT` - Link workpackages to departments
- `ALLOCATED_TO` - Allocate resources to workpackages (with properties)

🆕 **Enhanced relationship properties:**
```yaml
relationships:
  - from_id: resource-dev1
    to_id: wp-implementation
    type: ALLOCATED_TO
    allocation_percentage: 80.0  # NEW: Percentage allocation
    lead: true                   # NEW: Lead resource flag
```

## Migration Steps

### Step 1: Assess Your Template

Determine what you want to add:

- **Organizational structure?** → Add companies, departments, resources
- **Sprint planning?** → Add projects, sprints
- **Phase-based planning?** → Add projects, phases, workpackages
- **Backlog management?** → Add projects, backlogs
- **Milestone tracking?** → Add projects, milestones

### Step 2: Add Entity Sections

Add the new sections to your template (all optional):

```yaml
metadata:
  name: my-template
  version: 2.0.0  # Increment version
  # ... rest of metadata

settings:
  default_password: password123

users:
  # ... existing users

# NEW: Add organizational structure (optional)
companies: []
departments: []
resources: []

# NEW: Add project management (optional)
projects: []
sprints: []
phases: []
workpackages: []
backlogs: []
milestones: []

workitems:
  # ... existing workitems

relationships:
  # ... existing relationships
  # ... add new relationships
```

### Step 3: Define Entities

Add the entities you need:

```yaml
companies:
  - id: company-main
    name: My Company
    description: Company description

departments:
  - id: dept-engineering
    name: Engineering
    company_id: company-main
    manager_user_id: user-manager  # Reference existing user

projects:
  - id: project-main
    name: My Project
    status: active
    owner_id: user-pm  # Reference existing user
```

### Step 4: Update Relationships

Add new relationships to connect entities:

```yaml
relationships:
  # Existing relationships
  - from_id: req-1
    to_id: task-1
    type: PARENT_OF

  # NEW: Assign tasks to sprints
  - from_id: task-1
    to_id: sprint-1
    type: ASSIGNED_TO_SPRINT

  # NEW: Link workpackages to departments
  - from_id: wp-implementation
    to_id: dept-engineering
    type: LINKED_TO_DEPARTMENT

  # NEW: Allocate resources
  - from_id: resource-dev1
    to_id: wp-implementation
    type: ALLOCATED_TO
    allocation_percentage: 80.0
    lead: true
```

### Step 5: Validate and Test

```bash
# Validate the updated template
curl http://localhost:8000/api/v1/templates/my-template/validate

# Test with dry-run
curl -X POST http://localhost:8000/api/v1/templates/my-template/apply?dry_run=true

# Apply the template
curl -X POST http://localhost:8000/api/v1/templates/my-template/apply
```

## Before and After Examples

### Example 1: Adding Organizational Structure

**Before (v1.0):**
```yaml
metadata:
  name: software-project
  version: 1.0.0
  description: Software project template
  author: Team

settings:
  default_password: password123

users:
  - id: user-dev1
    email: dev1@example.com
    full_name: Developer One
    role: user

  - id: user-dev2
    email: dev2@example.com
    full_name: Developer Two
    role: user

workitems:
  tasks:
    - id: task-1
      title: Implement Feature A
      status: active
      priority: 5
      assigned_to: user-dev1
      created_by: user-dev1

relationships: []
```

**After (v2.0):**
```yaml
metadata:
  name: software-project
  version: 2.0.0  # ← Version incremented
  description: Software project template with organizational structure
  author: Team

settings:
  default_password: password123

users:
  - id: user-dev1
    email: dev1@example.com
    full_name: Developer One
    role: user

  - id: user-dev2
    email: dev2@example.com
    full_name: Developer Two
    role: user

  - id: user-manager
    email: manager@example.com
    full_name: Engineering Manager
    role: project_manager

# NEW: Organizational structure
companies:
  - id: company-main
    name: Software Company
    description: Our software development company

departments:
  - id: dept-engineering
    name: Engineering Department
    company_id: company-main
    manager_user_id: user-manager

resources:
  - id: resource-dev1
    name: Developer One
    type: human
    availability: full_time
    cost_per_hour: 75.0
    department_id: dept-engineering
    user_id: user-dev1

  - id: resource-dev2
    name: Developer Two
    type: human
    availability: full_time
    cost_per_hour: 75.0
    department_id: dept-engineering
    user_id: user-dev2

workitems:
  tasks:
    - id: task-1
      title: Implement Feature A
      status: active
      priority: 5
      assigned_to: user-dev1
      created_by: user-dev1

relationships: []
```

### Example 2: Adding Sprint Planning

**Before (v1.0):**
```yaml
metadata:
  name: agile-project
  version: 1.0.0
  description: Agile project template
  author: Team

settings:
  default_password: password123

users:
  - id: user-pm
    email: pm@example.com
    full_name: Project Manager
    role: project_manager

workitems:
  requirements:
    - id: req-1
      title: User Authentication
      status: active
      priority: 5
      created_by: user-pm

  tasks:
    - id: task-1
      title: Implement Login
      status: active
      priority: 5
      created_by: user-pm

relationships:
  - from_id: req-1
    to_id: task-1
    type: PARENT_OF
```

**After (v2.0):**
```yaml
metadata:
  name: agile-project
  version: 2.0.0  # ← Version incremented
  description: Agile project template with sprint planning
  author: Team

settings:
  default_password: password123

users:
  - id: user-pm
    email: pm@example.com
    full_name: Project Manager
    role: project_manager

# NEW: Project and sprints
projects:
  - id: project-main
    name: Main Project
    status: active
    start_date: 2024-01-01T00:00:00Z
    end_date: 2024-12-31T23:59:59Z
    owner_id: user-pm

sprints:
  - id: sprint-1
    name: Sprint 1
    start_date: 2024-01-01T00:00:00Z
    end_date: 2024-01-14T23:59:59Z
    status: active
    goal: Implement authentication
    project_id: project-main

backlogs:
  - id: backlog-product
    name: Product Backlog
    project_id: project-main

workitems:
  requirements:
    - id: req-1
      title: User Authentication
      status: active
      priority: 5
      created_by: user-pm

  tasks:
    - id: task-1
      title: Implement Login
      status: active
      priority: 5
      created_by: user-pm

relationships:
  - from_id: req-1
    to_id: task-1
    type: PARENT_OF

  # NEW: Assign task to sprint
  - from_id: task-1
    to_id: sprint-1
    type: ASSIGNED_TO_SPRINT
```

### Example 3: Adding Phase-Based Planning

**Before (v1.0):**
```yaml
metadata:
  name: waterfall-project
  version: 1.0.0
  description: Waterfall project template
  author: Team

settings:
  default_password: password123

users:
  - id: user-pm
    email: pm@example.com
    full_name: Project Manager
    role: project_manager

workitems:
  requirements:
    - id: req-1
      title: System Requirements
      status: active
      priority: 5
      created_by: user-pm

  tasks:
    - id: task-1
      title: Requirements Analysis
      status: active
      priority: 5
      created_by: user-pm

relationships:
  - from_id: req-1
    to_id: task-1
    type: PARENT_OF
```

**After (v2.0):**
```yaml
metadata:
  name: waterfall-project
  version: 2.0.0  # ← Version incremented
  description: Waterfall project template with phase-based planning
  author: Team

settings:
  default_password: password123

users:
  - id: user-pm
    email: pm@example.com
    full_name: Project Manager
    role: project_manager

# NEW: Project, phases, and workpackages
projects:
  - id: project-main
    name: Main Project
    status: active
    owner_id: user-pm

phases:
  - id: phase-requirements
    name: Requirements Phase
    order: 1
    project_id: project-main

  - id: phase-design
    name: Design Phase
    order: 2
    project_id: project-main

  - id: phase-implementation
    name: Implementation Phase
    order: 3
    project_id: project-main

workpackages:
  - id: wp-req-analysis
    name: Requirements Analysis
    order: 1
    phase_id: phase-requirements

  - id: wp-system-design
    name: System Design
    order: 1
    phase_id: phase-design

workitems:
  requirements:
    - id: req-1
      title: System Requirements
      status: active
      priority: 5
      created_by: user-pm

  tasks:
    - id: task-1
      title: Requirements Analysis
      status: active
      priority: 5
      created_by: user-pm

relationships:
  - from_id: req-1
    to_id: task-1
    type: PARENT_OF
```

## Common Migration Patterns

### Pattern 1: Add Company Structure to Existing Template

```yaml
# Add to existing template
companies:
  - id: company-main
    name: Your Company Name

departments:
  - id: dept-engineering
    name: Engineering
    company_id: company-main
    manager_user_id: existing-user-id  # Reference existing user

resources:
  - id: resource-1
    name: Resource Name
    type: human
    availability: full_time
    department_id: dept-engineering
    user_id: existing-user-id  # Reference existing user
```

### Pattern 2: Convert Tasks to Sprint-Based

```yaml
# Add project and sprints
projects:
  - id: project-main
    name: Project Name
    status: active

sprints:
  - id: sprint-current
    name: Current Sprint
    start_date: 2024-01-01T00:00:00Z
    end_date: 2024-01-14T23:59:59Z
    status: active
    project_id: project-main

# Add relationships for existing tasks
relationships:
  - from_id: existing-task-1
    to_id: sprint-current
    type: ASSIGNED_TO_SPRINT

  - from_id: existing-task-2
    to_id: sprint-current
    type: ASSIGNED_TO_SPRINT
```

### Pattern 3: Add Milestones to Existing Project

```yaml
# Add project if not exists
projects:
  - id: project-main
    name: Project Name
    status: active

# Add milestones
milestones:
  - id: milestone-alpha
    name: Alpha Release
    due_date: 2024-03-31T23:59:59Z
    status: pending
    project_id: project-main

  - id: milestone-beta
    name: Beta Release
    due_date: 2024-06-30T23:59:59Z
    status: pending
    project_id: project-main
```

### Pattern 4: Add Resource Allocation

```yaml
# Add resources
resources:
  - id: resource-dev1
    name: Developer Name
    type: human
    availability: full_time
    department_id: dept-engineering
    user_id: existing-user-id

# Add workpackages
workpackages:
  - id: wp-implementation
    name: Implementation
    order: 1
    phase_id: existing-phase-id

# Add allocation relationships
relationships:
  - from_id: resource-dev1
    to_id: wp-implementation
    type: ALLOCATED_TO
    allocation_percentage: 80.0
    lead: true
```

## Validation

After migrating your template, validate it:

### 1. Schema Validation

```bash
curl http://localhost:8000/api/v1/templates/your-template/validate
```

Check for:
- ✅ All required fields present
- ✅ Data types correct
- ✅ Enum values valid
- ✅ Date formats correct (ISO 8601)

### 2. Reference Validation

Check that all references are valid:
- ✅ `company_id` references exist in `companies`
- ✅ `department_id` references exist in `departments`
- ✅ `project_id` references exist in `projects`
- ✅ `phase_id` references exist in `phases`
- ✅ `user_id` references exist in `users`

### 3. Relationship Validation

Check relationships:
- ✅ Both `from_id` and `to_id` exist
- ✅ Relationship types are valid
- ✅ `ALLOCATED_TO` has `allocation_percentage`
- ✅ Tasks not in both sprint and backlog

### 4. Constraint Validation

Check constraints:
- ✅ Sprint `end_date` > `start_date`
- ✅ Phase `order` >= 1
- ✅ Workpackage `order` >= 1
- ✅ Allocation percentage 0-100

## Troubleshooting

### Issue: Validation fails with "Unknown field"

**Problem:** Using old schema version

**Solution:** Update your template to use the new entity sections:
```yaml
companies: []  # Add even if empty
departments: []
resources: []
# ... etc
```

### Issue: "Referenced entity not found"

**Problem:** Entity ID doesn't exist

**Solution:** Check that:
1. The referenced entity is defined in the template
2. The ID matches exactly (case-sensitive)
3. The entity is defined before it's referenced

### Issue: "Task cannot be in both sprint and backlog"

**Problem:** Task has both `ASSIGNED_TO_SPRINT` and `IN_BACKLOG` relationships

**Solution:** Remove one of the relationships:
```yaml
# Choose ONE:
- from_id: task-1
  to_id: sprint-1
  type: ASSIGNED_TO_SPRINT

# OR
- from_id: task-1
  to_id: backlog-1
  type: IN_BACKLOG
```

### Issue: "allocation_percentage required for ALLOCATED_TO"

**Problem:** Missing allocation percentage

**Solution:** Add the property:
```yaml
- from_id: resource-1
  to_id: wp-1
  type: ALLOCATED_TO
  allocation_percentage: 80.0  # Add this
```

### Issue: Template applies but entities not visible

**Problem:** Entities created but not linked

**Solution:** Add relationships to connect entities:
```yaml
# Link department to company (automatic)
# Link resource to department (automatic)
# Link workpackage to department (manual)
- from_id: wp-1
  to_id: dept-1
  type: LINKED_TO_DEPARTMENT
```

## Best Practices

### 1. Incremental Migration

Don't migrate everything at once:
1. Start with organizational structure
2. Add project management entities
3. Add relationships
4. Test at each step

### 2. Version Your Templates

```yaml
metadata:
  version: 2.0.0  # Increment when adding new entities
```

### 3. Test in Development

Always test migrations in a development environment first:
```bash
# Use dry-run mode
curl -X POST http://localhost:8000/api/v1/templates/my-template/apply?dry_run=true
```

### 4. Document Changes

Add comments to explain new sections:
```yaml
# NEW in v2.0: Added organizational structure
companies:
  - id: company-main
    name: Main Company
```

### 5. Maintain Backward Compatibility

If you need to support both old and new versions:
- Keep old templates as-is
- Create new templates with new entities
- Use modular templates for flexibility

## Migration Checklist

- [ ] Assess what entities you need
- [ ] Update template version number
- [ ] Add new entity sections (even if empty)
- [ ] Define new entities
- [ ] Add new relationships
- [ ] Validate template
- [ ] Test with dry-run
- [ ] Apply to development environment
- [ ] Verify entities created correctly
- [ ] Test relationships work
- [ ] Document changes
- [ ] Apply to production

## Support

For migration assistance:
- Review the [Template README](README.md)
- Check existing templates for examples
- Validate your template before applying
- Contact the RxDx development team

## Summary

✅ **Existing templates work unchanged** - No migration required unless you want new features

✅ **New entities are optional** - Add only what you need

✅ **Incremental migration** - Add entities gradually

✅ **Backward compatible** - Old and new templates coexist

✅ **Well-documented** - Examples and patterns provided

Happy migrating! 🚀

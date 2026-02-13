# Modular Templates

This directory contains modular templates that can be combined to create a complete project structure. Modular templates are designed to be applied in sequence, with each template building on the entities created by previous templates.

## Template Application Order

**IMPORTANT**: Modular templates must be applied in the correct order due to dependencies between them.

### Correct Application Sequence

```bash
# 1. Apply company structure (users, departments, resources)
docker compose exec backend uv run python scripts/seed_data.py --template modular/company-acme
docker compose exec backend uv run python scripts/seed_data.py --template modular/users-acme

# 2. Apply project structure (projects, sprints, phases, workpackages, backlogs, milestones)
docker compose exec backend uv run python scripts/seed_data.py --template modular/project-medical-device

# 3. Apply requirements and workitems (requirements, tasks, tests, risks, relationships)
docker compose exec backend uv run python scripts/seed_data.py --template modular/requirements-medical-device
```

### Why This Order Matters

Each template references entities created by previous templates:

1. **`modular/company-acme`** creates:
   - Users (user-ceo, user-eng-mgr, user-dev1, user-dev2, user-dev3, user-qa1, user-qa2, etc.)
   - Company (company-acme)
   - Departments (dept-engineering, dept-qa, dept-research)
   - Resources (resource-dev1, resource-dev2, resource-dev3, resource-qa1, resource-qa2, equipment)

2. **`modular/project-medical-device`** creates:
   - Project (project-medical-device)
   - Sprints (sprint-1 through sprint-5)
   - Phases (phase-planning through phase-release)
   - Workpackages (wp-requirements, wp-architecture, wp-core-implementation, etc.)
   - Backlogs (backlog-product, backlog-technical, backlog-bugs)
   - Milestones (milestone-requirements through milestone-release)
   - **Requires**: Users from company-acme (for project ownership)

3. **`modular/requirements-medical-device`** creates:
   - Requirements (req-auth, req-device-control, req-safety-monitoring, etc.)
   - Tasks (task-auth-backend, task-device-api, etc.)
   - Tests (test-login, test-device-control, etc.)
   - Risks (risk-security, risk-regulatory, risk-safety, risk-performance)
   - Relationships between all entities
   - **Requires**: 
     - Users from company-acme (for created_by, assigned_to, risk_owner)
     - Sprints from project-medical-device (for ASSIGNED_TO_SPRINT relationships)
     - Workpackages from project-medical-device (for LINKED_TO_DEPARTMENT relationships)
     - Resources from company-acme (for ALLOCATED_TO relationships)
     - Departments from company-acme (for LINKED_TO_DEPARTMENT relationships)
     - Backlogs from project-medical-device (for IN_BACKLOG relationships)

## Template Descriptions

### `modular/company-acme.yaml`

**Purpose**: Defines the organizational structure for Acme Corporation

**Contains**:
- 8 users (CEO, managers, developers, QA engineers)
- 1 company (Acme Corporation)
- 3 departments (Engineering, QA, Research)
- 8 resources (5 people + 3 equipment)

**Dependencies**: None (can be applied first)

### `modular/project-medical-device.yaml`

**Purpose**: Defines the Medical Device Software v2.0 project structure

**Contains**:
- 1 project
- 5 sprints (2 completed, 1 active, 2 planning)
- 6 phases (Planning → Design → Development → Integration → Validation → Release)
- 15 workpackages (distributed across phases)
- 3 backlogs (Product, Technical Debt, Bugs)
- 6 milestones (1 completed, 1 in progress, 4 pending)

**Dependencies**: 
- Users from `modular/company-acme` (referenced but not strictly required)

### `modular/requirements-medical-device.yaml`

**Purpose**: Defines requirements, tasks, tests, and risks for the Medical Device Software v2.0 project

**Contains**:
- 6 requirements (authentication, device control, safety monitoring, audit trail, data logging, user management)
- 15 tasks (implementation tasks for all requirements)
- 5 tests (integration tests for key functionality)
- 4 risks (security, regulatory, safety, performance)
- 43 relationships (connecting all entities)

**Dependencies**: 
- **REQUIRED**: `modular/company-acme` (for users, departments, resources)
- **REQUIRED**: `modular/project-medical-device` (for sprints, workpackages, backlogs)

## Troubleshooting

### Error: "Source workitem 'resource-xxx' not found"

**Cause**: The `modular/requirements-medical-device` template is trying to create relationships with resources that don't exist yet.

**Solution**: Apply `modular/company-acme` first to create the resources.

### Error: "User reference 'user-xxx' not found"

**Cause**: Workitems are referencing users that don't exist yet.

**Solution**: Apply `modular/company-acme` first to create the users.

### Error: "Sprint reference 'sprint-x' not found"

**Cause**: Relationships are referencing sprints that don't exist yet.

**Solution**: Apply `modular/project-medical-device` before `modular/requirements-medical-device`.

## Applying All Templates at Once

If you want to apply all modular templates in one command, you can create a shell script:

```bash
#!/bin/bash
# apply-modular-templates.sh

echo "Applying modular templates in correct order..."

echo "1. Applying company structure..."
docker compose exec backend uv run python scripts/seed_data.py --template modular/company-acme

echo "2. Applying project structure..."
docker compose exec backend uv run python scripts/seed_data.py --template modular/project-medical-device

echo "3. Applying requirements and workitems..."
docker compose exec backend uv run python scripts/seed_data.py --template modular/requirements-medical-device

echo "All modular templates applied successfully!"
```

## Dry Run Mode

You can preview what would be created without making changes:

```bash
docker compose exec backend uv run python scripts/seed_data.py --template modular/company-acme --dry-run
```

This is useful for:
- Verifying template contents before applying
- Checking for potential errors
- Understanding what entities will be created

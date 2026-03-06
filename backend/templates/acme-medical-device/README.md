# ACME Medical Device Templates

This directory contains templates for the ACME Corporation Medical Device Development project. These modular templates can be combined to create a complete project structure demonstrating a realistic medical device software development lifecycle.

## Template Application Order

**IMPORTANT**: Templates must be applied in the correct order due to dependencies between them.

### Correct Application Sequence

```bash
# 1. Apply company structure (users, departments, resources)
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/company-acme
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/users-acme

# 2. Apply project structure (projects, sprints, phases, workpackages, backlogs, milestones)
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/project-medical-device

# 3. Apply PSP comprehensive template (phases, departments, workpackages for PSP matrix)
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/psp-comprehensive

# 4. Apply requirements and workitems (requirements, tasks, tests, risks, relationships)
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/requirements-medical-device
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

### `acme-medical-device/company-acme.yaml`

**Purpose**: Defines the organizational structure for Acme Corporation

**Contains**:
- 8 users (CEO, managers, developers, QA engineers)
- 1 company (Acme Corporation)
- 3 departments (Engineering, QA, Research)
- 8 resources (5 people + 3 equipment)

**Dependencies**: None (can be applied first)

### `acme-medical-device/users-acme.yaml`

**Purpose**: Defines additional users for the ACME organization

**Contains**:
- Additional user accounts

**Dependencies**: company-acme.yaml

### `acme-medical-device/project-medical-device.yaml`

**Purpose**: Defines the Medical Device Software v2.0 project structure

**Contains**:
- 1 project
- 5 sprints (2 completed, 1 active, 2 planning)
- 6 phases (Planning → Design → Development → Integration → Validation → Release)
- 15 workpackages (distributed across phases)
- 3 backlogs (Product, Technical Debt, Bugs)
- 6 milestones (1 completed, 1 in progress, 4 pending)

**Dependencies**: 
- Users from `acme-medical-device/company-acme` (referenced but not strictly required)

### `acme-medical-device/psp-comprehensive.yaml`

**Purpose**: Defines comprehensive PSP (Project Structure Plan) matrix for Medical Device Development

**Contains**:
- 8 phases (POC → Post-Market) with NEXT relationships
- 12 departments (R&D, Systems Eng, Software, Hardware, QA, Regulatory, Clinical, Manufacturing, Supply Chain, Risk Mgmt, Documentation, Project Mgmt)
- 74 workpackages distributed across phase-department matrix
- Realistic Medical Device Development lifecycle with ISO 13485, ISO 14971, IEC 62304, IEC 60601 references

**Dependencies**:
- Company from `acme-medical-device/company-acme`
- Project from `acme-medical-device/project-medical-device`

### `acme-medical-device/requirements-medical-device.yaml`

**Purpose**: Defines requirements, tasks, tests, and risks for the Medical Device Software v2.0 project

**Contains**:
- 6 requirements (authentication, device control, safety monitoring, audit trail, data logging, user management)
- 15 tasks (implementation tasks for all requirements)
- 5 tests (integration tests for key functionality)
- 4 risks (security, regulatory, safety, performance)
- 43 relationships (connecting all entities)

**Dependencies**: 
- **REQUIRED**: `acme-medical-device/company-acme` (for users, departments, resources)
- **REQUIRED**: `acme-medical-device/project-medical-device` (for sprints, workpackages, backlogs)

## Troubleshooting

### Error: "Source workitem 'resource-xxx' not found"

**Cause**: The `acme-medical-device/requirements-medical-device` template is trying to create relationships with resources that don't exist yet.

**Solution**: Apply `acme-medical-device/company-acme` first to create the resources.

### Error: "User reference 'user-xxx' not found"

**Cause**: Workitems are referencing users that don't exist yet.

**Solution**: Apply `acme-medical-device/company-acme` and `acme-medical-device/users-acme` first to create the users.

### Error: "Sprint reference 'sprint-x' not found"

**Cause**: Relationships are referencing sprints that don't exist yet.

**Solution**: Apply `acme-medical-device/project-medical-device` before `acme-medical-device/requirements-medical-device`.

## Applying All Templates at Once

If you want to apply all templates in one command, you can create a shell script:

```bash
#!/bin/bash
# apply-acme-templates.sh

echo "Applying ACME Medical Device templates in correct order..."

echo "1. Applying company structure..."
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/company-acme
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/users-acme

echo "2. Applying project structure..."
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/project-medical-device

echo "3. Applying PSP comprehensive template..."
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/psp-comprehensive

echo "4. Applying requirements and workitems..."
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/requirements-medical-device

echo "All ACME Medical Device templates applied successfully!"
```

## Dry Run Mode

You can preview what would be created without making changes:

```bash
docker compose exec backend uv run python scripts/seed_data.py --template acme-medical-device/company-acme --dry-run
```

This is useful for:
- Verifying template contents before applying
- Checking for potential errors
- Understanding what entities will be created

## Future Extensions

This template directory is designed to support multiple projects in the future. When adding new projects:

1. Create a new directory: `backend/templates/<company-project-name>/`
2. Follow the same modular structure (company, users, project, requirements)
3. Update this README with the new project documentation
4. Ensure templates are self-contained and don't conflict with existing data

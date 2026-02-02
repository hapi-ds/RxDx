# RxDx Seed Data Documentation

This document describes the template-based approach to seeding the RxDx application with example users and sample data for development and testing.

## Overview

RxDx uses a **template-based seeding system** that provides a flexible, maintainable way to initialize projects with different configurations. Templates are defined in YAML files and can be applied via CLI, Python script, or REST API.

### Why Templates?

- **Single Source of Truth**: All seed data is defined in YAML templates, eliminating inconsistencies between SQL and Python files
- **Multiple Project Types**: Support for different project configurations (medical-device, software-only, minimal)
- **Non-Destructive**: Templates can be applied to existing databases without affecting existing data
- **Idempotent**: Applying the same template multiple times produces the same result
- **Version Controlled**: Templates are plain text YAML files that can be tracked in git

## Available Templates

### 1. Default Template (`default`)

The default template contains the standard RxDx seed data for general development and testing.

**Contents:**
- 7 users (admin, project manager, validator, auditor, 2 developers, 1 inactive user)
- 4 requirements (authentication, RBAC, audit logging, digital signatures)
- 3 tasks (JWT implementation, user management API, audit logging service)
- 3 tests (login success, invalid login, account lockout)
- 2 risks (unauthorized access, data integrity)
- 13 relationships between workitems

**Use Case:** General development, testing all features, demo environments

### 2. Medical Device Template (`medical-device`)

Regulatory-focused template for medical device software projects.

**Contents:**
- 5 users (regulatory admin, QA manager, validator, FDA auditor, medical device engineer)
- 5 requirements (FDA 21 CFR Part 11, IEC 62304, ISO 13485, DHF management, ISO 14971 risk management)
- 3 tasks (electronic signature module, audit trail system, DHF document management)
- 2 tests (electronic signature integrity, audit trail completeness)
- 3 risks (patient data breach, software malfunction, regulatory non-compliance)
- Relationships focused on regulatory compliance and traceability

**Use Case:** Medical device projects, regulatory compliance testing, FDA submissions

### 3. Software-Only Template (`software-only`)

Agile development template for software projects without regulatory requirements.

**Contents:**
- 4 users (admin, scrum master, dev lead, QA lead)
- 4 requirements (authentication, RESTful API, automated testing, database migrations)
- 4 tasks (JWT service, OpenAPI spec, CI/CD pipeline, database migrations)
- 3 tests (authentication integration, API contract, load testing)
- 2 risks (API security vulnerabilities, performance degradation)
- Relationships focused on agile development workflow

**Use Case:** Software-only projects, agile development, performance testing

### 4. Minimal Template (`minimal`)

Minimal template with only essential data for quick setup.

**Contents:**
- 1 user (admin)
- 1 requirement (basic system setup)
- No tasks, tests, or risks

**Use Case:** Quick testing, development environment setup, custom project initialization

## Default Template Users

All seed users in the default template have the same password: `password123`

| Email | Name | Role | Active | Description |
|-------|------|------|--------|-------------|
| admin@rxdx.example.com | System Administrator | admin | Yes | Full system access, can manage users and settings |
| pm@rxdx.example.com | Project Manager | project_manager | Yes | Can manage projects, requirements, and assign tasks |
| validator@rxdx.example.com | Quality Validator | validator | Yes | Can validate and approve workitems |
| auditor@rxdx.example.com | Compliance Auditor | auditor | Yes | Read-only access to audit logs and compliance data |
| developer@rxdx.example.com | Software Developer | user | Yes | Standard user, can create and update workitems |
| tester@rxdx.example.com | QA Tester | user | Yes | Standard user, focused on test execution |
| inactive@rxdx.example.com | Inactive User | user | No | Disabled account for testing inactive user scenarios |

### User Roles and Permissions

- **admin**: Full access to all features including user management, system settings, and audit logs
- **project_manager**: Can create/manage projects, requirements, tasks, and assign work to team members
- **validator**: Can review and approve workitems, sign documents
- **auditor**: Read-only access to audit trails and compliance reports
- **user**: Standard access to create and update workitems assigned to them

## Default Template Workitems

### Requirements (4 items)

| ID | Title | Status | Priority |
|----|-------|--------|----------|
| REQ-001 | User Authentication System | Active | 5 (Critical) |
| REQ-002 | Role-Based Access Control | Active | 5 (Critical) |
| REQ-003 | Audit Trail Logging | Active | 4 (High) |
| REQ-004 | Digital Signature Support | Draft | 4 (High) |

### Tasks (3 items)

| ID | Title | Status | Assigned To |
|----|-------|--------|-------------|
| TASK-001 | Implement JWT Authentication | Completed | developer@rxdx.example.com |
| TASK-002 | Create User Management API | Active | developer@rxdx.example.com |
| TASK-003 | Implement Audit Logging Service | Draft | developer@rxdx.example.com |

### Tests (3 items)

| ID | Title | Test Status | Assigned To |
|----|-------|-------------|-------------|
| TEST-001 | Test User Login Success | Passed | tester@rxdx.example.com |
| TEST-002 | Test Invalid Login Attempt | Passed | tester@rxdx.example.com |
| TEST-003 | Test Account Lockout | Not Run | tester@rxdx.example.com |

### Risks (2 items)

| ID | Title | Severity | Occurrence | Detection | RPN |
|----|-------|----------|------------|-----------|-----|
| RISK-001 | Unauthorized Access Risk | 9 | 3 | 2 | 54 |
| RISK-002 | Data Integrity Risk | 8 | 2 | 3 | 48 |

### Relationships

The seed data includes the following relationships between workitems:

- **IMPLEMENTS**: Tasks implement Requirements
  - TASK-001 → REQ-001
  - TASK-002 → REQ-001
  - TASK-003 → REQ-003

- **TESTED_BY**: Requirements are tested by Tests
  - REQ-001 → TEST-001, TEST-002, TEST-003

- **MITIGATES**: Requirements mitigate Risks
  - REQ-001 → RISK-001
  - REQ-002 → RISK-001
  - REQ-003 → RISK-002

- **DEPENDS_ON**: Dependencies between items
  - REQ-002 → REQ-001
  - REQ-003 → REQ-001
  - REQ-004 → REQ-001
  - TASK-002 → TASK-001

## How to Apply Templates

### Method 1: Python Script (Recommended)

The Python seed script provides the easiest way to apply templates:

```bash
cd backend

# List available templates
uv run python scripts/seed_data.py --list

# Apply default template
uv run python scripts/seed_data.py

# Apply specific template
uv run python scripts/seed_data.py --template medical-device

# Dry run (preview without making changes)
uv run python scripts/seed_data.py --template software-only --dry-run
```

### Method 2: Template CLI

Use the template CLI for more control:

```bash
cd backend

# List templates
uv run python scripts/template_cli.py list

# Validate template
uv run python scripts/template_cli.py validate default

# Apply template
uv run python scripts/template_cli.py apply default

# Apply with dry-run
uv run python scripts/template_cli.py apply medical-device --dry-run

# JSON output format
uv run python scripts/template_cli.py list --format json
```

### Method 3: REST API

Apply templates via the REST API (requires admin authentication):

```bash
# Login as admin
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@rxdx.example.com", "password": "password123"}'

# List templates
curl http://localhost:8000/api/v1/templates \
  -H "Authorization: Bearer <token>"

# Get template details
curl http://localhost:8000/api/v1/templates/default \
  -H "Authorization: Bearer <token>"

# Validate template
curl -X POST http://localhost:8000/api/v1/templates/default/validate \
  -H "Authorization: Bearer <token>"

# Apply template
curl -X POST http://localhost:8000/api/v1/templates/default/apply \
  -H "Authorization: Bearer <token>"

# Apply with dry-run
curl -X POST "http://localhost:8000/api/v1/templates/default/apply?dry_run=true" \
  -H "Authorization: Bearer <token>"
```

### Method 4: Docker Compose (Automatic)

When using Docker Compose, the SQL seed file runs automatically on first database initialization. However, this method is deprecated in favor of template-based seeding.

For new projects, disable the SQL seed file and use the Python script instead:

```bash
# Start services
docker compose up -d

# Wait for services to be ready
sleep 10

# Apply template
docker compose exec backend uv run python scripts/seed_data.py --template default
```

## Verifying Template Application

### Check Users

```bash
# Via API
curl http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer <admin_token>"

# Via database
docker compose exec db psql -U rxdx -d rxdx -c "SELECT email, full_name, role, is_active FROM users;"
```

### Check Workitems

```bash
# Via API
curl http://localhost:8000/api/v1/graph/nodes \
  -H "Authorization: Bearer <token>"

# Via database (Apache AGE)
docker compose exec db psql -U rxdx -d rxdx -c "
  LOAD 'age';
  SET search_path = ag_catalog, public;
  SELECT * FROM cypher('rxdx_graph', \$\$ MATCH (n) RETURN count(n) \$\$) AS (count agtype);
"
```

### Check Application Results

The template application returns a detailed summary:

```
================================================================================
TEMPLATE APPLICATION SUMMARY
================================================================================
Template: default
Dry Run: false
Success: true

Entities Created: 19
Entities Skipped: 0
Entities Failed: 0

Details:
  ✓ user: 00000000-0000-0000-0000-000000000001 - created
  ✓ user: 00000000-0000-0000-0000-000000000002 - created
  ...
  ✓ relationship: 20000000-0000-0000-0000-000000000001 -> 10000000-0000-0000-0000-000000000001 - created
================================================================================
```

## Creating Custom Templates

### Template File Structure

Templates are YAML files stored in `backend/templates/`. Here's the basic structure:

```yaml
metadata:
  name: my-template
  version: 1.0.0
  description: My custom template
  author: Your Name

settings:
  default_password: password123

users:
  - id: user-1
    email: user@example.com
    full_name: User Name
    role: admin
    is_active: true

workitems:
  requirements:
    - id: req-1
      title: My Requirement
      description: Requirement description
      status: active
      priority: 5
      created_by: user-1

  tasks: []
  tests: []
  risks: []

relationships:
  - from_id: task-1
    to_id: req-1
    type: IMPLEMENTS
```

### Field Guidelines

**Auto-Generated Fields (DO NOT include in templates):**
- `version` - Set to "1.0" automatically
- `created_at` - Current timestamp
- `updated_at` - Current timestamp
- `is_signed` - Set to false
- `rpn` - Calculated for risks (severity × occurrence × detection)

**User References:**
- Use template-local IDs (e.g., "user-1", "admin-user")
- Service resolves to actual UUIDs during application

**UUIDs:**
- Can use any string ID format
- Service generates deterministic UUIDs based on template name + entity ID
- For backward compatibility, can use actual UUIDs

### Validation

Validate your template before applying:

```bash
# Via CLI
uv run python scripts/template_cli.py validate my-template

# Via API
curl -X POST http://localhost:8000/api/v1/templates/my-template/validate \
  -H "Authorization: Bearer <token>"
```

### Template Schema

Templates are validated against `backend/templates/schema.json`. See the design document for full schema details.

## Security Notes

⚠️ **Warning**: The seed data uses a simple default password (`password123`) and should **NEVER** be used in production environments.

For production deployments:
1. Do not include the seed data SQL file
2. Create users through secure administrative processes
3. Enforce strong password policies
4. Use environment-specific credentials

## Troubleshooting

### Seed data not loading

1. Check if the database volume already exists (data only loads on first init):
   ```bash
   docker compose down -v
   docker compose up -d
   ```

2. Check PostgreSQL logs:
   ```bash
   docker compose logs db
   ```

### Users can't login

1. Verify the user exists:
   ```bash
   docker compose exec db psql -U rxdx -d rxdx -c "SELECT email, is_active FROM users;"
   ```

2. Check if the account is locked:
   ```bash
   docker compose exec db psql -U rxdx -d rxdx -c "SELECT email, failed_login_attempts, locked_until FROM users;"
   ```

### Graph data not visible

1. Verify Apache AGE is loaded:
   ```bash
   docker compose exec db psql -U rxdx -d rxdx -c "SELECT * FROM pg_extension WHERE extname = 'age';"
   ```

2. Check if the graph exists:
   ```bash
   docker compose exec db psql -U rxdx -d rxdx -c "
     LOAD 'age';
     SET search_path = ag_catalog, public;
     SELECT * FROM ag_graph;
   "
   ```

## Template Features

### Idempotent Application

Templates can be applied multiple times safely. The second application will skip all existing entities:

```bash
# First application creates entities
uv run python scripts/seed_data.py --template default
# Output: Entities Created: 19, Skipped: 0

# Second application skips existing entities
uv run python scripts/seed_data.py --template default
# Output: Entities Created: 0, Skipped: 19
```

### Non-Destructive Application

Templates never modify or delete existing data. They only create new entities that don't already exist.

### Dry-Run Mode

Preview what would be created without making changes:

```bash
uv run python scripts/seed_data.py --template medical-device --dry-run
```

### Deterministic UUIDs

The template service generates deterministic UUIDs based on:
- Template name
- Entity ID

This ensures the same entity always gets the same UUID across multiple applications.

## Migration from SQL Seed Files

### For Existing Projects

If you're currently using the SQL seed file (`backend/db/init/05-seed-data.sql`):

1. The SQL file is now deprecated but still functional
2. The `default` template contains identical data
3. New projects should use templates instead

### Migration Steps

1. **Verify equivalence:**
   ```bash
   # Apply default template to a test database
   uv run python scripts/seed_data.py --template default --dry-run
   ```

2. **Update initialization scripts:**
   ```bash
   # Replace SQL seeding with template seeding
   # In your deployment scripts, replace:
   # psql -f backend/db/init/05-seed-data.sql
   # With:
   uv run python scripts/seed_data.py --template default
   ```

3. **Update documentation:**
   - Update README and deployment docs to reference templates
   - Document which template to use for your project type

## Best Practices

### Development Workflow

1. **Start with minimal template** for quick setup:
   ```bash
   uv run python scripts/seed_data.py --template minimal
   ```

2. **Use dry-run** before applying to production-like environments:
   ```bash
   uv run python scripts/seed_data.py --template default --dry-run
   ```

3. **Create project-specific templates** for your team's needs

### Template Maintenance

1. **Version your templates** using semantic versioning in metadata
2. **Document template purpose** in the description field
3. **Test templates** before committing to version control
4. **Keep templates focused** - create multiple small templates rather than one large template

### Security Considerations

1. **Never use template passwords in production**
2. **Change default passwords** immediately after applying templates
3. **Use environment-specific templates** for different deployment stages
4. **Audit template applications** using the application result logs

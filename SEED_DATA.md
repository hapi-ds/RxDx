# RxDx Seed Data Documentation

This document describes the example users and sample data available for development and testing of the RxDx application.

## Overview

The seed data provides a realistic set of users and workitems to help developers and testers work with the application without needing to create data manually.

## Seed Users

All seed users have the same default password: `password123`

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

## Seed Workitems

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

## How to Inject Seed Data

### Method 1: Docker Compose (Recommended)

The seed data is automatically loaded when starting the database with Docker Compose for the first time.

```bash
# Start all services (seed data loads automatically)
docker compose up -d

# To reset and reload seed data
docker compose down -v  # Remove volumes
docker compose up -d    # Recreate with fresh data
```

The SQL seed script is located at `backend/db/init/05-seed-data.sql` and runs automatically during PostgreSQL initialization.

### Method 2: Python Script

Use the Python seed script for more control over the seeding process:

```bash
cd backend

# View seed data without inserting (dry run)
uv run python scripts/seed_data.py --dry-run

# Seed users to database
uv run python scripts/seed_data.py

# Reset and reseed (clears existing seed data first)
uv run python scripts/seed_data.py --reset
```

### Method 3: Manual SQL Execution

Connect to the PostgreSQL database and run the seed script manually:

```bash
# Using docker compose
docker compose exec postgres psql -U rxdx -d rxdx -f /docker-entrypoint-initdb.d/05-seed-data.sql

# Or connect directly
psql -h localhost -U rxdx -d rxdx -f backend/db/init/05-seed-data.sql
```

### Method 4: API Endpoints (Development Only)

If the application is running, you can use the API to create users:

```bash
# Login as admin first
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@rxdx.example.com", "password": "password123"}'

# Use the returned token to create additional users
curl -X POST http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@rxdx.example.com", "password": "password123", "full_name": "New User", "role": "user"}'
```

## Verifying Seed Data

### Check Users

```bash
# Via API
curl http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer <admin_token>"

# Via database
docker compose exec db psql -U rxdx -d rxdx -c "SELECT email, full_name, role, is_active FROM users;"
```

### Check Graph Data

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

## Customizing Seed Data

### Adding New Users

Edit `backend/db/init/05-seed-data.sql` or `backend/scripts/seed_data.py`:

```sql
-- In 05-seed-data.sql
INSERT INTO users (id, email, hashed_password, full_name, role, is_active)
VALUES (
    'your-uuid-here',
    'newuser@rxdx.example.com',
    '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$K8Ij5PqKAqkLxvOlm5nYdHWaIxRNIHbunPE8JWA3yCk',
    'New User Name',
    'user',
    TRUE
) ON CONFLICT (email) DO NOTHING;
```

### Generating Password Hashes

To generate a new Argon2 password hash:

```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
print(pwd_context.hash("your_password_here"))
```

Or use the seed script:

```bash
cd backend
uv run python -c "
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['argon2'], deprecated='auto')
print(pwd_context.hash('your_password_here'))
"
```

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

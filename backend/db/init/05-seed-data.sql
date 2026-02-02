-- ============================================================================
-- DEPRECATED: This SQL seed file is deprecated in favor of YAML templates
-- ============================================================================
--
-- This file is maintained for backward compatibility only.
-- New projects should use the template-based seeding approach instead.
--
-- Migration Path:
-- 1. Use the Python seed script with templates:
--    uv run python scripts/seed_data.py --template default
--
-- 2. Or use the template CLI:
--    uv run python scripts/template_cli.py apply default
--
-- 3. Or use the REST API:
--    POST /api/v1/templates/default/apply
--
-- Available templates:
-- - default: Same data as this SQL file (7 users, 4 requirements, 3 tasks, 3 tests, 2 risks)
-- - medical-device: Regulatory-focused template for medical device projects
-- - software-only: Agile development template for software projects
-- - minimal: Minimal template with admin user only
--
-- For more information, see SEED_DATA.md
--
-- ============================================================================

-- Seed data for RxDx development and testing
-- This script creates example users and sample data for the application

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- Create users table if not exists (for development without full migration)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create user_role enum type if not exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'project_manager', 'validator', 'auditor', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SEED USERS
-- All passwords are hashed using Argon2 (password = 'password123')
-- Hash generated with: passlib.context.CryptContext(schemes=['argon2'], argon2__memory_cost=65536, argon2__time_cost=3, argon2__parallelism=4).hash('password123')
-- ============================================================================

-- Admin user
INSERT INTO users (id, email, hashed_password, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@rxdx.example.com',
    '$argon2id$v=19$m=65536,t=3,p=4$8x6jdM455/z//5/zHmPMGQ$E7NWwbopR6St9kCD+ModeUyoVbhTzsp/jEJZnqzHMJA',
    'System Administrator',
    'admin',
    TRUE
) ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password;

-- Project Manager
INSERT INTO users (id, email, hashed_password, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'pm@rxdx.example.com',
    '$argon2id$v=19$m=65536,t=3,p=4$8x6jdM455/z//5/zHmPMGQ$E7NWwbopR6St9kCD+ModeUyoVbhTzsp/jEJZnqzHMJA',
    'Project Manager',
    'project_manager',
    TRUE
) ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password;

-- Validator
INSERT INTO users (id, email, hashed_password, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'validator@rxdx.example.com',
    '$argon2id$v=19$m=65536,t=3,p=4$8x6jdM455/z//5/zHmPMGQ$E7NWwbopR6St9kCD+ModeUyoVbhTzsp/jEJZnqzHMJA',
    'Quality Validator',
    'validator',
    TRUE
) ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password;

-- Auditor
INSERT INTO users (id, email, hashed_password, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'auditor@rxdx.example.com',
    '$argon2id$v=19$m=65536,t=3,p=4$8x6jdM455/z//5/zHmPMGQ$E7NWwbopR6St9kCD+ModeUyoVbhTzsp/jEJZnqzHMJA',
    'Compliance Auditor',
    'auditor',
    TRUE
) ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password;

-- Regular User (Developer)
INSERT INTO users (id, email, hashed_password, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000005',
    'developer@rxdx.example.com',
    '$argon2id$v=19$m=65536,t=3,p=4$8x6jdM455/z//5/zHmPMGQ$E7NWwbopR6St9kCD+ModeUyoVbhTzsp/jEJZnqzHMJA',
    'Software Developer',
    'user',
    TRUE
) ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password;

-- Regular User (Tester)
INSERT INTO users (id, email, hashed_password, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'tester@rxdx.example.com',
    '$argon2id$v=19$m=65536,t=3,p=4$8x6jdM455/z//5/zHmPMGQ$E7NWwbopR6St9kCD+ModeUyoVbhTzsp/jEJZnqzHMJA',
    'QA Tester',
    'user',
    TRUE
) ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password;

-- Inactive User (for testing)
INSERT INTO users (id, email, hashed_password, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000007',
    'inactive@rxdx.example.com',
    '$argon2id$v=19$m=65536,t=3,p=4$8x6jdM455/z//5/zHmPMGQ$E7NWwbopR6St9kCD+ModeUyoVbhTzsp/jEJZnqzHMJA',
    'Inactive User',
    'user',
    FALSE
) ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password;

-- ============================================================================
-- SEED GRAPH DATA (Apache AGE)
-- ============================================================================

-- Load AGE extension
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- Create sample Requirements
SELECT * FROM cypher('rxdx_graph', $$
    CREATE (r1:Requirement {
        id: '10000000-0000-0000-0000-000000000001',
        title: 'User Authentication System',
        description: 'The system shall provide secure user authentication using industry-standard protocols',
        status: 'active',
        priority: 5,
        version: '1.0',
        type: 'requirement',
        acceptance_criteria: 'Given a valid user credential, when the user attempts to login, then the system shall authenticate and provide a JWT token',
        business_value: 'Ensures secure access to the system and protects sensitive data',
        source: 'security',
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
    })
    RETURN r1
$$) AS (r agtype);

SELECT * FROM cypher('rxdx_graph', $$
    CREATE (r2:Requirement {
        id: '10000000-0000-0000-0000-000000000002',
        title: 'Role-Based Access Control',
        description: 'The system shall implement RBAC with predefined roles: admin, project_manager, validator, auditor, user',
        status: 'active',
        priority: 5,
        version: '1.0',
        type: 'requirement',
        acceptance_criteria: 'Given a user with a specific role, when accessing a protected resource, then the system shall grant or deny access based on role permissions',
        business_value: 'Provides granular access control for regulatory compliance',
        source: 'compliance',
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
    })
    RETURN r2
$$) AS (r agtype);

SELECT * FROM cypher('rxdx_graph', $$
    CREATE (r3:Requirement {
        id: '10000000-0000-0000-0000-000000000003',
        title: 'Audit Trail Logging',
        description: 'The system shall maintain an immutable audit trail of all user actions for compliance purposes',
        status: 'active',
        priority: 4,
        version: '1.0',
        type: 'requirement',
        acceptance_criteria: 'Given any user action, when the action is performed, then the system shall create an immutable audit log entry with timestamp, user, and action details',
        business_value: 'Enables regulatory compliance and forensic analysis',
        source: 'regulation',
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
    })
    RETURN r3
$$) AS (r agtype);

SELECT * FROM cypher('rxdx_graph', $$
    CREATE (r4:Requirement {
        id: '10000000-0000-0000-0000-000000000004',
        title: 'Digital Signature Support',
        description: 'The system shall support cryptographic digital signatures for document approval workflows',
        status: 'draft',
        priority: 4,
        version: '1.0',
        type: 'requirement',
        acceptance_criteria: 'Given a document requiring approval, when an authorized user signs it, then the system shall create a cryptographic signature that can be verified',
        business_value: 'Provides non-repudiation for regulatory document approval',
        source: 'compliance',
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
    })
    RETURN r4
$$) AS (r agtype);

-- Create sample Tasks
SELECT * FROM cypher('rxdx_graph', $$
    CREATE (t1:Task {
        id: '20000000-0000-0000-0000-000000000001',
        title: 'Implement JWT Authentication',
        description: 'Implement JWT-based authentication with access and refresh tokens',
        status: 'completed',
        priority: 5,
        version: '1.0',
        type: 'task',
        estimated_hours: 16,
        actual_hours: 14,
        assigned_to: '00000000-0000-0000-0000-000000000005',
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-05T00:00:00Z'
    })
    RETURN t1
$$) AS (t agtype);

SELECT * FROM cypher('rxdx_graph', $$
    CREATE (t2:Task {
        id: '20000000-0000-0000-0000-000000000002',
        title: 'Create User Management API',
        description: 'Develop REST API endpoints for user CRUD operations',
        status: 'active',
        priority: 4,
        version: '1.0',
        type: 'task',
        estimated_hours: 24,
        actual_hours: 8,
        assigned_to: '00000000-0000-0000-0000-000000000005',
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: '2026-01-03T00:00:00Z',
        updated_at: '2026-01-10T00:00:00Z'
    })
    RETURN t2
$$) AS (t agtype);

SELECT * FROM cypher('rxdx_graph', $$
    CREATE (t3:Task {
        id: '20000000-0000-0000-0000-000000000003',
        title: 'Implement Audit Logging Service',
        description: 'Create audit logging service with immutable log storage',
        status: 'draft',
        priority: 4,
        version: '1.0',
        type: 'task',
        estimated_hours: 20,
        assigned_to: '00000000-0000-0000-0000-000000000005',
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: '2026-01-04T00:00:00Z',
        updated_at: '2026-01-04T00:00:00Z'
    })
    RETURN t3
$$) AS (t agtype);

-- Create sample Tests
SELECT * FROM cypher('rxdx_graph', $$
    CREATE (test1:Test {
        id: '30000000-0000-0000-0000-000000000001',
        title: 'Test User Login Success',
        description: 'Verify successful user login with valid credentials',
        status: 'active',
        priority: 5,
        version: '1.0',
        type: 'test',
        test_type: 'integration',
        test_steps: '1. Navigate to login page\n2. Enter valid email\n3. Enter valid password\n4. Click login button',
        expected_result: 'User is authenticated and redirected to dashboard',
        test_status: 'passed',
        assigned_to: '00000000-0000-0000-0000-000000000006',
        created_by: '00000000-0000-0000-0000-000000000003',
        created_at: '2026-01-05T00:00:00Z',
        updated_at: '2026-01-08T00:00:00Z'
    })
    RETURN test1
$$) AS (t agtype);

SELECT * FROM cypher('rxdx_graph', $$
    CREATE (test2:Test {
        id: '30000000-0000-0000-0000-000000000002',
        title: 'Test Invalid Login Attempt',
        description: 'Verify system rejects invalid credentials',
        status: 'active',
        priority: 5,
        version: '1.0',
        type: 'test',
        test_type: 'integration',
        test_steps: '1. Navigate to login page\n2. Enter invalid email\n3. Enter any password\n4. Click login button',
        expected_result: 'User sees error message and is not authenticated',
        test_status: 'passed',
        assigned_to: '00000000-0000-0000-0000-000000000006',
        created_by: '00000000-0000-0000-0000-000000000003',
        created_at: '2026-01-05T00:00:00Z',
        updated_at: '2026-01-08T00:00:00Z'
    })
    RETURN test2
$$) AS (t agtype);

SELECT * FROM cypher('rxdx_graph', $$
    CREATE (test3:Test {
        id: '30000000-0000-0000-0000-000000000003',
        title: 'Test Account Lockout',
        description: 'Verify account lockout after 3 failed login attempts',
        status: 'active',
        priority: 4,
        version: '1.0',
        type: 'test',
        test_type: 'security',
        test_steps: '1. Attempt login with wrong password 3 times\n2. Verify account is locked\n3. Wait for lockout period\n4. Verify account is unlocked',
        expected_result: 'Account is locked after 3 failed attempts and unlocks after timeout',
        test_status: 'not_run',
        assigned_to: '00000000-0000-0000-0000-000000000006',
        created_by: '00000000-0000-0000-0000-000000000003',
        created_at: '2026-01-06T00:00:00Z',
        updated_at: '2026-01-06T00:00:00Z'
    })
    RETURN test3
$$) AS (t agtype);

-- Create sample Risks
SELECT * FROM cypher('rxdx_graph', $$
    CREATE (risk1:Risk {
        id: '40000000-0000-0000-0000-000000000001',
        title: 'Unauthorized Access Risk',
        description: 'Risk of unauthorized users gaining access to sensitive data',
        status: 'active',
        priority: 5,
        version: '1.0',
        type: 'risk',
        severity: 9,
        occurrence: 3,
        detection: 2,
        rpn: 54,
        mitigation_actions: 'Implement MFA, regular security audits, intrusion detection',
        risk_owner: '00000000-0000-0000-0000-000000000001',
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
    })
    RETURN risk1
$$) AS (r agtype);

SELECT * FROM cypher('rxdx_graph', $$
    CREATE (risk2:Risk {
        id: '40000000-0000-0000-0000-000000000002',
        title: 'Data Integrity Risk',
        description: 'Risk of data corruption or unauthorized modification',
        status: 'active',
        priority: 4,
        version: '1.0',
        type: 'risk',
        severity: 8,
        occurrence: 2,
        detection: 3,
        rpn: 48,
        mitigation_actions: 'Implement checksums, audit logging, backup procedures',
        risk_owner: '00000000-0000-0000-0000-000000000001',
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
    })
    RETURN risk2
$$) AS (r agtype);

-- Create Relationships
-- Requirements -> Tasks (IMPLEMENTS)
SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r:Requirement {id: '10000000-0000-0000-0000-000000000001'}),
          (t:Task {id: '20000000-0000-0000-0000-000000000001'})
    CREATE (t)-[:IMPLEMENTS {created_at: '2026-01-02T00:00:00Z'}]->(r)
    RETURN r, t
$$) AS (r agtype, t agtype);

SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r:Requirement {id: '10000000-0000-0000-0000-000000000001'}),
          (t:Task {id: '20000000-0000-0000-0000-000000000002'})
    CREATE (t)-[:IMPLEMENTS {created_at: '2026-01-03T00:00:00Z'}]->(r)
    RETURN r, t
$$) AS (r agtype, t agtype);

SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r:Requirement {id: '10000000-0000-0000-0000-000000000003'}),
          (t:Task {id: '20000000-0000-0000-0000-000000000003'})
    CREATE (t)-[:IMPLEMENTS {created_at: '2026-01-04T00:00:00Z'}]->(r)
    RETURN r, t
$$) AS (r agtype, t agtype);

-- Requirements -> Tests (TESTED_BY)
SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r:Requirement {id: '10000000-0000-0000-0000-000000000001'}),
          (t:Test {id: '30000000-0000-0000-0000-000000000001'})
    CREATE (r)-[:TESTED_BY {created_at: '2026-01-05T00:00:00Z'}]->(t)
    RETURN r, t
$$) AS (r agtype, t agtype);

SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r:Requirement {id: '10000000-0000-0000-0000-000000000001'}),
          (t:Test {id: '30000000-0000-0000-0000-000000000002'})
    CREATE (r)-[:TESTED_BY {created_at: '2026-01-05T00:00:00Z'}]->(t)
    RETURN r, t
$$) AS (r agtype, t agtype);

SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r:Requirement {id: '10000000-0000-0000-0000-000000000001'}),
          (t:Test {id: '30000000-0000-0000-0000-000000000003'})
    CREATE (r)-[:TESTED_BY {created_at: '2026-01-06T00:00:00Z'}]->(t)
    RETURN r, t
$$) AS (r agtype, t agtype);

-- Requirements -> Risks (MITIGATES)
SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r:Requirement {id: '10000000-0000-0000-0000-000000000001'}),
          (risk:Risk {id: '40000000-0000-0000-0000-000000000001'})
    CREATE (r)-[:MITIGATES {created_at: '2026-01-01T00:00:00Z'}]->(risk)
    RETURN r, risk
$$) AS (r agtype, risk agtype);

SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r:Requirement {id: '10000000-0000-0000-0000-000000000002'}),
          (risk:Risk {id: '40000000-0000-0000-0000-000000000001'})
    CREATE (r)-[:MITIGATES {created_at: '2026-01-01T00:00:00Z'}]->(risk)
    RETURN r, risk
$$) AS (r agtype, risk agtype);

SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r:Requirement {id: '10000000-0000-0000-0000-000000000003'}),
          (risk:Risk {id: '40000000-0000-0000-0000-000000000002'})
    CREATE (r)-[:MITIGATES {created_at: '2026-01-01T00:00:00Z'}]->(risk)
    RETURN r, risk
$$) AS (r agtype, risk agtype);

-- Requirement Dependencies (DEPENDS_ON)
SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r1:Requirement {id: '10000000-0000-0000-0000-000000000002'}),
          (r2:Requirement {id: '10000000-0000-0000-0000-000000000001'})
    CREATE (r1)-[:DEPENDS_ON {created_at: '2026-01-01T00:00:00Z'}]->(r2)
    RETURN r1, r2
$$) AS (r1 agtype, r2 agtype);

SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r1:Requirement {id: '10000000-0000-0000-0000-000000000003'}),
          (r2:Requirement {id: '10000000-0000-0000-0000-000000000001'})
    CREATE (r1)-[:DEPENDS_ON {created_at: '2026-01-01T00:00:00Z'}]->(r2)
    RETURN r1, r2
$$) AS (r1 agtype, r2 agtype);

SELECT * FROM cypher('rxdx_graph', $$
    MATCH (r1:Requirement {id: '10000000-0000-0000-0000-000000000004'}),
          (r2:Requirement {id: '10000000-0000-0000-0000-000000000001'})
    CREATE (r1)-[:DEPENDS_ON {created_at: '2026-01-01T00:00:00Z'}]->(r2)
    RETURN r1, r2
$$) AS (r1 agtype, r2 agtype);

-- Task Dependencies (DEPENDS_ON)
SELECT * FROM cypher('rxdx_graph', $$
    MATCH (t1:Task {id: '20000000-0000-0000-0000-000000000002'}),
          (t2:Task {id: '20000000-0000-0000-0000-000000000001'})
    CREATE (t1)-[:DEPENDS_ON {created_at: '2026-01-03T00:00:00Z'}]->(t2)
    RETURN t1, t2
$$) AS (t1 agtype, t2 agtype);

-- Log successful seeding
DO $$
BEGIN
    RAISE NOTICE 'Seed data inserted successfully';
    RAISE NOTICE 'Created 7 users, 4 requirements, 3 tasks, 3 tests, 2 risks';
END $$;

#!/usr/bin/env python3
"""
Seed data script for RxDx development and testing.

This script creates example users and sample data in the database.
It can be run standalone or imported as a module.

Usage:
    uv run python scripts/seed_data.py [--reset]

Options:
    --reset     Clear existing data before seeding
"""

import asyncio
import sys
from datetime import datetime, timezone
from uuid import UUID

from passlib.context import CryptContext

# Password hashing context
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Default password for all seed users
DEFAULT_PASSWORD = "password123"


# ============================================================================
# SEED USER DATA
# ============================================================================

SEED_USERS = [
    {
        "id": UUID("00000000-0000-0000-0000-000000000001"),
        "email": "admin@rxdx.local",
        "full_name": "System Administrator",
        "role": "admin",
        "is_active": True,
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000002"),
        "email": "pm@rxdx.local",
        "full_name": "Project Manager",
        "role": "project_manager",
        "is_active": True,
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000003"),
        "email": "validator@rxdx.local",
        "full_name": "Quality Validator",
        "role": "validator",
        "is_active": True,
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000004"),
        "email": "auditor@rxdx.local",
        "full_name": "Compliance Auditor",
        "role": "auditor",
        "is_active": True,
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000005"),
        "email": "developer@rxdx.local",
        "full_name": "Software Developer",
        "role": "user",
        "is_active": True,
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000006"),
        "email": "tester@rxdx.local",
        "full_name": "QA Tester",
        "role": "user",
        "is_active": True,
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000007"),
        "email": "inactive@rxdx.local",
        "full_name": "Inactive User",
        "role": "user",
        "is_active": False,
    },
]


# ============================================================================
# SEED WORKITEM DATA
# ============================================================================

SEED_REQUIREMENTS = [
    {
        "id": "10000000-0000-0000-0000-000000000001",
        "title": "User Authentication System",
        "description": "The system shall provide secure user authentication using industry-standard protocols",
        "status": "active",
        "priority": 5,
        "type": "requirement",
        "acceptance_criteria": "Given a valid user credential, when the user attempts to login, then the system shall authenticate and provide a JWT token",
        "business_value": "Ensures secure access to the system and protects sensitive data",
        "source": "security",
        "created_by": "00000000-0000-0000-0000-000000000002",
    },
    {
        "id": "10000000-0000-0000-0000-000000000002",
        "title": "Role-Based Access Control",
        "description": "The system shall implement RBAC with predefined roles: admin, project_manager, validator, auditor, user",
        "status": "active",
        "priority": 5,
        "type": "requirement",
        "acceptance_criteria": "Given a user with a specific role, when accessing a protected resource, then the system shall grant or deny access based on role permissions",
        "business_value": "Provides granular access control for regulatory compliance",
        "source": "compliance",
        "created_by": "00000000-0000-0000-0000-000000000002",
    },
    {
        "id": "10000000-0000-0000-0000-000000000003",
        "title": "Audit Trail Logging",
        "description": "The system shall maintain an immutable audit trail of all user actions for compliance purposes",
        "status": "active",
        "priority": 4,
        "type": "requirement",
        "acceptance_criteria": "Given any user action, when the action is performed, then the system shall create an immutable audit log entry with timestamp, user, and action details",
        "business_value": "Enables regulatory compliance and forensic analysis",
        "source": "regulation",
        "created_by": "00000000-0000-0000-0000-000000000002",
    },
    {
        "id": "10000000-0000-0000-0000-000000000004",
        "title": "Digital Signature Support",
        "description": "The system shall support cryptographic digital signatures for document approval workflows",
        "status": "draft",
        "priority": 4,
        "type": "requirement",
        "acceptance_criteria": "Given a document requiring approval, when an authorized user signs it, then the system shall create a cryptographic signature that can be verified",
        "business_value": "Provides non-repudiation for regulatory document approval",
        "source": "compliance",
        "created_by": "00000000-0000-0000-0000-000000000002",
    },
]

SEED_TASKS = [
    {
        "id": "20000000-0000-0000-0000-000000000001",
        "title": "Implement JWT Authentication",
        "description": "Implement JWT-based authentication with access and refresh tokens",
        "status": "completed",
        "priority": 5,
        "type": "task",
        "estimated_hours": 16,
        "actual_hours": 14,
        "assigned_to": "00000000-0000-0000-0000-000000000005",
        "created_by": "00000000-0000-0000-0000-000000000002",
    },
    {
        "id": "20000000-0000-0000-0000-000000000002",
        "title": "Create User Management API",
        "description": "Develop REST API endpoints for user CRUD operations",
        "status": "active",
        "priority": 4,
        "type": "task",
        "estimated_hours": 24,
        "actual_hours": 8,
        "assigned_to": "00000000-0000-0000-0000-000000000005",
        "created_by": "00000000-0000-0000-0000-000000000002",
    },
    {
        "id": "20000000-0000-0000-0000-000000000003",
        "title": "Implement Audit Logging Service",
        "description": "Create audit logging service with immutable log storage",
        "status": "draft",
        "priority": 4,
        "type": "task",
        "estimated_hours": 20,
        "assigned_to": "00000000-0000-0000-0000-000000000005",
        "created_by": "00000000-0000-0000-0000-000000000002",
    },
]

SEED_TESTS = [
    {
        "id": "30000000-0000-0000-0000-000000000001",
        "title": "Test User Login Success",
        "description": "Verify successful user login with valid credentials",
        "status": "active",
        "priority": 5,
        "type": "test",
        "test_type": "integration",
        "test_steps": "1. Navigate to login page\n2. Enter valid email\n3. Enter valid password\n4. Click login button",
        "expected_result": "User is authenticated and redirected to dashboard",
        "test_status": "passed",
        "assigned_to": "00000000-0000-0000-0000-000000000006",
        "created_by": "00000000-0000-0000-0000-000000000003",
    },
    {
        "id": "30000000-0000-0000-0000-000000000002",
        "title": "Test Invalid Login Attempt",
        "description": "Verify system rejects invalid credentials",
        "status": "active",
        "priority": 5,
        "type": "test",
        "test_type": "integration",
        "test_steps": "1. Navigate to login page\n2. Enter invalid email\n3. Enter any password\n4. Click login button",
        "expected_result": "User sees error message and is not authenticated",
        "test_status": "passed",
        "assigned_to": "00000000-0000-0000-0000-000000000006",
        "created_by": "00000000-0000-0000-0000-000000000003",
    },
    {
        "id": "30000000-0000-0000-0000-000000000003",
        "title": "Test Account Lockout",
        "description": "Verify account lockout after 3 failed login attempts",
        "status": "active",
        "priority": 4,
        "type": "test",
        "test_type": "security",
        "test_steps": "1. Attempt login with wrong password 3 times\n2. Verify account is locked\n3. Wait for lockout period\n4. Verify account is unlocked",
        "expected_result": "Account is locked after 3 failed attempts and unlocks after timeout",
        "test_status": "not_run",
        "assigned_to": "00000000-0000-0000-0000-000000000006",
        "created_by": "00000000-0000-0000-0000-000000000003",
    },
]

SEED_RISKS = [
    {
        "id": "40000000-0000-0000-0000-000000000001",
        "title": "Unauthorized Access Risk",
        "description": "Risk of unauthorized users gaining access to sensitive data",
        "status": "active",
        "priority": 5,
        "type": "risk",
        "severity": 9,
        "occurrence": 3,
        "detection": 2,
        "rpn": 54,
        "mitigation_actions": "Implement MFA, regular security audits, intrusion detection",
        "risk_owner": "00000000-0000-0000-0000-000000000001",
        "created_by": "00000000-0000-0000-0000-000000000002",
    },
    {
        "id": "40000000-0000-0000-0000-000000000002",
        "title": "Data Integrity Risk",
        "description": "Risk of data corruption or unauthorized modification",
        "status": "active",
        "priority": 4,
        "type": "risk",
        "severity": 8,
        "occurrence": 2,
        "detection": 3,
        "rpn": 48,
        "mitigation_actions": "Implement checksums, audit logging, backup procedures",
        "risk_owner": "00000000-0000-0000-0000-000000000001",
        "created_by": "00000000-0000-0000-0000-000000000002",
    },
]

# Relationships between workitems
SEED_RELATIONSHIPS = [
    # Task implements Requirement
    {"from_id": "20000000-0000-0000-0000-000000000001", "to_id": "10000000-0000-0000-0000-000000000001", "type": "IMPLEMENTS"},
    {"from_id": "20000000-0000-0000-0000-000000000002", "to_id": "10000000-0000-0000-0000-000000000001", "type": "IMPLEMENTS"},
    {"from_id": "20000000-0000-0000-0000-000000000003", "to_id": "10000000-0000-0000-0000-000000000003", "type": "IMPLEMENTS"},
    # Requirement tested by Test
    {"from_id": "10000000-0000-0000-0000-000000000001", "to_id": "30000000-0000-0000-0000-000000000001", "type": "TESTED_BY"},
    {"from_id": "10000000-0000-0000-0000-000000000001", "to_id": "30000000-0000-0000-0000-000000000002", "type": "TESTED_BY"},
    {"from_id": "10000000-0000-0000-0000-000000000001", "to_id": "30000000-0000-0000-0000-000000000003", "type": "TESTED_BY"},
    # Requirement mitigates Risk
    {"from_id": "10000000-0000-0000-0000-000000000001", "to_id": "40000000-0000-0000-0000-000000000001", "type": "MITIGATES"},
    {"from_id": "10000000-0000-0000-0000-000000000002", "to_id": "40000000-0000-0000-0000-000000000001", "type": "MITIGATES"},
    {"from_id": "10000000-0000-0000-0000-000000000003", "to_id": "40000000-0000-0000-0000-000000000002", "type": "MITIGATES"},
    # Requirement depends on Requirement
    {"from_id": "10000000-0000-0000-0000-000000000002", "to_id": "10000000-0000-0000-0000-000000000001", "type": "DEPENDS_ON"},
    {"from_id": "10000000-0000-0000-0000-000000000003", "to_id": "10000000-0000-0000-0000-000000000001", "type": "DEPENDS_ON"},
    {"from_id": "10000000-0000-0000-0000-000000000004", "to_id": "10000000-0000-0000-0000-000000000001", "type": "DEPENDS_ON"},
    # Task depends on Task
    {"from_id": "20000000-0000-0000-0000-000000000002", "to_id": "20000000-0000-0000-0000-000000000001", "type": "DEPENDS_ON"},
]


def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return pwd_context.hash(password)


def print_users_table():
    """Print a formatted table of seed users."""
    print("\n" + "=" * 80)
    print("SEED USERS")
    print("=" * 80)
    print(f"{'Email':<30} {'Name':<25} {'Role':<20} {'Active':<8}")
    print("-" * 80)
    for user in SEED_USERS:
        active = "Yes" if user["is_active"] else "No"
        print(f"{user['email']:<30} {user['full_name']:<25} {user['role']:<20} {active:<8}")
    print("-" * 80)
    print(f"Default password for all users: {DEFAULT_PASSWORD}")
    print("=" * 80 + "\n")


def print_workitems_summary():
    """Print a summary of seed workitems."""
    print("\n" + "=" * 80)
    print("SEED WORKITEMS")
    print("=" * 80)
    print(f"Requirements: {len(SEED_REQUIREMENTS)}")
    print(f"Tasks: {len(SEED_TASKS)}")
    print(f"Tests: {len(SEED_TESTS)}")
    print(f"Risks: {len(SEED_RISKS)}")
    print(f"Relationships: {len(SEED_RELATIONSHIPS)}")
    print("=" * 80 + "\n")


async def seed_users_to_db():
    """Seed users to the database using SQLAlchemy."""
    try:
        from app.db.session import async_session_maker
        from app.models.user import User
        from sqlalchemy import select
        
        async with async_session_maker() as session:
            for user_data in SEED_USERS:
                # Check if user already exists
                result = await session.execute(
                    select(User).where(User.email == user_data["email"])
                )
                existing_user = result.scalar_one_or_none()
                
                if existing_user:
                    print(f"User {user_data['email']} already exists, skipping...")
                    continue
                
                # Create new user
                user = User(
                    id=user_data["id"],
                    email=user_data["email"],
                    hashed_password=hash_password(DEFAULT_PASSWORD),
                    full_name=user_data["full_name"],
                    role=user_data["role"],
                    is_active=user_data["is_active"],
                )
                session.add(user)
                print(f"Created user: {user_data['email']}")
            
            await session.commit()
            print("\nUsers seeded successfully!")
            
    except ImportError as e:
        print(f"Error importing database modules: {e}")
        print("Make sure you're running from the backend directory with the correct environment.")
        sys.exit(1)
    except Exception as e:
        print(f"Error seeding users: {e}")
        sys.exit(1)


async def main():
    """Main entry point for the seed script."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed RxDx database with example data")
    parser.add_argument("--reset", action="store_true", help="Clear existing data before seeding")
    parser.add_argument("--dry-run", action="store_true", help="Print seed data without inserting")
    args = parser.parse_args()
    
    print_users_table()
    print_workitems_summary()
    
    if args.dry_run:
        print("Dry run mode - no data was inserted.")
        return
    
    print("Seeding database...")
    await seed_users_to_db()
    print("\nSeed complete!")


if __name__ == "__main__":
    asyncio.run(main())

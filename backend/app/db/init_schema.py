"""Database schema initialization script"""

import asyncio

from sqlalchemy import select

from app.db.graph import graph_service
from app.db.session import AsyncSessionLocal, init_db
from app.models.user import User, UserRole
from app.services.auth_service import AuthService

# Default users to seed for development
DEFAULT_USERS = [
    {
        "email": "test@example.com",
        "password": "AdminPassword123!",
        "full_name": "Test User",
        "role": UserRole.USER.value,
    },
    {
        "email": "admin@example.com",
        "password": "AdminPassword123!",
        "full_name": "Admin User",
        "role": UserRole.ADMIN.value,
    },
    {
        "email": "validator@example.com",
        "password": "AdminPassword123!",
        "full_name": "Validator User",
        "role": UserRole.VALIDATOR.value,
    },
    {
        "email": "auditor@example.com",
        "password": "AdminPassword123!",
        "full_name": "Auditor User",
        "role": UserRole.AUDITOR.value,
    },
    {
        "email": "pm@example.com",
        "password": "AdminPassword123!",
        "full_name": "Project Manager",
        "role": UserRole.PROJECT_MANAGER.value,
    },
]


async def seed_users(skip_existing: bool = True) -> list[str]:
    """
    Seed default users for development.

    Args:
        skip_existing: If True, skip users that already exist

    Returns:
        List of created user emails
    """
    created_users = []

    async with AsyncSessionLocal() as session:
        auth_service = AuthService(session)

        for user_data in DEFAULT_USERS:
            # Check if user already exists
            result = await session.execute(
                select(User).where(User.email == user_data["email"])
            )
            existing_user = result.scalar_one_or_none()

            if existing_user:
                if skip_existing:
                    print(f"  User {user_data['email']} already exists, skipping...")
                    continue
                else:
                    # Delete existing user to recreate
                    await session.delete(existing_user)
                    await session.commit()

            # Create user
            user = await auth_service.create_user(
                email=user_data["email"],
                password=user_data["password"],
                full_name=user_data["full_name"],
                role=user_data["role"],
            )
            created_users.append(user.email)
            print(f"  Created user: {user.email} (role: {user.role.value})")

    return created_users


async def initialize_graph_schema():
    """Initialize Apache AGE graph schema with node and relationship types"""

    await graph_service.connect()

    print("Initializing Apache AGE graph schema...")

    # Create sample nodes to establish schema
    # Note: AGE is schema-less, but we can document expected node types

    node_types = [
        "WorkItem",
        "Requirement",
        "Task",
        "Test",
        "Risk",
        "Failure",
        "Document",
        "Entity",
        "User",
    ]

    relationship_types = [
        "TESTED_BY",
        "MITIGATES",
        "DEPENDS_ON",
        "IMPLEMENTS",
        "LEADS_TO",
        "RELATES_TO",
        "MENTIONED_IN",
        "REFERENCES",
        "NEXT_VERSION",
        "CREATED_BY",
        "ASSIGNED_TO",
    ]

    print(f"Supported node types: {', '.join(node_types)}")
    print(f"Supported relationship types: {', '.join(relationship_types)}")

    # Verify graph is accessible
    try:
        result = await graph_service.execute_query("MATCH (n) RETURN count(n) as count")
        node_count = result[0].get('count', 0) if result else 0
        print(f"Graph initialized successfully. Current node count: {node_count}")
    except Exception as e:
        print(f"Warning: Could not verify graph: {e}")

    await graph_service.close()


async def main(seed_users_flag: bool = True):
    """
    Main initialization function.

    Args:
        seed_users_flag: If True, seed default development users
    """
    print("Starting database initialization...")

    # Initialize PostgreSQL tables
    print("\n1. Initializing PostgreSQL tables...")
    await init_db()
    print("PostgreSQL tables initialized successfully")

    # Seed default users
    if seed_users_flag:
        print("\n2. Seeding default users...")
        created = await seed_users()
        if created:
            print(f"Created {len(created)} user(s)")
        else:
            print("No new users created (all already exist)")

    # Initialize Apache AGE graph schema
    print("\n3. Initializing Apache AGE graph schema...")
    await initialize_graph_schema()

    print("\n✓ Database initialization complete!")

    if seed_users_flag:
        print("\n" + "=" * 50)
        print("Default login credentials:")
        print("=" * 50)
        for user in DEFAULT_USERS:
            print(f"  {user['email']} / AdminPassword123! ({user['role']})")
        print("=" * 50)


if __name__ == "__main__":
    import sys

    # Check for --no-seed flag
    seed_flag = "--no-seed" not in sys.argv

    asyncio.run(main(seed_users_flag=seed_flag))

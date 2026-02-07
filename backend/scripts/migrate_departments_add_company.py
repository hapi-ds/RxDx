"""
Migration script: Add company_id to existing Department nodes

This script:
1. Creates a default company if none exists
2. Adds company_id property to all existing Department nodes
3. Creates PARENT_OF relationships from the default company to all departments

Usage:
    uv run python scripts/migrate_departments_add_company.py [--dry-run]
"""

import argparse
import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.graph import GraphService


async def migrate_departments(dry_run: bool = False):
    """
    Migrate existing Department nodes to include company_id and PARENT_OF relationship

    Args:
        dry_run: If True, only show what would be done without making changes
    """
    graph_service = GraphService()

    try:
        # Connect to database
        print("Connecting to database...")
        await graph_service.connect()
        print("✓ Connected to database")

        # Check for existing companies
        print("\nChecking for existing companies...")
        companies_query = "MATCH (c:Company) RETURN c"
        companies = await graph_service.execute_query(companies_query)

        if companies:
            print(f"✓ Found {len(companies)} existing companies")
            # Use the first company as default
            default_company = companies[0]
            if "properties" in default_company:
                default_company = default_company["properties"]
            default_company_id = default_company["id"]
            print(f"  Using company: {default_company['name']} ({default_company_id})")
        else:
            # Create default company
            print("✗ No companies found")
            default_company_id = str(uuid4())
            default_company_name = "Default Company"

            if dry_run:
                print(
                    f"[DRY RUN] Would create default company: {default_company_name} ({default_company_id})"
                )
            else:
                print(f"Creating default company: {default_company_name}...")
                now = datetime.now(UTC)
                company_props = {
                    "id": default_company_id,
                    "name": default_company_name,
                    "description": "Default company created during department migration",
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }
                await graph_service.create_node("Company", company_props)
                print(f"✓ Created default company: {default_company_id}")

        # Find all departments
        print("\nFinding existing departments...")
        departments_query = "MATCH (d:Department) RETURN d"
        departments = await graph_service.execute_query(departments_query)

        if not departments:
            print("✓ No departments found - nothing to migrate")
            return

        print(f"✓ Found {len(departments)} departments to migrate")

        # Migrate each department
        migrated_count = 0
        skipped_count = 0

        for dept in departments:
            dept_data = dept
            if "properties" in dept_data:
                dept_data = dept_data["properties"]

            dept_id = dept_data["id"]
            dept_name = dept_data.get("name", "Unknown")

            # Check if department already has company_id
            if "company_id" in dept_data and dept_data["company_id"]:
                print(f"  ⊙ Skipping {dept_name} ({dept_id}) - already has company_id")
                skipped_count += 1
                continue

            if dry_run:
                print(
                    f"  [DRY RUN] Would add company_id to {dept_name} ({dept_id})"
                )
                print(
                    f"  [DRY RUN] Would create PARENT_OF relationship: {default_company_id} -> {dept_id}"
                )
                migrated_count += 1
            else:
                # Add company_id property
                update_query = f"""
                MATCH (d:Department {{id: '{dept_id}'}})
                SET d.company_id = '{default_company_id}'
                RETURN d
                """
                await graph_service.execute_query(update_query)

                # Create PARENT_OF relationship
                await graph_service.create_relationship(
                    from_id=default_company_id,
                    to_id=dept_id,
                    rel_type="PARENT_OF",
                )

                print(f"  ✓ Migrated {dept_name} ({dept_id})")
                migrated_count += 1

        # Summary
        print("\n" + "=" * 60)
        print("Migration Summary:")
        print(f"  Total departments found: {len(departments)}")
        print(f"  Migrated: {migrated_count}")
        print(f"  Skipped (already migrated): {skipped_count}")

        if dry_run:
            print("\n[DRY RUN] No changes were made to the database")
        else:
            print("\n✓ Migration completed successfully")

    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        # Close database connection
        await graph_service.close()
        print("\n✓ Database connection closed")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Migrate Department nodes to include company_id"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes",
    )

    args = parser.parse_args()

    print("=" * 60)
    print("Department Migration Script")
    print("=" * 60)

    if args.dry_run:
        print("\n⚠ DRY RUN MODE - No changes will be made\n")

    # Run migration
    asyncio.run(migrate_departments(dry_run=args.dry_run))


if __name__ == "__main__":
    main()

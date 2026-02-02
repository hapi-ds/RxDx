#!/usr/bin/env python3
"""
Seed data script for RxDx development and testing.

This script applies project templates to seed the database with example users and sample data.
It replaces the previous hardcoded seed data approach with a template-based system.

Usage:
    uv run python scripts/seed_data.py [--template TEMPLATE] [--dry-run]

Options:
    --template TEMPLATE  Template name to apply (default: default)
                        Available: default, medical-device, software-only, minimal
    --dry-run           Show what would be created without making changes
"""

import asyncio
import sys
from pathlib import Path


async def apply_template(template_name: str, dry_run: bool = False):
    """Apply a template to seed the database."""
    try:
        from app.db.session import AsyncSessionLocal
        from app.db.graph import get_graph_service
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from app.services.template_service import TemplateService

        # Setup paths
        backend_dir = Path(__file__).parent.parent
        templates_dir = backend_dir / "templates"
        schema_path = templates_dir / "schema.json"

        # Initialize services
        parser = TemplateParser(templates_dir)
        validator = TemplateValidator(schema_path)
        
        async with AsyncSessionLocal() as session:
            graph_service = await get_graph_service()
            template_service = TemplateService(parser, validator, session, graph_service)

            # Apply template
            print(f"\nApplying template: {template_name}")
            if dry_run:
                print("(DRY RUN - no changes will be made)\n")
            
            result = await template_service.apply_template(template_name, dry_run=dry_run)

            # Print results
            print("\n" + "=" * 80)
            print("TEMPLATE APPLICATION SUMMARY")
            print("=" * 80)
            print(f"Template: {result.template_name}")
            print(f"Dry Run: {result.dry_run}")
            print(f"Success: {result.success}")
            print(f"\nEntities Created: {result.created_count}")
            print(f"Entities Skipped: {result.skipped_count}")
            print(f"Entities Failed: {result.failed_count}")
            
            if result.entities:
                print("\nDetails:")
                for entity in result.entities:
                    status_symbol = "✓" if entity.status == "created" else "○" if entity.status == "skipped" else "✗"
                    print(f"  {status_symbol} {entity.type}: {entity.id} - {entity.status}")
                    if entity.message:
                        print(f"    {entity.message}")
            
            print("=" * 80 + "\n")

            if result.success:
                print("Template applied successfully!")
            else:
                print("Template application completed with errors.")
                sys.exit(1)

    except ImportError as e:
        print(f"Error importing modules: {e}")
        print("Make sure you're running from the backend directory with the correct environment.")
        sys.exit(1)
    except Exception as e:
        print(f"Error applying template: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


async def list_templates():
    """List available templates."""
    try:
        from app.services.template_parser import TemplateParser

        backend_dir = Path(__file__).parent.parent
        templates_dir = backend_dir / "templates"
        
        parser = TemplateParser(templates_dir)
        templates = parser.list_templates()

        print("\n" + "=" * 80)
        print("AVAILABLE TEMPLATES")
        print("=" * 80)
        print(f"{'Name':<20} {'Version':<10} {'Description':<50}")
        print("-" * 80)
        for template in templates:
            desc = template.description[:47] + "..." if len(template.description) > 50 else template.description
            print(f"{template.name:<20} {template.version:<10} {desc:<50}")
        print("=" * 80 + "\n")

    except Exception as e:
        print(f"Error listing templates: {e}")
        sys.exit(1)


async def main():
    """Main entry point for the seed script."""
    import argparse

    parser = argparse.ArgumentParser(description="Seed RxDx database with template data")
    parser.add_argument(
        "--template",
        default="default",
        help="Template name to apply (default: default). Available: default, medical-device, software-only, minimal"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be created without making changes"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available templates"
    )
    args = parser.parse_args()

    if args.list:
        await list_templates()
        return

    print(f"\nRxDx Seed Data Script")
    print(f"Template: {args.template}")
    if args.dry_run:
        print("Mode: DRY RUN (no changes will be made)")
    print()

    await apply_template(args.template, dry_run=args.dry_run)


if __name__ == "__main__":
    asyncio.run(main())

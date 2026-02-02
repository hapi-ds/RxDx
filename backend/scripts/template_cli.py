#!/usr/bin/env python3
"""
Template CLI - Command-line interface for template management.

This script provides CLI commands for managing project templates including
listing available templates, applying templates to the database, and validating
template files.

Usage:
    # List templates in table format (default)
    uv run python scripts/template_cli.py list

    # List templates in JSON format
    uv run python scripts/template_cli.py list --format json

    # Apply a template
    uv run python scripts/template_cli.py apply <template-name>

    # Apply a template with dry-run
    uv run python scripts/template_cli.py apply <template-name> --dry-run

    # Validate a template
    uv run python scripts/template_cli.py validate <template-name>

    # Validate with JSON output
    uv run python scripts/template_cli.py validate <template-name> --format json

Requirements:
    - 9.1: Provide CLI command to list available templates
    - 9.2: Provide CLI command to apply a template by name
    - 9.3: Provide CLI command to validate a template file
    - 9.4: Output results in both human-readable and JSON formats
    - 9.5: Provide --dry-run flag for apply command
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))


def print_table_header(columns: list[tuple[str, int]]) -> None:
    """
    Print a formatted table header.

    Args:
        columns: List of (column_name, width) tuples
    """
    # Print header
    header = " | ".join(name.ljust(width) for name, width in columns)
    print(header)
    print("-" * len(header))


def print_table_row(values: list[str], widths: list[int]) -> None:
    """
    Print a formatted table row.

    Args:
        values: List of column values
        widths: List of column widths
    """
    row = " | ".join(str(val).ljust(width) for val, width in zip(values, widths))
    print(row)


async def list_templates(format: str = "table") -> int:
    """
    List all available templates.

    Args:
        format: Output format - "table" or "json"

    Returns:
        Exit code (0 for success, 1 for error)

    Requirements:
        - 9.1: Provide CLI command to list available templates
        - 9.4: Output results in both human-readable and JSON formats
    """
    try:
        from app.db.graph import get_graph_service
        from app.db.session import AsyncSessionLocal
        from app.services.template_parser import TemplateParser
        from app.services.template_service import TemplateService
        from app.services.template_validator import TemplateValidator

        # Initialize services
        templates_dir = Path(__file__).parent.parent / "templates"
        schema_path = templates_dir / "schema.json"

        parser = TemplateParser(templates_dir)
        validator = TemplateValidator(schema_path)

        async with AsyncSessionLocal() as db_session:
            graph_service = await get_graph_service()
            service = TemplateService(parser, validator, db_session, graph_service)

            # Get templates
            templates = await service.list_templates()

            if format == "json":
                # JSON output
                output = [
                    {
                        "name": t.name,
                        "version": t.version,
                        "description": t.description,
                        "author": t.author,
                    }
                    for t in templates
                ]
                print(json.dumps(output, indent=2))
            else:
                # Table output
                if not templates:
                    print("No templates found.")
                    return 0

                print("\nAvailable Templates:")
                print("=" * 100)

                columns = [
                    ("Name", 25),
                    ("Version", 10),
                    ("Author", 20),
                    ("Description", 40),
                ]
                print_table_header(columns)

                for template in templates:
                    # Truncate description if too long
                    desc = template.description
                    if len(desc) > 40:
                        desc = desc[:37] + "..."

                    print_table_row(
                        [template.name, template.version, template.author, desc],
                        [w for _, w in columns],
                    )

                print("=" * 100)
                print(f"\nTotal: {len(templates)} template(s)")

            return 0

    except Exception as e:
        print(f"Error listing templates: {e}", file=sys.stderr)
        return 1


async def apply_template(name: str, dry_run: bool = False, format: str = "table") -> int:
    """
    Apply a template to the database.

    Args:
        name: Template name to apply
        dry_run: If True, simulate application without making changes
        format: Output format - "table" or "json"

    Returns:
        Exit code (0 for success, 1 for error)

    Requirements:
        - 9.2: Provide CLI command to apply a template by name
        - 9.4: Output results in both human-readable and JSON formats
        - 9.5: Provide --dry-run flag
    """
    try:
        from app.db.graph import get_graph_service
        from app.db.session import AsyncSessionLocal
        from app.services.template_parser import TemplateParser
        from app.services.template_service import TemplateService
        from app.services.template_validator import TemplateValidator

        # Initialize services
        templates_dir = Path(__file__).parent.parent / "templates"
        schema_path = templates_dir / "schema.json"

        parser = TemplateParser(templates_dir)
        validator = TemplateValidator(schema_path)

        async with AsyncSessionLocal() as db_session:
            graph_service = await get_graph_service()
            service = TemplateService(parser, validator, db_session, graph_service)

            # Apply template
            if dry_run:
                print(f"\n[DRY RUN] Simulating application of template '{name}'...")
            else:
                print(f"\nApplying template '{name}'...")

            result = await service.apply_template(name, dry_run=dry_run)

            if format == "json":
                # JSON output
                output = {
                    "success": result.success,
                    "template_name": result.template_name,
                    "dry_run": result.dry_run,
                    "created_count": result.created_count,
                    "skipped_count": result.skipped_count,
                    "failed_count": result.failed_count,
                    "entities": [
                        {
                            "id": e.id,
                            "type": e.type,
                            "status": e.status,
                            "message": e.message,
                        }
                        for e in result.entities
                    ],
                }
                print(json.dumps(output, indent=2))
            else:
                # Table output
                print("\n" + "=" * 80)
                print("Application Result")
                print("=" * 80)
                print(f"Template: {result.template_name}")
                print(f"Status: {'SUCCESS' if result.success else 'FAILED'}")
                if dry_run:
                    print("Mode: DRY RUN (no changes made)")
                print(f"\nCreated: {result.created_count}")
                print(f"Skipped: {result.skipped_count}")
                print(f"Failed: {result.failed_count}")

                # Show detailed results if there are any failures or if verbose
                if result.failed_count > 0 or result.skipped_count > 0:
                    print("\nDetailed Results:")
                    print("-" * 80)

                    # Group by status
                    for status in ["failed", "skipped"]:
                        entities = [e for e in result.entities if e.status == status]
                        if entities:
                            print(f"\n{status.upper()}:")
                            for entity in entities:
                                msg = f"  - {entity.type} '{entity.id}'"
                                if entity.message:
                                    msg += f": {entity.message}"
                                print(msg)

                print("=" * 80)

            return 0 if result.success else 1

    except Exception as e:
        print(f"Error applying template: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        return 1


async def validate_template(name: str, format: str = "table") -> int:
    """
    Validate a template file without applying it.

    Args:
        name: Template name to validate
        format: Output format - "table" or "json"

    Returns:
        Exit code (0 for success, 1 for error)

    Requirements:
        - 9.3: Provide CLI command to validate a template file
        - 9.4: Output results in both human-readable and JSON formats
    """
    try:
        from app.db.graph import get_graph_service
        from app.db.session import AsyncSessionLocal
        from app.services.template_parser import TemplateParser
        from app.services.template_service import TemplateService
        from app.services.template_validator import TemplateValidator

        # Initialize services
        templates_dir = Path(__file__).parent.parent / "templates"
        schema_path = templates_dir / "schema.json"

        parser = TemplateParser(templates_dir)
        validator = TemplateValidator(schema_path)

        async with AsyncSessionLocal() as db_session:
            graph_service = await get_graph_service()
            service = TemplateService(parser, validator, db_session, graph_service)

            # Validate template
            print(f"\nValidating template '{name}'...")
            result = await service.validate_template(name)

            if format == "json":
                # JSON output
                output = {
                    "valid": result.valid,
                    "errors": [
                        {
                            "path": e.path,
                            "message": e.message,
                            "value": e.value,
                        }
                        for e in result.errors
                    ],
                }
                print(json.dumps(output, indent=2))
            else:
                # Table output
                print("\n" + "=" * 80)
                print("Validation Result")
                print("=" * 80)
                print(f"Template: {name}")
                print(f"Status: {'VALID' if result.valid else 'INVALID'}")

                if not result.valid:
                    print(f"\nErrors found: {len(result.errors)}")
                    print("-" * 80)
                    for i, error in enumerate(result.errors, 1):
                        print(f"\n{i}. Path: {error.path}")
                        print(f"   Message: {error.message}")
                        if error.value:
                            print(f"   Value: {error.value}")
                else:
                    print("\nNo errors found. Template is valid!")

                print("=" * 80)

            # Return exit code 1 for invalid templates
            return 1 if not result.valid else 0

    except Exception as e:
        print(f"Error validating template: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        return 1


def main() -> int:
    """
    Main entry point for the template CLI.

    Returns:
        Exit code (0 for success, 1 for error)
    """
    parser = argparse.ArgumentParser(
        description="Template CLI - Manage project templates",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # List templates in table format
  %(prog)s list

  # List templates in JSON format
  %(prog)s list --format json

  # Apply a template
  %(prog)s apply medical-device

  # Apply with dry-run
  %(prog)s apply medical-device --dry-run

  # Validate a template
  %(prog)s validate medical-device

  # Validate with JSON output
  %(prog)s validate medical-device --format json
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # List command
    list_parser = subparsers.add_parser(
        "list", help="List all available templates"
    )
    list_parser.add_argument(
        "--format",
        choices=["table", "json"],
        default="table",
        help="Output format (default: table)",
    )

    # Apply command
    apply_parser = subparsers.add_parser(
        "apply", help="Apply a template to the database"
    )
    apply_parser.add_argument("name", help="Template name to apply")
    apply_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate application without making changes",
    )
    apply_parser.add_argument(
        "--format",
        choices=["table", "json"],
        default="table",
        help="Output format (default: table)",
    )

    # Validate command
    validate_parser = subparsers.add_parser(
        "validate", help="Validate a template file"
    )
    validate_parser.add_argument("name", help="Template name to validate")
    validate_parser.add_argument(
        "--format",
        choices=["table", "json"],
        default="table",
        help="Output format (default: table)",
    )

    # Parse arguments
    args = parser.parse_args()

    # Check if command was provided
    if not args.command:
        parser.print_help()
        return 1

    # Execute command
    if args.command == "list":
        return asyncio.run(list_templates(format=args.format))
    elif args.command == "apply":
        return asyncio.run(
            apply_template(args.name, dry_run=args.dry_run, format=args.format)
        )
    elif args.command == "validate":
        return asyncio.run(validate_template(args.name, format=args.format))
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())

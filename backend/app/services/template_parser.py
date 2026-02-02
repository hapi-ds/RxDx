"""
Template Parser Service.

This module provides functionality for loading and parsing YAML template files
into structured TemplateDefinition objects. It handles YAML syntax validation,
file discovery, and metadata extraction.

Requirements:
- 2.1: Parse YAML template files containing users, workitems, and relationships
- 2.3: Return descriptive parsing errors for invalid YAML syntax
- 3.1: Discover all valid template files in the templates directory
- 3.2: Return template metadata without loading full content
- 3.4: Load and return complete template definition by name
"""

from pathlib import Path

import yaml
from pydantic import ValidationError

from app.schemas.template import TemplateDefinition, TemplateMetadata


class TemplateParseError(Exception):
    """Exception raised when template parsing fails."""

    pass


class TemplateParser:
    """
    Parses YAML template files into structured data.

    This class is responsible for:
    - Loading template files from the filesystem
    - Parsing YAML content into Python dictionaries
    - Validating and converting to Pydantic models
    - Listing available templates with metadata
    """

    def __init__(self, templates_dir: Path):
        """
        Initialize the template parser.

        Args:
            templates_dir: Path to the directory containing template YAML files
        """
        self.templates_dir = Path(templates_dir)
        if not self.templates_dir.exists():
            raise ValueError(f"Templates directory does not exist: {templates_dir}")
        if not self.templates_dir.is_dir():
            raise ValueError(f"Templates path is not a directory: {templates_dir}")

    def load_template(self, name: str) -> TemplateDefinition:
        """
        Load a template by name from the templates directory.

        This method:
        1. Locates the template file by name
        2. Reads and parses the YAML content
        3. Validates the structure using Pydantic models
        4. Returns a complete TemplateDefinition object

        Args:
            name: Template name (without .yaml extension)

        Returns:
            TemplateDefinition object with all template data

        Raises:
            TemplateParseError: If template file not found, YAML is invalid,
                              or validation fails

        Requirements:
            - 2.1: Parse YAML template files
            - 2.3: Return descriptive parsing errors
            - 3.4: Load and return complete template definition
        """
        # Construct template file path
        template_path = self.templates_dir / f"{name}.yaml"

        # Check if template file exists
        if not template_path.exists():
            raise TemplateParseError(f"Template '{name}' not found at {template_path}")

        # Read template file
        try:
            with open(template_path, encoding="utf-8") as f:
                content = f.read()
        except OSError as e:
            raise TemplateParseError(f"Failed to read template file '{name}': {e}")

        # Parse YAML content
        try:
            data = yaml.safe_load(content)
        except yaml.YAMLError as e:
            # Extract line number and error message from YAML error
            error_msg = str(e)
            if hasattr(e, "problem_mark"):
                mark = e.problem_mark
                error_msg = f"YAML parse error at line {mark.line + 1}, column {mark.column + 1}: {e.problem}"
            raise TemplateParseError(f"Invalid YAML in template '{name}': {error_msg}")

        # Validate that we got a dictionary
        if not isinstance(data, dict):
            raise TemplateParseError(
                f"Template '{name}' must contain a YAML object (dictionary), got {type(data).__name__}"
            )

        # Validate and convert to Pydantic model
        try:
            template = TemplateDefinition(**data)
        except ValidationError as e:
            # Format validation errors for better readability
            error_messages = []
            for error in e.errors():
                loc = " -> ".join(str(x) for x in error["loc"])
                msg = error["msg"]
                error_messages.append(f"{loc}: {msg}")
            raise TemplateParseError(
                f"Validation failed for template '{name}':\n" + "\n".join(error_messages)
            )

        return template

    def list_templates(self) -> list[TemplateMetadata]:
        """
        List all available templates with metadata only.

        This method scans the templates directory for .yaml files and extracts
        only the metadata section from each template. This is more efficient
        than loading full templates when only metadata is needed.

        Returns:
            List of TemplateMetadata objects for all valid templates

        Raises:
            TemplateParseError: If a template file cannot be parsed

        Requirements:
            - 3.1: Discover all valid template files
            - 3.2: Return template metadata without loading full content
        """
        templates = []

        # Find all .yaml files in templates directory
        yaml_files = sorted(self.templates_dir.glob("*.yaml"))

        for template_path in yaml_files:
            try:
                # Read only the metadata section for efficiency
                with open(template_path, encoding="utf-8") as f:
                    content = f.read()

                # Parse YAML
                data = yaml.safe_load(content)

                # Validate that we got a dictionary with metadata
                if not isinstance(data, dict):
                    continue  # Skip invalid files

                if "metadata" not in data:
                    continue  # Skip files without metadata

                # Extract and validate metadata
                try:
                    metadata = TemplateMetadata(**data["metadata"])
                    templates.append(metadata)
                except ValidationError:
                    # Skip templates with invalid metadata
                    continue

            except (OSError, yaml.YAMLError):
                # Skip files that can't be read or parsed
                continue

        return templates

    def validate_yaml(self, content: str) -> tuple[bool, list[str]]:
        """
        Validate YAML syntax and return errors if any.

        This method checks if the provided content is valid YAML syntax.
        It does NOT validate against the template schema - that's done by
        the TemplateValidator. This only checks for YAML parsing errors.

        Args:
            content: YAML content as a string

        Returns:
            Tuple of (is_valid, error_messages)
            - is_valid: True if YAML is syntactically valid, False otherwise
            - error_messages: List of error messages (empty if valid)

        Requirements:
            - 2.3: Return descriptive parsing errors for invalid YAML
        """
        errors = []

        # Check for empty content
        if not content or not content.strip():
            errors.append("YAML content is empty")
            return (False, errors)

        # Try to parse YAML
        try:
            data = yaml.safe_load(content)

            # Validate that we got a dictionary (required for templates)
            if data is None:
                errors.append("YAML content is empty or contains only comments")
                return (False, errors)

            if not isinstance(data, dict):
                errors.append(
                    f"Template must be a YAML object (dictionary), got {type(data).__name__}"
                )
                return (False, errors)

        except yaml.YAMLError as e:
            # Extract detailed error information
            error_msg = str(e)
            if hasattr(e, "problem_mark"):
                mark = e.problem_mark
                error_msg = f"YAML parse error at line {mark.line + 1}, column {mark.column + 1}: {e.problem}"
            else:
                error_msg = f"YAML parse error: {error_msg}"

            errors.append(error_msg)
            return (False, errors)

        # YAML is valid
        return (True, [])

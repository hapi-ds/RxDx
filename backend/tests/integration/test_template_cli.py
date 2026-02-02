"""
Integration tests for template CLI.

This module tests the template CLI commands including list, apply, and validate.
Tests verify both table and JSON output formats, as well as error handling.
"""

import json
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.mark.integration
class TestTemplateCLI:
    """Integration tests for template CLI commands."""

    @pytest.fixture
    def cli_path(self) -> Path:
        """Get path to the CLI script."""
        return Path(__file__).parent.parent.parent / "scripts" / "template_cli.py"

    def run_cli(self, cli_path: Path, args: list[str]) -> tuple[int, str, str]:
        """
        Run the CLI command and return exit code, stdout, and stderr.

        Args:
            cli_path: Path to the CLI script
            args: Command line arguments

        Returns:
            Tuple of (exit_code, stdout, stderr)
        """
        cmd = [sys.executable, str(cli_path)] + args
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cli_path.parent.parent,
        )
        return result.returncode, result.stdout, result.stderr

    def test_cli_help(self, cli_path: Path):
        """Test that CLI help is displayed correctly."""
        exit_code, stdout, stderr = self.run_cli(cli_path, ["--help"])

        assert exit_code == 0
        assert "Template CLI - Manage project templates" in stdout
        assert "list" in stdout
        assert "apply" in stdout
        assert "validate" in stdout

    def test_list_command_help(self, cli_path: Path):
        """Test that list command help is displayed correctly."""
        exit_code, stdout, stderr = self.run_cli(cli_path, ["list", "--help"])

        assert exit_code == 0
        assert "list" in stdout
        assert "--format" in stdout

    def test_apply_command_help(self, cli_path: Path):
        """Test that apply command help is displayed correctly."""
        exit_code, stdout, stderr = self.run_cli(cli_path, ["apply", "--help"])

        assert exit_code == 0
        assert "apply" in stdout
        assert "--dry-run" in stdout
        assert "--format" in stdout

    def test_validate_command_help(self, cli_path: Path):
        """Test that validate command help is displayed correctly."""
        exit_code, stdout, stderr = self.run_cli(cli_path, ["validate", "--help"])

        assert exit_code == 0
        assert "validate" in stdout
        assert "--format" in stdout

    def test_list_builtin_templates_table_format(self, cli_path: Path):
        """Test listing built-in templates (table format)."""
        exit_code, stdout, stderr = self.run_cli(cli_path, ["list"])

        assert exit_code == 0
        # Should list at least the 4 built-in templates
        assert "default" in stdout
        assert "medical-device" in stdout
        assert "software-only" in stdout
        assert "minimal" in stdout
        assert "Total: 4 template(s)" in stdout

    def test_list_builtin_templates_json_format(self, cli_path: Path):
        """Test listing built-in templates (JSON format)."""
        exit_code, stdout, stderr = self.run_cli(cli_path, ["list", "--format", "json"])

        assert exit_code == 0
        # Parse JSON output
        output = json.loads(stdout)
        assert isinstance(output, list)
        assert len(output) == 4
        
        # Check that all built-in templates are present
        template_names = [t["name"] for t in output]
        assert "default" in template_names
        assert "medical-device" in template_names
        assert "software-only" in template_names
        assert "minimal" in template_names

    def test_validate_nonexistent_template(self, cli_path: Path):
        """Test validating a template that doesn't exist."""
        exit_code, stdout, stderr = self.run_cli(
            cli_path, ["validate", "nonexistent-template"]
        )

        # Should return 1 for invalid template
        assert exit_code == 1
        assert "INVALID" in stdout or "not found" in stdout.lower()

    def test_validate_nonexistent_template_json(self, cli_path: Path):
        """Test validating a nonexistent template with JSON output."""
        exit_code, stdout, stderr = self.run_cli(
            cli_path, ["validate", "nonexistent-template", "--format", "json"]
        )

        assert exit_code == 1
        # Find JSON in output (may have other text before it)
        json_start = stdout.find("{")
        json_end = stdout.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            json_output = stdout[json_start:json_end]
            output = json.loads(json_output)
            assert "valid" in output
            assert output["valid"] is False
            assert "errors" in output
            assert len(output["errors"]) > 0

    def test_no_command_shows_help(self, cli_path: Path):
        """Test that running CLI without command shows help."""
        exit_code, stdout, stderr = self.run_cli(cli_path, [])

        assert exit_code == 1
        assert "Template CLI" in stdout or "usage:" in stdout


@pytest.mark.integration
class TestTemplateCLIWithTemplate:
    """Integration tests for CLI with actual template files."""

    @pytest.fixture
    def cli_path(self) -> Path:
        """Get path to the CLI script."""
        return Path(__file__).parent.parent.parent / "scripts" / "template_cli.py"

    @pytest.fixture
    def templates_dir(self) -> Path:
        """Get path to templates directory."""
        return Path(__file__).parent.parent.parent / "templates"

    @pytest.fixture
    def test_template(self, templates_dir: Path) -> Path:
        """Create a test template file."""
        template_path = templates_dir / "test-cli-template.yaml"
        template_content = """metadata:
  name: test-cli-template
  version: 1.0.0
  description: Test template for CLI integration tests
  author: Test Suite

settings:
  default_password: password123

users:
  - id: test-user-cli
    email: test-cli@example.com
    full_name: Test CLI User
    role: admin
    is_active: true

workitems:
  requirements:
    - id: test-req-cli
      title: Test CLI Requirement
      description: A test requirement for CLI testing
      status: draft
      priority: 3
      created_by: test-user-cli

relationships: []
"""
        template_path.write_text(template_content)
        yield template_path
        # Cleanup
        if template_path.exists():
            template_path.unlink()

    def run_cli(self, cli_path: Path, args: list[str]) -> tuple[int, str, str]:
        """Run the CLI command and return exit code, stdout, and stderr."""
        cmd = [sys.executable, str(cli_path)] + args
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cli_path.parent.parent,
        )
        return result.returncode, result.stdout, result.stderr

    def test_list_with_template_table_format(self, cli_path: Path, test_template: Path):
        """Test listing templates with a template present (table format)."""
        exit_code, stdout, stderr = self.run_cli(cli_path, ["list"])

        assert exit_code == 0
        assert "test-cli-template" in stdout
        assert "1.0.0" in stdout
        assert "Test Suite" in stdout

    def test_list_with_template_json_format(self, cli_path: Path, test_template: Path):
        """Test listing templates with a template present (JSON format)."""
        exit_code, stdout, stderr = self.run_cli(cli_path, ["list", "--format", "json"])

        assert exit_code == 0
        output = json.loads(stdout)
        assert isinstance(output, list)
        assert len(output) >= 1

        # Find our test template
        test_tmpl = next(
            (t for t in output if t["name"] == "test-cli-template"), None
        )
        assert test_tmpl is not None
        assert test_tmpl["version"] == "1.0.0"
        assert test_tmpl["author"] == "Test Suite"

    def test_validate_valid_template_table_format(
        self, cli_path: Path, test_template: Path
    ):
        """Test validating a valid template (table format)."""
        exit_code, stdout, stderr = self.run_cli(
            cli_path, ["validate", "test-cli-template"]
        )

        assert exit_code == 0
        assert "VALID" in stdout
        assert "No errors found" in stdout

    def test_validate_valid_template_json_format(
        self, cli_path: Path, test_template: Path
    ):
        """Test validating a valid template (JSON format)."""
        exit_code, stdout, stderr = self.run_cli(
            cli_path, ["validate", "test-cli-template", "--format", "json"]
        )

        assert exit_code == 0
        # Find JSON in output
        json_start = stdout.find("{")
        json_end = stdout.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            json_output = stdout[json_start:json_end]
            output = json.loads(json_output)
            assert output["valid"] is True
            assert len(output["errors"]) == 0

    def test_apply_dry_run_table_format(self, cli_path: Path, test_template: Path):
        """Test applying a template with dry-run (table format)."""
        exit_code, stdout, stderr = self.run_cli(
            cli_path, ["apply", "test-cli-template", "--dry-run"]
        )

        assert exit_code == 0
        assert "DRY RUN" in stdout
        assert "test-cli-template" in stdout
        assert "Created:" in stdout or "created_count" in stdout.lower()

    def test_apply_dry_run_json_format(self, cli_path: Path, test_template: Path):
        """Test applying a template with dry-run (JSON format)."""
        exit_code, stdout, stderr = self.run_cli(
            cli_path, ["apply", "test-cli-template", "--dry-run", "--format", "json"]
        )

        assert exit_code == 0
        # Find JSON in output (between first { and last })
        json_start = stdout.find("{")
        json_end = stdout.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            json_output = stdout[json_start:json_end]
            output = json.loads(json_output)
            assert "success" in output
            assert output["dry_run"] is True
            assert "template_name" in output
            assert output["template_name"] == "test-cli-template"
            assert "entities" in output

"""
Unit tests for Template Parser Service.

Tests the TemplateParser class functionality including:
- Loading templates from YAML files
- Listing available templates
- YAML syntax validation
- Error handling for invalid templates
"""

import tempfile
from pathlib import Path

import pytest

from app.schemas.template import TemplateDefinition, TemplateMetadata
from app.services.template_parser import TemplateParseError, TemplateParser


@pytest.fixture
def temp_templates_dir():
    """Create a temporary directory for test templates."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def parser(temp_templates_dir):
    """Create a TemplateParser instance with temporary directory."""
    return TemplateParser(temp_templates_dir)


@pytest.fixture
def valid_template_yaml():
    """Return valid template YAML content."""
    return """
metadata:
  name: test-template
  version: 1.0.0
  description: A test template for unit testing
  author: Test Author

settings:
  default_password: testpass123

users:
  - id: admin-user
    email: admin@test.com
    full_name: Admin User
    role: admin
    is_active: true

workitems:
  requirements:
    - id: req-1
      title: Test Requirement
      priority: 3
      created_by: admin-user

relationships: []
"""


@pytest.fixture
def minimal_template_yaml():
    """Return minimal valid template YAML content."""
    return """
metadata:
  name: minimal-template
  version: 1.0.0
  description: Minimal template with only required fields
  author: Test Author
"""


class TestTemplateParserInit:
    """Test TemplateParser initialization."""

    def test_init_with_valid_directory(self, temp_templates_dir):
        """Test initialization with valid directory."""
        parser = TemplateParser(temp_templates_dir)
        assert parser.templates_dir == temp_templates_dir

    def test_init_with_nonexistent_directory(self):
        """Test initialization with non-existent directory raises error."""
        with pytest.raises(ValueError, match="Templates directory does not exist"):
            TemplateParser(Path("/nonexistent/directory"))

    def test_init_with_file_instead_of_directory(self, temp_templates_dir):
        """Test initialization with file path instead of directory raises error."""
        file_path = temp_templates_dir / "file.txt"
        file_path.write_text("test")

        with pytest.raises(ValueError, match="Templates path is not a directory"):
            TemplateParser(file_path)


class TestLoadTemplate:
    """Test load_template method."""

    def test_load_valid_template(self, parser, temp_templates_dir, valid_template_yaml):
        """Test loading a valid template file."""
        # Create template file
        template_path = temp_templates_dir / "test-template.yaml"
        template_path.write_text(valid_template_yaml)

        # Load template
        template = parser.load_template("test-template")

        # Verify template structure
        assert isinstance(template, TemplateDefinition)
        assert template.metadata.name == "test-template"
        assert template.metadata.version == "1.0.0"
        assert template.metadata.description == "A test template for unit testing"
        assert template.metadata.author == "Test Author"
        assert len(template.users) == 1
        assert template.users[0].email == "admin@test.com"
        assert len(template.workitems.requirements) == 1
        assert template.workitems.requirements[0].title == "Test Requirement"

    def test_load_minimal_template(self, parser, temp_templates_dir, minimal_template_yaml):
        """Test loading a minimal template with only required fields."""
        # Create template file
        template_path = temp_templates_dir / "minimal-template.yaml"
        template_path.write_text(minimal_template_yaml)

        # Load template
        template = parser.load_template("minimal-template")

        # Verify template structure
        assert isinstance(template, TemplateDefinition)
        assert template.metadata.name == "minimal-template"
        assert len(template.users) == 0
        assert len(template.workitems.requirements) == 0
        assert len(template.relationships) == 0

    def test_load_nonexistent_template(self, parser):
        """Test loading non-existent template raises error."""
        with pytest.raises(TemplateParseError, match="Template 'nonexistent' not found"):
            parser.load_template("nonexistent")

    def test_load_template_with_invalid_yaml(self, parser, temp_templates_dir):
        """Test loading template with invalid YAML syntax."""
        # Create template file with invalid YAML
        template_path = temp_templates_dir / "invalid.yaml"
        template_path.write_text("metadata:\n  name: test\n  invalid: [\n")

        with pytest.raises(TemplateParseError, match="Invalid YAML"):
            parser.load_template("invalid")

    def test_load_template_with_non_dict_content(self, parser, temp_templates_dir):
        """Test loading template with non-dictionary YAML content."""
        # Create template file with list instead of dict
        template_path = temp_templates_dir / "list-template.yaml"
        template_path.write_text("- item1\n- item2\n")

        with pytest.raises(TemplateParseError, match="must contain a YAML object"):
            parser.load_template("list-template")

    def test_load_template_with_missing_metadata(self, parser, temp_templates_dir):
        """Test loading template without required metadata."""
        # Create template file without metadata
        template_path = temp_templates_dir / "no-metadata.yaml"
        template_path.write_text("users: []\nworkitems: {}\n")

        with pytest.raises(TemplateParseError, match="Validation failed"):
            parser.load_template("no-metadata")

    def test_load_template_with_invalid_metadata(self, parser, temp_templates_dir):
        """Test loading template with invalid metadata fields."""
        # Create template file with invalid metadata
        template_path = temp_templates_dir / "bad-metadata.yaml"
        template_path.write_text("""
metadata:
  name: Invalid Name With Spaces
  version: not-a-version
  description: Too short
  author: Test
""")

        with pytest.raises(TemplateParseError, match="Validation failed"):
            parser.load_template("bad-metadata")

    def test_load_template_with_invalid_user(self, parser, temp_templates_dir):
        """Test loading template with invalid user data."""
        # Create template file with invalid user
        template_path = temp_templates_dir / "bad-user.yaml"
        template_path.write_text("""
metadata:
  name: test-template
  version: 1.0.0
  description: Template with invalid user data
  author: Test Author

users:
  - id: user1
    email: not-an-email
    full_name: Test User
    role: invalid_role
""")

        with pytest.raises(TemplateParseError, match="Validation failed"):
            parser.load_template("bad-user")


class TestListTemplates:
    """Test list_templates method."""

    def test_list_empty_directory(self, parser):
        """Test listing templates in empty directory."""
        templates = parser.list_templates()
        assert templates == []

    def test_list_single_template(self, parser, temp_templates_dir, valid_template_yaml):
        """Test listing single template."""
        # Create template file
        template_path = temp_templates_dir / "test-template.yaml"
        template_path.write_text(valid_template_yaml)

        # List templates
        templates = parser.list_templates()

        assert len(templates) == 1
        assert isinstance(templates[0], TemplateMetadata)
        assert templates[0].name == "test-template"
        assert templates[0].version == "1.0.0"

    def test_list_multiple_templates(self, parser, temp_templates_dir):
        """Test listing multiple templates."""
        # Create multiple template files
        for i in range(3):
            template_path = temp_templates_dir / f"template-{i}.yaml"
            template_path.write_text(f"""
metadata:
  name: template-{i}
  version: 1.0.{i}
  description: Test template number {i} for listing
  author: Test Author
""")

        # List templates
        templates = parser.list_templates()

        assert len(templates) == 3
        assert all(isinstance(t, TemplateMetadata) for t in templates)
        assert sorted([t.name for t in templates]) == ["template-0", "template-1", "template-2"]

    def test_list_templates_skips_invalid_files(self, parser, temp_templates_dir, valid_template_yaml):
        """Test that list_templates skips invalid files."""
        # Create valid template
        valid_path = temp_templates_dir / "valid.yaml"
        valid_path.write_text(valid_template_yaml)

        # Create invalid YAML file
        invalid_path = temp_templates_dir / "invalid.yaml"
        invalid_path.write_text("invalid: yaml: content: [\n")

        # Create file without metadata
        no_metadata_path = temp_templates_dir / "no-metadata.yaml"
        no_metadata_path.write_text("users: []\n")

        # Create non-YAML file
        txt_path = temp_templates_dir / "readme.txt"
        txt_path.write_text("This is not a template")

        # List templates - should only return valid one
        templates = parser.list_templates()

        assert len(templates) == 1
        assert templates[0].name == "test-template"

    def test_list_templates_sorted_by_name(self, parser, temp_templates_dir):
        """Test that templates are returned in sorted order."""
        # Create templates in non-alphabetical order
        names = ["zebra", "alpha", "beta"]
        for name in names:
            template_path = temp_templates_dir / f"{name}.yaml"
            template_path.write_text(f"""
metadata:
  name: {name}
  version: 1.0.0
  description: Template {name} for testing sort order
  author: Test Author
""")

        # List templates
        templates = parser.list_templates()

        # Verify sorted order
        template_names = [t.name for t in templates]
        assert template_names == ["alpha", "beta", "zebra"]


class TestValidateYaml:
    """Test validate_yaml method."""

    def test_validate_valid_yaml(self, parser):
        """Test validating valid YAML content."""
        yaml_content = """
metadata:
  name: test
  version: 1.0.0
users: []
"""
        is_valid, errors = parser.validate_yaml(yaml_content)

        assert is_valid is True
        assert errors == []

    def test_validate_empty_content(self, parser):
        """Test validating empty content."""
        is_valid, errors = parser.validate_yaml("")

        assert is_valid is False
        assert len(errors) == 1
        assert "empty" in errors[0].lower()

    def test_validate_whitespace_only(self, parser):
        """Test validating whitespace-only content."""
        is_valid, errors = parser.validate_yaml("   \n  \n  ")

        assert is_valid is False
        assert len(errors) == 1
        assert "empty" in errors[0].lower()

    def test_validate_invalid_yaml_syntax(self, parser):
        """Test validating YAML with syntax errors."""
        yaml_content = "metadata:\n  name: test\n  invalid: [\n"

        is_valid, errors = parser.validate_yaml(yaml_content)

        assert is_valid is False
        assert len(errors) == 1
        assert "parse error" in errors[0].lower()

    def test_validate_non_dict_yaml(self, parser):
        """Test validating YAML that's not a dictionary."""
        yaml_content = "- item1\n- item2\n"

        is_valid, errors = parser.validate_yaml(yaml_content)

        assert is_valid is False
        assert len(errors) == 1
        assert "dictionary" in errors[0].lower()

    def test_validate_yaml_with_only_comments(self, parser):
        """Test validating YAML with only comments."""
        yaml_content = "# This is a comment\n# Another comment\n"

        is_valid, errors = parser.validate_yaml(yaml_content)

        assert is_valid is False
        assert len(errors) == 1
        assert "empty" in errors[0].lower()

    def test_validate_complex_valid_yaml(self, parser, valid_template_yaml):
        """Test validating complex valid YAML."""
        is_valid, errors = parser.validate_yaml(valid_template_yaml)

        assert is_valid is True
        assert errors == []

"""Unit tests for Company Pydantic schemas"""

from datetime import datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.company import (
    CompanyBase,
    CompanyCreate,
    CompanyResponse,
    CompanyUpdate,
)


class TestCompanyBaseSchema:
    """Test CompanyBase schema validation"""

    def test_valid_company_base(self):
        """Test valid CompanyBase creation"""
        data = {
            "name": "Acme Corporation",
            "description": "A leading technology company",
        }
        company = CompanyBase(**data)
        assert company.name == "Acme Corporation"
        assert company.description == "A leading technology company"

    def test_minimal_company_base(self):
        """Test CompanyBase with minimal required fields"""
        data = {"name": "TechCorp"}
        company = CompanyBase(**data)
        assert company.name == "TechCorp"
        assert company.description is None

    def test_name_validation_empty(self):
        """Test name field validation for empty string"""
        with pytest.raises(ValidationError) as exc_info:
            CompanyBase(name="")
        assert "String should have at least 1 character" in str(exc_info.value)

    def test_name_validation_whitespace_only(self):
        """Test name field validation for whitespace-only string"""
        with pytest.raises(ValidationError) as exc_info:
            CompanyBase(name="   ")
        assert "Company name cannot be empty or whitespace-only" in str(exc_info.value)

    def test_name_validation_too_long(self):
        """Test name field validation for exceeding max length"""
        long_name = "x" * 201
        with pytest.raises(ValidationError) as exc_info:
            CompanyBase(name=long_name)
        assert "String should have at most 200 characters" in str(exc_info.value)

    def test_name_validation_no_alphanumeric(self):
        """Test name field validation for no alphanumeric characters"""
        with pytest.raises(ValidationError) as exc_info:
            CompanyBase(name="---")
        assert "Company name must contain at least one alphanumeric character" in str(
            exc_info.value
        )

    def test_name_whitespace_trimming(self):
        """Test that name whitespace is trimmed"""
        company = CompanyBase(name="  TechCorp  ")
        assert company.name == "TechCorp"

    def test_description_validation_too_long(self):
        """Test description field validation for exceeding max length"""
        long_description = "x" * 1001
        with pytest.raises(ValidationError) as exc_info:
            CompanyBase(name="TechCorp", description=long_description)
        assert "String should have at most 1000 characters" in str(exc_info.value)

    def test_description_whitespace_trimming(self):
        """Test that description whitespace is trimmed"""
        company = CompanyBase(name="TechCorp", description="  A great company  ")
        assert company.description == "A great company"

    def test_description_empty_string_becomes_none(self):
        """Test that empty description string becomes None"""
        company = CompanyBase(name="TechCorp", description="   ")
        assert company.description is None

    def test_valid_name_with_special_characters(self):
        """Test that names with special characters are valid"""
        valid_names = [
            "Acme Corp.",
            "Tech & Co.",
            "Company-Name",
            "Company_Name",
            "Company (USA)",
            "Company #1",
        ]
        for name in valid_names:
            company = CompanyBase(name=name)
            assert company.name == name

    def test_valid_name_minimum_length(self):
        """Test that single character names are valid"""
        company = CompanyBase(name="A")
        assert company.name == "A"

    def test_valid_name_maximum_length(self):
        """Test that 200 character names are valid"""
        max_name = "x" * 200
        company = CompanyBase(name=max_name)
        assert company.name == max_name
        assert len(company.name) == 200


class TestCompanyCreateSchema:
    """Test CompanyCreate schema validation"""

    def test_valid_company_create(self):
        """Test valid CompanyCreate"""
        data = {
            "name": "New Tech Company",
            "description": "An innovative technology startup",
        }
        company = CompanyCreate(**data)
        assert company.name == "New Tech Company"
        assert company.description == "An innovative technology startup"

    def test_company_create_minimal(self):
        """Test CompanyCreate with only required fields"""
        company = CompanyCreate(name="StartupCo")
        assert company.name == "StartupCo"
        assert company.description is None

    def test_company_create_inherits_validation(self):
        """Test that CompanyCreate inherits validation from CompanyBase"""
        with pytest.raises(ValidationError) as exc_info:
            CompanyCreate(name="")
        assert "String should have at least 1 character" in str(exc_info.value)

        with pytest.raises(ValidationError) as exc_info:
            CompanyCreate(name="   ")
        assert "Company name cannot be empty or whitespace-only" in str(exc_info.value)


class TestCompanyUpdateSchema:
    """Test CompanyUpdate schema validation"""

    def test_valid_company_update_all_fields(self):
        """Test valid CompanyUpdate with all fields"""
        data = {
            "name": "Updated Company Name",
            "description": "Updated company description",
        }
        update = CompanyUpdate(**data)
        assert update.name == "Updated Company Name"
        assert update.description == "Updated company description"

    def test_company_update_partial_name_only(self):
        """Test CompanyUpdate with only name field"""
        update = CompanyUpdate(name="New Name")
        assert update.name == "New Name"
        assert update.description is None

    def test_company_update_partial_description_only(self):
        """Test CompanyUpdate with only description field"""
        update = CompanyUpdate(description="New description")
        assert update.description == "New description"
        assert update.name is None

    def test_company_update_empty(self):
        """Test CompanyUpdate with no fields"""
        update = CompanyUpdate()
        assert update.name is None
        assert update.description is None

    def test_company_update_name_validation(self):
        """Test that CompanyUpdate validates name field"""
        with pytest.raises(ValidationError) as exc_info:
            CompanyUpdate(name="")
        assert "String should have at least 1 character" in str(exc_info.value)

        with pytest.raises(ValidationError) as exc_info:
            CompanyUpdate(name="   ")
        assert "Company name cannot be empty or whitespace-only" in str(exc_info.value)

        with pytest.raises(ValidationError) as exc_info:
            CompanyUpdate(name="---")
        assert "Company name must contain at least one alphanumeric character" in str(
            exc_info.value
        )

    def test_company_update_description_validation(self):
        """Test that CompanyUpdate validates description field"""
        long_description = "x" * 1001
        with pytest.raises(ValidationError) as exc_info:
            CompanyUpdate(description=long_description)
        assert "String should have at most 1000 characters" in str(exc_info.value)

    def test_company_update_whitespace_trimming(self):
        """Test that CompanyUpdate trims whitespace"""
        update = CompanyUpdate(name="  Updated Name  ", description="  Updated desc  ")
        assert update.name == "Updated Name"
        assert update.description == "Updated desc"


class TestCompanyResponseSchema:
    """Test CompanyResponse schema"""

    def test_valid_company_response(self):
        """Test valid CompanyResponse creation"""
        data = {
            "id": uuid4(),
            "name": "Response Company",
            "description": "A company in response",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        response = CompanyResponse(**data)
        assert response.name == "Response Company"
        assert response.description == "A company in response"
        assert response.id is not None
        assert response.created_at is not None
        assert response.updated_at is not None

    def test_company_response_minimal(self):
        """Test CompanyResponse with minimal fields"""
        data = {
            "id": uuid4(),
            "name": "Minimal Company",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        response = CompanyResponse(**data)
        assert response.name == "Minimal Company"
        assert response.description is None

    def test_company_response_from_attributes(self):
        """Test that CompanyResponse can be created from ORM attributes"""

        # This tests the model_config = {"from_attributes": True} setting
        class MockCompanyModel:
            def __init__(self):
                self.id = uuid4()
                self.name = "ORM Company"
                self.description = "From database"
                self.created_at = datetime.now()
                self.updated_at = datetime.now()

        mock_company = MockCompanyModel()
        response = CompanyResponse.model_validate(mock_company)
        assert response.name == "ORM Company"
        assert response.description == "From database"


class TestCompanySchemaIntegration:
    """Integration tests for Company schemas"""

    def test_create_to_response_flow(self):
        """Test the flow from create to response schema"""
        # Create a company
        create_data = {
            "name": "Integration Test Company",
            "description": "Testing the full flow",
        }
        company_create = CompanyCreate(**create_data)

        # Simulate database response
        response_data = {
            "id": uuid4(),
            "name": company_create.name,
            "description": company_create.description,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        company_response = CompanyResponse(**response_data)

        assert company_response.name == company_create.name
        assert company_response.description == company_create.description

    def test_update_to_response_flow(self):
        """Test the flow from update to response schema"""
        # Update a company
        update_data = {
            "name": "Updated Integration Company",
            "description": "Updated description",
        }
        company_update = CompanyUpdate(**update_data)

        # Simulate database response after update
        response_data = {
            "id": uuid4(),
            "name": company_update.name,
            "description": company_update.description,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        company_response = CompanyResponse(**response_data)

        assert company_response.name == company_update.name
        assert company_response.description == company_update.description

    def test_all_schemas_work_together(self):
        """Test that all Company schemas work together seamlessly"""
        # Base schema
        base = CompanyBase(name="Base Company", description="Base description")
        assert base.name == "Base Company"

        # Create schema
        create = CompanyCreate(name="Create Company", description="Create description")
        assert create.name == "Create Company"

        # Update schema
        update = CompanyUpdate(name="Update Company")
        assert update.name == "Update Company"
        assert update.description is None

        # Response schema
        response = CompanyResponse(
            id=uuid4(),
            name="Response Company",
            description="Response description",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert response.name == "Response Company"


class TestCompanySchemaEdgeCases:
    """Test edge cases for Company schemas"""

    def test_unicode_characters_in_name(self):
        """Test that unicode characters are handled correctly"""
        unicode_names = [
            "Société Française",
            "日本企業",
            "Компания",
            "شركة",
            "Empresa Española",
        ]
        for name in unicode_names:
            company = CompanyBase(name=name)
            assert company.name == name

    def test_unicode_characters_in_description(self):
        """Test that unicode characters in description are handled correctly"""
        company = CompanyBase(
            name="Global Corp", description="Operating in 日本, France, and العالم"
        )
        assert "日本" in company.description
        assert "العالم" in company.description

    def test_very_long_valid_description(self):
        """Test description at maximum length"""
        max_description = "x" * 1000
        company = CompanyBase(name="TechCorp", description=max_description)
        assert len(company.description) == 1000

    def test_name_with_numbers(self):
        """Test that names with numbers are valid"""
        company = CompanyBase(name="Company 123")
        assert company.name == "Company 123"

    def test_name_with_mixed_case(self):
        """Test that mixed case names are preserved"""
        company = CompanyBase(name="TechCorp USA")
        assert company.name == "TechCorp USA"

    def test_description_with_newlines(self):
        """Test that descriptions with newlines are handled"""
        description = "Line 1\nLine 2\nLine 3"
        company = CompanyBase(name="TechCorp", description=description)
        assert "\n" in company.description

    def test_description_with_special_characters(self):
        """Test that descriptions with special characters are handled"""
        description = "Company with special chars: @#$%^&*()_+-=[]{}|;:',.<>?/~`"
        company = CompanyBase(name="TechCorp", description=description)
        assert company.description == description


class TestCompanySchemaValidationRequirement:
    """Test that schemas validate Requirement 16.1"""

    def test_requirement_16_1_company_properties(self):
        """
        Validates: Requirement 16.1
        WHEN a Company is created, THE System SHALL create a Company node
        in the graph database with properties (id, name, description, created_at, updated_at)
        """
        # Test that CompanyCreate has required fields
        create = CompanyCreate(name="Test Company", description="Test description")
        assert hasattr(create, "name")
        assert hasattr(create, "description")

        # Test that CompanyResponse has all required properties
        response = CompanyResponse(
            id=uuid4(),
            name="Test Company",
            description="Test description",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert hasattr(response, "id")
        assert hasattr(response, "name")
        assert hasattr(response, "description")
        assert hasattr(response, "created_at")
        assert hasattr(response, "updated_at")

        # Verify types
        assert isinstance(response.name, str)
        assert isinstance(response.description, str) or response.description is None
        assert isinstance(response.created_at, datetime)
        assert isinstance(response.updated_at, datetime)

    def test_requirement_16_1_name_constraints(self):
        """
        Validates: Requirement 16.1 - name field constraints
        Name must be between 1 and 200 characters
        """
        # Test minimum length (1 character)
        company = CompanyBase(name="A")
        assert len(company.name) == 1

        # Test maximum length (200 characters)
        max_name = "x" * 200
        company = CompanyBase(name=max_name)
        assert len(company.name) == 200

        # Test that empty name fails
        with pytest.raises(ValidationError):
            CompanyBase(name="")

        # Test that name exceeding 200 characters fails
        with pytest.raises(ValidationError):
            CompanyBase(name="x" * 201)


class TestCompanySchemaComprehensive:
    """Comprehensive tests for all Company schema functionality"""

    def test_comprehensive_validation_and_functionality(self):
        """Test all Company schemas work correctly with proper validation"""

        # Test validation works correctly for name
        with pytest.raises(ValidationError) as exc_info:
            CompanyBase(name="")
        assert "String should have at least 1 character" in str(exc_info.value)

        with pytest.raises(ValidationError) as exc_info:
            CompanyBase(name="   ")
        assert "Company name cannot be empty or whitespace-only" in str(exc_info.value)

        # Test whitespace trimming works
        company = CompanyBase(name="  TechCorp  ", description="  Description  ")
        assert company.name == "TechCorp"
        assert company.description == "Description"

        # Test all schemas work
        base = CompanyBase(name="Base Company")
        assert base.name == "Base Company"

        create = CompanyCreate(name="Create Company", description="Create desc")
        assert create.name == "Create Company"
        assert create.description == "Create desc"

        update = CompanyUpdate(name="Update Company")
        assert update.name == "Update Company"
        assert update.description is None

        response = CompanyResponse(
            id=uuid4(),
            name="Response Company",
            description="Response desc",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert response.name == "Response Company"
        assert response.description == "Response desc"

    def test_all_validation_rules_enforced(self):
        """Test that all validation rules are properly enforced"""

        # Name validation rules
        test_cases = [
            ("", "empty string"),
            ("   ", "whitespace only"),
            ("---", "no alphanumeric"),
            ("x" * 201, "too long"),
        ]

        for invalid_name, reason in test_cases:
            with pytest.raises(ValidationError):
                CompanyBase(name=invalid_name)

        # Description validation rules
        with pytest.raises(ValidationError):
            CompanyBase(name="Valid Name", description="x" * 1001)

        # Valid cases should pass
        valid_companies = [
            CompanyBase(name="A"),
            CompanyBase(name="Company Name"),
            CompanyBase(name="x" * 200),
            CompanyBase(name="Company", description="x" * 1000),
        ]

        for company in valid_companies:
            assert company.name is not None

"""Unit tests for Department Pydantic schemas"""

import pytest
from datetime import UTC, datetime
from uuid import uuid4
from pydantic import ValidationError

from app.schemas.department import (
    DepartmentBase,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
)
from app.schemas.company import CompanyResponse


class TestDepartmentBase:
    """Test DepartmentBase schema"""

    def test_valid_department_base(self):
        """Test creating a valid DepartmentBase"""
        company_id = uuid4()
        manager_id = uuid4()

        dept = DepartmentBase(
            name="Engineering",
            description="Engineering department",
            manager_user_id=manager_id,
            company_id=company_id,
        )

        assert dept.name == "Engineering"
        assert dept.description == "Engineering department"
        assert dept.manager_user_id == manager_id
        assert dept.company_id == company_id

    def test_department_base_minimal(self):
        """Test creating DepartmentBase with minimal required fields"""
        company_id = uuid4()

        dept = DepartmentBase(
            name="Sales",
            company_id=company_id,
        )

        assert dept.name == "Sales"
        assert dept.description is None
        assert dept.manager_user_id is None
        assert dept.company_id == company_id

    def test_department_base_empty_name(self):
        """Test that empty name is rejected"""
        company_id = uuid4()

        with pytest.raises(ValidationError) as exc_info:
            DepartmentBase(
                name="",
                company_id=company_id,
            )

        errors = exc_info.value.errors()
        assert any("name" in str(error["loc"]) for error in errors)

    def test_department_base_whitespace_name(self):
        """Test that whitespace-only name is rejected"""
        company_id = uuid4()

        with pytest.raises(ValidationError) as exc_info:
            DepartmentBase(
                name="   ",
                company_id=company_id,
            )

        errors = exc_info.value.errors()
        assert any("name" in str(error["loc"]) for error in errors)

    def test_department_base_name_too_long(self):
        """Test that name exceeding max length is rejected"""
        company_id = uuid4()

        with pytest.raises(ValidationError) as exc_info:
            DepartmentBase(
                name="A" * 201,
                company_id=company_id,
            )

        errors = exc_info.value.errors()
        assert any("name" in str(error["loc"]) for error in errors)

    def test_department_base_description_too_long(self):
        """Test that description exceeding max length is rejected"""
        company_id = uuid4()

        with pytest.raises(ValidationError) as exc_info:
            DepartmentBase(
                name="Engineering",
                description="A" * 1001,
                company_id=company_id,
            )

        errors = exc_info.value.errors()
        assert any("description" in str(error["loc"]) for error in errors)

    def test_department_base_missing_company_id(self):
        """Test that missing company_id is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            DepartmentBase(name="Engineering")

        errors = exc_info.value.errors()
        assert any("company_id" in str(error["loc"]) for error in errors)


class TestDepartmentCreate:
    """Test DepartmentCreate schema"""

    def test_valid_department_create(self):
        """Test creating a valid DepartmentCreate"""
        company_id = uuid4()
        manager_id = uuid4()

        dept = DepartmentCreate(
            name="Engineering",
            description="Engineering department",
            manager_user_id=manager_id,
            company_id=company_id,
        )

        assert dept.name == "Engineering"
        assert dept.description == "Engineering department"
        assert dept.manager_user_id == manager_id
        assert dept.company_id == company_id

    def test_department_create_requires_company_id(self):
        """Test that DepartmentCreate requires company_id"""
        with pytest.raises(ValidationError) as exc_info:
            DepartmentCreate(name="Engineering")

        errors = exc_info.value.errors()
        assert any("company_id" in str(error["loc"]) for error in errors)


class TestDepartmentUpdate:
    """Test DepartmentUpdate schema"""

    def test_valid_department_update(self):
        """Test creating a valid DepartmentUpdate"""
        company_id = uuid4()
        manager_id = uuid4()

        dept = DepartmentUpdate(
            name="Engineering Updated",
            description="Updated description",
            manager_user_id=manager_id,
            company_id=company_id,
        )

        assert dept.name == "Engineering Updated"
        assert dept.description == "Updated description"
        assert dept.manager_user_id == manager_id
        assert dept.company_id == company_id

    def test_department_update_all_optional(self):
        """Test that all fields in DepartmentUpdate are optional"""
        dept = DepartmentUpdate()

        assert dept.name is None
        assert dept.description is None
        assert dept.manager_user_id is None
        assert dept.company_id is None

    def test_department_update_partial(self):
        """Test updating only some fields"""
        dept = DepartmentUpdate(name="New Name")

        assert dept.name == "New Name"
        assert dept.description is None
        assert dept.manager_user_id is None
        assert dept.company_id is None

    def test_department_update_empty_name(self):
        """Test that empty name is rejected in update"""
        with pytest.raises(ValidationError) as exc_info:
            DepartmentUpdate(name="")

        errors = exc_info.value.errors()
        assert any("name" in str(error["loc"]) for error in errors)

    def test_department_update_whitespace_name(self):
        """Test that whitespace-only name is rejected in update"""
        with pytest.raises(ValidationError) as exc_info:
            DepartmentUpdate(name="   ")

        errors = exc_info.value.errors()
        assert any("name" in str(error["loc"]) for error in errors)


class TestDepartmentResponse:
    """Test DepartmentResponse schema"""

    def test_valid_department_response(self):
        """Test creating a valid DepartmentResponse"""
        dept_id = uuid4()
        company_id = uuid4()
        manager_id = uuid4()
        now = datetime.now(UTC)

        dept = DepartmentResponse(
            id=dept_id,
            name="Engineering",
            description="Engineering department",
            manager_user_id=manager_id,
            company_id=company_id,
            created_at=now,
        )

        assert dept.id == dept_id
        assert dept.name == "Engineering"
        assert dept.description == "Engineering department"
        assert dept.manager_user_id == manager_id
        assert dept.company_id == company_id
        assert dept.created_at == now
        assert dept.company is None

    def test_department_response_with_company(self):
        """Test DepartmentResponse with nested company"""
        dept_id = uuid4()
        company_id = uuid4()
        now = datetime.now(UTC)

        company = CompanyResponse(
            id=company_id,
            name="Acme Corp",
            description="A great company",
            created_at=now,
            updated_at=now,
        )

        dept = DepartmentResponse(
            id=dept_id,
            name="Engineering",
            description="Engineering department",
            manager_user_id=None,
            company_id=company_id,
            created_at=now,
            company=company,
        )

        assert dept.id == dept_id
        assert dept.company is not None
        assert dept.company.id == company_id
        assert dept.company.name == "Acme Corp"

    def test_department_response_minimal(self):
        """Test DepartmentResponse with minimal fields"""
        dept_id = uuid4()
        company_id = uuid4()
        now = datetime.now(UTC)

        dept = DepartmentResponse(
            id=dept_id,
            name="Sales",
            company_id=company_id,
            created_at=now,
        )

        assert dept.id == dept_id
        assert dept.name == "Sales"
        assert dept.description is None
        assert dept.manager_user_id is None
        assert dept.company_id == company_id
        assert dept.created_at == now
        assert dept.company is None

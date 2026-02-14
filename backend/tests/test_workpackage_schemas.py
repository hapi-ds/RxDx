"""Unit tests for Workpackage Pydantic schemas"""

import pytest
from datetime import UTC, datetime
from uuid import uuid4
from pydantic import ValidationError

from app.schemas.workpackage import (
    WorkpackageBase,
    WorkpackageCreate,
    WorkpackageUpdate,
    WorkpackageResponse,
    WorkpackageDepartmentLink,
    WorkpackageDepartmentLinkResponse,
)


class TestWorkpackageBase:
    """Test WorkpackageBase schema"""

    def test_valid_workpackage_base(self):
        """Test creating a valid WorkpackageBase"""
        phase_id = uuid4()
        now = datetime.now(UTC)
        later = datetime(2026, 3, 1, tzinfo=UTC)

        workpackage = WorkpackageBase(
            name="Backend API Development",
            description="Develop REST API endpoints",
            order=1,
            minimal_duration=10,
            start_date=now,
            due_date=later,
            phase_id=phase_id,
        )

        assert workpackage.name == "Backend API Development"
        assert workpackage.description == "Develop REST API endpoints"
        assert workpackage.order == 1
        assert workpackage.minimal_duration == 10
        assert workpackage.phase_id == phase_id

    def test_workpackage_base_minimal(self):
        """Test WorkpackageBase with minimal required fields"""
        phase_id = uuid4()

        workpackage = WorkpackageBase(
            name="Minimal Workpackage",
            order=1,
            phase_id=phase_id,
        )

        assert workpackage.name == "Minimal Workpackage"
        assert workpackage.description is None
        assert workpackage.minimal_duration is None
        assert workpackage.start_date is None
        assert workpackage.due_date is None

    def test_workpackage_base_empty_name(self):
        """Test that empty name is rejected"""
        phase_id = uuid4()

        with pytest.raises(ValidationError) as exc_info:
            WorkpackageBase(
                name="",
                order=1,
                phase_id=phase_id,
            )

        errors = exc_info.value.errors()
        assert any("name" in str(error["loc"]) for error in errors)

    def test_workpackage_base_whitespace_name(self):
        """Test that whitespace-only name is rejected"""
        phase_id = uuid4()

        with pytest.raises(ValidationError) as exc_info:
            WorkpackageBase(
                name="   ",
                order=1,
                phase_id=phase_id,
            )

        errors = exc_info.value.errors()
        assert any("name" in str(error["loc"]) for error in errors)

    def test_workpackage_base_name_too_long(self):
        """Test that name exceeding max length is rejected"""
        phase_id = uuid4()

        with pytest.raises(ValidationError) as exc_info:
            WorkpackageBase(
                name="A" * 201,
                order=1,
                phase_id=phase_id,
            )

        errors = exc_info.value.errors()
        assert any("name" in str(error["loc"]) for error in errors)

    def test_workpackage_base_description_too_long(self):
        """Test that description exceeding max length is rejected"""
        phase_id = uuid4()

        with pytest.raises(ValidationError) as exc_info:
            WorkpackageBase(
                name="Test Workpackage",
                description="A" * 2001,
                order=1,
                phase_id=phase_id,
            )

        errors = exc_info.value.errors()
        assert any("description" in str(error["loc"]) for error in errors)

    def test_workpackage_base_order_validation(self):
        """Test that order must be >= 1"""
        phase_id = uuid4()

        with pytest.raises(ValidationError) as exc_info:
            WorkpackageBase(
                name="Test Workpackage",
                order=0,
                phase_id=phase_id,
            )

        errors = exc_info.value.errors()
        assert any("order" in str(error["loc"]) for error in errors)

    def test_workpackage_base_end_date_validation(self):
        """Test that due_date must be after start_date"""
        phase_id = uuid4()
        now = datetime.now(UTC)
        earlier = datetime(2024, 1, 1, tzinfo=UTC)

        with pytest.raises(ValidationError) as exc_info:
            WorkpackageBase(
                name="Test Workpackage",
                order=1,
                phase_id=phase_id,
                start_date=now,
                due_date=earlier,  # Earlier than start_date
            )

        errors = exc_info.value.errors()
        assert any("due_date" in str(error["loc"]) for error in errors)

    def test_workpackage_base_minimal_duration_validation(self):
        """Test that minimal_duration must be >= 1"""
        phase_id = uuid4()

        with pytest.raises(ValidationError) as exc_info:
            WorkpackageBase(
                name="Test Workpackage",
                order=1,
                phase_id=phase_id,
                minimal_duration=0,  # Invalid: must be >= 1
            )

        errors = exc_info.value.errors()
        assert any("minimal_duration" in str(error["loc"]) for error in errors)


class TestWorkpackageCreate:
    """Test WorkpackageCreate schema"""

    def test_valid_workpackage_create(self):
        """Test creating a valid WorkpackageCreate"""
        phase_id = uuid4()
        now = datetime.now(UTC)
        later = datetime(2026, 3, 1, tzinfo=UTC)

        workpackage = WorkpackageCreate(
            name="Backend API Development",
            description="Develop REST API endpoints",
            order=1,
            minimal_duration=10,
            start_date=now,
            due_date=later,
            phase_id=phase_id,
        )

        assert workpackage.name == "Backend API Development"
        assert workpackage.minimal_duration == 10
        assert workpackage.phase_id == phase_id


class TestWorkpackageUpdate:
    """Test WorkpackageUpdate schema"""

    def test_valid_workpackage_update(self):
        """Test creating a valid WorkpackageUpdate"""
        phase_id = uuid4()
        now = datetime.now(UTC)

        workpackage = WorkpackageUpdate(
            name="Updated Workpackage",
            description="Updated description",
            order=2,
            minimal_duration=15,
            start_date=now,
            due_date=now,
            start_date_is=now,
            progress=50,
            phase_id=phase_id,
        )

        assert workpackage.name == "Updated Workpackage"
        assert workpackage.order == 2
        assert workpackage.minimal_duration == 15
        assert workpackage.progress == 50

    def test_workpackage_update_all_optional(self):
        """Test that all fields in WorkpackageUpdate are optional"""
        workpackage = WorkpackageUpdate()

        assert workpackage.name is None
        assert workpackage.description is None
        assert workpackage.order is None
        assert workpackage.minimal_duration is None
        assert workpackage.start_date is None
        assert workpackage.due_date is None
        assert workpackage.start_date_is is None
        assert workpackage.progress is None
        assert workpackage.phase_id is None

    def test_workpackage_update_partial(self):
        """Test updating only some fields"""
        workpackage = WorkpackageUpdate(name="New Name", progress=75)

        assert workpackage.name == "New Name"
        assert workpackage.progress == 75
        assert workpackage.description is None

    def test_workpackage_update_progress_validation(self):
        """Test that progress must be between 0 and 100"""
        with pytest.raises(ValidationError) as exc_info:
            WorkpackageUpdate(progress=101)

        errors = exc_info.value.errors()
        assert any("progress" in str(error["loc"]) for error in errors)

        with pytest.raises(ValidationError) as exc_info:
            WorkpackageUpdate(progress=-1)

        errors = exc_info.value.errors()
        assert any("progress" in str(error["loc"]) for error in errors)


class TestWorkpackageResponse:
    """Test WorkpackageResponse schema"""

    def test_valid_workpackage_response(self):
        """Test creating a valid WorkpackageResponse"""
        workpackage_id = uuid4()
        phase_id = uuid4()
        now = datetime.now(UTC)
        later = datetime(2026, 3, 1, tzinfo=UTC)

        workpackage = WorkpackageResponse(
            id=workpackage_id,
            name="Backend API Development",
            description="Develop REST API endpoints",
            order=1,
            minimal_duration=10,
            start_date=now,
            due_date=later,
            calculated_start_date=now,
            calculated_end_date=later,
            start_date_is=now,
            progress=60,
            phase_id=phase_id,
            created_at=now,
            task_count=5,
            completion_percentage=60.0,
        )

        assert workpackage.id == workpackage_id
        assert workpackage.name == "Backend API Development"
        assert workpackage.minimal_duration == 10
        assert workpackage.calculated_start_date == now
        assert workpackage.calculated_end_date == later
        assert workpackage.start_date_is == now
        assert workpackage.progress == 60
        assert workpackage.task_count == 5
        assert workpackage.completion_percentage == 60.0

    def test_workpackage_response_minimal(self):
        """Test WorkpackageResponse with minimal fields"""
        workpackage_id = uuid4()
        phase_id = uuid4()
        now = datetime.now(UTC)

        workpackage = WorkpackageResponse(
            id=workpackage_id,
            name="Minimal Workpackage",
            order=1,
            phase_id=phase_id,
            created_at=now,
        )

        assert workpackage.id == workpackage_id
        assert workpackage.minimal_duration is None
        assert workpackage.calculated_start_date is None
        assert workpackage.calculated_end_date is None
        assert workpackage.start_date_is is None
        assert workpackage.progress is None
        assert workpackage.task_count is None
        assert workpackage.completion_percentage is None


class TestWorkpackageDepartmentLink:
    """Test WorkpackageDepartmentLink schema"""

    def test_valid_workpackage_department_link(self):
        """Test creating a valid WorkpackageDepartmentLink"""
        department_id = uuid4()

        link = WorkpackageDepartmentLink(department_id=department_id)

        assert link.department_id == department_id

    def test_workpackage_department_link_missing_department_id(self):
        """Test that department_id is required"""
        with pytest.raises(ValidationError) as exc_info:
            WorkpackageDepartmentLink()

        errors = exc_info.value.errors()
        assert any("department_id" in str(error["loc"]) for error in errors)


class TestWorkpackageDepartmentLinkResponse:
    """Test WorkpackageDepartmentLinkResponse schema"""

    def test_valid_workpackage_department_link_response(self):
        """Test creating a valid WorkpackageDepartmentLinkResponse"""
        workpackage_id = uuid4()
        department_id = uuid4()
        now = datetime.now(UTC)

        link_response = WorkpackageDepartmentLinkResponse(
            workpackage_id=workpackage_id,
            department_id=department_id,
            linked_at=now,
        )

        assert link_response.workpackage_id == workpackage_id
        assert link_response.department_id == department_id
        assert link_response.linked_at == now

    def test_workpackage_department_link_response_missing_fields(self):
        """Test that all fields are required"""
        with pytest.raises(ValidationError) as exc_info:
            WorkpackageDepartmentLinkResponse()

        errors = exc_info.value.errors()
        assert len(errors) == 3  # All three fields are required

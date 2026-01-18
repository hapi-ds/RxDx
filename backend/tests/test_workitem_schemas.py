"""Unit tests for WorkItem Pydantic schemas"""

import pytest
from datetime import datetime
from uuid import uuid4
from pydantic import ValidationError

from app.schemas.workitem import (
    WorkItemBase,
    WorkItemCreate,
    WorkItemUpdate,
    WorkItemResponse,
    RequirementCreate,
    RequirementUpdate,
    RequirementResponse,
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TestCreate,
    TestUpdate,
    TestResponse,
    RiskCreate,
    RiskUpdate,
    RiskResponse,
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
)


class TestWorkItemBase:
    """Test WorkItemBase schema validation"""

    def test_valid_workitem_base(self):
        """Test valid WorkItemBase creation"""
        data = {
            "title": "Test WorkItem",
            "description": "A test work item",
            "status": "draft",
            "priority": 3,
            "assigned_to": str(uuid4())
        }
        workitem = WorkItemBase(**data)
        assert workitem.title == "Test WorkItem"
        assert workitem.status == "draft"
        assert workitem.priority == 3

    def test_minimal_workitem_base(self):
        """Test WorkItemBase with minimal required fields"""
        data = {
            "title": "Minimal WorkItem",
            "status": "active"
        }
        workitem = WorkItemBase(**data)
        assert workitem.title == "Minimal WorkItem"
        assert workitem.status == "active"
        assert workitem.description is None
        assert workitem.priority is None
        assert workitem.assigned_to is None

    def test_title_validation(self):
        """Test title field validation"""
        # Empty title should fail
        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title="", status="draft")
        assert "String should have at least 1 character" in str(exc_info.value)

        # Whitespace-only title should fail
        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title="   ", status="draft")
        assert "Title cannot be empty or only whitespace" in str(exc_info.value)

        # Title too long should fail
        long_title = "x" * 501
        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title=long_title, status="draft")
        assert "String should have at most 500 characters" in str(exc_info.value)

    def test_status_validation(self):
        """Test status field validation"""
        valid_statuses = ["draft", "active", "completed", "archived"]
        
        for status in valid_statuses:
            workitem = WorkItemBase(title="Test", status=status)
            assert workitem.status == status

        # Invalid status should fail
        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title="Test", status="invalid")
        assert "Status must be one of" in str(exc_info.value)

    def test_priority_validation(self):
        """Test priority field validation"""
        # Valid priorities
        for priority in [1, 2, 3, 4, 5]:
            workitem = WorkItemBase(title="Test", status="draft", priority=priority)
            assert workitem.priority == priority

        # Invalid priorities should fail
        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title="Test", status="draft", priority=0)
        assert "Input should be greater than or equal to 1" in str(exc_info.value)

        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title="Test", status="draft", priority=6)
        assert "Input should be less than or equal to 5" in str(exc_info.value)

    def test_title_whitespace_trimming(self):
        """Test that title whitespace is trimmed"""
        workitem = WorkItemBase(title="  Test Title  ", status="draft")
        assert workitem.title == "Test Title"


class TestWorkItemCreate:
    """Test WorkItemCreate schema validation"""

    def test_valid_workitem_create(self):
        """Test valid WorkItemCreate"""
        data = {
            "title": "New WorkItem",
            "description": "Description",
            "status": "draft",
            "type": "requirement",
            "priority": 2
        }
        workitem = WorkItemCreate(**data)
        assert workitem.type == "requirement"
        assert workitem.title == "New WorkItem"

    def test_type_validation(self):
        """Test type field validation"""
        valid_types = ["requirement", "task", "test", "risk", "document"]
        
        for workitem_type in valid_types:
            workitem = WorkItemCreate(
                title="Test",
                status="draft",
                type=workitem_type
            )
            assert workitem.type == workitem_type

        # Invalid type should fail
        with pytest.raises(ValidationError) as exc_info:
            WorkItemCreate(title="Test", status="draft", type="invalid")
        assert "Type must be one of" in str(exc_info.value)

    def test_type_case_normalization(self):
        """Test that type is normalized to lowercase"""
        workitem = WorkItemCreate(title="Test", status="draft", type="REQUIREMENT")
        assert workitem.type == "requirement"


class TestWorkItemUpdate:
    """Test WorkItemUpdate schema validation"""

    def test_valid_workitem_update(self):
        """Test valid WorkItemUpdate with all fields"""
        data = {
            "title": "Updated Title",
            "description": "Updated description",
            "status": "active",
            "priority": 4
        }
        update = WorkItemUpdate(**data)
        assert update.title == "Updated Title"
        assert update.status == "active"

    def test_partial_workitem_update(self):
        """Test WorkItemUpdate with only some fields"""
        update = WorkItemUpdate(title="New Title")
        assert update.title == "New Title"
        assert update.description is None
        assert update.status is None

    def test_empty_workitem_update(self):
        """Test WorkItemUpdate with no fields"""
        update = WorkItemUpdate()
        assert update.title is None
        assert update.description is None
        assert update.status is None


class TestRequirementSchemas:
    """Test Requirement-specific schemas"""

    def test_requirement_create(self):
        """Test RequirementCreate schema"""
        data = {
            "title": "User Authentication Requirement",
            "description": "System shall authenticate users",
            "status": "draft",
            "acceptance_criteria": "User can login with valid credentials",
            "business_value": "Security compliance",
            "source": "Security team"
        }
        req = RequirementCreate(**data)
        assert req.type == "requirement"
        assert req.acceptance_criteria == "User can login with valid credentials"

    def test_requirement_update(self):
        """Test RequirementUpdate schema"""
        data = {
            "acceptance_criteria": "Updated criteria",
            "business_value": "Updated value"
        }
        update = RequirementUpdate(**data)
        assert update.acceptance_criteria == "Updated criteria"
        assert update.title is None


class TestTaskSchemas:
    """Test Task-specific schemas"""

    def test_task_create(self):
        """Test TaskCreate schema"""
        data = {
            "title": "Implement login feature",
            "description": "Create login functionality",
            "status": "draft",
            "estimated_hours": 8.5,
            "due_date": datetime.now()
        }
        task = TaskCreate(**data)
        assert task.type == "task"
        assert task.estimated_hours == 8.5

    def test_task_hours_validation(self):
        """Test task hours validation"""
        # Negative hours should fail
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(
                title="Test",
                status="draft",
                estimated_hours=-1
            )
        assert "Input should be greater than or equal to 0" in str(exc_info.value)


class TestTestSchemas:
    """Test Test-specific schemas"""

    def test_test_create(self):
        """Test TestCreate schema"""
        data = {
            "title": "Login Test",
            "description": "Test user login",
            "status": "draft",
            "test_type": "integration",
            "test_steps": "1. Enter credentials 2. Click login",
            "expected_result": "User is logged in",
            "test_status": "not_run"
        }
        test = TestCreate(**data)
        assert test.type == "test"
        assert test.test_status == "not_run"

    def test_test_status_validation(self):
        """Test test_status validation"""
        valid_statuses = ["not_run", "passed", "failed", "blocked"]
        
        for status in valid_statuses:
            test = TestCreate(
                title="Test",
                status="draft",
                test_status=status
            )
            assert test.test_status == status

        # Invalid test status should fail
        with pytest.raises(ValidationError) as exc_info:
            TestCreate(title="Test", status="draft", test_status="invalid")
        assert "Test status must be one of" in str(exc_info.value)


class TestRiskSchemas:
    """Test Risk-specific schemas"""

    def test_risk_create(self):
        """Test RiskCreate schema"""
        data = {
            "title": "Data Loss Risk",
            "description": "Risk of losing user data",
            "status": "draft",
            "severity": 8,
            "occurrence": 3,
            "detection": 5,
            "mitigation_actions": "Implement backups"
        }
        risk = RiskCreate(**data)
        assert risk.type == "risk"
        assert risk.severity == 8
        assert risk.occurrence == 3
        assert risk.detection == 5

    def test_risk_rating_validation(self):
        """Test risk rating validation (1-10)"""
        # Valid ratings
        risk = RiskCreate(
            title="Test Risk",
            status="draft",
            severity=5,
            occurrence=5,
            detection=5
        )
        assert risk.severity == 5

        # Invalid ratings should fail
        with pytest.raises(ValidationError) as exc_info:
            RiskCreate(
                title="Test Risk",
                status="draft",
                severity=0,
                occurrence=5,
                detection=5
            )
        assert "Input should be greater than or equal to 1" in str(exc_info.value)

        with pytest.raises(ValidationError) as exc_info:
            RiskCreate(
                title="Test Risk",
                status="draft",
                severity=11,
                occurrence=5,
                detection=5
            )
        assert "Input should be less than or equal to 10" in str(exc_info.value)


class TestDocumentSchemas:
    """Test Document-specific schemas"""

    def test_document_create(self):
        """Test DocumentCreate schema"""
        data = {
            "title": "System Specification",
            "description": "Technical specification document",
            "status": "draft",
            "document_type": "specification",
            "file_path": "/docs/spec.pdf",
            "file_size": 1024000,
            "mime_type": "application/pdf",
            "checksum": "abc123def456"
        }
        doc = DocumentCreate(**data)
        assert doc.type == "document"
        assert doc.file_size == 1024000
        assert doc.mime_type == "application/pdf"

    def test_document_file_size_validation(self):
        """Test file size validation"""
        # Negative file size should fail
        with pytest.raises(ValidationError) as exc_info:
            DocumentCreate(
                title="Test Doc",
                status="draft",
                file_size=-1
            )
        assert "Input should be greater than or equal to 0" in str(exc_info.value)


class TestWorkItemResponse:
    """Test WorkItemResponse schema"""

    def test_workitem_response(self):
        """Test WorkItemResponse schema"""
        data = {
            "id": uuid4(),
            "title": "Test WorkItem",
            "description": "Test description",
            "status": "active",
            "priority": 3,
            "assigned_to": uuid4(),
            "type": "requirement",
            "version": "1.0",
            "created_by": uuid4(),
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "is_signed": False
        }
        response = WorkItemResponse(**data)
        assert response.version == "1.0"
        assert response.is_signed is False
        assert response.type == "requirement"
"""Unit tests for WorkItem Pydantic schemas"""

from datetime import datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.workitem import (
    DocumentCreate,
    DocumentResponse,
    DocumentUpdate,
    RequirementCreate,
    RequirementResponse,
    RequirementUpdate,
    RiskCreate,
    RiskResponse,
    RiskUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
    TestSpecCreate,
    TestSpecResponse,
    TestSpecUpdate,
    WorkItemBase,
    WorkItemCreate,
    WorkItemResponse,
    WorkItemUpdate,
)


class TestWorkItemBaseSchema:
    """Test WorkItemBase schema validation"""

    def test_valid_workitem_base(self):
        """Test valid WorkItemBase creation"""
        data = {
            "title": "Test WorkItem Title",
            "description": "A test work item",
            "status": "draft",
            "priority": 3,
            "assigned_to": str(uuid4())
        }
        workitem = WorkItemBase(**data)
        assert workitem.title == "Test WorkItem Title"
        assert workitem.status == "draft"
        assert workitem.priority == 3

    def test_minimal_workitem_base(self):
        """Test WorkItemBase with minimal required fields"""
        data = {
            "title": "Minimal WorkItem Title",
            "status": "active"
        }
        workitem = WorkItemBase(**data)
        assert workitem.title == "Minimal WorkItem Title"
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

        # Title too short should fail
        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title="Test", status="draft")
        assert "Title must be at least 5 characters long" in str(exc_info.value)

        # Title too long should fail
        long_title = "x" * 501
        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title=long_title, status="draft")
        assert "String should have at most 500 characters" in str(exc_info.value)

    def test_status_validation(self):
        """Test status field validation"""
        valid_statuses = ["draft", "active", "completed", "archived", "rejected"]

        for status in valid_statuses:
            workitem = WorkItemBase(title="Test Title", status=status)
            assert workitem.status == status

        # Invalid status should fail
        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title="Test Title", status="invalid")
        assert "Status must be one of" in str(exc_info.value)

    def test_priority_validation(self):
        """Test priority field validation"""
        # Valid priorities
        for priority in [1, 2, 3, 4, 5]:
            workitem = WorkItemBase(title="Test Title", status="draft", priority=priority)
            assert workitem.priority == priority

        # Invalid priorities should fail
        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title="Test Title", status="draft", priority=0)
        assert "Input should be greater than or equal to 1" in str(exc_info.value)

        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title="Test Title", status="draft", priority=6)
        assert "Input should be less than or equal to 5" in str(exc_info.value)

    def test_title_whitespace_trimming(self):
        """Test that title whitespace is trimmed"""
        workitem = WorkItemBase(title="  Test Title  ", status="draft")
        assert workitem.title == "Test Title"


class TestWorkItemCreateSchema:
    """Test WorkItemCreate schema validation"""

    def test_valid_workitem_create(self):
        """Test valid WorkItemCreate"""
        data = {
            "title": "New WorkItem Title",
            "description": "Description",
            "status": "draft",
            "type": "requirement",
            "priority": 2
        }
        workitem = WorkItemCreate(**data)
        assert workitem.type == "requirement"
        assert workitem.title == "New WorkItem Title"

    def test_type_validation(self):
        """Test type field validation"""
        valid_types = ["requirement", "task", "test", "risk", "document"]

        for workitem_type in valid_types:
            workitem = WorkItemCreate(
                title="Test Title",
                status="draft",
                type=workitem_type
            )
            assert workitem.type == workitem_type

        # Invalid type should fail
        with pytest.raises(ValidationError) as exc_info:
            WorkItemCreate(title="Test Title", status="draft", type="invalid")
        assert "Type must be one of" in str(exc_info.value)

    def test_type_case_normalization(self):
        """Test that type is normalized to lowercase"""
        workitem = WorkItemCreate(title="Test Title", status="draft", type="REQUIREMENT")
        assert workitem.type == "requirement"


class TestWorkItemUpdateSchema:
    """Test WorkItemUpdate schema validation"""

    def test_valid_workitem_update(self):
        """Test valid WorkItemUpdate with all fields"""
        data = {
            "title": "Updated Title Here",
            "description": "Updated description",
            "status": "active",
            "priority": 4
        }
        update = WorkItemUpdate(**data)
        assert update.title == "Updated Title Here"
        assert update.status == "active"

    def test_partial_workitem_update(self):
        """Test WorkItemUpdate with only some fields"""
        update = WorkItemUpdate(title="New Title Here")
        assert update.title == "New Title Here"
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
            "description": "System shall authenticate users with proper validation and security measures",
            "status": "draft",
            "acceptance_criteria": "Given a user with valid credentials, when they attempt to login, then the system should authenticate them successfully",
            "business_value": "Security compliance and user access control",
            "source": "security"
        }
        req = RequirementCreate(**data)
        assert req.type == "requirement"
        assert req.acceptance_criteria == "Given a user with valid credentials, when they attempt to login, then the system should authenticate them successfully"

    def test_requirement_update(self):
        """Test RequirementUpdate schema"""
        data = {
            "acceptance_criteria": "Given updated criteria, when conditions are met, then the system should respond appropriately",
            "business_value": "Updated business value description"
        }
        update = RequirementUpdate(**data)
        assert update.acceptance_criteria == "Given updated criteria, when conditions are met, then the system should respond appropriately"
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
                title="Test Task Title",
                status="draft",
                estimated_hours=-1
            )
        assert "Input should be greater than or equal to 0" in str(exc_info.value)


class TestTestSchemas:
    """Test Test-specific schemas"""

    def test_test_create(self):
        """Test TestCreate schema"""
        data = {
            "title": "Login Test Case",
            "description": "Test user login",
            "status": "draft",
            "test_type": "integration",
            "test_steps": "1. Enter credentials 2. Click login",
            "expected_result": "User is logged in",
            "test_status": "not_run"
        }
        test = TestSpecCreate(**data)
        assert test.type == "test"
        assert test.test_status == "not_run"

    def test_test_status_validation(self):
        """Test test_status validation"""
        valid_statuses = ["not_run", "passed", "failed", "blocked"]

        for status in valid_statuses:
            test = TestSpecCreate(
                title="Test Title Here",
                status="draft",
                test_status=status
            )
            assert test.test_status == status

        # Invalid test status should fail
        with pytest.raises(ValidationError) as exc_info:
            TestSpecCreate(title="Test Title Here", status="draft", test_status="invalid")
        assert "Test status must be one of" in str(exc_info.value)


class TestRiskSchemas:
    """Test Risk-specific schemas"""

    def test_risk_create(self):
        """Test RiskCreate schema"""
        data = {
            "title": "Data Loss Risk Assessment",
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
            title="Test Risk Assessment",
            status="draft",
            severity=5,
            occurrence=5,
            detection=5
        )
        assert risk.severity == 5

        # Invalid ratings should fail
        with pytest.raises(ValidationError) as exc_info:
            RiskCreate(
                title="Test Risk Assessment",
                status="draft",
                severity=0,
                occurrence=5,
                detection=5
            )
        assert "Input should be greater than or equal to 1" in str(exc_info.value)

        with pytest.raises(ValidationError) as exc_info:
            RiskCreate(
                title="Test Risk Assessment",
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
            "title": "System Specification Document",
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
                title="Test Document Title",
                status="draft",
                file_size=-1
            )
        assert "Input should be greater than or equal to 0" in str(exc_info.value)


class TestWorkItemResponseSchema:
    """Test WorkItemResponse schema"""

    def test_workitem_response(self):
        """Test WorkItemResponse schema"""
        data = {
            "id": uuid4(),
            "title": "Test WorkItem Response",
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


class TestComprehensiveWorkItemValidation:
    """Comprehensive integration tests for all WorkItem schemas"""

    def test_comprehensive_validation_and_functionality(self):
        """Test all WorkItem schemas work together correctly with proper validation"""

        # Test validation works correctly for status
        with pytest.raises(ValidationError) as exc_info:
            WorkItemBase(title='Test Title Here', status='invalid_status')
        assert "Status must be one of" in str(exc_info.value)

        # Test validation works correctly for type
        with pytest.raises(ValidationError) as exc_info:
            WorkItemCreate(title='Test Title Here', status='draft', type='invalid_type')
        assert "Type must be one of" in str(exc_info.value)

        # Test case normalization works
        wc = WorkItemCreate(title='Test Title Here', status='DRAFT', type='REQUIREMENT')
        assert wc.status == 'draft'
        assert wc.type == 'requirement'

        # Test all specialized create schemas work
        req = RequirementCreate(
            title='Test Requirement Title',
            status='draft',
            acceptance_criteria='Given proper conditions, when action is taken, then system must work correctly'
        )
        assert req.type == 'requirement'
        assert req.acceptance_criteria == 'Given proper conditions, when action is taken, then system must work correctly'

        task = TaskCreate(
            title='Test Task Title',
            status='draft',
            estimated_hours=8.0,
            due_date=datetime.now()
        )
        assert task.type == 'task'
        assert task.estimated_hours == 8.0

        test = TestSpecCreate(
            title='Test Test Case Title',
            status='draft',
            test_status='not_run',
            test_type='integration'
        )
        assert test.type == 'test'
        assert test.test_status == 'not_run'

        risk = RiskCreate(
            title='Test Risk Assessment Title',
            status='draft',
            severity=5,
            occurrence=3,
            detection=7,
            mitigation_actions='Implement safeguards'
        )
        assert risk.type == 'risk'
        assert risk.severity == 5
        assert risk.occurrence == 3
        assert risk.detection == 7

        doc = DocumentCreate(
            title='Test Document Title',
            status='draft',
            file_size=1024,
            mime_type='application/pdf'
        )
        assert doc.type == 'document'
        assert doc.file_size == 1024

    def test_comprehensive_update_schemas(self):
        """Test all update schemas work correctly"""

        # Test base update schema
        update = WorkItemUpdate(title='Updated Title Here', status='completed')
        assert update.title == 'Updated Title Here'
        assert update.status == 'completed'
        assert update.description is None  # Optional field

        # Test specialized update schemas
        req_update = RequirementUpdate(
            acceptance_criteria='Given updated conditions, when action occurs, then system should respond appropriately',
            business_value='Updated business value description'
        )
        assert req_update.acceptance_criteria == 'Given updated conditions, when action occurs, then system should respond appropriately'
        assert req_update.title is None  # Optional field

        task_update = TaskUpdate(estimated_hours=12.5, actual_hours=10.0)
        assert task_update.estimated_hours == 12.5
        assert task_update.actual_hours == 10.0

        test_update = TestSpecUpdate(test_status='passed', actual_result='Test passed')
        assert test_update.test_status == 'passed'
        assert test_update.actual_result == 'Test passed'

        risk_update = RiskUpdate(severity=8, mitigation_actions='Enhanced safeguards')
        assert risk_update.severity == 8
        assert risk_update.mitigation_actions == 'Enhanced safeguards'

        doc_update = DocumentUpdate(file_size=2048, checksum='abc123')
        assert doc_update.file_size == 2048
        assert doc_update.checksum == 'abc123'

    def test_comprehensive_response_schemas(self):
        """Test all response schemas work correctly"""

        base_data = {
            "id": uuid4(),
            "version": "1.0",
            "created_by": uuid4(),
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "is_signed": False
        }

        # Test WorkItemResponse
        workitem_response = WorkItemResponse(
            title="Test WorkItem Response",
            status="active",
            type="requirement",
            **base_data
        )
        assert workitem_response.version == "1.0"
        assert workitem_response.is_signed is False

        # Test specialized response schemas
        req_response = RequirementResponse(
            title="Test Requirement Response",
            status="active",
            type="requirement",
            acceptance_criteria="Given conditions, when action occurs, then system must work",
            **base_data
        )
        assert req_response.type == "requirement"
        assert req_response.acceptance_criteria == "Given conditions, when action occurs, then system must work"

        task_response = TaskResponse(
            title="Test Task Response",
            status="active",
            type="task",
            estimated_hours=8.0,
            **base_data
        )
        assert task_response.type == "task"
        assert task_response.estimated_hours == 8.0

        test_response = TestSpecResponse(
            title="Test Test Case Response",
            status="active",
            type="test",
            test_status="passed",
            **base_data
        )
        assert test_response.type == "test"
        assert test_response.test_status == "passed"

        risk_response = RiskResponse(
            title="Test Risk Response",
            status="active",
            type="risk",
            severity=5,
            occurrence=3,
            detection=7,
            **base_data
        )
        assert risk_response.type == "risk"
        assert risk_response.severity == 5

        doc_response = DocumentResponse(
            title="Test Document Response",
            status="active",
            type="document",
            file_size=1024,
            **base_data
        )
        assert doc_response.type == "document"
        assert doc_response.file_size == 1024

    def test_field_validation_edge_cases(self):
        """Test edge cases for field validation"""

        # Test priority bounds
        valid_priorities = [1, 2, 3, 4, 5]
        for priority in valid_priorities:
            workitem = WorkItemBase(title="Test Title Here", status="draft", priority=priority)
            assert workitem.priority == priority

        # Test invalid priorities
        with pytest.raises(ValidationError):
            WorkItemBase(title="Test Title Here", status="draft", priority=0)

        with pytest.raises(ValidationError):
            WorkItemBase(title="Test Title Here", status="draft", priority=6)

        # Test risk rating bounds
        for rating in [1, 5, 10]:
            risk = RiskCreate(
                title="Test Risk Assessment",
                status="draft",
                severity=rating,
                occurrence=rating,
                detection=rating
            )
            assert risk.severity == rating

        # Test invalid risk ratings
        with pytest.raises(ValidationError):
            RiskCreate(
                title="Test Risk Assessment",
                status="draft",
                severity=0,  # Invalid
                occurrence=5,
                detection=5
            )

        # Test file size validation
        doc = DocumentCreate(title="Test Document Title", status="draft", file_size=0)
        assert doc.file_size == 0

        with pytest.raises(ValidationError):
            DocumentCreate(title="Test Document Title", status="draft", file_size=-1)

    def test_all_schemas_integration(self):
        """Integration test ensuring all schemas work together seamlessly"""

        # Create instances of all schema types
        schemas_created = []

        # Base schemas
        workitem_base = WorkItemBase(title="Base WorkItem Title", status="draft")
        schemas_created.append(("WorkItemBase", workitem_base))

        workitem_create = WorkItemCreate(title="Create WorkItem Title", status="draft", type="requirement")
        schemas_created.append(("WorkItemCreate", workitem_create))

        # Specialized create schemas
        req_create = RequirementCreate(title="Requirement Title", status="draft")
        schemas_created.append(("RequirementCreate", req_create))

        task_create = TaskCreate(title="Task Title", status="draft")
        schemas_created.append(("TaskCreate", task_create))

        test_create = TestSpecCreate(title="Test Title", status="draft")
        schemas_created.append(("TestSpecCreate", test_create))

        risk_create = RiskCreate(title="Risk Title", status="draft", severity=5, occurrence=3, detection=7)
        schemas_created.append(("RiskCreate", risk_create))

        doc_create = DocumentCreate(title="Document Title", status="draft")
        schemas_created.append(("DocumentCreate", doc_create))

        # Verify all schemas were created successfully
        assert len(schemas_created) == 7

        # Verify each schema has the expected attributes
        for schema_name, schema_instance in schemas_created:
            assert hasattr(schema_instance, 'title')
            assert hasattr(schema_instance, 'status')
            assert schema_instance.title is not None
            assert schema_instance.status == 'draft'

            # Verify type-specific schemas have their type set correctly
            if hasattr(schema_instance, 'type'):
                expected_types = {
                    'RequirementCreate': 'requirement',
                    'TaskCreate': 'task',
                    'TestSpecCreate': 'test',
                    'RiskCreate': 'risk',
                    'DocumentCreate': 'document'
                }
                if schema_name in expected_types:
                    assert schema_instance.type == expected_types[schema_name]

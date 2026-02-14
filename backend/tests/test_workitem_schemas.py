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


class TestTaskSchemaTaskSpecificProperties:
    """Test Task schema with task-specific properties (skills_needed, workpackage_id, story_points, done, dates)"""

    def test_task_with_skills_needed(self):
        """Test TaskCreate with skills_needed"""
        from datetime import UTC
        
        data = {
            "title": "Implement user authentication",
            "description": "Add JWT-based authentication",
            "status": "draft",
            "skills_needed": ["Python", "FastAPI", "JWT", "Security"],
            "workpackage_id": str(uuid4()),
            "story_points": 5,
            "done": False,
        }
        task = TaskCreate(**data)
        
        assert task.skills_needed == ["Python", "FastAPI", "JWT", "Security"]
        assert task.workpackage_id is not None
        assert task.story_points == 5
        assert task.done is False

    def test_task_skills_needed_validation(self):
        """Test skills_needed validation"""
        # Empty skills should be filtered out
        data = {
            "title": "Test Task Title",
            "status": "draft",
            "skills_needed": ["Python", "", "FastAPI", "   "],
        }
        
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(**data)
        assert "Skills cannot be empty strings" in str(exc_info.value)

    def test_task_skills_needed_duplicates_removed(self):
        """Test that duplicate skills are removed"""
        data = {
            "title": "Test Task Title",
            "status": "draft",
            "skills_needed": ["Python", "python", "PYTHON", "FastAPI"],
        }
        task = TaskCreate(**data)
        
        # Should keep only unique skills (case-insensitive)
        assert len(task.skills_needed) == 2
        assert "Python" in task.skills_needed
        assert "FastAPI" in task.skills_needed

    def test_task_skills_needed_too_long(self):
        """Test that skill names exceeding max length are rejected"""
        data = {
            "title": "Test Task Title",
            "status": "draft",
            "skills_needed": ["A" * 101],  # Exceeds 100 char limit
        }
        
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(**data)
        assert "Skill name cannot exceed 100 characters" in str(exc_info.value)

    def test_task_skills_needed_must_be_array(self):
        """Test that skills_needed must be an array"""
        data = {
            "title": "Test Task Title",
            "status": "draft",
            "skills_needed": "Python",  # String instead of array
        }
        
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(**data)
        # Pydantic will catch this as type error

    def test_task_story_points_validation(self):
        """Test story_points validation"""
        # Valid story points
        for points in [0, 1, 5, 13, 21, 50, 100]:
            data = {
                "title": "Test Task Title",
                "status": "draft",
                "story_points": points,
            }
            task = TaskCreate(**data)
            assert task.story_points == points

        # Negative story points should fail
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(
                title="Test Task Title",
                status="draft",
                story_points=-1,
            )
        assert "greater than or equal to 0" in str(exc_info.value)

        # Story points > 100 should fail
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(
                title="Test Task Title",
                status="draft",
                story_points=101,
            )
        assert "less than or equal to 100" in str(exc_info.value)

    def test_task_with_dates(self):
        """Test TaskCreate with start_date and end_date"""
        from datetime import UTC
        
        now = datetime.now(UTC)
        
        data = {
            "title": "Test Task Title",
            "status": "draft",
            "start_date": now,
            "end_date": now,
            "due_date": now,
        }
        task = TaskCreate(**data)
        
        assert task.start_date == now
        assert task.end_date == now
        assert task.due_date == now

    def test_task_dates_must_be_timezone_aware(self):
        """Test that dates must be timezone-aware"""
        from datetime import datetime as dt
        
        naive_datetime = dt(2024, 1, 1, 12, 0, 0)  # No timezone
        
        data = {
            "title": "Test Task Title",
            "status": "draft",
            "start_date": naive_datetime,
        }
        
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(**data)
        assert "Dates must be timezone-aware" in str(exc_info.value)

    def test_task_done_flag(self):
        """Test done boolean flag"""
        # Default should be False
        data = {
            "title": "Test Task Title",
            "status": "draft",
        }
        task = TaskCreate(**data)
        assert task.done is False

        # Can set to True
        data["done"] = True
        task = TaskCreate(**data)
        assert task.done is True

    def test_task_workpackage_id(self):
        """Test workpackage_id field"""
        workpackage_id = uuid4()
        
        data = {
            "title": "Test Task Title",
            "status": "draft",
            "workpackage_id": workpackage_id,
        }
        task = TaskCreate(**data)
        
        assert task.workpackage_id == workpackage_id

    def test_task_update_with_task_properties(self):
        """Test TaskUpdate with task-specific properties"""
        from datetime import UTC
        
        now = datetime.now(UTC)
        workpackage_id = uuid4()
        
        data = {
            "title": "Updated Task Title",
            "skills_needed": ["Python", "FastAPI"],
            "workpackage_id": workpackage_id,
            "story_points": 8,
            "done": True,
            "start_date": now,
            "end_date": now,
        }
        task_update = TaskUpdate(**data)
        
        assert task_update.title == "Updated Task Title"
        assert task_update.skills_needed == ["Python", "FastAPI"]
        assert task_update.workpackage_id == workpackage_id
        assert task_update.story_points == 8
        assert task_update.done is True
        assert task_update.start_date == now
        assert task_update.end_date == now

    def test_task_response_with_task_properties(self):
        """Test TaskResponse includes task-specific properties"""
        from datetime import UTC
        
        now = datetime.now(UTC)
        task_id = uuid4()
        user_id = uuid4()
        workpackage_id = uuid4()
        
        data = {
            "id": task_id,
            "type": "task",
            "title": "Test Task Title",
            "description": "Test description",
            "status": "active",
            "priority": 3,
            "assigned_to": user_id,
            "estimated_hours": 8.0,
            "actual_hours": 4.0,
            "due_date": now,
            "skills_needed": ["Python", "FastAPI"],
            "workpackage_id": workpackage_id,
            "story_points": 5,
            "done": False,
            "start_date": now,
            "end_date": now,
            "version": "1.0",
            "created_by": user_id,
            "created_at": now,
            "updated_at": now,
            "is_signed": False,
        }
        task_response = TaskResponse(**data)
        
        assert task_response.id == task_id
        assert task_response.skills_needed == ["Python", "FastAPI"]
        assert task_response.workpackage_id == workpackage_id
        assert task_response.story_points == 5
        assert task_response.done is False
        assert task_response.start_date == now
        assert task_response.end_date == now

    def test_task_minimal_with_defaults(self):
        """Test TaskCreate with minimal fields uses defaults"""
        data = {
            "title": "Minimal Task Title",
            "status": "draft",
        }
        task = TaskCreate(**data)
        
        assert task.title == "Minimal Task Title"
        assert task.status == "draft"
        assert task.skills_needed is None
        assert task.workpackage_id is None
        assert task.story_points is None
        assert task.done is False  # Default value
        assert task.start_date is None
        assert task.end_date is None
        assert task.due_date is None



class TestTaskSchemaNewSchedulingAttributes:
    """Test Task schema with new scheduling attributes (duration, effort, progress, calculated dates)"""

    def test_task_with_duration_and_effort(self):
        """Test TaskCreate with duration and effort"""
        data = {
            "title": "Implement feature X",
            "status": "draft",
            "duration": 5,  # 5 calendar days
            "effort": 20.0,  # 20 hours of work
        }
        task = TaskCreate(**data)
        
        assert task.duration == 5
        assert task.effort == 20.0

    def test_task_duration_validation(self):
        """Test duration validation (must be >= 1)"""
        # Valid duration
        data = {
            "title": "Test Task Title",
            "status": "draft",
            "duration": 1,
        }
        task = TaskCreate(**data)
        assert task.duration == 1

        # Zero duration should fail
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(
                title="Test Task Title",
                status="draft",
                duration=0,
            )
        # Pydantic Field constraint message
        assert "greater than or equal to 1" in str(exc_info.value)

        # Negative duration should fail
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(
                title="Test Task Title",
                status="draft",
                duration=-1,
            )
        assert "greater than or equal to 1" in str(exc_info.value)

    def test_task_effort_validation(self):
        """Test effort validation (must be >= 0)"""
        # Valid effort
        for effort_value in [0.0, 1.0, 8.0, 40.0, 100.5]:
            data = {
                "title": "Test Task Title",
                "status": "draft",
                "effort": effort_value,
            }
            task = TaskCreate(**data)
            assert task.effort == effort_value

        # Negative effort should fail
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(
                title="Test Task Title",
                status="draft",
                effort=-1.0,
            )
        # Pydantic Field constraint message
        assert "greater than or equal to 0" in str(exc_info.value)

    def test_task_backward_compatibility_estimated_hours(self):
        """Test that estimated_hours is still supported for backward compatibility"""
        data = {
            "title": "Test Task Title",
            "status": "draft",
            "estimated_hours": 16.0,
        }
        task = TaskCreate(**data)
        
        assert task.estimated_hours == 16.0

    def test_task_update_with_duration_and_effort(self):
        """Test TaskUpdate with duration and effort"""
        data = {
            "duration": 10,
            "effort": 40.0,
        }
        task_update = TaskUpdate(**data)
        
        assert task_update.duration == 10
        assert task_update.effort == 40.0

    def test_task_update_progress_validation(self):
        """Test progress validation in TaskUpdate (must be 0-100)"""
        # Valid progress values
        for progress_value in [0, 25, 50, 75, 100]:
            data = {
                "progress": progress_value,
            }
            task_update = TaskUpdate(**data)
            assert task_update.progress == progress_value

        # Progress > 100 should fail
        with pytest.raises(ValidationError) as exc_info:
            TaskUpdate(progress=101)
        # Pydantic Field constraint message
        assert "less than or equal to 100" in str(exc_info.value)

        # Negative progress should fail
        with pytest.raises(ValidationError) as exc_info:
            TaskUpdate(progress=-1)
        assert "greater than or equal to 0" in str(exc_info.value)

    def test_task_update_with_start_date_is(self):
        """Test TaskUpdate with start_date_is (actual start date)"""
        from datetime import UTC
        
        now = datetime.now(UTC)
        
        data = {
            "start_date_is": now,
            "progress": 50,
        }
        task_update = TaskUpdate(**data)
        
        assert task_update.start_date_is == now
        assert task_update.progress == 50

    def test_task_response_with_calculated_dates(self):
        """Test TaskResponse with calculated scheduling dates"""
        from datetime import UTC
        
        task_id = uuid4()
        user_id = uuid4()
        now = datetime.now(UTC)
        
        data = {
            "id": task_id,
            "type": "task",
            "title": "Test Task Title",
            "status": "active",
            "version": "1.0",
            "created_by": user_id,
            "created_at": now,
            "updated_at": now,
            "is_signed": False,
            "duration": 5,
            "effort": 20.0,
            "start_date": now,
            "due_date": now,
            "calculated_start_date": now,
            "calculated_end_date": now,
            "start_date_is": now,
            "progress": 60,
        }
        task_response = TaskResponse(**data)
        
        assert task_response.duration == 5
        assert task_response.effort == 20.0
        assert task_response.calculated_start_date == now
        assert task_response.calculated_end_date == now
        assert task_response.start_date_is == now
        assert task_response.progress == 60

    def test_task_response_calculated_dates_optional(self):
        """Test that calculated dates are optional in TaskResponse"""
        from datetime import UTC
        
        task_id = uuid4()
        user_id = uuid4()
        now = datetime.now(UTC)
        
        data = {
            "id": task_id,
            "type": "task",
            "title": "Test Task Title",
            "status": "draft",
            "version": "1.0",
            "created_by": user_id,
            "created_at": now,
            "updated_at": now,
            "is_signed": False,
        }
        task_response = TaskResponse(**data)
        
        # Calculated dates should be None when not provided
        assert task_response.calculated_start_date is None
        assert task_response.calculated_end_date is None
        assert task_response.start_date_is is None
        assert task_response.progress is None

    def test_task_with_all_new_scheduling_attributes(self):
        """Test TaskCreate with all new scheduling attributes"""
        from datetime import UTC
        
        now = datetime.now(UTC)
        workpackage_id = uuid4()
        
        data = {
            "title": "Complete feature implementation",
            "description": "Implement and test feature X",
            "status": "active",
            "priority": 4,
            "duration": 7,
            "effort": 35.0,
            "estimated_hours": 35.0,  # Backward compatibility
            "actual_hours": 10.0,
            "start_date": now,
            "due_date": now,
            "skills_needed": ["Python", "FastAPI", "PostgreSQL"],
            "workpackage_id": workpackage_id,
            "story_points": 8,
            "done": False,
        }
        task = TaskCreate(**data)
        
        assert task.title == "Complete feature implementation"
        assert task.duration == 7
        assert task.effort == 35.0
        assert task.estimated_hours == 35.0
        assert task.actual_hours == 10.0
        assert task.start_date == now
        assert task.due_date == now
        assert task.skills_needed == ["Python", "FastAPI", "PostgreSQL"]
        assert task.workpackage_id == workpackage_id
        assert task.story_points == 8
        assert task.done is False

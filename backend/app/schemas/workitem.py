"""Pydantic schemas for WorkItem model"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class WorkItemBase(BaseModel):
    """Base WorkItem schema with common fields"""

    title: str = Field(..., min_length=1, max_length=500, description="WorkItem title")
    description: str | None = Field(None, description="Detailed description of the WorkItem")
    status: str = Field(
        ...,
        description="Current status of the WorkItem"
    )
    priority: int | None = Field(
        None,
        ge=1,
        le=5,
        description="Priority level (1=lowest, 5=highest)"
    )
    assigned_to: UUID | None = Field(None, description="UUID of assigned user")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values"""
        # Combined statuses from all workitem types:
        # - Requirements/Tasks/Tests/Documents: draft, active, completed, archived, rejected
        # - Risks: draft, identified, assessed, mitigated, accepted, closed, archived
        allowed_statuses = {
            "draft", "active", "completed", "archived", "rejected",
            "identified", "assessed", "mitigated", "accepted", "closed"
        }
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed_statuses))}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate title is not empty after stripping whitespace"""
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")

        title = v.strip()
        if len(title) < 5:
            raise ValueError("Title must be at least 5 characters long")

        if len(title) > 500:
            raise ValueError("Title cannot exceed 500 characters")

        # Check for meaningful content
        if not any(c.isalpha() for c in title):
            raise ValueError("Title must contain at least one letter")

        return title


class WorkItemCreate(WorkItemBase):
    """Schema for creating a new WorkItem"""

    type: str = Field(
        ...,
        description="Type of WorkItem"
    )

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        """Validate type is one of allowed values"""
        allowed_types = {"requirement", "task", "test", "risk", "document"}
        if v.lower() not in allowed_types:
            raise ValueError(f"Type must be one of: {', '.join(allowed_types)}")
        return v.lower()


class WorkItemUpdate(BaseModel):
    """Schema for updating a WorkItem"""

    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = Field(None, description="Current status of the WorkItem")
    priority: int | None = Field(None, ge=1, le=5)
    assigned_to: UUID | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        """Validate status if provided"""
        if v is None:
            return v
        # Combined statuses from all workitem types
        allowed_statuses = {
            "draft", "active", "completed", "archived", "rejected",
            "identified", "assessed", "mitigated", "accepted", "closed"
        }
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed_statuses))}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        """Validate title if provided"""
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")
        return v.strip()


class WorkItemResponse(WorkItemBase):
    """Schema for WorkItem response (includes metadata)"""

    id: UUID
    type: str
    version: str = Field(..., description="Version number (e.g., '1.0', '1.1')")
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool = Field(default=False, description="Whether this WorkItem has valid digital signatures")

    model_config = {"from_attributes": True}


# Specialized WorkItem schemas for different types

class RequirementBase(WorkItemBase):
    """Base schema for Requirement WorkItems"""

    # Additional fields specific to requirements
    acceptance_criteria: str | None = Field(None, description="Acceptance criteria for the requirement")
    business_value: str | None = Field(None, description="Business value or justification")
    source: str | None = Field(None, description="Source of the requirement (e.g., stakeholder, regulation)")

    @field_validator("acceptance_criteria")
    @classmethod
    def validate_acceptance_criteria(cls, v: str | None) -> str | None:
        """Validate acceptance criteria format and content"""
        if v is None:
            return v

        v = v.strip()
        if not v:
            return None

        if len(v) < 20:
            raise ValueError("Acceptance criteria must be at least 20 characters long")

        if len(v) > 2000:
            raise ValueError("Acceptance criteria cannot exceed 2000 characters")

        # Check for structured format keywords
        structured_keywords = ["given", "when", "then", "and", "but", "should", "must", "shall"]
        v_lower = v.lower()
        has_structure = any(keyword in v_lower for keyword in structured_keywords)

        if not has_structure:
            raise ValueError(
                "Acceptance criteria should follow a structured format (e.g., Given-When-Then) "
                "and include keywords like 'given', 'when', 'then', 'should', 'must', or 'shall'"
            )

        # Check for prohibited placeholder text
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        v_upper = v.upper()
        for pattern in prohibited_patterns:
            if pattern in v_upper:
                raise ValueError(f"Acceptance criteria cannot contain placeholder text: {pattern}")

        return v

    @field_validator("business_value")
    @classmethod
    def validate_business_value(cls, v: str | None) -> str | None:
        """Validate business value content"""
        if v is None:
            return v

        v = v.strip()
        if not v:
            return None

        if len(v) < 10:
            raise ValueError("Business value must be at least 10 characters long")

        if len(v) > 1000:
            raise ValueError("Business value cannot exceed 1000 characters")

        # Check for meaningful content
        if not any(c.isalpha() for c in v):
            raise ValueError("Business value must contain descriptive text")

        # Check for prohibited placeholder text
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        v_upper = v.upper()
        for pattern in prohibited_patterns:
            if pattern in v_upper:
                raise ValueError(f"Business value cannot contain placeholder text: {pattern}")

        return v

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str | None) -> str | None:
        """Validate requirement source"""
        if v is None:
            return v

        v = v.strip()
        if not v:
            return None

        valid_sources = {
            "stakeholder", "regulation", "standard", "user_story",
            "business_rule", "technical_constraint", "compliance",
            "security", "performance", "usability", "other"
        }

        v_lower = v.lower()
        if v_lower not in valid_sources:
            raise ValueError(
                f"Invalid requirement source '{v}'. "
                f"Must be one of: {', '.join(sorted(valid_sources))}"
            )

        return v_lower


class RequirementCreate(RequirementBase):
    """Schema for creating a new Requirement"""

    type: Literal["requirement"] = "requirement"


class RequirementUpdate(BaseModel):
    """Schema for updating a Requirement"""

    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = Field(None, description="Current status of the WorkItem")
    priority: int | None = Field(None, ge=1, le=5)
    assigned_to: UUID | None = None
    acceptance_criteria: str | None = None
    business_value: str | None = None
    source: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        valid_statuses = {"draft", "active", "completed", "archived", "rejected"}
        if v.lower() not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(sorted(valid_statuses))}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")

        title = v.strip()
        if len(title) < 5:
            raise ValueError("Requirement title must be at least 5 characters long")

        if len(title) > 500:
            raise ValueError("Requirement title cannot exceed 500 characters")

        # Check for meaningful content
        if not any(c.isalpha() for c in title):
            raise ValueError("Requirement title must contain at least one letter")

        # Check for prohibited patterns
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        title_upper = title.upper()
        for pattern in prohibited_patterns:
            if pattern in title_upper:
                raise ValueError(f"Requirement title cannot contain placeholder text: {pattern}")

        return title

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is None:
            return v

        if v:  # Only validate if not empty string
            description = v.strip()
            if len(description) < 20:
                raise ValueError("Requirement description must be at least 20 characters long if provided")

            if len(description) > 5000:
                raise ValueError("Requirement description cannot exceed 5000 characters")

            # Check for prohibited placeholder text
            prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX", "Lorem ipsum"]
            description_upper = description.upper()
            for pattern in prohibited_patterns:
                if pattern in description_upper:
                    raise ValueError(f"Requirement description cannot contain placeholder text: {pattern}")

            return description

        return v

    @field_validator("acceptance_criteria")
    @classmethod
    def validate_acceptance_criteria(cls, v: str | None) -> str | None:
        if v is None:
            return v

        if v:  # Only validate if not empty string
            criteria = v.strip()
            if len(criteria) < 20:
                raise ValueError("Acceptance criteria must be at least 20 characters long")

            if len(criteria) > 2000:
                raise ValueError("Acceptance criteria cannot exceed 2000 characters")

            # Check for structured format keywords
            structured_keywords = ["given", "when", "then", "and", "but", "should", "must", "shall"]
            criteria_lower = criteria.lower()
            has_structure = any(keyword in criteria_lower for keyword in structured_keywords)

            if not has_structure:
                raise ValueError(
                    "Acceptance criteria should follow a structured format (e.g., Given-When-Then) "
                    "and include keywords like 'given', 'when', 'then', 'should', 'must', or 'shall'"
                )

            # Check for prohibited placeholder text
            prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
            criteria_upper = criteria.upper()
            for pattern in prohibited_patterns:
                if pattern in criteria_upper:
                    raise ValueError(f"Acceptance criteria cannot contain placeholder text: {pattern}")

            return criteria

        return v

    @field_validator("business_value")
    @classmethod
    def validate_business_value(cls, v: str | None) -> str | None:
        if v is None:
            return v

        if v:  # Only validate if not empty string
            value = v.strip()
            if len(value) < 10:
                raise ValueError("Business value must be at least 10 characters long")

            if len(value) > 1000:
                raise ValueError("Business value cannot exceed 1000 characters")

            # Check for meaningful content
            if not any(c.isalpha() for c in value):
                raise ValueError("Business value must contain descriptive text")

            # Check for prohibited placeholder text
            prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
            value_upper = value.upper()
            for pattern in prohibited_patterns:
                if pattern in value_upper:
                    raise ValueError(f"Business value cannot contain placeholder text: {pattern}")

            return value

        return v

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str | None) -> str | None:
        if v is None:
            return v

        if v:  # Only validate if not empty string
            source = v.strip()
            valid_sources = {
                "stakeholder", "regulation", "standard", "user_story",
                "business_rule", "technical_constraint", "compliance",
                "security", "performance", "usability", "other"
            }

            source_lower = source.lower()
            if source_lower not in valid_sources:
                raise ValueError(
                    f"Invalid requirement source '{source}'. "
                    f"Must be one of: {', '.join(sorted(valid_sources))}"
                )

            return source_lower

        return v


class RequirementResponse(RequirementBase):
    """Schema for Requirement response"""

    id: UUID
    type: str
    version: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool = False

    model_config = {"from_attributes": True}


class TaskBase(WorkItemBase):
    """Base schema for Task WorkItems"""

    estimated_hours: float | None = Field(None, ge=0, description="Estimated hours to complete")
    actual_hours: float | None = Field(None, ge=0, description="Actual hours spent")
    due_date: datetime | None = Field(None, description="Due date for the task")


class TaskCreate(TaskBase):
    """Schema for creating a new Task"""

    type: Literal["task"] = "task"


class TaskUpdate(BaseModel):
    """Schema for updating a Task"""

    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = Field(None, description="Current status of the WorkItem")
    priority: int | None = Field(None, ge=1, le=5)
    assigned_to: UUID | None = None
    estimated_hours: float | None = Field(None, ge=0)
    actual_hours: float | None = Field(None, ge=0)
    due_date: datetime | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")
        return v.strip()


class TaskResponse(TaskBase):
    """Schema for Task response"""

    id: UUID
    type: str
    version: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool = False

    model_config = {"from_attributes": True}


class SpecBase(WorkItemBase):
    """Base schema for Test WorkItems"""

    test_type: str | None = Field(None, description="Type of test (unit, integration, system, acceptance)")
    test_steps: str | None = Field(None, description="Detailed test steps")
    expected_result: str | None = Field(None, description="Expected test result")
    actual_result: str | None = Field(None, description="Actual test result")
    test_status: str | None = Field(
        None,
        description="Test execution status"
    )


class SpecCreate(SpecBase):
    """Schema for creating a new Test"""

    type: Literal["test"] = "test"

    @field_validator("test_status")
    @classmethod
    def validate_test_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed_statuses = {"not_run", "passed", "failed", "blocked"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Test status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()


class SpecUpdate(BaseModel):
    """Schema for updating a Test"""

    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = Field(None, description="Current status of the WorkItem")
    priority: int | None = Field(None, ge=1, le=5)
    assigned_to: UUID | None = None
    test_type: str | None = None
    test_steps: str | None = None
    expected_result: str | None = None
    actual_result: str | None = None
    test_status: str | None = Field(None, description="Test execution status")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("test_status")
    @classmethod
    def validate_test_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed_statuses = {"not_run", "passed", "failed", "blocked"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Test status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")
        return v.strip()


class SpecResponse(SpecBase):
    """Schema for Test response"""

    id: UUID
    type: str
    version: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool = False

    model_config = {"from_attributes": True}

# Keep the old names for backward compatibility
TestBase = SpecBase
TestSpecCreate = SpecCreate
TestSpecUpdate = SpecUpdate
TestSpecResponse = SpecResponse


class RiskBase(WorkItemBase):
    """Base schema for Risk WorkItems (FMEA)"""

    severity: int = Field(..., ge=1, le=10, description="Severity rating (1-10)")
    occurrence: int = Field(..., ge=1, le=10, description="Occurrence rating (1-10)")
    detection: int = Field(..., ge=1, le=10, description="Detection rating (1-10)")
    rpn: int | None = Field(None, description="Risk Priority Number (calculated)")
    mitigation_actions: str | None = Field(None, description="Planned mitigation actions")
    risk_owner: UUID | None = Field(None, description="Person responsible for risk management")


class RiskCreate(RiskBase):
    """Schema for creating a new Risk"""

    type: Literal["risk"] = "risk"


class RiskUpdate(BaseModel):
    """Schema for updating a Risk"""

    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = Field(None, description="Current status of the WorkItem")
    priority: int | None = Field(None, ge=1, le=5)
    assigned_to: UUID | None = None
    severity: int | None = Field(None, ge=1, le=10)
    occurrence: int | None = Field(None, ge=1, le=10)
    detection: int | None = Field(None, ge=1, le=10)
    mitigation_actions: str | None = None
    risk_owner: UUID | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")
        return v.strip()


class RiskResponse(RiskBase):
    """Schema for Risk response"""

    id: UUID
    type: str
    version: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool = False

    model_config = {"from_attributes": True}


class DocumentBase(WorkItemBase):
    """Base schema for Document WorkItems"""

    document_type: str | None = Field(None, description="Type of document (specification, manual, report)")
    file_path: str | None = Field(None, description="Path to the document file")
    file_size: int | None = Field(None, ge=0, description="File size in bytes")
    mime_type: str | None = Field(None, description="MIME type of the document")
    checksum: str | None = Field(None, description="File checksum for integrity verification")


class DocumentCreate(DocumentBase):
    """Schema for creating a new Document"""

    type: Literal["document"] = "document"


class DocumentUpdate(BaseModel):
    """Schema for updating a Document"""

    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = Field(None, description="Current status of the WorkItem")
    priority: int | None = Field(None, ge=1, le=5)
    assigned_to: UUID | None = None
    document_type: str | None = None
    file_path: str | None = None
    file_size: int | None = Field(None, ge=0)
    mime_type: str | None = None
    checksum: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")
        return v.strip()


class DocumentResponse(DocumentBase):
    """Schema for Document response"""

    id: UUID
    type: str
    version: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool = False

    model_config = {"from_attributes": True}


# Comment schemas for requirement comments

class CommentBase(BaseModel):
    """Base schema for comments"""

    comment: str = Field(..., min_length=1, max_length=2000, description="Comment text")

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: str) -> str:
        """Validate comment content"""
        if not v or not v.strip():
            raise ValueError("Comment cannot be empty")

        comment = v.strip()

        if len(comment) < 1:
            raise ValueError("Comment must contain at least 1 character")

        if len(comment) > 2000:
            raise ValueError("Comment cannot exceed 2000 characters")

        # Check for prohibited placeholder text
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        comment_upper = comment.upper()
        for pattern in prohibited_patterns:
            if pattern in comment_upper:
                raise ValueError(f"Comment cannot contain placeholder text: {pattern}")

        return comment


class CommentCreate(CommentBase):
    """Schema for creating a new comment"""
    pass


class CommentUpdate(BaseModel):
    """Schema for updating a comment"""

    comment: str = Field(..., min_length=1, max_length=2000, description="Updated comment text")

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: str) -> str:
        """Validate comment content"""
        if not v or not v.strip():
            raise ValueError("Comment cannot be empty")

        comment = v.strip()

        if len(comment) < 1:
            raise ValueError("Comment must contain at least 1 character")

        if len(comment) > 2000:
            raise ValueError("Comment cannot exceed 2000 characters")

        # Check for prohibited placeholder text
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        comment_upper = comment.upper()
        for pattern in prohibited_patterns:
            if pattern in comment_upper:
                raise ValueError(f"Comment cannot contain placeholder text: {pattern}")

        return comment


class CommentResponse(CommentBase):
    """Schema for comment response with metadata"""

    id: UUID = Field(..., description="Unique comment identifier")
    requirement_id: UUID = Field(..., description="ID of the requirement this comment belongs to")
    user_id: UUID = Field(..., description="ID of the user who created the comment")
    user_name: str | None = Field(None, description="Full name of the user who created the comment")
    user_email: str | None = Field(None, description="Email of the user who created the comment")
    created_at: datetime = Field(..., description="When the comment was created")
    updated_at: datetime | None = Field(None, description="When the comment was last updated")
    version: str = Field(..., description="Version of the requirement when comment was added")
    is_edited: bool = Field(default=False, description="Whether the comment has been edited")
    edit_count: int = Field(default=0, description="Number of times the comment has been edited")

    model_config = {"from_attributes": True}


class CommentWithUserInfo(CommentResponse):
    """Extended comment response with full user information"""

    user_role: str | None = Field(None, description="Role of the user who created the comment")
    user_avatar: str | None = Field(None, description="Avatar URL of the user")


class CommentListResponse(BaseModel):
    """Schema for paginated comment list response"""

    comments: list[CommentResponse] = Field(..., description="List of comments")
    total_count: int = Field(..., description="Total number of comments")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of comments per page")
    has_next: bool = Field(..., description="Whether there are more comments")
    has_previous: bool = Field(..., description="Whether there are previous comments")

"""Pydantic schemas for WorkItem model"""

from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class WorkItemBase(BaseModel):
    """Base WorkItem schema with common fields"""

    title: str = Field(..., min_length=1, max_length=500, description="WorkItem title")
    description: Optional[str] = Field(None, description="Detailed description of the WorkItem")
    status: str = Field(
        ..., 
        description="Current status of the WorkItem"
    )
    priority: Optional[int] = Field(
        None, 
        ge=1, 
        le=5, 
        description="Priority level (1=lowest, 5=highest)"
    )
    assigned_to: Optional[UUID] = Field(None, description="UUID of assigned user")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values"""
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate title is not empty after stripping whitespace"""
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")
        return v.strip()


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

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[str] = Field(None, description="Current status of the WorkItem")
    priority: Optional[int] = Field(None, ge=1, le=5)
    assigned_to: Optional[UUID] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        """Validate status if provided"""
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
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
    acceptance_criteria: Optional[str] = Field(None, description="Acceptance criteria for the requirement")
    business_value: Optional[str] = Field(None, description="Business value or justification")
    source: Optional[str] = Field(None, description="Source of the requirement (e.g., stakeholder, regulation)")


class RequirementCreate(RequirementBase):
    """Schema for creating a new Requirement"""
    
    type: Literal["requirement"] = "requirement"


class RequirementUpdate(BaseModel):
    """Schema for updating a Requirement"""
    
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[str] = Field(None, description="Current status of the WorkItem")
    priority: Optional[int] = Field(None, ge=1, le=5)
    assigned_to: Optional[UUID] = None
    acceptance_criteria: Optional[str] = None
    business_value: Optional[str] = None
    source: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")
        return v.strip()


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
    
    estimated_hours: Optional[float] = Field(None, ge=0, description="Estimated hours to complete")
    actual_hours: Optional[float] = Field(None, ge=0, description="Actual hours spent")
    due_date: Optional[datetime] = Field(None, description="Due date for the task")


class TaskCreate(TaskBase):
    """Schema for creating a new Task"""
    
    type: Literal["task"] = "task"


class TaskUpdate(BaseModel):
    """Schema for updating a Task"""
    
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[str] = Field(None, description="Current status of the WorkItem")
    priority: Optional[int] = Field(None, ge=1, le=5)
    assigned_to: Optional[UUID] = None
    estimated_hours: Optional[float] = Field(None, ge=0)
    actual_hours: Optional[float] = Field(None, ge=0)
    due_date: Optional[datetime] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
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


class TestBase(WorkItemBase):
    """Base schema for Test WorkItems"""
    
    test_type: Optional[str] = Field(None, description="Type of test (unit, integration, system, acceptance)")
    test_steps: Optional[str] = Field(None, description="Detailed test steps")
    expected_result: Optional[str] = Field(None, description="Expected test result")
    actual_result: Optional[str] = Field(None, description="Actual test result")
    test_status: Optional[str] = Field(
        None, 
        description="Test execution status"
    )


class TestCreate(TestBase):
    """Schema for creating a new Test"""
    
    type: Literal["test"] = "test"

    @field_validator("test_status")
    @classmethod
    def validate_test_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed_statuses = {"not_run", "passed", "failed", "blocked"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Test status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()


class TestUpdate(BaseModel):
    """Schema for updating a Test"""
    
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[str] = Field(None, description="Current status of the WorkItem")
    priority: Optional[int] = Field(None, ge=1, le=5)
    assigned_to: Optional[UUID] = None
    test_type: Optional[str] = None
    test_steps: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    test_status: Optional[str] = Field(None, description="Test execution status")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("test_status")
    @classmethod
    def validate_test_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed_statuses = {"not_run", "passed", "failed", "blocked"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Test status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")
        return v.strip()


class TestResponse(TestBase):
    """Schema for Test response"""
    
    id: UUID
    type: str
    version: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool = False

    model_config = {"from_attributes": True}


class RiskBase(WorkItemBase):
    """Base schema for Risk WorkItems (FMEA)"""
    
    severity: int = Field(..., ge=1, le=10, description="Severity rating (1-10)")
    occurrence: int = Field(..., ge=1, le=10, description="Occurrence rating (1-10)")
    detection: int = Field(..., ge=1, le=10, description="Detection rating (1-10)")
    rpn: Optional[int] = Field(None, description="Risk Priority Number (calculated)")
    mitigation_actions: Optional[str] = Field(None, description="Planned mitigation actions")
    risk_owner: Optional[UUID] = Field(None, description="Person responsible for risk management")


class RiskCreate(RiskBase):
    """Schema for creating a new Risk"""
    
    type: Literal["risk"] = "risk"


class RiskUpdate(BaseModel):
    """Schema for updating a Risk"""
    
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[str] = Field(None, description="Current status of the WorkItem")
    priority: Optional[int] = Field(None, ge=1, le=5)
    assigned_to: Optional[UUID] = None
    severity: Optional[int] = Field(None, ge=1, le=10)
    occurrence: Optional[int] = Field(None, ge=1, le=10)
    detection: Optional[int] = Field(None, ge=1, le=10)
    mitigation_actions: Optional[str] = None
    risk_owner: Optional[UUID] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
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
    
    document_type: Optional[str] = Field(None, description="Type of document (specification, manual, report)")
    file_path: Optional[str] = Field(None, description="Path to the document file")
    file_size: Optional[int] = Field(None, ge=0, description="File size in bytes")
    mime_type: Optional[str] = Field(None, description="MIME type of the document")
    checksum: Optional[str] = Field(None, description="File checksum for integrity verification")


class DocumentCreate(DocumentBase):
    """Schema for creating a new Document"""
    
    type: Literal["document"] = "document"


class DocumentUpdate(BaseModel):
    """Schema for updating a Document"""
    
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[str] = Field(None, description="Current status of the WorkItem")
    priority: Optional[int] = Field(None, ge=1, le=5)
    assigned_to: Optional[UUID] = None
    document_type: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = Field(None, ge=0)
    mime_type: Optional[str] = None
    checksum: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
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
"""
Pydantic schemas for Project Templating system.

This module defines schemas for template definitions, validation, and application results.
Templates contain only user-provided data; metadata fields (version, created_at, updated_at,
is_signed, rpn) are auto-generated during template application.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, field_validator

# ============================================================================
# Enumerations
# ============================================================================


class UserRole(str, Enum):
    """User role enumeration for template users."""

    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    VALIDATOR = "validator"
    AUDITOR = "auditor"
    USER = "user"


class RelationshipType(str, Enum):
    """Relationship type enumeration for workitem relationships."""

    IMPLEMENTS = "IMPLEMENTS"
    TESTED_BY = "TESTED_BY"
    MITIGATES = "MITIGATES"
    DEPENDS_ON = "DEPENDS_ON"
    ASSIGNED_TO_SPRINT = "ASSIGNED_TO_SPRINT"
    IN_BACKLOG = "IN_BACKLOG"
    LINKED_TO_DEPARTMENT = "LINKED_TO_DEPARTMENT"
    ALLOCATED_TO = "ALLOCATED_TO"
    PARENT_OF = "PARENT_OF"
    BELONGS_TO = "BELONGS_TO"


class ResourceType(str, Enum):
    """Resource type enumeration."""

    PERSON = "person"
    MACHINE = "machine"
    EQUIPMENT = "equipment"
    FACILITY = "facility"
    OTHER = "other"


class ResourceAvailability(str, Enum):
    """Resource availability enumeration."""

    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    LIMITED = "limited"


class ProjectStatus(str, Enum):
    """Project status enumeration."""

    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SprintStatus(str, Enum):
    """Sprint status enumeration."""

    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MilestoneStatus(str, Enum):
    """Milestone status enumeration."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ============================================================================
# Template Graph Entities
# ============================================================================


class TemplateCompany(BaseModel):
    """
    Template company schema.

    Defines a company to be created in the graph database during template application.
    """

    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local company identifier",
    )
    name: str = Field(..., min_length=1, max_length=200, description="Company name")
    description: str | None = Field(
        None, max_length=2000, description="Company description"
    )


class TemplateDepartment(BaseModel):
    """
    Template department schema.

    Defines a department to be created in the graph database during
    template application.
    """

    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local department identifier",
    )
    name: str = Field(..., min_length=1, max_length=200, description="Department name")
    description: str | None = Field(
        None, max_length=2000, description="Department description"
    )
    manager_user_id: str | None = Field(
        None,
        min_length=1,
        max_length=100,
        description="Template-local user ID of the department manager",
    )
    company_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local company ID this department belongs to",
    )


class TemplateResource(BaseModel):
    """
    Template resource schema.

    Defines a resource to be created in the graph database during template application.
    """

    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local resource identifier",
    )
    name: str = Field(..., min_length=1, max_length=200, description="Resource name")
    description: str | None = Field(
        None, max_length=2000, description="Resource description"
    )
    type: ResourceType = Field(
        ..., description="Resource type (person, machine, equipment, facility, other)"
    )
    capacity: float | None = Field(
        None, ge=0, description="Resource capacity (hours, units, etc.)"
    )
    department_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local department ID this resource belongs to",
    )
    skills: list[str] = Field(
        default_factory=list, description="List of resource skills"
    )
    availability: ResourceAvailability = Field(
        default=ResourceAvailability.AVAILABLE,
        description="Resource availability status",
    )

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v: list[str]) -> list[str]:
        """Validate skills list."""
        if v:
            for skill in v:
                if len(skill) > 100:
                    raise ValueError("Each skill must be 100 characters or less")
        return v


class TemplateProject(BaseModel):
    """
    Template project schema.

    Defines a project to be created in the graph database during template application.
    """

    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local project identifier",
    )
    name: str = Field(..., min_length=1, max_length=200, description="Project name")
    description: str | None = Field(
        None, max_length=2000, description="Project description"
    )
    status: ProjectStatus = Field(
        default=ProjectStatus.PLANNING, description="Project status"
    )


class TemplateSprint(BaseModel):
    """
    Template sprint schema.

    Defines a sprint to be created in the graph database during template application.
    """

    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local sprint identifier",
    )
    name: str = Field(..., min_length=1, max_length=200, description="Sprint name")
    description: str | None = Field(
        None, max_length=2000, description="Sprint description"
    )
    goal: str | None = Field(None, max_length=1000, description="Sprint goal")
    start_date: datetime = Field(..., description="Sprint start date")
    end_date: datetime = Field(..., description="Sprint end date")
    status: SprintStatus = Field(
        default=SprintStatus.PLANNING, description="Sprint status"
    )
    project_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local project ID this sprint belongs to",
    )
    capacity_hours: float | None = Field(
        None, ge=0, description="Sprint capacity in hours"
    )
    capacity_story_points: float | None = Field(
        None, ge=0, description="Sprint capacity in story points"
    )
    actual_velocity_hours: float | None = Field(
        None, ge=0, description="Actual velocity in hours"
    )
    actual_velocity_story_points: float | None = Field(
        None, ge=0, description="Actual velocity in story points"
    )

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: datetime, info) -> datetime:
        """Validate end_date is after start_date."""
        if "start_date" in info.data and v <= info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class TemplatePhase(BaseModel):
    """
    Template phase schema.

    Defines a project phase to be created in the graph database during
    template application.
    """

    id: str = Field(
        ..., min_length=1, max_length=100, description="Template-local phase identifier"
    )
    name: str = Field(..., min_length=1, max_length=200, description="Phase name")
    description: str | None = Field(
        None, max_length=2000, description="Phase description"
    )
    order: int = Field(..., ge=1, description="Phase order (must be >= 1)")
    project_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local project ID this phase belongs to",
    )


class TemplateWorkpackage(BaseModel):
    """
    Template workpackage schema.

    Defines a workpackage to be created in the graph database during
    template application.
    """

    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local workpackage identifier",
    )
    name: str = Field(..., min_length=1, max_length=200, description="Workpackage name")
    description: str | None = Field(
        None, max_length=2000, description="Workpackage description"
    )
    order: int = Field(..., ge=1, description="Workpackage order (must be >= 1)")
    phase_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local phase ID this workpackage belongs to",
    )


class TemplateBacklog(BaseModel):
    """
    Template backlog schema.

    Defines a backlog to be created in the graph database during template application.
    """

    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local backlog identifier",
    )
    name: str = Field(..., min_length=1, max_length=200, description="Backlog name")
    description: str | None = Field(
        None, max_length=2000, description="Backlog description"
    )
    project_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local project ID this backlog belongs to",
    )


class TemplateMilestone(BaseModel):
    """
    Template milestone schema.

    Defines a milestone to be created in the graph database during template application.
    """

    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local milestone identifier",
    )
    name: str = Field(..., min_length=1, max_length=200, description="Milestone name")
    description: str | None = Field(
        None, max_length=2000, description="Milestone description"
    )
    due_date: datetime = Field(..., description="Milestone due date")
    status: MilestoneStatus = Field(
        default=MilestoneStatus.PENDING, description="Milestone status"
    )
    project_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template-local project ID this milestone belongs to",
    )


# ============================================================================
# Template Metadata
# ============================================================================


class TemplateMetadata(BaseModel):
    """
    Template metadata schema.

    Contains identifying information about the template including name,
    version, description, and author.
    """

    name: str = Field(
        ...,
        pattern=r"^[a-z][a-z0-9-]*$",
        description="Template identifier in kebab-case (e.g., 'medical-device')",
    )
    version: str = Field(
        ..., pattern=r"^\d+\.\d+\.\d+$", description="Semantic version (e.g., '1.0.0')"
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Human-readable template description",
    )
    author: str = Field(
        ..., min_length=1, max_length=100, description="Template author name"
    )


# ============================================================================
# Template Settings
# ============================================================================


class TemplateSettings(BaseModel):
    """
    Template settings schema.

    Contains configuration options for template application, such as
    default password for users.
    """

    default_password: str = Field(
        default="password123",
        min_length=8,
        max_length=100,
        description="Default password for all users (hashed during application)",
    )


# ============================================================================
# Template User
# ============================================================================


class TemplateUser(BaseModel):
    """
    Template user schema.

    Defines a user to be created during template application. Contains only
    user-provided data; created_at and updated_at are auto-generated.
    """

    id: str = Field(
        ...,
        description="Template-local user identifier (can be UUID or readable ID like 'admin-user')",
    )
    email: EmailStr = Field(..., description="User email address (must be unique)")
    full_name: str = Field(
        ..., min_length=1, max_length=200, description="User's full name"
    )
    role: UserRole = Field(default=UserRole.USER, description="User role for RBAC")
    is_active: bool = Field(
        default=True, description="Whether the user account is active"
    )
    password: str | None = Field(
        None,
        min_length=8,
        max_length=100,
        description="Optional password override (uses default_password if not provided)",
    )
    failed_login_attempts: int = Field(
        default=0, ge=0, description="Number of failed login attempts (defaults to 0)"
    )
    locked_until: datetime | None = Field(
        None,
        description="Timestamp until which the account is locked (defaults to null)",
    )


# ============================================================================
# Template Workitems
# ============================================================================


class TemplateRequirement(BaseModel):
    """
    Template requirement schema.

    Defines a requirement workitem. Auto-generated fields (version, created_at,
    updated_at, is_signed) are added during application.
    """

    id: str = Field(..., description="Template-local requirement identifier")
    title: str = Field(
        ..., min_length=5, max_length=500, description="Requirement title"
    )
    description: str | None = Field(
        None, max_length=5000, description="Detailed requirement description"
    )
    status: str = Field(
        default="draft",
        description="Requirement status (draft, active, completed, archived)",
    )
    priority: int = Field(
        ..., ge=1, le=5, description="Priority level (1=lowest, 5=highest)"
    )
    acceptance_criteria: str | None = Field(
        None, max_length=2000, description="Acceptance criteria for the requirement"
    )
    business_value: str | None = Field(
        None, max_length=1000, description="Business value or justification"
    )
    source: str | None = Field(
        None,
        max_length=100,
        description="Source of the requirement (e.g., stakeholder, regulation)",
    )
    created_by: str = Field(
        ..., description="Template-local user ID who created this requirement"
    )

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values."""
        allowed_statuses = {"draft", "active", "completed", "archived", "rejected"}
        if v.lower() not in allowed_statuses:
            raise ValueError(
                f"Status must be one of: {', '.join(sorted(allowed_statuses))}"
            )
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate title is meaningful."""
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) < 5:
            raise ValueError("Title must be at least 5 characters long")
        if not any(c.isalpha() for c in v):
            raise ValueError("Title must contain at least one letter")
        return v


class TemplateTask(BaseModel):
    """
    Template task schema.

    Defines a task workitem with optional due_date. Auto-generated fields
    (version, created_at, updated_at, is_signed) are added during application.
    """

    id: str = Field(..., description="Template-local task identifier")
    title: str = Field(..., min_length=5, max_length=500, description="Task title")
    description: str | None = Field(
        None, max_length=5000, description="Detailed task description"
    )
    status: str = Field(
        default="draft", description="Task status (draft, active, completed, archived)"
    )
    priority: int = Field(
        ..., ge=1, le=5, description="Priority level (1=lowest, 5=highest)"
    )
    estimated_hours: float | None = Field(
        None, ge=0, description="Estimated hours to complete"
    )
    actual_hours: float | None = Field(None, ge=0, description="Actual hours spent")
    due_date: datetime | None = Field(None, description="Due date for the task")
    assigned_to: str | None = Field(
        None, description="Template-local user ID assigned to this task"
    )
    created_by: str = Field(
        ..., description="Template-local user ID who created this task"
    )

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values."""
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(
                f"Status must be one of: {', '.join(sorted(allowed_statuses))}"
            )
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate title is meaningful."""
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) < 5:
            raise ValueError("Title must be at least 5 characters long")
        if not any(c.isalpha() for c in v):
            raise ValueError("Title must contain at least one letter")
        return v


class TemplateTest(BaseModel):
    """
    Template test schema.

    Defines a test workitem with actual_result field. Auto-generated fields
    (version, created_at, updated_at, is_signed) are added during application.
    """

    id: str = Field(..., description="Template-local test identifier")
    title: str = Field(..., min_length=5, max_length=500, description="Test title")
    description: str | None = Field(
        None, max_length=5000, description="Detailed test description"
    )
    status: str = Field(
        default="draft", description="Test status (draft, active, completed, archived)"
    )
    priority: int = Field(
        ..., ge=1, le=5, description="Priority level (1=lowest, 5=highest)"
    )
    test_type: str | None = Field(
        None,
        max_length=50,
        description="Type of test (unit, integration, system, acceptance)",
    )
    test_steps: str | None = Field(
        None, max_length=2000, description="Detailed test steps"
    )
    expected_result: str | None = Field(
        None, max_length=1000, description="Expected test result"
    )
    actual_result: str | None = Field(
        None, max_length=1000, description="Actual test result (optional)"
    )
    test_status: str = Field(
        default="not_run",
        description="Test execution status (not_run, passed, failed, blocked)",
    )
    assigned_to: str | None = Field(
        None, description="Template-local user ID assigned to this test"
    )
    created_by: str = Field(
        ..., description="Template-local user ID who created this test"
    )

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values."""
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(
                f"Status must be one of: {', '.join(sorted(allowed_statuses))}"
            )
        return v.lower()

    @field_validator("test_status")
    @classmethod
    def validate_test_status(cls, v: str) -> str:
        """Validate test_status is one of allowed values."""
        allowed_statuses = {"not_run", "passed", "failed", "blocked"}
        if v.lower() not in allowed_statuses:
            raise ValueError(
                f"Test status must be one of: {', '.join(sorted(allowed_statuses))}"
            )
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate title is meaningful."""
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) < 5:
            raise ValueError("Title must be at least 5 characters long")
        if not any(c.isalpha() for c in v):
            raise ValueError("Title must contain at least one letter")
        return v


class TemplateRisk(BaseModel):
    """
    Template risk schema.

    Defines a risk workitem with FMEA ratings. The rpn field is calculated
    automatically during application (severity × occurrence × detection).
    Auto-generated fields (version, created_at, updated_at, is_signed, rpn)
    are added during application.
    """

    id: str = Field(..., description="Template-local risk identifier")
    title: str = Field(..., min_length=5, max_length=500, description="Risk title")
    description: str | None = Field(
        None, max_length=5000, description="Detailed risk description"
    )
    status: str = Field(
        default="draft",
        description="Risk status (draft, identified, assessed, mitigated, accepted, closed, archived)",
    )
    priority: int = Field(
        ..., ge=1, le=5, description="Priority level (1=lowest, 5=highest)"
    )
    severity: int = Field(
        ..., ge=1, le=10, description="Severity rating (1=lowest, 10=highest impact)"
    )
    occurrence: int = Field(
        ..., ge=1, le=10, description="Occurrence rating (1=rare, 10=very frequent)"
    )
    detection: int = Field(
        ...,
        ge=1,
        le=10,
        description="Detection rating (1=easily detected, 10=undetectable)",
    )
    mitigation_actions: str | None = Field(
        None, max_length=2000, description="Planned mitigation actions"
    )
    risk_owner: str | None = Field(
        None, description="Template-local user ID responsible for risk management"
    )
    created_by: str = Field(
        ..., description="Template-local user ID who created this risk"
    )

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values."""
        allowed_statuses = {
            "draft",
            "identified",
            "assessed",
            "mitigated",
            "accepted",
            "closed",
            "archived",
        }
        if v.lower() not in allowed_statuses:
            raise ValueError(
                f"Status must be one of: {', '.join(sorted(allowed_statuses))}"
            )
        return v.lower()

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate title is meaningful."""
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) < 5:
            raise ValueError("Title must be at least 5 characters long")
        if not any(c.isalpha() for c in v):
            raise ValueError("Title must contain at least one letter")
        return v


# ============================================================================
# Template Relationships
# ============================================================================


class TemplateRelationship(BaseModel):
    """
    Template relationship schema.

    Defines a relationship between two workitems or entities in the
    graph database. Supports extended relationship types with optional
    properties for resource allocation.
    """

    from_id: str = Field(..., description="Template-local ID of the source entity")
    to_id: str = Field(..., description="Template-local ID of the target entity")
    type: RelationshipType = Field(..., description="Type of relationship")
    allocation_percentage: float | None = Field(
        None,
        ge=0,
        le=100,
        description="Allocation percentage (only for ALLOCATED_TO relationships)",
    )
    lead: bool | None = Field(
        None,
        description=(
            "Whether this is a lead allocation (only for ALLOCATED_TO relationships)"
        ),
    )

    @field_validator("allocation_percentage")
    @classmethod
    def validate_allocation(cls, v: float | None, info) -> float | None:
        """Validate allocation_percentage for ALLOCATED_TO relationships."""
        if v is not None and info.data.get("type") != RelationshipType.ALLOCATED_TO:
            raise ValueError(
                "allocation_percentage can only be set for ALLOCATED_TO relationships"
            )
        return v

    @field_validator("lead")
    @classmethod
    def validate_lead(cls, v: bool | None, info) -> bool | None:
        """Validate lead is only set for ALLOCATED_TO relationships."""
        if v is not None and info.data.get("type") != RelationshipType.ALLOCATED_TO:
            raise ValueError("lead can only be set for ALLOCATED_TO relationships")
        return v


# ============================================================================
# Template Workitems Container
# ============================================================================


class TemplateWorkitems(BaseModel):
    """
    Container for all workitem types in a template.

    Groups requirements, tasks, tests, and risks together.
    """

    requirements: list[TemplateRequirement] = Field(
        default_factory=list, description="List of requirement workitems"
    )
    tasks: list[TemplateTask] = Field(
        default_factory=list, description="List of task workitems"
    )
    tests: list[TemplateTest] = Field(
        default_factory=list, description="List of test workitems"
    )
    risks: list[TemplateRisk] = Field(
        default_factory=list, description="List of risk workitems"
    )


# ============================================================================
# Template Definition
# ============================================================================


class TemplateDefinition(BaseModel):
    """
    Complete template definition schema.

    Contains all template data including metadata, settings, users, graph entities,
    workitems, and relationships. This is the root schema for template YAML files.
    """

    metadata: TemplateMetadata = Field(
        ..., description="Template metadata (name, version, description, author)"
    )
    settings: TemplateSettings = Field(
        default_factory=TemplateSettings,
        description="Template settings (default_password, etc.)",
    )
    users: list[TemplateUser] = Field(
        default_factory=list, description="List of users to create"
    )
    companies: list[TemplateCompany] = Field(
        default_factory=list, description="List of companies to create"
    )
    departments: list[TemplateDepartment] = Field(
        default_factory=list, description="List of departments to create"
    )
    resources: list[TemplateResource] = Field(
        default_factory=list, description="List of resources to create"
    )
    projects: list[TemplateProject] = Field(
        default_factory=list, description="List of projects to create"
    )
    sprints: list[TemplateSprint] = Field(
        default_factory=list, description="List of sprints to create"
    )
    phases: list[TemplatePhase] = Field(
        default_factory=list, description="List of phases to create"
    )
    workpackages: list[TemplateWorkpackage] = Field(
        default_factory=list, description="List of workpackages to create"
    )
    backlogs: list[TemplateBacklog] = Field(
        default_factory=list, description="List of backlogs to create"
    )
    milestones: list[TemplateMilestone] = Field(
        default_factory=list, description="List of milestones to create"
    )
    workitems: TemplateWorkitems = Field(
        default_factory=TemplateWorkitems, description="Workitems grouped by type"
    )
    relationships: list[TemplateRelationship] = Field(
        default_factory=list, description="Relationships between workitems and entities"
    )


# ============================================================================
# Validation Schemas
# ============================================================================


class ValidationError(BaseModel):
    """
    Validation error schema.

    Represents a single validation error with path, message, and optional value.
    """

    path: str = Field(
        ...,
        description="JSON path to the field with the error (e.g., 'users[0].email')",
    )
    message: str = Field(..., description="Human-readable error message")
    value: str | None = Field(None, description="The invalid value (optional)")


class ValidationResult(BaseModel):
    """
    Validation result schema.

    Contains validation status and list of errors if validation failed.
    """

    valid: bool = Field(..., description="Whether the template passed validation")
    errors: list[ValidationError] = Field(
        default_factory=list,
        description="List of validation errors (empty if valid=True)",
    )


# ============================================================================
# Application Result Schemas
# ============================================================================


class EntityResult(BaseModel):
    """
    Entity result schema.

    Represents the result of creating or skipping a single entity
    (user, workitem, or relationship) during template application.
    """

    id: str = Field(..., description="Entity identifier (template-local ID or UUID)")
    type: str = Field(
        ...,
        description="Entity type (user, requirement, task, test, risk, relationship)",
    )
    status: str = Field(..., description="Result status (created, skipped, failed)")
    message: str | None = Field(
        None,
        description="Optional message explaining the result (especially for skipped/failed)",
    )

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        """Validate entity type is one of allowed values."""
        allowed_types = {
            "user",
            "company",
            "department",
            "resource",
            "project",
            "sprint",
            "phase",
            "workpackage",
            "backlog",
            "milestone",
            "requirement",
            "task",
            "test",
            "risk",
            "relationship",
        }
        if v.lower() not in allowed_types:
            raise ValueError(
                f"Entity type must be one of: {', '.join(sorted(allowed_types))}"
            )
        return v.lower()

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values."""
        allowed_statuses = {"created", "skipped", "failed"}
        if v.lower() not in allowed_statuses:
            raise ValueError(
                f"Status must be one of: {', '.join(sorted(allowed_statuses))}"
            )
        return v.lower()


class ApplicationResult(BaseModel):
    """
    Application result schema.

    Contains the complete result of applying a template, including success status,
    counts of created/skipped/failed entities, and detailed results for each entity.
    """

    success: bool = Field(
        ..., description="Whether the template application was successful overall"
    )
    template_name: str = Field(..., description="Name of the template that was applied")
    dry_run: bool = Field(
        default=False, description="Whether this was a dry-run (no actual changes made)"
    )
    created_count: int = Field(
        ..., ge=0, description="Number of entities successfully created"
    )
    skipped_count: int = Field(
        ..., ge=0, description="Number of entities skipped (already exist)"
    )
    failed_count: int = Field(
        ..., ge=0, description="Number of entities that failed to create"
    )
    entities: list[EntityResult] = Field(
        default_factory=list, description="Detailed results for each entity"
    )

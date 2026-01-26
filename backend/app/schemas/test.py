"""
Test management schemas for TestSpec and TestRun entities.

This module defines Pydantic schemas for test specifications and test runs,
supporting verification and validation management as per Requirement 9.
"""

from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ExecutionStatus(str, Enum):
    """Test execution status enumeration."""
    PASS = "pass"
    FAIL = "fail"
    BLOCKED = "blocked"
    NOT_RUN = "not_run"


class StepExecutionStatus(str, Enum):
    """Individual test step status enumeration."""
    PASS = "pass"
    FAIL = "fail"
    BLOCKED = "blocked"
    SKIPPED = "skipped"
    NOT_RUN = "not_run"


class TestStep(BaseModel):
    """Individual test step within a test specification."""
    step_number: int = Field(..., ge=1, description="Step sequence number")
    description: str = Field(..., min_length=1, max_length=1000, description="Step description")
    expected_result: str = Field(..., min_length=1, max_length=1000, description="Expected outcome")
    status: StepExecutionStatus = Field(default=StepExecutionStatus.NOT_RUN, description="Step execution status")
    actual_result: str | None = Field(None, max_length=1000, description="Actual outcome when executed")
    notes: str | None = Field(None, max_length=2000, description="Additional notes or comments")


class TestSpecBase(BaseModel):
    """Base schema for test specifications."""
    title: str = Field(..., min_length=1, max_length=500, description="Test specification title")
    description: str | None = Field(None, max_length=2000, description="Detailed test description")
    test_type: str = Field(..., pattern=r'^(unit|integration|system|acceptance|regression)$',
                          description="Type of test")
    priority: int | None = Field(None, ge=1, le=5, description="Test priority (1=highest, 5=lowest)")
    preconditions: str | None = Field(None, max_length=1000, description="Prerequisites for test execution")
    test_steps: list[TestStep] = Field(default_factory=list, description="List of test steps")
    linked_requirements: list[UUID] = Field(default_factory=list, description="Requirements this test validates")

    @field_validator('test_steps')
    @classmethod
    def validate_test_steps(cls, v):
        """Ensure test steps have sequential numbering."""
        if not v:
            return v

        expected_numbers = set(range(1, len(v) + 1))
        actual_numbers = {step.step_number for step in v}

        if expected_numbers != actual_numbers:
            raise ValueError("Test steps must have sequential numbering starting from 1")

        return v


class TestSpecCreate(TestSpecBase):
    """Schema for creating a new test specification."""
    pass


class TestSpecUpdate(BaseModel):
    """Schema for updating an existing test specification."""
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = Field(None, max_length=2000)
    test_type: str | None = Field(None, pattern=r'^(unit|integration|system|acceptance|regression)$')
    priority: int | None = Field(None, ge=1, le=5)
    preconditions: str | None = Field(None, max_length=1000)
    test_steps: list[TestStep] | None = None
    linked_requirements: list[UUID] | None = None

    @field_validator('test_steps')
    @classmethod
    def validate_test_steps(cls, v):
        """Ensure test steps have sequential numbering."""
        if v is None:
            return v

        if not v:
            return v

        expected_numbers = set(range(1, len(v) + 1))
        actual_numbers = {step.step_number for step in v}

        if expected_numbers != actual_numbers:
            raise ValueError("Test steps must have sequential numbering starting from 1")

        return v


class TestSpecResponse(TestSpecBase):
    """Schema for test specification responses."""
    id: UUID
    version: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool = Field(default=False, description="Whether this test spec has valid signatures")

    model_config = ConfigDict(from_attributes=True)


class TestRunBase(BaseModel):
    """Base schema for test runs."""
    test_spec_id: UUID = Field(..., description="ID of the test specification being executed")
    test_spec_version: str = Field(..., description="Version of test spec being executed")
    executed_by: UUID = Field(..., description="User executing the test")
    execution_date: datetime = Field(default_factory=lambda: datetime.now(UTC), description="Test execution timestamp")
    environment: str | None = Field(None, max_length=200, description="Test environment details")
    test_data: dict[str, Any] | None = Field(None, description="Test data used during execution")
    overall_status: ExecutionStatus = Field(default=ExecutionStatus.NOT_RUN, description="Overall test result")
    step_results: list[TestStep] = Field(default_factory=list, description="Results for each test step")
    failure_description: str | None = Field(None, max_length=2000, description="Description of failures")
    defect_workitem_ids: list[UUID] = Field(default_factory=list, description="Linked defect WorkItems")
    execution_notes: str | None = Field(None, max_length=2000, description="Additional execution notes")

    @field_validator('step_results')
    @classmethod
    def validate_step_results(cls, v):
        """Ensure step results have sequential numbering."""
        if not v:
            return v

        expected_numbers = set(range(1, len(v) + 1))
        actual_numbers = {step.step_number for step in v}

        if expected_numbers != actual_numbers:
            raise ValueError("Step results must have sequential numbering starting from 1")

        return v

    @field_validator('failure_description')
    @classmethod
    def validate_failure_description(cls, v, info):
        """Require failure description when overall status is FAIL."""
        values = info.data
        if values.get('overall_status') == ExecutionStatus.FAIL and not v:
            raise ValueError("Failure description is required when overall status is FAIL")
        return v


class TestRunCreate(TestRunBase):
    """Schema for creating a new test run."""
    pass


class TestRunUpdate(BaseModel):
    """Schema for updating an existing test run."""
    environment: str | None = Field(None, max_length=200)
    test_data: dict[str, Any] | None = None
    overall_status: ExecutionStatus | None = None
    step_results: list[TestStep] | None = None
    failure_description: str | None = Field(None, max_length=2000)
    defect_workitem_ids: list[UUID] | None = None
    execution_notes: str | None = Field(None, max_length=2000)

    @field_validator('step_results')
    @classmethod
    def validate_step_results(cls, v):
        """Ensure step results have sequential numbering."""
        if v is None:
            return v

        if not v:
            return v

        expected_numbers = set(range(1, len(v) + 1))
        actual_numbers = {step.step_number for step in v}

        if expected_numbers != actual_numbers:
            raise ValueError("Step results must have sequential numbering starting from 1")

        return v

    @field_validator('failure_description')
    @classmethod
    def validate_failure_description(cls, v, info):
        """Require failure description when overall status is FAIL."""
        values = info.data
        if values.get('overall_status') == ExecutionStatus.FAIL and not v:
            raise ValueError("Failure description is required when overall status is FAIL")
        return v


class TestRunResponse(TestRunBase):
    """Schema for test run responses."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool = Field(default=False, description="Whether this test run has valid signatures")

    model_config = ConfigDict(from_attributes=True)


class TestCoverageResponse(BaseModel):
    """Schema for test coverage metrics."""
    total_requirements: int = Field(..., ge=0, description="Total number of requirements")
    requirements_with_tests: int = Field(..., ge=0, description="Requirements with linked test specs")
    requirements_with_passing_tests: int = Field(..., ge=0, description="Requirements with passing test runs")
    coverage_percentage: float = Field(..., ge=0.0, le=100.0, description="Test coverage percentage")
    detailed_coverage: list[dict[str, Any]] = Field(default_factory=list,
                                                   description="Detailed coverage per requirement")

    @field_validator('requirements_with_tests')
    @classmethod
    def validate_requirements_with_tests(cls, v, info):
        """Ensure requirements with tests doesn't exceed total."""
        values = info.data
        total = values.get('total_requirements', 0)
        if v > total:
            raise ValueError("Requirements with tests cannot exceed total requirements")
        return v

    @field_validator('requirements_with_passing_tests')
    @classmethod
    def validate_requirements_with_passing_tests(cls, v, info):
        """Ensure requirements with passing tests doesn't exceed those with tests."""
        values = info.data
        with_tests = values.get('requirements_with_tests', 0)
        if v > with_tests:
            raise ValueError("Requirements with passing tests cannot exceed requirements with tests")
        return v

    @field_validator('coverage_percentage')
    @classmethod
    def validate_coverage_percentage(cls, v, info):
        """Ensure coverage percentage matches calculated value."""
        values = info.data
        total = values.get('total_requirements', 0)
        passing = values.get('requirements_with_passing_tests', 0)

        if total > 0:
            expected = (passing / total) * 100
            if abs(v - expected) > 0.01:  # Allow small floating point differences
                raise ValueError(f"Coverage percentage {v} doesn't match calculated value {expected}")
        elif v != 0.0:
            raise ValueError("Coverage percentage must be 0 when no requirements exist")

        return v


class TestSpecListResponse(BaseModel):
    """Schema for paginated test specification lists."""
    items: list[TestSpecResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    pages: int = Field(..., ge=0)


class TestRunListResponse(BaseModel):
    """Schema for paginated test run lists."""
    items: list[TestRunResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    pages: int = Field(..., ge=0)

"""
Risk management schemas for FMEA (Failure Mode and Effects Analysis).

This module defines Pydantic schemas for Risk nodes, Failure nodes, and their
relationships in the graph database, supporting Requirement 10 (Risk Management with FMEA).
"""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class RiskStatus(str, Enum):
    """Risk status enumeration."""
    DRAFT = "draft"
    IDENTIFIED = "identified"
    ASSESSED = "assessed"
    MITIGATED = "mitigated"
    ACCEPTED = "accepted"
    CLOSED = "closed"
    ARCHIVED = "archived"


class MitigationStatus(str, Enum):
    """Mitigation action status enumeration."""
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFIED = "verified"
    CANCELLED = "cancelled"


class FailureType(str, Enum):
    """Failure type enumeration for FMEA."""
    FUNCTIONAL = "functional"
    PERFORMANCE = "performance"
    SAFETY = "safety"
    RELIABILITY = "reliability"
    INTERFACE = "interface"
    ENVIRONMENTAL = "environmental"
    USER_ERROR = "user_error"
    OTHER = "other"


# ============================================================================
# Risk Node Schemas (FMEA)
# ============================================================================

class RiskNodeBase(BaseModel):
    """
    Base schema for Risk nodes in the graph database.

    Risk nodes represent potential failure modes in FMEA analysis with
    severity, occurrence, and detection ratings used to calculate RPN.
    """
    title: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Risk title/name"
    )
    description: str | None = Field(
        None,
        max_length=2000,
        description="Detailed risk description"
    )
    status: RiskStatus = Field(
        default=RiskStatus.DRAFT,
        description="Current risk status"
    )

    # FMEA ratings (1-10 scale)
    severity: int = Field(
        ...,
        ge=1,
        le=10,
        description="Severity rating (1=lowest, 10=highest impact)"
    )
    occurrence: int = Field(
        ...,
        ge=1,
        le=10,
        description="Occurrence rating (1=rare, 10=very frequent)"
    )
    detection: int = Field(
        ...,
        ge=1,
        le=10,
        description="Detection rating (1=easily detected, 10=undetectable)"
    )

    # Risk categorization
    risk_category: str | None = Field(
        None,
        max_length=100,
        description="Risk category (e.g., technical, schedule, resource)"
    )
    failure_mode: str | None = Field(
        None,
        max_length=500,
        description="Description of the failure mode"
    )
    failure_effect: str | None = Field(
        None,
        max_length=500,
        description="Effect of the failure on the system/user"
    )
    failure_cause: str | None = Field(
        None,
        max_length=500,
        description="Root cause of the potential failure"
    )

    # Current controls
    current_controls: str | None = Field(
        None,
        max_length=1000,
        description="Current prevention/detection controls in place"
    )

    # Assignment
    risk_owner: UUID | None = Field(
        None,
        description="User responsible for managing this risk"
    )

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate risk title is meaningful."""
        v = v.strip()
        if not v:
            raise ValueError("Risk title cannot be empty")
        if not any(c.isalpha() for c in v):
            raise ValueError("Risk title must contain at least one letter")
        return v

    @field_validator('risk_category')
    @classmethod
    def validate_risk_category(cls, v: str | None) -> str | None:
        """Validate risk category if provided."""
        if v is None:
            return v

        valid_categories = {
            "technical", "schedule", "resource", "cost", "quality",
            "safety", "regulatory", "environmental", "operational",
            "strategic", "external", "other"
        }

        v_lower = v.strip().lower()
        if v_lower not in valid_categories:
            raise ValueError(
                f"Invalid risk category '{v}'. "
                f"Must be one of: {', '.join(sorted(valid_categories))}"
            )
        return v_lower


class RiskNodeCreate(RiskNodeBase):
    """Schema for creating a new Risk node in the graph database."""

    # Optional linked WorkItems
    linked_design_items: list[UUID] = Field(
        default_factory=list,
        description="Design WorkItems this risk is linked to"
    )
    linked_process_items: list[UUID] = Field(
        default_factory=list,
        description="Process WorkItems this risk is linked to"
    )


class RiskNodeUpdate(BaseModel):
    """Schema for updating an existing Risk node."""

    title: str | None = Field(None, min_length=5, max_length=500)
    description: str | None = Field(None, max_length=2000)
    status: RiskStatus | None = None
    severity: int | None = Field(None, ge=1, le=10)
    occurrence: int | None = Field(None, ge=1, le=10)
    detection: int | None = Field(None, ge=1, le=10)
    risk_category: str | None = Field(None, max_length=100)
    failure_mode: str | None = Field(None, max_length=500)
    failure_effect: str | None = Field(None, max_length=500)
    failure_cause: str | None = Field(None, max_length=500)
    current_controls: str | None = Field(None, max_length=1000)
    risk_owner: UUID | None = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Risk title cannot be empty")
        if not any(c.isalpha() for c in v):
            raise ValueError("Risk title must contain at least one letter")
        return v


class RiskNodeResponse(RiskNodeBase):
    """Schema for Risk node responses with calculated fields."""

    id: UUID = Field(..., description="Unique risk identifier")
    version: str = Field(..., description="Risk version")
    rpn: int = Field(..., description="Risk Priority Number (severity × occurrence × detection)")

    # Metadata
    created_by: UUID = Field(..., description="User who created the risk")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    is_signed: bool = Field(default=False, description="Whether this risk has valid signatures")

    # Linked items
    linked_design_items: list[UUID] = Field(
        default_factory=list,
        description="Design WorkItems this risk is linked to"
    )
    linked_process_items: list[UUID] = Field(
        default_factory=list,
        description="Process WorkItems this risk is linked to"
    )

    # Mitigation summary
    mitigation_count: int = Field(
        default=0,
        description="Number of mitigation actions"
    )
    has_open_mitigations: bool = Field(
        default=False,
        description="Whether there are incomplete mitigations"
    )

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def calculate_rpn(cls, data: Any) -> Any:
        """Calculate RPN from severity, occurrence, and detection."""
        if isinstance(data, dict):
            severity = data.get('severity', 1)
            occurrence = data.get('occurrence', 1)
            detection = data.get('detection', 1)
            data['rpn'] = severity * occurrence * detection
        return data


# ============================================================================
# Failure Node Schemas (FMEA)
# ============================================================================

class FailureNodeBase(BaseModel):
    """
    Base schema for Failure nodes in the graph database.

    Failure nodes represent potential failure outcomes that can be linked
    to Risk nodes via LEADS_TO relationships with probability attributes.
    """
    description: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Failure description"
    )
    impact: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Impact of this failure"
    )
    failure_type: FailureType = Field(
        default=FailureType.FUNCTIONAL,
        description="Type of failure"
    )

    # Severity assessment
    severity_level: int | None = Field(
        None,
        ge=1,
        le=10,
        description="Severity level of this specific failure"
    )

    # Additional context
    affected_components: str | None = Field(
        None,
        max_length=500,
        description="Components affected by this failure"
    )
    detection_method: str | None = Field(
        None,
        max_length=500,
        description="How this failure can be detected"
    )

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        """Validate failure description."""
        v = v.strip()
        if not v:
            raise ValueError("Failure description cannot be empty")
        if len(v) < 10:
            raise ValueError("Failure description must be at least 10 characters")
        return v

    @field_validator('impact')
    @classmethod
    def validate_impact(cls, v: str) -> str:
        """Validate failure impact."""
        v = v.strip()
        if not v:
            raise ValueError("Failure impact cannot be empty")
        if len(v) < 10:
            raise ValueError("Failure impact must be at least 10 characters")
        return v


class FailureNodeCreate(FailureNodeBase):
    """Schema for creating a new Failure node."""
    pass


class FailureNodeUpdate(BaseModel):
    """Schema for updating an existing Failure node."""

    description: str | None = Field(None, min_length=10, max_length=1000)
    impact: str | None = Field(None, min_length=10, max_length=1000)
    failure_type: FailureType | None = None
    severity_level: int | None = Field(None, ge=1, le=10)
    affected_components: str | None = Field(None, max_length=500)
    detection_method: str | None = Field(None, max_length=500)


class FailureNodeResponse(FailureNodeBase):
    """Schema for Failure node responses."""

    id: UUID = Field(..., description="Unique failure identifier")

    # Metadata
    created_by: UUID = Field(..., description="User who created the failure node")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    # Relationship info
    source_risk_id: UUID | None = Field(
        None,
        description="ID of the risk that leads to this failure"
    )
    downstream_failure_count: int = Field(
        default=0,
        description="Number of downstream failures"
    )

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# LEADS_TO Relationship Schemas
# ============================================================================

class LeadsToRelationshipBase(BaseModel):
    """
    Base schema for LEADS_TO relationships between Risk and Failure nodes.

    The probability attribute indicates the likelihood of the failure
    occurring given the risk condition.
    """
    probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Probability of this failure occurring (0.0 to 1.0)"
    )
    rationale: str | None = Field(
        None,
        max_length=500,
        description="Rationale for the probability assessment"
    )

    @field_validator('probability')
    @classmethod
    def validate_probability(cls, v: float) -> float:
        """Validate probability is within valid range."""
        if v < 0.0 or v > 1.0:
            raise ValueError("Probability must be between 0.0 and 1.0")
        return round(v, 4)  # Round to 4 decimal places


class LeadsToRelationshipCreate(LeadsToRelationshipBase):
    """Schema for creating a LEADS_TO relationship."""

    from_id: UUID = Field(..., description="Source node ID (Risk or Failure)")
    to_id: UUID = Field(..., description="Target node ID (Failure)")


class LeadsToRelationshipResponse(LeadsToRelationshipBase):
    """Schema for LEADS_TO relationship responses."""

    id: str = Field(..., description="Relationship identifier")
    from_id: UUID = Field(..., description="Source node ID")
    to_id: UUID = Field(..., description="Target node ID")
    from_type: str = Field(..., description="Source node type (Risk or Failure)")
    to_type: str = Field(..., description="Target node type (Failure)")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Mitigation Action Schemas
# ============================================================================

class MitigationActionBase(BaseModel):
    """Base schema for mitigation actions linked to risks."""

    title: str = Field(
        ...,
        min_length=5,
        max_length=200,
        description="Mitigation action title"
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Detailed description of the mitigation action"
    )
    action_type: str = Field(
        ...,
        description="Type of mitigation (prevention, detection, contingency)"
    )
    status: MitigationStatus = Field(
        default=MitigationStatus.PLANNED,
        description="Current status of the mitigation"
    )

    # Assignment and timeline
    assigned_to: UUID | None = Field(
        None,
        description="User responsible for implementing this mitigation"
    )
    due_date: datetime | None = Field(
        None,
        description="Target completion date"
    )
    completed_date: datetime | None = Field(
        None,
        description="Actual completion date"
    )

    # Expected impact
    expected_severity_reduction: int | None = Field(
        None,
        ge=0,
        le=9,
        description="Expected reduction in severity rating"
    )
    expected_occurrence_reduction: int | None = Field(
        None,
        ge=0,
        le=9,
        description="Expected reduction in occurrence rating"
    )
    expected_detection_improvement: int | None = Field(
        None,
        ge=0,
        le=9,
        description="Expected improvement in detection rating"
    )

    # Verification
    verification_method: str | None = Field(
        None,
        max_length=500,
        description="How the mitigation effectiveness will be verified"
    )
    verification_result: str | None = Field(
        None,
        max_length=500,
        description="Result of verification"
    )

    @field_validator('action_type')
    @classmethod
    def validate_action_type(cls, v: str) -> str:
        """Validate mitigation action type."""
        valid_types = {"prevention", "detection", "contingency", "transfer", "acceptance"}
        v_lower = v.strip().lower()
        if v_lower not in valid_types:
            raise ValueError(
                f"Invalid action type '{v}'. "
                f"Must be one of: {', '.join(sorted(valid_types))}"
            )
        return v_lower


class MitigationActionCreate(MitigationActionBase):
    """Schema for creating a new mitigation action."""

    risk_id: UUID = Field(..., description="ID of the risk this mitigation addresses")


class MitigationActionUpdate(BaseModel):
    """Schema for updating an existing mitigation action."""

    title: str | None = Field(None, min_length=5, max_length=200)
    description: str | None = Field(None, min_length=10, max_length=1000)
    action_type: str | None = None
    status: MitigationStatus | None = None
    assigned_to: UUID | None = None
    due_date: datetime | None = None
    completed_date: datetime | None = None
    expected_severity_reduction: int | None = Field(None, ge=0, le=9)
    expected_occurrence_reduction: int | None = Field(None, ge=0, le=9)
    expected_detection_improvement: int | None = Field(None, ge=0, le=9)
    verification_method: str | None = Field(None, max_length=500)
    verification_result: str | None = Field(None, max_length=500)

    @field_validator('action_type')
    @classmethod
    def validate_action_type(cls, v: str | None) -> str | None:
        if v is None:
            return v
        valid_types = {"prevention", "detection", "contingency", "transfer", "acceptance"}
        v_lower = v.strip().lower()
        if v_lower not in valid_types:
            raise ValueError(
                f"Invalid action type '{v}'. "
                f"Must be one of: {', '.join(sorted(valid_types))}"
            )
        return v_lower


class MitigationActionResponse(MitigationActionBase):
    """Schema for mitigation action responses."""

    id: UUID = Field(..., description="Unique mitigation action identifier")
    risk_id: UUID = Field(..., description="ID of the associated risk")

    # Metadata
    created_by: UUID = Field(..., description="User who created the mitigation")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Risk Chain and Analysis Schemas
# ============================================================================

class RiskChainNode(BaseModel):
    """Schema for a node in a risk failure chain."""

    id: UUID = Field(..., description="Node identifier")
    type: str = Field(..., description="Node type (Risk or Failure)")
    title: str | None = Field(None, description="Node title (for Risk)")
    description: str | None = Field(None, description="Node description")
    severity: int | None = Field(None, description="Severity rating (for Risk)")
    rpn: int | None = Field(None, description="RPN (for Risk)")


class RiskChainEdge(BaseModel):
    """Schema for an edge in a risk failure chain."""

    from_id: UUID = Field(..., description="Source node ID")
    to_id: UUID = Field(..., description="Target node ID")
    probability: float = Field(..., description="Transition probability")


class RiskChainResponse(BaseModel):
    """Schema for a complete risk failure chain."""

    start_risk_id: UUID = Field(..., description="Starting risk ID")
    chain_length: int = Field(..., description="Number of steps in the chain")
    total_probability: float = Field(
        ...,
        description="Combined probability (product of all step probabilities)"
    )
    nodes: list[RiskChainNode] = Field(..., description="Nodes in the chain")
    edges: list[RiskChainEdge] = Field(..., description="Edges in the chain")

    @field_validator('total_probability')
    @classmethod
    def validate_total_probability(cls, v: float) -> float:
        """Ensure total probability is valid."""
        if v < 0.0 or v > 1.0:
            raise ValueError("Total probability must be between 0.0 and 1.0")
        return round(v, 6)


class RiskReassessmentRequest(BaseModel):
    """Schema for requesting risk reassessment after mitigation."""

    risk_id: UUID = Field(..., description="Risk to reassess")
    new_severity: int | None = Field(None, ge=1, le=10, description="New severity rating")
    new_occurrence: int | None = Field(None, ge=1, le=10, description="New occurrence rating")
    new_detection: int | None = Field(None, ge=1, le=10, description="New detection rating")
    reassessment_notes: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Notes explaining the reassessment"
    )
    mitigation_ids: list[UUID] = Field(
        default_factory=list,
        description="Mitigations that led to this reassessment"
    )


class RiskReassessmentResponse(BaseModel):
    """Schema for risk reassessment response."""

    risk_id: UUID = Field(..., description="Reassessed risk ID")
    previous_rpn: int = Field(..., description="RPN before reassessment")
    new_rpn: int = Field(..., description="RPN after reassessment")
    rpn_reduction: int = Field(..., description="RPN reduction achieved")
    rpn_reduction_percentage: float = Field(..., description="Percentage reduction in RPN")

    previous_severity: int
    previous_occurrence: int
    previous_detection: int
    new_severity: int
    new_occurrence: int
    new_detection: int

    reassessment_notes: str
    reassessed_by: UUID
    reassessed_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# List Response Schemas
# ============================================================================

class RiskNodeListResponse(BaseModel):
    """Schema for paginated risk node lists."""

    items: list[RiskNodeResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    pages: int = Field(..., ge=0)


class FailureNodeListResponse(BaseModel):
    """Schema for paginated failure node lists."""

    items: list[FailureNodeResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    pages: int = Field(..., ge=0)


class MitigationActionListResponse(BaseModel):
    """Schema for paginated mitigation action lists."""

    items: list[MitigationActionResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    pages: int = Field(..., ge=0)


# ============================================================================
# RPN Threshold Configuration
# ============================================================================

class RPNThresholdConfig(BaseModel):
    """Configuration for RPN thresholds requiring mitigation."""

    critical_threshold: int = Field(
        default=200,
        ge=1,
        le=1000,
        description="RPN threshold for critical risks requiring immediate mitigation"
    )
    high_threshold: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="RPN threshold for high risks requiring mitigation"
    )
    medium_threshold: int = Field(
        default=50,
        ge=1,
        le=1000,
        description="RPN threshold for medium risks"
    )

    @model_validator(mode='after')
    def validate_thresholds(self) -> 'RPNThresholdConfig':
        """Ensure thresholds are in correct order."""
        if not (self.medium_threshold < self.high_threshold < self.critical_threshold):
            raise ValueError(
                "Thresholds must be in order: medium < high < critical"
            )
        return self


class RPNAnalysisResponse(BaseModel):
    """Schema for RPN analysis results."""

    risk_id: UUID
    rpn: int
    severity: int
    occurrence: int
    detection: int

    risk_level: str = Field(..., description="Risk level (critical, high, medium, low)")
    requires_mitigation: bool = Field(..., description="Whether mitigation is required")
    mitigation_deadline: datetime | None = Field(
        None,
        description="Recommended deadline for mitigation"
    )

    @model_validator(mode='before')
    @classmethod
    def calculate_risk_level(cls, data: Any) -> Any:
        """Calculate risk level based on RPN."""
        if isinstance(data, dict):
            rpn = data.get('rpn', 0)
            if rpn >= 200:
                data['risk_level'] = 'critical'
                data['requires_mitigation'] = True
            elif rpn >= 100:
                data['risk_level'] = 'high'
                data['requires_mitigation'] = True
            elif rpn >= 50:
                data['risk_level'] = 'medium'
                data['requires_mitigation'] = False
            else:
                data['risk_level'] = 'low'
                data['requires_mitigation'] = False
        return data

"""
Pydantic schemas for LLM service API endpoints.

These schemas define the request and response models for:
- Requirement analysis and improvement suggestions
- Meeting knowledge extraction
- Email work instruction parsing
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class RequirementAnalysisRequest(BaseModel):
    """Request schema for analyzing a requirement."""
    
    requirement_text: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="The requirement text to analyze for quality improvements"
    )
    
    @field_validator("requirement_text")
    @classmethod
    def validate_requirement_text(cls, v: str) -> str:
        """Validate requirement text is not empty."""
        if not v or not v.strip():
            raise ValueError("Requirement text cannot be empty")
        return v.strip()


class RequirementAnalysisResponse(BaseModel):
    """Response schema for requirement analysis."""
    
    suggestions: List[str] = Field(
        default_factory=list,
        description="List of improvement suggestions for the requirement"
    )
    llm_available: bool = Field(
        default=True,
        description="Whether the LLM service was available for analysis"
    )
    
    model_config = {"from_attributes": True}


class MeetingExtractionRequest(BaseModel):
    """Request schema for extracting knowledge from meeting minutes."""
    
    meeting_text: str = Field(
        ...,
        min_length=20,
        max_length=50000,
        description="The meeting minutes text to analyze"
    )
    
    @field_validator("meeting_text")
    @classmethod
    def validate_meeting_text(cls, v: str) -> str:
        """Validate meeting text is not empty."""
        if not v or not v.strip():
            raise ValueError("Meeting text cannot be empty")
        return v.strip()


class EntityInfo(BaseModel):
    """Schema for an extracted entity."""
    
    name: str = Field(..., description="Name of the entity")
    type: str = Field(
        default="unknown",
        description="Type of entity (person, component, system, project, team)"
    )


class DecisionInfo(BaseModel):
    """Schema for an extracted decision."""
    
    description: str = Field(..., description="Description of the decision")
    owner: Optional[str] = Field(
        None,
        description="Person responsible for the decision"
    )


class ActionInfo(BaseModel):
    """Schema for an extracted action item."""
    
    description: str = Field(..., description="Description of the action item")
    assignee: Optional[str] = Field(
        None,
        description="Person assigned to the action"
    )
    deadline: Optional[str] = Field(
        None,
        description="Deadline for the action (if mentioned)"
    )


class RelationshipInfo(BaseModel):
    """Schema for an extracted relationship."""
    
    from_entity: str = Field(..., alias="from", description="Source entity")
    to_entity: str = Field(..., alias="to", description="Target entity")
    type: str = Field(
        default="relates_to",
        description="Type of relationship"
    )
    
    model_config = {"populate_by_name": True}


class MeetingExtractionResponse(BaseModel):
    """Response schema for meeting knowledge extraction."""
    
    entities: List[EntityInfo] = Field(
        default_factory=list,
        description="Extracted entities (people, components, systems)"
    )
    decisions: List[DecisionInfo] = Field(
        default_factory=list,
        description="Decisions made during the meeting"
    )
    actions: List[ActionInfo] = Field(
        default_factory=list,
        description="Action items with assignees and deadlines"
    )
    relationships: List[RelationshipInfo] = Field(
        default_factory=list,
        description="Relationships between entities"
    )
    llm_available: bool = Field(
        default=True,
        description="Whether the LLM service was available for extraction"
    )
    
    model_config = {"from_attributes": True}


class EmailParseRequest(BaseModel):
    """Request schema for parsing work instruction from email."""
    
    email_body: str = Field(
        ...,
        min_length=5,
        max_length=50000,
        description="The email body text to parse"
    )
    
    @field_validator("email_body")
    @classmethod
    def validate_email_body(cls, v: str) -> str:
        """Validate email body is not empty."""
        if not v or not v.strip():
            raise ValueError("Email body cannot be empty")
        return v.strip()


class WorkInstructionData(BaseModel):
    """Schema for extracted work instruction data."""
    
    status: Optional[str] = Field(
        None,
        description="Current status (draft, active, completed)"
    )
    comment: Optional[str] = Field(
        None,
        description="Comments or updates from the email"
    )
    time_spent: Optional[float] = Field(
        None,
        ge=0,
        description="Hours worked (as a number)"
    )
    next_steps: Optional[str] = Field(
        None,
        description="Planned next actions"
    )


class EmailParseResponse(BaseModel):
    """Response schema for email parsing."""
    
    data: Optional[WorkInstructionData] = Field(
        None,
        description="Extracted work instruction data"
    )
    parsed: bool = Field(
        default=False,
        description="Whether any data was successfully extracted"
    )
    llm_available: bool = Field(
        default=True,
        description="Whether the LLM service was available for parsing"
    )
    
    model_config = {"from_attributes": True}


class LLMStatusResponse(BaseModel):
    """Response schema for LLM service status."""
    
    enabled: bool = Field(
        ...,
        description="Whether LLM integration is enabled in configuration"
    )
    available: bool = Field(
        ...,
        description="Whether the LLM service is currently responding"
    )
    model: str = Field(
        ...,
        description="Configured model name"
    )
    endpoint: str = Field(
        ...,
        description="Configured LLM endpoint URL"
    )
    
    model_config = {"from_attributes": True}

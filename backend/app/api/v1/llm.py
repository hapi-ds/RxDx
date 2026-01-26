"""
LLM API endpoints for intelligent text processing.

This module provides REST API endpoints for:
- Analyzing requirements and suggesting improvements
- Extracting knowledge from meeting minutes
- Parsing work instructions from emails

Implements Requirement 12 (Local LLM Integration).
"""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.security import Permission, require_permission
from app.models.user import User
from app.schemas.llm import (
    ActionInfo,
    DecisionInfo,
    EmailParseRequest,
    EmailParseResponse,
    EntityInfo,
    LLMStatusResponse,
    MeetingExtractionRequest,
    MeetingExtractionResponse,
    RelationshipInfo,
    RequirementAnalysisRequest,
    RequirementAnalysisResponse,
    WorkInstructionData,
)
from app.services.llm_service import LLMService, LLMServiceError, get_llm_service

router = APIRouter()


@router.get("/status", response_model=LLMStatusResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_llm_status(
    llm_service: LLMService = Depends(get_llm_service),
    current_user: User = Depends(get_current_user),
) -> LLMStatusResponse:
    """
    Get the current status of the LLM service.
    
    Returns:
    - **enabled**: Whether LLM integration is enabled in configuration
    - **available**: Whether the LLM service is currently responding
    - **model**: Configured model name
    - **endpoint**: Configured LLM endpoint URL
    """
    available = await llm_service.is_available()

    return LLMStatusResponse(
        enabled=llm_service.enabled,
        available=available,
        model=llm_service.model,
        endpoint=llm_service.base_url,
    )


@router.post("/analyze-requirement", response_model=RequirementAnalysisResponse)
@require_permission(Permission.READ_WORKITEM)
async def analyze_requirement(
    request: RequirementAnalysisRequest,
    llm_service: LLMService = Depends(get_llm_service),
    current_user: User = Depends(get_current_user),
) -> RequirementAnalysisResponse:
    """
    Analyze a requirement and suggest improvements.
    
    Uses local LLM to evaluate requirement quality based on:
    - Clarity and unambiguity
    - Testability
    - Completeness
    - Consistency
    - Atomicity
    
    **Request Body:**
    - **requirement_text**: The requirement text to analyze (10-5000 characters)
    
    **Returns:**
    - **suggestions**: List of specific improvement suggestions
    - **llm_available**: Whether the LLM service was available
    
    If LLM is unavailable, returns empty suggestions with llm_available=False.
    This endpoint never fails due to LLM unavailability (graceful degradation).
    """
    if not llm_service.enabled:
        return RequirementAnalysisResponse(
            suggestions=[],
            llm_available=False,
        )

    try:
        suggestions = await llm_service.suggest_requirement_improvements(
            request.requirement_text
        )

        return RequirementAnalysisResponse(
            suggestions=suggestions,
            llm_available=True,
        )

    except LLMServiceError:
        # Graceful degradation - return empty results instead of error
        return RequirementAnalysisResponse(
            suggestions=[],
            llm_available=False,
        )


@router.post("/extract-meeting", response_model=MeetingExtractionResponse)
@require_permission(Permission.READ_WORKITEM)
async def extract_meeting_knowledge(
    request: MeetingExtractionRequest,
    llm_service: LLMService = Depends(get_llm_service),
    current_user: User = Depends(get_current_user),
) -> MeetingExtractionResponse:
    """
    Extract entities and relationships from meeting minutes.
    
    Uses local LLM to analyze meeting content and extract:
    - **entities**: People, components, systems, projects, teams mentioned
    - **decisions**: Decisions made during the meeting with owners
    - **actions**: Action items with assignees and deadlines
    - **relationships**: Relationships between entities
    
    **Request Body:**
    - **meeting_text**: The meeting minutes text (20-50000 characters)
    
    **Returns:**
    - Structured extraction results
    - **llm_available**: Whether the LLM service was available
    
    If LLM is unavailable, returns empty lists with llm_available=False.
    This endpoint never fails due to LLM unavailability (graceful degradation).
    """
    if not llm_service.enabled:
        return MeetingExtractionResponse(
            entities=[],
            decisions=[],
            actions=[],
            relationships=[],
            llm_available=False,
        )

    try:
        result = await llm_service.extract_meeting_knowledge(request.meeting_text)

        # Convert raw dicts to Pydantic models
        entities = [
            EntityInfo(name=e["name"], type=e.get("type", "unknown"))
            for e in result.get("entities", [])
        ]

        decisions = [
            DecisionInfo(description=d["description"], owner=d.get("owner"))
            for d in result.get("decisions", [])
        ]

        actions = [
            ActionInfo(
                description=a["description"],
                assignee=a.get("assignee"),
                deadline=a.get("deadline"),
            )
            for a in result.get("actions", [])
        ]

        relationships = [
            RelationshipInfo(
                **{"from": r["from"], "to": r["to"], "type": r.get("type", "relates_to")}
            )
            for r in result.get("relationships", [])
        ]

        return MeetingExtractionResponse(
            entities=entities,
            decisions=decisions,
            actions=actions,
            relationships=relationships,
            llm_available=True,
        )

    except LLMServiceError:
        # Graceful degradation - return empty results instead of error
        return MeetingExtractionResponse(
            entities=[],
            decisions=[],
            actions=[],
            relationships=[],
            llm_available=False,
        )


@router.post("/parse-email", response_model=EmailParseResponse)
@require_permission(Permission.READ_WORKITEM)
async def parse_email_work_instruction(
    request: EmailParseRequest,
    llm_service: LLMService = Depends(get_llm_service),
    current_user: User = Depends(get_current_user),
) -> EmailParseResponse:
    """
    Parse work instruction data from email content.
    
    Uses local LLM to extract structured data from natural language email:
    - **status**: Current status (draft, active, completed)
    - **comment**: Comments or updates from the sender
    - **time_spent**: Hours worked (as a number)
    - **next_steps**: Planned next actions
    
    **Request Body:**
    - **email_body**: The email body text to parse (5-50000 characters)
    
    **Returns:**
    - **data**: Extracted work instruction data (null if nothing extracted)
    - **parsed**: Whether any data was successfully extracted
    - **llm_available**: Whether the LLM service was available
    
    If LLM is unavailable, returns parsed=False with llm_available=False.
    This endpoint never fails due to LLM unavailability (graceful degradation).
    """
    if not llm_service.enabled:
        return EmailParseResponse(
            data=None,
            parsed=False,
            llm_available=False,
        )

    try:
        result = await llm_service.extract_work_instruction(request.email_body)

        if result:
            work_instruction = WorkInstructionData(
                status=result.get("status"),
                comment=result.get("comment"),
                time_spent=result.get("time_spent"),
                next_steps=result.get("next_steps"),
            )

            return EmailParseResponse(
                data=work_instruction,
                parsed=True,
                llm_available=True,
            )
        else:
            return EmailParseResponse(
                data=None,
                parsed=False,
                llm_available=True,
            )

    except LLMServiceError:
        # Graceful degradation - return empty results instead of error
        return EmailParseResponse(
            data=None,
            parsed=False,
            llm_available=False,
        )

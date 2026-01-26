"""
Email API endpoints for work instructions and knowledge capture.

Implements Requirement 5 (Email-Based Work Instructions and Knowledge Capture).
"""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import get_current_user
from app.models.user import User
from app.services.email_service import (
    EmailParseError,
    EmailSendError,
    EmailService,
    get_email_service,
)

router = APIRouter(prefix="/email", tags=["email"])


# Request/Response schemas
class SendWorkInstructionRequest(BaseModel):
    """Request to send a work instruction email."""
    workitem_id: UUID = Field(..., description="WorkItem ID")
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(None, max_length=5000)
    status: str = Field(default="draft")
    priority: int | None = Field(None, ge=1, le=5)
    recipients: list[EmailStr] = Field(..., min_length=1)


class SendWorkInstructionResponse(BaseModel):
    """Response from sending a work instruction email."""
    success: bool
    message_id: str | None = None
    thread_id: str | None = None
    recipients: list[str] = []
    invalid_recipients: list[str] = []
    errors: list[str] = []


class ProcessEmailRequest(BaseModel):
    """Request to process an incoming email."""
    raw_email: str = Field(..., description="Base64 encoded raw email")


class ProcessEmailResponse(BaseModel):
    """Response from processing an incoming email."""
    success: bool
    workitem_id: str | None = None
    parsed_data: dict[str, Any] | None = None
    sender: str | None = None
    subject: str | None = None
    parse_method: str | None = None
    error: str | None = None


class ExtractKnowledgeRequest(BaseModel):
    """Request to extract knowledge from email content."""
    email_body: str = Field(..., min_length=1)


class ExtractKnowledgeResponse(BaseModel):
    """Response from knowledge extraction."""
    entities: list[dict[str, Any]] = []
    decisions: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []
    relationships: list[dict[str, Any]] = []


class EmailThreadResponse(BaseModel):
    """Response containing email thread history."""
    thread_id: str
    workitem_id: str
    subject: str
    emails: list[dict[str, Any]] = []
    email_count: int = 0


class PollingStatusResponse(BaseModel):
    """Response for email polling status."""
    is_polling: bool
    poll_interval_seconds: int


@router.post(
    "/send-instruction",
    response_model=SendWorkInstructionResponse,
    status_code=status.HTTP_200_OK,
    summary="Send work instruction email",
    description="Send a work instruction email to specified recipients.",
)
async def send_work_instruction(
    request: SendWorkInstructionRequest,
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
) -> SendWorkInstructionResponse:
    """
    Send a work instruction email for a WorkItem.

    The email will include the WorkItem ID in the subject for tracking replies.
    """
    workitem = {
        "id": str(request.workitem_id),
        "title": request.title,
        "description": request.description,
        "status": request.status,
        "priority": request.priority,
    }

    try:
        result = await email_service.send_work_instruction(
            workitem=workitem,
            recipients=[str(r) for r in request.recipients],
        )

        return SendWorkInstructionResponse(**result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except EmailSendError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to send email: {e}",
        )


@router.post(
    "/process-incoming",
    response_model=ProcessEmailResponse,
    status_code=status.HTTP_200_OK,
    summary="Process incoming email",
    description="Process an incoming email reply and extract updates.",
)
async def process_incoming_email(
    request: ProcessEmailRequest,
    email_service: EmailService = Depends(get_email_service),
) -> ProcessEmailResponse:
    """
    Process an incoming email reply.

    Extracts WorkItem ID from subject and parses the body for updates.
    Uses structured parsing first, then falls back to LLM if available.
    """
    import base64

    try:
        raw_email = base64.b64decode(request.raw_email)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 encoded email",
        )

    try:
        result = await email_service.process_incoming_email(raw_email)
        return ProcessEmailResponse(**result)

    except EmailParseError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse email: {e}",
        )


@router.post(
    "/extract-knowledge",
    response_model=ExtractKnowledgeResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract knowledge from email",
    description="Extract entities, decisions, and actions from email content.",
)
async def extract_knowledge(
    request: ExtractKnowledgeRequest,
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
) -> ExtractKnowledgeResponse:
    """
    Extract knowledge from email content using LLM.

    Analyzes the email body to extract:
    - Entities (people, components, systems)
    - Decisions made
    - Action items
    - Relationships between entities
    """
    result = await email_service.extract_knowledge_from_email(request.email_body)
    return ExtractKnowledgeResponse(**result)


@router.get(
    "/threads/{workitem_id}",
    response_model=EmailThreadResponse,
    status_code=status.HTTP_200_OK,
    summary="Get email thread history",
    description="Get the email thread history for a WorkItem.",
)
async def get_thread_history(
    workitem_id: UUID,
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
) -> EmailThreadResponse:
    """
    Get email thread history for a WorkItem.

    Returns all emails in the thread in chronological order.
    """
    thread = email_service.get_thread_history(str(workitem_id))

    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No email thread found for WorkItem {workitem_id}",
        )

    return EmailThreadResponse(
        thread_id=thread.thread_id,
        workitem_id=thread.workitem_id,
        subject=thread.subject,
        emails=thread.emails,
        email_count=len(thread.emails),
    )


@router.get(
    "/threads",
    response_model=list[EmailThreadResponse],
    status_code=status.HTTP_200_OK,
    summary="List all email threads",
    description="Get all email threads.",
)
async def list_threads(
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
) -> list[EmailThreadResponse]:
    """
    List all email threads.
    """
    threads = email_service.get_all_threads()

    return [
        EmailThreadResponse(
            thread_id=thread.thread_id,
            workitem_id=thread.workitem_id,
            subject=thread.subject,
            emails=thread.emails,
            email_count=len(thread.emails),
        )
        for thread in threads
    ]


@router.post(
    "/polling/start",
    response_model=PollingStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Start email polling",
    description="Start background email polling for incoming emails.",
)
async def start_polling(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
) -> PollingStatusResponse:
    """
    Start background email polling.

    Polls the configured IMAP server for new emails at the configured interval.
    """
    if email_service.is_polling:
        return PollingStatusResponse(
            is_polling=True,
            poll_interval_seconds=email_service.poll_interval,
        )

    await email_service.start_polling()

    return PollingStatusResponse(
        is_polling=True,
        poll_interval_seconds=email_service.poll_interval,
    )


@router.post(
    "/polling/stop",
    response_model=PollingStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Stop email polling",
    description="Stop background email polling.",
)
async def stop_polling(
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
) -> PollingStatusResponse:
    """
    Stop background email polling.
    """
    await email_service.stop_polling()

    return PollingStatusResponse(
        is_polling=False,
        poll_interval_seconds=email_service.poll_interval,
    )


@router.get(
    "/polling/status",
    response_model=PollingStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get polling status",
    description="Get the current email polling status.",
)
async def get_polling_status(
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
) -> PollingStatusResponse:
    """
    Get current email polling status.
    """
    return PollingStatusResponse(
        is_polling=email_service.is_polling,
        poll_interval_seconds=email_service.poll_interval,
    )

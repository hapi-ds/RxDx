"""
Integration tests for email API endpoints.

Tests cover:
- Sending work instruction emails
- Processing incoming emails
- Knowledge extraction
- Thread history management
- Polling status

Implements tests for Requirement 5 (Email-Based Work Instructions).
"""

import base64
from email.mime.text import MIMEText
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.email_service import EmailService, reset_email_service


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_current_user():
    """Create a mock current user."""
    user = MagicMock()
    user.id = "550e8400-e29b-41d4-a716-446655440000"
    user.email = "test@example.com"
    user.full_name = "Test User"
    user.role = "user"
    return user


@pytest.fixture
def auth_headers():
    """Create mock auth headers."""
    return {"Authorization": "Bearer test-token"}


@pytest.fixture(autouse=True)
def reset_service():
    """Reset email service before each test."""
    reset_email_service()
    yield
    reset_email_service()


def get_async_client():
    """Create async client with ASGI transport."""
    return AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    )


def create_raw_email(
    subject: str,
    body: str,
    sender: str = "user@example.com",
) -> str:
    """Helper to create base64 encoded raw email."""
    msg = MIMEText(body, "plain")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = "support@rxdx.local"
    return base64.b64encode(msg.as_bytes()).decode()


class TestSendWorkInstructionEndpoint:
    """Tests for POST /api/v1/email/send-instruction endpoint."""

    @pytest.mark.asyncio
    async def test_send_work_instruction_success(self, mock_current_user):
        """Test successful work instruction sending."""
        from app.api.deps import get_current_user
        from app.services.email_service import get_email_service

        # Create mock email service
        mock_service = MagicMock(spec=EmailService)
        mock_service.send_work_instruction = AsyncMock(return_value={
            "success": True,
            "message_id": "<test-msg-id@rxdx.local>",
            "thread_id": "thread-test-id",
            "recipients": ["user@example.com"],
            "invalid_recipients": [],
            "errors": [],
        })

        app.dependency_overrides[get_current_user] = lambda: mock_current_user
        app.dependency_overrides[get_email_service] = lambda: mock_service

        try:
            async with get_async_client() as ac:
                response = await ac.post(
                    "/api/v1/email/send-instruction",
                    json={
                        "workitem_id": "550e8400-e29b-41d4-a716-446655440000",
                        "title": "Test Task",
                        "description": "Test description",
                        "status": "active",
                        "priority": 1,
                        "recipients": ["user@example.com"],
                    },
                )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["message_id"] is not None

        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_send_work_instruction_invalid_recipients(self, mock_current_user):
        """Test sending with invalid recipients."""
        from app.api.deps import get_current_user
        from app.services.email_service import get_email_service

        mock_service = MagicMock(spec=EmailService)
        mock_service.send_work_instruction = AsyncMock(
            side_effect=ValueError("No valid recipients")
        )

        app.dependency_overrides[get_current_user] = lambda: mock_current_user
        app.dependency_overrides[get_email_service] = lambda: mock_service

        try:
            async with get_async_client() as ac:
                response = await ac.post(
                    "/api/v1/email/send-instruction",
                    json={
                        "workitem_id": "550e8400-e29b-41d4-a716-446655440000",
                        "title": "Test Task",
                        "recipients": ["invalid-email"],
                    },
                )

            assert response.status_code == 422  # Pydantic validation error

        finally:
            app.dependency_overrides.clear()



class TestProcessIncomingEmailEndpoint:
    """Tests for POST /api/v1/email/process-incoming endpoint."""

    @pytest.mark.asyncio
    async def test_process_valid_email(self):
        """Test processing a valid structured email."""
        from app.services.email_service import get_email_service

        mock_service = MagicMock(spec=EmailService)
        mock_service.process_incoming_email = AsyncMock(return_value={
            "success": True,
            "workitem_id": "550e8400-e29b-41d4-a716-446655440000",
            "parsed_data": {"status": "completed", "comment": "Done"},
            "sender": "user@example.com",
            "subject": "Re: [WorkItem-550e8400-e29b-41d4-a716-446655440000] Test",
            "parse_method": "structured",
            "error": None,
        })

        app.dependency_overrides[get_email_service] = lambda: mock_service

        try:
            raw_email = create_raw_email(
                subject="Re: [WorkItem-550e8400-e29b-41d4-a716-446655440000] Test",
                body="STATUS: completed | COMMENT: Done",
            )

            async with get_async_client() as ac:
                response = await ac.post(
                    "/api/v1/email/process-incoming",
                    json={"raw_email": raw_email},
                )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["workitem_id"] == "550e8400-e29b-41d4-a716-446655440000"
            assert data["parsed_data"]["status"] == "completed"

        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_process_invalid_base64(self):
        """Test processing with invalid base64 encoding."""
        async with get_async_client() as ac:
            response = await ac.post(
                "/api/v1/email/process-incoming",
                json={"raw_email": "not-valid-base64!!!"},
            )

        assert response.status_code == 400
        assert "Invalid base64" in response.json()["detail"]


class TestExtractKnowledgeEndpoint:
    """Tests for POST /api/v1/email/extract-knowledge endpoint."""

    @pytest.mark.asyncio
    async def test_extract_knowledge_success(self, mock_current_user):
        """Test successful knowledge extraction."""
        from app.api.deps import get_current_user
        from app.services.email_service import get_email_service

        mock_service = MagicMock(spec=EmailService)
        mock_service.extract_knowledge_from_email = AsyncMock(return_value={
            "entities": [{"name": "John", "type": "person"}],
            "decisions": [{"description": "Use Python", "owner": "John"}],
            "actions": [{"description": "Write tests", "assignee": "John"}],
            "relationships": [],
        })

        app.dependency_overrides[get_current_user] = lambda: mock_current_user
        app.dependency_overrides[get_email_service] = lambda: mock_service

        try:
            async with get_async_client() as ac:
                response = await ac.post(
                    "/api/v1/email/extract-knowledge",
                    json={"email_body": "Meeting notes: John decided to use Python."},
                )

            assert response.status_code == 200
            data = response.json()
            assert len(data["entities"]) == 1
            assert data["entities"][0]["name"] == "John"

        finally:
            app.dependency_overrides.clear()



class TestThreadHistoryEndpoints:
    """Tests for email thread history endpoints."""

    @pytest.mark.asyncio
    async def test_get_thread_history_success(self, mock_current_user):
        """Test getting thread history for a WorkItem."""
        from app.api.deps import get_current_user
        from app.services.email_service import EmailThread, get_email_service

        mock_thread = EmailThread(
            thread_id="thread-test-id",
            workitem_id="550e8400-e29b-41d4-a716-446655440000",
            subject="Test Subject",
        )
        mock_thread.emails = [
            {
                "message_id": "<msg-1@test.com>",
                "sender": "sender@test.com",
                "recipients": ["recipient@test.com"],
                "body": "Test body",
                "timestamp": "2024-01-15T10:00:00+00:00",
                "direction": "outgoing",
            }
        ]

        mock_service = MagicMock(spec=EmailService)
        mock_service.get_thread_history = MagicMock(return_value=mock_thread)

        app.dependency_overrides[get_current_user] = lambda: mock_current_user
        app.dependency_overrides[get_email_service] = lambda: mock_service

        try:
            async with get_async_client() as ac:
                response = await ac.get(
                    "/api/v1/email/threads/550e8400-e29b-41d4-a716-446655440000",
                )

            assert response.status_code == 200
            data = response.json()
            assert data["thread_id"] == "thread-test-id"
            assert data["email_count"] == 1

        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_thread_history_not_found(self, mock_current_user):
        """Test getting thread history for non-existent WorkItem."""
        from app.api.deps import get_current_user
        from app.services.email_service import get_email_service

        mock_service = MagicMock(spec=EmailService)
        mock_service.get_thread_history = MagicMock(return_value=None)

        app.dependency_overrides[get_current_user] = lambda: mock_current_user
        app.dependency_overrides[get_email_service] = lambda: mock_service

        try:
            async with get_async_client() as ac:
                response = await ac.get(
                    "/api/v1/email/threads/550e8400-e29b-41d4-a716-446655440000",
                )

            assert response.status_code == 404

        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_list_threads(self, mock_current_user):
        """Test listing all email threads."""
        from app.api.deps import get_current_user
        from app.services.email_service import EmailThread, get_email_service

        mock_threads = [
            EmailThread("thread-1", "wi-1", "Subject 1"),
            EmailThread("thread-2", "wi-2", "Subject 2"),
        ]

        mock_service = MagicMock(spec=EmailService)
        mock_service.get_all_threads = MagicMock(return_value=mock_threads)

        app.dependency_overrides[get_current_user] = lambda: mock_current_user
        app.dependency_overrides[get_email_service] = lambda: mock_service

        try:
            async with get_async_client() as ac:
                response = await ac.get("/api/v1/email/threads")

            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2

        finally:
            app.dependency_overrides.clear()



class TestPollingEndpoints:
    """Tests for email polling endpoints."""

    @pytest.mark.asyncio
    async def test_get_polling_status(self, mock_current_user):
        """Test getting polling status."""
        from app.api.deps import get_current_user
        from app.services.email_service import get_email_service

        mock_service = MagicMock(spec=EmailService)
        mock_service.is_polling = False
        mock_service.poll_interval = 60

        app.dependency_overrides[get_current_user] = lambda: mock_current_user
        app.dependency_overrides[get_email_service] = lambda: mock_service

        try:
            async with get_async_client() as ac:
                response = await ac.get("/api/v1/email/polling/status")

            assert response.status_code == 200
            data = response.json()
            assert data["is_polling"] is False
            assert data["poll_interval_seconds"] == 60

        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_start_polling(self, mock_current_user):
        """Test starting email polling."""
        from app.api.deps import get_current_user
        from app.services.email_service import get_email_service

        mock_service = MagicMock(spec=EmailService)
        mock_service.is_polling = False
        mock_service.poll_interval = 60
        mock_service.start_polling = AsyncMock()

        app.dependency_overrides[get_current_user] = lambda: mock_current_user
        app.dependency_overrides[get_email_service] = lambda: mock_service

        try:
            async with get_async_client() as ac:
                response = await ac.post("/api/v1/email/polling/start")

            assert response.status_code == 200
            data = response.json()
            assert data["is_polling"] is True
            mock_service.start_polling.assert_called_once()

        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_stop_polling(self, mock_current_user):
        """Test stopping email polling."""
        from app.api.deps import get_current_user
        from app.services.email_service import get_email_service

        mock_service = MagicMock(spec=EmailService)
        mock_service.is_polling = True
        mock_service.poll_interval = 60
        mock_service.stop_polling = AsyncMock()

        app.dependency_overrides[get_current_user] = lambda: mock_current_user
        app.dependency_overrides[get_email_service] = lambda: mock_service

        try:
            async with get_async_client() as ac:
                response = await ac.post("/api/v1/email/polling/stop")

            assert response.status_code == 200
            data = response.json()
            assert data["is_polling"] is False
            mock_service.stop_polling.assert_called_once()

        finally:
            app.dependency_overrides.clear()


class TestEmailWorkflowIntegration:
    """Integration tests for complete email workflows."""

    @pytest.mark.asyncio
    async def test_send_and_receive_workflow(self, mock_current_user):
        """Test complete send and receive workflow."""
        from app.api.deps import get_current_user
        from app.services.email_service import EmailService

        # Use real service but mock SMTP
        service = EmailService()

        app.dependency_overrides[get_current_user] = lambda: mock_current_user

        try:
            # Mock the _send_email method
            with patch.object(service, "_send_email", new_callable=AsyncMock):
                # Send work instruction
                result = await service.send_work_instruction(
                    workitem={
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "title": "Test Task",
                        "description": "Test description",
                        "status": "active",
                    },
                    recipients=["user@example.com"],
                )

                assert result["success"] is True

                # Verify thread was created
                thread = service.get_thread_history(
                    "550e8400-e29b-41d4-a716-446655440000"
                )
                assert thread is not None
                assert len(thread.emails) == 1

                # Process reply
                reply_email = MIMEText("STATUS: completed | COMMENT: Done", "plain")
                reply_email["Subject"] = (
                    "Re: [WorkItem-550e8400-e29b-41d4-a716-446655440000] Test Task"
                )
                reply_email["From"] = "user@example.com"

                with patch.object(
                    service, "send_parsing_error", new_callable=AsyncMock
                ):
                    reply_result = await service.process_incoming_email(
                        reply_email.as_bytes()
                    )

                assert reply_result["success"] is True
                assert reply_result["parsed_data"]["status"] == "completed"

                # Verify thread was updated
                thread = service.get_thread_history(
                    "550e8400-e29b-41d4-a716-446655440000"
                )
                assert len(thread.emails) == 2

        finally:
            app.dependency_overrides.clear()

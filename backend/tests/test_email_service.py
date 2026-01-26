"""
Unit tests for EmailService.

Tests cover:
- Email validation
- WorkItem ID extraction from subjects
- Structured reply parsing (STATUS, COMMENT, TIME format)
- Email body extraction
- Thread history tracking
- Error handling

Implements tests for Requirement 5 (Email-Based Work Instructions).
"""

from datetime import UTC, datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.email_service import (
    EmailService,
    EmailThread,
)


class TestEmailThread:
    """Tests for EmailThread class."""

    def test_create_thread(self):
        """Test creating an email thread."""
        thread = EmailThread(
            thread_id="thread-123",
            workitem_id="workitem-456",
            subject="Test Subject",
        )

        assert thread.thread_id == "thread-123"
        assert thread.workitem_id == "workitem-456"
        assert thread.subject == "Test Subject"
        assert thread.emails == []

    def test_add_email_to_thread(self):
        """Test adding an email to a thread."""
        thread = EmailThread(
            thread_id="thread-123",
            workitem_id="workitem-456",
            subject="Test Subject",
        )

        thread.add_email(
            message_id="<msg-1@test.com>",
            sender="sender@test.com",
            recipients=["recipient@test.com"],
            body="Test body",
            timestamp=datetime(2024, 1, 15, 10, 0, 0, tzinfo=UTC),
            direction="outgoing",
        )

        assert len(thread.emails) == 1
        assert thread.emails[0]["message_id"] == "<msg-1@test.com>"
        assert thread.emails[0]["sender"] == "sender@test.com"
        assert thread.emails[0]["direction"] == "outgoing"


    def test_add_emails_chronological_order(self):
        """Test that emails are added in chronological order."""
        thread = EmailThread(
            thread_id="thread-123",
            workitem_id="workitem-456",
            subject="Test Subject",
        )

        # Add emails out of order
        thread.add_email(
            message_id="<msg-2@test.com>",
            sender="sender@test.com",
            recipients=["recipient@test.com"],
            body="Second email",
            timestamp=datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC),
            direction="incoming",
        )

        thread.add_email(
            message_id="<msg-1@test.com>",
            sender="sender@test.com",
            recipients=["recipient@test.com"],
            body="First email",
            timestamp=datetime(2024, 1, 15, 10, 0, 0, tzinfo=UTC),
            direction="outgoing",
        )

        thread.add_email(
            message_id="<msg-3@test.com>",
            sender="sender@test.com",
            recipients=["recipient@test.com"],
            body="Third email",
            timestamp=datetime(2024, 1, 15, 14, 0, 0, tzinfo=UTC),
            direction="incoming",
        )

        # Verify chronological order
        assert len(thread.emails) == 3
        assert thread.emails[0]["message_id"] == "<msg-1@test.com>"
        assert thread.emails[1]["message_id"] == "<msg-2@test.com>"
        assert thread.emails[2]["message_id"] == "<msg-3@test.com>"

    def test_thread_to_dict(self):
        """Test converting thread to dictionary."""
        thread = EmailThread(
            thread_id="thread-123",
            workitem_id="workitem-456",
            subject="Test Subject",
        )

        thread.add_email(
            message_id="<msg-1@test.com>",
            sender="sender@test.com",
            recipients=["recipient@test.com"],
            body="Test body",
            timestamp=datetime(2024, 1, 15, 10, 0, 0, tzinfo=UTC),
            direction="outgoing",
        )

        data = thread.to_dict()

        assert data["thread_id"] == "thread-123"
        assert data["workitem_id"] == "workitem-456"
        assert data["subject"] == "Test Subject"
        assert len(data["emails"]) == 1

    def test_thread_from_dict(self):
        """Test creating thread from dictionary."""
        data = {
            "thread_id": "thread-123",
            "workitem_id": "workitem-456",
            "subject": "Test Subject",
            "emails": [
                {
                    "message_id": "<msg-1@test.com>",
                    "sender": "sender@test.com",
                    "recipients": ["recipient@test.com"],
                    "body": "Test body",
                    "timestamp": "2024-01-15T10:00:00+00:00",
                    "direction": "outgoing",
                }
            ],
        }

        thread = EmailThread.from_dict(data)

        assert thread.thread_id == "thread-123"
        assert thread.workitem_id == "workitem-456"
        assert len(thread.emails) == 1



class TestEmailServiceValidation:
    """Tests for email validation."""

    def test_validate_valid_email(self):
        """Test validating a valid email address."""
        service = EmailService()
        assert service._validate_email("test@example.com") is True
        assert service._validate_email("user.name@domain.org") is True

    def test_validate_invalid_email(self):
        """Test validating invalid email addresses."""
        service = EmailService()
        assert service._validate_email("invalid") is False
        assert service._validate_email("@domain.com") is False
        assert service._validate_email("user@") is False
        assert service._validate_email("") is False


class TestWorkItemIdExtraction:
    """Tests for WorkItem ID extraction from email subjects."""

    def test_extract_workitem_id_valid(self):
        """Test extracting WorkItem ID from valid subject."""
        service = EmailService()

        subject = "[WorkItem-550e8400-e29b-41d4-a716-446655440000] Task Title"
        workitem_id = service._extract_workitem_id(subject)

        assert workitem_id == "550e8400-e29b-41d4-a716-446655440000"

    def test_extract_workitem_id_case_insensitive(self):
        """Test that extraction is case insensitive."""
        service = EmailService()

        subject = "[WORKITEM-550e8400-e29b-41d4-a716-446655440000] Task Title"
        workitem_id = service._extract_workitem_id(subject)

        assert workitem_id == "550e8400-e29b-41d4-a716-446655440000"

    def test_extract_workitem_id_with_re_prefix(self):
        """Test extracting ID from reply subject."""
        service = EmailService()

        subject = "Re: [WorkItem-550e8400-e29b-41d4-a716-446655440000] Task Title"
        workitem_id = service._extract_workitem_id(subject)

        assert workitem_id == "550e8400-e29b-41d4-a716-446655440000"

    def test_extract_workitem_id_not_found(self):
        """Test when WorkItem ID is not in subject."""
        service = EmailService()

        subject = "Regular email subject"
        workitem_id = service._extract_workitem_id(subject)

        assert workitem_id is None

    def test_extract_workitem_id_invalid_format(self):
        """Test with invalid UUID format."""
        service = EmailService()

        subject = "[WorkItem-invalid-id] Task Title"
        workitem_id = service._extract_workitem_id(subject)

        assert workitem_id is None



class TestStructuredReplyParsing:
    """Tests for structured email reply parsing."""

    def test_parse_complete_structured_reply(self):
        """Test parsing a complete structured reply."""
        service = EmailService()

        body = "STATUS: completed | COMMENT: Task finished successfully | TIME: 2.5"
        result = service.parse_structured_reply(body)

        assert result is not None
        assert result["status"] == "completed"
        assert result["comment"] == "Task finished successfully"
        assert result["time_spent"] == 2.5

    def test_parse_status_only(self):
        """Test parsing reply with only status."""
        service = EmailService()

        body = "STATUS: active"
        result = service.parse_structured_reply(body)

        assert result is not None
        assert result["status"] == "active"
        assert "comment" not in result
        assert "time_spent" not in result

    def test_parse_comment_only(self):
        """Test parsing reply with only comment."""
        service = EmailService()

        body = "COMMENT: Made progress on the implementation"
        result = service.parse_structured_reply(body)

        assert result is not None
        assert result["comment"] == "Made progress on the implementation"

    def test_parse_time_only(self):
        """Test parsing reply with only time."""
        service = EmailService()

        body = "TIME: 3.5"
        result = service.parse_structured_reply(body)

        assert result is not None
        assert result["time_spent"] == 3.5

    def test_parse_multiline_format(self):
        """Test parsing multiline structured reply."""
        service = EmailService()

        body = """STATUS: completed
COMMENT: Finished the task
TIME: 4"""
        result = service.parse_structured_reply(body)

        assert result is not None
        assert result["status"] == "completed"
        assert "Finished the task" in result["comment"]
        assert result["time_spent"] == 4.0

    def test_parse_status_aliases(self):
        """Test parsing status aliases."""
        service = EmailService()

        # Test 'done' -> 'completed'
        result = service.parse_structured_reply("STATUS: done")
        assert result["status"] == "completed"

        # Test 'working' -> 'active'
        result = service.parse_structured_reply("STATUS: working")
        assert result["status"] == "active"

    def test_parse_case_insensitive(self):
        """Test that parsing is case insensitive."""
        service = EmailService()

        body = "status: COMPLETED | comment: Test | time: 1"
        result = service.parse_structured_reply(body)

        assert result is not None
        assert result["status"] == "completed"

    def test_parse_empty_body(self):
        """Test parsing empty body."""
        service = EmailService()

        assert service.parse_structured_reply("") is None
        assert service.parse_structured_reply(None) is None

    def test_parse_unstructured_body(self):
        """Test parsing unstructured body returns None."""
        service = EmailService()

        body = "Just a regular email without any structured format."
        result = service.parse_structured_reply(body)

        assert result is None

    def test_parse_invalid_status(self):
        """Test that invalid status values are ignored."""
        service = EmailService()

        body = "STATUS: invalid_status | COMMENT: Test"
        result = service.parse_structured_reply(body)

        assert result is not None
        assert "status" not in result
        assert result["comment"] == "Test"

    def test_parse_negative_time_ignored(self):
        """Test that negative time values are ignored."""
        service = EmailService()

        body = "TIME: -5"
        result = service.parse_structured_reply(body)

        assert result is None



class TestEmailBodyExtraction:
    """Tests for email body extraction."""

    def test_extract_plain_text_body(self):
        """Test extracting plain text body."""
        service = EmailService()

        msg = MIMEText("This is the email body", "plain")
        body = service._get_email_body(msg)

        assert body == "This is the email body"

    def test_extract_multipart_body(self):
        """Test extracting body from multipart message."""
        service = EmailService()

        msg = MIMEMultipart()
        msg.attach(MIMEText("Plain text body", "plain"))
        msg.attach(MIMEText("<html>HTML body</html>", "html"))

        body = service._get_email_body(msg)

        assert body == "Plain text body"

    def test_extract_body_with_whitespace(self):
        """Test that body whitespace is stripped."""
        service = EmailService()

        msg = MIMEText("  Body with whitespace  \n\n", "plain")
        body = service._get_email_body(msg)

        assert body == "Body with whitespace"


class TestSendWorkInstruction:
    """Tests for sending work instruction emails."""

    @pytest.mark.asyncio
    async def test_send_work_instruction_success(self):
        """Test successful work instruction email sending."""
        service = EmailService()

        workitem = {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "title": "Test Task",
            "description": "Task description",
            "status": "active",
            "priority": 1,
        }

        with patch.object(service, "_send_email", new_callable=AsyncMock) as mock_send:
            result = await service.send_work_instruction(
                workitem=workitem,
                recipients=["user@example.com"],
            )

            assert result["success"] is True
            assert result["message_id"] is not None
            assert result["thread_id"] == "thread-550e8400-e29b-41d4-a716-446655440000"
            assert "user@example.com" in result["recipients"]
            mock_send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_work_instruction_no_recipients(self):
        """Test sending with no recipients raises error."""
        service = EmailService()

        workitem = {"id": "test-id", "title": "Test"}

        with pytest.raises(ValueError, match="At least one recipient"):
            await service.send_work_instruction(workitem=workitem, recipients=[])

    @pytest.mark.asyncio
    async def test_send_work_instruction_invalid_recipients(self):
        """Test sending with all invalid recipients raises error."""
        service = EmailService()

        workitem = {"id": "test-id", "title": "Test"}

        with pytest.raises(ValueError, match="No valid recipients"):
            await service.send_work_instruction(
                workitem=workitem,
                recipients=["invalid", "also-invalid"],
            )

    @pytest.mark.asyncio
    async def test_send_work_instruction_mixed_recipients(self):
        """Test sending with mixed valid/invalid recipients."""
        service = EmailService()

        workitem = {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "title": "Test Task",
        }

        with patch.object(service, "_send_email", new_callable=AsyncMock):
            result = await service.send_work_instruction(
                workitem=workitem,
                recipients=["valid@example.com", "invalid"],
            )

            assert result["success"] is True
            assert "valid@example.com" in result["recipients"]
            assert "invalid" in result["invalid_recipients"]



class TestProcessIncomingEmail:
    """Tests for processing incoming emails."""

    def _create_raw_email(
        self,
        subject: str,
        body: str,
        sender: str = "user@example.com",
    ) -> bytes:
        """Helper to create raw email bytes."""
        msg = MIMEText(body, "plain")
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = "support@rxdx.local"
        return msg.as_bytes()

    @pytest.mark.asyncio
    async def test_process_valid_structured_email(self):
        """Test processing a valid structured email reply."""
        service = EmailService()

        raw_email = self._create_raw_email(
            subject="Re: [WorkItem-550e8400-e29b-41d4-a716-446655440000] Task",
            body="STATUS: completed | COMMENT: Done | TIME: 2",
        )

        with patch.object(service, "send_parsing_error", new_callable=AsyncMock):
            result = await service.process_incoming_email(raw_email)

        assert result["success"] is True
        assert result["workitem_id"] == "550e8400-e29b-41d4-a716-446655440000"
        assert result["parsed_data"]["status"] == "completed"
        assert result["parse_method"] == "structured"

    @pytest.mark.asyncio
    async def test_process_email_no_workitem_id(self):
        """Test processing email without WorkItem ID."""
        service = EmailService()

        raw_email = self._create_raw_email(
            subject="Regular email subject",
            body="Some content",
        )

        with patch.object(
            service, "send_parsing_error", new_callable=AsyncMock
        ) as mock_error:
            result = await service.process_incoming_email(raw_email)

        assert result["success"] is False
        assert result["workitem_id"] is None
        assert "Could not identify WorkItem" in result["error"]
        mock_error.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_email_empty_body(self):
        """Test processing email with empty body."""
        service = EmailService()

        raw_email = self._create_raw_email(
            subject="Re: [WorkItem-550e8400-e29b-41d4-a716-446655440000] Task",
            body="",
        )

        result = await service.process_incoming_email(raw_email)

        assert result["success"] is False
        assert result["workitem_id"] == "550e8400-e29b-41d4-a716-446655440000"
        assert "empty" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_process_email_unparseable_body(self):
        """Test processing email with unparseable body."""
        service = EmailService()

        raw_email = self._create_raw_email(
            subject="Re: [WorkItem-550e8400-e29b-41d4-a716-446655440000] Task",
            body="Just some random text without any structure",
        )

        with patch.object(
            service, "send_parsing_error", new_callable=AsyncMock
        ) as mock_error:
            result = await service.process_incoming_email(raw_email)

        assert result["success"] is False
        assert "Could not parse" in result["error"]
        mock_error.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_email_with_llm_fallback(self):
        """Test processing email with LLM fallback."""
        mock_llm = MagicMock()
        mock_llm.extract_work_instruction = AsyncMock(
            return_value={"status": "active", "comment": "LLM parsed"}
        )

        service = EmailService(llm_service=mock_llm)

        raw_email = self._create_raw_email(
            subject="Re: [WorkItem-550e8400-e29b-41d4-a716-446655440000] Task",
            body="I finished working on this task today",
        )

        result = await service.process_incoming_email(raw_email)

        assert result["success"] is True
        assert result["parse_method"] == "llm"
        assert result["parsed_data"]["status"] == "active"


class TestSendParsingError:
    """Tests for sending parsing error notifications."""

    @pytest.mark.asyncio
    async def test_send_parsing_error_success(self):
        """Test successful parsing error notification."""
        service = EmailService()

        with patch.object(service, "_send_email", new_callable=AsyncMock):
            result = await service.send_parsing_error(
                recipient="user@example.com",
                original_subject="Test Subject",
                error_message="Could not parse email",
            )

        assert result is True

    @pytest.mark.asyncio
    async def test_send_parsing_error_invalid_recipient(self):
        """Test parsing error with invalid recipient."""
        service = EmailService()

        result = await service.send_parsing_error(
            recipient="invalid-email",
            original_subject="Test Subject",
            error_message="Error",
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_send_parsing_error_with_workitem_id(self):
        """Test parsing error includes WorkItem ID when provided."""
        service = EmailService()

        with patch.object(service, "_send_email", new_callable=AsyncMock) as mock_send:
            await service.send_parsing_error(
                recipient="user@example.com",
                original_subject="Test Subject",
                error_message="Error",
                workitem_id="test-workitem-id",
            )

            # Verify the email body contains the WorkItem ID
            call_args = mock_send.call_args
            message = call_args[0][0]
            body = message.get_payload()[0].get_payload()
            assert "test-workitem-id" in body



class TestThreadHistory:
    """Tests for email thread history tracking."""

    @pytest.mark.asyncio
    async def test_thread_created_on_send(self):
        """Test that thread is created when sending work instruction."""
        service = EmailService()

        workitem = {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "title": "Test Task",
        }

        with patch.object(service, "_send_email", new_callable=AsyncMock):
            await service.send_work_instruction(
                workitem=workitem,
                recipients=["user@example.com"],
            )

        thread = service.get_thread_history("550e8400-e29b-41d4-a716-446655440000")

        assert thread is not None
        assert len(thread.emails) == 1
        assert thread.emails[0]["direction"] == "outgoing"

    @pytest.mark.asyncio
    async def test_thread_updated_on_receive(self):
        """Test that thread is updated when receiving reply."""
        service = EmailService()

        # First send a work instruction
        workitem = {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "title": "Test Task",
        }

        with patch.object(service, "_send_email", new_callable=AsyncMock):
            await service.send_work_instruction(
                workitem=workitem,
                recipients=["user@example.com"],
            )

        # Then process a reply
        msg = MIMEText("STATUS: completed", "plain")
        msg["Subject"] = "Re: [WorkItem-550e8400-e29b-41d4-a716-446655440000] Test"
        msg["From"] = "user@example.com"

        await service.process_incoming_email(msg.as_bytes())

        thread = service.get_thread_history("550e8400-e29b-41d4-a716-446655440000")

        assert thread is not None
        assert len(thread.emails) == 2
        assert thread.emails[0]["direction"] == "outgoing"
        assert thread.emails[1]["direction"] == "incoming"

    def test_get_all_threads(self):
        """Test getting all threads."""
        service = EmailService()

        # Create some threads manually
        service._threads["thread-1"] = EmailThread("thread-1", "wi-1", "Subject 1")
        service._threads["thread-2"] = EmailThread("thread-2", "wi-2", "Subject 2")

        threads = service.get_all_threads()

        assert len(threads) == 2


class TestKnowledgeExtraction:
    """Tests for knowledge extraction from emails."""

    @pytest.mark.asyncio
    async def test_extract_knowledge_with_llm(self):
        """Test knowledge extraction with LLM service."""
        mock_llm = MagicMock()
        mock_llm.extract_meeting_knowledge = AsyncMock(
            return_value={
                "entities": [{"name": "John", "type": "person"}],
                "decisions": [{"description": "Use Python", "owner": "John"}],
                "actions": [{"description": "Write tests", "assignee": "John"}],
                "relationships": [],
            }
        )

        service = EmailService(llm_service=mock_llm)

        result = await service.extract_knowledge_from_email(
            "Meeting notes: John decided to use Python for the project."
        )

        assert len(result["entities"]) == 1
        assert len(result["decisions"]) == 1
        assert len(result["actions"]) == 1

    @pytest.mark.asyncio
    async def test_extract_knowledge_without_llm(self):
        """Test knowledge extraction without LLM service."""
        service = EmailService(llm_service=None)

        result = await service.extract_knowledge_from_email("Some email content")

        assert result["entities"] == []
        assert result["decisions"] == []
        assert result["actions"] == []
        assert result["relationships"] == []

    @pytest.mark.asyncio
    async def test_extract_knowledge_empty_body(self):
        """Test knowledge extraction with empty body."""
        mock_llm = MagicMock()
        service = EmailService(llm_service=mock_llm)

        result = await service.extract_knowledge_from_email("")

        assert result["entities"] == []
        mock_llm.extract_meeting_knowledge.assert_not_called()

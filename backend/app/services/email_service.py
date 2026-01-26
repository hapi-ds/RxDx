"""
Email Service for Work Instructions and Knowledge Capture.

This service handles:
- Sending work instruction emails to assigned users
- Processing incoming email replies to update WorkItems
- Parsing structured and unstructured email content
- Extracting knowledge from emails using LLM
- Maintaining email thread history

Implements Requirement 5 (Email-Based Work Instructions and Knowledge Capture).
"""

import asyncio
import email
import logging
import re
from collections.abc import Callable
from datetime import UTC, datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import aiosmtplib
from aioimaplib import aioimaplib
from email_validator import EmailNotValidError, validate_email

from app.core.config import settings
from app.services.llm_service import LLMService, get_llm_service

logger = logging.getLogger(__name__)


class EmailServiceError(Exception):
    """Base exception for email service errors."""
    pass


class EmailConnectionError(EmailServiceError):
    """Raised when connection to email server fails."""
    pass


class EmailSendError(EmailServiceError):
    """Raised when sending email fails."""
    pass


class EmailParseError(EmailServiceError):
    """Raised when email parsing fails."""
    pass


class EmailThread:
    """Represents an email thread linked to a WorkItem."""

    def __init__(
        self,
        thread_id: str,
        workitem_id: str,
        subject: str,
        emails: list[dict[str, Any]] | None = None,
    ):
        self.thread_id = thread_id
        self.workitem_id = workitem_id
        self.subject = subject
        self.emails = emails or []

    def add_email(
        self,
        message_id: str,
        sender: str,
        recipients: list[str],
        body: str,
        timestamp: datetime,
        direction: str = "outgoing",
    ) -> None:
        """Add an email to the thread in chronological order."""
        email_entry = {
            "message_id": message_id,
            "sender": sender,
            "recipients": recipients,
            "body": body,
            "timestamp": timestamp.isoformat(),
            "direction": direction,
        }

        # Insert in chronological order
        insert_idx = 0
        for i, existing in enumerate(self.emails):
            existing_ts = datetime.fromisoformat(existing["timestamp"])
            if timestamp > existing_ts:
                insert_idx = i + 1

        self.emails.insert(insert_idx, email_entry)

    def to_dict(self) -> dict[str, Any]:
        """Convert thread to dictionary for storage."""
        return {
            "thread_id": self.thread_id,
            "workitem_id": self.workitem_id,
            "subject": self.subject,
            "emails": self.emails,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "EmailThread":
        """Create thread from dictionary."""
        return cls(
            thread_id=data["thread_id"],
            workitem_id=data["workitem_id"],
            subject=data["subject"],
            emails=data.get("emails", []),
        )


class EmailService:
    """
    Service for email-based work instructions and knowledge capture.

    This service provides:
    - Sending work instruction emails to assigned users
    - Processing incoming email replies
    - Parsing structured replies (STATUS, COMMENT, TIME format)
    - LLM-based parsing for unstructured content
    - Email thread history tracking

    Attributes:
        smtp_host: SMTP server hostname
        smtp_port: SMTP server port
        smtp_user: SMTP authentication username
        smtp_password: SMTP authentication password
        smtp_tls: Whether to use TLS
        email_from: Default sender email address
        email_reply_to: Reply-to email address
        llm_service: LLM service for unstructured parsing
    """

    # Pattern for extracting WorkItem ID from email subject
    WORKITEM_ID_PATTERN = re.compile(r"\[WorkItem-([a-f0-9-]{36})\]", re.IGNORECASE)

    # Patterns for structured reply parsing
    STATUS_PATTERN = re.compile(r"STATUS:\s*(\w+)", re.IGNORECASE)
    COMMENT_PATTERN = re.compile(
        r"COMMENT:\s*(.+?)(?=(?:STATUS:|TIME:|$))",
        re.IGNORECASE | re.DOTALL
    )
    TIME_PATTERN = re.compile(r"TIME:\s*(\d+(?:\.\d+)?)", re.IGNORECASE)

    def __init__(
        self,
        smtp_host: str | None = None,
        smtp_port: int | None = None,
        smtp_user: str | None = None,
        smtp_password: str | None = None,
        smtp_tls: bool | None = None,
        email_from: str | None = None,
        email_reply_to: str | None = None,
        llm_service: LLMService | None = None,
    ):
        """
        Initialize the email service.

        Args:
            smtp_host: SMTP server host (defaults to settings.SMTP_HOST)
            smtp_port: SMTP server port (defaults to settings.SMTP_PORT)
            smtp_user: SMTP username (defaults to settings.SMTP_USER)
            smtp_password: SMTP password (defaults to settings.SMTP_PASSWORD)
            smtp_tls: Use TLS (defaults to settings.SMTP_TLS)
            email_from: From address (defaults to settings.EMAIL_FROM)
            email_reply_to: Reply-to address (defaults to settings.EMAIL_REPLY_TO)
            llm_service: LLM service for unstructured parsing
        """
        self.smtp_host = smtp_host or settings.SMTP_HOST
        self.smtp_port = smtp_port or settings.SMTP_PORT
        self.smtp_user = smtp_user or settings.SMTP_USER
        self.smtp_password = smtp_password or settings.SMTP_PASSWORD
        self.smtp_tls = smtp_tls if smtp_tls is not None else settings.SMTP_TLS
        self.email_from = email_from or settings.EMAIL_FROM
        self.email_reply_to = email_reply_to or settings.EMAIL_REPLY_TO
        self.llm_service = llm_service

        # In-memory thread storage (would be replaced with DB in production)
        self._threads: dict[str, EmailThread] = {}

        # IMAP configuration for incoming emails
        self.imap_host = settings.IMAP_HOST
        self.imap_port = settings.IMAP_PORT
        self.imap_user = settings.IMAP_USER
        self.imap_password = settings.IMAP_PASSWORD
        self.imap_tls = settings.IMAP_TLS
        self.imap_mailbox = settings.IMAP_MAILBOX
        self.poll_interval = settings.EMAIL_POLL_INTERVAL_SECONDS

        # Background polling state
        self._polling_task: asyncio.Task | None = None
        self._polling_active = False
        self._email_callback: Callable | None = None


    def _validate_email(self, email_address: str) -> bool:
        """
        Validate an email address.

        Args:
            email_address: Email address to validate

        Returns:
            True if valid, False otherwise
        """
        try:
            validate_email(email_address, check_deliverability=False)
            return True
        except EmailNotValidError:
            return False

    def _generate_message_id(self) -> str:
        """Generate a unique message ID for email tracking."""
        import uuid
        domain = self.email_from.split("@")[-1] if "@" in self.email_from else "rxdx.local"
        return f"<{uuid.uuid4()}@{domain}>"

    async def send_work_instruction(
        self,
        workitem: dict[str, Any],
        recipients: list[str],
    ) -> dict[str, Any]:
        """
        Send a work instruction email for a WorkItem.

        Creates and sends an email containing work instruction details
        to the specified recipients. The email subject includes the
        WorkItem ID for tracking replies.

        Args:
            workitem: WorkItem data dictionary containing:
                - id: WorkItem UUID
                - title: WorkItem title
                - description: WorkItem description
                - status: Current status
                - priority: Priority level (optional)
                - assigned_to: Assigned user (optional)
            recipients: List of recipient email addresses

        Returns:
            Dictionary with send result:
                - success: Whether email was sent
                - message_id: Unique message identifier
                - thread_id: Email thread identifier
                - errors: List of any errors

        Raises:
            EmailSendError: If email sending fails
            ValueError: If no valid recipients provided
        """
        if not recipients:
            raise ValueError("At least one recipient is required")

        # Validate recipients
        valid_recipients = []
        invalid_recipients = []

        for recipient in recipients:
            if self._validate_email(recipient):
                valid_recipients.append(recipient)
            else:
                invalid_recipients.append(recipient)

        if not valid_recipients:
            raise ValueError(f"No valid recipients. Invalid: {invalid_recipients}")

        # Extract WorkItem details
        workitem_id = str(workitem.get("id", ""))
        title = workitem.get("title", "Work Instruction")
        description = workitem.get("description", "No description provided")
        status = workitem.get("status", "draft")
        priority = workitem.get("priority", "N/A")

        # Create email subject with WorkItem ID for tracking
        subject = f"[WorkItem-{workitem_id}] {title}"

        # Create email body
        body = self._create_work_instruction_body(
            title=title,
            description=description,
            status=status,
            priority=priority,
            workitem_id=workitem_id,
        )

        # Create message
        message = MIMEMultipart()
        message["Subject"] = subject
        message["From"] = self.email_from
        message["To"] = ", ".join(valid_recipients)
        message["Reply-To"] = self.email_reply_to

        message_id = self._generate_message_id()
        message["Message-ID"] = message_id

        message.attach(MIMEText(body, "plain"))

        # Send email
        try:
            await self._send_email(message)

            # Track in thread history
            thread_id = f"thread-{workitem_id}"
            thread = self._get_or_create_thread(thread_id, workitem_id, subject)
            thread.add_email(
                message_id=message_id,
                sender=self.email_from,
                recipients=valid_recipients,
                body=body,
                timestamp=datetime.now(UTC),
                direction="outgoing",
            )

            logger.info(f"Sent work instruction email for WorkItem {workitem_id}")

            return {
                "success": True,
                "message_id": message_id,
                "thread_id": thread_id,
                "recipients": valid_recipients,
                "invalid_recipients": invalid_recipients,
                "errors": [],
            }

        except Exception as e:
            logger.error(f"Failed to send work instruction email: {e}")
            raise EmailSendError(f"Failed to send email: {e}")


    def _create_work_instruction_body(
        self,
        title: str,
        description: str,
        status: str,
        priority: Any,
        workitem_id: str,
    ) -> str:
        """Create the email body for a work instruction."""
        return f"""Work Instruction: {title}

Description:
{description}

Status: {status}
Priority: {priority}

---
Reply to this email to update the work item.

Structured Format (recommended):
STATUS: <status> | COMMENT: <your comment> | TIME: <hours>

Example:
STATUS: completed | COMMENT: Task finished successfully | TIME: 2.5

Or simply reply with your update in natural language.

WorkItem ID: {workitem_id}
"""

    async def _send_email(self, message: MIMEMultipart) -> None:
        """
        Send an email using SMTP.

        Args:
            message: Email message to send

        Raises:
            EmailConnectionError: If connection fails
            EmailSendError: If sending fails
        """
        try:
            if self.smtp_tls:
                smtp = aiosmtplib.SMTP(
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    use_tls=True,
                )
            else:
                smtp = aiosmtplib.SMTP(
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                )

            async with smtp:
                if self.smtp_user and self.smtp_password:
                    await smtp.login(self.smtp_user, self.smtp_password)
                await smtp.send_message(message)

        except aiosmtplib.SMTPConnectError as e:
            logger.error(f"SMTP connection error: {e}")
            raise EmailConnectionError(f"Failed to connect to SMTP server: {e}")
        except aiosmtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication error: {e}")
            raise EmailConnectionError(f"SMTP authentication failed: {e}")
        except Exception as e:
            logger.error(f"SMTP send error: {e}")
            raise EmailSendError(f"Failed to send email: {e}")


    async def process_incoming_email(
        self,
        raw_email: bytes,
    ) -> dict[str, Any]:
        """
        Process an incoming email reply.

        Extracts the WorkItem ID from the subject, parses the email body
        for updates, and returns structured data for updating the WorkItem.

        Args:
            raw_email: Raw email bytes

        Returns:
            Dictionary with parsed data:
                - workitem_id: Extracted WorkItem UUID
                - parsed_data: Extracted updates (status, comment, time_spent)
                - sender: Email sender address
                - subject: Email subject
                - parse_method: "structured" or "llm"
                - success: Whether parsing succeeded
                - error: Error message if parsing failed

        Raises:
            EmailParseError: If email cannot be parsed at all
        """
        try:
            # Parse raw email
            msg = email.message_from_bytes(raw_email)

            subject = msg.get("Subject", "")
            sender = msg.get("From", "")
            message_id = msg.get("Message-ID", self._generate_message_id())

            # Extract WorkItem ID from subject
            workitem_id = self._extract_workitem_id(subject)

            if not workitem_id:
                error_msg = "Could not identify WorkItem from email subject"
                logger.warning(f"{error_msg}: {subject}")

                # Send parsing error notification
                if sender and self._validate_email(sender):
                    await self.send_parsing_error(
                        recipient=sender,
                        original_subject=subject,
                        error_message=error_msg,
                    )

                return {
                    "success": False,
                    "workitem_id": None,
                    "parsed_data": None,
                    "sender": sender,
                    "subject": subject,
                    "error": error_msg,
                }

            # Get email body
            body = self._get_email_body(msg)

            if not body:
                error_msg = "Email body is empty"
                logger.warning(f"{error_msg} for WorkItem {workitem_id}")

                return {
                    "success": False,
                    "workitem_id": workitem_id,
                    "parsed_data": None,
                    "sender": sender,
                    "subject": subject,
                    "error": error_msg,
                }

            # Try structured parsing first
            parsed_data = self.parse_structured_reply(body)
            parse_method = "structured"

            # If structured parsing fails, try LLM
            if not parsed_data and self.llm_service:
                parsed_data = await self._parse_with_llm(body)
                parse_method = "llm" if parsed_data else None

            if not parsed_data:
                error_msg = "Could not parse email content"
                logger.warning(f"{error_msg} for WorkItem {workitem_id}")

                # Send parsing error notification
                if sender and self._validate_email(sender):
                    await self.send_parsing_error(
                        recipient=sender,
                        original_subject=subject,
                        error_message=error_msg,
                        workitem_id=workitem_id,
                    )

                return {
                    "success": False,
                    "workitem_id": workitem_id,
                    "parsed_data": None,
                    "sender": sender,
                    "subject": subject,
                    "error": error_msg,
                }

            # Track in thread history
            thread_id = f"thread-{workitem_id}"
            thread = self._get_or_create_thread(thread_id, workitem_id, subject)
            thread.add_email(
                message_id=message_id,
                sender=sender,
                recipients=[self.email_reply_to],
                body=body,
                timestamp=datetime.now(UTC),
                direction="incoming",
            )

            logger.info(
                f"Successfully parsed email for WorkItem {workitem_id} "
                f"using {parse_method} method"
            )

            return {
                "success": True,
                "workitem_id": workitem_id,
                "parsed_data": parsed_data,
                "sender": sender,
                "subject": subject,
                "parse_method": parse_method,
                "error": None,
            }

        except Exception as e:
            logger.error(f"Failed to process incoming email: {e}")
            raise EmailParseError(f"Failed to process email: {e}")


    def _extract_workitem_id(self, subject: str) -> str | None:
        """
        Extract WorkItem ID from email subject.

        Args:
            subject: Email subject line

        Returns:
            WorkItem ID string if found, None otherwise
        """
        match = self.WORKITEM_ID_PATTERN.search(subject)
        if match:
            return match.group(1)
        return None

    def _get_email_body(self, msg: email.message.Message) -> str:
        """
        Extract the text body from an email message.

        Handles multipart messages and various content types.

        Args:
            msg: Parsed email message

        Returns:
            Email body text
        """
        body = ""

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))

                # Skip attachments
                if "attachment" in content_disposition:
                    continue

                # Get text content
                if content_type == "text/plain":
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            charset = part.get_content_charset() or "utf-8"
                            body = payload.decode(charset, errors="replace")
                            break
                    except Exception as e:
                        logger.warning(f"Failed to decode email part: {e}")
                        continue
        else:
            try:
                payload = msg.get_payload(decode=True)
                if payload:
                    charset = msg.get_content_charset() or "utf-8"
                    body = payload.decode(charset, errors="replace")
            except Exception as e:
                logger.warning(f"Failed to decode email body: {e}")
                body = str(msg.get_payload())

        return body.strip()


    def parse_structured_reply(self, body: str) -> dict[str, Any] | None:
        """
        Parse a structured email reply.

        Extracts data from the structured format:
        STATUS: <status> | COMMENT: <comment> | TIME: <hours>

        The format is flexible - fields can appear in any order and
        are separated by pipes (|) or newlines.

        Args:
            body: Email body text

        Returns:
            Dictionary with extracted fields:
                - status: Task status (draft/active/completed)
                - comment: User comment
                - time_spent: Hours worked (float)
            Returns None if no structured data found.
        """
        if not body:
            return None

        result = {}

        # Extract status
        status_match = self.STATUS_PATTERN.search(body)
        if status_match:
            status = status_match.group(1).lower().strip()
            # Validate status value
            valid_statuses = {"draft", "active", "completed", "archived", "in_progress"}
            if status in valid_statuses:
                result["status"] = status
            elif status in {"done", "finished", "complete"}:
                result["status"] = "completed"
            elif status in {"started", "working", "ongoing"}:
                result["status"] = "active"

        # Extract comment
        comment_match = self.COMMENT_PATTERN.search(body)
        if comment_match:
            comment = comment_match.group(1).strip()
            # Clean up the comment - remove pipe separators
            comment = re.sub(r"\s*\|\s*$", "", comment)
            if comment:
                result["comment"] = comment

        # Extract time
        time_match = self.TIME_PATTERN.search(body)
        if time_match:
            try:
                time_spent = float(time_match.group(1))
                if time_spent >= 0:
                    result["time_spent"] = time_spent
            except ValueError:
                pass

        return result if result else None

    async def _parse_with_llm(self, body: str) -> dict[str, Any] | None:
        """
        Parse email body using LLM for unstructured content.

        Args:
            body: Email body text

        Returns:
            Dictionary with extracted fields or None
        """
        if not self.llm_service:
            return None

        try:
            result = await self.llm_service.extract_work_instruction(body)
            return result
        except Exception as e:
            logger.warning(f"LLM parsing failed: {e}")
            return None


    async def send_parsing_error(
        self,
        recipient: str,
        original_subject: str,
        error_message: str,
        workitem_id: str | None = None,
    ) -> bool:
        """
        Send a parsing error notification to the email sender.

        Notifies the user that their email could not be parsed and
        provides guidance on the expected format.

        Args:
            recipient: Email address to send notification to
            original_subject: Subject of the original email
            error_message: Specific error message
            workitem_id: WorkItem ID if identified

        Returns:
            True if notification sent successfully, False otherwise
        """
        if not self._validate_email(recipient):
            logger.warning(f"Invalid recipient for parsing error: {recipient}")
            return False

        subject = f"Re: {original_subject} - Parsing Error"

        body = f"""Your email could not be processed.

Error: {error_message}

"""
        if workitem_id:
            body += f"WorkItem ID: {workitem_id}\n\n"

        body += """To update a work item via email, please use one of these formats:

1. Structured Format (recommended):
   STATUS: completed | COMMENT: Your update here | TIME: 2.5

2. Natural Language:
   Simply describe your update in plain text. Our system will attempt
   to extract the relevant information.

Valid status values: draft, active, completed, archived

If you continue to experience issues, please contact support.
"""

        message = MIMEMultipart()
        message["Subject"] = subject
        message["From"] = self.email_from
        message["To"] = recipient
        message["Message-ID"] = self._generate_message_id()

        message.attach(MIMEText(body, "plain"))

        try:
            await self._send_email(message)
            logger.info(f"Sent parsing error notification to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send parsing error notification: {e}")
            return False


    def _get_or_create_thread(
        self,
        thread_id: str,
        workitem_id: str,
        subject: str,
    ) -> EmailThread:
        """
        Get or create an email thread.

        Args:
            thread_id: Thread identifier
            workitem_id: Associated WorkItem ID
            subject: Email subject

        Returns:
            EmailThread instance
        """
        if thread_id not in self._threads:
            self._threads[thread_id] = EmailThread(
                thread_id=thread_id,
                workitem_id=workitem_id,
                subject=subject,
            )
        return self._threads[thread_id]

    def get_thread_history(self, workitem_id: str) -> EmailThread | None:
        """
        Get email thread history for a WorkItem.

        Args:
            workitem_id: WorkItem ID

        Returns:
            EmailThread if found, None otherwise
        """
        thread_id = f"thread-{workitem_id}"
        return self._threads.get(thread_id)

    def get_all_threads(self) -> list[EmailThread]:
        """
        Get all email threads.

        Returns:
            List of all EmailThread instances
        """
        return list(self._threads.values())

    async def extract_knowledge_from_email(
        self,
        email_body: str,
    ) -> dict[str, Any]:
        """
        Extract knowledge from email content using LLM.

        Analyzes email content to extract entities, decisions,
        action items, and relationships for storage in the Graph DB.

        Args:
            email_body: Email body text

        Returns:
            Dictionary with extracted knowledge:
                - entities: List of extracted entities
                - decisions: List of decisions
                - actions: List of action items
                - relationships: List of relationships
        """
        empty_result = {
            "entities": [],
            "decisions": [],
            "actions": [],
            "relationships": [],
        }

        if not self.llm_service:
            logger.debug("LLM service not available for knowledge extraction")
            return empty_result

        if not email_body or not email_body.strip():
            return empty_result

        try:
            result = await self.llm_service.extract_meeting_knowledge(email_body)
            return result
        except Exception as e:
            logger.error(f"Knowledge extraction failed: {e}")
            return empty_result

    async def connect_imap(self) -> aioimaplib.IMAP4_SSL:
        """
        Connect to IMAP server.

        Returns:
            Connected IMAP client

        Raises:
            EmailConnectionError: If connection fails
        """
        try:
            if self.imap_tls:
                imap_client = aioimaplib.IMAP4_SSL(
                    host=self.imap_host,
                    port=self.imap_port,
                )
            else:
                imap_client = aioimaplib.IMAP4(
                    host=self.imap_host,
                    port=self.imap_port,
                )

            await imap_client.wait_hello_from_server()

            if self.imap_user and self.imap_password:
                await imap_client.login(self.imap_user, self.imap_password)

            return imap_client

        except Exception as e:
            logger.error(f"IMAP connection error: {e}")
            raise EmailConnectionError(f"Failed to connect to IMAP server: {e}")

    async def fetch_new_emails(self) -> list[bytes]:
        """
        Fetch new (unseen) emails from the IMAP server.

        Returns:
            List of raw email bytes
        """
        emails = []

        try:
            imap_client = await self.connect_imap()

            try:
                # Select mailbox
                await imap_client.select(self.imap_mailbox)

                # Search for unseen emails
                response = await imap_client.search("UNSEEN")

                if response.result != "OK":
                    logger.warning(f"IMAP search failed: {response}")
                    return emails

                # Parse message IDs
                message_ids = response.lines[0].decode().split()

                for msg_id in message_ids:
                    if not msg_id:
                        continue

                    # Fetch email
                    fetch_response = await imap_client.fetch(msg_id, "(RFC822)")

                    if fetch_response.result == "OK":
                        # Extract raw email from response
                        for line in fetch_response.lines:
                            if isinstance(line, bytes) and b"From:" in line:
                                emails.append(line)
                                break
                        else:
                            # Try to get the email body from lines
                            for i, line in enumerate(fetch_response.lines):
                                if isinstance(line, bytes) and len(line) > 100:
                                    emails.append(line)
                                    break

                        # Mark as seen
                        await imap_client.store(msg_id, "+FLAGS", "\\Seen")

            finally:
                await imap_client.logout()

        except EmailConnectionError:
            raise
        except Exception as e:
            logger.error(f"Failed to fetch emails: {e}")

        return emails

    async def start_polling(
        self,
        callback: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        """
        Start background email polling.

        Args:
            callback: Optional callback function to call when email is processed.
                     Receives the parsed email result dictionary.
        """
        if self._polling_active:
            logger.warning("Email polling is already active")
            return

        self._polling_active = True
        self._email_callback = callback
        self._polling_task = asyncio.create_task(self._poll_emails())
        logger.info(f"Started email polling with {self.poll_interval}s interval")

    async def stop_polling(self) -> None:
        """Stop background email polling."""
        self._polling_active = False

        if self._polling_task:
            self._polling_task.cancel()
            try:
                await self._polling_task
            except asyncio.CancelledError:
                pass
            self._polling_task = None

        logger.info("Stopped email polling")

    async def _poll_emails(self) -> None:
        """Background task for polling emails."""
        while self._polling_active:
            try:
                # Fetch new emails
                raw_emails = await self.fetch_new_emails()

                # Process each email
                for raw_email in raw_emails:
                    try:
                        result = await self.process_incoming_email(raw_email)

                        # Call callback if provided
                        if self._email_callback and result.get("success"):
                            try:
                                if asyncio.iscoroutinefunction(self._email_callback):
                                    await self._email_callback(result)
                                else:
                                    self._email_callback(result)
                            except Exception as e:
                                logger.error(f"Email callback error: {e}")

                    except EmailParseError as e:
                        logger.error(f"Failed to process email: {e}")

            except EmailConnectionError as e:
                logger.error(f"Email polling connection error: {e}")
            except Exception as e:
                logger.error(f"Email polling error: {e}")

            # Wait before next poll
            await asyncio.sleep(self.poll_interval)

    @property
    def is_polling(self) -> bool:
        """Check if email polling is active."""
        return self._polling_active



# Dependency injection helpers
_email_service_instance: EmailService | None = None


async def get_email_service() -> EmailService:
    """
    Get or create the email service instance.

    Returns:
        EmailService instance with LLM service integration
    """
    global _email_service_instance
    if _email_service_instance is None:
        llm_service = await get_llm_service()
        _email_service_instance = EmailService(llm_service=llm_service)
    return _email_service_instance


def reset_email_service() -> None:
    """Reset the email service instance (useful for testing)."""
    global _email_service_instance
    _email_service_instance = None

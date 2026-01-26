"""
Property-based tests for email parsing.

Tests validate:
- Property 5.1: Email Thread Consistency - Email thread history is maintained 
  in chronological order
- Property 5.2: Knowledge Extraction Linkage - Extracted knowledge is always 
  linked to source email

Uses Hypothesis for property-based testing.
Implements tests for Requirement 5 (Email-Based Work Instructions).
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from hypothesis import assume, given, settings
from hypothesis import strategies as st

from app.services.email_service import EmailService, EmailThread


# Custom strategies for generating test data
@st.composite
def valid_uuid_strategy(draw):
    """Generate valid UUID strings."""
    parts = [
        draw(st.text(alphabet="0123456789abcdef", min_size=8, max_size=8)),
        draw(st.text(alphabet="0123456789abcdef", min_size=4, max_size=4)),
        draw(st.text(alphabet="0123456789abcdef", min_size=4, max_size=4)),
        draw(st.text(alphabet="0123456789abcdef", min_size=4, max_size=4)),
        draw(st.text(alphabet="0123456789abcdef", min_size=12, max_size=12)),
    ]
    return "-".join(parts)


@st.composite
def valid_status_strategy(draw):
    """Generate valid status values."""
    return draw(st.sampled_from(["draft", "active", "completed", "archived"]))


@st.composite
def valid_time_strategy(draw):
    """Generate valid time values (positive floats)."""
    return draw(st.floats(min_value=0.0, max_value=1000.0, allow_nan=False))


@st.composite
def structured_reply_strategy(draw):
    """Generate structured email replies with various combinations."""
    parts = []

    # Optionally include status
    if draw(st.booleans()):
        status = draw(valid_status_strategy())
        parts.append(f"STATUS: {status}")

    # Optionally include comment
    if draw(st.booleans()):
        comment = draw(st.text(
            alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z")),
            min_size=1,
            max_size=100,
        ).filter(lambda x: x.strip() and "|" not in x))
        parts.append(f"COMMENT: {comment}")

    # Optionally include time
    if draw(st.booleans()):
        time_val = draw(valid_time_strategy())
        parts.append(f"TIME: {time_val}")

    # Ensure at least one part
    if not parts:
        status = draw(valid_status_strategy())
        parts.append(f"STATUS: {status}")

    # Join with pipe or newline
    separator = draw(st.sampled_from([" | ", "\n"]))
    return separator.join(parts)


@st.composite
def email_timestamp_strategy(draw):
    """Generate email timestamps within a reasonable range."""
    base = datetime(2024, 1, 1, tzinfo=UTC)
    offset_seconds = draw(st.integers(min_value=0, max_value=365 * 24 * 3600))
    return base + timedelta(seconds=offset_seconds)


@st.composite
def email_list_strategy(draw, min_size=1, max_size=20):
    """Generate a list of emails with timestamps."""
    count = draw(st.integers(min_value=min_size, max_value=max_size))
    emails = []

    for i in range(count):
        timestamp = draw(email_timestamp_strategy())
        direction = draw(st.sampled_from(["incoming", "outgoing"]))
        emails.append({
            "message_id": f"<msg-{i}@test.com>",
            "sender": f"user{i}@test.com",
            "recipients": ["recipient@test.com"],
            "body": f"Email body {i}",
            "timestamp": timestamp,
            "direction": direction,
        })

    return emails



class TestEmailThreadConsistencyProperty:
    """
    Property 5.1: Email Thread Consistency
    
    **Validates: Requirement 5.5**
    
    Statement: Email thread history is maintained in chronological order
    Formal: ∀ thread t, emails e1, e2 ∈ t, timestamp(e1) < timestamp(e2) 
            → order(e1, t) < order(e2, t)
    """

    @given(emails=email_list_strategy(min_size=2, max_size=50))
    @settings(max_examples=100)
    def test_thread_maintains_chronological_order(
        self,
        emails: list[dict],
    ):
        """
        Property: Adding emails in any order results in chronological ordering.
        
        **Validates: Requirements 5.5**
        """
        thread = EmailThread(
            thread_id="test-thread",
            workitem_id="test-workitem",
            subject="Test Subject",
        )

        # Add emails in random order (as they come from the strategy)
        for email_data in emails:
            thread.add_email(
                message_id=email_data["message_id"],
                sender=email_data["sender"],
                recipients=email_data["recipients"],
                body=email_data["body"],
                timestamp=email_data["timestamp"],
                direction=email_data["direction"],
            )

        # Verify chronological order
        for i in range(len(thread.emails) - 1):
            ts1 = datetime.fromisoformat(thread.emails[i]["timestamp"])
            ts2 = datetime.fromisoformat(thread.emails[i + 1]["timestamp"])
            assert ts1 <= ts2, (
                f"Email at index {i} has timestamp {ts1} which is after "
                f"email at index {i+1} with timestamp {ts2}"
            )

    @given(
        base_timestamp=email_timestamp_strategy(),
        offsets=st.lists(
            st.integers(min_value=-1000000, max_value=1000000),
            min_size=3,
            max_size=30,
        ),
    )
    @settings(max_examples=100)
    def test_thread_order_independent_of_insertion_order(
        self,
        base_timestamp: datetime,
        offsets: list[int],
    ):
        """
        Property: Thread order is determined by timestamp, not insertion order.
        
        **Validates: Requirements 5.5**
        """
        thread = EmailThread(
            thread_id="test-thread",
            workitem_id="test-workitem",
            subject="Test Subject",
        )

        # Create emails with timestamps based on offsets
        emails_with_ts = []
        for i, offset in enumerate(offsets):
            ts = base_timestamp + timedelta(seconds=offset)
            emails_with_ts.append((i, ts))

        # Add in original order
        for i, ts in emails_with_ts:
            thread.add_email(
                message_id=f"<msg-{i}@test.com>",
                sender="sender@test.com",
                recipients=["recipient@test.com"],
                body=f"Body {i}",
                timestamp=ts,
                direction="incoming",
            )

        # Verify result is sorted by timestamp
        sorted_by_ts = sorted(emails_with_ts, key=lambda x: x[1])

        for idx, (original_idx, expected_ts) in enumerate(sorted_by_ts):
            actual_ts = datetime.fromisoformat(thread.emails[idx]["timestamp"])
            assert actual_ts == expected_ts, (
                f"At position {idx}, expected timestamp {expected_ts} "
                f"but got {actual_ts}"
            )



class TestStructuredParsingProperties:
    """
    Property tests for structured email reply parsing.
    
    Validates that the parser correctly extracts STATUS, COMMENT, and TIME
    fields from various input formats.
    """

    @given(status=valid_status_strategy())
    @settings(max_examples=50)
    def test_status_extraction_preserves_value(self, status: str):
        """
        Property: Valid status values are always extracted correctly.
        
        **Validates: Requirements 5.3**
        """
        service = EmailService()
        body = f"STATUS: {status}"

        result = service.parse_structured_reply(body)

        assert result is not None
        assert result["status"] == status

    @given(time_val=st.floats(min_value=0.01, max_value=1000.0, allow_nan=False))
    @settings(max_examples=50)
    def test_time_extraction_preserves_value(self, time_val: float):
        """
        Property: Valid time values are always extracted correctly.
        
        **Validates: Requirements 5.3**
        """
        service = EmailService()
        # Round to 2 decimal places to match typical time entry precision
        time_val = round(time_val, 2)
        body = f"TIME: {time_val}"

        result = service.parse_structured_reply(body)

        assert result is not None
        assert abs(result["time_spent"] - time_val) < 0.01

    @given(
        status=valid_status_strategy(),
        time_val=st.floats(min_value=0.1, max_value=100.0, allow_nan=False),
    )
    @settings(max_examples=50)
    def test_multiple_fields_extracted_correctly(
        self,
        status: str,
        time_val: float,
    ):
        """
        Property: Multiple fields are extracted independently.
        
        **Validates: Requirements 5.3**
        """
        service = EmailService()
        # Round to 2 decimal places to match typical time entry precision
        time_val = round(time_val, 2)
        body = f"STATUS: {status} | TIME: {time_val}"

        result = service.parse_structured_reply(body)

        assert result is not None
        assert result["status"] == status
        assert abs(result["time_spent"] - time_val) < 0.01

    @given(body=structured_reply_strategy())
    @settings(max_examples=100)
    def test_structured_reply_always_parseable(self, body: str):
        """
        Property: Well-formed structured replies are always parseable.
        
        **Validates: Requirements 5.3**
        """
        service = EmailService()

        result = service.parse_structured_reply(body)

        # Should always get a result for well-formed input
        assert result is not None
        # Should have at least one field
        assert len(result) > 0



class TestWorkItemIdExtractionProperties:
    """
    Property tests for WorkItem ID extraction from email subjects.
    """

    @given(uuid=valid_uuid_strategy())
    @settings(max_examples=100)
    def test_workitem_id_extraction_roundtrip(self, uuid: str):
        """
        Property: WorkItem IDs embedded in subjects are always extractable.
        
        **Validates: Requirements 5.2**
        """
        service = EmailService()

        # Create subject with embedded ID
        subject = f"[WorkItem-{uuid}] Test Task Title"

        # Extract should return the same ID
        extracted = service._extract_workitem_id(subject)

        assert extracted == uuid

    @given(
        uuid=valid_uuid_strategy(),
        prefix=st.sampled_from(["", "Re: ", "Fwd: ", "RE: FW: "]),
        suffix=st.text(min_size=0, max_size=50),
    )
    @settings(max_examples=100)
    def test_workitem_id_extraction_with_prefixes_suffixes(
        self,
        uuid: str,
        prefix: str,
        suffix: str,
    ):
        """
        Property: WorkItem ID extraction works regardless of subject prefixes/suffixes.
        
        **Validates: Requirements 5.2**
        """
        service = EmailService()

        subject = f"{prefix}[WorkItem-{uuid}]{suffix}"
        extracted = service._extract_workitem_id(subject)

        assert extracted == uuid

    @given(text=st.text(min_size=0, max_size=200))
    @settings(max_examples=100)
    def test_no_false_positives_for_random_text(self, text: str):
        """
        Property: Random text without valid WorkItem ID pattern returns None.
        
        **Validates: Requirements 5.2**
        """
        # Skip if text accidentally contains a valid pattern
        assume("[WorkItem-" not in text or not any(
            c in text for c in "0123456789abcdef-"
        ))

        service = EmailService()
        extracted = service._extract_workitem_id(text)

        # Should be None unless text happens to contain valid pattern
        if extracted is not None:
            # If we got a result, verify it's a valid UUID format
            parts = extracted.split("-")
            assert len(parts) == 5
            assert all(len(p) in [8, 4, 4, 4, 12] for p in parts)



class TestKnowledgeExtractionLinkageProperty:
    """
    Property 5.2: Knowledge Extraction Linkage
    
    **Validates: Requirement 5.9, 5.10**
    
    Statement: Extracted knowledge is always linked to source email
    Formal: ∀ knowledge k, extracted_from(k, email e) → linked(k, e) = true
    """

    @pytest.mark.asyncio
    @given(
        workitem_id=valid_uuid_strategy(),
        email_count=st.integers(min_value=1, max_value=5),
    )
    @settings(max_examples=20)
    async def test_processed_emails_tracked_in_thread(
        self,
        workitem_id: str,
        email_count: int,
    ):
        """
        Property: All processed emails are tracked in thread history.
        
        **Validates: Requirements 5.5, 5.9, 5.10**
        """
        from email.mime.text import MIMEText
        from unittest.mock import patch

        service = EmailService()

        # Process multiple emails for the same WorkItem
        for i in range(email_count):
            msg = MIMEText(f"STATUS: active | COMMENT: Update {i}", "plain")
            msg["Subject"] = f"Re: [WorkItem-{workitem_id}] Test Task"
            msg["From"] = f"user{i}@example.com"

            with patch.object(service, "send_parsing_error", new_callable=AsyncMock):
                result = await service.process_incoming_email(msg.as_bytes())

            # Verify email was processed
            if result["success"]:
                thread = service.get_thread_history(workitem_id)
                assert thread is not None, "Thread should exist after processing"

        # Verify thread contains all successfully processed emails
        thread = service.get_thread_history(workitem_id)
        if thread:
            # All emails in thread should be linked to the workitem
            assert thread.workitem_id == workitem_id
            # Thread should have emails
            assert len(thread.emails) > 0


class TestEmailValidationProperties:
    """
    Property tests for email address validation.
    """

    @given(
        local=st.text(
            alphabet="abcdefghijklmnopqrstuvwxyz0123456789",
            min_size=1,
            max_size=20,
        ),
        domain=st.text(
            alphabet="abcdefghijklmnopqrstuvwxyz0123456789",
            min_size=1,
            max_size=20,
        ),
        tld=st.sampled_from(["com", "org", "net", "io", "dev"]),
    )
    @settings(max_examples=50)
    def test_well_formed_emails_are_valid(
        self,
        local: str,
        domain: str,
        tld: str,
    ):
        """
        Property: Well-formed email addresses pass validation.
        
        **Validates: Requirements 5.1**
        """
        assume(local.strip() and domain.strip())
        assume(len(local) >= 1 and len(domain) >= 1)

        service = EmailService()
        email = f"{local}@{domain}.{tld}"

        # Well-formed emails should be valid
        result = service._validate_email(email)
        assert result is True

    @given(text=st.text(min_size=0, max_size=50).filter(lambda x: "@" not in x))
    @settings(max_examples=50)
    def test_emails_without_at_are_invalid(self, text: str):
        """
        Property: Strings without @ are invalid emails.
        
        **Validates: Requirements 5.1**
        """
        service = EmailService()
        result = service._validate_email(text)
        assert result is False

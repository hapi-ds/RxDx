"""Property-based tests for Worked schema time validation using Hypothesis"""

from datetime import date, datetime, time, timedelta
from uuid import uuid4

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from pydantic import ValidationError

from app.schemas.worked import WorkedBase, WorkedCreate


class TestWorkedTimeValidationProperties:
    """Property-based tests for Worked schema time validation"""

    @given(
        start_hour=st.integers(min_value=0, max_value=23),
        start_minute=st.integers(min_value=0, max_value=59),
        duration_minutes=st.integers(min_value=1, max_value=480),  # 1 min to 8 hours
    )
    @settings(max_examples=100)
    def test_end_time_after_start_time_property(
        self, start_hour, start_minute, duration_minutes
    ):
        """
        Property: Valid worked entries always have end_time > start_time
        
        **Validates: Requirement 4.9** (Time Recording - end time validation)
        
        **Formal**: ∀ worked w, end_time(w) > start_time(w)
        """
        # Create start and end times
        work_date = date(2024, 1, 15)
        start = time(hour=start_hour, minute=start_minute, second=0)
        
        # Calculate end time by adding duration
        start_dt = datetime.combine(work_date, start)
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        
        # Only test if end time is on the same day
        if end_dt.date() != work_date:
            # Skip cases where work spans multiple days
            return
        
        end = end_dt.time()
        
        # This should not raise ValidationError
        worked = WorkedCreate(
            resource=uuid4(),
            task_id=uuid4(),
            date=work_date,
            start_time=start,
            end_time=end,
        )
        
        # Verify the property holds
        assert worked.end_time is not None
        # Convert to datetime for comparison
        start_datetime = datetime.combine(worked.date, worked.start_time)
        end_datetime = datetime.combine(worked.date, worked.end_time)
        assert end_datetime > start_datetime

    @given(
        start_hour=st.integers(min_value=1, max_value=23),
        start_minute=st.integers(min_value=0, max_value=59),
        negative_duration_minutes=st.integers(min_value=1, max_value=480),
    )
    @settings(max_examples=100)
    def test_end_time_before_start_time_raises_error(
        self, start_hour, start_minute, negative_duration_minutes
    ):
        """
        Property: Worked entries with end_time <= start_time are rejected
        
        **Validates: Requirement 4.9** (Time Recording - end time validation)
        
        **Formal**: ∀ worked w, end_time(w) <= start_time(w) → ValidationError
        """
        work_date = date(2024, 1, 15)
        start = time(hour=start_hour, minute=start_minute, second=0)
        
        # Calculate end time by subtracting duration (making it before start)
        start_dt = datetime.combine(work_date, start)
        end_dt = start_dt - timedelta(minutes=negative_duration_minutes)
        
        # Only test if end time is on the same day (otherwise it wraps to previous day)
        if end_dt.date() != work_date:
            # Skip cases where subtraction goes to previous day
            return
        
        end = end_dt.time()
        
        # This should raise ValidationError
        with pytest.raises(ValidationError, match="End time must be after start time"):
            WorkedCreate(
                resource=uuid4(),
                task_id=uuid4(),
                date=work_date,
                start_time=start,
                end_time=end,
            )

    @given(
        start_hour=st.integers(min_value=0, max_value=23),
        start_minute=st.integers(min_value=0, max_value=59),
    )
    @settings(max_examples=100)
    def test_equal_start_and_end_time_raises_error(self, start_hour, start_minute):
        """
        Property: Worked entries with end_time == start_time are rejected
        
        **Validates: Requirement 4.9** (Time Recording - end time validation)
        
        **Formal**: ∀ worked w, end_time(w) == start_time(w) → ValidationError
        """
        work_date = date(2024, 1, 15)
        same_time = time(hour=start_hour, minute=start_minute, second=0)
        
        # This should raise ValidationError
        with pytest.raises(ValidationError, match="End time must be after start time"):
            WorkedCreate(
                resource=uuid4(),
                task_id=uuid4(),
                date=work_date,
                start_time=same_time,
                end_time=same_time,
            )

    @given(
        start_hour=st.integers(min_value=0, max_value=23),
        start_minute=st.integers(min_value=0, max_value=59),
    )
    @settings(max_examples=50)
    def test_none_end_time_is_valid(self, start_hour, start_minute):
        """
        Property: Worked entries with end_time=None are valid (running entries)
        
        **Validates: Requirement 4.2** (Time Recording - running entries)
        
        **Formal**: ∀ worked w, end_time(w) = None → valid(w)
        """
        work_date = date(2024, 1, 15)
        start = time(hour=start_hour, minute=start_minute, second=0)
        
        # This should not raise ValidationError
        worked = WorkedCreate(
            resource=uuid4(),
            task_id=uuid4(),
            date=work_date,
            start_time=start,
            end_time=None,
        )
        
        assert worked.end_time is None

    @given(
        start_hour=st.integers(min_value=0, max_value=23),
        duration_hours=st.floats(min_value=0.01, max_value=12.0, allow_nan=False),
    )
    @settings(max_examples=100)
    def test_datetime_objects_validation(self, start_hour, duration_hours):
        """
        Property: Validation works with datetime objects (not just time objects)
        
        **Validates: Requirement 4.9** (Time Recording - flexible time formats)
        
        **Formal**: ∀ worked w, (start_time, end_time) ∈ {time, datetime} → valid(w)
        """
        work_date = date(2024, 1, 15)
        start_dt = datetime.combine(work_date, time(hour=start_hour, minute=0))
        end_dt = start_dt + timedelta(hours=duration_hours)
        
        # This should not raise ValidationError
        worked = WorkedCreate(
            resource=uuid4(),
            task_id=uuid4(),
            date=work_date,
            start_time=start_dt,
            end_time=end_dt,
        )
        
        # Verify the property holds
        assert worked.end_time is not None

    @given(
        start_hour=st.integers(min_value=1, max_value=23),
        negative_duration_hours=st.floats(
            min_value=0.01, max_value=12.0, allow_nan=False
        ),
    )
    @settings(max_examples=100)
    def test_datetime_objects_invalid_order(
        self, start_hour, negative_duration_hours
    ):
        """
        Property: Datetime objects with end before start are rejected
        
        **Validates: Requirement 4.9** (Time Recording - datetime validation)
        
        **Formal**: ∀ worked w, end_datetime(w) <= start_datetime(w) → ValidationError
        """
        work_date = date(2024, 1, 15)
        start_dt = datetime.combine(work_date, time(hour=start_hour, minute=0))
        end_dt = start_dt - timedelta(hours=negative_duration_hours)
        
        # This should raise ValidationError
        with pytest.raises(ValidationError, match="End time must be after start time"):
            WorkedCreate(
                resource=uuid4(),
                task_id=uuid4(),
                date=work_date,
                start_time=start_dt,
                end_time=end_dt,
            )

    @given(
        start_hour=st.integers(min_value=0, max_value=22),
        duration_minutes=st.integers(min_value=1, max_value=120),
    )
    @settings(max_examples=50)
    def test_mixed_time_and_datetime_objects(self, start_hour, duration_minutes):
        """
        Property: Mixing time and datetime objects works correctly
        
        **Validates: Requirement 4.9** (Time Recording - flexible formats)
        
        **Formal**: ∀ worked w, start ∈ time ∧ end ∈ datetime → valid(w)
        """
        work_date = date(2024, 1, 15)
        start = time(hour=start_hour, minute=0)
        
        # End as datetime
        start_dt = datetime.combine(work_date, start)
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        
        # This should not raise ValidationError
        worked = WorkedCreate(
            resource=uuid4(),
            task_id=uuid4(),
            date=work_date,
            start_time=start,
            end_time=end_dt,
        )
        
        assert worked.end_time is not None

    @given(
        year=st.integers(min_value=2020, max_value=2030),
        month=st.integers(min_value=1, max_value=12),
        day=st.integers(min_value=1, max_value=28),  # Safe for all months
        start_hour=st.integers(min_value=0, max_value=23),
        start_minute=st.integers(min_value=0, max_value=59),
        duration_minutes=st.integers(min_value=1, max_value=480),
    )
    @settings(max_examples=100)
    def test_validation_across_different_dates(
        self, year, month, day, start_hour, start_minute, duration_minutes
    ):
        """
        Property: Time validation works correctly across different dates
        
        **Validates: Requirement 4.9** (Time Recording - date independence)
        
        **Formal**: ∀ date d, worked w, end_time(w) > start_time(w) → valid(w, d)
        """
        work_date = date(year, month, day)
        start = time(hour=start_hour, minute=start_minute, second=0)
        
        start_dt = datetime.combine(work_date, start)
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        
        # Only test if end time is on the same day
        if end_dt.date() != work_date:
            # Skip cases where work spans multiple days
            return
        
        end = end_dt.time()
        
        # This should not raise ValidationError
        worked = WorkedCreate(
            resource=uuid4(),
            task_id=uuid4(),
            date=work_date,
            start_time=start,
            end_time=end,
        )
        
        # Verify the property holds
        assert worked.end_time is not None
        start_datetime = datetime.combine(worked.date, worked.start_time)
        end_datetime = datetime.combine(worked.date, worked.end_time)
        assert end_datetime > start_datetime

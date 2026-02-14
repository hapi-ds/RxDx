"""Property-based tests for date priority and progress tracking utilities.

Tests Requirements 16A.22-16A.40: Date priority algorithm properties.
"""

from datetime import datetime, timedelta, UTC
from hypothesis import given, strategies as st

from app.utils.date_utils import (
    get_display_dates_for_entity,
    get_progress_indicator,
)


# Strategy for generating datetime objects (naive, then add UTC)
naive_datetime_strategy = st.datetimes(
    min_value=datetime(2020, 1, 1),
    max_value=datetime(2030, 12, 31),
)

# Map to UTC-aware datetimes
datetime_strategy = naive_datetime_strategy.map(lambda dt: dt.replace(tzinfo=UTC))


class TestDatePriorityProperties:
    """Property-based tests for date priority algorithm"""

    @given(
        manual_start=datetime_strategy,
        calculated_start=datetime_strategy,
    )
    def test_manual_start_always_overrides_calculated(
        self, manual_start: datetime, calculated_start: datetime
    ):
        """Property: Manual start_date always overrides calculated_start_date in display"""
        result = get_display_dates_for_entity(
            start_date=manual_start,
            calculated_start_date=calculated_start,
        )

        # Manual date should always be used
        assert result["start_date"] == manual_start
        assert result["is_manual_start"] is True

    @given(
        manual_due=datetime_strategy,
        calculated_end=datetime_strategy,
    )
    def test_manual_due_always_overrides_calculated(
        self, manual_due: datetime, calculated_end: datetime
    ):
        """Property: Manual due_date always overrides calculated_end_date in display"""
        result = get_display_dates_for_entity(
            due_date=manual_due,
            calculated_end_date=calculated_end,
        )

        # Manual date should always be used
        assert result["end_date"] == manual_due
        assert result["is_manual_end"] is True

    @given(
        calculated_start=datetime_strategy,
        calculated_end=datetime_strategy,
    )
    def test_calculated_dates_used_when_manual_not_set(
        self, calculated_start: datetime, calculated_end: datetime
    ):
        """Property: Calculated dates used when manual dates are not set"""
        result = get_display_dates_for_entity(
            calculated_start_date=calculated_start,
            calculated_end_date=calculated_end,
        )

        # Calculated dates should be used
        assert result["start_date"] == calculated_start
        assert result["end_date"] == calculated_end
        assert result["is_manual_start"] is False
        assert result["is_manual_end"] is False

    @given(
        manual_start=st.one_of(st.none(), datetime_strategy),
        manual_due=st.one_of(st.none(), datetime_strategy),
        calculated_start=st.one_of(st.none(), datetime_strategy),
        calculated_end=st.one_of(st.none(), datetime_strategy),
    )
    def test_priority_rules_always_consistent(
        self,
        manual_start: datetime | None,
        manual_due: datetime | None,
        calculated_start: datetime | None,
        calculated_end: datetime | None,
    ):
        """Property: Priority rules are always consistent regardless of input combination"""
        result = get_display_dates_for_entity(
            start_date=manual_start,
            due_date=manual_due,
            calculated_start_date=calculated_start,
            calculated_end_date=calculated_end,
        )

        # Check start date priority
        if manual_start is not None:
            assert result["start_date"] == manual_start
            assert result["is_manual_start"] is True
        elif calculated_start is not None:
            assert result["start_date"] == calculated_start
            assert result["is_manual_start"] is False
        else:
            assert result["start_date"] is None
            assert result["is_manual_start"] is False

        # Check end date priority
        if manual_due is not None:
            assert result["end_date"] == manual_due
            assert result["is_manual_end"] is True
        elif calculated_end is not None:
            assert result["end_date"] == calculated_end
            assert result["is_manual_end"] is False
        else:
            assert result["end_date"] is None
            assert result["is_manual_end"] is False


class TestProgressIndicatorProperties:
    """Property-based tests for progress indicator"""

    @given(progress=st.integers(min_value=0, max_value=100))
    def test_progress_always_in_valid_range(self, progress: int):
        """Property: Progress is always between 0 and 100"""
        result = get_progress_indicator(progress=progress)

        assert 0 <= result["progress"] <= 100
        assert result["progress"] == progress

    @given(progress=st.integers())
    def test_progress_validation_rejects_invalid(self, progress: int):
        """Property: Progress validation rejects values outside 0-100"""
        if 0 <= progress <= 100:
            # Should succeed
            result = get_progress_indicator(progress=progress)
            assert result["progress"] == progress
        else:
            # Should raise ValueError
            try:
                get_progress_indicator(progress=progress)
                assert False, f"Should have raised ValueError for progress={progress}"
            except ValueError as e:
                assert "Progress must be between 0 and 100" in str(e)

    @given(
        actual_start=datetime_strategy,
        planned_start=datetime_strategy,
    )
    def test_variance_sign_indicates_delay_status(
        self, actual_start: datetime, planned_start: datetime
    ):
        """Property: Positive variance means delayed, negative means ahead"""
        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_start,
            start_date=planned_start,
        )

        delta_days = (actual_start - planned_start).days

        assert result["variance_days"] == delta_days

        if delta_days > 0:
            # Started later than planned
            assert result["is_delayed"] is True
        elif delta_days < 0:
            # Started earlier than planned
            assert result["is_delayed"] is False
        else:
            # Started on time
            assert result["is_delayed"] is False

    @given(
        manual_start=datetime_strategy,
        calculated_start=datetime_strategy,
        actual_start=datetime_strategy,
    )
    def test_variance_uses_manual_date_priority(
        self,
        manual_start: datetime,
        calculated_start: datetime,
        actual_start: datetime,
    ):
        """Property: Variance calculation prioritizes manual start_date over calculated"""
        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_start,
            start_date=manual_start,
            calculated_start_date=calculated_start,
        )

        # Should compare against manual_start, not calculated_start
        expected_variance = (actual_start - manual_start).days
        assert result["variance_days"] == expected_variance
        assert result["planned_start"] == manual_start

    @given(
        calculated_start=datetime_strategy,
        actual_start=datetime_strategy,
    )
    def test_variance_uses_calculated_when_manual_absent(
        self,
        calculated_start: datetime,
        actual_start: datetime,
    ):
        """Property: Variance uses calculated_start_date when manual not set"""
        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_start,
            calculated_start_date=calculated_start,
        )

        # Should compare against calculated_start
        expected_variance = (actual_start - calculated_start).days
        assert result["variance_days"] == expected_variance
        assert result["planned_start"] == calculated_start

    @given(
        progress=st.integers(min_value=0, max_value=100),
        start_date_is=st.one_of(st.none(), datetime_strategy),
        start_date=st.one_of(st.none(), datetime_strategy),
        calculated_start_date=st.one_of(st.none(), datetime_strategy),
    )
    def test_variance_calculation_always_consistent(
        self,
        progress: int,
        start_date_is: datetime | None,
        start_date: datetime | None,
        calculated_start_date: datetime | None,
    ):
        """Property: Variance calculation is always consistent with date priority rules"""
        result = get_progress_indicator(
            progress=progress,
            start_date_is=start_date_is,
            start_date=start_date,
            calculated_start_date=calculated_start_date,
        )

        # Determine expected planned start (priority: manual > calculated)
        expected_planned = start_date if start_date is not None else calculated_start_date

        assert result["planned_start"] == expected_planned
        assert result["actual_start"] == start_date_is

        # Variance should only be calculated if both dates present
        if start_date_is is not None and expected_planned is not None:
            expected_variance = (start_date_is - expected_planned).days
            assert result["variance_days"] == expected_variance
            assert result["is_delayed"] == (expected_variance > 0)
        else:
            assert result["variance_days"] is None
            assert result["is_delayed"] is False

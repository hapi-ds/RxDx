"""Unit tests for date priority and progress tracking utilities.

Tests Requirements 16A.22-16A.40: Date priority algorithm and progress tracking.
"""

import pytest
from datetime import datetime, timedelta, UTC

from app.utils.date_utils import (
    get_display_dates_for_entity,
    get_progress_indicator,
    DisplayDates,
    ProgressIndicator,
)


class TestGetDisplayDatesForEntity:
    """Test get_display_dates_for_entity function (Requirements 16A.32-16A.34)"""

    def test_manual_start_date_overrides_calculated(self):
        """Manual start_date should override calculated_start_date"""
        manual_start = datetime(2024, 1, 1, tzinfo=UTC)
        calculated_start = datetime(2024, 1, 5, tzinfo=UTC)

        result = get_display_dates_for_entity(
            start_date=manual_start,
            calculated_start_date=calculated_start,
        )

        assert result["start_date"] == manual_start
        assert result["is_manual_start"] is True

    def test_manual_due_date_overrides_calculated(self):
        """Manual due_date should override calculated_end_date"""
        manual_due = datetime(2024, 1, 10, tzinfo=UTC)
        calculated_end = datetime(2024, 1, 15, tzinfo=UTC)

        result = get_display_dates_for_entity(
            due_date=manual_due,
            calculated_end_date=calculated_end,
        )

        assert result["end_date"] == manual_due
        assert result["is_manual_end"] is True

    def test_calculated_dates_used_when_manual_not_set(self):
        """Calculated dates should be used when manual dates are not set"""
        calculated_start = datetime(2024, 1, 5, tzinfo=UTC)
        calculated_end = datetime(2024, 1, 10, tzinfo=UTC)

        result = get_display_dates_for_entity(
            calculated_start_date=calculated_start,
            calculated_end_date=calculated_end,
        )

        assert result["start_date"] == calculated_start
        assert result["end_date"] == calculated_end
        assert result["is_manual_start"] is False
        assert result["is_manual_end"] is False

    def test_mixed_manual_and_calculated_dates(self):
        """Should handle mix of manual and calculated dates"""
        manual_start = datetime(2024, 1, 1, tzinfo=UTC)
        calculated_start = datetime(2024, 1, 5, tzinfo=UTC)
        calculated_end = datetime(2024, 1, 10, tzinfo=UTC)

        result = get_display_dates_for_entity(
            start_date=manual_start,
            calculated_start_date=calculated_start,
            calculated_end_date=calculated_end,
        )

        assert result["start_date"] == manual_start
        assert result["end_date"] == calculated_end
        assert result["is_manual_start"] is True
        assert result["is_manual_end"] is False

    def test_all_dates_none(self):
        """Should handle case where all dates are None"""
        result = get_display_dates_for_entity()

        assert result["start_date"] is None
        assert result["end_date"] is None
        assert result["is_manual_start"] is False
        assert result["is_manual_end"] is False

    def test_only_manual_dates_set(self):
        """Should work with only manual dates set"""
        manual_start = datetime(2024, 1, 1, tzinfo=UTC)
        manual_due = datetime(2024, 1, 10, tzinfo=UTC)

        result = get_display_dates_for_entity(
            start_date=manual_start,
            due_date=manual_due,
        )

        assert result["start_date"] == manual_start
        assert result["end_date"] == manual_due
        assert result["is_manual_start"] is True
        assert result["is_manual_end"] is True


class TestGetProgressIndicator:
    """Test get_progress_indicator function (Requirements 16A.27-16A.31, 16A.36)"""

    def test_progress_defaults_to_zero(self):
        """Progress should default to 0 when not set"""
        result = get_progress_indicator()

        assert result["progress"] == 0
        assert result["variance_days"] is None
        assert result["is_delayed"] is False

    def test_progress_validation_rejects_negative(self):
        """Should reject negative progress values"""
        with pytest.raises(ValueError, match="Progress must be between 0 and 100"):
            get_progress_indicator(progress=-1)

    def test_progress_validation_rejects_over_100(self):
        """Should reject progress values over 100"""
        with pytest.raises(ValueError, match="Progress must be between 0 and 100"):
            get_progress_indicator(progress=101)

    def test_progress_accepts_valid_range(self):
        """Should accept progress values 0-100"""
        for progress in [0, 25, 50, 75, 100]:
            result = get_progress_indicator(progress=progress)
            assert result["progress"] == progress

    def test_variance_calculation_on_schedule(self):
        """Variance should be 0 when started on planned date"""
        planned_date = datetime(2024, 1, 1, tzinfo=UTC)
        actual_date = datetime(2024, 1, 1, tzinfo=UTC)

        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_date,
            start_date=planned_date,
        )

        assert result["variance_days"] == 0
        assert result["is_delayed"] is False
        assert result["actual_start"] == actual_date
        assert result["planned_start"] == planned_date

    def test_variance_calculation_ahead_of_schedule(self):
        """Positive variance when started earlier than planned"""
        planned_date = datetime(2024, 1, 5, tzinfo=UTC)
        actual_date = datetime(2024, 1, 1, tzinfo=UTC)

        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_date,
            start_date=planned_date,
        )

        assert result["variance_days"] == -4  # Started 4 days early
        assert result["is_delayed"] is False

    def test_variance_calculation_behind_schedule(self):
        """Negative variance when started later than planned"""
        planned_date = datetime(2024, 1, 1, tzinfo=UTC)
        actual_date = datetime(2024, 1, 5, tzinfo=UTC)

        result = get_progress_indicator(
            progress=30,
            start_date_is=actual_date,
            start_date=planned_date,
        )

        assert result["variance_days"] == 4  # Started 4 days late
        assert result["is_delayed"] is True

    def test_variance_uses_manual_start_date_priority(self):
        """Should prioritize manual start_date over calculated_start_date"""
        manual_start = datetime(2024, 1, 1, tzinfo=UTC)
        calculated_start = datetime(2024, 1, 5, tzinfo=UTC)
        actual_start = datetime(2024, 1, 3, tzinfo=UTC)

        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_start,
            start_date=manual_start,
            calculated_start_date=calculated_start,
        )

        # Should compare against manual_start (2024-01-01), not calculated_start
        assert result["variance_days"] == 2  # Started 2 days late vs manual
        assert result["is_delayed"] is True
        assert result["planned_start"] == manual_start

    def test_variance_uses_calculated_when_manual_not_set(self):
        """Should use calculated_start_date when manual start_date not set"""
        calculated_start = datetime(2024, 1, 5, tzinfo=UTC)
        actual_start = datetime(2024, 1, 3, tzinfo=UTC)

        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_start,
            calculated_start_date=calculated_start,
        )

        # Should compare against calculated_start
        assert result["variance_days"] == -2  # Started 2 days early
        assert result["is_delayed"] is False
        assert result["planned_start"] == calculated_start

    def test_no_variance_when_actual_start_not_set(self):
        """Variance should be None when actual start date not set"""
        planned_date = datetime(2024, 1, 1, tzinfo=UTC)

        result = get_progress_indicator(
            progress=0,
            start_date=planned_date,
        )

        assert result["variance_days"] is None
        assert result["is_delayed"] is False
        assert result["actual_start"] is None
        assert result["planned_start"] == planned_date

    def test_no_variance_when_planned_start_not_set(self):
        """Variance should be None when planned start date not set"""
        actual_date = datetime(2024, 1, 1, tzinfo=UTC)

        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_date,
        )

        assert result["variance_days"] is None
        assert result["is_delayed"] is False
        assert result["actual_start"] == actual_date
        assert result["planned_start"] is None

    def test_large_variance_calculation(self):
        """Should handle large variance values correctly"""
        planned_date = datetime(2024, 1, 1, tzinfo=UTC)
        actual_date = datetime(2024, 3, 1, tzinfo=UTC)  # 60 days late

        result = get_progress_indicator(
            progress=10,
            start_date_is=actual_date,
            start_date=planned_date,
        )

        assert result["variance_days"] == 60
        assert result["is_delayed"] is True

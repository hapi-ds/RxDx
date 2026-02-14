"""Property-based tests for Gantt chart data preparation.

These tests verify that the date priority rules and progress tracking
work correctly across all possible input combinations.

Requirements: 16A.32-16A.36, 3.1-3.13
"""

import pytest
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, settings, HealthCheck

from app.utils.date_utils import get_display_dates_for_entity, get_progress_indicator


# Strategy for generating datetime objects
datetime_strategy = st.datetimes(
    min_value=datetime(2020, 1, 1),
    max_value=datetime(2030, 12, 31),
)


class TestDatePriorityProperties:
    """Property-based tests for date priority rules."""
    
    @given(
        manual_start=datetime_strategy,
        calc_start=datetime_strategy,
    )
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_manual_start_overrides_calculated(self, manual_start, calc_start):
        """
        Property: Manual start_date always overrides calculated_start_date.
        
        Requirements: 16A.32
        """
        result = get_display_dates_for_entity(
            start_date=manual_start,
            calculated_start_date=calc_start,
        )
        
        # Manual date should be used
        assert result["start_date"] == manual_start
        assert result["is_manual_start"] is True
    
    @given(
        manual_due=datetime_strategy,
        calc_end=datetime_strategy,
    )
    def test_manual_due_overrides_calculated(self, manual_due, calc_end):
        """
        Property: Manual due_date always overrides calculated_end_date.
        
        Requirements: 16A.33
        """
        result = get_display_dates_for_entity(
            due_date=manual_due,
            calculated_end_date=calc_end,
        )
        
        # Manual date should be used
        assert result["end_date"] == manual_due
        assert result["is_manual_end"] is True
    
    @given(calc_start=datetime_strategy)
    def test_calculated_used_when_no_manual_start(self, calc_start):
        """
        Property: Calculated start_date used when manual start_date not set.
        
        Requirements: 16A.34
        """
        result = get_display_dates_for_entity(
            start_date=None,
            calculated_start_date=calc_start,
        )
        
        # Calculated date should be used
        assert result["start_date"] == calc_start
        assert result["is_manual_start"] is False
    
    @given(calc_end=datetime_strategy)
    def test_calculated_used_when_no_manual_due(self, calc_end):
        """
        Property: Calculated end_date used when manual due_date not set.
        
        Requirements: 16A.34
        """
        result = get_display_dates_for_entity(
            due_date=None,
            calculated_end_date=calc_end,
        )
        
        # Calculated date should be used
        assert result["end_date"] == calc_end
        assert result["is_manual_end"] is False
    
    @given(
        manual_start=datetime_strategy,
        manual_due=datetime_strategy,
        calc_start=datetime_strategy,
        calc_end=datetime_strategy,
    )
    def test_manual_always_wins(self, manual_start, manual_due, calc_start, calc_end):
        """
        Property: Manual dates always take priority over calculated dates.
        
        This is the core property that must hold for all date combinations.
        
        Requirements: 16A.32-16A.34
        """
        result = get_display_dates_for_entity(
            start_date=manual_start,
            due_date=manual_due,
            calculated_start_date=calc_start,
            calculated_end_date=calc_end,
        )
        
        # Manual dates should always be used
        assert result["start_date"] == manual_start
        assert result["end_date"] == manual_due
        assert result["is_manual_start"] is True
        assert result["is_manual_end"] is True


class TestProgressIndicatorProperties:
    """Property-based tests for progress indicator calculation."""
    
    @given(progress=st.integers(min_value=0, max_value=100))
    def test_progress_always_in_range(self, progress):
        """
        Property: Progress is always between 0 and 100.
        
        Requirements: 16A.27
        """
        result = get_progress_indicator(progress=progress)
        
        assert 0 <= result["progress"] <= 100
        assert result["progress"] == progress
    
    @given(progress=st.integers(min_value=-1000, max_value=-1))
    def test_negative_progress_raises_error(self, progress):
        """
        Property: Negative progress values raise ValueError.
        
        Requirements: 16A.27
        """
        with pytest.raises(ValueError, match="Progress must be between 0 and 100"):
            get_progress_indicator(progress=progress)
    
    @given(progress=st.integers(min_value=101, max_value=1000))
    def test_progress_over_100_raises_error(self, progress):
        """
        Property: Progress values over 100 raise ValueError.
        
        Requirements: 16A.27
        """
        with pytest.raises(ValueError, match="Progress must be between 0 and 100"):
            get_progress_indicator(progress=progress)
    
    @given(
        actual_start=datetime_strategy,
        planned_start=datetime_strategy,
    )
    def test_variance_calculation_consistent(self, actual_start, planned_start):
        """
        Property: Variance calculation is consistent with date difference.
        
        Requirements: 16A.28-16A.31
        """
        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_start,
            start_date=planned_start,
        )
        
        # Variance should match the difference in days
        expected_variance = (actual_start - planned_start).days
        assert result["variance_days"] == expected_variance
        
        # is_delayed should be True when started later than planned
        assert result["is_delayed"] == (expected_variance > 0)
    
    @given(
        actual_start=datetime_strategy,
        manual_start=datetime_strategy,
        calc_start=datetime_strategy,
    )
    def test_variance_uses_manual_start_priority(self, actual_start, manual_start, calc_start):
        """
        Property: Variance calculation uses manual start date when available.
        
        Requirements: 16A.36
        """
        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_start,
            start_date=manual_start,
            calculated_start_date=calc_start,
        )
        
        # Should use manual_start for variance calculation
        expected_variance = (actual_start - manual_start).days
        assert result["variance_days"] == expected_variance
        assert result["planned_start"] == manual_start
    
    @given(
        actual_start=datetime_strategy,
        calc_start=datetime_strategy,
    )
    def test_variance_uses_calculated_when_no_manual(self, actual_start, calc_start):
        """
        Property: Variance calculation uses calculated start when manual not available.
        
        Requirements: 16A.36
        """
        result = get_progress_indicator(
            progress=50,
            start_date_is=actual_start,
            start_date=None,
            calculated_start_date=calc_start,
        )
        
        # Should use calc_start for variance calculation
        expected_variance = (actual_start - calc_start).days
        assert result["variance_days"] == expected_variance
        assert result["planned_start"] == calc_start
    
    @given(
        progress=st.integers(min_value=0, max_value=100),
        days_ahead=st.integers(min_value=1, max_value=365),
    )
    def test_ahead_of_schedule_not_delayed(self, progress, days_ahead):
        """
        Property: Starting earlier than planned is not considered delayed.
        
        Requirements: 16A.31
        """
        planned = datetime(2024, 6, 1)
        actual = planned - timedelta(days=days_ahead)
        
        result = get_progress_indicator(
            progress=progress,
            start_date_is=actual,
            start_date=planned,
        )
        
        # Should not be delayed when started earlier
        assert result["is_delayed"] is False
        assert result["variance_days"] == -days_ahead
    
    @given(
        progress=st.integers(min_value=0, max_value=100),
        days_behind=st.integers(min_value=1, max_value=365),
    )
    def test_behind_schedule_is_delayed(self, progress, days_behind):
        """
        Property: Starting later than planned is considered delayed.
        
        Requirements: 16A.31
        """
        planned = datetime(2024, 6, 1)
        actual = planned + timedelta(days=days_behind)
        
        result = get_progress_indicator(
            progress=progress,
            start_date_is=actual,
            start_date=planned,
        )
        
        # Should be delayed when started later
        assert result["is_delayed"] is True
        assert result["variance_days"] == days_behind
    
    @given(progress=st.integers(min_value=0, max_value=100))
    def test_on_schedule_not_delayed(self, progress):
        """
        Property: Starting exactly on planned date is not delayed.
        
        Requirements: 16A.31
        """
        planned = datetime(2024, 6, 1)
        actual = planned
        
        result = get_progress_indicator(
            progress=progress,
            start_date_is=actual,
            start_date=planned,
        )
        
        # Should not be delayed when started on time
        assert result["is_delayed"] is False
        assert result["variance_days"] == 0


class TestDatePriorityIntegration:
    """Integration tests for date priority with progress tracking."""
    
    @given(
        manual_start=datetime_strategy,
        calc_start=datetime_strategy,
        actual_start=datetime_strategy,
        progress=st.integers(min_value=0, max_value=100),
    )
    def test_display_and_variance_use_same_priority(
        self, manual_start, calc_start, actual_start, progress
    ):
        """
        Property: Display dates and variance calculation use same priority rules.
        
        Both should prioritize manual dates over calculated dates.
        
        Requirements: 16A.32-16A.36
        """
        # Get display dates
        display = get_display_dates_for_entity(
            start_date=manual_start,
            calculated_start_date=calc_start,
        )
        
        # Get progress indicator
        progress_ind = get_progress_indicator(
            progress=progress,
            start_date_is=actual_start,
            start_date=manual_start,
            calculated_start_date=calc_start,
        )
        
        # Both should use manual_start
        assert display["start_date"] == manual_start
        assert progress_ind["planned_start"] == manual_start
        
        # Variance should be calculated from manual_start
        expected_variance = (actual_start - manual_start).days
        assert progress_ind["variance_days"] == expected_variance

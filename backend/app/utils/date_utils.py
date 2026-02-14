"""Date priority and progress tracking utilities for schedule management.

This module implements the date priority algorithm where manual dates (start_date, due_date)
take precedence over calculated dates (calculated_start_date, calculated_end_date) for display
purposes, while calculated dates are used for scheduling calculations.

Requirements: 16A.22-16A.40
"""

from datetime import datetime
from typing import TypedDict


class DisplayDates(TypedDict):
    """Display dates for an entity with priority rules applied."""
    
    start_date: datetime | None
    end_date: datetime | None
    is_manual_start: bool
    is_manual_end: bool


class ProgressIndicator(TypedDict):
    """Progress indicator with variance calculation."""
    
    progress: int  # 0-100
    variance_days: int | None  # Positive = ahead, Negative = behind
    is_delayed: bool
    actual_start: datetime | None
    planned_start: datetime | None


def get_display_dates_for_entity(
    start_date: datetime | None = None,
    due_date: datetime | None = None,
    calculated_start_date: datetime | None = None,
    calculated_end_date: datetime | None = None,
) -> DisplayDates:
    """Get display dates for an entity following priority rules.
    
    Priority Rules (Requirements 16A.32-16A.34):
    1. Manual start_date overrides calculated_start_date if set
    2. Manual due_date overrides calculated_end_date if set
    3. Use calculated dates when manual dates are not set
    
    Args:
        start_date: Manual start date (user-specified, optional)
        due_date: Manual due date (user-specified, optional)
        calculated_start_date: Calculated start date from scheduler
        calculated_end_date: Calculated end date from scheduler
    
    Returns:
        DisplayDates with priority rules applied and flags indicating which dates are manual
    
    Examples:
        >>> # Manual dates take priority
        >>> get_display_dates_for_entity(
        ...     start_date=datetime(2024, 1, 1),
        ...     calculated_start_date=datetime(2024, 1, 5)
        ... )
        {'start_date': datetime(2024, 1, 1), 'end_date': None, 
         'is_manual_start': True, 'is_manual_end': False}
        
        >>> # Calculated dates used when manual not set
        >>> get_display_dates_for_entity(
        ...     calculated_start_date=datetime(2024, 1, 5),
        ...     calculated_end_date=datetime(2024, 1, 10)
        ... )
        {'start_date': datetime(2024, 1, 5), 'end_date': datetime(2024, 1, 10),
         'is_manual_start': False, 'is_manual_end': False}
    """
    # Priority: manual dates > calculated dates
    display_start = start_date if start_date is not None else calculated_start_date
    display_end = due_date if due_date is not None else calculated_end_date
    
    return DisplayDates(
        start_date=display_start,
        end_date=display_end,
        is_manual_start=start_date is not None,
        is_manual_end=due_date is not None,
    )


def get_progress_indicator(
    progress: int | None = None,
    start_date_is: datetime | None = None,
    start_date: datetime | None = None,
    calculated_start_date: datetime | None = None,
) -> ProgressIndicator:
    """Calculate progress indicator with variance.
    
    Variance Calculation (Requirements 16A.27-16A.31, 16A.36):
    - Compares actual start date (start_date_is) with planned start date
    - Planned start date follows priority: start_date > calculated_start_date
    - Positive variance = ahead of schedule (started earlier)
    - Negative variance = behind schedule (started later)
    - is_delayed flag set when variance is negative
    
    Args:
        progress: Completion percentage (0-100), optional
        start_date_is: Actual start date when work began
        start_date: Manual planned start date (user-specified)
        calculated_start_date: Calculated planned start date from scheduler
    
    Returns:
        ProgressIndicator with progress, variance, and delay status
    
    Examples:
        >>> # On schedule
        >>> get_progress_indicator(
        ...     progress=50,
        ...     start_date_is=datetime(2024, 1, 1),
        ...     start_date=datetime(2024, 1, 1)
        ... )
        {'progress': 50, 'variance_days': 0, 'is_delayed': False,
         'actual_start': datetime(2024, 1, 1), 'planned_start': datetime(2024, 1, 1)}
        
        >>> # Behind schedule
        >>> get_progress_indicator(
        ...     progress=30,
        ...     start_date_is=datetime(2024, 1, 5),
        ...     start_date=datetime(2024, 1, 1)
        ... )
        {'progress': 30, 'variance_days': -4, 'is_delayed': True,
         'actual_start': datetime(2024, 1, 5), 'planned_start': datetime(2024, 1, 1)}
    """
    # Default progress to 0 if not set
    progress_value = progress if progress is not None else 0
    
    # Validate progress is in range 0-100
    if not 0 <= progress_value <= 100:
        raise ValueError(f"Progress must be between 0 and 100, got {progress_value}")
    
    # Calculate variance if we have actual and planned start dates
    variance_days = None
    is_delayed = False
    
    # Determine planned start date (priority: manual > calculated)
    planned_start = start_date if start_date is not None else calculated_start_date
    
    if start_date_is is not None and planned_start is not None:
        # Calculate variance in days
        delta = start_date_is - planned_start
        variance_days = delta.days
        
        # Positive variance means started later than planned (delayed)
        is_delayed = variance_days > 0
    
    return ProgressIndicator(
        progress=progress_value,
        variance_days=variance_days,
        is_delayed=is_delayed,
        actual_start=start_date_is,
        planned_start=planned_start,
    )

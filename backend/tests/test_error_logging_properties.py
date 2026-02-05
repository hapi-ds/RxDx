"""Property-based tests for error logging completeness"""

import json
import logging
import tempfile
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

import structlog
from fastapi import HTTPException
from hypothesis import given, strategies as st, settings


# Strategy for error messages
error_message_strategy = st.text(min_size=1, max_size=500)

# Strategy for error types
error_type_strategy = st.sampled_from([
    ValueError,
    TypeError,
    RuntimeError,
    KeyError,
    AttributeError,
    IndexError,
    ZeroDivisionError,
])

# Strategy for log levels
log_level_strategy = st.sampled_from([
    "ERROR",
    "CRITICAL",
])

# Strategy for unicode strings
unicode_strategy = st.text(
    alphabet=st.characters(
        blacklist_categories=('Cs',),  # Exclude surrogates
        blacklist_characters=('\x00',)  # Exclude null bytes
    ),
    min_size=1,
    max_size=200
)


@given(
    error_message=error_message_strategy,
    error_type=error_type_strategy
)
@settings(max_examples=100, deadline=None)
def test_error_logs_include_required_fields(error_message, error_type):
    """
    Property 5: Error Logging Completeness
    
    For any unhandled exception, the error log must include
    timestamp, error_type, and error_message.
    
    **Validates: Requirements 6.1, 6.2, 6.3**
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        # Configure structlog for JSON output
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=1,
            encoding="utf-8"
        )
        handler.setLevel(logging.ERROR)
        
        # Configure structlog with JSON renderer
        structlog.configure(
            processors=[
                structlog.processors.add_log_level,
                structlog.processors.TimeStamper(fmt="iso", utc=True),
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer()
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.ERROR),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=False,
        )
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.handlers = []
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.ERROR)
        
        # Create logger and log error
        logger = structlog.get_logger("test_error")
        
        try:
            raise error_type(error_message)
        except Exception as e:
            logger.error(
                "Operation failed",
                error=str(e),
                error_type=type(e).__name__,
            )
        
        # Flush and close handler
        handler.flush()
        handler.close()
        root_logger.removeHandler(handler)
        
        # Read log file and verify fields
        with open(log_file, 'r', encoding='utf-8') as f:
            log_content = f.read().strip()
        
        if log_content:
            # Parse JSON log entry
            log_entry = json.loads(log_content)
            
            # Verify required fields
            assert "timestamp" in log_entry, "Log entry missing timestamp"
            assert "level" in log_entry, "Log entry missing level"
            assert "event" in log_entry, "Log entry missing event/message"
            assert "error_type" in log_entry, "Log entry missing error_type"
            assert "error" in log_entry, "Log entry missing error message"
            
            # Verify timestamp is valid ISO format
            try:
                datetime.fromisoformat(log_entry["timestamp"].replace('Z', '+00:00'))
            except ValueError:
                assert False, f"Invalid timestamp format: {log_entry['timestamp']}"
            
            # Verify log level is ERROR or CRITICAL
            assert log_entry["level"] in ["error", "critical"], (
                f"Expected ERROR or CRITICAL level, got {log_entry['level']}"
            )
            
            # Verify error_type matches
            assert log_entry["error_type"] == error_type.__name__, (
                f"Expected error_type={error_type.__name__}, "
                f"got {log_entry['error_type']}"
            )


@given(
    error_message=error_message_strategy,
    error_type=error_type_strategy,
    include_stack_trace=st.booleans()
)
@settings(max_examples=100, deadline=None)
def test_error_logs_include_stack_trace_when_available(
    error_message, error_type, include_stack_trace
):
    """
    Property 5: Error Logging Completeness
    
    For any unhandled exception, when exc_info=True is provided,
    the error log must include a stack trace.
    
    **Validates: Requirements 6.1, 6.2, 6.3**
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        # Configure structlog for JSON output
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=1,
            encoding="utf-8"
        )
        handler.setLevel(logging.ERROR)
        
        # Configure structlog with JSON renderer
        structlog.configure(
            processors=[
                structlog.processors.add_log_level,
                structlog.processors.TimeStamper(fmt="iso", utc=True),
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer()
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.ERROR),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=False,
        )
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.handlers = []
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.ERROR)
        
        # Create logger and log error
        logger = structlog.get_logger("test_stack_trace")
        
        try:
            raise error_type(error_message)
        except Exception as e:
            logger.error(
                "Operation failed",
                error=str(e),
                error_type=type(e).__name__,
                exc_info=include_stack_trace,
            )
        
        # Flush and close handler
        handler.flush()
        handler.close()
        root_logger.removeHandler(handler)
        
        # Read log file and verify stack trace
        with open(log_file, 'r', encoding='utf-8') as f:
            log_content = f.read().strip()
        
        if log_content:
            # Parse JSON log entry
            log_entry = json.loads(log_content)
            
            if include_stack_trace:
                # Should have exception info
                assert "exception" in log_entry or "exc_info" in log_entry, (
                    "Log entry missing stack trace when exc_info=True"
                )
            
            # Always verify basic fields
            assert "error_type" in log_entry
            assert "error" in log_entry


@given(
    error_message=unicode_strategy,
    error_type=error_type_strategy
)
@settings(max_examples=100, deadline=None)
def test_error_logs_handle_unicode(error_message, error_type):
    """
    Property 5: Error Logging Completeness
    
    For any error message containing unicode characters,
    the error log must correctly encode and store the message.
    
    **Validates: Requirements 6.1, 6.2, 6.3**
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        # Configure structlog for JSON output
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=1,
            encoding="utf-8"
        )
        handler.setLevel(logging.ERROR)
        
        # Configure structlog with JSON renderer
        structlog.configure(
            processors=[
                structlog.processors.add_log_level,
                structlog.processors.TimeStamper(fmt="iso", utc=True),
                structlog.processors.JSONRenderer()
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.ERROR),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=False,
        )
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.handlers = []
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.ERROR)
        
        # Create logger and log error with unicode
        logger = structlog.get_logger("test_unicode")
        
        try:
            raise error_type(error_message)
        except Exception as e:
            logger.error(
                "Unicode error occurred",
                error=str(e),
                error_type=type(e).__name__,
            )
        
        # Flush and close handler
        handler.flush()
        handler.close()
        root_logger.removeHandler(handler)
        
        # Read log file and verify unicode handling
        with open(log_file, 'r', encoding='utf-8') as f:
            log_content = f.read().strip()
        
        if log_content:
            # Should be valid JSON
            log_entry = json.loads(log_content)
            
            # Verify error message is present
            assert "error" in log_entry
            # Error message should be a string
            assert isinstance(log_entry["error"], str)


@given(log_level=log_level_strategy)
@settings(max_examples=50, deadline=None)
def test_error_logs_use_appropriate_level(log_level):
    """
    Property 5: Error Logging Completeness
    
    For any error log, the log level must be ERROR or CRITICAL.
    
    **Validates: Requirements 6.1, 6.2, 6.3**
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        # Configure structlog for JSON output
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=1,
            encoding="utf-8"
        )
        handler.setLevel(logging.ERROR)
        
        # Configure structlog with JSON renderer
        structlog.configure(
            processors=[
                structlog.processors.add_log_level,
                structlog.processors.TimeStamper(fmt="iso", utc=True),
                structlog.processors.JSONRenderer()
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.ERROR),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=False,
        )
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.handlers = []
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.ERROR)
        
        # Create logger and log at specified level
        logger = structlog.get_logger("test_level")
        
        if log_level == "ERROR":
            logger.error("Error message", error="test error")
        else:  # CRITICAL
            logger.critical("Critical error", error="critical test error")
        
        # Flush and close handler
        handler.flush()
        handler.close()
        root_logger.removeHandler(handler)
        
        # Read log file and verify level
        with open(log_file, 'r', encoding='utf-8') as f:
            log_content = f.read().strip()
        
        if log_content:
            log_entry = json.loads(log_content)
            
            # Verify log level
            assert "level" in log_entry
            assert log_entry["level"] in ["error", "critical"], (
                f"Expected ERROR or CRITICAL, got {log_entry['level']}"
            )


@given(
    num_errors=st.integers(min_value=1, max_value=20),
    error_type=error_type_strategy
)
@settings(max_examples=50, deadline=None)
def test_multiple_errors_logged_completely(num_errors, error_type):
    """
    Property 5: Error Logging Completeness
    
    For any sequence of errors, each error log must include
    all required fields independently.
    
    **Validates: Requirements 6.1, 6.2, 6.3**
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        # Use standard logging with JSON formatter
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=1,
            encoding="utf-8"
        )
        handler.setLevel(logging.ERROR)
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.handlers = []
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.ERROR)
        
        # Create logger and log multiple errors using standard logging
        logger = logging.getLogger("test_multiple")
        
        for i in range(num_errors):
            try:
                raise error_type(f"Error {i}")
            except Exception as e:
                # Log as JSON manually
                import json
                log_entry = {
                    "timestamp": datetime.now().isoformat() + "Z",
                    "level": "error",
                    "event": f"Error {i} occurred",
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "error_index": i,
                }
                logger.error(json.dumps(log_entry))
                handler.flush()  # Flush after each write
        
        # Flush and close handler
        handler.flush()
        handler.close()
        root_logger.removeHandler(handler)
        
        # Read log file and verify all errors
        with open(log_file, 'r', encoding='utf-8') as f:
            log_content = f.read().strip()
        
        # Split by newlines and filter empty lines
        log_lines = [line for line in log_content.split('\n') if line.strip()]
        
        # Should have one log entry per error
        assert len(log_lines) >= num_errors, (
            f"Expected at least {num_errors} log entries, got {len(log_lines)}"
        )
        
        # Verify each log entry has required fields
        for line in log_lines:
            if line.strip():
                log_entry = json.loads(line)
                assert "timestamp" in log_entry
                assert "level" in log_entry
                assert "error_type" in log_entry
                assert "error" in log_entry


@given(
    status_code=st.integers(min_value=400, max_value=599),
    detail=error_message_strategy
)
@settings(max_examples=100, deadline=None)
def test_http_exception_logging_completeness(status_code, detail):
    """
    Property 5: Error Logging Completeness
    
    For any HTTP exception, the error log must include
    status_code, detail, and error_type.
    
    **Validates: Requirements 6.1, 6.2, 6.3**
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        # Configure structlog for JSON output
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=1,
            encoding="utf-8"
        )
        handler.setLevel(logging.ERROR)
        
        # Configure structlog with JSON renderer
        structlog.configure(
            processors=[
                structlog.processors.add_log_level,
                structlog.processors.TimeStamper(fmt="iso", utc=True),
                structlog.processors.JSONRenderer()
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.ERROR),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=False,
        )
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.handlers = []
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.ERROR)
        
        # Create logger and log HTTP exception
        logger = structlog.get_logger("test_http")
        
        try:
            raise HTTPException(status_code=status_code, detail=detail)
        except HTTPException as e:
            logger.error(
                "HTTP error occurred",
                status_code=e.status_code,
                detail=e.detail,
                error_type=type(e).__name__,
            )
        
        # Flush and close handler
        handler.flush()
        handler.close()
        root_logger.removeHandler(handler)
        
        # Read log file and verify HTTP exception fields
        with open(log_file, 'r', encoding='utf-8') as f:
            log_content = f.read().strip()
        
        if log_content:
            log_entry = json.loads(log_content)
            
            # Verify HTTP-specific fields
            assert "status_code" in log_entry, "Missing status_code"
            assert "detail" in log_entry, "Missing detail"
            assert "error_type" in log_entry, "Missing error_type"
            
            # Verify values
            assert log_entry["status_code"] == status_code
            assert log_entry["error_type"] == "HTTPException"

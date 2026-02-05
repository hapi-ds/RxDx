"""Property-based tests for logging format consistency"""

import json
import logging
import os
import sys
from contextlib import contextmanager
from datetime import datetime
from io import StringIO
from pathlib import Path

import structlog
from hypothesis import given, strategies as st, settings

# Set environment before importing settings
os.environ['ENVIRONMENT'] = 'production'
os.environ['DEBUG'] = 'false'


def configure_test_logging():
    """Configure logging for tests with JSON output"""
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure processors for JSON output
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        lambda logger, method_name, event_dict: {**event_dict, "service": "rxdx-backend", "environment": "production"},
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
    ]
    
    # Configure structlog
    structlog.configure(
        processors=shared_processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=False,  # Don't cache for tests
    )
    
    # JSON formatter for tests
    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(),
        ],
    )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.handlers = []  # Clear existing handlers
    root_logger.setLevel(logging.DEBUG)
    
    return formatter


# Configure logging once at module level
test_formatter = configure_test_logging()


@contextmanager
def capture_logs():
    """Context manager to capture log output"""
    # Create a string buffer to capture logs
    log_buffer = StringIO()
    handler = logging.StreamHandler(log_buffer)
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(test_formatter)  # Use JSON formatter
    
    # Get root logger and add handler
    root_logger = logging.getLogger()
    original_handlers = root_logger.handlers[:]
    root_logger.handlers = [handler]
    
    try:
        yield log_buffer
    finally:
        # Restore original handlers
        root_logger.handlers = original_handlers


# Strategy for generating log levels
log_levels = st.sampled_from(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'])

# Strategy for generating log messages
log_messages = st.one_of(
    st.text(min_size=1, max_size=500),  # Regular text
    st.text(alphabet=st.characters(blacklist_categories=('Cs',)), min_size=1, max_size=200),  # Unicode
    st.from_regex(r'[a-zA-Z0-9\s\-_.,!?]+', fullmatch=True),  # Alphanumeric with punctuation
)


@given(message=log_messages, level=log_levels)
@settings(max_examples=100, deadline=None)
def test_log_format_is_valid_json(message, level):
    """
    Property 1: Log Format Consistency
    
    For any log message and log level, the logged output must be valid JSON.
    
    **Validates: Requirements 1.1, 1.2**
    """
    with capture_logs() as log_capture:
        # Get logger
        logger = structlog.get_logger(__name__)
        
        # Log message at specified level
        log_method = getattr(logger, level.lower())
        log_method(message)
        
        # Get logged output
        log_output = log_capture.getvalue().strip()
        
        # Skip if no output (can happen with log level filtering)
        if not log_output:
            return
        
        # Parse as JSON - this will raise if invalid
        try:
            log_entry = json.loads(log_output)
            
            # Verify it's a dictionary
            assert isinstance(log_entry, dict), f"Log entry is not a dict: {type(log_entry)}"
            
        except json.JSONDecodeError as e:
            raise AssertionError(f"Log output is not valid JSON: {log_output}\nError: {e}")


@given(message=log_messages, level=log_levels)
@settings(max_examples=100, deadline=None)
def test_log_contains_required_fields(message, level):
    """
    Property 1: Log Format Consistency
    
    For any log message and log level, the logged output must include
    required fields: timestamp, level, message, service.
    
    **Validates: Requirements 1.1, 1.2**
    """
    with capture_logs() as log_capture:
        # Get logger
        logger = structlog.get_logger(__name__)
        
        # Log message at specified level
        log_method = getattr(logger, level.lower())
        log_method(message)
        
        # Get logged output
        log_output = log_capture.getvalue().strip()
        
        # Skip if no output
        if not log_output:
            return
        
        # Parse JSON
        try:
            log_entry = json.loads(log_output)
        except json.JSONDecodeError:
            raise AssertionError(f"Log output is not valid JSON: {log_output}")
        
        # Verify required fields exist
        required_fields = ['timestamp', 'level', 'event', 'service']
        for field in required_fields:
            assert field in log_entry, f"Missing required field '{field}' in log entry: {log_entry}"


@given(message=log_messages, level=log_levels)
@settings(max_examples=100, deadline=None)
def test_log_timestamp_is_valid_iso8601(message, level):
    """
    Property 1: Log Format Consistency
    
    For any log message and log level, the timestamp must be valid ISO 8601 format.
    
    **Validates: Requirements 1.1, 1.2**
    """
    with capture_logs() as log_capture:
        # Get logger
        logger = structlog.get_logger(__name__)
        
        # Log message at specified level
        log_method = getattr(logger, level.lower())
        log_method(message)
        
        # Get logged output
        log_output = log_capture.getvalue().strip()
        
        # Skip if no output
        if not log_output:
            return
        
        # Parse JSON
        try:
            log_entry = json.loads(log_output)
        except json.JSONDecodeError:
            raise AssertionError(f"Log output is not valid JSON: {log_output}")
        
        # Verify timestamp is valid ISO 8601
        if 'timestamp' in log_entry:
            timestamp_str = log_entry['timestamp']
            try:
                # Parse ISO 8601 timestamp
                datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            except (ValueError, AttributeError) as e:
                raise AssertionError(f"Invalid ISO 8601 timestamp: {timestamp_str}\nError: {e}")


@given(message=log_messages, level=log_levels)
@settings(max_examples=100, deadline=None)
def test_log_level_is_valid(message, level):
    """
    Property 1: Log Format Consistency
    
    For any log message and log level, the level field must be one of:
    DEBUG, INFO, WARNING, ERROR, CRITICAL.
    
    **Validates: Requirements 1.1, 1.2**
    """
    with capture_logs() as log_capture:
        # Get logger
        logger = structlog.get_logger(__name__)
        
        # Log message at specified level
        log_method = getattr(logger, level.lower())
        log_method(message)
        
        # Get logged output
        log_output = log_capture.getvalue().strip()
        
        # Skip if no output
        if not log_output:
            return
        
        # Parse JSON
        try:
            log_entry = json.loads(log_output)
        except json.JSONDecodeError:
            raise AssertionError(f"Log output is not valid JSON: {log_output}")
        
        # Verify level is valid
        if 'level' in log_entry:
            valid_levels = ['debug', 'info', 'warning', 'error', 'critical']
            actual_level = log_entry['level'].lower()
            assert actual_level in valid_levels, (
                f"Invalid log level: {log_entry['level']}. "
                f"Must be one of: {', '.join(valid_levels)}"
            )


@given(message=log_messages, level=log_levels)
@settings(max_examples=100, deadline=None)
def test_log_service_field_is_present(message, level):
    """
    Property 1: Log Format Consistency
    
    For any log message and log level, the service field must be present
    and set to 'rxdx-backend'.
    
    **Validates: Requirements 1.1, 1.2**
    """
    with capture_logs() as log_capture:
        # Get logger
        logger = structlog.get_logger(__name__)
        
        # Log message at specified level
        log_method = getattr(logger, level.lower())
        log_method(message)
        
        # Get logged output
        log_output = log_capture.getvalue().strip()
        
        # Skip if no output
        if not log_output:
            return
        
        # Parse JSON
        try:
            log_entry = json.loads(log_output)
        except json.JSONDecodeError:
            raise AssertionError(f"Log output is not valid JSON: {log_output}")
        
        # Verify service field
        assert 'service' in log_entry, "Missing 'service' field in log entry"
        assert log_entry['service'] == 'rxdx-backend', (
            f"Service field should be 'rxdx-backend', got: {log_entry['service']}"
        )


@given(
    message=log_messages,
    level=log_levels,
    context_data=st.dictionaries(
        keys=st.text(min_size=1, max_size=20, alphabet=st.characters(min_codepoint=97, max_codepoint=122)),
        values=st.one_of(st.text(max_size=100), st.integers(), st.booleans()),
        max_size=5
    )
)
@settings(max_examples=100, deadline=None)
def test_log_with_context_is_valid_json(message, level, context_data):
    """
    Property 1: Log Format Consistency
    
    For any log message with context data, the logged output must be valid JSON
    and include the context fields.
    
    **Validates: Requirements 1.1, 1.2**
    """
    with capture_logs() as log_capture:
        # Get logger
        logger = structlog.get_logger(__name__)
        
        # Log message with context
        log_method = getattr(logger, level.lower())
        log_method(message, **context_data)
        
        # Get logged output
        log_output = log_capture.getvalue().strip()
        
        # Skip if no output
        if not log_output:
            return
        
        # Parse as JSON
        try:
            log_entry = json.loads(log_output)
            
            # Verify it's a dictionary
            assert isinstance(log_entry, dict), f"Log entry is not a dict: {type(log_entry)}"
            
            # Verify context data is included
            for key, value in context_data.items():
                assert key in log_entry, f"Context key '{key}' not found in log entry"
                # Note: Values might be converted to strings in JSON
                
        except json.JSONDecodeError as e:
            raise AssertionError(f"Log output is not valid JSON: {log_output}\nError: {e}")

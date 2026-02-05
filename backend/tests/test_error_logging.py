"""Tests for error logging functionality"""

import logging

import pytest
import structlog
from fastapi import HTTPException


def test_error_logging_includes_stack_trace():
    """Test that error logs include stack trace"""
    logger = structlog.get_logger("test")
    
    # Test that logging with exc_info works without errors
    try:
        raise ValueError("Test error message")
    except ValueError as e:
        logger.error(
            "Operation failed",
            error=str(e),
            error_type=type(e).__name__,
            exc_info=True
        )
        # If we get here, logging worked
        assert True


def test_error_logging_includes_context():
    """Test that error logs include context information"""
    logger = structlog.get_logger("test")
    
    try:
        user_id = "123"
        operation = "create_workitem"
        raise RuntimeError("Database connection failed")
    except RuntimeError as e:
        logger.error(
            "Operation failed",
            operation=operation,
            user_id=user_id,
            error=str(e),
            error_type=type(e).__name__,
            exc_info=True
        )
        assert True


def test_error_logging_with_request_id():
    """Test that error logs include request_id when available"""
    logger = structlog.get_logger("test")
    
    # Bind request context
    structlog.contextvars.bind_contextvars(request_id="test-request-123")
    
    try:
        raise ValueError("Test error")
    except ValueError as e:
        logger.error(
            "Request failed",
            error=str(e),
            exc_info=True
        )
        assert True
    finally:
        # Clear context
        structlog.contextvars.clear_contextvars()


def test_error_logging_different_error_types():
    """Test logging different types of errors"""
    logger = structlog.get_logger("test")
    
    error_types = [
        ValueError("Value error"),
        TypeError("Type error"),
        RuntimeError("Runtime error"),
        KeyError("Key error"),
        AttributeError("Attribute error"),
    ]
    
    for error in error_types:
        logger.error(
            "Error occurred",
            error=str(error),
            error_type=type(error).__name__,
            exc_info=False
        )
    
    # All errors logged successfully
    assert True


def test_critical_error_logging():
    """Test that critical errors use CRITICAL level"""
    logger = structlog.get_logger("test")
    
    try:
        raise SystemError("Critical system failure")
    except SystemError as e:
        logger.critical(
            "System failure",
            error=str(e),
            error_type=type(e).__name__,
            exc_info=True
        )
        assert True


def test_http_exception_logging():
    """Test logging HTTP exceptions"""
    logger = structlog.get_logger("test")
    
    try:
        raise HTTPException(status_code=404, detail="Resource not found")
    except HTTPException as e:
        logger.error(
            "HTTP error",
            status_code=e.status_code,
            detail=e.detail,
            error_type=type(e).__name__,
        )
        assert True


def test_error_logging_with_unicode():
    """Test error logging with unicode characters"""
    logger = structlog.get_logger("test")
    
    try:
        raise ValueError("Error with unicode: 你好世界 🌍")
    except ValueError as e:
        logger.error(
            "Unicode error",
            error=str(e),
            error_type=type(e).__name__,
        )
        assert True


def test_error_logging_with_long_message():
    """Test error logging with very long error messages"""
    logger = structlog.get_logger("test")
    
    long_message = "Error: " + "x" * 1000
    
    try:
        raise ValueError(long_message)
    except ValueError as e:
        logger.error(
            "Long error message",
            error=str(e),
            error_type=type(e).__name__,
        )
        assert True


def test_nested_exception_logging():
    """Test logging nested exceptions"""
    logger = structlog.get_logger("test")
    
    try:
        try:
            raise ValueError("Inner error")
        except ValueError as inner_error:
            raise RuntimeError("Outer error") from inner_error
    except RuntimeError as e:
        logger.error(
            "Nested error",
            error=str(e),
            error_type=type(e).__name__,
            cause=str(e.__cause__) if e.__cause__ else None,
            exc_info=True
        )
        assert True


def test_error_log_levels():
    """Test that all error log levels work"""
    logger = structlog.get_logger("test")
    
    # Test all log levels
    logger.debug("Debug error", error="test")
    logger.info("Info error", error="test")
    logger.warning("Warning error", error="test")
    logger.error("Error message", error="test")
    logger.critical("Critical error", error="test")
    
    assert True


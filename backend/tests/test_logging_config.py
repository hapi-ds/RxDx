"""Tests for logging configuration"""

import json
import logging
import os
from pathlib import Path

import pytest
import structlog


def test_logging_configuration():
    """Test that logging configuration works correctly"""
    from app.core.logging import configure_logging
    
    # Configure logging
    configure_logging()
    
    # Verify logs directory exists
    log_dir = Path("logs")
    assert log_dir.exists(), "Logs directory should be created"
    assert log_dir.is_dir(), "Logs path should be a directory"
    
    # Verify log file exists
    log_file = log_dir / "app.log"
    assert log_file.exists(), "Log file should be created"


def test_standard_logging_works():
    """Test that standard logging.getLogger() works with new configuration"""
    from app.core.logging import configure_logging
    
    configure_logging()
    
    # Test standard logging (as used in existing services)
    logger = logging.getLogger("test_service")
    
    # These should not raise exceptions
    logger.debug("Debug message")
    logger.info("Info message")
    logger.warning("Warning message")
    logger.error("Error message")


def test_structlog_works():
    """Test that structlog works with new configuration"""
    from app.core.logging import configure_logging
    
    configure_logging()
    
    # Test structlog
    logger = structlog.get_logger("test_structlog")
    
    # These should not raise exceptions
    logger.debug("Debug message", key="value")
    logger.info("Info message", user_id="123")
    logger.warning("Warning message", code="WARN_001")
    logger.error("Error message", error_type="TestError")


def test_log_file_rotation_config():
    """Test that log rotation is configured correctly"""
    from app.core.logging import configure_logging
    import logging.handlers
    
    # Clear existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    
    configure_logging()
    
    # Find the RotatingFileHandler
    rotating_handler = None
    for handler in root_logger.handlers:
        if isinstance(handler, logging.handlers.RotatingFileHandler):
            rotating_handler = handler
            break
    
    assert rotating_handler is not None, "RotatingFileHandler should be configured"
    
    # Verify rotation settings
    assert rotating_handler.maxBytes == 100 * 1024 * 1024, "Max bytes should be 100MB"
    assert rotating_handler.backupCount == 14, "Backup count should be 14"


def test_log_level_based_on_environment():
    """Test that log level is set based on environment"""
    import importlib
    from app.core import config
    
    # Clear existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    
    # Test DEBUG mode
    original_debug = config.settings.DEBUG
    config.settings.DEBUG = True
    
    # Reload logging module to pick up new settings
    from app.core import logging as logging_module
    importlib.reload(logging_module)
    
    logging_module.configure_logging()
    root_logger = logging.getLogger()
    assert root_logger.level == logging.DEBUG, "Log level should be DEBUG when DEBUG=True"
    
    # Clear handlers again
    root_logger.handlers.clear()
    
    # Test INFO mode
    config.settings.DEBUG = False
    importlib.reload(logging_module)
    logging_module.configure_logging()
    root_logger = logging.getLogger()
    assert root_logger.level == logging.INFO, "Log level should be INFO when DEBUG=False"
    
    # Restore original setting
    config.settings.DEBUG = original_debug


def test_app_context_added_to_logs():
    """Test that application context is added to log entries"""
    from app.core.logging import add_app_context
    from app.core.config import settings
    
    event_dict = {"event": "test message"}
    result = add_app_context(None, None, event_dict)
    
    assert "service" in result, "Service should be in log entry"
    assert result["service"] == "rxdx-backend", "Service name should be rxdx-backend"
    assert "environment" in result, "Environment should be in log entry"
    assert result["environment"] == settings.ENVIRONMENT, "Environment should match settings"

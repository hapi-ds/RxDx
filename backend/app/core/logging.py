"""Structured logging configuration using structlog"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from typing import Any

import structlog
from structlog.types import EventDict, Processor

from app.core.config import settings


def add_app_context(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add application context to all log entries"""
    event_dict["service"] = "rxdx-backend"
    event_dict["environment"] = settings.ENVIRONMENT
    return event_dict


def configure_logging() -> None:
    """Configure structured logging for the application"""
    
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Determine log level based on environment
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Configure processors
    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        add_app_context,
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
        cache_logger_on_first_use=True,
    )
    
    # Configure formatters for different environments
    if settings.ENVIRONMENT == "development":
        # Pretty console output for development
        formatter = structlog.stdlib.ProcessorFormatter(
            processors=[
                structlog.stdlib.ProcessorFormatter.remove_processors_meta,
                structlog.dev.ConsoleRenderer(),
            ],
        )
    else:
        # JSON output for production
        formatter = structlog.stdlib.ProcessorFormatter(
            processors=[
                structlog.stdlib.ProcessorFormatter.remove_processors_meta,
                structlog.processors.JSONRenderer(),
            ],
        )
    
    # Configure standard library logging with rotation
    # Max 100MB per file, keep last 14 backup files (~7 days worth)
    file_handler = RotatingFileHandler(
        filename=log_dir / "app.log",
        maxBytes=100 * 1024 * 1024,  # 100MB
        backupCount=14,  # Keep ~7 days worth
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    
    # Console handler for development
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.addHandler(file_handler)
    if settings.DEBUG:
        root_logger.addHandler(console_handler)
    root_logger.setLevel(log_level)

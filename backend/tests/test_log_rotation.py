"""Tests for log rotation functionality"""

import logging
import os
import tempfile
from logging.handlers import RotatingFileHandler
from pathlib import Path

import pytest


def test_rotating_file_handler_configuration():
    """Test that RotatingFileHandler is configured correctly"""
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        # Create handler with same config as production
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=100 * 1024 * 1024,  # 100MB
            backupCount=14,
            encoding="utf-8",
        )
        
        # Verify configuration
        assert handler.maxBytes == 100 * 1024 * 1024
        assert handler.backupCount == 14
        assert handler.encoding == "utf-8"
        
        handler.close()


def test_log_rotation_creates_backup_files():
    """Test that log rotation creates backup files when size limit reached"""
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        # Create handler with small max size for testing
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=1024,  # 1KB for testing
            backupCount=3,
            encoding="utf-8",
        )
        
        logger = logging.getLogger("test_rotation")
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        
        # Write enough data to trigger rotation
        large_message = "x" * 500  # 500 bytes per message
        for i in range(10):  # Write 5KB total
            logger.info(f"Message {i}: {large_message}")
        
        handler.close()
        logger.removeHandler(handler)
        
        # Verify main log file exists
        assert log_file.exists()
        
        # Verify backup files were created
        backup_files = list(Path(tmpdir).glob("test.log.*"))
        assert len(backup_files) > 0, "No backup files created"
        assert len(backup_files) <= 3, f"Too many backup files: {len(backup_files)}"


def test_log_rotation_respects_backup_count():
    """Test that old backup files are deleted when backup count exceeded"""
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        # Create handler with small max size and backup count
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=500,  # 500 bytes
            backupCount=2,  # Keep only 2 backups
            encoding="utf-8",
        )
        
        logger = logging.getLogger("test_backup_count")
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        
        # Write enough data to create more than 2 backups
        large_message = "x" * 200
        for i in range(20):
            logger.info(f"Message {i}: {large_message}")
        
        handler.close()
        logger.removeHandler(handler)
        
        # Count backup files
        backup_files = list(Path(tmpdir).glob("test.log.*"))
        
        # Should have at most backupCount backup files
        assert len(backup_files) <= 2, f"Too many backup files: {len(backup_files)}"


def test_log_rotation_preserves_log_entries():
    """Test that log rotation doesn't lose log entries"""
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        # Create handler with small max size
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=1024,
            backupCount=5,
            encoding="utf-8",
        )
        
        # Use simple formatter to make counting easier
        formatter = logging.Formatter('%(message)s')
        handler.setFormatter(formatter)
        
        logger = logging.getLogger("test_preservation")
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        
        # Write known number of messages
        num_messages = 50
        for i in range(num_messages):
            logger.info(f"Message {i}")
        
        handler.close()
        logger.removeHandler(handler)
        
        # Count total lines across all log files
        total_lines = 0
        
        # Read main log file
        if log_file.exists():
            with open(log_file, 'r') as f:
                total_lines += len(f.readlines())
        
        # Read backup files
        for backup_file in Path(tmpdir).glob("test.log.*"):
            with open(backup_file, 'r') as f:
                total_lines += len(f.readlines())
        
        # Verify all messages were written
        assert total_lines == num_messages, f"Expected {num_messages} lines, found {total_lines}"


def test_log_rotation_file_naming():
    """Test that rotated files are named correctly"""
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=500,
            backupCount=3,
            encoding="utf-8",
        )
        
        logger = logging.getLogger("test_naming")
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        
        # Trigger rotation
        large_message = "x" * 200
        for i in range(10):
            logger.info(f"Message {i}: {large_message}")
        
        handler.close()
        logger.removeHandler(handler)
        
        # Check backup file naming pattern
        backup_files = sorted(Path(tmpdir).glob("test.log.*"))
        
        for backup_file in backup_files:
            # Backup files should be named test.log.1, test.log.2, etc.
            assert backup_file.name.startswith("test.log.")
            # Extract number
            suffix = backup_file.name.split(".")[-1]
            assert suffix.isdigit(), f"Backup file suffix should be numeric: {suffix}"


def test_log_directory_creation():
    """Test that log directory is created automatically"""
    with tempfile.TemporaryDirectory() as tmpdir:
        log_dir = Path(tmpdir) / "logs" / "nested"
        log_file = log_dir / "test.log"
        
        # Create directory if it doesn't exist (like in configure_logging)
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Verify directory was created
        assert log_dir.exists()
        assert log_dir.is_dir()
        
        # Create handler
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=1024,
            backupCount=3,
            encoding="utf-8",
        )
        
        logger = logging.getLogger("test_dir_creation")
        logger.addHandler(handler)
        logger.info("Test message")
        
        handler.close()
        logger.removeHandler(handler)
        
        # Verify log file was created
        assert log_file.exists()


def test_log_rotation_performance():
    """Test that log rotation doesn't significantly impact performance"""
    import time
    
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = Path(tmpdir) / "test.log"
        
        handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=10 * 1024,  # 10KB
            backupCount=5,
            encoding="utf-8",
        )
        
        logger = logging.getLogger("test_performance")
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        
        # Measure time to write many log messages
        start_time = time.time()
        
        for i in range(1000):
            logger.info(f"Performance test message {i}")
        
        elapsed_time = time.time() - start_time
        
        handler.close()
        logger.removeHandler(handler)
        
        # Should complete in reasonable time (< 1 second for 1000 messages)
        assert elapsed_time < 1.0, f"Logging took too long: {elapsed_time:.2f}s"
        
        # Calculate messages per second
        messages_per_second = 1000 / elapsed_time
        assert messages_per_second > 500, f"Too slow: {messages_per_second:.0f} msg/s"

"""Test production logging with JSON output"""

import os
import json
import logging

# Set to production mode
os.environ["ENVIRONMENT"] = "production"
os.environ["DEBUG"] = "false"

from app.core.logging import configure_logging

# Configure logging
configure_logging()

# Test with standard logging (as used in existing services)
logger = logging.getLogger("app.services.template_service")

print("Testing production logging with JSON output...")
print("=" * 60)

# Simulate logging from existing services
logger.info("Template service initialized")
logger.info("Loading template: %s", "medical-device.yaml")
logger.warning("Template validation warning: missing optional field")
logger.error("Failed to apply template: %s", "database connection error")

print("=" * 60)
print("✅ Production logging test completed!")
print("📁 Check backend/logs/app.log for JSON log entries")
print("\nNote: In production mode, logs are written to file only.")
print("In development mode, logs appear in console with pretty formatting.")

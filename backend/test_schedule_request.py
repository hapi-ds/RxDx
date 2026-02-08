#!/usr/bin/env python3
"""Test script to see schedule calculation validation errors"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.schemas.schedule import ScheduleRequest, ScheduleTaskCreate, ScheduleConstraints
from uuid import UUID
from pydantic import ValidationError


async def test_request():
    """Test creating a schedule request"""
    
    # Sample task data (similar to what frontend sends)
    task_data = {
        "id": "test-task-1",
        "title": "Test Task",
        "estimated_hours": 8,
        "dependencies": [],
        "required_resources": [],
        "resource_demand": {},  # Empty dict
        "priority": 3,
    }
    
    try:
        # Try to create a task
        task = ScheduleTaskCreate(**task_data)
        print(f"✓ Task created successfully: {task.id}")
        
        # Try to create a request
        request_data = {
            "project_id": UUID("00000000-0000-0000-0000-000000000001"),
            "tasks": [task],
            "resources": [],
            "constraints": {
                "horizon_days": 365,
                "working_hours_per_day": 8,
            }
        }
        
        request = ScheduleRequest(**request_data)
        print(f"✓ Request created successfully")
        print(f"  Project ID: {request.project_id}")
        print(f"  Tasks: {len(request.tasks)}")
        print(f"  Resources: {len(request.resources)}")
        
    except ValidationError as e:
        print("✗ Validation Error:")
        for error in e.errors():
            print(f"  Field: {error['loc']}")
            print(f"  Error: {error['msg']}")
            print(f"  Type: {error['type']}")
            print()


if __name__ == "__main__":
    asyncio.run(test_request())

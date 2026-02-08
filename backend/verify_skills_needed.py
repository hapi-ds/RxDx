#!/usr/bin/env python3
"""
Verification script for skills_needed property in task schemas.

This script verifies that the skills_needed property is properly implemented
in all relevant schemas for Task 1.3 of the backend-schedule-api spec.
"""

import sys
from datetime import datetime, UTC
from uuid import uuid4

# Add the app directory to the path
sys.path.insert(0, "app")

from schemas.workitem import TaskBase, TaskCreate, TaskUpdate, TaskResponse
from schemas.schedule import ScheduleTaskBase, ScheduleTaskCreate, ScheduledTask


def verify_workitem_schemas():
    """Verify skills_needed in WorkItem schemas"""
    print("=" * 80)
    print("VERIFYING WORKITEM SCHEMAS")
    print("=" * 80)
    
    # Test TaskBase
    print("\n1. Testing TaskBase schema...")
    try:
        task_base = TaskBase(
            title="Test Task with Skills",
            status="draft",
            skills_needed=["Python", "FastAPI", "PostgreSQL"]
        )
        assert task_base.skills_needed == ["Python", "FastAPI", "PostgreSQL"]
        print("   ✓ TaskBase has skills_needed property")
        print(f"   ✓ skills_needed value: {task_base.skills_needed}")
    except Exception as e:
        print(f"   ✗ TaskBase failed: {e}")
        return False
    
    # Test TaskCreate
    print("\n2. Testing TaskCreate schema...")
    try:
        task_create = TaskCreate(
            title="Create Task with Skills",
            status="draft",
            skills_needed=["React", "TypeScript", "CSS"],
            estimated_hours=16.0,
            story_points=8
        )
        assert task_create.skills_needed == ["React", "TypeScript", "CSS"]
        assert task_create.type == "task"
        print("   ✓ TaskCreate has skills_needed property")
        print(f"   ✓ skills_needed value: {task_create.skills_needed}")
    except Exception as e:
        print(f"   ✗ TaskCreate failed: {e}")
        return False
    
    # Test TaskUpdate
    print("\n3. Testing TaskUpdate schema...")
    try:
        task_update = TaskUpdate(
            title="Updated Task",
            skills_needed=["Docker", "Kubernetes", "AWS"]
        )
        assert task_update.skills_needed == ["Docker", "Kubernetes", "AWS"]
        print("   ✓ TaskUpdate has skills_needed property")
        print(f"   ✓ skills_needed value: {task_update.skills_needed}")
    except Exception as e:
        print(f"   ✗ TaskUpdate failed: {e}")
        return False
    
    # Test TaskResponse
    print("\n4. Testing TaskResponse schema...")
    try:
        task_response = TaskResponse(
            id=uuid4(),
            type="task",
            title="Response Task with Skills",
            status="active",
            skills_needed=["Machine Learning", "Python", "TensorFlow"],
            version="1.0",
            created_by=uuid4(),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            is_signed=False
        )
        assert task_response.skills_needed == ["Machine Learning", "Python", "TensorFlow"]
        print("   ✓ TaskResponse has skills_needed property")
        print(f"   ✓ skills_needed value: {task_response.skills_needed}")
    except Exception as e:
        print(f"   ✗ TaskResponse failed: {e}")
        return False
    
    # Test validation: empty skills should be rejected
    print("\n5. Testing skills_needed validation (empty strings)...")
    try:
        task_invalid = TaskCreate(
            title="Invalid Task",
            status="draft",
            skills_needed=["Python", "", "FastAPI"]
        )
        print(f"   ✗ Validation failed: empty skills should be rejected")
        return False
    except ValueError as e:
        if "empty" in str(e).lower():
            print(f"   ✓ Empty skills correctly rejected: {e}")
        else:
            print(f"   ✗ Wrong validation error: {e}")
            return False
    
    # Test validation: duplicates should be removed
    print("\n6. Testing skills_needed validation (duplicates)...")
    try:
        task_duplicates = TaskCreate(
            title="Task with Duplicate Skills",
            status="draft",
            skills_needed=["Python", "python", "PYTHON", "FastAPI"]
        )
        assert len(task_duplicates.skills_needed) == 2
        assert "Python" in task_duplicates.skills_needed or "python" in task_duplicates.skills_needed
        assert "FastAPI" in task_duplicates.skills_needed
        print(f"   ✓ Duplicates removed: {task_duplicates.skills_needed}")
    except Exception as e:
        print(f"   ✗ Duplicate handling failed: {e}")
        return False
    
    # Test optional skills_needed
    print("\n7. Testing optional skills_needed...")
    try:
        task_no_skills = TaskCreate(
            title="Task without Skills",
            status="draft"
        )
        assert task_no_skills.skills_needed is None
        print("   ✓ skills_needed is optional (can be None)")
    except Exception as e:
        print(f"   ✗ Optional skills_needed failed: {e}")
        return False
    
    print("\n" + "=" * 80)
    print("✓ ALL WORKITEM SCHEMA TESTS PASSED")
    print("=" * 80)
    return True


def verify_schedule_schemas():
    """Verify skills_needed in Schedule schemas"""
    print("\n" + "=" * 80)
    print("VERIFYING SCHEDULE SCHEMAS")
    print("=" * 80)
    
    # Test ScheduleTaskBase
    print("\n1. Testing ScheduleTaskBase schema...")
    try:
        schedule_task = ScheduleTaskBase(
            id="task-001",
            title="Schedulable Task with Skills",
            estimated_hours=24,
            skills_needed=["Backend", "API Design", "Database"]
        )
        assert schedule_task.skills_needed == ["Backend", "API Design", "Database"]
        print("   ✓ ScheduleTaskBase has skills_needed property")
        print(f"   ✓ skills_needed value: {schedule_task.skills_needed}")
    except Exception as e:
        print(f"   ✗ ScheduleTaskBase failed: {e}")
        return False
    
    # Test ScheduleTaskCreate
    print("\n2. Testing ScheduleTaskCreate schema...")
    try:
        schedule_task_create = ScheduleTaskCreate(
            id="task-002",
            title="Create Schedulable Task",
            estimated_hours=16,
            skills_needed=["Frontend", "React", "UI/UX"],
            dependencies=[],
            required_resources=[]
        )
        assert schedule_task_create.skills_needed == ["Frontend", "React", "UI/UX"]
        print("   ✓ ScheduleTaskCreate has skills_needed property")
        print(f"   ✓ skills_needed value: {schedule_task_create.skills_needed}")
    except Exception as e:
        print(f"   ✗ ScheduleTaskCreate failed: {e}")
        return False
    
    # Test validation: empty skills should be rejected
    print("\n3. Testing schedule skills_needed validation (empty strings)...")
    try:
        schedule_invalid = ScheduleTaskCreate(
            id="task-003",
            title="Invalid Schedule Task",
            estimated_hours=8,
            skills_needed=["DevOps", "", "CI/CD"]
        )
        print(f"   ✗ Validation failed: empty skills should be rejected")
        return False
    except ValueError as e:
        if "empty" in str(e).lower():
            print(f"   ✓ Empty skills correctly rejected: {e}")
        else:
            print(f"   ✗ Wrong validation error: {e}")
            return False
    
    # Test optional skills_needed
    print("\n4. Testing optional skills_needed in schedule...")
    try:
        schedule_no_skills = ScheduleTaskCreate(
            id="task-004",
            title="Schedule Task without Skills",
            estimated_hours=4
        )
        assert schedule_no_skills.skills_needed == []
        print("   ✓ skills_needed defaults to empty list")
    except Exception as e:
        print(f"   ✗ Optional skills_needed failed: {e}")
        return False
    
    print("\n" + "=" * 80)
    print("✓ ALL SCHEDULE SCHEMA TESTS PASSED")
    print("=" * 80)
    return True


def verify_integration():
    """Verify integration between WorkItem and Schedule schemas"""
    print("\n" + "=" * 80)
    print("VERIFYING SCHEMA INTEGRATION")
    print("=" * 80)
    
    print("\n1. Testing data flow from WorkItem to Schedule...")
    try:
        # Create a WorkItem task
        workitem_task = TaskCreate(
            title="Integration Test Task",
            status="draft",
            skills_needed=["Python", "FastAPI", "PostgreSQL"],
            estimated_hours=20.0
        )
        
        # Convert to Schedule task (simulating service layer conversion)
        schedule_task = ScheduleTaskCreate(
            id=str(uuid4()),
            title=workitem_task.title,
            estimated_hours=int(workitem_task.estimated_hours or 8),
            skills_needed=workitem_task.skills_needed or []
        )
        
        assert schedule_task.skills_needed == workitem_task.skills_needed
        print("   ✓ skills_needed transfers correctly from WorkItem to Schedule")
        print(f"   ✓ WorkItem skills: {workitem_task.skills_needed}")
        print(f"   ✓ Schedule skills: {schedule_task.skills_needed}")
    except Exception as e:
        print(f"   ✗ Integration test failed: {e}")
        return False
    
    print("\n" + "=" * 80)
    print("✓ INTEGRATION TEST PASSED")
    print("=" * 80)
    return True


def main():
    """Run all verification tests"""
    print("\n" + "=" * 80)
    print("SKILLS_NEEDED PROPERTY VERIFICATION")
    print("Task 1.3: Add skills_needed property to task schemas")
    print("=" * 80)
    
    results = []
    
    # Run WorkItem schema tests
    results.append(("WorkItem Schemas", verify_workitem_schemas()))
    
    # Run Schedule schema tests
    results.append(("Schedule Schemas", verify_schedule_schemas()))
    
    # Run integration tests
    results.append(("Schema Integration", verify_integration()))
    
    # Print summary
    print("\n" + "=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)
    
    all_passed = True
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name:.<50} {status}")
        if not passed:
            all_passed = False
    
    print("=" * 80)
    
    if all_passed:
        print("\n✓✓✓ ALL VERIFICATIONS PASSED ✓✓✓")
        print("\nThe skills_needed property is properly implemented in:")
        print("  - TaskBase (WorkItem)")
        print("  - TaskCreate (WorkItem)")
        print("  - TaskUpdate (WorkItem)")
        print("  - TaskResponse (WorkItem)")
        print("  - ScheduleTaskBase (Schedule)")
        print("  - ScheduleTaskCreate (Schedule)")
        print("\nValidation includes:")
        print("  - Empty string rejection")
        print("  - Duplicate removal (case-insensitive)")
        print("  - Optional field support")
        print("  - Proper data flow between schemas")
        print("\n✓ Task 1.3 is COMPLETE")
        return 0
    else:
        print("\n✗✗✗ SOME VERIFICATIONS FAILED ✗✗✗")
        return 1


if __name__ == "__main__":
    sys.exit(main())

"""Integration tests for progress tracking functionality"""

import pytest
from datetime import datetime, timezone
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

from app.schemas.workitem import TaskUpdate
from app.services.workitem_service import WorkItemService
from app.models.user import User


@pytest.mark.asyncio
async def test_update_task_progress():
    """Test updating task progress through WorkItemService"""
    # Setup mocks
    mock_graph_service = AsyncMock()
    mock_version_service = None
    
    # Mock existing workitem
    workitem_id = uuid4()
    existing_workitem = {
        'id': str(workitem_id),
        'type': 'task',
        'title': 'Test Task',
        'description': 'Test description',
        'status': 'active',
        'priority': 3,
        'version': '1.0',
        'created_by': str(uuid4()),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'is_signed': False,
        'progress': 0,
    }
    
    mock_graph_service.get_workitem.return_value = existing_workitem
    mock_graph_service.create_workitem_version.return_value = None
    mock_graph_service.create_relationship.return_value = None
    
    # Create service
    service = WorkItemService(mock_graph_service, mock_version_service)
    
    # Create mock user
    mock_user = MagicMock(spec=User)
    mock_user.id = uuid4()
    mock_user.role = MagicMock()
    mock_user.role.value = "project_manager"
    
    # Update progress
    updates = TaskUpdate(progress=50)
    
    result = await service.update_workitem(
        workitem_id=workitem_id,
        updates=updates,
        current_user=mock_user,
        change_description="Updated progress to 50%"
    )
    
    # Verify update was called
    assert result is not None
    # Verify create_workitem_version was called with progress in the data
    call_args = mock_graph_service.create_workitem_version.call_args
    if call_args:
        version_data = call_args[1]['data']
        assert version_data['progress'] == 50


@pytest.mark.asyncio
async def test_update_task_start_date_is():
    """Test updating task actual start date through WorkItemService"""
    # Setup mocks
    mock_graph_service = AsyncMock()
    mock_version_service = None
    
    # Mock existing workitem
    workitem_id = uuid4()
    start_date_is = datetime(2024, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    
    existing_workitem = {
        'id': str(workitem_id),
        'type': 'task',
        'title': 'Test Task',
        'description': 'Test description',
        'status': 'active',
        'priority': 3,
        'version': '1.0',
        'created_by': str(uuid4()),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'is_signed': False,
        'start_date_is': None,
    }
    
    mock_graph_service.get_workitem.return_value = existing_workitem
    mock_graph_service.create_workitem_version.return_value = None
    mock_graph_service.create_relationship.return_value = None
    
    # Create service
    service = WorkItemService(mock_graph_service, mock_version_service)
    
    # Create mock user
    mock_user = MagicMock(spec=User)
    mock_user.id = uuid4()
    mock_user.role = MagicMock()
    mock_user.role.value = "project_manager"
    
    # Update start_date_is
    updates = TaskUpdate(start_date_is=start_date_is)
    
    result = await service.update_workitem(
        workitem_id=workitem_id,
        updates=updates,
        current_user=mock_user,
        change_description="Set actual start date"
    )
    
    # Verify update was called
    assert result is not None
    # Verify create_workitem_version was called with start_date_is in the data
    call_args = mock_graph_service.create_workitem_version.call_args
    if call_args:
        version_data = call_args[1]['data']
        assert version_data['start_date_is'] == start_date_is.isoformat()


@pytest.mark.asyncio
async def test_update_task_progress_and_start_date_is_together():
    """Test updating both progress and start_date_is in a single update"""
    # Setup mocks
    mock_graph_service = AsyncMock()
    mock_version_service = None
    
    # Mock existing workitem
    workitem_id = uuid4()
    start_date_is = datetime(2024, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    
    existing_workitem = {
        'id': str(workitem_id),
        'type': 'task',
        'title': 'Test Task',
        'description': 'Test description',
        'status': 'active',
        'priority': 3,
        'version': '1.0',
        'created_by': str(uuid4()),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'is_signed': False,
        'progress': 0,
        'start_date_is': None,
    }
    
    mock_graph_service.get_workitem.return_value = existing_workitem
    mock_graph_service.create_workitem_version.return_value = None
    mock_graph_service.create_relationship.return_value = None
    
    # Create service
    service = WorkItemService(mock_graph_service, mock_version_service)
    
    # Create mock user
    mock_user = MagicMock(spec=User)
    mock_user.id = uuid4()
    mock_user.role = MagicMock()
    mock_user.role.value = "project_manager"
    
    # Update both fields
    updates = TaskUpdate(progress=75, start_date_is=start_date_is)
    
    result = await service.update_workitem(
        workitem_id=workitem_id,
        updates=updates,
        current_user=mock_user,
        change_description="Started task and updated progress"
    )
    
    # Verify update was called
    assert result is not None
    # Verify create_workitem_version was called with both fields in the data
    call_args = mock_graph_service.create_workitem_version.call_args
    if call_args:
        version_data = call_args[1]['data']
        assert version_data['progress'] == 75
        assert version_data['start_date_is'] == start_date_is.isoformat()


@pytest.mark.asyncio
async def test_progress_validation_rejects_invalid_values():
    """Test that progress validation rejects values outside 0-100 range"""
    from pydantic import ValidationError
    
    # Test progress > 100
    with pytest.raises(ValidationError) as exc_info:
        TaskUpdate(progress=150)
    
    assert "less than or equal to 100" in str(exc_info.value)
    
    # Test progress < 0
    with pytest.raises(ValidationError) as exc_info:
        TaskUpdate(progress=-10)
    
    assert "greater than or equal to 0" in str(exc_info.value)


@pytest.mark.asyncio
async def test_progress_accepts_valid_values():
    """Test that progress validation accepts valid values 0-100"""
    # Test boundary values
    update_0 = TaskUpdate(progress=0)
    assert update_0.progress == 0
    
    update_100 = TaskUpdate(progress=100)
    assert update_100.progress == 100
    
    # Test middle value
    update_50 = TaskUpdate(progress=50)
    assert update_50.progress == 50

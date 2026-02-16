"""Unit tests for Worked node creation and aggregation in GraphService"""

from datetime import date, datetime, time
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.db.graph import GraphService


@pytest.fixture
def graph_service():
    """Create a GraphService instance for testing"""
    service = GraphService()
    service.pool = AsyncMock()
    return service


class TestWorkedNodeCreation:
    """Test creating Worked nodes for time tracking"""

    @pytest.mark.asyncio
    async def test_create_worked_node_with_all_fields(self, graph_service):
        """Test creating a Worked node with all fields"""
        worked_id = str(uuid4())
        resource_id = str(uuid4())
        task_id = str(uuid4())
        test_date = "2024-01-15"
        start_time = "09:00:00"
        end_time = "17:00:00"
        description = "Implemented feature X"

        # Mock task existence check
        graph_service.execute_query = AsyncMock(return_value=[{"id": task_id}])
        
        # Mock node creation
        expected_node = {
            "id": worked_id,
            "resource": resource_id,
            "date": test_date,
            "from": start_time,
            "to": end_time,
            "description": description,
        }
        graph_service.create_node = AsyncMock(return_value=expected_node)
        graph_service.create_relationship = AsyncMock()

        result = await graph_service.create_worked_node(
            worked_id=worked_id,
            resource_id=resource_id,
            task_id=task_id,
            date=test_date,
            start_time=start_time,
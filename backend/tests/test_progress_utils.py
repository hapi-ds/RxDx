"""Unit tests for progress tracking utilities"""

import pytest
from datetime import datetime, timezone
from uuid import uuid4

from app.utils.progress_utils import (
    calculate_workpackage_progress,
    calculate_phase_progress,
    calculate_project_progress,
    calculate_variance_days,
    update_entity_progress,
)


class MockGraphService:
    """Mock GraphService for testing"""
    
    def __init__(self):
        self.query_results = {}
        self.executed_queries = []
    
    def set_query_result(self, query_pattern: str, result: list):
        """Set mock result for a query pattern"""
        self.query_results[query_pattern] = result
    
    async def execute_query(self, query: str):
        """Execute a mock query"""
        self.executed_queries.append(query)
        
        # Match query patterns
        for pattern, result in self.query_results.items():
            if pattern in query:
                return result
        
        return []


@pytest.mark.asyncio
async def test_calculate_workpackage_progress_with_tasks():
    """Test workpackage progress calculation with multiple tasks"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Mock tasks with different progress and effort
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        [
            {'progress': 100, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 50, 'effort': 20.0, 'estimated_hours': None},
            {'progress': 0, 'effort': 10.0, 'estimated_hours': None},
        ]
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    # Expected: (100*10 + 50*20 + 0*10) / (10+20+10) = 2000/40 = 50
    assert progress == 50


@pytest.mark.asyncio
async def test_calculate_workpackage_progress_no_tasks():
    """Test workpackage progress calculation with no tasks"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # No tasks
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        []
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    assert progress == 0


@pytest.mark.asyncio
async def test_calculate_workpackage_progress_uses_estimated_hours_fallback():
    """Test workpackage progress uses estimated_hours when effort is not available"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Mock tasks with estimated_hours instead of effort
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        [
            {'progress': 100, 'effort': None, 'estimated_hours': 10.0},
            {'progress': 0, 'effort': None, 'estimated_hours': 10.0},
        ]
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    # Expected: (100*10 + 0*10) / (10+10) = 1000/20 = 50
    assert progress == 50


@pytest.mark.asyncio
async def test_calculate_workpackage_progress_handles_null_progress():
    """Test workpackage progress handles null progress values"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Mock tasks with null progress
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        [
            {'progress': None, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 50, 'effort': 10.0, 'estimated_hours': None},
        ]
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    # Expected: (0*10 + 50*10) / (10+10) = 500/20 = 25
    assert progress == 25


@pytest.mark.asyncio
async def test_calculate_phase_progress_with_workpackages():
    """Test phase progress calculation with multiple workpackages"""
    graph_service = MockGraphService()
    phase_id = uuid4()
    wp1_id = uuid4()
    wp2_id = uuid4()
    
    # Mock workpackages
    graph_service.set_query_result(
        f"MATCH (p:Phase {{id: '{str(phase_id)}'}})<-[:BELONGS_TO]-(wp:Workpackage)",
        [
            {'workpackage_id': str(wp1_id), 'progress': 100},
            {'workpackage_id': str(wp2_id), 'progress': 0},
        ]
    )
    
    # Mock effort for workpackages
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(wp1_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        [{'total_effort': 20.0}]
    )
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(wp2_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        [{'total_effort': 20.0}]
    )
    
    progress = await calculate_phase_progress(phase_id, graph_service)
    
    # Expected: (100*20 + 0*20) / (20+20) = 2000/40 = 50
    assert progress == 50


@pytest.mark.asyncio
async def test_calculate_project_progress_with_phases():
    """Test project progress calculation with multiple phases"""
    graph_service = MockGraphService()
    project_id = uuid4()
    phase1_id = uuid4()
    phase2_id = uuid4()
    
    # Mock phases
    graph_service.set_query_result(
        f"MATCH (proj:Project {{id: '{str(project_id)}'}})<-[:BELONGS_TO]-(p:Phase)",
        [
            {'phase_id': str(phase1_id), 'progress': 100},
            {'phase_id': str(phase2_id), 'progress': 50},
        ]
    )
    
    # Mock effort for phases
    graph_service.set_query_result(
        f"MATCH (p:Phase {{id: '{str(phase1_id)}'}})<-[:BELONGS_TO]-(wp:Workpackage)<-[:BELONGS_TO]-(t:Task)",
        [{'total_effort': 30.0}]
    )
    graph_service.set_query_result(
        f"MATCH (p:Phase {{id: '{str(phase2_id)}'}})<-[:BELONGS_TO]-(wp:Workpackage)<-[:BELONGS_TO]-(t:Task)",
        [{'total_effort': 30.0}]
    )
    
    progress = await calculate_project_progress(project_id, graph_service)
    
    # Expected: (100*30 + 50*30) / (30+30) = 4500/60 = 75
    assert progress == 75


def test_calculate_variance_days_positive():
    """Test variance calculation with positive delay"""
    entity_data = {
        'start_date': '2024-01-01T00:00:00Z',
        'start_date_is': '2024-01-11T00:00:00Z',
    }
    
    variance = calculate_variance_days(entity_data)
    
    # Started 10 days late
    assert variance == 10


def test_calculate_variance_days_negative():
    """Test variance calculation with negative delay (early start)"""
    entity_data = {
        'start_date': '2024-01-11T00:00:00Z',
        'start_date_is': '2024-01-01T00:00:00Z',
    }
    
    variance = calculate_variance_days(entity_data)
    
    # Started 10 days early
    assert variance == -10


def test_calculate_variance_days_uses_calculated_start_date():
    """Test variance calculation uses calculated_start_date as fallback"""
    entity_data = {
        'calculated_start_date': '2024-01-01T00:00:00Z',
        'start_date_is': '2024-01-06T00:00:00Z',
    }
    
    variance = calculate_variance_days(entity_data)
    
    # Started 5 days late
    assert variance == 5


def test_calculate_variance_days_missing_start_date_is():
    """Test variance calculation returns None when start_date_is is missing"""
    entity_data = {
        'start_date': '2024-01-01T00:00:00Z',
    }
    
    variance = calculate_variance_days(entity_data)
    
    assert variance is None


def test_calculate_variance_days_missing_start_date():
    """Test variance calculation returns None when start_date is missing"""
    entity_data = {
        'start_date_is': '2024-01-01T00:00:00Z',
    }
    
    variance = calculate_variance_days(entity_data)
    
    assert variance is None


def test_calculate_variance_days_invalid_date_format():
    """Test variance calculation handles invalid date formats"""
    entity_data = {
        'start_date': 'invalid-date',
        'start_date_is': '2024-01-01T00:00:00Z',
    }
    
    variance = calculate_variance_days(entity_data)
    
    assert variance is None


@pytest.mark.asyncio
async def test_update_entity_progress_workpackage():
    """Test updating workpackage progress"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Mock tasks
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        [
            {'progress': 100, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 0, 'effort': 10.0, 'estimated_hours': None},
        ]
    )
    
    # Mock update result
    graph_service.set_query_result(
        f"MATCH (n:Workpackage {{id: '{str(workpackage_id)}'}})",
        [{'progress': 50}]
    )
    
    progress = await update_entity_progress(workpackage_id, 'workpackage', graph_service)
    
    assert progress == 50
    # Verify update query was executed
    assert any('SET n.progress' in query for query in graph_service.executed_queries)


@pytest.mark.asyncio
async def test_update_entity_progress_invalid_type():
    """Test updating entity progress with invalid type"""
    graph_service = MockGraphService()
    entity_id = uuid4()
    
    with pytest.raises(ValueError, match="Invalid entity_type"):
        await update_entity_progress(entity_id, 'invalid_type', graph_service)


@pytest.mark.asyncio
async def test_progress_always_between_0_and_100():
    """Property test: Progress is always between 0 and 100"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Test with extreme values
    test_cases = [
        [{'progress': 0, 'effort': 10.0, 'estimated_hours': None}],
        [{'progress': 100, 'effort': 10.0, 'estimated_hours': None}],
        [{'progress': 50, 'effort': 10.0, 'estimated_hours': None}],
        [
            {'progress': 100, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 100, 'effort': 10.0, 'estimated_hours': None},
        ],
        [
            {'progress': 0, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 0, 'effort': 10.0, 'estimated_hours': None},
        ],
    ]
    
    for tasks in test_cases:
        graph_service.set_query_result(
            f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
            tasks
        )
        
        progress = await calculate_workpackage_progress(workpackage_id, graph_service)
        
        assert 0 <= progress <= 100, f"Progress {progress} is not between 0 and 100"


@pytest.mark.asyncio
async def test_aggregated_progress_matches_child_progress():
    """Property test: Aggregated progress matches child entity progress"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # All tasks at 100% should result in 100% workpackage progress
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        [
            {'progress': 100, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 100, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 100, 'effort': 10.0, 'estimated_hours': None},
        ]
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    assert progress == 100
    
    # All tasks at 0% should result in 0% workpackage progress
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        [
            {'progress': 0, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 0, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 0, 'effort': 10.0, 'estimated_hours': None},
        ]
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    assert progress == 0
    
    # All tasks at 50% should result in 50% workpackage progress
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        [
            {'progress': 50, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 50, 'effort': 10.0, 'estimated_hours': None},
            {'progress': 50, 'effort': 10.0, 'estimated_hours': None},
        ]
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    assert progress == 50

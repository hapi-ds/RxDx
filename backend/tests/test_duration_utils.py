"""Unit tests for duration calculation utilities"""

from uuid import uuid4

import pytest

from app.utils.duration_utils import (
    calculate_phase_duration,
    calculate_workpackage_duration,
    enforce_minimal_duration,
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


def test_enforce_minimal_duration_no_minimal():
    """Test enforce_minimal_duration when entity has no minimal_duration"""
    entity = {}
    calculated = 10

    result = enforce_minimal_duration(entity, calculated)

    assert result == calculated


def test_enforce_minimal_duration_calculated_greater():
    """Test enforce_minimal_duration when calculated > minimal"""
    entity = {"minimal_duration": 5}
    calculated = 10

    result = enforce_minimal_duration(entity, calculated)

    assert result == calculated


def test_enforce_minimal_duration_minimal_greater():
    """Test enforce_minimal_duration when minimal > calculated"""
    entity = {"minimal_duration": 15}
    calculated = 10

    result = enforce_minimal_duration(entity, calculated)

    assert result == 15


def test_enforce_minimal_duration_equal():
    """Test enforce_minimal_duration when minimal == calculated"""
    entity = {"minimal_duration": 10}
    calculated = 10

    result = enforce_minimal_duration(entity, calculated)

    assert result == 10


def test_enforce_minimal_duration_zero_minimal():
    """Test enforce_minimal_duration when minimal_duration is 0"""
    entity = {"minimal_duration": 0}
    calculated = 10

    result = enforce_minimal_duration(entity, calculated)

    assert result == calculated


def test_enforce_minimal_duration_negative_minimal():
    """Test enforce_minimal_duration when minimal_duration is negative"""
    entity = {"minimal_duration": -5}
    calculated = 10

    result = enforce_minimal_duration(entity, calculated)

    assert result == calculated


@pytest.mark.asyncio
async def test_calculate_workpackage_duration_with_tasks():
    """Test workpackage duration calculation with tasks"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()

    # Mock workpackage with minimal_duration
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [{"minimal_duration": 10}],
    )

    # Mock tasks with durations
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [
            {"duration": 5},
            {"duration": 7},
            {"duration": 3},
        ],
    )

    duration = await calculate_workpackage_duration(workpackage_id, graph_service)

    # Expected: sum of task durations (5+7+3=15) > minimal_duration (10)
    assert duration == 15


@pytest.mark.asyncio
async def test_calculate_workpackage_duration_no_tasks():
    """Test workpackage duration calculation with no tasks"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()

    # Mock workpackage with minimal_duration
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [{"minimal_duration": 10}],
    )

    # No tasks
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [],
    )

    duration = await calculate_workpackage_duration(workpackage_id, graph_service)

    # Expected: minimal_duration (10)
    assert duration == 10


@pytest.mark.asyncio
async def test_calculate_workpackage_duration_enforces_minimal():
    """Test workpackage duration enforces minimal_duration when calculated is less"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()

    # Mock workpackage with minimal_duration
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [{"minimal_duration": 20}],
    )

    # Mock tasks with small durations
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [
            {"duration": 3},
            {"duration": 2},
        ],
    )

    duration = await calculate_workpackage_duration(workpackage_id, graph_service)

    # Expected: minimal_duration (20) > calculated (5)
    assert duration == 20


@pytest.mark.asyncio
async def test_calculate_workpackage_duration_handles_null_durations():
    """Test workpackage duration handles null task durations"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()

    # Mock workpackage with minimal_duration
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [{"minimal_duration": 5}],
    )

    # Mock tasks with null durations
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [
            {"duration": None},
            {"duration": 3},
            {"duration": None},
        ],
    )

    duration = await calculate_workpackage_duration(workpackage_id, graph_service)

    # Expected: minimal_duration (5) > calculated (3)
    assert duration == 5


@pytest.mark.asyncio
async def test_calculate_workpackage_duration_no_minimal():
    """Test workpackage duration with no minimal_duration set"""
    graph_service = MockGraphService()
    workpackage_id = uuid4()

    # Mock workpackage without minimal_duration
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [{"minimal_duration": None}],
    )

    # Mock tasks
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [
            {"duration": 5},
            {"duration": 7},
        ],
    )

    duration = await calculate_workpackage_duration(workpackage_id, graph_service)

    # Expected: sum of task durations (12)
    assert duration == 12


@pytest.mark.asyncio
async def test_calculate_phase_duration_with_workpackages():
    """Test phase duration calculation with workpackages and tasks"""
    graph_service = MockGraphService()
    phase_id = uuid4()
    wp1_id = uuid4()
    wp2_id = uuid4()

    # Mock phase with minimal_duration
    graph_service.set_query_result(
        f"MATCH (ph:Phase {{id: '{str(phase_id)}'}})", [{"minimal_duration": 20}]
    )

    # Mock workpackages
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage)-[:BELONGS_TO]->(ph:Phase {{id: '{str(phase_id)}'}})",
        [
            {"workpackage_id": str(wp1_id), "wp_minimal_duration": 5},
            {"workpackage_id": str(wp2_id), "wp_minimal_duration": 5},
        ],
    )

    # Mock tasks for wp1
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(wp1_id)}'}})",
        [
            {"duration": 10},
            {"duration": 5},
        ],
    )

    # Mock tasks for wp2
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(wp2_id)}'}})",
        [
            {"duration": 8},
            {"duration": 7},
        ],
    )

    duration = await calculate_phase_duration(phase_id, graph_service)

    # Expected: wp1 (15) + wp2 (15) = 30 > phase minimal (20)
    assert duration == 30


@pytest.mark.asyncio
async def test_calculate_phase_duration_no_workpackages():
    """Test phase duration calculation with no workpackages"""
    graph_service = MockGraphService()
    phase_id = uuid4()

    # Mock phase with minimal_duration
    graph_service.set_query_result(
        f"MATCH (ph:Phase {{id: '{str(phase_id)}'}})", [{"minimal_duration": 30}]
    )

    # No workpackages
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage)-[:BELONGS_TO]->(ph:Phase {{id: '{str(phase_id)}'}})",
        [],
    )

    duration = await calculate_phase_duration(phase_id, graph_service)

    # Expected: phase minimal_duration (30)
    assert duration == 30


@pytest.mark.asyncio
async def test_calculate_phase_duration_enforces_minimal():
    """Test phase duration enforces minimal_duration when calculated is less"""
    graph_service = MockGraphService()
    phase_id = uuid4()
    wp1_id = uuid4()

    # Mock phase with large minimal_duration
    graph_service.set_query_result(
        f"MATCH (ph:Phase {{id: '{str(phase_id)}'}})", [{"minimal_duration": 50}]
    )

    # Mock workpackage with small tasks
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage)-[:BELONGS_TO]->(ph:Phase {{id: '{str(phase_id)}'}})",
        [
            {"workpackage_id": str(wp1_id), "wp_minimal_duration": 5},
        ],
    )

    # Mock tasks
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(wp1_id)}'}})",
        [
            {"duration": 3},
            {"duration": 2},
        ],
    )

    duration = await calculate_phase_duration(phase_id, graph_service)

    # Expected: phase minimal_duration (50) > calculated (5)
    assert duration == 50


@pytest.mark.asyncio
async def test_calculate_phase_duration_workpackage_without_tasks():
    """Test phase duration with workpackage that has no tasks"""
    graph_service = MockGraphService()
    phase_id = uuid4()
    wp1_id = uuid4()
    wp2_id = uuid4()

    # Mock phase
    graph_service.set_query_result(
        f"MATCH (ph:Phase {{id: '{str(phase_id)}'}})", [{"minimal_duration": 10}]
    )

    # Mock workpackages
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage)-[:BELONGS_TO]->(ph:Phase {{id: '{str(phase_id)}'}})",
        [
            {"workpackage_id": str(wp1_id), "wp_minimal_duration": 8},
            {"workpackage_id": str(wp2_id), "wp_minimal_duration": 12},
        ],
    )

    # wp1 has tasks
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(wp1_id)}'}})",
        [{"duration": 5}],
    )

    # wp2 has no tasks
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(wp2_id)}'}})", []
    )

    duration = await calculate_phase_duration(phase_id, graph_service)

    # Expected: wp1 (8, enforced minimal) + wp2 (12, minimal) = 20
    assert duration == 20


@pytest.mark.asyncio
async def test_calculate_phase_duration_enforces_workpackage_minimal():
    """Test phase duration enforces workpackage minimal_duration"""
    graph_service = MockGraphService()
    phase_id = uuid4()
    wp1_id = uuid4()

    # Mock phase
    graph_service.set_query_result(
        f"MATCH (ph:Phase {{id: '{str(phase_id)}'}})", [{"minimal_duration": 10}]
    )

    # Mock workpackage with large minimal_duration
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage)-[:BELONGS_TO]->(ph:Phase {{id: '{str(phase_id)}'}})",
        [
            {"workpackage_id": str(wp1_id), "wp_minimal_duration": 20},
        ],
    )

    # Mock tasks with small durations
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(wp1_id)}'}})",
        [
            {"duration": 3},
            {"duration": 2},
        ],
    )

    duration = await calculate_phase_duration(phase_id, graph_service)

    # Expected: wp1 minimal (20) > calculated (5), phase minimal (10) < wp1 (20)
    assert duration == 20

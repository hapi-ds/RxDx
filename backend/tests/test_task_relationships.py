"""Unit tests for task relationship management (backlog/sprint mutual exclusivity, has_risk, implements)"""

import pytest
from uuid import uuid4

from app.db.graph import GraphService


@pytest.fixture
async def graph_service():
    """Create a graph service instance for testing"""
    service = GraphService()
    await service.connect()
    yield service
    await service.close()


@pytest.fixture
async def test_task(graph_service):
    """Create a test task (WorkItem with type='task')"""
    task_id = str(uuid4())
    await graph_service.create_workitem_node(
        workitem_id=task_id,
        workitem_type="task",
        title="Test Task",
        description="Test task for relationship testing",
        status="ready"
    )
    yield task_id
    # Cleanup
    try:
        await graph_service.delete_node(task_id)
    except Exception:
        pass


@pytest.fixture
async def test_backlog(graph_service):
    """Create a test backlog"""
    backlog_id = str(uuid4())
    await graph_service.create_node(
        label="Backlog",
        properties={
            "id": backlog_id,
            "name": "Test Backlog",
            "description": "Test backlog for testing",
            "project_id": str(uuid4())
        }
    )
    yield backlog_id
    # Cleanup
    try:
        await graph_service.delete_node(backlog_id)
    except Exception:
        pass


@pytest.fixture
async def test_sprint(graph_service):
    """Create a test sprint"""
    sprint_id = str(uuid4())
    await graph_service.create_node(
        label="Sprint",
        properties={
            "id": sprint_id,
            "name": "Test Sprint",
            "goal": "Test sprint for testing",
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-14T00:00:00Z",
            "status": "planning",
            "project_id": str(uuid4())
        }
    )
    yield sprint_id
    # Cleanup
    try:
        await graph_service.delete_node(sprint_id)
    except Exception:
        pass


@pytest.fixture
async def test_risk(graph_service):
    """Create a test risk (WorkItem with type='risk')"""
    risk_id = str(uuid4())
    await graph_service.create_workitem_node(
        workitem_id=risk_id,
        workitem_type="risk",
        title="Test Risk",
        description="Test risk for relationship testing",
        status="active"
    )
    yield risk_id
    # Cleanup
    try:
        await graph_service.delete_node(risk_id)
    except Exception:
        pass


@pytest.fixture
async def test_requirement(graph_service):
    """Create a test requirement (WorkItem with type='requirement')"""
    requirement_id = str(uuid4())
    await graph_service.create_workitem_node(
        workitem_id=requirement_id,
        workitem_type="requirement",
        title="Test Requirement",
        description="Test requirement for relationship testing",
        status="active"
    )
    yield requirement_id
    # Cleanup
    try:
        await graph_service.delete_node(requirement_id)
    except Exception:
        pass


class TestBacklogSprintMutualExclusivity:
    """Test mutual exclusivity between IN_BACKLOG and ASSIGNED_TO_SPRINT relationships"""
    
    @pytest.mark.asyncio
    async def test_check_task_status_no_relationships(self, graph_service, test_task):
        """Test checking status when task has no backlog or sprint relationships"""
        status = await graph_service.check_task_backlog_sprint_status(test_task)
        
        assert status['in_backlog'] is False
        assert status['backlog_id'] is None
        assert status['in_sprint'] is False
        assert status['sprint_id'] is None
    
    @pytest.mark.asyncio
    async def test_move_task_to_backlog(self, graph_service, test_task, test_backlog):
        """Test moving a task to backlog"""
        relationship = await graph_service.move_task_to_backlog(
            task_id=test_task,
            backlog_id=test_backlog,
            priority_order=1
        )
        
        assert relationship is not None
        
        # Verify status
        status = await graph_service.check_task_backlog_sprint_status(test_task)
        assert status['in_backlog'] is True
        assert status['backlog_id'] == test_backlog
        assert status['in_sprint'] is False
    
    @pytest.mark.asyncio
    async def test_move_task_to_sprint(self, graph_service, test_task, test_sprint):
        """Test moving a task to sprint"""
        user_id = str(uuid4())
        relationship = await graph_service.move_task_to_sprint(
            task_id=test_task,
            sprint_id=test_sprint,
            assigned_by_user_id=user_id
        )
        
        assert relationship is not None
        
        # Verify status
        status = await graph_service.check_task_backlog_sprint_status(test_task)
        assert status['in_backlog'] is False
        assert status['in_sprint'] is True
        assert status['sprint_id'] == test_sprint
    
    @pytest.mark.asyncio
    async def test_mutual_exclusivity_backlog_to_sprint(
        self, graph_service, test_task, test_backlog, test_sprint
    ):
        """Test that moving from backlog to sprint removes backlog relationship"""
        # First, add to backlog
        await graph_service.move_task_to_backlog(test_task, test_backlog)
        
        # Verify in backlog
        status = await graph_service.check_task_backlog_sprint_status(test_task)
        assert status['in_backlog'] is True
        assert status['in_sprint'] is False
        
        # Move to sprint
        user_id = str(uuid4())
        await graph_service.move_task_to_sprint(test_task, test_sprint, user_id)
        
        # Verify mutual exclusivity: should be in sprint, not in backlog
        status = await graph_service.check_task_backlog_sprint_status(test_task)
        assert status['in_backlog'] is False
        assert status['in_sprint'] is True
        assert status['sprint_id'] == test_sprint
    
    @pytest.mark.asyncio
    async def test_mutual_exclusivity_sprint_to_backlog(
        self, graph_service, test_task, test_backlog, test_sprint
    ):
        """Test that moving from sprint to backlog removes sprint relationship"""
        # First, add to sprint
        user_id = str(uuid4())
        await graph_service.move_task_to_sprint(test_task, test_sprint, user_id)
        
        # Verify in sprint
        status = await graph_service.check_task_backlog_sprint_status(test_task)
        assert status['in_backlog'] is False
        assert status['in_sprint'] is True
        
        # Move to backlog
        await graph_service.move_task_to_backlog(test_task, test_backlog)
        
        # Verify mutual exclusivity: should be in backlog, not in sprint
        status = await graph_service.check_task_backlog_sprint_status(test_task)
        assert status['in_backlog'] is True
        assert status['backlog_id'] == test_backlog
        assert status['in_sprint'] is False
    
    @pytest.mark.asyncio
    async def test_remove_task_from_sprint_return_to_backlog(
        self, graph_service, test_task, test_backlog, test_sprint
    ):
        """Test removing task from sprint and returning to backlog"""
        # Add to sprint
        user_id = str(uuid4())
        await graph_service.move_task_to_sprint(test_task, test_sprint, user_id)
        
        # Remove from sprint and return to backlog
        success = await graph_service.remove_task_from_sprint(
            task_id=test_task,
            sprint_id=test_sprint,
            return_to_backlog=True,
            backlog_id=test_backlog
        )
        
        assert success is True
        
        # Verify task is back in backlog
        status = await graph_service.check_task_backlog_sprint_status(test_task)
        assert status['in_backlog'] is True
        assert status['in_sprint'] is False
    
    @pytest.mark.asyncio
    async def test_move_task_to_backlog_invalid_task(self, graph_service, test_backlog):
        """Test moving non-existent task to backlog raises ValueError"""
        invalid_task_id = str(uuid4())
        
        with pytest.raises(ValueError, match="not found"):
            await graph_service.move_task_to_backlog(invalid_task_id, test_backlog)
    
    @pytest.mark.asyncio
    async def test_move_task_to_sprint_invalid_sprint(self, graph_service, test_task):
        """Test moving task to non-existent sprint raises ValueError"""
        invalid_sprint_id = str(uuid4())
        user_id = str(uuid4())
        
        with pytest.raises(ValueError, match="not found"):
            await graph_service.move_task_to_sprint(test_task, invalid_sprint_id, user_id)


class TestTaskRiskRelationships:
    """Test has_risk relationships between tasks and risks"""
    
    @pytest.mark.asyncio
    async def test_link_task_to_risk(self, graph_service, test_task, test_risk):
        """Test creating has_risk relationship"""
        relationship = await graph_service.link_task_to_risk(test_task, test_risk)
        
        assert relationship is not None
        
        # Verify relationship exists
        risks = await graph_service.get_task_risks(test_task)
        assert len(risks) == 1
        assert risks[0]['id'] == test_risk
    
    @pytest.mark.asyncio
    async def test_link_task_to_multiple_risks(self, graph_service, test_task, test_risk):
        """Test that a task can have multiple risks"""
        # Create second risk
        risk2_id = str(uuid4())
        await graph_service.create_workitem_node(
            workitem_id=risk2_id,
            workitem_type="risk",
            title="Test Risk 2",
            description="Second test risk",
            status="active"
        )
        
        try:
            # Link to both risks
            await graph_service.link_task_to_risk(test_task, test_risk)
            await graph_service.link_task_to_risk(test_task, risk2_id)
            
            # Verify both relationships exist
            risks = await graph_service.get_task_risks(test_task)
            assert len(risks) == 2
            risk_ids = [r['id'] for r in risks]
            assert test_risk in risk_ids
            assert risk2_id in risk_ids
        finally:
            # Cleanup
            try:
                await graph_service.delete_node(risk2_id)
            except Exception:
                pass
    
    @pytest.mark.asyncio
    async def test_unlink_task_from_risk(self, graph_service, test_task, test_risk):
        """Test removing has_risk relationship"""
        # First, create the relationship
        await graph_service.link_task_to_risk(test_task, test_risk)
        
        # Verify it exists
        risks = await graph_service.get_task_risks(test_task)
        assert len(risks) == 1
        
        # Remove the relationship
        success = await graph_service.unlink_task_from_risk(test_task, test_risk)
        assert success is True
        
        # Verify it's gone
        risks = await graph_service.get_task_risks(test_task)
        assert len(risks) == 0
    
    @pytest.mark.asyncio
    async def test_unlink_nonexistent_relationship(self, graph_service, test_task, test_risk):
        """Test unlinking non-existent relationship returns False"""
        success = await graph_service.unlink_task_from_risk(test_task, test_risk)
        assert success is False
    
    @pytest.mark.asyncio
    async def test_link_task_to_invalid_risk(self, graph_service, test_task):
        """Test linking to non-existent risk raises ValueError"""
        invalid_risk_id = str(uuid4())
        
        with pytest.raises(ValueError, match="not found"):
            await graph_service.link_task_to_risk(test_task, invalid_risk_id)
    
    @pytest.mark.asyncio
    async def test_get_risks_for_invalid_task(self, graph_service):
        """Test getting risks for non-existent task raises ValueError"""
        invalid_task_id = str(uuid4())
        
        with pytest.raises(ValueError, match="not found"):
            await graph_service.get_task_risks(invalid_task_id)


class TestTaskRequirementRelationships:
    """Test implements relationships between tasks and requirements"""
    
    @pytest.mark.asyncio
    async def test_link_task_to_requirement(self, graph_service, test_task, test_requirement):
        """Test creating implements relationship"""
        relationship = await graph_service.link_task_to_requirement(test_task, test_requirement)
        
        assert relationship is not None
        
        # Verify relationship exists
        requirements = await graph_service.get_task_requirements(test_task)
        assert len(requirements) == 1
        assert requirements[0]['id'] == test_requirement
    
    @pytest.mark.asyncio
    async def test_link_task_to_multiple_requirements(self, graph_service, test_task, test_requirement):
        """Test that a task can implement multiple requirements"""
        # Create second requirement
        req2_id = str(uuid4())
        await graph_service.create_workitem_node(
            workitem_id=req2_id,
            workitem_type="requirement",
            title="Test Requirement 2",
            description="Second test requirement",
            status="active"
        )
        
        try:
            # Link to both requirements
            await graph_service.link_task_to_requirement(test_task, test_requirement)
            await graph_service.link_task_to_requirement(test_task, req2_id)
            
            # Verify both relationships exist
            requirements = await graph_service.get_task_requirements(test_task)
            assert len(requirements) == 2
            req_ids = [r['id'] for r in requirements]
            assert test_requirement in req_ids
            assert req2_id in req_ids
        finally:
            # Cleanup
            try:
                await graph_service.delete_node(req2_id)
            except Exception:
                pass
    
    @pytest.mark.asyncio
    async def test_unlink_task_from_requirement(self, graph_service, test_task, test_requirement):
        """Test removing implements relationship"""
        # First, create the relationship
        await graph_service.link_task_to_requirement(test_task, test_requirement)
        
        # Verify it exists
        requirements = await graph_service.get_task_requirements(test_task)
        assert len(requirements) == 1
        
        # Remove the relationship
        success = await graph_service.unlink_task_from_requirement(test_task, test_requirement)
        assert success is True
        
        # Verify it's gone
        requirements = await graph_service.get_task_requirements(test_task)
        assert len(requirements) == 0
    
    @pytest.mark.asyncio
    async def test_unlink_nonexistent_relationship(self, graph_service, test_task, test_requirement):
        """Test unlinking non-existent relationship returns False"""
        success = await graph_service.unlink_task_from_requirement(test_task, test_requirement)
        assert success is False
    
    @pytest.mark.asyncio
    async def test_link_task_to_invalid_requirement(self, graph_service, test_task):
        """Test linking to non-existent requirement raises ValueError"""
        invalid_req_id = str(uuid4())
        
        with pytest.raises(ValueError, match="not found"):
            await graph_service.link_task_to_requirement(test_task, invalid_req_id)
    
    @pytest.mark.asyncio
    async def test_get_requirements_for_invalid_task(self, graph_service):
        """Test getting requirements for non-existent task raises ValueError"""
        invalid_task_id = str(uuid4())
        
        with pytest.raises(ValueError, match="not found"):
            await graph_service.get_task_requirements(invalid_task_id)


class TestTaskMultipleRelationships:
    """Test that tasks can have multiple concurrent relationships"""
    
    @pytest.mark.asyncio
    async def test_task_with_all_relationships(
        self, graph_service, test_task, test_backlog, test_risk, test_requirement
    ):
        """Test that a task can have backlog, risk, and requirement relationships simultaneously"""
        # Add to backlog
        await graph_service.move_task_to_backlog(test_task, test_backlog)
        
        # Link to risk
        await graph_service.link_task_to_risk(test_task, test_risk)
        
        # Link to requirement
        await graph_service.link_task_to_requirement(test_task, test_requirement)
        
        # Verify all relationships exist
        status = await graph_service.check_task_backlog_sprint_status(test_task)
        assert status['in_backlog'] is True
        
        risks = await graph_service.get_task_risks(test_task)
        assert len(risks) == 1
        
        requirements = await graph_service.get_task_requirements(test_task)
        assert len(requirements) == 1
    
    @pytest.mark.asyncio
    async def test_sprint_assignment_preserves_other_relationships(
        self, graph_service, test_task, test_backlog, test_sprint, test_risk, test_requirement
    ):
        """Test that moving to sprint preserves risk and requirement relationships"""
        # Add to backlog
        await graph_service.move_task_to_backlog(test_task, test_backlog)
        
        # Link to risk and requirement
        await graph_service.link_task_to_risk(test_task, test_risk)
        await graph_service.link_task_to_requirement(test_task, test_requirement)
        
        # Move to sprint (should remove backlog but keep others)
        user_id = str(uuid4())
        await graph_service.move_task_to_sprint(test_task, test_sprint, user_id)
        
        # Verify backlog removed, sprint added, others preserved
        status = await graph_service.check_task_backlog_sprint_status(test_task)
        assert status['in_backlog'] is False
        assert status['in_sprint'] is True
        
        risks = await graph_service.get_task_risks(test_task)
        assert len(risks) == 1
        
        requirements = await graph_service.get_task_requirements(test_task)
        assert len(requirements) == 1

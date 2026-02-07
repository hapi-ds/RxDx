"""Unit tests for workpackage-department linking functionality"""

import pytest
from uuid import uuid4

from app.db.graph import GraphService


class TestWorkpackageDepartmentLink:
    """Test workpackage-department linking operations"""

    @pytest.mark.asyncio
    async def test_link_workpackage_to_department(self, mock_graph_service: GraphService):
        """Test linking a workpackage to a department"""
        # Create test company
        company_id = uuid4()
        await mock_graph_service.create_node(
            "Company",
            {
                "id": str(company_id),
                "name": "Test Company",
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test department
        department_id = uuid4()
        await mock_graph_service.create_node(
            "Department",
            {
                "id": str(department_id),
                "name": "Engineering",
                "company_id": str(company_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test workpackage
        workpackage_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(workpackage_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Link workpackage to department
        result = await mock_graph_service.link_workpackage_to_department(
            str(workpackage_id), str(department_id)
        )

        assert result is not None
        assert result.get("workpackage_id") == str(workpackage_id) or result.get(
            "start_id"
        ) == str(workpackage_id)

        # Verify link exists
        linked_dept = await mock_graph_service.get_workpackage_department(
            str(workpackage_id)
        )
        assert linked_dept is not None
        assert linked_dept["id"] == str(department_id)

    @pytest.mark.asyncio
    async def test_link_workpackage_to_nonexistent_department(
        self, mock_graph_service: GraphService
    ):
        """Test linking workpackage to non-existent department fails"""
        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test workpackage
        workpackage_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(workpackage_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Try to link to non-existent department
        nonexistent_dept_id = uuid4()
        with pytest.raises(ValueError, match="Department .* not found"):
            await mock_graph_service.link_workpackage_to_department(
                str(workpackage_id), str(nonexistent_dept_id)
            )

    @pytest.mark.asyncio
    async def test_link_nonexistent_workpackage_to_department(
        self, mock_graph_service: GraphService
    ):
        """Test linking non-existent workpackage to department fails"""
        # Create test company
        company_id = uuid4()
        await mock_graph_service.create_node(
            "Company",
            {
                "id": str(company_id),
                "name": "Test Company",
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test department
        department_id = uuid4()
        await mock_graph_service.create_node(
            "Department",
            {
                "id": str(department_id),
                "name": "Engineering",
                "company_id": str(company_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Try to link non-existent workpackage
        nonexistent_wp_id = uuid4()
        with pytest.raises(ValueError, match="Workpackage .* not found"):
            await mock_graph_service.link_workpackage_to_department(
                str(nonexistent_wp_id), str(department_id)
            )

    @pytest.mark.asyncio
    async def test_workpackage_can_link_to_only_one_department(
        self, mock_graph_service: GraphService
    ):
        """Test that a workpackage can only be linked to one department at a time"""
        # Create test company
        company_id = uuid4()
        await mock_graph_service.create_node(
            "Company",
            {
                "id": str(company_id),
                "name": "Test Company",
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create two departments
        dept1_id = uuid4()
        await mock_graph_service.create_node(
            "Department",
            {
                "id": str(dept1_id),
                "name": "Engineering",
                "company_id": str(company_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        dept2_id = uuid4()
        await mock_graph_service.create_node(
            "Department",
            {
                "id": str(dept2_id),
                "name": "QA",
                "company_id": str(company_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test workpackage
        workpackage_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(workpackage_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Link to first department
        await mock_graph_service.link_workpackage_to_department(
            str(workpackage_id), str(dept1_id)
        )

        # Try to link to second department (should fail)
        with pytest.raises(
            ValueError, match="already linked to department"
        ):
            await mock_graph_service.link_workpackage_to_department(
                str(workpackage_id), str(dept2_id)
            )

    @pytest.mark.asyncio
    async def test_unlink_workpackage_from_department(
        self, mock_graph_service: GraphService
    ):
        """Test unlinking a workpackage from a department"""
        # Create test company
        company_id = uuid4()
        await mock_graph_service.create_node(
            "Company",
            {
                "id": str(company_id),
                "name": "Test Company",
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test department
        department_id = uuid4()
        await mock_graph_service.create_node(
            "Department",
            {
                "id": str(department_id),
                "name": "Engineering",
                "company_id": str(company_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test workpackage
        workpackage_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(workpackage_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Link workpackage to department
        await mock_graph_service.link_workpackage_to_department(
            str(workpackage_id), str(department_id)
        )

        # Unlink
        result = await mock_graph_service.unlink_workpackage_from_department(
            str(workpackage_id), str(department_id)
        )
        assert result is True

        # Verify link no longer exists
        linked_dept = await mock_graph_service.get_workpackage_department(
            str(workpackage_id)
        )
        assert linked_dept is None

    @pytest.mark.asyncio
    async def test_unlink_nonexistent_link_returns_false(
        self, mock_graph_service: GraphService
    ):
        """Test unlinking a non-existent link returns False"""
        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test workpackage (not linked to any department)
        workpackage_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(workpackage_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Try to unlink (should return False)
        result = await mock_graph_service.unlink_workpackage_from_department(
            str(workpackage_id)
        )
        assert result is False

    @pytest.mark.asyncio
    async def test_get_department_resources_for_workpackage(
        self, mock_graph_service: GraphService
    ):
        """Test getting resources from linked department"""
        # Create test company
        company_id = uuid4()
        await mock_graph_service.create_node(
            "Company",
            {
                "id": str(company_id),
                "name": "Test Company",
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test department
        department_id = uuid4()
        await mock_graph_service.create_node(
            "Department",
            {
                "id": str(department_id),
                "name": "Engineering",
                "company_id": str(company_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create resources in department
        resource1_id = uuid4()
        await mock_graph_service.create_node(
            "Resource",
            {
                "id": str(resource1_id),
                "name": "John Doe",
                "type": "person",
                "capacity": 40.0,
                "department_id": str(department_id),
                "skills": '["Python", "FastAPI"]',
                "created_at": "2024-01-01T00:00:00Z",
            },
        )
        await mock_graph_service.create_relationship(
            str(resource1_id), str(department_id), "BELONGS_TO"
        )

        resource2_id = uuid4()
        await mock_graph_service.create_node(
            "Resource",
            {
                "id": str(resource2_id),
                "name": "Jane Smith",
                "type": "person",
                "capacity": 40.0,
                "department_id": str(department_id),
                "skills": '["JavaScript", "React"]',
                "created_at": "2024-01-01T00:00:00Z",
            },
        )
        await mock_graph_service.create_relationship(
            str(resource2_id), str(department_id), "BELONGS_TO"
        )

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Create test workpackage
        workpackage_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(workpackage_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": "2024-01-01T00:00:00Z",
            },
        )

        # Link workpackage to department
        await mock_graph_service.link_workpackage_to_department(
            str(workpackage_id), str(department_id)
        )

        # Get all resources
        resources = await mock_graph_service.get_department_resources_for_workpackage(
            str(workpackage_id)
        )
        assert len(resources) == 2

        # Get resources with Python skill
        python_resources = await mock_graph_service.get_department_resources_for_workpackage(
            str(workpackage_id), skills_filter=["Python"]
        )
        assert len(python_resources) == 1
        assert python_resources[0]["name"] == "John Doe"

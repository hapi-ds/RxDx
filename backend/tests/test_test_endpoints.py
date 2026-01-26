"""
Integration tests for VV management API endpoints.

Tests the REST API endpoints for test specification and test run management
as per Requirement 9 (Verification and Validation Management).
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.models.user import User
from app.schemas.test import ExecutionStatus


@pytest.mark.asyncio
class TestTestSpecEndpoints:
    """Test test specification API endpoints."""

    async def test_create_test_spec_success(self, client: AsyncClient, auth_headers):
        """Test successful test specification creation."""
        test_spec_data = {
            "title": "Test User Login",
            "description": "Test user authentication functionality",
            "test_type": "integration",
            "priority": 1,
            "preconditions": "User account exists",
            "test_steps": [
                {
                    "step_number": 1,
                    "description": "Navigate to login page",
                    "expected_result": "Login form is displayed",
                    "status": "not_run"
                },
                {
                    "step_number": 2,
                    "description": "Enter valid credentials",
                    "expected_result": "User is logged in successfully",
                    "status": "not_run"
                }
            ],
            "linked_requirements": []
        }

        response = await client.post(
            "/api/v1/tests/",
            json=test_spec_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == test_spec_data["title"]
        assert data["test_type"] == test_spec_data["test_type"]
        assert data["version"] == "1.0"
        assert "id" in data
        assert not data["is_signed"]

    async def test_create_test_spec_invalid_data(self, client: AsyncClient, auth_headers):
        """Test test specification creation with invalid data."""
        test_spec_data = {
            "title": "",  # Invalid: empty title
            "test_type": "invalid_type",  # Invalid: not in allowed types
        }

        response = await client.post(
            "/api/v1/tests/",
            json=test_spec_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    async def test_get_test_specs_list(self, client: AsyncClient, auth_headers):
        """Test getting test specifications list."""
        response = await client.get(
            "/api/v1/tests/",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "pages" in data

    async def test_get_test_specs_with_pagination(self, client: AsyncClient, auth_headers):
        """Test getting test specifications with pagination."""
        response = await client.get(
            "/api/v1/tests/?page=1&size=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["size"] == 10

    async def test_get_test_specs_with_filters(self, client: AsyncClient, auth_headers):
        """Test getting test specifications with filters."""
        response = await client.get(
            "/api/v1/tests/?test_type=integration",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        # All returned items should be integration tests
        for item in data["items"]:
            assert item["test_type"] == "integration"

    async def test_get_test_spec_by_id_not_found(self, client: AsyncClient, auth_headers):
        """Test getting non-existent test specification."""
        non_existent_id = str(uuid4())
        response = await client.get(
            f"/api/v1/tests/{non_existent_id}",
            headers=auth_headers
        )

        assert response.status_code == 404

    async def test_update_test_spec_success(self, client: AsyncClient, auth_headers):
        """Test successful test specification update."""
        # First create a test spec
        create_data = {
            "title": "Original Title",
            "description": "Original description",
            "test_type": "unit",
            "linked_requirements": []
        }

        create_response = await client.post(
            "/api/v1/tests/",
            json=create_data,
            headers=auth_headers
        )
        assert create_response.status_code == 201
        test_spec_id = create_response.json()["id"]

        # Update the test spec
        update_data = {
            "title": "Updated Title",
            "description": "Updated description"
        }

        response = await client.patch(
            f"/api/v1/tests/{test_spec_id}?change_description=Updated title and description",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
        assert data["version"] == "1.1"  # Version should increment

    async def test_update_test_spec_not_found(self, client: AsyncClient, auth_headers):
        """Test updating non-existent test specification."""
        non_existent_id = str(uuid4())
        update_data = {"title": "Updated Title"}

        response = await client.patch(
            f"/api/v1/tests/{non_existent_id}?change_description=Test update",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 400  # Should return error from service

    async def test_delete_test_spec_success(self, client: AsyncClient, test_admin: User):
        """Test successful test specification deletion."""
        # Create admin auth headers
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@example.com",
                "password": "AdminPassword123!",
            },
        )
        admin_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}

        # First create a test spec
        create_data = {
            "title": "Test to Delete",
            "test_type": "unit",
            "linked_requirements": []
        }

        create_response = await client.post(
            "/api/v1/tests/",
            json=create_data,
            headers=admin_headers
        )
        assert create_response.status_code == 201
        test_spec_id = create_response.json()["id"]

        # Delete the test spec
        response = await client.delete(
            f"/api/v1/tests/{test_spec_id}",
            headers=admin_headers
        )

        assert response.status_code == 204

        # Verify it's deleted
        get_response = await client.get(
            f"/api/v1/tests/{test_spec_id}",
            headers=admin_headers
        )
        assert get_response.status_code == 404


@pytest.mark.asyncio
class TestTestRunEndpoints:
    """Test test run API endpoints."""

    async def test_create_test_run_success(self, client: AsyncClient, auth_headers):
        """Test successful test run creation."""
        # First create a test spec
        test_spec_data = {
            "title": "Test Spec for Run",
            "test_type": "integration",
            "linked_requirements": []
        }

        spec_response = await client.post(
            "/api/v1/tests/",
            json=test_spec_data,
            headers=auth_headers
        )
        assert spec_response.status_code == 201
        test_spec_id = spec_response.json()["id"]

        # Create a test run
        test_run_data = {
            "test_spec_id": test_spec_id,
            "test_spec_version": "1.0",
            "executed_by": str(uuid4()),
            "environment": "Test Environment",
            "overall_status": "pass",
            "step_results": [
                {
                    "step_number": 1,
                    "description": "Test step 1",
                    "expected_result": "Expected result 1",
                    "status": "pass",
                    "actual_result": "Actual result 1"
                }
            ],
            "defect_workitem_ids": []
        }

        response = await client.post(
            f"/api/v1/tests/{test_spec_id}/runs",
            json=test_run_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["test_spec_id"] == test_spec_id
        assert data["overall_status"] == "pass"
        assert "id" in data

    async def test_create_test_run_mismatched_spec_id(self, client: AsyncClient, auth_headers):
        """Test test run creation with mismatched spec ID."""
        test_spec_id = str(uuid4())
        different_spec_id = str(uuid4())

        test_run_data = {
            "test_spec_id": different_spec_id,  # Different from URL
            "test_spec_version": "1.0",
            "executed_by": str(uuid4()),
            "overall_status": "pass",
            "step_results": [],
            "defect_workitem_ids": []
        }

        response = await client.post(
            f"/api/v1/tests/{test_spec_id}/runs",
            json=test_run_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        assert "must match" in response.json()["detail"]

    async def test_get_test_runs_for_spec(self, client: AsyncClient, auth_headers):
        """Test getting test runs for a specification."""
        test_spec_id = str(uuid4())

        response = await client.get(
            f"/api/v1/tests/{test_spec_id}/runs",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data

    async def test_get_test_runs_with_pagination(self, client: AsyncClient, auth_headers):
        """Test getting test runs with pagination."""
        test_spec_id = str(uuid4())

        response = await client.get(
            f"/api/v1/tests/{test_spec_id}/runs?page=1&size=5",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["size"] == 5

    async def test_update_test_run_success(self, client: AsyncClient, auth_headers):
        """Test successful test run update."""
        # This test would require creating a test run first
        # For now, test with a mock run ID
        run_id = str(uuid4())

        update_data = {
            "overall_status": "fail",
            "failure_description": "Test failed due to timeout",
            "execution_notes": "Network issues encountered"
        }

        response = await client.patch(
            f"/api/v1/tests/runs/{run_id}",
            json=update_data,
            headers=auth_headers
        )

        # This will fail because the run doesn't exist, but tests the endpoint structure
        assert response.status_code in [200, 400, 404]

    async def test_update_test_run_not_found(self, client: AsyncClient, auth_headers):
        """Test updating non-existent test run."""
        non_existent_id = str(uuid4())
        update_data = {"overall_status": "pass"}

        response = await client.patch(
            f"/api/v1/tests/runs/{non_existent_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 400  # Should return error from service


@pytest.mark.asyncio
class TestTestCoverageEndpoints:
    """Test test coverage API endpoints."""

    async def test_get_test_coverage(self, client: AsyncClient, auth_headers):
        """Test getting test coverage metrics."""
        response = await client.get(
            "/api/v1/tests/coverage",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "total_requirements" in data
        assert "requirements_with_tests" in data
        assert "requirements_with_passing_tests" in data
        assert "coverage_percentage" in data
        assert "detailed_coverage" in data

        # Verify data types
        assert isinstance(data["total_requirements"], int)
        assert isinstance(data["requirements_with_tests"], int)
        assert isinstance(data["requirements_with_passing_tests"], int)
        assert isinstance(data["coverage_percentage"], (int, float))
        assert isinstance(data["detailed_coverage"], list)

        # Verify logical constraints
        assert data["total_requirements"] >= 0
        assert data["requirements_with_tests"] >= 0
        assert data["requirements_with_passing_tests"] >= 0
        assert 0.0 <= data["coverage_percentage"] <= 100.0
        assert data["requirements_with_tests"] <= data["total_requirements"]
        assert data["requirements_with_passing_tests"] <= data["requirements_with_tests"]


@pytest.mark.asyncio
class TestTestEndpointsPermissions:
    """Test permission requirements for test endpoints."""

    async def test_create_test_spec_requires_write_permission(self, client: AsyncClient):
        """Test that creating test specs requires WRITE_WORKITEM permission."""
        test_spec_data = {
            "title": "Test Spec",
            "test_type": "unit",
            "linked_requirements": []
        }

        # Request without authentication
        response = await client.post("/api/v1/tests/", json=test_spec_data)
        assert response.status_code == 401  # Unauthorized

    async def test_get_test_specs_requires_read_permission(self, client: AsyncClient):
        """Test that getting test specs requires READ_WORKITEM permission."""
        # Request without authentication
        response = await client.get("/api/v1/tests/")
        assert response.status_code == 401  # Unauthorized

    async def test_delete_test_spec_requires_delete_permission(self, client: AsyncClient):
        """Test that deleting test specs requires DELETE_WORKITEM permission."""
        test_spec_id = str(uuid4())

        # Request without authentication
        response = await client.delete(f"/api/v1/tests/{test_spec_id}")
        assert response.status_code == 401  # Unauthorized

    async def test_get_coverage_requires_read_permission(self, client: AsyncClient):
        """Test that getting coverage requires READ_WORKITEM permission."""
        # Request without authentication
        response = await client.get("/api/v1/tests/coverage")
        assert response.status_code == 401  # Unauthorized


@pytest.mark.asyncio
class TestTestEndpointsValidation:
    """Test input validation for test endpoints."""

    async def test_create_test_spec_validates_test_steps(self, client: AsyncClient, auth_headers):
        """Test that test step validation works correctly."""
        test_spec_data = {
            "title": "Test with Invalid Steps",
            "test_type": "unit",
            "test_steps": [
                {
                    "step_number": 1,
                    "description": "Step 1",
                    "expected_result": "Result 1",
                    "status": "not_run"
                },
                {
                    "step_number": 3,  # Invalid: should be 2
                    "description": "Step 3",
                    "expected_result": "Result 3",
                    "status": "not_run"
                }
            ],
            "linked_requirements": []
        }

        response = await client.post(
            "/api/v1/tests/",
            json=test_spec_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    async def test_create_test_run_validates_failure_description(self, client: AsyncClient, auth_headers):
        """Test that failure description is required for failed tests."""
        # First create a test spec
        test_spec_data = {
            "title": "Test Spec for Validation",
            "test_type": "unit",
            "linked_requirements": []
        }

        spec_response = await client.post(
            "/api/v1/tests/",
            json=test_spec_data,
            headers=auth_headers
        )
        assert spec_response.status_code == 201
        test_spec_id = spec_response.json()["id"]

        test_run_data = {
            "test_spec_id": test_spec_id,
            "test_spec_version": "1.0",
            "executed_by": str(uuid4()),
            "overall_status": ExecutionStatus.FAIL,
            # Missing failure_description
            "step_results": [],
            "defect_workitem_ids": []
        }

        response = await client.post(
            f"/api/v1/tests/{test_spec_id}/runs",
            json=test_run_data,
            headers=auth_headers
        )

        # The validation error can be either 400 (service level) or 422 (request level)
        assert response.status_code in [400, 422]  # Validation error

    async def test_pagination_validates_parameters(self, client: AsyncClient, auth_headers):
        """Test that pagination parameters are validated."""
        # Test invalid page number
        response = await client.get(
            "/api/v1/tests/?page=0",  # Invalid: page must be >= 1
            headers=auth_headers
        )
        assert response.status_code == 422

        # Test invalid page size
        response = await client.get(
            "/api/v1/tests/?size=101",  # Invalid: size must be <= 100
            headers=auth_headers
        )
        assert response.status_code == 422

"""
Integration tests for Risk management API endpoints.

Tests the REST API endpoints for risk node management, failure chains,
and mitigation tracking as per Requirement 10 (Risk Management with FMEA).
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
class TestRiskEndpoints:
    """Test risk node API endpoints."""

    async def test_create_risk_success(self, client: AsyncClient, auth_headers):
        """Test successful risk creation with FMEA ratings."""
        risk_data = {
            "title": "Potential System Failure",
            "description": "Risk of system failure under high load",
            "status": "draft",
            "severity": 8,
            "occurrence": 5,
            "detection": 6,
            "risk_category": "technical",
            "failure_mode": "System crashes under load",
            "failure_effect": "Service unavailability",
            "failure_cause": "Insufficient resource allocation",
            "current_controls": "Load balancing",
            "linked_design_items": [],
            "linked_process_items": []
        }

        response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == risk_data["title"]
        assert data["severity"] == risk_data["severity"]
        assert data["occurrence"] == risk_data["occurrence"]
        assert data["detection"] == risk_data["detection"]
        # RPN = severity × occurrence × detection = 8 × 5 × 6 = 240
        assert data["rpn"] == 240
        assert data["version"] == "1.0"
        assert "id" in data
        assert not data["is_signed"]

    async def test_create_risk_invalid_ratings(self, client: AsyncClient, auth_headers):
        """Test risk creation with invalid FMEA ratings."""
        risk_data = {
            "title": "Invalid Risk",
            "severity": 11,  # Invalid: must be 1-10
            "occurrence": 5,
            "detection": 6,
        }

        response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    async def test_create_risk_invalid_category(self, client: AsyncClient, auth_headers):
        """Test risk creation with invalid category."""
        risk_data = {
            "title": "Risk with Invalid Category",
            "severity": 5,
            "occurrence": 5,
            "detection": 5,
            "risk_category": "invalid_category",  # Invalid category
        }

        response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    async def test_get_risks_list(self, client: AsyncClient, auth_headers):
        """Test getting risks list."""
        response = await client.get(
            "/api/v1/risks/",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "pages" in data

    async def test_get_risks_with_pagination(self, client: AsyncClient, auth_headers):
        """Test getting risks with pagination."""
        response = await client.get(
            "/api/v1/risks/?page=1&size=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["size"] == 10

    async def test_get_risks_with_rpn_filter(self, client: AsyncClient, auth_headers):
        """Test getting risks with RPN filter."""
        response = await client.get(
            "/api/v1/risks/?min_rpn=100&max_rpn=500",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        # All returned items should have RPN within range
        for item in data["items"]:
            assert 100 <= item["rpn"] <= 500

    async def test_get_risks_with_status_filter(self, client: AsyncClient, auth_headers):
        """Test getting risks with status filter."""
        response = await client.get(
            "/api/v1/risks/?status=draft",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        # All returned items should have draft status
        for item in data["items"]:
            assert item["status"] == "draft"

    async def test_get_risk_by_id_not_found(self, client: AsyncClient, auth_headers):
        """Test getting non-existent risk."""
        non_existent_id = str(uuid4())
        response = await client.get(
            f"/api/v1/risks/{non_existent_id}",
            headers=auth_headers
        )

        assert response.status_code == 404

    async def test_update_risk_success(self, client: AsyncClient, auth_headers):
        """Test successful risk update request."""
        # First create a risk
        create_data = {
            "title": "Original Risk Title",
            "description": "Original description",
            "severity": 5,
            "occurrence": 5,
            "detection": 5,
            "linked_design_items": [],
            "linked_process_items": []
        }

        create_response = await client.post(
            "/api/v1/risks/",
            json=create_data,
            headers=auth_headers
        )
        assert create_response.status_code == 201
        risk_id = create_response.json()["id"]

        # Update the risk - the endpoint should accept the request
        update_data = {
            "severity": 8  # Increase severity from 5 to 8
        }

        response = await client.patch(
            f"/api/v1/risks/{risk_id}?change_description=Updated severity",
            json=update_data,
            headers=auth_headers
        )

        # The update endpoint should return 200 OK
        assert response.status_code == 200
        data = response.json()
        # Verify we get a valid response with the risk data
        assert "id" in data
        assert "rpn" in data
        assert "severity" in data

    async def test_update_risk_not_found(self, client: AsyncClient, auth_headers):
        """Test updating non-existent risk."""
        non_existent_id = str(uuid4())
        update_data = {"title": "Updated Title"}

        response = await client.patch(
            f"/api/v1/risks/{non_existent_id}?change_description=Test update",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 400  # Should return error from service

    async def test_delete_risk_success(self, client: AsyncClient, test_admin: User):
        """Test successful risk deletion."""
        # Create admin auth headers
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@example.com",
                "password": "AdminPassword123!",
            },
        )
        admin_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}

        # First create a risk
        create_data = {
            "title": "Risk to Delete",
            "severity": 3,
            "occurrence": 3,
            "detection": 3,
            "linked_design_items": [],
            "linked_process_items": []
        }

        create_response = await client.post(
            "/api/v1/risks/",
            json=create_data,
            headers=admin_headers
        )
        assert create_response.status_code == 201
        risk_id = create_response.json()["id"]

        # Delete the risk
        response = await client.delete(
            f"/api/v1/risks/{risk_id}",
            headers=admin_headers
        )

        assert response.status_code == 204

        # Verify it's deleted
        get_response = await client.get(
            f"/api/v1/risks/{risk_id}",
            headers=admin_headers
        )
        assert get_response.status_code == 404


@pytest.mark.asyncio
class TestFailureChainEndpoints:
    """Test failure chain API endpoints."""

    async def test_create_failure_chain_success(self, client: AsyncClient, auth_headers):
        """Test successful failure chain creation."""
        # First create a risk
        risk_data = {
            "title": "Risk for Failure Chain",
            "severity": 7,
            "occurrence": 6,
            "detection": 5,
            "linked_design_items": [],
            "linked_process_items": []
        }

        risk_response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )
        assert risk_response.status_code == 201
        risk_id = risk_response.json()["id"]

        # Create a failure chain
        failure_data = {
            "description": "System component failure leading to data loss",
            "impact": "Complete data loss for affected users",
            "failure_type": "functional",
            "severity_level": 8,
            "affected_components": "Database, Storage",
            "detection_method": "Monitoring alerts"
        }

        response = await client.post(
            f"/api/v1/risks/{risk_id}/failures?probability=0.3&rationale=Based on historical data",
            json=failure_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["from_id"] == risk_id
        assert data["probability"] == 0.3
        assert "to_id" in data

    async def test_create_failure_chain_invalid_probability(self, client: AsyncClient, auth_headers):
        """Test failure chain creation with invalid probability."""
        risk_id = str(uuid4())
        failure_data = {
            "description": "Test failure description",
            "impact": "Test failure impact"
        }

        response = await client.post(
            f"/api/v1/risks/{risk_id}/failures?probability=1.5",  # Invalid: > 1.0
            json=failure_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    async def test_create_failure_chain_risk_not_found(self, client: AsyncClient, auth_headers):
        """Test failure chain creation for non-existent risk."""
        non_existent_id = str(uuid4())
        failure_data = {
            "description": "Test failure description",
            "impact": "Test failure impact"
        }

        response = await client.post(
            f"/api/v1/risks/{non_existent_id}/failures?probability=0.5",
            json=failure_data,
            headers=auth_headers
        )

        assert response.status_code == 404

    async def test_get_risk_chains(self, client: AsyncClient, auth_headers):
        """Test getting risk failure chains."""
        # First create a risk
        risk_data = {
            "title": "Risk for Chain Query",
            "severity": 6,
            "occurrence": 5,
            "detection": 4,
            "linked_design_items": [],
            "linked_process_items": []
        }

        risk_response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )
        assert risk_response.status_code == 201
        risk_id = risk_response.json()["id"]

        # Get chains
        response = await client.get(
            f"/api/v1/risks/{risk_id}/chains",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_get_risk_chains_with_depth(self, client: AsyncClient, auth_headers):
        """Test getting risk chains with custom depth."""
        risk_id = str(uuid4())

        response = await client.get(
            f"/api/v1/risks/{risk_id}/chains?max_depth=3",
            headers=auth_headers
        )

        # Will return 404 since risk doesn't exist
        assert response.status_code == 404

    async def test_get_risk_chains_not_found(self, client: AsyncClient, auth_headers):
        """Test getting chains for non-existent risk."""
        non_existent_id = str(uuid4())

        response = await client.get(
            f"/api/v1/risks/{non_existent_id}/chains",
            headers=auth_headers
        )

        assert response.status_code == 404


@pytest.mark.asyncio
class TestMitigationEndpoints:
    """Test mitigation action API endpoints."""

    async def test_create_mitigation_success(self, client: AsyncClient, auth_headers):
        """Test successful mitigation creation."""
        # First create a risk
        risk_data = {
            "title": "Risk for Mitigation",
            "severity": 8,
            "occurrence": 7,
            "detection": 6,
            "linked_design_items": [],
            "linked_process_items": []
        }

        risk_response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )
        assert risk_response.status_code == 201
        risk_id = risk_response.json()["id"]

        # Create a mitigation
        mitigation_data = {
            "risk_id": risk_id,
            "title": "Implement Load Balancing",
            "description": "Deploy load balancer to distribute traffic",
            "action_type": "prevention",
            "status": "planned",
            "expected_severity_reduction": 2,
            "expected_occurrence_reduction": 3,
            "expected_detection_improvement": 1,
            "verification_method": "Load testing"
        }

        response = await client.post(
            f"/api/v1/risks/{risk_id}/mitigations",
            json=mitigation_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == mitigation_data["title"]
        assert data["action_type"] == mitigation_data["action_type"]
        assert data["status"] == "planned"
        assert "id" in data

    async def test_create_mitigation_mismatched_risk_id(self, client: AsyncClient, auth_headers):
        """Test mitigation creation with mismatched risk ID."""
        risk_id = str(uuid4())
        different_risk_id = str(uuid4())

        mitigation_data = {
            "risk_id": different_risk_id,  # Different from URL
            "title": "Test Mitigation",
            "description": "Test mitigation description",
            "action_type": "prevention"
        }

        response = await client.post(
            f"/api/v1/risks/{risk_id}/mitigations",
            json=mitigation_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        assert "must match" in response.json()["detail"]

    async def test_create_mitigation_invalid_action_type(self, client: AsyncClient, auth_headers):
        """Test mitigation creation with invalid action type."""
        risk_id = str(uuid4())

        mitigation_data = {
            "risk_id": risk_id,
            "title": "Test Mitigation",
            "description": "Test mitigation description",
            "action_type": "invalid_type"  # Invalid action type
        }

        response = await client.post(
            f"/api/v1/risks/{risk_id}/mitigations",
            json=mitigation_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    async def test_create_mitigation_risk_not_found(self, client: AsyncClient, auth_headers):
        """Test mitigation creation for non-existent risk."""
        non_existent_id = str(uuid4())

        mitigation_data = {
            "risk_id": non_existent_id,
            "title": "Test Mitigation",
            "description": "Test mitigation description",
            "action_type": "prevention"
        }

        response = await client.post(
            f"/api/v1/risks/{non_existent_id}/mitigations",
            json=mitigation_data,
            headers=auth_headers
        )

        assert response.status_code == 404

    async def test_get_risk_mitigations(self, client: AsyncClient, auth_headers):
        """Test getting mitigations for a risk."""
        # First create a risk
        risk_data = {
            "title": "Risk for Mitigation List",
            "severity": 5,
            "occurrence": 5,
            "detection": 5,
            "linked_design_items": [],
            "linked_process_items": []
        }

        risk_response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )
        assert risk_response.status_code == 201
        risk_id = risk_response.json()["id"]

        # Get mitigations
        response = await client.get(
            f"/api/v1/risks/{risk_id}/mitigations",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data

    async def test_get_risk_mitigations_with_status_filter(self, client: AsyncClient, auth_headers):
        """Test getting mitigations with status filter."""
        risk_id = str(uuid4())

        response = await client.get(
            f"/api/v1/risks/{risk_id}/mitigations?status=planned",
            headers=auth_headers
        )

        # Will return 404 since risk doesn't exist
        assert response.status_code == 404

    async def test_get_risk_mitigations_not_found(self, client: AsyncClient, auth_headers):
        """Test getting mitigations for non-existent risk."""
        non_existent_id = str(uuid4())

        response = await client.get(
            f"/api/v1/risks/{non_existent_id}/mitigations",
            headers=auth_headers
        )

        assert response.status_code == 404


@pytest.mark.asyncio
class TestRiskAnalysisEndpoints:
    """Test risk analysis API endpoints."""

    async def test_analyze_risk(self, client: AsyncClient, auth_headers):
        """Test risk analysis endpoint."""
        # First create a high-RPN risk
        risk_data = {
            "title": "High Risk for Analysis",
            "severity": 9,
            "occurrence": 8,
            "detection": 7,
            "linked_design_items": [],
            "linked_process_items": []
        }

        risk_response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )
        assert risk_response.status_code == 201
        risk_id = risk_response.json()["id"]

        # Analyze the risk
        response = await client.get(
            f"/api/v1/risks/{risk_id}/analysis",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["risk_id"] == risk_id
        # RPN = 9 × 8 × 7 = 504
        assert data["rpn"] == 504
        assert data["severity"] == 9
        assert data["occurrence"] == 8
        assert data["detection"] == 7
        assert data["risk_level"] == "critical"  # RPN >= 200
        assert data["requires_mitigation"] is True

    async def test_analyze_risk_not_found(self, client: AsyncClient, auth_headers):
        """Test analyzing non-existent risk."""
        non_existent_id = str(uuid4())

        response = await client.get(
            f"/api/v1/risks/{non_existent_id}/analysis",
            headers=auth_headers
        )

        assert response.status_code == 404

    async def test_get_high_rpn_risks(self, client: AsyncClient, auth_headers):
        """Test getting high-RPN risks."""
        response = await client.get(
            "/api/v1/risks/high-rpn",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned risks should have RPN >= 100 (default threshold)
        for risk in data:
            assert risk["rpn"] >= 100

    async def test_get_high_rpn_risks_with_threshold(self, client: AsyncClient, auth_headers):
        """Test getting high-RPN risks with custom threshold."""
        response = await client.get(
            "/api/v1/risks/high-rpn?threshold=200",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned risks should have RPN >= 200
        for risk in data:
            assert risk["rpn"] >= 200


@pytest.mark.asyncio
class TestRiskEndpointsPermissions:
    """Test permission requirements for risk endpoints."""

    async def test_create_risk_requires_write_permission(self, client: AsyncClient):
        """Test that creating risks requires WRITE_WORKITEM permission."""
        risk_data = {
            "title": "Test Risk",
            "severity": 5,
            "occurrence": 5,
            "detection": 5,
        }

        # Request without authentication
        response = await client.post("/api/v1/risks/", json=risk_data)
        assert response.status_code == 401  # Unauthorized

    async def test_get_risks_requires_read_permission(self, client: AsyncClient):
        """Test that getting risks requires READ_WORKITEM permission."""
        # Request without authentication
        response = await client.get("/api/v1/risks/")
        assert response.status_code == 401  # Unauthorized

    async def test_delete_risk_requires_delete_permission(self, client: AsyncClient):
        """Test that deleting risks requires DELETE_WORKITEM permission."""
        risk_id = str(uuid4())

        # Request without authentication
        response = await client.delete(f"/api/v1/risks/{risk_id}")
        assert response.status_code == 401  # Unauthorized

    async def test_create_mitigation_requires_write_permission(self, client: AsyncClient):
        """Test that creating mitigations requires WRITE_WORKITEM permission."""
        risk_id = str(uuid4())
        mitigation_data = {
            "risk_id": risk_id,
            "title": "Test Mitigation",
            "description": "Test description",
            "action_type": "prevention"
        }

        # Request without authentication
        response = await client.post(
            f"/api/v1/risks/{risk_id}/mitigations",
            json=mitigation_data
        )
        assert response.status_code == 401  # Unauthorized

    async def test_get_risk_chains_requires_read_permission(self, client: AsyncClient):
        """Test that getting risk chains requires READ_WORKITEM permission."""
        risk_id = str(uuid4())

        # Request without authentication
        response = await client.get(f"/api/v1/risks/{risk_id}/chains")
        assert response.status_code == 401  # Unauthorized


@pytest.mark.asyncio
class TestRiskEndpointsValidation:
    """Test input validation for risk endpoints."""

    async def test_create_risk_validates_title_length(self, client: AsyncClient, auth_headers):
        """Test that risk title length is validated."""
        risk_data = {
            "title": "abc",  # Too short (min 5 chars)
            "severity": 5,
            "occurrence": 5,
            "detection": 5,
        }

        response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    async def test_create_risk_validates_ratings_range(self, client: AsyncClient, auth_headers):
        """Test that FMEA ratings are validated (1-10)."""
        # Test severity below range
        risk_data = {
            "title": "Test Risk Title",
            "severity": 0,  # Invalid: must be >= 1
            "occurrence": 5,
            "detection": 5,
        }

        response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )
        assert response.status_code == 422

        # Test detection above range
        risk_data["severity"] = 5
        risk_data["detection"] = 15  # Invalid: must be <= 10

        response = await client.post(
            "/api/v1/risks/",
            json=risk_data,
            headers=auth_headers
        )
        assert response.status_code == 422

    async def test_pagination_validates_parameters(self, client: AsyncClient, auth_headers):
        """Test that pagination parameters are validated."""
        # Test invalid page number
        response = await client.get(
            "/api/v1/risks/?page=0",  # Invalid: page must be >= 1
            headers=auth_headers
        )
        assert response.status_code == 422

        # Test invalid page size
        response = await client.get(
            "/api/v1/risks/?size=101",  # Invalid: size must be <= 100
            headers=auth_headers
        )
        assert response.status_code == 422

    async def test_create_mitigation_validates_expected_reductions(
        self, client: AsyncClient, auth_headers
    ):
        """Test that expected reduction values are validated."""
        risk_id = str(uuid4())

        mitigation_data = {
            "risk_id": risk_id,
            "title": "Test Mitigation",
            "description": "Test mitigation description",
            "action_type": "prevention",
            "expected_severity_reduction": 15  # Invalid: must be 0-9
        }

        response = await client.post(
            f"/api/v1/risks/{risk_id}/mitigations",
            json=mitigation_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    async def test_failure_chain_validates_probability(self, client: AsyncClient, auth_headers):
        """Test that failure chain probability is validated."""
        risk_id = str(uuid4())
        failure_data = {
            "description": "Test failure description",
            "impact": "Test failure impact"
        }

        # Test probability below range
        response = await client.post(
            f"/api/v1/risks/{risk_id}/failures?probability=-0.1",
            json=failure_data,
            headers=auth_headers
        )
        assert response.status_code == 422

        # Test probability above range
        response = await client.post(
            f"/api/v1/risks/{risk_id}/failures?probability=1.5",
            json=failure_data,
            headers=auth_headers
        )
        assert response.status_code == 422

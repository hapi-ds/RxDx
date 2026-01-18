"""Integration tests for RequirementService"""

import pytest
from unittest.mock import AsyncMock, patch
from uuid import UUID

from app.services.requirement_service import get_requirement_service
from app.schemas.workitem import RequirementCreate, RequirementUpdate
from app.models.user import User


class TestRequirementServiceIntegration:
    """Integration tests for RequirementService with real dependencies"""

    @pytest.mark.asyncio
    async def test_get_requirement_service_dependency_injection(self):
        """Test that get_requirement_service properly initializes all dependencies"""
        
        # Mock the dependencies to avoid database connections
        with patch('app.db.graph.get_graph_service') as mock_graph, \
             patch('app.services.version_service.get_version_service') as mock_version, \
             patch('app.services.audit_service.get_audit_service') as mock_audit:
            
            # Configure mocks
            mock_graph.return_value = AsyncMock()
            mock_version.return_value = AsyncMock()
            mock_audit.return_value = AsyncMock()
            
            # Get the service
            service = await get_requirement_service()
            
            # Verify service is properly initialized
            assert service is not None
            assert hasattr(service, 'graph_service')
            assert hasattr(service, 'version_service')
            assert hasattr(service, 'audit_service')
            
            # Verify it's a RequirementService instance
            from app.services.requirement_service import RequirementService
            assert isinstance(service, RequirementService)
            
    @pytest.mark.asyncio
    async def test_requirement_service_inheritance(self):
        """Test that RequirementService properly inherits from WorkItemService"""
        
        with patch('app.db.graph.get_graph_service') as mock_graph, \
             patch('app.services.version_service.get_version_service') as mock_version, \
             patch('app.services.audit_service.get_audit_service') as mock_audit:
            
            # Configure mocks
            mock_graph.return_value = AsyncMock()
            mock_version.return_value = AsyncMock()
            mock_audit.return_value = AsyncMock()
            
            # Get the service
            service = await get_requirement_service()
            
            # Verify inheritance - should have WorkItemService methods
            assert hasattr(service, 'create_workitem')
            assert hasattr(service, 'get_workitem')
            assert hasattr(service, 'update_workitem')
            assert hasattr(service, 'delete_workitem')
            assert hasattr(service, 'search_workitems')
            
            # Verify RequirementService-specific methods
            assert hasattr(service, 'create_requirement')
            assert hasattr(service, 'get_requirement')
            assert hasattr(service, 'update_requirement')
            assert hasattr(service, 'add_comment')
            assert hasattr(service, 'track_requirement_dependency')
            assert hasattr(service, 'search_requirements')
            
    @pytest.mark.asyncio
    async def test_requirement_service_graceful_degradation(self):
        """Test that RequirementService handles missing dependencies gracefully"""
        
        with patch('app.db.graph.get_graph_service') as mock_graph, \
             patch('app.services.version_service.get_version_service') as mock_version:
            
            # Configure graph service to work, but version service to fail
            mock_graph.return_value = AsyncMock()
            mock_version.side_effect = Exception("VersionService not available")
            
            # Should still create service successfully
            service = await get_requirement_service()
            
            # Verify service is created with graph service but without version service
            assert service is not None
            assert service.graph_service is not None
            assert service.version_service is None
            # AuditService might still be available, so we don't test it here
            
    @pytest.mark.asyncio
    async def test_requirement_validation_integration(self):
        """Test requirement validation with realistic data"""
        
        with patch('app.db.graph.get_graph_service') as mock_graph, \
             patch('app.services.version_service.get_version_service') as mock_version, \
             patch('app.services.audit_service.get_audit_service') as mock_audit:
            
            # Configure mocks
            mock_graph.return_value = AsyncMock()
            mock_version.return_value = AsyncMock()
            mock_audit.return_value = AsyncMock()
            
            service = await get_requirement_service()
            
            # Test valid requirement data
            valid_requirement = RequirementCreate(
                title="User Authentication Requirement",
                description="The system shall provide secure user authentication",
                status="draft",
                priority=5,
                acceptance_criteria="Given a user with valid credentials, when they attempt to log in, then they should be granted access to the system",
                business_value="Critical for system security and user access control",
                source="stakeholder"
            )
            
            # Should not raise any exception
            await service._validate_requirement_data(valid_requirement)
            
            # Test invalid requirement data - should raise at Pydantic level
            with pytest.raises(ValueError):
                RequirementCreate(
                    title="Invalid Requirement",
                    description="Test requirement",
                    status="draft",
                    acceptance_criteria="short",  # Too short
                    source="invalid_source"  # Invalid source
                )

    @pytest.mark.asyncio
    async def test_schema_validation_integration(self):
        """Test that Pydantic schema validation works with enhanced validators"""
        
        # Test valid requirement creation
        valid_data = {
            "title": "Enhanced Authentication System",
            "description": "The system shall provide comprehensive user authentication with multi-factor support",
            "status": "active",
            "priority": 4,
            "acceptance_criteria": "Given a user with valid credentials, when they log in with MFA, then they should be granted access",
            "business_value": "Critical for security and compliance requirements",
            "source": "security"
        }
        
        # Should create successfully
        requirement = RequirementCreate(**valid_data)
        assert requirement.title == "Enhanced Authentication System"
        assert requirement.source == "security"  # Should be normalized to lowercase
        
        # Test invalid data - short title
        invalid_data = valid_data.copy()
        invalid_data["title"] = "Bad"  # Too short
        
        with pytest.raises(ValueError, match="Title must be at least 5 characters long"):
            RequirementCreate(**invalid_data)
            
        # Test invalid data - unstructured acceptance criteria
        invalid_data = valid_data.copy()
        invalid_data["acceptance_criteria"] = "This is just a plain description without structure"
        
        with pytest.raises(ValueError, match="Acceptance criteria should follow a structured format"):
            RequirementCreate(**invalid_data)
            
        # Test invalid data - invalid source
        invalid_data = valid_data.copy()
        invalid_data["source"] = "invalid_source"
        
        with pytest.raises(ValueError, match="Invalid requirement source"):
            RequirementCreate(**invalid_data)

    @pytest.mark.asyncio
    async def test_requirement_update_validation_integration(self):
        """Test requirement update validation integration"""
        
        # Test valid update data
        valid_update = {
            "title": "Updated Authentication Requirement",
            "description": "Updated description with sufficient length for validation requirements",
            "acceptance_criteria": "Given updated credentials, when user logs in, then access should be granted with new features",
            "business_value": "Enhanced security and improved user experience",
            "source": "compliance"
        }
        
        # Should create successfully
        update = RequirementUpdate(**valid_update)
        assert update.title == "Updated Authentication Requirement"
        assert update.source == "compliance"
        
        # Test invalid update - placeholder text in title
        invalid_update = valid_update.copy()
        invalid_update["title"] = "TODO: Fix this requirement title"
        
        with pytest.raises(ValueError, match="Requirement title cannot contain placeholder text"):
            RequirementUpdate(**invalid_update)
            
        # Test invalid update - short business value
        invalid_update = valid_update.copy()
        invalid_update["business_value"] = "Short"
        
        with pytest.raises(ValueError, match="Business value must be at least 10 characters long"):
            RequirementUpdate(**invalid_update)

    @pytest.mark.asyncio
    async def test_requirement_status_validation_integration(self):
        """Test requirement status validation including rejected status"""
        
        valid_statuses = ["draft", "active", "completed", "archived", "rejected"]
        
        for status in valid_statuses:
            requirement_data = {
                "title": f"Test Requirement - {status.title()}",
                "description": "Test description with sufficient length for validation",
                "status": status,
                "acceptance_criteria": "Given test conditions, when action occurs, then result should be verified",
                "business_value": "Test business value for validation purposes",
                "source": "stakeholder"
            }
            
            # Should create successfully for all valid statuses
            requirement = RequirementCreate(**requirement_data)
            assert requirement.status == status
            
        # Test invalid status
        invalid_data = {
            "title": "Test Requirement",
            "description": "Test description with sufficient length",
            "status": "invalid_status",
            "source": "stakeholder"
        }
        
        with pytest.raises(ValueError, match="Status must be one of"):
            RequirementCreate(**invalid_data)

    @pytest.mark.asyncio
    async def test_cross_field_validation_integration(self):
        """Test cross-field validation rules"""
        
        with patch('app.db.graph.get_graph_service') as mock_graph, \
             patch('app.services.version_service.get_version_service') as mock_version, \
             patch('app.services.audit_service.get_audit_service') as mock_audit:
            
            # Configure mocks
            mock_graph.return_value = AsyncMock()
            mock_version.return_value = AsyncMock()
            mock_audit.return_value = AsyncMock()
            
            service = await get_requirement_service()
            
            # Test active status without acceptance criteria
            incomplete_active = RequirementCreate(
                title="Incomplete Active Requirement",
                description="Test description with sufficient length",
                status="active",
                business_value="Test business value",
                source="stakeholder"
                # Missing acceptance_criteria
            )
            
            with pytest.raises(ValueError, match="Requirements with 'active' status must have acceptance criteria"):
                await service._validate_requirement_completeness(incomplete_active)
                
            # Test completed status with missing fields
            incomplete_completed = RequirementCreate(
                title="Incomplete Completed Requirement",
                status="completed",
                source="stakeholder"
                # Missing description, acceptance_criteria, business_value
            )
            
            with pytest.raises(ValueError, match="Requirements with 'completed' status must have all fields defined"):
                await service._validate_requirement_completeness(incomplete_completed)
                
            # Test high priority without business value
            high_priority_incomplete = RequirementCreate(
                title="High Priority Incomplete Requirement",
                description="Test description with sufficient length",
                status="draft",
                priority=5,  # High priority
                source="stakeholder"
                # Missing business_value
            )
            
            with pytest.raises(ValueError, match="High priority requirements \\(4-5\\) should have business value defined"):
                await service._validate_requirement_completeness(high_priority_incomplete)
                
    @pytest.mark.asyncio
    async def test_requirement_service_type_safety(self):
        """Test that RequirementService maintains type safety"""
        
        with patch('app.db.graph.get_graph_service') as mock_graph:
            mock_graph.return_value = AsyncMock()
            
            service = await get_requirement_service()
            
            # Test that service methods have proper type hints
            import inspect
            
            # Check create_requirement signature
            sig = inspect.signature(service.create_requirement)
            assert 'requirement_data' in sig.parameters
            assert 'current_user' in sig.parameters
            
            # Check get_requirement signature
            sig = inspect.signature(service.get_requirement)
            assert 'requirement_id' in sig.parameters
            
            # Check add_comment signature
            sig = inspect.signature(service.add_comment)
            assert 'requirement_id' in sig.parameters
            assert 'comment_data' in sig.parameters  # Updated parameter name
            assert 'current_user' in sig.parameters
"""
Test management service for TestSpec and TestRun operations.

This service handles test specification management, test run execution,
and test coverage calculation as per Requirement 9.
"""

import json
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, UTC
from datetime import datetime

from app.schemas.test import (
    TestSpecCreate,
    TestSpecUpdate,
    TestSpecResponse,
    TestRunCreate,
    TestRunUpdate,
    TestRunResponse,
    TestCoverageResponse,
    ExecutionStatus,
    StepExecutionStatus,
)
from app.services.audit_service import AuditService
from app.services.signature_service import SignatureService
from app.services.version_service import VersionService
from app.db.graph import GraphService
from app.models.user import User


class TestService:
    """Service for managing test specifications and test runs."""
    
    def __init__(
        self,
        graph_service: GraphService,
        audit_service: AuditService,
        signature_service: SignatureService,
        version_service: VersionService,
    ):
        self.graph_service = graph_service
        self.audit_service = audit_service
        self.signature_service = signature_service
        self.version_service = version_service
    
    async def create_test_spec(
        self,
        test_spec_data: TestSpecCreate,
        user: User,
    ) -> TestSpecResponse:
        """
        Create a new test specification with requirement linking.
        
        Args:
            test_spec_data: Test specification creation data
            user: User creating the test spec
            
        Returns:
            Created test specification
            
        Raises:
            ValueError: If linked requirements don't exist
        """
        # Validate linked requirements exist
        for req_id in test_spec_data.linked_requirements:
            requirement = await self.graph_service.get_workitem(req_id)
            if not requirement:
                raise ValueError(f"Linked requirement {req_id} does not exist")
            if requirement.get('type') != 'requirement':
                raise ValueError(f"WorkItem {req_id} is not a requirement")
        
        # Generate test spec ID and prepare data
        test_spec_id = uuid4()
        test_spec_dict = test_spec_data.model_dump()
        test_spec_dict.update({
            'id': str(test_spec_id),
            'type': 'test_spec',
            'version': '1.0',
            'created_by': str(user.id),
            'created_at': datetime.now(UTC).isoformat(),
            'updated_at': datetime.now(UTC).isoformat(),
            'is_signed': False,
        })
        
        # Create test spec node in graph database
        await self.graph_service.create_workitem_node(
            workitem_id=str(test_spec_id),
            workitem_type='test_spec',
            title=test_spec_data.title,
            description=test_spec_data.description,
            status='draft',
            priority=test_spec_data.priority,
            version='1.0',
            created_by=str(user.id),
            assigned_to=None,  # Test specs don't have assigned_to field
            test_type=test_spec_data.test_type,
            preconditions=test_spec_data.preconditions,
            test_steps=[step.model_dump() for step in test_spec_data.test_steps],
            linked_requirements=test_spec_data.linked_requirements
        )
        
        # Create relationships to linked requirements
        for req_id in test_spec_data.linked_requirements:
            await self.graph_service.create_relationship(
                from_id=str(req_id),
                to_id=str(test_spec_id),
                rel_type="TESTED_BY",
                properties={'created_at': datetime.now(UTC).isoformat()}
            )
        
        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="CREATE",
            entity_type="TestSpec",
            entity_id=test_spec_id,
            details={
                'title': test_spec_data.title,
                'test_type': test_spec_data.test_type,
                'linked_requirements': [str(req_id) for req_id in test_spec_data.linked_requirements]
            }
        )
        
        return TestSpecResponse(**test_spec_dict)
    
    async def get_test_spec(self, test_spec_id: UUID) -> Optional[TestSpecResponse]:
        """
        Retrieve a test specification by ID.
        
        Args:
            test_spec_id: Test specification ID
            
        Returns:
            Test specification if found, None otherwise
        """
        test_spec = await self.graph_service.get_workitem(test_spec_id)
        if not test_spec or test_spec.get('type') != 'test_spec':
            return None
        
        # Check for valid signatures
        signatures = await self.signature_service.get_workitem_signatures(test_spec_id)
        test_spec['is_signed'] = any(sig.is_valid for sig in signatures)
        
        return TestSpecResponse(**test_spec)
    
    async def update_test_spec(
        self,
        test_spec_id: UUID,
        updates: TestSpecUpdate,
        user: User,
        change_description: str,
    ) -> TestSpecResponse:
        """
        Update a test specification, creating a new version.
        
        Args:
            test_spec_id: Test specification ID
            updates: Update data
            user: User making the update
            change_description: Description of changes
            
        Returns:
            Updated test specification
            
        Raises:
            ValueError: If test spec doesn't exist or linked requirements are invalid
        """
        # Get current test spec
        current_test_spec = await self.graph_service.get_workitem(test_spec_id)
        if not current_test_spec or current_test_spec.get('type') != 'test_spec':
            raise ValueError(f"Test specification {test_spec_id} not found")
        
        # Validate linked requirements if provided
        if updates.linked_requirements is not None:
            for req_id in updates.linked_requirements:
                requirement = await self.graph_service.get_workitem(req_id)
                if not requirement:
                    raise ValueError(f"Linked requirement {req_id} does not exist")
                if requirement.get('type') != 'requirement':
                    raise ValueError(f"WorkItem {req_id} is not a requirement")
        
        # Create new version
        update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
        new_version = await self.version_service.create_version(
            workitem_id=test_spec_id,
            updates=update_dict,
            user=user,
            change_description=change_description
        )
        
        # Update requirement relationships if changed
        if updates.linked_requirements is not None:
            # Remove old relationships
            await self.graph_service.remove_relationships(
                from_type="requirement",
                to_id=str(test_spec_id),
                rel_type="TESTED_BY"
            )
            
            # Create new relationships
            for req_id in updates.linked_requirements:
                await self.graph_service.create_relationship(
                    from_id=str(req_id),
                    to_id=str(test_spec_id),
                    rel_type="TESTED_BY",
                    properties={'created_at': datetime.now(UTC).isoformat()}
                )
        
        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="UPDATE",
            entity_type="TestSpec",
            entity_id=test_spec_id,
            details={
                'version': new_version['version'],
                'changes': change_description,
                'updated_fields': list(update_dict.keys())
            }
        )
        
        return TestSpecResponse(**new_version)
    
    async def create_test_run(
        self,
        test_run_data: TestRunCreate,
        user: User,
    ) -> TestRunResponse:
        """
        Create a new test run with result recording.
        
        Args:
            test_run_data: Test run creation data
            user: User executing the test
            
        Returns:
            Created test run
            
        Raises:
            ValueError: If test spec doesn't exist or version is invalid
        """
        # Validate test spec exists and version is valid
        test_spec = await self.graph_service.get_workitem_version(
            test_run_data.test_spec_id,
            test_run_data.test_spec_version
        )
        if not test_spec or test_spec.get('type') != 'test_spec':
            raise ValueError(
                f"Test specification {test_run_data.test_spec_id} "
                f"version {test_run_data.test_spec_version} not found"
            )
        
        # Generate test run ID and prepare data
        test_run_id = uuid4()
        test_run_dict = test_run_data.model_dump()
        test_run_dict.update({
            'id': str(test_run_id),
            'type': 'test_run',
            'created_at': datetime.now(UTC).isoformat(),
            'updated_at': datetime.now(UTC).isoformat(),
            'is_signed': False,
        })
        
        # Create test run node in graph database
        await self.graph_service.create_workitem_node(
            workitem_id=str(test_run_id),
            workitem_type='test_run',
            title=f"Test Run for {test_spec['title']}",
            description=f"Test execution for {test_spec['title']} version {test_run_data.test_spec_version}",
            status='completed',
            version='1.0',
            created_by=str(user.id),
            test_spec_id=str(test_run_data.test_spec_id),
            test_spec_version=test_run_data.test_spec_version,
            executed_by=str(test_run_data.executed_by),
            environment=test_run_data.environment,
            overall_status=test_run_data.overall_status,
            step_results=[step.model_dump() for step in test_run_data.step_results],
            failure_description=test_run_data.failure_description,
            execution_notes=test_run_data.execution_notes,
            defect_workitem_ids=test_run_data.defect_workitem_ids
        )
        
        # Create relationship to test spec
        await self.graph_service.create_relationship(
            from_id=str(test_run_data.test_spec_id),
            to_id=str(test_run_id),
            rel_type="HAS_RUN",
            properties={
                'version': test_run_data.test_spec_version,
                'created_at': datetime.now(UTC).isoformat()
            }
        )
        
        # Link to defect WorkItems if provided
        for defect_id in test_run_data.defect_workitem_ids:
            await self.graph_service.create_relationship(
                from_id=str(test_run_id),
                to_id=str(defect_id),
                rel_type="FOUND_DEFECT",
                properties={'created_at': datetime.now(UTC).isoformat()}
            )
        
        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="CREATE",
            entity_type="TestRun",
            entity_id=test_run_id,
            details={
                'test_spec_id': str(test_run_data.test_spec_id),
                'test_spec_version': test_run_data.test_spec_version,
                'overall_status': test_run_data.overall_status,
                'executed_by': str(test_run_data.executed_by)
            }
        )
        
        return TestRunResponse(**test_run_dict)
    
    async def update_test_run(
        self,
        test_run_id: UUID,
        updates: TestRunUpdate,
        user: User,
    ) -> TestRunResponse:
        """
        Update a test run with new results.
        
        Args:
            test_run_id: Test run ID
            updates: Update data
            user: User making the update
            
        Returns:
            Updated test run
            
        Raises:
            ValueError: If test run doesn't exist
        """
        # Get current test run
        current_test_run = await self.graph_service.get_workitem(test_run_id)
        if not current_test_run or current_test_run.get('type') != 'test_run':
            raise ValueError(f"Test run {test_run_id} not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
        update_dict['updated_at'] = datetime.now(UTC).isoformat()
        
        # Update test run in graph database
        updated_test_run = {**current_test_run, **update_dict}
        await self.graph_service.update_workitem_node(test_run_id, updated_test_run)
        
        # Update defect relationships if changed
        if updates.defect_workitem_ids is not None:
            # Remove old defect relationships
            await self.graph_service.remove_relationships(
                from_id=str(test_run_id),
                to_type="workitem",
                rel_type="FOUND_DEFECT"
            )
            
            # Create new defect relationships
            for defect_id in updates.defect_workitem_ids:
                await self.graph_service.create_relationship(
                    from_id=str(test_run_id),
                    to_id=str(defect_id),
                    rel_type="FOUND_DEFECT",
                    properties={'created_at': datetime.now(UTC).isoformat()}
                )
        
        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="UPDATE",
            entity_type="TestRun",
            entity_id=test_run_id,
            details={
                'updated_fields': list(update_dict.keys()),
                'overall_status': updates.overall_status
            }
        )
        
        return TestRunResponse(**updated_test_run)
    
    async def get_test_runs_for_spec(
        self,
        test_spec_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[TestRunResponse]:
        """
        Get all test runs for a specific test specification.
        
        Args:
            test_spec_id: Test specification ID
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            List of test runs
        """
        query = """
        MATCH (ts:WorkItem {id: $test_spec_id})-[:HAS_RUN]->(tr:WorkItem)
        WHERE ts.type = 'test_spec' AND tr.type = 'test_run'
        RETURN tr
        ORDER BY tr.execution_date DESC
        SKIP $offset
        LIMIT $limit
        """
        
        results = await self.graph_service.execute_query(
            query,
            {
                'test_spec_id': str(test_spec_id),
                'offset': offset,
                'limit': limit
            }
        )
        
        test_runs = []
        for result in results:
            test_run_data = result['tr']
            
            # Check for valid signatures
            signatures = await self.signature_service.get_workitem_signatures(
                UUID(test_run_data['id'])
            )
            test_run_data['is_signed'] = any(sig.is_valid for sig in signatures)
            
            test_runs.append(TestRunResponse(**test_run_data))
        
        return test_runs
    
    async def calculate_test_coverage(self) -> TestCoverageResponse:
        """
        Calculate test coverage metrics across all requirements.
        
        Returns:
            Test coverage metrics
        """
        # Get all requirements
        requirements_query = """
        MATCH (r:WorkItem)
        WHERE r.type = 'requirement'
        RETURN r
        """
        requirements = await self.graph_service.execute_query(requirements_query)
        total_requirements = len(requirements)
        
        if total_requirements == 0:
            return TestCoverageResponse(
                total_requirements=0,
                requirements_with_tests=0,
                requirements_with_passing_tests=0,
                coverage_percentage=0.0,
                detailed_coverage=[]
            )
        
        # Get requirements with test specs
        requirements_with_tests_query = """
        MATCH (r:WorkItem)-[:TESTED_BY]->(ts:WorkItem)
        WHERE r.type = 'requirement' AND ts.type = 'test_spec'
        RETURN DISTINCT r.id as requirement_id
        """
        requirements_with_tests_results = await self.graph_service.execute_query(
            requirements_with_tests_query
        )
        requirements_with_tests = len(requirements_with_tests_results)
        
        # Get requirements with passing test runs
        requirements_with_passing_tests_query = """
        MATCH (r:WorkItem)-[:TESTED_BY]->(ts:WorkItem)-[:HAS_RUN]->(tr:WorkItem)
        WHERE r.type = 'requirement' 
          AND ts.type = 'test_spec' 
          AND tr.type = 'test_run'
          AND tr.overall_status = 'pass'
        RETURN DISTINCT r.id as requirement_id
        """
        requirements_with_passing_tests_results = await self.graph_service.execute_query(
            requirements_with_passing_tests_query
        )
        requirements_with_passing_tests = len(requirements_with_passing_tests_results)
        
        # Calculate coverage percentage
        coverage_percentage = (requirements_with_passing_tests / total_requirements) * 100
        
        # Generate detailed coverage per requirement
        detailed_coverage = []
        for req_result in requirements:
            req = req_result['r']
            req_id = req['id']
            
            # Check if requirement has tests
            has_tests = any(
                result['requirement_id'] == req_id 
                for result in requirements_with_tests_results
            )
            
            # Check if requirement has passing tests
            has_passing_tests = any(
                result['requirement_id'] == req_id 
                for result in requirements_with_passing_tests_results
            )
            
            detailed_coverage.append({
                'requirement_id': req_id,
                'requirement_title': req.get('title', 'Untitled'),
                'has_tests': has_tests,
                'has_passing_tests': has_passing_tests,
                'coverage_status': 'covered' if has_passing_tests else 'partial' if has_tests else 'not_covered'
            })
        
        return TestCoverageResponse(
            total_requirements=total_requirements,
            requirements_with_tests=requirements_with_tests,
            requirements_with_passing_tests=requirements_with_passing_tests,
            coverage_percentage=coverage_percentage,
            detailed_coverage=detailed_coverage
        )
    
    async def get_test_specs(
        self,
        limit: int = 50,
        offset: int = 0,
        test_type: Optional[str] = None,
        linked_requirement_id: Optional[UUID] = None,
    ) -> List[TestSpecResponse]:
        """
        Get test specifications with optional filtering.
        
        Args:
            limit: Maximum number of results
            offset: Number of results to skip
            test_type: Filter by test type
            linked_requirement_id: Filter by linked requirement
            
        Returns:
            List of test specifications
        """
        # Build query based on filters
        if linked_requirement_id:
            query = """
            MATCH (r:WorkItem {id: $req_id})-[:TESTED_BY]->(ts:WorkItem)
            WHERE r.type = 'requirement' AND ts.type = 'test_spec'
            """
            params = {'req_id': str(linked_requirement_id)}
        else:
            query = """
            MATCH (ts:WorkItem)
            WHERE ts.type = 'test_spec'
            """
            params = {}
        
        if test_type:
            query += " AND ts.test_type = $test_type"
            params['test_type'] = test_type
        
        query += """
        RETURN ts
        ORDER BY ts.created_at DESC
        SKIP $offset
        LIMIT $limit
        """
        params.update({'offset': offset, 'limit': limit})
        
        results = await self.graph_service.execute_query(query, params)
        
        test_specs = []
        for result in results:
            test_spec_data = result['ts']
            
            # Check for valid signatures
            signatures = await self.signature_service.get_workitem_signatures(
                UUID(test_spec_data['id'])
            )
            test_spec_data['is_signed'] = any(sig.is_valid for sig in signatures)
            
            test_specs.append(TestSpecResponse(**test_spec_data))
        
        return test_specs
    
    async def delete_test_spec(self, test_spec_id: UUID, user: User) -> bool:
        """
        Delete a test specification if it has no valid signatures.
        
        Args:
            test_spec_id: Test specification ID
            user: User requesting deletion
            
        Returns:
            True if deleted successfully
            
        Raises:
            ValueError: If test spec doesn't exist or has valid signatures
        """
        # Check if test spec exists
        test_spec = await self.graph_service.get_workitem(test_spec_id)
        if not test_spec or test_spec.get('type') != 'test_spec':
            raise ValueError(f"Test specification {test_spec_id} not found")
        
        # Check for valid signatures
        signatures = await self.signature_service.get_workitem_signatures(test_spec_id)
        if any(sig.is_valid for sig in signatures):
            raise ValueError("Cannot delete test specification with valid signatures")
        
        # Delete test spec and all relationships
        await self.graph_service.delete_workitem_node(test_spec_id)
        
        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="DELETE",
            entity_type="TestSpec",
            entity_id=test_spec_id,
            details={'title': test_spec.get('title', 'Unknown')}
        )
        
        return True
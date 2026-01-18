"""WorkItem service for CRUD operations and business logic"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID

from app.db.graph import GraphService, get_graph_service
from app.services.version_service import VersionService, get_version_service
from app.schemas.workitem import (
    WorkItemCreate, 
    WorkItemUpdate, 
    WorkItemResponse,
    RequirementCreate,
    RequirementUpdate,
    TaskCreate,
    TaskUpdate,
    TestSpecCreate,
    TestSpecUpdate,
    RiskCreate,
    RiskUpdate,
    DocumentCreate,
    DocumentUpdate
)
from app.models.user import User


class WorkItemService:
    """Service for managing WorkItems with graph database storage"""
    
    def __init__(self, graph_service: GraphService, version_service: VersionService = None):
        self.graph_service = graph_service
        self.version_service = version_service
        
    async def create_workitem(
        self,
        workitem_data: WorkItemCreate,
        current_user: User
    ) -> WorkItemResponse:
        """
        Create a new WorkItem and store it in the graph database
        
        Args:
            workitem_data: WorkItem creation data
            current_user: User creating the WorkItem
            
        Returns:
            Created WorkItem with metadata
        """
        # Generate unique ID for the WorkItem
        workitem_id = str(uuid.uuid4())
        
        # Prepare node properties
        properties = {
            "id": workitem_id,
            "type": workitem_data.type,
            "title": workitem_data.title,
            "description": workitem_data.description,
            "status": workitem_data.status,
            "priority": workitem_data.priority,
            "assigned_to": str(workitem_data.assigned_to) if workitem_data.assigned_to else None,
            "version": "1.0",
            "created_by": str(current_user.id),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_signed": False
        }
        
        # Add type-specific properties
        if hasattr(workitem_data, 'acceptance_criteria'):
            properties["acceptance_criteria"] = workitem_data.acceptance_criteria
        if hasattr(workitem_data, 'business_value'):
            properties["business_value"] = workitem_data.business_value
        if hasattr(workitem_data, 'source'):
            properties["source"] = workitem_data.source
        if hasattr(workitem_data, 'estimated_hours'):
            properties["estimated_hours"] = workitem_data.estimated_hours
        if hasattr(workitem_data, 'actual_hours'):
            properties["actual_hours"] = workitem_data.actual_hours
        if hasattr(workitem_data, 'due_date'):
            properties["due_date"] = workitem_data.due_date.isoformat() if workitem_data.due_date else None
        if hasattr(workitem_data, 'test_type'):
            properties["test_type"] = workitem_data.test_type
        if hasattr(workitem_data, 'test_steps'):
            properties["test_steps"] = workitem_data.test_steps
        if hasattr(workitem_data, 'expected_result'):
            properties["expected_result"] = workitem_data.expected_result
        if hasattr(workitem_data, 'actual_result'):
            properties["actual_result"] = workitem_data.actual_result
        if hasattr(workitem_data, 'test_status'):
            properties["test_status"] = workitem_data.test_status
        if hasattr(workitem_data, 'severity'):
            properties["severity"] = workitem_data.severity
        if hasattr(workitem_data, 'occurrence'):
            properties["occurrence"] = workitem_data.occurrence
        if hasattr(workitem_data, 'detection'):
            properties["detection"] = workitem_data.detection
        if hasattr(workitem_data, 'rpn'):
            properties["rpn"] = workitem_data.rpn
        if hasattr(workitem_data, 'mitigation_actions'):
            properties["mitigation_actions"] = workitem_data.mitigation_actions
        if hasattr(workitem_data, 'risk_owner'):
            properties["risk_owner"] = str(workitem_data.risk_owner) if workitem_data.risk_owner else None
        if hasattr(workitem_data, 'document_type'):
            properties["document_type"] = workitem_data.document_type
        if hasattr(workitem_data, 'file_path'):
            properties["file_path"] = workitem_data.file_path
        if hasattr(workitem_data, 'file_size'):
            properties["file_size"] = workitem_data.file_size
        if hasattr(workitem_data, 'mime_type'):
            properties["mime_type"] = workitem_data.mime_type
        if hasattr(workitem_data, 'checksum'):
            properties["checksum"] = workitem_data.checksum
            
        # Calculate RPN for risk items
        if workitem_data.type == "risk" and hasattr(workitem_data, 'severity') and hasattr(workitem_data, 'occurrence') and hasattr(workitem_data, 'detection'):
            if workitem_data.severity and workitem_data.occurrence and workitem_data.detection:
                properties["rpn"] = workitem_data.severity * workitem_data.occurrence * workitem_data.detection
        
        # Create the WorkItem node in graph database
        await self.graph_service.create_workitem_node(
            workitem_id=workitem_id,
            workitem_type=workitem_data.type,
            title=workitem_data.title,
            description=workitem_data.description,
            status=workitem_data.status,
            priority=workitem_data.priority,
            version="1.0",
            created_by=str(current_user.id),
            assigned_to=str(workitem_data.assigned_to) if workitem_data.assigned_to else None,
            **{k: v for k, v in properties.items() if k not in [
                'id', 'type', 'title', 'description', 'status', 'priority', 
                'version', 'created_by', 'assigned_to'
            ]}
        )
        
        # Return the created WorkItem
        return WorkItemResponse(
            id=UUID(workitem_id),
            type=workitem_data.type,
            title=workitem_data.title,
            description=workitem_data.description,
            status=workitem_data.status,
            priority=workitem_data.priority,
            assigned_to=workitem_data.assigned_to,
            version="1.0",
            created_by=current_user.id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            is_signed=False
        )
        
    async def get_workitem(self, workitem_id: UUID) -> Optional[WorkItemResponse]:
        """
        Get a WorkItem by ID
        
        Args:
            workitem_id: WorkItem UUID
            
        Returns:
            WorkItem if found, None otherwise
        """
        # Get the WorkItem from graph database
        workitem_data = await self.graph_service.get_workitem(str(workitem_id))
        
        if not workitem_data:
            return None
            
        # Convert graph data to WorkItemResponse
        return self._graph_data_to_response(workitem_data)
        
    async def get_workitem_version(
        self, 
        workitem_id: UUID, 
        version: str
    ) -> Optional[WorkItemResponse]:
        """
        Get a specific version of a WorkItem using VersionService
        
        Args:
            workitem_id: WorkItem UUID
            version: Version string (e.g., "1.0", "1.1")
            
        Returns:
            WorkItem version if found, None otherwise
        """
        if self.version_service:
            try:
                # Use VersionService to get specific version
                version_data = await self.version_service.get_version_by_number(workitem_id, version)
                if version_data:
                    return self._graph_data_to_response(version_data)
            except Exception as e:
                print(f"VersionService failed, falling back to graph service: {e}")
        
        # Fallback: Use graph service directly
        workitem_data = await self.graph_service.get_workitem_version(
            str(workitem_id), 
            version
        )
        
        if not workitem_data:
            return None
            
        return self._graph_data_to_response(workitem_data)
        
    async def update_workitem(
        self,
        workitem_id: UUID,
        updates: WorkItemUpdate,
        current_user: User,
        change_description: str = "WorkItem updated"
    ) -> Optional[WorkItemResponse]:
        """
        Update a WorkItem using the VersionService for proper version control
        
        Args:
            workitem_id: WorkItem UUID
            updates: Update data
            current_user: User making the update
            change_description: Description of changes made
            
        Returns:
            Updated WorkItem with new version
        """
        # Check if WorkItem exists
        current_workitem = await self.graph_service.get_workitem(str(workitem_id))
        if not current_workitem:
            return None
            
        # Prepare update data
        update_data = {}
        if updates.title is not None:
            update_data["title"] = updates.title
        if updates.description is not None:
            update_data["description"] = updates.description
        if updates.status is not None:
            update_data["status"] = updates.status
        if updates.priority is not None:
            update_data["priority"] = updates.priority
        if updates.assigned_to is not None:
            update_data["assigned_to"] = str(updates.assigned_to)
            
        # Add type-specific updates
        if hasattr(updates, 'acceptance_criteria') and updates.acceptance_criteria is not None:
            update_data["acceptance_criteria"] = updates.acceptance_criteria
        if hasattr(updates, 'business_value') and updates.business_value is not None:
            update_data["business_value"] = updates.business_value
        if hasattr(updates, 'source') and updates.source is not None:
            update_data["source"] = updates.source
        if hasattr(updates, 'estimated_hours') and updates.estimated_hours is not None:
            update_data["estimated_hours"] = updates.estimated_hours
        if hasattr(updates, 'actual_hours') and updates.actual_hours is not None:
            update_data["actual_hours"] = updates.actual_hours
        if hasattr(updates, 'due_date') and updates.due_date is not None:
            update_data["due_date"] = updates.due_date.isoformat()
        if hasattr(updates, 'test_type') and updates.test_type is not None:
            update_data["test_type"] = updates.test_type
        if hasattr(updates, 'test_steps') and updates.test_steps is not None:
            update_data["test_steps"] = updates.test_steps
        if hasattr(updates, 'expected_result') and updates.expected_result is not None:
            update_data["expected_result"] = updates.expected_result
        if hasattr(updates, 'actual_result') and updates.actual_result is not None:
            update_data["actual_result"] = updates.actual_result
        if hasattr(updates, 'test_status') and updates.test_status is not None:
            update_data["test_status"] = updates.test_status
        if hasattr(updates, 'severity') and updates.severity is not None:
            update_data["severity"] = updates.severity
        if hasattr(updates, 'occurrence') and updates.occurrence is not None:
            update_data["occurrence"] = updates.occurrence
        if hasattr(updates, 'detection') and updates.detection is not None:
            update_data["detection"] = updates.detection
        if hasattr(updates, 'mitigation_actions') and updates.mitigation_actions is not None:
            update_data["mitigation_actions"] = updates.mitigation_actions
        if hasattr(updates, 'risk_owner') and updates.risk_owner is not None:
            update_data["risk_owner"] = str(updates.risk_owner)
        if hasattr(updates, 'document_type') and updates.document_type is not None:
            update_data["document_type"] = updates.document_type
        if hasattr(updates, 'file_path') and updates.file_path is not None:
            update_data["file_path"] = updates.file_path
        if hasattr(updates, 'file_size') and updates.file_size is not None:
            update_data["file_size"] = updates.file_size
        if hasattr(updates, 'mime_type') and updates.mime_type is not None:
            update_data["mime_type"] = updates.mime_type
        if hasattr(updates, 'checksum') and updates.checksum is not None:
            update_data["checksum"] = updates.checksum
            
        # Recalculate RPN for risk items if severity, occurrence, or detection changed
        if (current_workitem.get("type") == "risk" and 
            any(field in update_data for field in ['severity', 'occurrence', 'detection'])):
            
            severity = update_data.get('severity', current_workitem.get('severity'))
            occurrence = update_data.get('occurrence', current_workitem.get('occurrence'))
            detection = update_data.get('detection', current_workitem.get('detection'))
            
            if severity and occurrence and detection:
                update_data["rpn"] = severity * occurrence * detection
        
        # Use VersionService to create new version if available
        if self.version_service:
            try:
                new_version_data = await self.version_service.create_version(
                    workitem_id=workitem_id,
                    updates=update_data,
                    user=current_user,
                    change_description=change_description
                )
                return self._graph_data_to_response(new_version_data)
            except Exception as e:
                # Fall back to manual version creation if VersionService fails
                print(f"VersionService failed, falling back to manual versioning: {e}")
        
        # Fallback: Manual version creation (legacy behavior)
        # Calculate new version number
        current_version = current_workitem.get("version", "1.0")
        try:
            major, minor = map(int, current_version.split('.'))
            new_version = f"{major}.{minor + 1}"
        except (ValueError, AttributeError):
            new_version = "1.1"
            
        # Create new version with updates
        merged_data = {**current_workitem, **update_data}
        merged_data.update({
            "version": new_version,
            "updated_by": str(current_user.id),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "change_description": change_description
        })
        
        # Create new version node in graph
        await self.graph_service.create_workitem_version(
            workitem_id=str(workitem_id),
            version=new_version,
            data=merged_data,
            user_id=str(current_user.id),
            change_description=change_description
        )
        
        # Create version relationship
        await self.graph_service.create_relationship(
            from_id=str(workitem_id),
            to_id=str(workitem_id),  # Same node, different version
            rel_type="NEXT_VERSION",
            properties={
                'from_version': current_version,
                'to_version': new_version,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
        )
        
        return self._graph_data_to_response(merged_data)
        
    async def delete_workitem(
        self,
        workitem_id: UUID,
        current_user: User,
        force: bool = False
    ) -> bool:
        """
        Delete a WorkItem (checks for signatures unless forced)
        
        Args:
            workitem_id: WorkItem UUID
            current_user: User requesting deletion
            force: Force deletion even if signed (admin only)
            
        Returns:
            True if deleted successfully, False otherwise
        """
        # Get the WorkItem
        workitem_data = await self.graph_service.get_workitem(str(workitem_id))
        if not workitem_data:
            return False
            
        # Check if WorkItem is signed (would need signature service integration)
        is_signed = workitem_data.get("is_signed", False)
        
        if is_signed and not force:
            raise ValueError("Cannot delete signed WorkItem. Use force=True to override.")
            
        # Delete the WorkItem node and all its relationships
        await self.graph_service.delete_node(str(workitem_id))
        
        return True
        
    async def compare_workitem_versions(
        self,
        workitem_id: UUID,
        version1: str,
        version2: str
    ) -> Optional[Dict[str, Any]]:
        """
        Compare two versions of a WorkItem using VersionService
        
        Args:
            workitem_id: WorkItem UUID
            version1: First version to compare
            version2: Second version to compare
            
        Returns:
            Dictionary containing the differences between versions, or None if VersionService unavailable
        """
        if self.version_service:
            try:
                return await self.version_service.compare_versions(workitem_id, version1, version2)
            except Exception as e:
                print(f"VersionService comparison failed: {e}")
                return None
        
        # No fallback implementation for comparison - requires VersionService
        return None
        
    async def search_workitems(
        self,
        search_text: Optional[str] = None,
        workitem_type: Optional[str] = None,
        status: Optional[str] = None,
        assigned_to: Optional[UUID] = None,
        created_by: Optional[UUID] = None,
        priority: Optional[int] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[WorkItemResponse]:
        """
        Search WorkItems with filters
        
        Args:
            search_text: Text to search in title and description
            workitem_type: Filter by WorkItem type
            status: Filter by status
            assigned_to: Filter by assigned user
            created_by: Filter by creator
            priority: Filter by priority level
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            List of matching WorkItems
        """
        # Use graph service search with filters
        results = await self.graph_service.search_workitems(
            search_text=search_text,
            workitem_type=workitem_type,
            status=status,
            assigned_to=str(assigned_to) if assigned_to else None,
            limit=limit
        )
        
        # Convert results to WorkItemResponse objects
        workitems = []
        for result in results:
            workitem = self._graph_data_to_response(result)
            if workitem:
                # Apply additional filters not handled by graph service
                if created_by and workitem.created_by != created_by:
                    continue
                if priority and workitem.priority != priority:
                    continue
                    
                workitems.append(workitem)
                
        # Apply offset and limit
        return workitems[offset:offset + limit]
        
    async def get_workitem_history(
        self,
        workitem_id: UUID
    ) -> List[WorkItemResponse]:
        """
        Get complete version history for a WorkItem using VersionService
        
        Args:
            workitem_id: WorkItem UUID
            
        Returns:
            List of WorkItem versions ordered by version number (newest first)
        """
        if self.version_service:
            try:
                # Use VersionService to get complete history
                version_history = await self.version_service.get_version_history(workitem_id)
                
                # Convert to WorkItemResponse objects
                workitem_responses = []
                for version_data in version_history:
                    response = self._graph_data_to_response(version_data)
                    if response:
                        workitem_responses.append(response)
                
                return workitem_responses
            except Exception as e:
                print(f"VersionService failed, falling back to current version only: {e}")
        
        # Fallback: Return current version only
        current = await self.get_workitem(workitem_id)
        return [current] if current else []
        
    def _graph_data_to_response(self, graph_data: Dict[str, Any]) -> Optional[WorkItemResponse]:
        """
        Convert graph database data to WorkItemResponse
        
        Args:
            graph_data: Raw data from graph database
            
        Returns:
            WorkItemResponse object or None if conversion fails
        """
        try:
            # Parse datetime strings
            created_at = datetime.fromisoformat(
                graph_data.get("created_at", datetime.now(timezone.utc).isoformat())
            )
            updated_at = datetime.fromisoformat(
                graph_data.get("updated_at", datetime.now(timezone.utc).isoformat())
            )
            
            # Parse UUIDs
            workitem_id = UUID(graph_data["id"])
            created_by = UUID(graph_data["created_by"])
            assigned_to = UUID(graph_data["assigned_to"]) if graph_data.get("assigned_to") else None
            
            return WorkItemResponse(
                id=workitem_id,
                type=graph_data["type"],
                title=graph_data["title"],
                description=graph_data.get("description"),
                status=graph_data["status"],
                priority=graph_data.get("priority"),
                assigned_to=assigned_to,
                version=graph_data.get("version", "1.0"),
                created_by=created_by,
                created_at=created_at,
                updated_at=updated_at,
                is_signed=graph_data.get("is_signed", False)
            )
        except (KeyError, ValueError, TypeError) as e:
            # Log error and return None
            print(f"Error converting graph data to WorkItemResponse: {e}")
            return None


async def get_workitem_service() -> WorkItemService:
    """Dependency for getting WorkItem service with VersionService integration"""
    graph_service = await get_graph_service()
    
    # Try to get VersionService, but don't fail if it's not available
    try:
        version_service = await get_version_service(graph_service=graph_service)
    except Exception as e:
        print(f"Warning: Could not initialize VersionService: {e}")
        version_service = None
    
    return WorkItemService(graph_service, version_service)
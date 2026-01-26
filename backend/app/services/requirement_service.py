"""RequirementService extending WorkItemService for requirement-specific operations"""

import uuid
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.db.graph import GraphService
from app.models.user import User
from app.schemas.workitem import (
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    CommentUpdate,
    RequirementCreate,
    RequirementResponse,
    RequirementUpdate,
    WorkItemResponse,
)
from app.services.audit_service import AuditService, get_audit_service
from app.services.version_service import VersionService
from app.services.workitem_service import WorkItemService


class RequirementComment:
    """Data class for requirement comments"""

    def __init__(
        self,
        id: str,
        requirement_id: str,
        user_id: str,
        comment: str,
        created_at: datetime,
        version: str
    ):
        self.id = id
        self.requirement_id = requirement_id
        self.user_id = user_id
        self.comment = comment
        self.created_at = created_at
        self.version = version


class RequirementService(WorkItemService):
    """Service for managing Requirements with specialized functionality"""

    def __init__(
        self,
        graph_service: GraphService,
        version_service: VersionService = None,
        audit_service: AuditService = None
    ):
        super().__init__(graph_service, version_service)
        self.audit_service = audit_service

    async def create_requirement(
        self,
        requirement_data: RequirementCreate,
        current_user: User
    ) -> RequirementResponse:
        """
        Create a new Requirement WorkItem with requirement-specific validation
        
        Args:
            requirement_data: Requirement creation data
            current_user: User creating the requirement
            
        Returns:
            Created Requirement with metadata
            
        Raises:
            ValueError: If requirement validation fails
        """
        # Validate requirement-specific fields
        await self._validate_requirement_data(requirement_data)

        # Create the WorkItem using parent class
        workitem = await self.create_workitem(requirement_data, current_user)

        # Log requirement creation
        if self.audit_service:
            await self.audit_service.log(
                user_id=current_user.id,
                action="CREATE",
                entity_type="Requirement",
                entity_id=workitem.id,
                details={
                    "title": requirement_data.title,
                    "acceptance_criteria": requirement_data.acceptance_criteria,
                    "business_value": requirement_data.business_value,
                    "source": requirement_data.source
                }
            )

        # Convert to RequirementResponse
        return await self._workitem_to_requirement_response(workitem)

    async def get_requirement(self, requirement_id: UUID) -> RequirementResponse | None:
        """
        Get a Requirement by ID with requirement-specific data
        
        Args:
            requirement_id: Requirement UUID
            
        Returns:
            Requirement if found and is of type 'requirement', None otherwise
        """
        workitem = await self.get_workitem(requirement_id)

        if not workitem or workitem.type != "requirement":
            return None

        return await self._workitem_to_requirement_response(workitem)

    async def update_requirement(
        self,
        requirement_id: UUID,
        updates: RequirementUpdate,
        current_user: User,
        change_description: str = "Requirement updated"
    ) -> RequirementResponse | None:
        """
        Update a Requirement with requirement-specific validation
        
        Args:
            requirement_id: Requirement UUID
            updates: Update data
            current_user: User making the update
            change_description: Description of changes made
            
        Returns:
            Updated Requirement with new version
        """
        # Validate the requirement exists and is of correct type
        existing = await self.get_requirement(requirement_id)
        if not existing:
            return None

        # Validate requirement-specific updates
        await self._validate_requirement_update(updates)

        # Update using parent class
        updated_workitem = await self.update_workitem(
            requirement_id,
            updates,
            current_user,
            change_description
        )

        if not updated_workitem:
            return None

        # Log requirement update
        if self.audit_service:
            await self.audit_service.log(
                user_id=current_user.id,
                action="UPDATE",
                entity_type="Requirement",
                entity_id=requirement_id,
                details={
                    "change_description": change_description,
                    "version": updated_workitem.version,
                    "updated_fields": [
                        field for field, value in updates.model_dump(exclude_unset=True).items()
                        if value is not None
                    ]
                }
            )

        return await self._workitem_to_requirement_response(updated_workitem)

    async def add_comment(
        self,
        requirement_id: UUID,
        comment_data: CommentCreate,
        current_user: User
    ) -> CommentResponse:
        """
        Add a comment to a requirement with comprehensive user attribution
        
        Args:
            requirement_id: Requirement UUID
            comment_data: Comment creation data with validation
            current_user: User adding the comment
            
        Returns:
            Created comment with full metadata and user attribution
            
        Raises:
            ValueError: If requirement not found or validation fails
            PermissionError: If user lacks permission to comment
        """
        # Validate requirement exists and user has access
        requirement = await self.get_requirement(requirement_id)
        if not requirement:
            raise ValueError(f"Requirement {requirement_id} not found")

        # Additional validation for comment permissions
        await self._validate_comment_permissions(requirement, current_user)

        # Generate comment ID
        comment_id = str(uuid.uuid4())
        current_time = datetime.now(UTC)

        # Create comprehensive comment properties with user attribution
        comment_properties = {
            "id": comment_id,
            "requirement_id": str(requirement_id),
            "user_id": str(current_user.id),
            "user_name": current_user.full_name,
            "user_email": current_user.email,
            "user_role": current_user.role,
            "comment": comment_data.comment,
            "created_at": current_time.isoformat(),
            "updated_at": current_time.isoformat(),
            "version": requirement.version,
            "is_edited": False,
            "edit_count": 0,
            "ip_address": getattr(current_user, 'ip_address', None),  # If available from request context
            "user_agent": getattr(current_user, 'user_agent', None)   # If available from request context
        }

        # Create comment node in graph database
        await self.graph_service.execute_query(
            """
            CREATE (c:Comment $properties)
            """,
            {"properties": comment_properties}
        )

        # Create relationship from requirement to comment with metadata
        await self.graph_service.create_relationship(
            from_id=str(requirement_id),
            to_id=comment_id,
            rel_type="HAS_COMMENT",
            properties={
                "created_at": current_time.isoformat(),
                "created_by": str(current_user.id),
                "comment_type": "user_comment"
            }
        )

        # Create relationship from user to comment for user attribution
        await self.graph_service.create_relationship(
            from_id=str(current_user.id),
            to_id=comment_id,
            rel_type="AUTHORED",
            properties={
                "created_at": current_time.isoformat(),
                "role_at_time": current_user.role
            }
        )

        # Log comprehensive audit event
        if self.audit_service:
            await self.audit_service.log(
                user_id=current_user.id,
                action="CREATE",
                entity_type="RequirementComment",
                entity_id=UUID(comment_id),
                details={
                    "requirement_id": str(requirement_id),
                    "requirement_title": requirement.title,
                    "requirement_version": requirement.version,
                    "comment_length": len(comment_data.comment),
                    "user_name": current_user.full_name,
                    "user_role": current_user.role,
                    "comment_preview": comment_data.comment[:100] + "..." if len(comment_data.comment) > 100 else comment_data.comment
                }
            )

        # Return comprehensive comment response
        return CommentResponse(
            id=UUID(comment_id),
            requirement_id=requirement_id,
            user_id=current_user.id,
            user_name=current_user.full_name,
            user_email=current_user.email,
            comment=comment_data.comment,
            created_at=current_time,
            updated_at=current_time,
            version=requirement.version,
            is_edited=False,
            edit_count=0
        )

    async def get_requirement_comments(
        self,
        requirement_id: UUID,
        page: int = 1,
        page_size: int = 20,
        include_user_info: bool = True
    ) -> CommentListResponse:
        """
        Get paginated comments for a requirement with comprehensive user information
        
        Args:
            requirement_id: Requirement UUID
            page: Page number (1-based)
            page_size: Number of comments per page
            include_user_info: Whether to include detailed user information
            
        Returns:
            Paginated list of comments with metadata
        """
        # Validate pagination parameters
        if page < 1:
            raise ValueError("Page number must be 1 or greater")
        if page_size < 1 or page_size > 100:
            raise ValueError("Page size must be between 1 and 100")

        # Calculate offset
        offset = (page - 1) * page_size

        # Query comments with user information
        if include_user_info:
            query = """
            MATCH (r:WorkItem {id: $requirement_id})-[:HAS_COMMENT]->(c:Comment)
            OPTIONAL MATCH (u:User {id: c.user_id})
            RETURN c, u
            ORDER BY c.created_at DESC
            SKIP $offset
            LIMIT $limit
            """
        else:
            query = """
            MATCH (r:WorkItem {id: $requirement_id})-[:HAS_COMMENT]->(c:Comment)
            RETURN c
            ORDER BY c.created_at DESC
            SKIP $offset
            LIMIT $limit
            """

        # Get total count for pagination
        count_query = """
        MATCH (r:WorkItem {id: $requirement_id})-[:HAS_COMMENT]->(c:Comment)
        RETURN count(c) as total
        """

        # Execute queries
        results = await self.graph_service.execute_query(
            query,
            {
                "requirement_id": str(requirement_id),
                "offset": offset,
                "limit": page_size
            }
        )

        count_result = await self.graph_service.execute_query(
            count_query,
            {"requirement_id": str(requirement_id)}
        )

        total_count = count_result[0].get("total", 0) if count_result else 0

        # Process comments
        comments = []
        for result in results:
            comment_data = result.get("c", {})
            user_data = result.get("u", {}) if include_user_info else {}

            if comment_data:
                comment_response = CommentResponse(
                    id=UUID(comment_data["id"]),
                    requirement_id=UUID(comment_data["requirement_id"]),
                    user_id=UUID(comment_data["user_id"]),
                    user_name=comment_data.get("user_name") or user_data.get("full_name"),
                    user_email=comment_data.get("user_email") or user_data.get("email"),
                    comment=comment_data["comment"],
                    created_at=datetime.fromisoformat(comment_data["created_at"]),
                    updated_at=datetime.fromisoformat(comment_data.get("updated_at", comment_data["created_at"])),
                    version=comment_data["version"],
                    is_edited=comment_data.get("is_edited", False),
                    edit_count=comment_data.get("edit_count", 0)
                )
                comments.append(comment_response)

        # Calculate pagination metadata
        has_next = (offset + page_size) < total_count
        has_previous = page > 1

        return CommentListResponse(
            comments=comments,
            total_count=total_count,
            page=page,
            page_size=page_size,
            has_next=has_next,
            has_previous=has_previous
        )

    async def update_comment(
        self,
        comment_id: UUID,
        comment_data: CommentUpdate,
        current_user: User
    ) -> CommentResponse:
        """
        Update a comment with user attribution and edit tracking
        
        Args:
            comment_id: Comment UUID to update
            comment_data: Updated comment data
            current_user: User updating the comment
            
        Returns:
            Updated comment with metadata
            
        Raises:
            ValueError: If comment not found
            PermissionError: If user lacks permission to edit
        """
        # Get existing comment
        existing_comment = await self._get_comment_by_id(comment_id)
        if not existing_comment:
            raise ValueError(f"Comment {comment_id} not found")

        # Check permissions - only author or admin can edit
        if (existing_comment["user_id"] != str(current_user.id) and
            current_user.role not in ["admin", "project_manager"]):
            raise PermissionError("You can only edit your own comments")

        current_time = datetime.now(UTC)
        edit_count = existing_comment.get("edit_count", 0) + 1

        # Update comment properties
        update_query = """
        MATCH (c:Comment {id: $comment_id})
        SET c.comment = $comment,
            c.updated_at = $updated_at,
            c.is_edited = true,
            c.edit_count = $edit_count,
            c.last_edited_by = $user_id,
            c.last_edited_by_name = $user_name
        RETURN c
        """

        await self.graph_service.execute_query(
            update_query,
            {
                "comment_id": str(comment_id),
                "comment": comment_data.comment,
                "updated_at": current_time.isoformat(),
                "edit_count": edit_count,
                "user_id": str(current_user.id),
                "user_name": current_user.full_name
            }
        )

        # Log comment update
        if self.audit_service:
            await self.audit_service.log(
                user_id=current_user.id,
                action="UPDATE",
                entity_type="RequirementComment",
                entity_id=comment_id,
                details={
                    "requirement_id": existing_comment["requirement_id"],
                    "edit_count": edit_count,
                    "original_comment_preview": existing_comment["comment"][:100],
                    "updated_comment_preview": comment_data.comment[:100],
                    "user_name": current_user.full_name
                }
            )

        # Return updated comment
        updated_comment = await self._get_comment_by_id(comment_id)
        return self._comment_data_to_response(updated_comment)

    async def delete_comment(
        self,
        comment_id: UUID,
        current_user: User
    ) -> bool:
        """
        Delete a comment with proper authorization
        
        Args:
            comment_id: Comment UUID to delete
            current_user: User requesting deletion
            
        Returns:
            True if deleted successfully
            
        Raises:
            ValueError: If comment not found
            PermissionError: If user lacks permission to delete
        """
        # Get existing comment
        existing_comment = await self._get_comment_by_id(comment_id)
        if not existing_comment:
            raise ValueError(f"Comment {comment_id} not found")

        # Check permissions - only author or admin can delete
        if (existing_comment["user_id"] != str(current_user.id) and
            current_user.role not in ["admin", "project_manager"]):
            raise PermissionError("You can only delete your own comments")

        # Delete comment and relationships
        delete_query = """
        MATCH (c:Comment {id: $comment_id})
        DETACH DELETE c
        """

        await self.graph_service.execute_query(
            delete_query,
            {"comment_id": str(comment_id)}
        )

        # Log comment deletion
        if self.audit_service:
            await self.audit_service.log(
                user_id=current_user.id,
                action="DELETE",
                entity_type="RequirementComment",
                entity_id=comment_id,
                details={
                    "requirement_id": existing_comment["requirement_id"],
                    "deleted_comment_preview": existing_comment["comment"][:100],
                    "original_author": existing_comment.get("user_name", "Unknown"),
                    "deleted_by": current_user.full_name
                }
            )

        return True

    async def get_comment_by_id(
        self,
        comment_id: UUID,
        current_user: User
    ) -> CommentResponse | None:
        """
        Get a specific comment by ID with user attribution
        
        Args:
            comment_id: Comment UUID
            current_user: User requesting the comment
            
        Returns:
            Comment with metadata if found and accessible
        """
        comment_data = await self._get_comment_by_id(comment_id)
        if not comment_data:
            return None

        # Check if user has access to the requirement
        requirement = await self.get_requirement(UUID(comment_data["requirement_id"]))
        if not requirement:
            return None

        return self._comment_data_to_response(comment_data)

    async def track_requirement_dependency(
        self,
        requirement_id: UUID,
        depends_on_id: UUID,
        current_user: User,
        dependency_type: str = "depends_on",
        description: str | None = None,
        priority: int | None = None
    ) -> bool:
        """
        Create a dependency relationship between requirements with enhanced metadata
        
        Args:
            requirement_id: Requirement that depends on another
            depends_on_id: Requirement that is depended upon
            current_user: User creating the dependency
            dependency_type: Type of dependency (depends_on, blocks, relates_to, implements, validates, conflicts_with)
            description: Optional description of the dependency relationship
            priority: Optional priority level for the dependency (1-5)
            
        Returns:
            True if dependency created successfully
            
        Raises:
            ValueError: If requirements not found or invalid dependency type
        """
        # Validate both requirements exist
        req1 = await self.get_requirement(requirement_id)
        req2 = await self.get_requirement(depends_on_id)

        if not req1:
            raise ValueError(f"Requirement {requirement_id} not found")
        if not req2:
            raise ValueError(f"Requirement {depends_on_id} not found")

        # Validate dependency type with expanded options
        valid_types = {"depends_on", "blocks", "relates_to", "implements", "validates", "conflicts_with"}
        if dependency_type not in valid_types:
            raise ValueError(f"Invalid dependency type. Must be one of: {', '.join(valid_types)}")

        # Prevent self-dependency
        if requirement_id == depends_on_id:
            raise ValueError("Requirement cannot depend on itself")

        # Check for circular dependencies before creating
        await self._check_circular_dependencies_enhanced(requirement_id, [depends_on_id], dependency_type)

        # Check if dependency already exists
        existing_dep = await self._get_existing_dependency(requirement_id, depends_on_id, dependency_type)
        if existing_dep:
            raise ValueError(f"Dependency of type '{dependency_type}' already exists between these requirements")

        # Validate priority if provided
        if priority is not None and (priority < 1 or priority > 5):
            raise ValueError("Dependency priority must be between 1 and 5")

        # Create enhanced dependency relationship
        relationship_type = dependency_type.upper()
        properties = {
            "created_by": str(current_user.id),
            "created_by_name": current_user.full_name,
            "created_at": datetime.now(UTC).isoformat(),
            "dependency_type": dependency_type,
            "status": "active"
        }

        if description:
            properties["description"] = description
        if priority:
            properties["priority"] = priority

        await self.graph_service.create_relationship(
            from_id=str(requirement_id),
            to_id=str(depends_on_id),
            rel_type=relationship_type,
            properties=properties
        )

        # Log dependency creation with enhanced details
        if self.audit_service:
            await self.audit_service.log(
                user_id=current_user.id,
                action="CREATE",
                entity_type="RequirementDependency",
                entity_id=requirement_id,
                details={
                    "from_requirement": str(requirement_id),
                    "from_requirement_title": req1.title,
                    "to_requirement": str(depends_on_id),
                    "to_requirement_title": req2.title,
                    "dependency_type": dependency_type,
                    "description": description,
                    "priority": priority,
                    "user_name": current_user.full_name
                }
            )

        return True

    async def get_requirement_dependencies(
        self,
        requirement_id: UUID,
        include_metadata: bool = True,
        dependency_types: list[str] | None = None
    ) -> dict[str, list[dict[str, Any]]]:
        """
        Get all dependencies for a requirement with enhanced metadata
        
        Args:
            requirement_id: Requirement UUID
            include_metadata: Whether to include dependency metadata (description, priority, etc.)
            dependency_types: Filter by specific dependency types
            
        Returns:
            Dictionary with dependency types as keys and lists of requirements with metadata
        """
        # Build relationship type filter
        if dependency_types:
            valid_types = {"depends_on", "blocks", "relates_to", "implements", "validates", "conflicts_with"}
            invalid_types = set(dependency_types) - valid_types
            if invalid_types:
                raise ValueError(f"Invalid dependency types: {', '.join(invalid_types)}")
            rel_filter = "|".join([t.upper() for t in dependency_types])
        else:
            rel_filter = "DEPENDS_ON|BLOCKS|RELATES_TO|IMPLEMENTS|VALIDATES|CONFLICTS_WITH"

        # Query outgoing dependencies (what this requirement depends on)
        depends_on_query = f"""
        MATCH (r:WorkItem {{id: $requirement_id}})-[rel:{rel_filter}]->(dep:WorkItem)
        WHERE dep.type = 'requirement'
        RETURN dep, rel, type(rel) as rel_type
        ORDER BY rel.priority DESC, rel.created_at ASC
        """

        depends_on_results = await self.graph_service.execute_query(
            depends_on_query,
            {"requirement_id": str(requirement_id)}
        )

        # Query incoming dependencies (what depends on this requirement)
        depended_by_query = f"""
        MATCH (dep:WorkItem)-[rel:{rel_filter}]->(r:WorkItem {{id: $requirement_id}})
        WHERE dep.type = 'requirement'
        RETURN dep, rel, type(rel) as rel_type
        ORDER BY rel.priority DESC, rel.created_at ASC
        """

        depended_by_results = await self.graph_service.execute_query(
            depended_by_query,
            {"requirement_id": str(requirement_id)}
        )

        dependencies = {
            "depends_on": [],
            "blocks": [],
            "relates_to": [],
            "implements": [],
            "validates": [],
            "conflicts_with": [],
            "depended_by": [],
            "blocked_by": [],
            "related_by": [],
            "implemented_by": [],
            "validated_by": [],
            "conflicts_by": []
        }

        # Process outgoing dependencies
        for result in depends_on_results:
            dep_data = result.get("dep", {})
            rel_data = result.get("rel", {})
            rel_type = result.get("rel_type", "").lower()

            if dep_data:
                workitem = self._graph_data_to_response(dep_data)
                if workitem:
                    requirement_resp = await self._workitem_to_requirement_response(workitem)

                    # Create dependency entry with metadata
                    dep_entry = {
                        "requirement": requirement_resp,
                        "relationship_id": rel_data.get("id") if rel_data else None,
                        "created_at": rel_data.get("created_at") if rel_data else None,
                        "created_by": rel_data.get("created_by") if rel_data else None,
                        "created_by_name": rel_data.get("created_by_name") if rel_data else None,
                        "status": rel_data.get("status", "active") if rel_data else "active"
                    }

                    if include_metadata and rel_data:
                        dep_entry.update({
                            "description": rel_data.get("description"),
                            "priority": rel_data.get("priority"),
                            "dependency_type": rel_data.get("dependency_type")
                        })

                    # Add to appropriate list
                    if rel_type in dependencies:
                        dependencies[rel_type].append(dep_entry)

        # Process incoming dependencies
        for result in depended_by_results:
            dep_data = result.get("dep", {})
            rel_data = result.get("rel", {})
            rel_type = result.get("rel_type", "").lower()

            if dep_data:
                workitem = self._graph_data_to_response(dep_data)
                if workitem:
                    requirement_resp = await self._workitem_to_requirement_response(workitem)

                    # Create dependency entry with metadata
                    dep_entry = {
                        "requirement": requirement_resp,
                        "relationship_id": rel_data.get("id") if rel_data else None,
                        "created_at": rel_data.get("created_at") if rel_data else None,
                        "created_by": rel_data.get("created_by") if rel_data else None,
                        "created_by_name": rel_data.get("created_by_name") if rel_data else None,
                        "status": rel_data.get("status", "active") if rel_data else "active"
                    }

                    if include_metadata and rel_data:
                        dep_entry.update({
                            "description": rel_data.get("description"),
                            "priority": rel_data.get("priority"),
                            "dependency_type": rel_data.get("dependency_type")
                        })

                    # Add to appropriate incoming list
                    incoming_key = f"{rel_type}_by" if rel_type != "depends_on" else "depended_by"
                    if rel_type == "implements":
                        incoming_key = "implemented_by"
                    elif rel_type == "validates":
                        incoming_key = "validated_by"
                    elif rel_type == "conflicts_with":
                        incoming_key = "conflicts_by"

                    if incoming_key in dependencies:
                        dependencies[incoming_key].append(dep_entry)

        return dependencies

    async def remove_requirement_dependency(
        self,
        requirement_id: UUID,
        depends_on_id: UUID,
        current_user: User,
        dependency_type: str,
        reason: str | None = None
    ) -> bool:
        """
        Remove a dependency relationship between requirements
        
        Args:
            requirement_id: Requirement that depends on another
            depends_on_id: Requirement that is depended upon
            current_user: User removing the dependency
            dependency_type: Type of dependency to remove
            reason: Optional reason for removal
            
        Returns:
            True if dependency removed successfully
            
        Raises:
            ValueError: If dependency not found or invalid type
        """
        # Validate dependency type
        valid_types = {"depends_on", "blocks", "relates_to", "implements", "validates", "conflicts_with"}
        if dependency_type not in valid_types:
            raise ValueError(f"Invalid dependency type. Must be one of: {', '.join(valid_types)}")

        # Check if dependency exists
        existing_dep = await self._get_existing_dependency(requirement_id, depends_on_id, dependency_type)
        if not existing_dep:
            raise ValueError(f"Dependency of type '{dependency_type}' does not exist between these requirements")

        # Remove the relationship
        relationship_type = dependency_type.upper()
        await self.graph_service.execute_query(
            f"""
            MATCH (r1:WorkItem {{id: $requirement_id}})-[rel:{relationship_type}]->(r2:WorkItem {{id: $depends_on_id}})
            DELETE rel
            """,
            {
                "requirement_id": str(requirement_id),
                "depends_on_id": str(depends_on_id)
            }
        )

        # Log dependency removal
        if self.audit_service:
            await self.audit_service.log(
                user_id=current_user.id,
                action="DELETE",
                entity_type="RequirementDependency",
                entity_id=requirement_id,
                details={
                    "from_requirement": str(requirement_id),
                    "to_requirement": str(depends_on_id),
                    "dependency_type": dependency_type,
                    "reason": reason,
                    "user_name": current_user.full_name
                }
            )

        return True

    async def update_dependency_metadata(
        self,
        requirement_id: UUID,
        depends_on_id: UUID,
        dependency_type: str,
        current_user: User,
        description: str | None = None,
        priority: int | None = None,
        status: str | None = None
    ) -> bool:
        """
        Update metadata for an existing dependency relationship
        
        Args:
            requirement_id: Requirement that depends on another
            depends_on_id: Requirement that is depended upon
            dependency_type: Type of dependency to update
            current_user: User updating the dependency
            description: New description
            priority: New priority (1-5)
            status: New status (active, inactive, deprecated)
            
        Returns:
            True if dependency updated successfully
            
        Raises:
            ValueError: If dependency not found or invalid values
        """
        # Validate dependency exists
        existing_dep = await self._get_existing_dependency(requirement_id, depends_on_id, dependency_type)
        if not existing_dep:
            raise ValueError(f"Dependency of type '{dependency_type}' does not exist between these requirements")

        # Validate inputs
        if priority is not None and (priority < 1 or priority > 5):
            raise ValueError("Priority must be between 1 and 5")

        if status is not None and status not in ["active", "inactive", "deprecated"]:
            raise ValueError("Status must be one of: active, inactive, deprecated")

        # Build update properties
        update_props = {
            "updated_by": str(current_user.id),
            "updated_by_name": current_user.full_name,
            "updated_at": datetime.now(UTC).isoformat()
        }

        if description is not None:
            update_props["description"] = description
        if priority is not None:
            update_props["priority"] = priority
        if status is not None:
            update_props["status"] = status

        # Update the relationship properties
        relationship_type = dependency_type.upper()
        set_clause = ", ".join([f"rel.{key} = ${key}" for key in update_props.keys()])

        await self.graph_service.execute_query(
            f"""
            MATCH (r1:WorkItem {{id: $requirement_id}})-[rel:{relationship_type}]->(r2:WorkItem {{id: $depends_on_id}})
            SET {set_clause}
            """,
            {
                "requirement_id": str(requirement_id),
                "depends_on_id": str(depends_on_id),
                **update_props
            }
        )

        # Log dependency update
        if self.audit_service:
            await self.audit_service.log(
                user_id=current_user.id,
                action="UPDATE",
                entity_type="RequirementDependency",
                entity_id=requirement_id,
                details={
                    "from_requirement": str(requirement_id),
                    "to_requirement": str(depends_on_id),
                    "dependency_type": dependency_type,
                    "updated_fields": list(update_props.keys()),
                    "user_name": current_user.full_name
                }
            )

        return True

    async def get_dependency_chain(
        self,
        requirement_id: UUID,
        direction: str = "downstream",
        max_depth: int = 10,
        dependency_types: list[str] | None = None
    ) -> list[dict[str, Any]]:
        """
        Get the complete dependency chain for a requirement
        
        Args:
            requirement_id: Starting requirement UUID
            direction: "downstream" (dependencies) or "upstream" (dependents)
            max_depth: Maximum depth to traverse
            dependency_types: Filter by specific dependency types
            
        Returns:
            List of requirements in dependency order with path information
        """
        if direction not in ["downstream", "upstream"]:
            raise ValueError("Direction must be 'downstream' or 'upstream'")

        if max_depth < 1 or max_depth > 20:
            raise ValueError("Max depth must be between 1 and 20")

        # Build relationship type filter
        if dependency_types:
            valid_types = {"depends_on", "blocks", "relates_to", "implements", "validates", "conflicts_with"}
            invalid_types = set(dependency_types) - valid_types
            if invalid_types:
                raise ValueError(f"Invalid dependency types: {', '.join(invalid_types)}")
            rel_filter = "|".join([t.upper() for t in dependency_types])
        else:
            rel_filter = "DEPENDS_ON|BLOCKS|RELATES_TO|IMPLEMENTS|VALIDATES|CONFLICTS_WITH"

        # Build query based on direction
        if direction == "downstream":
            query = f"""
            MATCH path = (start:WorkItem {{id: $requirement_id}})-[rel:{rel_filter}*1..{max_depth}]->(end:WorkItem)
            WHERE end.type = 'requirement'
            RETURN path, length(path) as depth
            ORDER BY depth, end.title
            """
        else:  # upstream
            query = f"""
            MATCH path = (end:WorkItem)-[rel:{rel_filter}*1..{max_depth}]->(start:WorkItem {{id: $requirement_id}})
            WHERE end.type = 'requirement'
            RETURN path, length(path) as depth
            ORDER BY depth, end.title
            """

        results = await self.graph_service.execute_query(
            query,
            {"requirement_id": str(requirement_id)}
        )

        chain = []
        seen_requirements = set()

        for result in results:
            path_data = result.get("path", {})
            depth = result.get("depth", 0)

            # Extract requirements and relationships from path
            if path_data and "nodes" in path_data and "relationships" in path_data:
                nodes = path_data["nodes"]
                relationships = path_data["relationships"]

                # Process each node in the path (skip the starting requirement)
                for i, node in enumerate(nodes[1:], 1):  # Skip first node (starting requirement)
                    req_id = node.get("id")
                    if req_id and req_id not in seen_requirements:
                        seen_requirements.add(req_id)

                        # Get the relationship that led to this requirement
                        rel_index = i - 1
                        relationship = relationships[rel_index] if rel_index < len(relationships) else {}

                        # Convert to WorkItem and then RequirementResponse
                        workitem = self._graph_data_to_response(node)
                        if workitem:
                            requirement_resp = await self._workitem_to_requirement_response(workitem)

                            chain_entry = {
                                "requirement": requirement_resp,
                                "depth": i,
                                "path_length": depth,
                                "relationship_type": relationship.get("type", "").lower(),
                                "relationship_description": relationship.get("description"),
                                "relationship_priority": relationship.get("priority"),
                                "relationship_status": relationship.get("status", "active")
                            }

                            chain.append(chain_entry)

        return chain

    async def analyze_dependency_impact(
        self,
        requirement_id: UUID,
        proposed_changes: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Analyze the impact of proposed changes to a requirement on its dependencies
        
        Args:
            requirement_id: Requirement UUID to analyze
            proposed_changes: Dictionary of proposed changes (status, priority, etc.)
            
        Returns:
            Dictionary with impact analysis results
        """
        # Get all dependencies (both directions)
        dependencies = await self.get_requirement_dependencies(requirement_id, include_metadata=True)

        # Get the current requirement
        current_req = await self.get_requirement(requirement_id)
        if not current_req:
            raise ValueError(f"Requirement {requirement_id} not found")

        impact_analysis = {
            "requirement_id": str(requirement_id),
            "requirement_title": current_req.title,
            "proposed_changes": proposed_changes,
            "impact_summary": {
                "high_impact": 0,
                "medium_impact": 0,
                "low_impact": 0,
                "total_affected": 0
            },
            "affected_requirements": [],
            "recommendations": []
        }

        # Analyze impact on downstream dependencies (what this requirement depends on)
        for dep_type in ["depends_on", "blocks", "relates_to", "implements", "validates"]:
            for dep_entry in dependencies.get(dep_type, []):
                affected_req = dep_entry["requirement"]
                impact_level = self._calculate_impact_level(
                    current_req,
                    affected_req,
                    dep_type,
                    proposed_changes,
                    dep_entry.get("priority", 3)
                )

                if impact_level > 0:
                    impact_analysis["affected_requirements"].append({
                        "requirement": affected_req,
                        "relationship_type": dep_type,
                        "impact_level": impact_level,
                        "impact_description": self._get_impact_description(dep_type, proposed_changes, "downstream"),
                        "relationship_priority": dep_entry.get("priority"),
                        "relationship_description": dep_entry.get("description")
                    })

                    if impact_level >= 4:
                        impact_analysis["impact_summary"]["high_impact"] += 1
                    elif impact_level >= 2:
                        impact_analysis["impact_summary"]["medium_impact"] += 1
                    else:
                        impact_analysis["impact_summary"]["low_impact"] += 1

        # Analyze impact on upstream dependencies (what depends on this requirement)
        for dep_type in ["depended_by", "blocked_by", "related_by", "implemented_by", "validated_by"]:
            for dep_entry in dependencies.get(dep_type, []):
                affected_req = dep_entry["requirement"]
                base_type = dep_type.replace("_by", "").replace("depended", "depends_on").replace("implemented", "implements").replace("validated", "validates")

                impact_level = self._calculate_impact_level(
                    current_req,
                    affected_req,
                    base_type,
                    proposed_changes,
                    dep_entry.get("priority", 3)
                )

                if impact_level > 0:
                    impact_analysis["affected_requirements"].append({
                        "requirement": affected_req,
                        "relationship_type": base_type,
                        "impact_level": impact_level,
                        "impact_description": self._get_impact_description(base_type, proposed_changes, "upstream"),
                        "relationship_priority": dep_entry.get("priority"),
                        "relationship_description": dep_entry.get("description")
                    })

                    if impact_level >= 4:
                        impact_analysis["impact_summary"]["high_impact"] += 1
                    elif impact_level >= 2:
                        impact_analysis["impact_summary"]["medium_impact"] += 1
                    else:
                        impact_analysis["impact_summary"]["low_impact"] += 1

        impact_analysis["impact_summary"]["total_affected"] = len(impact_analysis["affected_requirements"])

        # Generate recommendations
        impact_analysis["recommendations"] = self._generate_impact_recommendations(
            current_req,
            proposed_changes,
            impact_analysis
        )

        return impact_analysis

    async def get_dependency_visualization_data(
        self,
        requirement_id: UUID,
        max_depth: int = 3,
        include_metadata: bool = True
    ) -> dict[str, Any]:
        """
        Get data formatted for dependency visualization (graphs, charts)
        
        Args:
            requirement_id: Central requirement UUID
            max_depth: Maximum depth to include in visualization
            include_metadata: Whether to include relationship metadata
            
        Returns:
            Dictionary with nodes and edges for visualization
        """
        if max_depth < 1 or max_depth > 5:
            raise ValueError("Max depth must be between 1 and 5")

        # Get the central requirement
        central_req = await self.get_requirement(requirement_id)
        if not central_req:
            raise ValueError(f"Requirement {requirement_id} not found")

        # Initialize visualization data
        viz_data = {
            "nodes": [],
            "edges": [],
            "metadata": {
                "central_requirement_id": str(requirement_id),
                "max_depth": max_depth,
                "generated_at": datetime.now(UTC).isoformat()
            }
        }

        # Add central node
        central_node = {
            "id": str(requirement_id),
            "label": central_req.title,
            "type": "requirement",
            "status": central_req.status,
            "priority": central_req.priority,
            "is_central": True,
            "depth": 0
        }

        if include_metadata:
            central_node.update({
                "description": central_req.description,
                "acceptance_criteria": central_req.acceptance_criteria,
                "business_value": central_req.business_value,
                "source": central_req.source,
                "version": central_req.version,
                "created_at": central_req.created_at.isoformat(),
                "is_signed": central_req.is_signed
            })

        viz_data["nodes"].append(central_node)

        # Track processed nodes to avoid duplicates
        processed_nodes = {str(requirement_id)}

        # Get dependencies at each depth level
        for depth in range(1, max_depth + 1):
            # Get requirements at current depth
            current_level_reqs = []

            if depth == 1:
                # Direct dependencies
                dependencies = await self.get_requirement_dependencies(requirement_id, include_metadata=True)

                # Process all dependency types
                for dep_type, dep_list in dependencies.items():
                    for dep_entry in dep_list:
                        req = dep_entry["requirement"]
                        req_id = str(req.id)

                        if req_id not in processed_nodes:
                            processed_nodes.add(req_id)
                            current_level_reqs.append(req_id)

                            # Add node
                            node = {
                                "id": req_id,
                                "label": req.title,
                                "type": "requirement",
                                "status": req.status,
                                "priority": req.priority,
                                "is_central": False,
                                "depth": depth
                            }

                            if include_metadata:
                                node.update({
                                    "description": req.description,
                                    "acceptance_criteria": req.acceptance_criteria,
                                    "business_value": req.business_value,
                                    "source": req.source,
                                    "version": req.version,
                                    "created_at": req.created_at.isoformat(),
                                    "is_signed": req.is_signed
                                })

                            viz_data["nodes"].append(node)

                            # Add edge
                            edge = {
                                "id": f"{requirement_id}-{req_id}-{dep_type}",
                                "source": str(requirement_id) if not dep_type.endswith("_by") else req_id,
                                "target": req_id if not dep_type.endswith("_by") else str(requirement_id),
                                "type": dep_type.replace("_by", ""),
                                "label": dep_type.replace("_", " ").title()
                            }

                            if include_metadata and "relationship_id" in dep_entry:
                                edge.update({
                                    "description": dep_entry.get("description"),
                                    "priority": dep_entry.get("priority"),
                                    "status": dep_entry.get("status", "active"),
                                    "created_at": dep_entry.get("created_at"),
                                    "created_by_name": dep_entry.get("created_by_name")
                                })

                            viz_data["edges"].append(edge)

            else:
                # Get dependencies for requirements at previous depth
                prev_level_nodes = [node for node in viz_data["nodes"] if node["depth"] == depth - 1]

                for node in prev_level_nodes:
                    node_id = UUID(node["id"])
                    dependencies = await self.get_requirement_dependencies(node_id, include_metadata=True)

                    # Process dependencies (limit to avoid explosion)
                    dep_count = 0
                    max_deps_per_node = 5  # Limit to prevent visualization overload

                    for dep_type, dep_list in dependencies.items():
                        if dep_count >= max_deps_per_node:
                            break

                        for dep_entry in dep_list[:max_deps_per_node - dep_count]:
                            req = dep_entry["requirement"]
                            req_id = str(req.id)

                            if req_id not in processed_nodes:
                                processed_nodes.add(req_id)
                                dep_count += 1

                                # Add node (simplified for deeper levels)
                                deep_node = {
                                    "id": req_id,
                                    "label": req.title,
                                    "type": "requirement",
                                    "status": req.status,
                                    "priority": req.priority,
                                    "is_central": False,
                                    "depth": depth
                                }

                                viz_data["nodes"].append(deep_node)

                                # Add edge
                                edge = {
                                    "id": f"{node['id']}-{req_id}-{dep_type}",
                                    "source": node["id"] if not dep_type.endswith("_by") else req_id,
                                    "target": req_id if not dep_type.endswith("_by") else node["id"],
                                    "type": dep_type.replace("_by", ""),
                                    "label": dep_type.replace("_", " ").title()
                                }

                                viz_data["edges"].append(edge)

        # Add summary statistics
        viz_data["metadata"]["statistics"] = {
            "total_nodes": len(viz_data["nodes"]),
            "total_edges": len(viz_data["edges"]),
            "nodes_by_depth": {},
            "edges_by_type": {}
        }

        # Calculate statistics
        for node in viz_data["nodes"]:
            depth = node["depth"]
            viz_data["metadata"]["statistics"]["nodes_by_depth"][depth] = \
                viz_data["metadata"]["statistics"]["nodes_by_depth"].get(depth, 0) + 1

        for edge in viz_data["edges"]:
            edge_type = edge["type"]
            viz_data["metadata"]["statistics"]["edges_by_type"][edge_type] = \
                viz_data["metadata"]["statistics"]["edges_by_type"].get(edge_type, 0) + 1

        return viz_data

    async def search_requirements(
        self,
        search_text: str | None = None,
        status: str | None = None,
        assigned_to: UUID | None = None,
        created_by: UUID | None = None,
        priority: int | None = None,
        source: str | None = None,
        has_acceptance_criteria: bool | None = None,
        limit: int = 100,
        offset: int = 0
    ) -> list[RequirementResponse]:
        """
        Search Requirements with requirement-specific filters
        
        Args:
            search_text: Text to search in title, description, and acceptance criteria
            status: Filter by status
            assigned_to: Filter by assigned user
            created_by: Filter by creator
            priority: Filter by priority level
            source: Filter by requirement source
            has_acceptance_criteria: Filter by presence of acceptance criteria
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            List of matching Requirements
        """
        # Use parent class search with requirement type filter
        workitems = await self.search_workitems(
            search_text=search_text,
            workitem_type="requirement",
            status=status,
            assigned_to=assigned_to,
            created_by=created_by,
            priority=priority,
            limit=limit * 2,  # Get more to account for additional filtering
            offset=0  # We'll handle offset after additional filtering
        )

        # Apply requirement-specific filters
        filtered_requirements = []
        for workitem in workitems:
            # Get full requirement data from graph
            req_data = await self.graph_service.get_workitem(str(workitem.id))
            if not req_data:
                continue

            # Apply source filter
            if source and req_data.get("source", "").lower() != source.lower():
                continue

            # Apply acceptance criteria filter
            if has_acceptance_criteria is not None:
                has_criteria = bool(req_data.get("acceptance_criteria", "").strip())
                if has_acceptance_criteria != has_criteria:
                    continue

            # Include additional search in acceptance criteria
            if search_text:
                acceptance_criteria = req_data.get("acceptance_criteria", "")
                if (search_text.lower() not in workitem.title.lower() and
                    search_text.lower() not in (workitem.description or "").lower() and
                    search_text.lower() not in acceptance_criteria.lower()):
                    continue

            requirement_resp = await self._workitem_to_requirement_response(workitem)
            filtered_requirements.append(requirement_resp)

        # Apply offset and limit
        return filtered_requirements[offset:offset + limit]

    async def _validate_requirement_data(self, requirement_data: RequirementCreate) -> None:
        """
        Validate requirement-specific data with comprehensive business rules
        
        Args:
            requirement_data: Requirement creation data
            
        Raises:
            ValueError: If validation fails
        """
        # Validate title requirements
        await self._validate_requirement_title(requirement_data.title)

        # Validate description requirements
        await self._validate_requirement_description(requirement_data.description)

        # Validate acceptance criteria if provided
        if requirement_data.acceptance_criteria:
            await self._validate_acceptance_criteria(requirement_data.acceptance_criteria)

        # Validate business value if provided
        if requirement_data.business_value:
            await self._validate_business_value(requirement_data.business_value)

        # Validate source if provided
        if requirement_data.source:
            await self._validate_requirement_source(requirement_data.source)

        # Validate priority for requirements
        if requirement_data.priority:
            await self._validate_requirement_priority(requirement_data.priority)

        # Validate status for requirements
        await self._validate_requirement_status(requirement_data.status)

        # Cross-field validation
        await self._validate_requirement_completeness(requirement_data)

    async def _validate_requirement_update(self, updates: RequirementUpdate) -> None:
        """
        Validate requirement update data with comprehensive business rules
        
        Args:
            updates: Requirement update data
            
        Raises:
            ValueError: If validation fails
        """
        # Validate title if being updated
        if updates.title is not None:
            await self._validate_requirement_title(updates.title)

        # Validate description if being updated
        if updates.description is not None:
            await self._validate_requirement_description(updates.description)

        # Validate acceptance criteria if being updated
        if updates.acceptance_criteria is not None:
            if updates.acceptance_criteria:  # Only validate if not empty
                await self._validate_acceptance_criteria(updates.acceptance_criteria)

        # Validate business value if being updated
        if updates.business_value is not None:
            if updates.business_value:  # Only validate if not empty
                await self._validate_business_value(updates.business_value)

        # Validate source if being updated
        if updates.source is not None:
            if updates.source:  # Only validate if not empty
                await self._validate_requirement_source(updates.source)

        # Validate priority if being updated
        if updates.priority is not None:
            await self._validate_requirement_priority(updates.priority)

        # Validate status if being updated
        if updates.status is not None:
            await self._validate_requirement_status(updates.status)

    async def _workitem_to_requirement_response(
        self,
        workitem: WorkItemResponse
    ) -> RequirementResponse:
        """
        Convert WorkItemResponse to RequirementResponse with additional requirement data
        
        Args:
            workitem: WorkItem response object
            
        Returns:
            RequirementResponse with requirement-specific fields
        """
        # Get additional requirement data from graph
        req_data = await self.graph_service.get_workitem(str(workitem.id))

        return RequirementResponse(
            id=workitem.id,
            type=workitem.type,
            title=workitem.title,
            description=workitem.description,
            status=workitem.status,
            priority=workitem.priority,
            assigned_to=workitem.assigned_to,
            version=workitem.version,
            created_by=workitem.created_by,
            created_at=workitem.created_at,
            updated_at=workitem.updated_at,
            is_signed=workitem.is_signed,
            acceptance_criteria=req_data.get("acceptance_criteria") if req_data else None,
            business_value=req_data.get("business_value") if req_data else None,
            source=req_data.get("source") if req_data else None
        )

    # Enhanced validation methods for requirement-specific business rules

    async def _validate_requirement_title(self, title: str) -> None:
        """
        Validate requirement title with specific business rules
        
        Args:
            title: Requirement title to validate
            
        Raises:
            ValueError: If title validation fails
        """
        if not title or not title.strip():
            raise ValueError("Requirement title cannot be empty")

        title = title.strip()

        # Check minimum length
        if len(title) < 5:
            raise ValueError("Requirement title must be at least 5 characters long")

        # Check maximum length
        if len(title) > 500:
            raise ValueError("Requirement title cannot exceed 500 characters")

        # Check for meaningful content (not just numbers or special characters)
        if not any(c.isalpha() for c in title):
            raise ValueError("Requirement title must contain at least one letter")

        # Check for prohibited patterns
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        title_upper = title.upper()
        for pattern in prohibited_patterns:
            if pattern in title_upper:
                raise ValueError(f"Requirement title cannot contain placeholder text: {pattern}")

    async def _validate_requirement_description(self, description: str | None) -> None:
        """
        Validate requirement description
        
        Args:
            description: Requirement description to validate
            
        Raises:
            ValueError: If description validation fails
        """
        if description is not None:
            description = description.strip()

            # Check minimum length for meaningful descriptions
            if description and len(description) < 20:
                raise ValueError("Requirement description must be at least 20 characters long if provided")

            # Check maximum length
            if len(description) > 5000:
                raise ValueError("Requirement description cannot exceed 5000 characters")

            # Check for prohibited placeholder text
            prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX", "Lorem ipsum"]
            description_upper = description.upper()
            for pattern in prohibited_patterns:
                if pattern in description_upper:
                    raise ValueError(f"Requirement description cannot contain placeholder text: {pattern}")

    async def _validate_acceptance_criteria(self, acceptance_criteria: str) -> None:
        """
        Validate acceptance criteria with specific business rules
        
        Args:
            acceptance_criteria: Acceptance criteria to validate
            
        Raises:
            ValueError: If acceptance criteria validation fails
        """
        if not acceptance_criteria or not acceptance_criteria.strip():
            raise ValueError("Acceptance criteria cannot be empty if provided")

        criteria = acceptance_criteria.strip()

        # Check minimum length
        if len(criteria) < 20:
            raise ValueError("Acceptance criteria must be at least 20 characters long")

        # Check maximum length
        if len(criteria) > 2000:
            raise ValueError("Acceptance criteria cannot exceed 2000 characters")

        # Check for structured format (Given-When-Then or similar)
        structured_keywords = ["given", "when", "then", "and", "but", "should", "must", "shall"]
        criteria_lower = criteria.lower()
        has_structure = any(keyword in criteria_lower for keyword in structured_keywords)

        if not has_structure:
            raise ValueError(
                "Acceptance criteria should follow a structured format (e.g., Given-When-Then) "
                "and include keywords like 'given', 'when', 'then', 'should', 'must', or 'shall'"
            )

        # Check for prohibited placeholder text
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        criteria_upper = criteria.upper()
        for pattern in prohibited_patterns:
            if pattern in criteria_upper:
                raise ValueError(f"Acceptance criteria cannot contain placeholder text: {pattern}")

    async def _validate_business_value(self, business_value: str) -> None:
        """
        Validate business value description
        
        Args:
            business_value: Business value to validate
            
        Raises:
            ValueError: If business value validation fails
        """
        if not business_value or not business_value.strip():
            raise ValueError("Business value cannot be empty if provided")

        value = business_value.strip()

        # Check minimum length
        if len(value) < 10:
            raise ValueError("Business value must be at least 10 characters long")

        # Check maximum length
        if len(value) > 1000:
            raise ValueError("Business value cannot exceed 1000 characters")

        # Check for meaningful content
        if not any(c.isalpha() for c in value):
            raise ValueError("Business value must contain descriptive text")

        # Check for prohibited placeholder text
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        value_upper = value.upper()
        for pattern in prohibited_patterns:
            if pattern in value_upper:
                raise ValueError(f"Business value cannot contain placeholder text: {pattern}")

    async def _validate_requirement_source(self, source: str) -> None:
        """
        Validate requirement source
        
        Args:
            source: Requirement source to validate
            
        Raises:
            ValueError: If source validation fails
        """
        if not source or not source.strip():
            raise ValueError("Requirement source cannot be empty if provided")

        valid_sources = {
            "stakeholder", "regulation", "standard", "user_story",
            "business_rule", "technical_constraint", "compliance",
            "security", "performance", "usability", "other"
        }

        source_lower = source.strip().lower()
        if source_lower not in valid_sources:
            raise ValueError(
                f"Invalid requirement source '{source}'. "
                f"Must be one of: {', '.join(sorted(valid_sources))}"
            )

    async def _validate_requirement_priority(self, priority: int) -> None:
        """
        Validate requirement priority with business rules
        
        Args:
            priority: Priority level to validate
            
        Raises:
            ValueError: If priority validation fails
        """
        if priority is None:
            return  # Priority is optional

        if not isinstance(priority, int):
            raise ValueError("Priority must be an integer")

        if priority < 1 or priority > 5:
            raise ValueError("Priority must be between 1 (lowest) and 5 (highest)")

    async def _validate_requirement_status(self, status: str) -> None:
        """
        Validate requirement status with business rules
        
        Args:
            status: Status to validate
            
        Raises:
            ValueError: If status validation fails
        """
        if not status or not status.strip():
            raise ValueError("Requirement status cannot be empty")

        valid_statuses = {"draft", "active", "completed", "archived", "rejected"}
        status_lower = status.strip().lower()

        if status_lower not in valid_statuses:
            raise ValueError(
                f"Invalid requirement status '{status}'. "
                f"Must be one of: {', '.join(sorted(valid_statuses))}"
            )

    async def _validate_requirement_completeness(self, requirement_data: RequirementCreate) -> None:
        """
        Validate requirement completeness based on status and business rules
        
        Args:
            requirement_data: Complete requirement data to validate
            
        Raises:
            ValueError: If completeness validation fails
        """
        status = requirement_data.status.lower() if requirement_data.status else "draft"

        # Requirements moving to 'active' status must have acceptance criteria
        if status == "active":
            if not requirement_data.acceptance_criteria or not requirement_data.acceptance_criteria.strip():
                raise ValueError("Requirements with 'active' status must have acceptance criteria")

            if not requirement_data.business_value or not requirement_data.business_value.strip():
                raise ValueError("Requirements with 'active' status must have business value defined")

            if not requirement_data.source or not requirement_data.source.strip():
                raise ValueError("Requirements with 'active' status must have a source defined")

        # Requirements moving to 'completed' status must have all fields
        if status == "completed":
            required_fields = {
                "acceptance_criteria": requirement_data.acceptance_criteria,
                "business_value": requirement_data.business_value,
                "source": requirement_data.source,
                "description": requirement_data.description
            }

            missing_fields = []
            for field_name, field_value in required_fields.items():
                if not field_value or not field_value.strip():
                    missing_fields.append(field_name)

            if missing_fields:
                raise ValueError(
                    f"Requirements with 'completed' status must have all fields defined. "
                    f"Missing: {', '.join(missing_fields)}"
                )

        # High priority requirements should have business value
        if requirement_data.priority and requirement_data.priority >= 4:
            if not requirement_data.business_value or not requirement_data.business_value.strip():
                raise ValueError("High priority requirements (4-5) should have business value defined")

    async def validate_requirement_dependencies_simple(
        self,
        requirement_id: UUID,
        dependency_ids: list[UUID]
    ) -> None:
        """
        Simple validation of requirement dependencies that raises exceptions
        
        Args:
            requirement_id: The requirement that will have dependencies
            dependency_ids: List of requirement IDs this requirement depends on
            
        Raises:
            ValueError: If dependency validation fails
        """
        if not dependency_ids:
            return

        # Check for self-dependency
        if requirement_id in dependency_ids:
            raise ValueError("Requirement cannot depend on itself")

        # Check for duplicate dependencies
        if len(dependency_ids) != len(set(dependency_ids)):
            raise ValueError("Duplicate dependencies are not allowed")

        # Check maximum number of dependencies
        if len(dependency_ids) > 10:
            raise ValueError("Requirement cannot have more than 10 direct dependencies")

        # Verify all dependencies exist and are requirements
        for dep_id in dependency_ids:
            dep_requirement = await self.get_requirement(dep_id)
            if not dep_requirement:
                raise ValueError(f"Dependency requirement {dep_id} not found")

        # Check for circular dependencies (simplified check)
        await self._check_circular_dependencies_enhanced(requirement_id, dependency_ids, "depends_on")

    async def validate_requirement_dependencies(
        self,
        requirement_id: UUID,
        dependency_ids: list[UUID],
        dependency_types: list[str] | None = None
    ) -> dict[str, Any]:
        """
        Enhanced validation of requirement dependencies with detailed reporting
        
        Args:
            requirement_id: The requirement that will have dependencies
            dependency_ids: List of requirement IDs this requirement depends on
            dependency_types: Optional list of dependency types (must match dependency_ids length)
            
        Returns:
            Dictionary with validation results and details
            
        Raises:
            ValueError: If dependency validation fails
        """
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "dependency_analysis": [],
            "circular_dependencies": [],
            "recommendations": []
        }

        if not dependency_ids:
            return validation_result

        # Validate dependency types if provided
        if dependency_types:
            if len(dependency_types) != len(dependency_ids):
                validation_result["errors"].append(
                    "Number of dependency types must match number of dependency IDs"
                )
                validation_result["is_valid"] = False
                return validation_result

            valid_types = {"depends_on", "blocks", "relates_to", "implements", "validates", "conflicts_with"}
            invalid_types = [dt for dt in dependency_types if dt not in valid_types]
            if invalid_types:
                validation_result["errors"].append(
                    f"Invalid dependency types: {', '.join(invalid_types)}"
                )
                validation_result["is_valid"] = False
                return validation_result

        # Check for self-dependency
        if requirement_id in dependency_ids:
            validation_result["errors"].append("Requirement cannot depend on itself")
            validation_result["is_valid"] = False

        # Check for duplicate dependencies
        if len(dependency_ids) != len(set(dependency_ids)):
            duplicates = [str(dep_id) for dep_id in dependency_ids if dependency_ids.count(dep_id) > 1]
            validation_result["errors"].append(f"Duplicate dependencies found: {', '.join(set(duplicates))}")
            validation_result["is_valid"] = False

        # Check maximum number of dependencies
        if len(dependency_ids) > 20:  # Increased limit for enhanced system
            validation_result["errors"].append("Requirement cannot have more than 20 direct dependencies")
            validation_result["is_valid"] = False
        elif len(dependency_ids) > 10:
            validation_result["warnings"].append(
                f"High number of dependencies ({len(dependency_ids)}). Consider grouping related requirements."
            )

        # Verify all dependencies exist and are requirements
        for i, dep_id in enumerate(dependency_ids):
            dep_requirement = await self.get_requirement(dep_id)
            if not dep_requirement:
                validation_result["errors"].append(f"Dependency requirement {dep_id} not found")
                validation_result["is_valid"] = False
            else:
                # Analyze dependency
                dep_type = dependency_types[i] if dependency_types else "depends_on"
                analysis = {
                    "dependency_id": str(dep_id),
                    "dependency_title": dep_requirement.title,
                    "dependency_status": dep_requirement.status,
                    "dependency_priority": dep_requirement.priority,
                    "dependency_type": dep_type,
                    "potential_issues": []
                }

                # Check for potential issues
                if dep_requirement.status == "rejected":
                    analysis["potential_issues"].append("Dependency is rejected")
                    validation_result["warnings"].append(
                        f"Dependency '{dep_requirement.title}' is rejected"
                    )
                elif dep_requirement.status == "archived":
                    analysis["potential_issues"].append("Dependency is archived")
                    validation_result["warnings"].append(
                        f"Dependency '{dep_requirement.title}' is archived"
                    )

                # Check for conflicting dependency types
                if dep_type == "conflicts_with":
                    analysis["potential_issues"].append("Explicit conflict relationship")
                    validation_result["warnings"].append(
                        f"Creating conflict relationship with '{dep_requirement.title}'"
                    )

                validation_result["dependency_analysis"].append(analysis)

        # Check for circular dependencies (enhanced)
        if validation_result["is_valid"]:
            try:
                await self._check_circular_dependencies_enhanced(
                    requirement_id,
                    dependency_ids,
                    dependency_types[0] if dependency_types else "depends_on"
                )
            except ValueError as e:
                if "Circular dependency detected" in str(e):
                    validation_result["errors"].append(str(e))
                    validation_result["is_valid"] = False
                    validation_result["circular_dependencies"].append({
                        "error": str(e),
                        "affected_requirements": dependency_ids
                    })

        # Generate recommendations
        if len(dependency_ids) > 5:
            validation_result["recommendations"].append(
                "Consider creating intermediate requirements to reduce complexity"
            )

        if validation_result["warnings"]:
            validation_result["recommendations"].append(
                "Review warnings before creating dependencies"
            )

        # Check for existing dependencies that might conflict
        existing_deps = await self.get_requirement_dependencies(requirement_id, include_metadata=True)
        existing_count = sum(len(deps) for deps in existing_deps.values())

        if existing_count + len(dependency_ids) > 15:
            validation_result["recommendations"].append(
                f"Total dependencies will be {existing_count + len(dependency_ids)}. Consider requirement decomposition."
            )

        return validation_result

    async def _check_circular_dependencies_enhanced(
        self,
        requirement_id: UUID,
        new_dependency_ids: list[UUID],
        dependency_type: str,
        visited: set | None = None,
        path: list[str] | None = None
    ) -> None:
        """
        Enhanced circular dependency detection with path tracking
        
        Args:
            requirement_id: Current requirement being checked
            new_dependency_ids: New dependencies being added
            dependency_type: Type of dependency being created
            visited: Set of already visited requirements (for recursion)
            path: Current path for detailed error reporting
            
        Raises:
            ValueError: If circular dependency is detected with detailed path
        """
        if visited is None:
            visited = set()
        if path is None:
            path = []

        req_id_str = str(requirement_id)

        if req_id_str in visited:
            cycle_path = " -> ".join(path + [req_id_str])
            raise ValueError(f"Circular dependency detected: {cycle_path}")

        visited.add(req_id_str)
        path.append(req_id_str)

        # Check each new dependency
        for dep_id in new_dependency_ids:
            dep_id_str = str(dep_id)

            # Get existing dependencies of this dependency
            try:
                dep_dependencies = await self.get_requirement_dependencies(dep_id, include_metadata=False)

                # Check all outgoing dependencies
                all_dep_ids = []
                for dep_list in dep_dependencies.values():
                    if isinstance(dep_list, list) and dep_list:
                        for dep_entry in dep_list:
                            if isinstance(dep_entry, dict) and "requirement" in dep_entry:
                                all_dep_ids.append(dep_entry["requirement"].id)

                if all_dep_ids:
                    await self._check_circular_dependencies_enhanced(
                        dep_id,
                        all_dep_ids,
                        dependency_type,
                        visited.copy(),
                        path.copy()
                    )

            except Exception as e:
                # If we can't check dependencies, log but don't fail
                if "Circular dependency detected" in str(e):
                    raise e
                # Continue with other checks
                pass

        path.pop()
        visited.discard(req_id_str)

    async def _get_existing_dependency(
        self,
        requirement_id: UUID,
        depends_on_id: UUID,
        dependency_type: str
    ) -> dict[str, Any] | None:
        """
        Check if a dependency relationship already exists
        
        Args:
            requirement_id: Source requirement
            depends_on_id: Target requirement
            dependency_type: Type of dependency
            
        Returns:
            Existing dependency data or None
        """
        relationship_type = dependency_type.upper()

        results = await self.graph_service.execute_query(
            f"""
            MATCH (r1:WorkItem {{id: $req1_id}})-[rel:{relationship_type}]->(r2:WorkItem {{id: $req2_id}})
            RETURN rel
            """,
            {
                "req1_id": str(requirement_id),
                "req2_id": str(depends_on_id)
            }
        )

        return results[0].get("rel") if results else None

    def _calculate_impact_level(
        self,
        current_req: RequirementResponse,
        affected_req: RequirementResponse,
        relationship_type: str,
        proposed_changes: dict[str, Any],
        relationship_priority: int = 3
    ) -> int:
        """
        Calculate impact level (0-5) of proposed changes on a related requirement
        
        Args:
            current_req: The requirement being changed
            affected_req: The requirement that might be affected
            relationship_type: Type of relationship between requirements
            proposed_changes: Proposed changes to current_req
            relationship_priority: Priority of the relationship (1-5)
            
        Returns:
            Impact level from 0 (no impact) to 5 (critical impact)
        """
        impact_level = 0

        # Base impact based on relationship type
        relationship_impact = {
            "depends_on": 4,      # High impact - affects dependent requirement
            "blocks": 5,          # Critical impact - blocking relationship
            "implements": 3,      # Medium impact - implementation relationship
            "validates": 2,       # Low-medium impact - validation relationship
            "relates_to": 1,      # Low impact - loose relationship
            "conflicts_with": 4   # High impact - conflict relationship
        }

        base_impact = relationship_impact.get(relationship_type, 1)

        # Adjust based on proposed changes
        if "status" in proposed_changes:
            new_status = proposed_changes["status"]
            if new_status in ["completed", "archived"]:
                impact_level += base_impact
            elif new_status == "rejected":
                impact_level += base_impact + 1  # Higher impact for rejection

        if "priority" in proposed_changes:
            old_priority = current_req.priority or 3
            new_priority = proposed_changes["priority"]
            priority_change = abs(new_priority - old_priority)
            impact_level += min(priority_change, 2)  # Max 2 additional impact

        if "acceptance_criteria" in proposed_changes:
            # Significant changes to acceptance criteria have medium impact
            impact_level += 2

        # Adjust based on relationship priority
        priority_multiplier = {
            1: 0.5,   # Low priority relationship
            2: 0.7,
            3: 1.0,   # Normal priority
            4: 1.3,
            5: 1.5    # High priority relationship
        }

        impact_level = int(impact_level * priority_multiplier.get(relationship_priority, 1.0))

        # Cap at maximum impact level
        return min(impact_level, 5)

    def _get_impact_description(
        self,
        relationship_type: str,
        proposed_changes: dict[str, Any],
        direction: str
    ) -> str:
        """
        Generate human-readable impact description
        
        Args:
            relationship_type: Type of relationship
            proposed_changes: Proposed changes
            direction: "upstream" or "downstream"
            
        Returns:
            Human-readable impact description
        """
        descriptions = []

        if "status" in proposed_changes:
            new_status = proposed_changes["status"]
            if new_status == "completed":
                if relationship_type == "depends_on":
                    descriptions.append("Dependency completion may enable progression")
                elif relationship_type == "blocks":
                    descriptions.append("Blocking requirement completion removes impediment")
            elif new_status == "rejected":
                descriptions.append("Requirement rejection may require alternative approach")
            elif new_status == "archived":
                descriptions.append("Requirement archival may affect related work")

        if "priority" in proposed_changes:
            descriptions.append("Priority change may affect scheduling and resource allocation")

        if "acceptance_criteria" in proposed_changes:
            descriptions.append("Acceptance criteria changes may require validation review")

        if not descriptions:
            descriptions.append("Changes may have indirect effects on related requirements")

        return "; ".join(descriptions)

    def _generate_impact_recommendations(
        self,
        current_req: RequirementResponse,
        proposed_changes: dict[str, Any],
        impact_analysis: dict[str, Any]
    ) -> list[str]:
        """
        Generate recommendations based on impact analysis
        
        Args:
            current_req: The requirement being changed
            proposed_changes: Proposed changes
            impact_analysis: Results of impact analysis
            
        Returns:
            List of recommendation strings
        """
        recommendations = []

        high_impact_count = impact_analysis["impact_summary"]["high_impact"]
        total_affected = impact_analysis["impact_summary"]["total_affected"]

        if high_impact_count > 0:
            recommendations.append(
                f"Review {high_impact_count} high-impact requirements before proceeding"
            )

        if total_affected > 10:
            recommendations.append(
                "Consider phased implementation due to large number of affected requirements"
            )

        if "status" in proposed_changes and proposed_changes["status"] == "rejected":
            recommendations.append(
                "Identify alternative requirements or approaches for dependent work"
            )

        if "priority" in proposed_changes:
            old_priority = current_req.priority or 3
            new_priority = proposed_changes["priority"]
            if new_priority > old_priority + 1:
                recommendations.append(
                    "Verify resource availability for increased priority requirement"
                )

        # Check for blocking relationships
        blocking_reqs = [
            req for req in impact_analysis["affected_requirements"]
            if req["relationship_type"] == "blocks" and req["impact_level"] >= 3
        ]

        if blocking_reqs:
            recommendations.append(
                f"Address {len(blocking_reqs)} blocking relationships before implementation"
            )

        if not recommendations:
            recommendations.append("Changes appear to have minimal impact on related requirements")

        return recommendations

    async def _validate_comment_permissions(
        self,
        requirement: RequirementResponse,
        current_user: User
    ) -> None:
        """
        Validate that user has permission to comment on requirement
        
        Args:
            requirement: Requirement being commented on
            current_user: User attempting to comment
            
        Raises:
            PermissionError: If user lacks permission
        """
        # Check if requirement is in a state that allows comments
        if requirement.status == "archived":
            if current_user.role not in ["admin", "project_manager"]:
                raise PermissionError("Cannot comment on archived requirements")

        # Additional business rules can be added here
        # For example: check if user is assigned to the requirement or project

    async def _get_comment_by_id(self, comment_id: UUID) -> dict[str, Any] | None:
        """
        Get comment data by ID from graph database
        
        Args:
            comment_id: Comment UUID
            
        Returns:
            Comment data dictionary or None if not found
        """
        results = await self.graph_service.execute_query(
            """
            MATCH (c:Comment {id: $comment_id})
            RETURN c
            """,
            {"comment_id": str(comment_id)}
        )

        if results:
            return results[0].get("c")
        return None

    def _comment_data_to_response(self, comment_data: dict[str, Any]) -> CommentResponse:
        """
        Convert comment data from graph to CommentResponse
        
        Args:
            comment_data: Raw comment data from graph database
            
        Returns:
            CommentResponse object
        """
        return CommentResponse(
            id=UUID(comment_data["id"]),
            requirement_id=UUID(comment_data["requirement_id"]),
            user_id=UUID(comment_data["user_id"]),
            user_name=comment_data.get("user_name"),
            user_email=comment_data.get("user_email"),
            comment=comment_data["comment"],
            created_at=datetime.fromisoformat(comment_data["created_at"]),
            updated_at=datetime.fromisoformat(comment_data.get("updated_at", comment_data["created_at"])),
            version=comment_data["version"],
            is_edited=comment_data.get("is_edited", False),
            edit_count=comment_data.get("edit_count", 0)
        )


async def get_requirement_service() -> RequirementService:
    """Dependency for getting Requirement service with all dependencies"""
    from app.db.graph import get_graph_service
    from app.services.version_service import get_version_service

    graph_service = await get_graph_service()

    # Try to get VersionService, but don't fail if it's not available
    try:
        version_service = await get_version_service(graph_service=graph_service)
    except Exception as e:
        print(f"Warning: Could not initialize VersionService: {e}")
        version_service = None

    # Try to get AuditService, but don't fail if it's not available
    try:
        audit_service = await get_audit_service()
    except Exception as e:
        print(f"Warning: Could not initialize AuditService: {e}")
        audit_service = None

    return RequirementService(graph_service, version_service, audit_service)

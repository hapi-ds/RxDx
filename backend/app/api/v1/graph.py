"""Graph API endpoints for visualization and knowledge management"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.core.security import Permission, require_permission
from app.db.graph import GraphService, get_graph_service
from app.models.user import User

router = APIRouter()


@router.get("/visualization")
@require_permission(Permission.READ_WORKITEM)
async def get_graph_visualization(
    center_node_id: str | None = Query(None, description="Center node ID for subgraph"),
    depth: int = Query(2, ge=1, le=5, description="Traversal depth (1-5)"),
    node_types: list[str] | None = Query(None, description="Filter by node types"),
    relationship_types: list[str] | None = Query(None, description="Filter by relationship types"),
    limit: int = Query(1000, ge=10, le=5000, description="Maximum nodes to return"),
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service)
) -> dict[str, Any]:
    """
    Get graph data formatted for visualization in 2D (react-flow) and 3D (R3F)

    This endpoint returns graph data optimized for visualization libraries:
    - react-flow for 2D interactive graph visualization
    - React Three Fiber (R3F) for 3D/VR immersive visualization

    Args:
        center_node_id: Optional center node to build subgraph around
        depth: Maximum traversal depth from center node (1-5)
        node_types: Optional list of node types to include (WorkItem, Risk, etc.)
        relationship_types: Optional list of relationship types to include
        limit: Maximum number of nodes to return (10-5000)

    Returns:
        Dictionary containing:
        - nodes: List of nodes formatted for visualization
        - edges: List of edges formatted for visualization
        - metadata: Graph statistics and query info
    """
    # Validate node types if provided
    if node_types:
        valid_types = [
            "WorkItem", "Requirement", "Task", "Test", "Risk",
            "Failure", "Document", "Entity", "User"
        ]
        invalid_types = [t for t in node_types if t not in valid_types]
        if invalid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid node types: {invalid_types}. Valid types: {valid_types}"
            )

    # Validate relationship types if provided
    if relationship_types:
        valid_rels = [
            "TESTED_BY", "MITIGATES", "DEPENDS_ON", "IMPLEMENTS",
            "LEADS_TO", "RELATES_TO", "MENTIONED_IN", "REFERENCES",
            "NEXT_VERSION", "CREATED_BY", "ASSIGNED_TO"
        ]
        invalid_rels = [r for r in relationship_types if r not in valid_rels]
        if invalid_rels:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid relationship types: {invalid_rels}. Valid types: {valid_rels}"
            )

    try:
        # Get visualization data from graph service
        graph_data = await graph_service.get_graph_for_visualization(
            center_node_id=center_node_id,
            depth=depth,
            node_types=node_types,
            relationship_types=relationship_types,
            limit=limit
        )

        # Validate graph_data is a dict
        if not isinstance(graph_data, dict):
            raise HTTPException(
                status_code=500,
                detail="Invalid graph data format: expected dictionary"
            )

        # Ensure 'nodes' key exists (default to empty array)
        if 'nodes' not in graph_data:
            graph_data['nodes'] = []

        # Ensure 'edges' key exists (default to empty array)
        if 'edges' not in graph_data:
            graph_data['edges'] = []

        # Ensure 'metadata' key exists with required fields
        if 'metadata' not in graph_data:
            graph_data['metadata'] = {
                'total_nodes': len(graph_data.get('nodes', [])),
                'total_edges': len(graph_data.get('edges', [])),
                'depth': depth,
                'center_node': center_node_id,
                'truncated': False
            }
        else:
            # Ensure metadata has required fields
            metadata = graph_data['metadata']
            if 'total_nodes' not in metadata:
                metadata['total_nodes'] = len(graph_data.get('nodes', []))
            if 'total_edges' not in metadata:
                metadata['total_edges'] = len(graph_data.get('edges', []))

        return graph_data

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve graph visualization data: {str(e)}"
        )


@router.get("/nodes/{node_id}")
@require_permission(Permission.READ_WORKITEM)
async def get_node_details(
    node_id: str,
    include_relationships: bool = Query(True, description="Include node relationships"),
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service)
) -> dict[str, Any]:
    """
    Get detailed information about a specific node

    Args:
        node_id: Unique identifier of the node
        include_relationships: Whether to include related nodes

    Returns:
        Node details with optional relationship information
    """
    try:
        # Get the node
        node = await graph_service.get_node(node_id)
        if not node:
            raise HTTPException(
                status_code=404,
                detail=f"Node with ID {node_id} not found"
            )

        result = {"node": node}

        # Include relationships if requested
        if include_relationships:
            relationships = await graph_service.find_related_nodes(
                node_id=node_id,
                direction="both",
                depth=1
            )
            result["relationships"] = relationships

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve node details: {str(e)}"
        )


@router.get("/search")
@require_permission(Permission.READ_WORKITEM)
async def search_graph(
    query: str = Query(..., min_length=1, description="Search query"),
    node_types: list[str] | None = Query(None, description="Filter by node types"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results to return"),
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service)
) -> dict[str, Any]:
    """
    Search nodes in the graph by text content

    Args:
        query: Text to search for in node titles and descriptions
        node_types: Optional filter by node types
        limit: Maximum number of results (1-200)

    Returns:
        Search results with matching nodes
    """
    try:
        # Search WorkItems (most common search case)
        if not node_types or "WorkItem" in node_types:
            workitems = await graph_service.search_workitems(
                search_text=query,
                limit=limit
            )
        else:
            workitems = []

        # Search other node types if specified
        other_nodes = []
        if node_types:
            for node_type in node_types:
                if node_type != "WorkItem":
                    nodes = await graph_service.search_nodes(
                        label=node_type,
                        limit=limit // len(node_types) if len(node_types) > 1 else limit
                    )
                    # Filter by query text
                    filtered_nodes = [
                        node for node in nodes
                        if query.lower() in str(node.get('title', '')).lower() or
                           query.lower() in str(node.get('name', '')).lower() or
                           query.lower() in str(node.get('description', '')).lower()
                    ]
                    other_nodes.extend(filtered_nodes)

        # Combine results
        all_results = workitems + other_nodes

        # Limit total results
        if len(all_results) > limit:
            all_results = all_results[:limit]

        return {
            "query": query,
            "results": all_results,
            "total_found": len(all_results),
            "truncated": len(workitems + other_nodes) > limit
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/traceability")
@require_permission(Permission.READ_WORKITEM)
async def get_traceability_matrix(
    project_id: str | None = Query(None, description="Filter by project ID"),
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service)
) -> dict[str, Any]:
    """
    Get traceability matrix showing relationships between requirements, tests, and risks

    Args:
        project_id: Optional project filter

    Returns:
        Traceability matrix with requirements, tests, risks and their relationships
    """
    try:
        matrix = await graph_service.get_traceability_matrix(project_id=project_id)
        return matrix

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate traceability matrix: {str(e)}"
        )


@router.get("/risk-chains")
@require_permission(Permission.READ_WORKITEM)
async def get_risk_chains(
    risk_id: str | None = Query(None, description="Starting risk ID"),
    max_depth: int = Query(5, ge=1, le=10, description="Maximum chain depth"),
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service)
) -> dict[str, Any]:
    """
    Get FMEA failure chains showing risk propagation paths

    Args:
        risk_id: Optional starting risk ID (if None, gets all chains)
        max_depth: Maximum chain depth to traverse (1-10)

    Returns:
        Risk chains with failure paths and probabilities
    """
    try:
        chains = await graph_service.get_risk_chains(
            risk_id=risk_id,
            max_depth=max_depth
        )

        return {
            "risk_id": risk_id,
            "max_depth": max_depth,
            "chains": chains,
            "total_chains": len(chains)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve risk chains: {str(e)}"
        )


@router.get("/schema")
@require_permission(Permission.READ_WORKITEM)
async def get_graph_schema(
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service)
) -> dict[str, Any]:
    """
    Get graph schema information including supported node types and relationships

    Returns:
        Graph schema with node types and relationship types
    """
    try:
        schema = await graph_service.initialize_graph_schema()
        return schema

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve graph schema: {str(e)}"
        )

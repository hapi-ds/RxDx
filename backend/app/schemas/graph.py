"""
Graph API response schemas

Defines standardized response formats for graph visualization and search endpoints.
All graph endpoints should return nodes in the same format for consistency.
"""

from typing import Any

from pydantic import BaseModel, Field


class ReactFlowData(BaseModel):
    """React Flow (2D) visualization data"""
    id: str
    type: str
    position: dict[str, float] = Field(..., description="Node position {x, y}")
    data: dict[str, Any] = Field(..., description="Node data including label, type, status, etc.")
    style: dict[str, Any] | None = Field(None, description="Node styling")
    className: str | None = Field(None, description="CSS class names")


class R3FData(BaseModel):
    """React Three Fiber (3D) visualization data"""
    id: str
    position: list[float] = Field(..., description="3D position [x, y, z]")
    type: str
    label: str
    status: str
    priority: int
    description: str
    color: str
    size: float
    geometry: dict[str, Any] = Field(..., description="3D geometry definition")
    material: dict[str, Any] = Field(..., description="3D material properties")
    properties: dict[str, Any] = Field(..., description="Full node properties")
    interactions: dict[str, bool] = Field(..., description="Interaction capabilities")


class NodeVisualization(BaseModel):
    """
    Standardized node format for all graph endpoints.

    This format is used by:
    - /api/v1/graph/visualization
    - /api/v1/graph/search

    All nodes should have a 'label' field (not 'title') for consistency.
    """
    id: str = Field(..., description="Node UUID")
    type: str = Field(..., description="Node type (requirement, task, test, etc.)")
    label: str = Field(..., description="Display label (from title/name)")
    status: str = Field(..., description="Node status (draft, active, completed, archived)")
    priority: int = Field(..., description="Priority level (1-5)")
    description: str = Field(..., description="Node description")
    color: str = Field(..., description="Display color (hex)")
    size: int = Field(..., description="Display size")
    properties: dict[str, Any] = Field(..., description="Full node properties from database")
    reactFlow: dict[str, Any] = Field(..., description="React Flow (2D) visualization data")
    r3f: dict[str, Any] = Field(..., description="React Three Fiber (3D) visualization data")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "a1f91a05-308f-5f93-a5e3-3f303d828cfc",
                "type": "task",
                "label": "Create Alarm UI",
                "status": "active",
                "priority": 5,
                "description": "Build user interface for alarm display",
                "color": "#10B981",
                "size": 60,
                "properties": {
                    "id": "a1f91a05-308f-5f93-a5e3-3f303d828cfc",
                    "type": "task",
                    "title": "Create Alarm UI",
                    "status": "active",
                    "version": "1.0",
                    "priority": 5
                },
                "reactFlow": {
                    "id": "a1f91a05-308f-5f93-a5e3-3f303d828cfc",
                    "type": "custom",
                    "position": {"x": 100, "y": 200},
                    "data": {"label": "Create Alarm UI", "type": "task"}
                },
                "r3f": {
                    "id": "a1f91a05-308f-5f93-a5e3-3f303d828cfc",
                    "position": [2.0, 0, 4.0],
                    "type": "task",
                    "label": "Create Alarm UI"
                }
            }
        }


class EdgeVisualization(BaseModel):
    """Standardized edge format for graph visualization"""
    id: str = Field(..., description="Edge UUID")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    type: str = Field(..., description="Relationship type")
    label: str | None = Field(None, description="Edge label")
    properties: dict[str, Any] | None = Field(None, description="Edge properties")
    reactFlow: dict[str, Any] = Field(..., description="React Flow edge data")
    r3f: dict[str, Any] = Field(..., description="R3F edge data")


class GraphVisualizationResponse(BaseModel):
    """Response format for /api/v1/graph/visualization endpoint"""
    nodes: list[NodeVisualization] = Field(..., description="Graph nodes")
    edges: list[EdgeVisualization] = Field(..., description="Graph edges")
    metadata: dict[str, Any] | None = Field(None, description="Graph metadata")


class SearchResponse(BaseModel):
    """
    Response format for /api/v1/graph/search endpoint.

    Uses the same NodeVisualization format as the visualization endpoint
    for consistency across all graph endpoints.
    """
    query: str = Field(..., description="Search query text")
    results: list[NodeVisualization] = Field(..., description="Matching nodes (formatted)")
    total_found: int = Field(..., description="Number of results found")
    truncated: bool = Field(..., description="Whether results were truncated")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "alarm",
                "results": [
                    {
                        "id": "a1f91a05-308f-5f93-a5e3-3f303d828cfc",
                        "type": "task",
                        "label": "Create Alarm UI",
                        "status": "active",
                        "priority": 5,
                        "description": "Build user interface for alarm display",
                        "color": "#10B981",
                        "size": 60,
                        "properties": {},
                        "reactFlow": {},
                        "r3f": {}
                    }
                ],
                "total_found": 1,
                "truncated": False
            }
        }


class TraceabilityMatrixResponse(BaseModel):
    """Response format for /api/v1/graph/traceability endpoint"""
    requirements: list[dict[str, Any]] = Field(..., description="Requirements with relationships")
    tests: list[dict[str, Any]] = Field(..., description="Tests with coverage")
    risks: list[dict[str, Any]] = Field(..., description="Risks with mitigations")
    coverage_stats: dict[str, Any] = Field(..., description="Coverage statistics")

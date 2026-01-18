# Requirement Dependency Tracking

This document describes the enhanced requirement dependency tracking functionality implemented in the RequirementService.

## Overview

The dependency tracking system provides comprehensive management of relationships between requirements, supporting multiple dependency types, circular dependency detection, impact analysis, and visualization capabilities.

## Features

### 1. Enhanced Dependency Types

The system supports six types of dependencies:

- **depends_on**: Standard dependency relationship
- **blocks**: Blocking relationship (high impact)
- **relates_to**: Loose relationship for related requirements
- **implements**: Implementation relationship
- **validates**: Validation relationship
- **conflicts_with**: Conflict relationship

### 2. Core Methods

#### `track_requirement_dependency()`
Creates a dependency relationship with enhanced metadata:
- Supports all dependency types
- Includes description and priority
- Prevents circular dependencies
- Validates existing dependencies
- Comprehensive audit logging

```python
await requirement_service.track_requirement_dependency(
    requirement_id=req1_id,
    depends_on_id=req2_id,
    current_user=user,
    dependency_type="implements",
    description="Core implementation dependency",
    priority=4
)
```

#### `get_requirement_dependencies()`
Retrieves all dependencies with metadata:
- Returns both incoming and outgoing dependencies
- Includes relationship metadata (description, priority, status)
- Supports filtering by dependency types
- Ordered by priority and creation date

```python
dependencies = await requirement_service.get_requirement_dependencies(
    requirement_id=req_id,
    include_metadata=True,
    dependency_types=["depends_on", "implements"]
)
```

#### `remove_requirement_dependency()`
Removes dependency relationships:
- Validates dependency exists
- Supports reason for removal
- Comprehensive audit logging

```python
await requirement_service.remove_requirement_dependency(
    requirement_id=req1_id,
    depends_on_id=req2_id,
    current_user=user,
    dependency_type="depends_on",
    reason="No longer needed"
)
```

#### `update_dependency_metadata()`
Updates existing dependency metadata:
- Modify description, priority, or status
- Maintains audit trail
- Validates input parameters

```python
await requirement_service.update_dependency_metadata(
    requirement_id=req1_id,
    depends_on_id=req2_id,
    dependency_type="depends_on",
    current_user=user,
    description="Updated description",
    priority=5,
    status="inactive"
)
```

### 3. Advanced Analysis

#### `get_dependency_chain()`
Retrieves complete dependency chains:
- Supports downstream (dependencies) and upstream (dependents)
- Configurable depth traversal
- Path information with relationship details

```python
chain = await requirement_service.get_dependency_chain(
    requirement_id=req_id,
    direction="downstream",
    max_depth=5,
    dependency_types=["depends_on", "implements"]
)
```

#### `analyze_dependency_impact()`
Analyzes impact of proposed changes:
- Calculates impact levels (0-5)
- Identifies affected requirements
- Generates recommendations
- Considers relationship types and priorities

```python
impact = await requirement_service.analyze_dependency_impact(
    requirement_id=req_id,
    proposed_changes={"status": "completed", "priority": 5}
)
```

#### `get_dependency_visualization_data()`
Generates data for dependency visualization:
- Nodes and edges for graph visualization
- Configurable depth and metadata inclusion
- Statistics and summary information

```python
viz_data = await requirement_service.get_dependency_visualization_data(
    requirement_id=req_id,
    max_depth=3,
    include_metadata=True
)
```

### 4. Validation

#### Enhanced Validation (`validate_requirement_dependencies()`)
Comprehensive validation with detailed reporting:
- Returns validation results with errors, warnings, and recommendations
- Analyzes dependency conflicts and issues
- Provides detailed dependency analysis

#### Simple Validation (`validate_requirement_dependencies_simple()`)
Backward-compatible validation that raises exceptions:
- Quick validation for basic use cases
- Raises ValueError for validation failures

### 5. Circular Dependency Detection

The system includes enhanced circular dependency detection:
- Path tracking for detailed error reporting
- Recursive dependency analysis
- Clear error messages with dependency paths

### 6. Data Structures

#### Dependency Response Structure
```python
{
    "depends_on": [
        {
            "requirement": RequirementResponse,
            "relationship_id": "rel-123",
            "created_at": "2024-01-01T10:00:00Z",
            "created_by": "user-456",
            "created_by_name": "John Doe",
            "description": "Core dependency",
            "priority": 4,
            "status": "active"
        }
    ],
    "blocks": [...],
    "relates_to": [...],
    "implements": [...],
    "validates": [...],
    "conflicts_with": [...],
    "depended_by": [...],
    "blocked_by": [...],
    "related_by": [...],
    "implemented_by": [...],
    "validated_by": [...],
    "conflicts_by": [...]
}
```

#### Impact Analysis Structure
```python
{
    "requirement_id": "req-123",
    "requirement_title": "Test Requirement",
    "proposed_changes": {"status": "completed"},
    "impact_summary": {
        "high_impact": 2,
        "medium_impact": 3,
        "low_impact": 1,
        "total_affected": 6
    },
    "affected_requirements": [
        {
            "requirement": RequirementResponse,
            "relationship_type": "depends_on",
            "impact_level": 4,
            "impact_description": "High impact change",
            "relationship_priority": 3
        }
    ],
    "recommendations": [
        "Review 2 high-impact requirements before proceeding"
    ]
}
```

#### Visualization Data Structure
```python
{
    "nodes": [
        {
            "id": "req-123",
            "label": "Requirement Title",
            "type": "requirement",
            "status": "active",
            "priority": 3,
            "is_central": True,
            "depth": 0,
            "description": "...",
            "version": "1.0"
        }
    ],
    "edges": [
        {
            "id": "req-123-req-456-depends_on",
            "source": "req-123",
            "target": "req-456",
            "type": "depends_on",
            "label": "Depends On",
            "description": "Core dependency",
            "priority": 4,
            "status": "active"
        }
    ],
    "metadata": {
        "central_requirement_id": "req-123",
        "max_depth": 3,
        "statistics": {
            "total_nodes": 5,
            "total_edges": 4,
            "nodes_by_depth": {0: 1, 1: 3, 2: 1},
            "edges_by_type": {"depends_on": 2, "implements": 2}
        }
    }
}
```

## Business Rules

### Dependency Limits
- Maximum 20 direct dependencies per requirement
- Warning at 10+ dependencies
- Recommendations for requirement decomposition

### Priority Levels
- 1: Low priority
- 2: Below normal
- 3: Normal (default)
- 4: High priority
- 5: Critical priority

### Status Values
- **active**: Normal active dependency
- **inactive**: Temporarily disabled
- **deprecated**: Marked for removal

### Impact Levels
- 0: No impact
- 1: Low impact
- 2: Medium-low impact
- 3: Medium impact
- 4: High impact
- 5: Critical impact

## Error Handling

The system provides comprehensive error handling:
- Validation errors with specific messages
- Circular dependency detection with path details
- Existence validation for requirements
- Type validation for dependency types
- Permission validation for operations

## Audit Logging

All dependency operations are logged with:
- User attribution
- Timestamp
- Operation details
- Requirement titles
- Dependency metadata
- Change reasons

## Testing

The implementation includes comprehensive tests:
- Unit tests for all methods
- Integration tests for complex workflows
- Property-based tests for validation logic
- Mock-based testing for external dependencies

## Usage Examples

### Basic Dependency Creation
```python
# Create a simple dependency
await requirement_service.track_requirement_dependency(
    requirement_id=UUID("req-1"),
    depends_on_id=UUID("req-2"),
    current_user=user,
    dependency_type="depends_on"
)
```

### Advanced Dependency with Metadata
```python
# Create dependency with full metadata
await requirement_service.track_requirement_dependency(
    requirement_id=UUID("req-1"),
    depends_on_id=UUID("req-2"),
    current_user=user,
    dependency_type="implements",
    description="Core authentication implementation",
    priority=5
)
```

### Impact Analysis Workflow
```python
# Analyze impact before making changes
impact = await requirement_service.analyze_dependency_impact(
    requirement_id=UUID("req-1"),
    proposed_changes={"status": "completed", "priority": 4}
)

if impact["impact_summary"]["high_impact"] > 0:
    print("High impact changes detected!")
    for rec in impact["recommendations"]:
        print(f"Recommendation: {rec}")
```

### Visualization Data Generation
```python
# Generate data for dependency graph
viz_data = await requirement_service.get_dependency_visualization_data(
    requirement_id=UUID("req-1"),
    max_depth=2,
    include_metadata=True
)

# Use viz_data.nodes and viz_data.edges for graph rendering
```

## Integration Points

The dependency tracking system integrates with:
- **Audit Service**: Comprehensive logging
- **Version Service**: Version-aware dependencies
- **Graph Service**: Efficient graph operations
- **Digital Signature Service**: Signed requirement validation

## Performance Considerations

- Dependency queries are optimized with proper indexing
- Circular dependency detection uses visited set optimization
- Visualization data generation includes depth limits
- Impact analysis uses caching for repeated calculations

## Future Enhancements

Potential future improvements:
- Dependency templates for common patterns
- Automated dependency suggestions
- Dependency health scoring
- Integration with external tools
- Bulk dependency operations
- Dependency change notifications
"""Pytest configuration and fixtures"""

from typing import Any
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import Depends
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.graph import get_graph_service
from app.db.session import Base, get_db
from app.main import app

# Import all models to ensure they're registered with Base
from app.models import *  # noqa: F403, F401
from app.models.user import User, UserRole
from app.services.auth_service import AuthService

# Test database setup
TEST_DATABASE_URL = "postgresql+asyncpg://rxdx:rxdx_dev_password@localhost:5432/test_rxdx"


# Mock graph service for tests
class MockGraphService:
    """Mock graph service for testing"""

    def __init__(self):
        self.workitems = {}  # Store workitems in memory for testing

    async def connect(self):
        pass

    async def close(self):
        pass

    async def create_workitem_node(self, **kwargs):
        from datetime import UTC, datetime
        from uuid import uuid4

        workitem_id = kwargs.get('workitem_id', str(uuid4()))
        workitem_type = kwargs.get('workitem_type', 'workitem')

        workitem = {
            "id": workitem_id,
            "type": workitem_type,
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "is_signed": False,
            **kwargs
        }
        # Store by the workitem_id for easy lookup
        self.workitems[workitem_id] = workitem
        return workitem

    async def get_workitem(self, workitem_id):
        # Convert UUID to string if needed
        workitem_id_str = str(workitem_id)
        return self.workitems.get(workitem_id_str)

    async def get_workitem_version(self, workitem_id, version=None):
        # Mock method to return workitem with version info
        workitem = self.workitems.get(str(workitem_id))  # Ensure string conversion
        if workitem:
            return {**workitem, "version": version or "1.0"}
        return None

    async def create_workitem_version(self, workitem_id, version, data, user_id, change_description):
        # Mock method to create a new version of a workitem
        from datetime import UTC, datetime

        workitem_id_str = str(workitem_id)
        current_workitem = self.workitems.get(workitem_id_str, {})

        version_data = {**current_workitem, **data}
        version_data.update({
            "id": workitem_id_str,
            "version": version,
            "updated_by": user_id,
            "updated_at": datetime.now(UTC).isoformat(),
            "change_description": change_description,
            # Ensure required fields are present
            "created_at": current_workitem.get("created_at", datetime.now(UTC).isoformat()),
            "created_by": current_workitem.get("created_by", user_id),
            "is_signed": False,
        })
        self.workitems[workitem_id_str] = version_data
        return version_data

    async def update_workitem_node(self, workitem_id, data):
        workitem_id_str = str(workitem_id)
        if workitem_id_str in self.workitems:
            self.workitems[workitem_id_str].update(data)
            return self.workitems[workitem_id_str]
        return None

    async def delete_workitem_node(self, workitem_id):
        workitem_id_str = str(workitem_id)
        if workitem_id_str in self.workitems:
            del self.workitems[workitem_id_str]
            return True
        return False

    async def create_relationship(self, from_id=None, to_id=None, rel_type=None, **kwargs):
        # Track relationships for existence checks
        if not hasattr(self, 'relationships'):
            self.relationships = []
        
        # Support both positional and keyword arguments
        from_id = from_id or kwargs.get('from_id')
        to_id = to_id or kwargs.get('to_id')
        rel_type = rel_type or kwargs.get('rel_type')
        properties = kwargs.get('properties', {})
        
        rel = {
            'from_id': from_id,
            'to_id': to_id,
            'type': rel_type,
            **properties
        }
        self.relationships.append(rel)
        return True

    async def remove_relationships(self, **kwargs):
        return True

    async def delete_relationships(self, **kwargs):
        return True

    async def execute_query(self, query, params=None):
        # Mock query results based on query content
        
        # Handle cycle detection queries for BEFORE relationships
        if "[:BEFORE*]" in query and "cycle_count" in query:
            import re
            # Extract the from and to IDs
            ids = re.findall(r"id: '([^']+)'", query)
            if len(ids) >= 2:
                to_id = ids[0]  # First ID in query is 'to'
                from_id = ids[1]  # Second ID in query is 'from'
                
                # Initialize relationships if not exists
                if not hasattr(self, 'relationships'):
                    self.relationships = []
                
                # Check if there's a path from 'to' to 'from' using BFS
                def has_path(start, end):
                    if start == end:
                        return True
                    
                    visited = set()
                    queue = [start]
                    
                    while queue:
                        current = queue.pop(0)
                        if current in visited:
                            continue
                        visited.add(current)
                        
                        # Find all nodes that current points to via BEFORE
                        for rel in self.relationships:
                            if rel.get('from_id') == current and rel.get('type') == 'BEFORE':
                                next_node = rel.get('to_id')
                                if next_node == end:
                                    return True
                                if next_node not in visited:
                                    queue.append(next_node)
                    
                    return False
                
                # Check if adding 'from' -> 'to' would create a cycle
                # This happens if there's already a path from 'to' to 'from'
                cycle_exists = has_path(to_id, from_id)
                
                return [{"cycle_count": 1 if cycle_exists else 0}]
        
        if "MATCH (wp:Workpackage" in query or "MATCH (pred:Workpackage" in query or "MATCH (succ:Workpackage" in query:
            # Handle Workpackage queries
            workpackages = [item for item in self.workitems.values()
                           if item.get('label') == 'Workpackage']
            
            # Handle get_before_dependencies queries for predecessors
            if "MATCH (pred:Workpackage)-[r:BEFORE]->(wp:Workpackage" in query:
                import re
                # Extract target workpackage ID
                id_match = re.search(r"wp:Workpackage \{id: '([^']+)'\}", query)
                if id_match:
                    target_id = id_match.group(1)
                    
                    # Initialize relationships if not exists
                    if not hasattr(self, 'relationships'):
                        self.relationships = []
                    
                    # Find all BEFORE relationships pointing to target
                    results = []
                    for rel in self.relationships:
                        if (rel.get('to_id') == target_id and 
                            rel.get('type') == 'BEFORE'):
                            # Get predecessor workpackage
                            pred_id = rel.get('from_id')
                            if pred_id in self.workitems:
                                pred = self.workitems[pred_id]
                                pred_props = pred.get('properties', pred)
                                results.append({
                                    'id': pred_props.get('id'),
                                    'name': pred_props.get('name'),
                                    'order': pred_props.get('order'),
                                    'dependency_type': rel.get('dependency_type', 'finish-to-start'),
                                    'lag': rel.get('lag', 0)
                                })
                    return results
            
            # Handle get_before_dependencies queries for successors
            if "MATCH (wp:Workpackage" in query and ")-[r:BEFORE]->(succ:Workpackage)" in query:
                import re
                # Extract source workpackage ID
                id_match = re.search(r"wp:Workpackage \{id: '([^']+)'\}", query)
                if id_match:
                    source_id = id_match.group(1)
                    
                    # Initialize relationships if not exists
                    if not hasattr(self, 'relationships'):
                        self.relationships = []
                    
                    # Find all BEFORE relationships from source
                    results = []
                    for rel in self.relationships:
                        if (rel.get('from_id') == source_id and 
                            rel.get('type') == 'BEFORE'):
                            # Get successor workpackage
                            succ_id = rel.get('to_id')
                            if succ_id in self.workitems:
                                succ = self.workitems[succ_id]
                                succ_props = succ.get('properties', succ)
                                results.append({
                                    'id': succ_props.get('id'),
                                    'name': succ_props.get('name'),
                                    'order': succ_props.get('order'),
                                    'dependency_type': rel.get('dependency_type', 'finish-to-start'),
                                    'lag': rel.get('lag', 0)
                                })
                    return results
            
            # Apply filters from inline in MATCH clause: MATCH (wp:Workpackage {id: 'xxx'})
            if "{id: '" in query:
                import re
                id_match = re.search(r"\{id: '([^']+)'\}", query)
                if id_match:
                    workpackage_id = id_match.group(1)
                    # Filter workpackages by ID (compare as strings)
                    workpackages = [wp for wp in workpackages 
                                   if str(wp.get('id')) == str(workpackage_id) or 
                                      str(wp.get('properties', {}).get('id')) == str(workpackage_id)]
            
            # Handle DELETE queries for BEFORE relationships
            if "DELETE r" in query and "BEFORE" in query:
                import re
                # Extract IDs from query
                ids = re.findall(r"id: '([^']+)'", query)
                if len(ids) >= 2:
                    from_id = ids[0]
                    to_id = ids[1]
                    
                    # Initialize relationships if not exists
                    if not hasattr(self, 'relationships'):
                        self.relationships = []
                    
                    # Remove the BEFORE relationship
                    initial_count = len(self.relationships)
                    self.relationships = [
                        rel for rel in self.relationships
                        if not (rel.get('from_id') == from_id and 
                               rel.get('to_id') == to_id and 
                               rel.get('type') == 'BEFORE')
                    ]
                    deleted_count = initial_count - len(self.relationships)
                    
                    return [{"deleted_count": deleted_count}]
            
            # Handle MERGE queries for BEFORE relationships
            if "MERGE" in query and "BEFORE" in query:
                import re
                # Extract IDs and properties from query
                ids = re.findall(r"id: '([^']+)'", query)
                if len(ids) >= 2:
                    from_id = ids[0]
                    to_id = ids[1]
                    
                    # Extract dependency_type and lag from SET clause
                    dependency_type = "finish-to-start"  # default
                    lag = 0  # default
                    
                    dep_type_match = re.search(r"r\.dependency_type = '([^']+)'", query)
                    if dep_type_match:
                        dependency_type = dep_type_match.group(1)
                    
                    lag_match = re.search(r"r\.lag = (\d+)", query)
                    if lag_match:
                        lag = int(lag_match.group(1))
                    
                    # Initialize relationships if not exists
                    if not hasattr(self, 'relationships'):
                        self.relationships = []
                    
                    # Create or update the BEFORE relationship
                    rel = {
                        'from_id': from_id,
                        'to_id': to_id,
                        'type': 'BEFORE',
                        'dependency_type': dependency_type,
                        'lag': lag,
                    }
                    self.relationships.append(rel)
                    
                    return [{"r": rel}]
            
            # Return workpackages in expected format
            # Check if query has "RETURN wp" to determine format
            if "RETURN wp" in query:
                # Return workpackages directly (not wrapped in dict)
                # The service expects results[0] to be the workpackage data
                results = []
                for wp in workpackages:
                    if 'properties' in wp:
                        results.append(wp['properties'])
                    else:
                        results.append(wp)
                return results
            else:
                # Return as-is
                return workpackages
        elif "MATCH (from:WorkItem" in query and "to:WorkItem" in query and "BEFORE" in query:
            # Handle WorkItem (Task) BEFORE relationship queries
            import re
            
            # Handle DELETE queries for BEFORE relationships
            if "DELETE r" in query:
                ids = re.findall(r"id: '([^']+)'", query)
                if len(ids) >= 2:
                    from_id = ids[0]
                    to_id = ids[1]
                    
                    if not hasattr(self, 'relationships'):
                        self.relationships = []
                    
                    # Remove the BEFORE relationship
                    initial_count = len(self.relationships)
                    self.relationships = [
                        rel for rel in self.relationships
                        if not (rel.get('from_id') == from_id and 
                               rel.get('to_id') == to_id and 
                               rel.get('type') == 'BEFORE')
                    ]
                    deleted_count = initial_count - len(self.relationships)
                    
                    return [{"deleted_count": deleted_count}]
            
            # Handle MERGE queries for BEFORE relationships
            if "MERGE" in query:
                ids = re.findall(r"id: '([^']+)'", query)
                if len(ids) >= 2:
                    from_id = ids[0]
                    to_id = ids[1]
                    
                    # Extract dependency_type and lag
                    dependency_type = "finish-to-start"
                    lag = 0
                    
                    dep_type_match = re.search(r"r\.dependency_type = '([^']+)'", query)
                    if dep_type_match:
                        dependency_type = dep_type_match.group(1)
                    
                    lag_match = re.search(r"r\.lag = (\d+)", query)
                    if lag_match:
                        lag = int(lag_match.group(1))
                    
                    if not hasattr(self, 'relationships'):
                        self.relationships = []
                    
                    rel = {
                        'from_id': from_id,
                        'to_id': to_id,
                        'type': 'BEFORE',
                        'dependency_type': dependency_type,
                        'lag': lag,
                    }
                    self.relationships.append(rel)
                    
                    return [{"r": rel}]
            
            return []
        elif "MATCH (pred:WorkItem" in query and ")-[r:BEFORE]->(t:WorkItem" in query:
            # Handle get_before_dependencies queries for task predecessors
            import re
            id_match = re.search(r"t:WorkItem \{id: '([^']+)'", query)
            if id_match:
                target_id = id_match.group(1)
                
                if not hasattr(self, 'relationships'):
                    self.relationships = []
                
                results = []
                for rel in self.relationships:
                    if (rel.get('to_id') == target_id and 
                        rel.get('type') == 'BEFORE'):
                        pred_id = rel.get('from_id')
                        if pred_id in self.workitems:
                            pred = self.workitems[pred_id]
                            pred_props = pred.get('properties', pred)
                            results.append({
                                'id': pred_props.get('id'),
                                'title': pred_props.get('title'),
                                'status': pred_props.get('status'),
                                'dependency_type': rel.get('dependency_type', 'finish-to-start'),
                                'lag': rel.get('lag', 0)
                            })
                return results
        elif "MATCH (t:WorkItem" in query and ")-[r:BEFORE]->(succ:WorkItem" in query:
            # Handle get_before_dependencies queries for task successors
            import re
            id_match = re.search(r"t:WorkItem \{id: '([^']+)'", query)
            if id_match:
                source_id = id_match.group(1)
                
                if not hasattr(self, 'relationships'):
                    self.relationships = []
                
                results = []
                for rel in self.relationships:
                    if (rel.get('from_id') == source_id and 
                        rel.get('type') == 'BEFORE'):
                        succ_id = rel.get('to_id')
                        if succ_id in self.workitems:
                            succ = self.workitems[succ_id]
                            succ_props = succ.get('properties', succ)
                            results.append({
                                'id': succ_props.get('id'),
                                'title': succ_props.get('title'),
                                'status': succ_props.get('status'),
                                'dependency_type': rel.get('dependency_type', 'finish-to-start'),
                                'lag': rel.get('lag', 0)
                            })
                return results
        elif "MATCH (m:Milestone" in query or "MATCH (from:Milestone" in query or "MATCH (pred:Milestone" in query:
            # Handle Milestone queries
            milestones = [item for item in self.workitems.values()
                         if item.get('label') == 'Milestone']
            
            # Handle get_before_dependencies queries for milestone predecessors
            if "MATCH (pred:Milestone)-[r:BEFORE]->(m:Milestone" in query:
                import re
                id_match = re.search(r"m:Milestone \{id: '([^']+)'\}", query)
                if id_match:
                    target_id = id_match.group(1)
                    
                    if not hasattr(self, 'relationships'):
                        self.relationships = []
                    
                    results = []
                    for rel in self.relationships:
                        if (rel.get('to_id') == target_id and 
                            rel.get('type') == 'BEFORE'):
                            pred_id = rel.get('from_id')
                            if pred_id in self.workitems:
                                pred = self.workitems[pred_id]
                                pred_props = pred.get('properties', pred)
                                results.append({
                                    'id': pred_props.get('id'),
                                    'title': pred_props.get('title'),
                                    'status': pred_props.get('status'),
                                    'dependency_type': rel.get('dependency_type', 'finish-to-start'),
                                    'lag': rel.get('lag', 0)
                                })
                    return results
            
            # Handle get_before_dependencies queries for milestone successors
            if "MATCH (m:Milestone" in query and ")-[r:BEFORE]->(succ:Milestone)" in query:
                import re
                id_match = re.search(r"m:Milestone \{id: '([^']+)'\}", query)
                if id_match:
                    source_id = id_match.group(1)
                    
                    if not hasattr(self, 'relationships'):
                        self.relationships = []
                    
                    results = []
                    for rel in self.relationships:
                        if (rel.get('from_id') == source_id and 
                            rel.get('type') == 'BEFORE'):
                            succ_id = rel.get('to_id')
                            if succ_id in self.workitems:
                                succ = self.workitems[succ_id]
                                succ_props = succ.get('properties', succ)
                                results.append({
                                    'id': succ_props.get('id'),
                                    'title': succ_props.get('title'),
                                    'status': succ_props.get('status'),
                                    'dependency_type': rel.get('dependency_type', 'finish-to-start'),
                                    'lag': rel.get('lag', 0)
                                })
                    return results
            
            # Handle BEFORE relationship queries
            if "BEFORE" in query:
                import re
                
                # Handle DELETE queries for BEFORE relationships
                if "DELETE r" in query:
                    ids = re.findall(r"id: '([^']+)'", query)
                    if len(ids) >= 2:
                        from_id = ids[0]
                        to_id = ids[1]
                        
                        if not hasattr(self, 'relationships'):
                            self.relationships = []
                        
                        initial_count = len(self.relationships)
                        self.relationships = [
                            rel for rel in self.relationships
                            if not (rel.get('from_id') == from_id and 
                                   rel.get('to_id') == to_id and 
                                   rel.get('type') == 'BEFORE')
                        ]
                        deleted_count = initial_count - len(self.relationships)
                        
                        return [{"deleted_count": deleted_count}]
                
                # Handle MERGE queries for BEFORE relationships
                if "MERGE" in query:
                    ids = re.findall(r"id: '([^']+)'", query)
                    if len(ids) >= 2:
                        from_id = ids[0]
                        to_id = ids[1]
                        
                        # Extract dependency_type and lag
                        dependency_type = "finish-to-start"
                        lag = 0
                        
                        dep_type_match = re.search(r"r\.dependency_type = '([^']+)'", query)
                        if dep_type_match:
                            dependency_type = dep_type_match.group(1)
                        
                        lag_match = re.search(r"r\.lag = (\d+)", query)
                        if lag_match:
                            lag = int(lag_match.group(1))
                        
                        if not hasattr(self, 'relationships'):
                            self.relationships = []
                        
                        rel = {
                            'from_id': from_id,
                            'to_id': to_id,
                            'type': 'BEFORE',
                            'dependency_type': dependency_type,
                            'lag': lag,
                        }
                        self.relationships.append(rel)
                        
                        return [{"r": rel}]
            
            # Apply filters from WHERE clause or inline in MATCH
            # Check for inline id filter in MATCH clause: MATCH (m:Milestone {id: 'xxx'})
            if "{id: '" in query:
                import re
                id_match = re.search(r"\{id: '([^']+)'\}", query)
                if id_match:
                    milestone_id = id_match.group(1)
                    # Filter milestones by ID (compare as strings)
                    milestones = [m for m in milestones 
                                if str(m.get('id')) == str(milestone_id) or 
                                   str(m.get('properties', {}).get('id')) == str(milestone_id)]
            
            if "WHERE" in query:
                # Extract project_id filter
                if "m.project_id = '" in query:
                    import re
                    project_match = re.search(r"m\.project_id = '([^']+)'", query)
                    if project_match:
                        project_id = project_match.group(1)
                        milestones = [m for m in milestones 
                                    if m.get('project_id') == project_id or 
                                       m.get('properties', {}).get('project_id') == project_id]
                
                # Extract status filter
                if "m.status = '" in query:
                    import re
                    status_match = re.search(r"m\.status = '([^']+)'", query)
                    if status_match:
                        status = status_match.group(1)
                        milestones = [m for m in milestones 
                                    if m.get('status') == status or 
                                       m.get('properties', {}).get('status') == status]
                
                # Extract id filter
                if "m.id = '" in query:
                    import re
                    id_match = re.search(r"m\.id = '([^']+)'", query)
                    if id_match:
                        milestone_id = id_match.group(1)
                        milestones = [m for m in milestones 
                                    if m.get('id') == milestone_id or 
                                       m.get('properties', {}).get('id') == milestone_id]
            
            # Handle DELETE queries
            if "DETACH DELETE m" in query:
                # Extract id from query
                import re
                id_match = re.search(r"m\.id = '([^']+)'", query)
                if id_match:
                    milestone_id = id_match.group(1)
                    if milestone_id in self.workitems:
                        del self.workitems[milestone_id]
                return []
            
            # Handle UPDATE queries
            if "SET" in query:
                # Extract id and update fields
                import re
                id_match = re.search(r"m\.id = '([^']+)'", query)
                if id_match and milestones:
                    milestone_id = id_match.group(1)
                    if milestone_id in self.workitems:
                        # Parse SET clause
                        set_match = re.search(r"SET (.+?) RETURN", query)
                        if set_match:
                            set_clause = set_match.group(1)
                            # Simple parsing of SET clause
                            updates = {}
                            for assignment in set_clause.split(','):
                                assignment = assignment.strip()
                                if '=' in assignment:
                                    key_part, value_part = assignment.split('=', 1)
                                    key = key_part.strip().replace('m.', '')
                                    value = value_part.strip().strip("'")
                                    
                                    # Handle boolean values
                                    if value.lower() == 'true':
                                        value = True
                                    elif value.lower() == 'false':
                                        value = False
                                    
                                    updates[key] = value
                            
                            # Update the milestone
                            self.workitems[milestone_id].update(updates)
                            if 'properties' in self.workitems[milestone_id]:
                                self.workitems[milestone_id]['properties'].update(updates)
                            
                            milestones = [self.workitems[milestone_id]]
            
            # Return milestones in expected format - just the properties dict
            results = []
            for m in milestones:
                if 'properties' in m:
                    results.append(m['properties'])
                else:
                    results.append(m)
            return results
        elif "MATCH (ts:WorkItem)" in query and "test_spec" in query:
            # Return test specs
            test_specs = [item for item in self.workitems.values()
                         if item.get('workitem_type') == 'test_spec']
            return [{"ts": spec} for spec in test_specs]
        elif "MATCH (tr:WorkItem)" in query and "test_run" in query:
            # Return test runs
            test_runs = [item for item in self.workitems.values()
                        if item.get('workitem_type') == 'test_run']
            return [{"tr": run} for run in test_runs]
        elif "MATCH (req:WorkItem)" in query:
            # Return requirements
            requirements = [item for item in self.workitems.values()
                           if item.get('workitem_type') == 'requirement']
            return [{"req": req} for req in requirements]
        elif "MATCH (r:Risk" in query and "HAS_MITIGATION" in query:
            # Return mitigations for a risk
            mitigations = [item for item in self.workitems.values()
                          if item.get('type') == 'mitigation']
            return [{"m": m} for m in mitigations]
        elif "MATCH (a" in query and ")-[r:" in query and "]->(b" in query and "RETURN r" in query:
            # Check for relationship existence
            # Extract relationship type and node IDs from query
            # This is a simplified check - in reality would parse the query properly
            # For now, track relationships separately
            if not hasattr(self, 'relationships'):
                self.relationships = []
            
            # Check if this relationship already exists
            # Parse the query to extract from_id, to_id, and rel_type
            import re
            from_match = re.search(r"id: '([^']+)'", query)
            to_match = re.search(r"id: '([^']+)'.*id: '([^']+)'", query)
            rel_type_match = re.search(r"\[r:(\w+)\]", query)
            
            if from_match and to_match and rel_type_match:
                from_id = from_match.group(1)
                # Get the second ID match
                ids = re.findall(r"id: '([^']+)'", query)
                if len(ids) >= 2:
                    to_id = ids[1]
                    rel_type = rel_type_match.group(1)
                    
                    # Check if relationship exists
                    for rel in self.relationships:
                        if (rel.get('from_id') == from_id and 
                            rel.get('to_id') == to_id and 
                            rel.get('type') == rel_type):
                            return [{"r": rel}]
            
            return []
        return []

    async def create_node(self, label, properties):
        """Create a node in the graph database."""

        node_id = properties.get('id', str(uuid4()))
        # Store node with both top-level properties and nested properties
        # to match AGE behavior
        node = {
            "id": node_id,
            "label": label,
            "properties": properties.copy(),
            **properties  # Also store at top level for easier access
        }
        self.workitems[node_id] = node
        return node

    async def get_node(self, node_id):
        """Get a node by ID."""
        return self.workitems.get(str(node_id))

    async def update_node(self, node_id, data):
        """Update a node."""
        node_id_str = str(node_id)
        if node_id_str in self.workitems:
            self.workitems[node_id_str].update(data)
            if 'properties' in self.workitems[node_id_str]:
                self.workitems[node_id_str]['properties'].update(data)
            return self.workitems[node_id_str]
        return None

    async def delete_node(self, node_id):
        """Delete a node."""
        node_id_str = str(node_id)
        if node_id_str in self.workitems:
            del self.workitems[node_id_str]
            return True
        return False

    async def search_nodes(self, label=None, properties=None, limit=50):
        """Search for nodes."""
        results = []
        for item in self.workitems.values():
            if label and item.get('label') != label:
                continue
            if properties:
                match = True
                for key, value in properties.items():
                    if item.get(key) != value and item.get('properties', {}).get(key) != value:
                        match = False
                        break
                if not match:
                    continue
            results.append(item)
            if len(results) >= limit:
                break
        return results

    async def get_risk_chains(self, risk_id=None, max_depth=5):
        """Get risk failure chains."""
        # Return empty list for mock - chains would be populated by actual graph queries
        return []

    async def link_workpackage_to_department(
        self,
        workpackage_id: str,
        department_id: str
    ) -> dict[str, Any]:
        """
        Create LINKED_TO_DEPARTMENT relationship from Workpackage to Department.
        A workpackage can only be linked to one department at a time.
        """
        # Verify workpackage exists
        if workpackage_id not in self.workitems:
            raise ValueError(f"Workpackage {workpackage_id} not found")
        
        # Verify department exists
        if department_id not in self.workitems:
            raise ValueError(f"Department {department_id} not found")
        
        # Initialize relationships tracking if not exists
        if not hasattr(self, 'relationships'):
            self.relationships = []
        
        # Check if workpackage is already linked to a department
        existing_link = None
        for rel in self.relationships:
            if (rel.get('from_id') == workpackage_id and 
                rel.get('type') == 'LINKED_TO_DEPARTMENT'):
                existing_link = rel
                break
        
        if existing_link:
            existing_dept_id = existing_link.get('to_id')
            if existing_dept_id != department_id:
                raise ValueError(
                    f"Workpackage {workpackage_id} is already linked to department {existing_dept_id}. "
                    "Remove the existing link first."
                )
            # Already linked to this department
            return {"workpackage_id": workpackage_id, "department_id": department_id}
        
        # Create the relationship
        rel = {
            'from_id': workpackage_id,
            'to_id': department_id,
            'type': 'LINKED_TO_DEPARTMENT',
        }
        self.relationships.append(rel)
        return {"workpackage_id": workpackage_id, "department_id": department_id, "start_id": workpackage_id}

    async def unlink_workpackage_from_department(
        self,
        workpackage_id: str,
        department_id: str | None = None
    ) -> bool:
        """
        Remove LINKED_TO_DEPARTMENT relationship from Workpackage to Department.
        """
        # Verify workpackage exists
        if workpackage_id not in self.workitems:
            raise ValueError(f"Workpackage {workpackage_id} not found")
        
        # Initialize relationships tracking if not exists
        if not hasattr(self, 'relationships'):
            self.relationships = []
        
        # Find and remove the relationship
        removed = False
        for i, rel in enumerate(self.relationships):
            if (rel.get('from_id') == workpackage_id and 
                rel.get('type') == 'LINKED_TO_DEPARTMENT'):
                if department_id is None or rel.get('to_id') == department_id:
                    self.relationships.pop(i)
                    removed = True
                    break
        
        return removed

    async def get_workpackage_department(
        self,
        workpackage_id: str
    ) -> dict[str, Any] | None:
        """
        Get the department linked to a workpackage.
        """
        # Verify workpackage exists
        if workpackage_id not in self.workitems:
            raise ValueError(f"Workpackage {workpackage_id} not found")
        
        # Initialize relationships tracking if not exists
        if not hasattr(self, 'relationships'):
            self.relationships = []
        
        # Find the linked department
        for rel in self.relationships:
            if (rel.get('from_id') == workpackage_id and 
                rel.get('type') == 'LINKED_TO_DEPARTMENT'):
                department_id = rel.get('to_id')
                if department_id in self.workitems:
                    dept = self.workitems[department_id]
                    # Return properties if available, otherwise the whole node
                    if 'properties' in dept:
                        return dept['properties']
                    return dept
        
        return None

    async def get_department_resources_for_workpackage(
        self,
        workpackage_id: str,
        skills_filter: list[str] | None = None
    ) -> list[dict[str, Any]]:
        """
        Get resources from the department linked to a workpackage.
        """
        # Get linked department
        department = await self.get_workpackage_department(workpackage_id)
        if not department:
            return []
        
        department_id = department.get('id')
        
        # Initialize relationships tracking if not exists
        if not hasattr(self, 'relationships'):
            self.relationships = []
        
        # Find resources that belong to this department
        resources = []
        for rel in self.relationships:
            if (rel.get('to_id') == department_id and 
                rel.get('type') == 'BELONGS_TO'):
                resource_id = rel.get('from_id')
                if resource_id in self.workitems:
                    resource = self.workitems[resource_id]
                    
                    # Apply skills filter if provided
                    if skills_filter:
                        import json
                        resource_skills = resource.get('skills', '[]')
                        if isinstance(resource_skills, str):
                            resource_skills = json.loads(resource_skills)
                        
                        # Check if any of the filter skills match
                        if not any(skill in resource_skills for skill in skills_filter):
                            continue
                    
                    # Return properties if available, otherwise the whole node
                    if 'properties' in resource:
                        resources.append(resource['properties'])
                    else:
                        resources.append(resource)
        
        return resources


@pytest.fixture
def mock_graph_service():
    """Create a mock graph service for testing"""
    return MockGraphService()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create a test database engine for each test"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        poolclass=None,  # Use NullPool to avoid connection pool issues
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop tables and dispose engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    """Create test database session"""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client(test_engine):
    """Create test client with database override"""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db():
        async with async_session() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    # Mock graph service
    mock_graph_service = MockGraphService()

    async def override_get_graph_service():
        return mock_graph_service

    # Mock test service to use our mock graph service
    async def override_get_test_service(db: AsyncSession = Depends(override_get_db)):
        from app.services.audit_service import AuditService
        from app.services.signature_service import SignatureService
        from app.services.test_service import TestService
        from app.services.version_service import VersionService

        # Create mock services
        audit_service = AuditService(db)
        signature_service = SignatureService(db)
        version_service = VersionService(mock_graph_service, audit_service)

        return TestService(
            graph_service=mock_graph_service,
            audit_service=audit_service,
            signature_service=signature_service,
            version_service=version_service,
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_graph_service] = override_get_graph_service

    # Import and override the get_test_service function
    from app.api.v1.tests import get_test_service
    app.dependency_overrides[get_test_service] = override_get_test_service

    # Mock risk service to use our mock graph service
    async def override_get_risk_service(db: AsyncSession = Depends(override_get_db)):
        from app.services.audit_service import AuditService
        from app.services.risk_service import RiskService
        from app.services.signature_service import SignatureService
        from app.services.version_service import VersionService

        # Create mock services
        audit_service = AuditService(db)
        signature_service = SignatureService(db)
        version_service = VersionService(mock_graph_service, audit_service)

        return RiskService(
            graph_service=mock_graph_service,
            audit_service=audit_service,
            signature_service=signature_service,
            version_service=version_service,
        )

    # Import and override the get_risk_service function
    from app.api.v1.risks import get_risk_service
    app.dependency_overrides[get_risk_service] = override_get_risk_service

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Clean up overrides
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession):
    """Create a test user"""
    auth_service = AuthService(db_session)
    user = await auth_service.create_user(
        email="test@example.com",
        password="TestPassword123!",
        full_name="Test User",
        role=UserRole.USER.value,
    )
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession):
    """Create a test admin user"""
    auth_service = AuthService(db_session)
    admin = await auth_service.create_user(
        email="admin@example.com",
        password="AdminPassword123!",
        full_name="Admin User",
        role=UserRole.ADMIN.value,
    )
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, test_user: User):
    """Create authentication headers for test requests"""
    # Login to get token
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!",
        },
    )

    if response.status_code != 200:
        pytest.skip("Could not authenticate test user")

    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_settings():
    """Test settings override"""
    try:
        from app.core.config import Settings

        return Settings(
            ENVIRONMENT="testing",
            DEBUG=True,
            SECRET_KEY="test-secret-key-for-testing-only",
            DATABASE_URL="postgresql+asyncpg://test:test@localhost:5432/test_rxdx",
        )
    except ImportError:
        # Return a mock settings object for unit tests that don't need real settings
        class MockSettings:
            ENVIRONMENT = "testing"
            DEBUG = True
            SECRET_KEY = "test-secret-key-for-testing-only"
            DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/test_rxdx"

        return MockSettings()

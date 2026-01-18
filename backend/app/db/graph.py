"""Apache AGE graph database operations"""

import asyncpg
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from app.core.config import settings
import json


class GraphService:
    """Service for interacting with Apache AGE graph database"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.graph_name = settings.AGE_GRAPH_NAME
        
    async def connect(self):
        """Create connection pool to PostgreSQL with AGE"""
        if self.pool is None:
            # Parse DATABASE_URL to get connection parameters
            # Format: postgresql+asyncpg://user:pass@host:port/dbname
            url = str(settings.DATABASE_URL).replace('postgresql+asyncpg://', 'postgresql://')
            self.pool = await asyncpg.create_pool(
                url,
                min_size=5,
                max_size=20,
                command_timeout=60,
            )
            
            # Load AGE extension and set search path for each connection
            async def init_connection(conn):
                await conn.execute("LOAD 'age';")
                await conn.execute("SET search_path = ag_catalog, '$user', public;")
                
            # Apply initialization to all connections in the pool
            async with self.pool.acquire() as conn:
                await init_connection(conn)
                
    async def close(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
            self.pool = None
            
    async def _ensure_graph_exists(self):
        """Ensure the graph database exists"""
        async with self.pool.acquire() as conn:
            try:
                # Ensure AGE is loaded and search path is set
                await conn.execute("LOAD 'age';")
                await conn.execute("SET search_path = ag_catalog, '$user', public;")
                
                # Check if graph exists
                check_query = f"SELECT * FROM ag_catalog.ag_graph WHERE name = '{self.graph_name}'"
                result = await conn.fetch(check_query)
                
                if not result:
                    # Create the graph using the correct function
                    create_query = f"SELECT ag_catalog.create_graph('{self.graph_name}')"
                    await conn.fetch(create_query)
                    print(f"Created graph: {self.graph_name}")
                    
            except Exception as e:
                print(f"Graph creation error: {e}")
                # Graph might already exist, continue
            
    async def execute_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict]:
        """
        Execute a Cypher query using Apache AGE
        
        Args:
            query: Cypher query string
            params: Query parameters
            
        Returns:
            List of result dictionaries
        """
        if not self.pool:
            await self.connect()
            
        # Ensure the graph exists before executing queries
        await self._ensure_graph_exists()
            
        # Use the full ag_catalog.cypher function with explicit type casting
        sql_query = f"""
        SELECT * FROM ag_catalog.cypher('{self.graph_name}', $$
            {query}
        $$) as (result ag_catalog.agtype);
        """
        
        async with self.pool.acquire() as conn:
            try:
                # Ensure AGE is loaded and search path is set for this connection
                await conn.execute("LOAD 'age';")
                await conn.execute("SET search_path = ag_catalog, '$user', public;")
                
                rows = await conn.fetch(sql_query)
                
                # Parse AGE agtype results to Python dicts
                results = []
                for row in rows:
                    result = row['result']
                    # AGE returns results as agtype, convert to dict
                    if result:
                        results.append(self._parse_agtype(result))
                        
                return results
            except Exception as e:
                # Log the error for debugging
                print(f"Query execution error: {e}")
                print(f"Query: {sql_query}")
                raise
            
    async def create_node(
        self,
        label: str,
        properties: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a node in the graph
        
        Args:
            label: Node label (e.g., 'WorkItem', 'Risk', 'Entity')
            properties: Node properties as dictionary
            
        Returns:
            Created node with ID
        """
        props_str = self._dict_to_cypher_props(properties)
        query = f"CREATE (n:{label} {props_str}) RETURN n"
        
        results = await self.execute_query(query)
        return results[0] if results else {}
        
    async def create_relationship(
        self,
        from_id: str,
        to_id: str,
        rel_type: str,
        properties: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a relationship between two nodes
        
        Args:
            from_id: Source node ID
            to_id: Target node ID
            rel_type: Relationship type (e.g., 'TESTED_BY', 'DEPENDS_ON')
            properties: Optional relationship properties
            
        Returns:
            Created relationship
        """
        props_str = self._dict_to_cypher_props(properties) if properties else ""
        
        query = f"""
        MATCH (a {{id: '{from_id}'}}), (b {{id: '{to_id}'}})
        CREATE (a)-[r:{rel_type} {props_str}]->(b)
        RETURN r
        """
        
        results = await self.execute_query(query)
        return results[0] if results else {}
        
    async def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get a node by ID"""
        query = f"MATCH (n {{id: '{node_id}'}}) RETURN n"
        results = await self.execute_query(query)
        return results[0] if results else None
        
    async def update_node(
        self,
        node_id: str,
        properties: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update node properties"""
        set_clauses = ", ".join([f"n.{k} = '{v}'" for k, v in properties.items()])
        query = f"""
        MATCH (n {{id: '{node_id}'}})
        SET {set_clauses}
        RETURN n
        """
        
        results = await self.execute_query(query)
        return results[0] if results else {}
        
    async def delete_node(self, node_id: str) -> bool:
        """Delete a node and its relationships"""
        query = f"""
        MATCH (n {{id: '{node_id}'}})
        DETACH DELETE n
        """
        
        await self.execute_query(query)
        return True
        
    async def find_related_nodes(
        self,
        node_id: str,
        relationship_type: Optional[str] = None,
        direction: str = "both",
        depth: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Find nodes related to a given node
        
        Args:
            node_id: Starting node ID
            relationship_type: Optional relationship type filter
            direction: 'outgoing', 'incoming', or 'both'
            depth: Traversal depth (default 1)
            
        Returns:
            List of related nodes
        """
        rel_pattern = f"[:{relationship_type}]" if relationship_type else "[]"
        
        if direction == "outgoing":
            pattern = f"-{rel_pattern}->"
        elif direction == "incoming":
            pattern = f"<-{rel_pattern}-"
        else:  # both
            pattern = f"-{rel_pattern}-"
            
        depth_pattern = f"*1..{depth}" if depth > 1 else ""
        
        query = f"""
        MATCH (n {{id: '{node_id}'}}){pattern}{depth_pattern}(related)
        RETURN DISTINCT related
        """
        
        return await self.execute_query(query)
        
    async def search_nodes(
        self,
        label: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Search for nodes by label and/or properties
        
        Args:
            label: Optional node label filter
            properties: Optional property filters
            limit: Maximum number of results
            
        Returns:
            List of matching nodes
        """
        label_str = f":{label}" if label else ""
        props_str = self._dict_to_cypher_props(properties) if properties else ""
        
        query = f"""
        MATCH (n{label_str} {props_str})
        RETURN n
        LIMIT {limit}
        """
        
        return await self.execute_query(query)

    async def create_workitem_node(
        self,
        workitem_id: str,
        workitem_type: str,
        title: str,
        description: Optional[str] = None,
        status: str = "draft",
        priority: Optional[int] = None,
        version: str = "1.0",
        created_by: str = None,
        assigned_to: Optional[str] = None,
        **additional_props
    ) -> Dict[str, Any]:
        """
        Create a WorkItem node in the graph database
        
        Args:
            workitem_id: Unique identifier for the WorkItem
            workitem_type: Type of WorkItem (requirement, task, test, risk, document)
            title: WorkItem title
            description: Optional description
            status: WorkItem status (draft, active, completed, archived)
            priority: Priority level (1-5)
            version: Version string (default "1.0")
            created_by: User ID who created the WorkItem
            assigned_to: Optional user ID assigned to the WorkItem
            **additional_props: Additional properties specific to WorkItem type
            
        Returns:
            Created WorkItem node
        """
        properties = {
            "id": workitem_id,
            "type": workitem_type,
            "title": title,
            "status": status,
            "version": version
        }
        
        if description:
            properties["description"] = description
        if priority:
            properties["priority"] = priority
        if created_by:
            properties["created_by"] = created_by
        if assigned_to:
            properties["assigned_to"] = assigned_to
            
        # Add any additional properties
        properties.update(additional_props)
        
        # Add timestamps
        properties["created_at"] = datetime.now(timezone.utc).isoformat()
        properties["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        return await self.create_node("WorkItem", properties)

    async def get_workitem(self, workitem_id: str) -> Optional[Dict[str, Any]]:
        """Get a WorkItem node by ID"""
        query = f"MATCH (w:WorkItem {{id: '{workitem_id}'}}) RETURN w"
        results = await self.execute_query(query)
        
        if results:
            # Extract the node data from the parsed result
            node_data = results[0]
            if 'properties' in node_data:
                return node_data['properties']
            else:
                return node_data
        return None
        
    async def get_workitem_version(self, workitem_id: str, version: str) -> Optional[Dict[str, Any]]:
        """Get a specific version of a WorkItem"""
        query = f"MATCH (w:WorkItem {{id: '{workitem_id}', version: '{version}'}}) RETURN w"
        results = await self.execute_query(query)
        
        if results:
            # Extract the node data from the parsed result
            node_data = results[0]
            if 'properties' in node_data:
                return node_data['properties']
            else:
                return node_data
        return None
        
    async def create_workitem_version(
        self,
        workitem_id: str,
        version: str,
        data: Dict[str, Any],
        user_id: str,
        change_description: str
    ) -> Dict[str, Any]:
        """Create a new version of a WorkItem"""
        # Update the data with new version info
        version_data = {**data}
        version_data.update({
            "version": version,
            "updated_by": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "change_description": change_description
        })
        
        return await self.create_node("WorkItem", version_data)
        
    async def initialize_graph_schema(self) -> Dict[str, List[str]]:
        """
        Initialize the graph schema with supported node types and relationships
        
        Returns:
            Dictionary with supported node_types and relationship_types
        """
        # Define supported node types
        node_types = [
            "WorkItem",      # Base work item (requirements, tasks, tests, etc.)
            "Requirement",   # Specific requirement nodes
            "Task",          # Task nodes
            "Test",          # Test specification nodes
            "Risk",          # Risk nodes for FMEA
            "Failure",       # Failure nodes for FMEA chains
            "Document",      # Document nodes
            "Entity",        # Entities extracted from emails/meetings
            "User"           # User nodes for relationships
        ]
        
        # Define supported relationship types
        relationship_types = [
            "TESTED_BY",     # Requirement -> Test
            "MITIGATES",     # Requirement -> Risk
            "DEPENDS_ON",    # WorkItem -> WorkItem (dependencies)
            "IMPLEMENTS",    # Task -> Requirement
            "LEADS_TO",      # Risk -> Failure (FMEA chains)
            "RELATES_TO",    # Entity -> Entity
            "MENTIONED_IN",  # Entity -> WorkItem
            "REFERENCES",    # WorkItem -> WorkItem
            "NEXT_VERSION",  # WorkItem -> WorkItem (version history)
            "CREATED_BY",    # WorkItem -> User
            "ASSIGNED_TO"    # WorkItem -> User
        ]
        
        # Note: AGE doesn't support CREATE INDEX in Cypher queries like Neo4j
        # Indexes would need to be created using PostgreSQL syntax if needed
        
        return {
            "node_types": node_types,
            "relationship_types": relationship_types
        }
        
    def _dict_to_cypher_props(self, props: Dict[str, Any]) -> str:
        """Convert Python dict to Cypher properties string"""
        if not props:
            return ""
            
        items = []
        for k, v in props.items():
            if isinstance(v, str):
                # Escape single quotes in strings
                escaped_v = v.replace("'", "\\'")
                items.append(f"{k}: '{escaped_v}'")
            elif isinstance(v, bool):
                # Handle booleans before int/float check since bool is a subclass of int
                items.append(f"{k}: {str(v).lower()}")
            elif isinstance(v, (int, float)):
                items.append(f"{k}: {v}")
            elif v is None:
                items.append(f"{k}: null")
            else:
                # For complex types, serialize to JSON string
                escaped_json = json.dumps(v).replace("'", "\\'")
                items.append(f"{k}: '{escaped_json}'")
                
        return "{" + ", ".join(items) + "}"
        
    def _parse_agtype(self, agtype_value: Any) -> Dict[str, Any]:
        """Parse AGE agtype value to Python dict"""
        if isinstance(agtype_value, str):
            # AGE returns vertex/edge data as strings like: 
            # '{"id": 1125899906842625, "label": "WorkItem", "properties": {...}}::vertex'
            if '::vertex' in agtype_value or '::edge' in agtype_value:
                # Remove the type suffix and parse JSON
                json_part = agtype_value.split('::')[0]
                try:
                    return json.loads(json_part)
                except json.JSONDecodeError:
                    return {"value": agtype_value}
            else:
                try:
                    return json.loads(agtype_value)
                except json.JSONDecodeError:
                    return {"value": agtype_value}
        return agtype_value


# Global graph service instance
graph_service = GraphService()


async def get_graph_service() -> GraphService:
    """Dependency for getting graph service"""
    if not graph_service.pool:
        await graph_service.connect()
    return graph_service
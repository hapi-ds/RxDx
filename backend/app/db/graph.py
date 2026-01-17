"""Apache AGE graph database operations"""

import asyncpg
from typing import Any, Dict, List, Optional
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
            
            # Load AGE extension
            async with self.pool.acquire() as conn:
                await conn.execute("LOAD 'age';")
                await conn.execute("SET search_path = ag_catalog, '$user', public;")
                
    async def close(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
            self.pool = None
            
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
            
        # Wrap Cypher query in AGE SQL function
        sql_query = f"""
        SELECT * FROM cypher('{self.graph_name}', $$
            {query}
        $$) as (result agtype);
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(sql_query)
            
            # Parse AGE agtype results to Python dicts
            results = []
            for row in rows:
                result = row['result']
                # AGE returns results as agtype, convert to dict
                if result:
                    results.append(self._parse_agtype(result))
                    
            return results
            
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
        
    def _dict_to_cypher_props(self, props: Dict[str, Any]) -> str:
        """Convert Python dict to Cypher properties string"""
        if not props:
            return ""
            
        items = []
        for k, v in props.items():
            if isinstance(v, str):
                items.append(f"{k}: '{v}'")
            elif isinstance(v, (int, float, bool)):
                items.append(f"{k}: {str(v).lower() if isinstance(v, bool) else v}")
            elif v is None:
                items.append(f"{k}: null")
            else:
                # For complex types, serialize to JSON string
                items.append(f"{k}: '{json.dumps(v)}'")
                
        return "{" + ", ".join(items) + "}"
        
    def _parse_agtype(self, agtype_value: Any) -> Dict[str, Any]:
        """Parse AGE agtype value to Python dict"""
        # AGE returns agtype values that need to be parsed
        # This is a simplified parser - may need enhancement
        if isinstance(agtype_value, str):
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

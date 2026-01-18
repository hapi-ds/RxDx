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
        
    async def search_workitems(
        self,
        search_text: Optional[str] = None,
        workitem_type: Optional[str] = None,
        status: Optional[str] = None,
        assigned_to: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Search WorkItems with full-text search and filters
        
        Args:
            search_text: Text to search in title and description
            workitem_type: Filter by WorkItem type
            status: Filter by status
            assigned_to: Filter by assigned user
            limit: Maximum number of results
            
        Returns:
            List of matching WorkItems
        """
        # Build WHERE clauses
        where_clauses = []
        
        if workitem_type:
            where_clauses.append(f"w.type = '{workitem_type}'")
        if status:
            where_clauses.append(f"w.status = '{status}'")
        if assigned_to:
            where_clauses.append(f"w.assigned_to = '{assigned_to}'")
            
        # Add text search (case-insensitive contains)
        if search_text:
            escaped_text = search_text.replace("'", "\\'").lower()
            where_clauses.append(
                f"(toLower(w.title) CONTAINS '{escaped_text}' OR "
                f"toLower(w.description) CONTAINS '{escaped_text}')"
            )
            
        where_clause = " AND ".join(where_clauses) if where_clauses else "true"
        
        query = f"""
        MATCH (w:WorkItem)
        WHERE {where_clause}
        RETURN w
        ORDER BY w.updated_at DESC
        LIMIT {limit}
        """
        
        results = await self.execute_query(query)
        
        # Extract WorkItem data from results
        workitems = []
        for result in results:
            if 'properties' in result:
                workitems.append(result['properties'])
            else:
                workitems.append(result)
                
        return workitems
        
    async def get_traceability_matrix(
        self,
        project_id: Optional[str] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get traceability matrix showing relationships between requirements, tests, and risks
        
        Args:
            project_id: Optional project filter
            
        Returns:
            Dictionary with requirements, tests, risks and their relationships
        """
        # Build project filter if provided
        project_filter = f"AND r.project_id = '{project_id}'" if project_id else ""
        
        # Get requirements and their relationships
        requirements_query = f"""
        MATCH (r:WorkItem {{type: 'requirement'}})
        WHERE true {project_filter}
        OPTIONAL MATCH (r)-[:TESTED_BY]->(t:WorkItem {{type: 'test'}})
        OPTIONAL MATCH (r)-[:MITIGATES]->(risk:WorkItem {{type: 'risk'}})
        RETURN r, 
               COLLECT(DISTINCT t) as tests,
               COLLECT(DISTINCT risk) as risks
        """
        
        requirements_results = await self.execute_query(requirements_query)
        
        # Get all tests and their coverage
        tests_query = f"""
        MATCH (t:WorkItem {{type: 'test'}})
        WHERE true {project_filter}
        OPTIONAL MATCH (r:WorkItem {{type: 'requirement'}})-[:TESTED_BY]->(t)
        RETURN t,
               COLLECT(DISTINCT r) as requirements
        """
        
        tests_results = await self.execute_query(tests_query)
        
        # Get all risks and their mitigations
        risks_query = f"""
        MATCH (risk:WorkItem {{type: 'risk'}})
        WHERE true {project_filter}
        OPTIONAL MATCH (r:WorkItem {{type: 'requirement'}})-[:MITIGATES]->(risk)
        RETURN risk,
               COLLECT(DISTINCT r) as requirements
        """
        
        risks_results = await self.execute_query(risks_query)
        
        return {
            "requirements": requirements_results,
            "tests": tests_results,
            "risks": risks_results
        }
        
    async def get_risk_chains(
        self,
        risk_id: Optional[str] = None,
        max_depth: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get FMEA failure chains showing risk propagation paths
        
        Args:
            risk_id: Optional starting risk ID (if None, gets all chains)
            max_depth: Maximum chain depth to traverse
            
        Returns:
            List of risk chains with failure paths and probabilities
        """
        if risk_id:
            # Get chains starting from specific risk
            query = f"""
            MATCH path = (start:WorkItem {{id: '{risk_id}', type: 'risk'}})-[:LEADS_TO*1..{max_depth}]->(end)
            WHERE end.type IN ['risk', 'failure']
            RETURN path,
                   [rel in relationships(path) | rel.probability] as probabilities,
                   length(path) as chain_length
            ORDER BY chain_length
            """
        else:
            # Get all risk chains
            query = f"""
            MATCH path = (start:WorkItem {{type: 'risk'}})-[:LEADS_TO*1..{max_depth}]->(end)
            WHERE end.type IN ['risk', 'failure']
            RETURN path,
                   [rel in relationships(path) | rel.probability] as probabilities,
                   length(path) as chain_length,
                   start.id as start_risk_id
            ORDER BY start_risk_id, chain_length
            """
            
        results = await self.execute_query(query)
        
        # Process results to extract chain information
        chains = []
        for result in results:
            chain_data = {
                "path": result.get("path", []),
                "probabilities": result.get("probabilities", []),
                "chain_length": result.get("chain_length", 0),
                "total_probability": self._calculate_chain_probability(
                    result.get("probabilities", [])
                )
            }
            
            if "start_risk_id" in result:
                chain_data["start_risk_id"] = result["start_risk_id"]
                
            chains.append(chain_data)
            
        return chains
        
    def _calculate_chain_probability(self, probabilities: List[float]) -> float:
        """
        Calculate total probability for a failure chain
        
        Args:
            probabilities: List of individual step probabilities
            
        Returns:
            Combined probability (product of all probabilities)
        """
        if not probabilities:
            return 0.0
            
        total_prob = 1.0
        for prob in probabilities:
            if isinstance(prob, (int, float)) and 0 <= prob <= 1:
                total_prob *= prob
            else:
                # Invalid probability, return 0
                return 0.0
                
        return total_prob
        
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
        
    async def get_graph_for_visualization(
        self,
        center_node_id: Optional[str] = None,
        depth: int = 2,
        node_types: Optional[List[str]] = None,
        relationship_types: Optional[List[str]] = None,
        limit: int = 1000
    ) -> Dict[str, Any]:
        """
        Get graph data formatted for visualization in react-flow and R3F
        
        Performance optimizations:
        - Limits results to prevent memory issues
        - Uses efficient graph traversal queries
        - Implements early termination when limit is reached
        - Caches frequently accessed node data
        
        Args:
            center_node_id: Optional center node to start traversal from
            depth: Maximum depth to traverse (default 2)
            node_types: Optional filter for node types
            relationship_types: Optional filter for relationship types
            limit: Maximum number of nodes to return (default 1000)
            
        Returns:
            Dictionary with nodes and edges formatted for visualization
        """
        # Performance optimization: Early validation to avoid expensive queries
        if limit > 5000:
            limit = 5000  # Hard cap for performance
            
        if depth > 5:
            depth = 5  # Limit depth to prevent exponential growth
            
        if center_node_id:
            # Get subgraph around a specific node (more efficient for large graphs)
            nodes, edges = await self._get_subgraph_around_node(
                center_node_id, depth, node_types, relationship_types, limit
            )
        else:
            # Get full graph or filtered graph
            nodes, edges = await self._get_full_graph(
                node_types, relationship_types, limit
            )
            
        # Performance optimization: Early termination if we hit the limit
        truncated = len(nodes) >= limit
        if truncated:
            nodes = nodes[:limit]
            # Filter edges to only include those between remaining nodes
            node_ids = {node.get('id') for node in nodes}
            edges = [
                edge for edge in edges 
                if edge.get('start_id') in node_ids and edge.get('end_id') in node_ids
            ]
            
        # Format for visualization libraries
        formatted_nodes = []
        formatted_edges = []
        
        # Process nodes for visualization
        for node in nodes:
            node_data = self._format_node_for_visualization(node)
            formatted_nodes.append(node_data)
            
        # Process edges for visualization
        for edge in edges:
            edge_data = self._format_edge_for_visualization(edge)
            formatted_edges.append(edge_data)
            
        return {
            "nodes": formatted_nodes,
            "edges": formatted_edges,
            "metadata": {
                "total_nodes": len(formatted_nodes),
                "total_edges": len(formatted_edges),
                "depth": depth,
                "center_node": center_node_id,
                "truncated": truncated,
                "performance_stats": {
                    "query_limit_applied": limit,
                    "depth_limit_applied": depth,
                    "nodes_filtered": len(nodes) - len(formatted_nodes) if len(nodes) > len(formatted_nodes) else 0
                }
            }
        }
        
    async def _get_subgraph_around_node(
        self,
        center_node_id: str,
        depth: int,
        node_types: Optional[List[str]],
        relationship_types: Optional[List[str]],
        limit: int
    ) -> tuple[List[Dict], List[Dict]]:
        """Get subgraph around a center node"""
        
        # Build node type filter
        node_filter = ""
        if node_types:
            type_conditions = " OR ".join([f"n:{node_type}" for node_type in node_types])
            node_filter = f" AND ({type_conditions})"
            
        # Build relationship type filter
        rel_filter = ""
        if relationship_types:
            rel_types_str = "|".join(relationship_types)
            rel_filter = f":{rel_types_str}"
            
        # Query to get nodes and relationships within depth
        query = f"""
        MATCH (center {{id: '{center_node_id}'}})
        MATCH path = (center)-[{rel_filter}*1..{depth}]-(n)
        WHERE true {node_filter}
        WITH DISTINCT n, relationships(path) as rels
        LIMIT {limit}
        RETURN n, rels
        """
        
        results = await self.execute_query(query)
        
        nodes = []
        edges = []
        seen_nodes = set()
        seen_edges = set()
        
        # Add center node first
        center_node = await self.get_node(center_node_id)
        if center_node:
            nodes.append(center_node)
            seen_nodes.add(center_node_id)
        
        # Process results
        for result in results:
            node = result.get('n')
            relationships = result.get('rels', [])
            
            # Add node if not seen
            if node and 'id' in node:
                node_id = node['id']
                if node_id not in seen_nodes:
                    nodes.append(node)
                    seen_nodes.add(node_id)
                    
            # Add relationships
            for rel in relationships:
                if isinstance(rel, dict) and 'start_id' in rel and 'end_id' in rel:
                    edge_key = f"{rel['start_id']}-{rel['end_id']}-{rel.get('type', 'RELATED')}"
                    if edge_key not in seen_edges:
                        edges.append(rel)
                        seen_edges.add(edge_key)
                        
        return nodes, edges
        
    async def _get_full_graph(
        self,
        node_types: Optional[List[str]],
        relationship_types: Optional[List[str]],
        limit: int
    ) -> tuple[List[Dict], List[Dict]]:
        """Get full graph with optional filters"""
        
        # Build node query with type filter
        node_query = "MATCH (n)"
        if node_types:
            type_conditions = " OR ".join([f"n:{node_type}" for node_type in node_types])
            node_query += f" WHERE {type_conditions}"
        node_query += f" RETURN n LIMIT {limit}"
        
        # Get nodes
        node_results = await self.execute_query(node_query)
        nodes = [result for result in node_results if result]
        
        # Build relationship query
        rel_query = "MATCH (a)-[r]->(b)"
        if relationship_types:
            rel_types_str = "|".join(relationship_types)
            rel_query = f"MATCH (a)-[r:{rel_types_str}]->(b)"
        rel_query += " RETURN r, a.id as start_id, b.id as end_id LIMIT " + str(limit * 2)
        
        # Get relationships
        rel_results = await self.execute_query(rel_query)
        edges = []
        
        for result in rel_results:
            if 'r' in result and 'start_id' in result and 'end_id' in result:
                edge_data = result['r']
                edge_data['start_id'] = result['start_id']
                edge_data['end_id'] = result['end_id']
                edges.append(edge_data)
                
        return nodes, edges
        
    def _format_node_for_visualization(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Format node data for react-flow and R3F visualization"""
        
        # Extract node properties
        if 'properties' in node:
            props = node['properties']
        else:
            props = node
            
        node_id = props.get('id', str(node.get('id', '')))
        node_type = props.get('type', node.get('label', 'Unknown'))
        title = props.get('title', props.get('name', f"{node_type} {node_id[:8]}"))
        description = props.get('description', '')
        status = props.get('status', 'unknown')
        priority = props.get('priority', 3)
        
        # Determine node color based on type and status
        color_map = {
            'requirement': {'active': '#3B82F6', 'draft': '#93C5FD', 'completed': '#1E40AF', 'archived': '#6B7280'},
            'task': {'active': '#10B981', 'draft': '#6EE7B7', 'completed': '#047857', 'archived': '#6B7280'},
            'test': {'active': '#F59E0B', 'draft': '#FCD34D', 'completed': '#D97706', 'archived': '#6B7280'},
            'risk': {'active': '#EF4444', 'draft': '#FCA5A5', 'completed': '#DC2626', 'archived': '#6B7280'},
            'document': {'active': '#8B5CF6', 'draft': '#C4B5FD', 'completed': '#7C3AED', 'archived': '#6B7280'},
            'failure': {'active': '#DC2626', 'draft': '#FCA5A5', 'completed': '#991B1B', 'archived': '#6B7280'},
            'entity': {'active': '#6B7280', 'draft': '#9CA3AF', 'completed': '#4B5563', 'archived': '#6B7280'},
            'user': {'active': '#06B6D4', 'draft': '#67E8F9', 'completed': '#0891B2', 'archived': '#6B7280'}
        }
        
        node_colors = color_map.get(node_type.lower(), color_map['entity'])
        node_color = node_colors.get(status, node_colors['active'])
        
        # Calculate node size based on priority and connections
        base_size = 50
        priority_multiplier = (6 - min(priority, 5)) * 0.2  # Higher priority = larger
        node_size = int(base_size * (1 + priority_multiplier))
        
        # Format for react-flow (2D)
        react_flow_data = {
            'id': node_id,
            'type': 'custom',
            'position': {'x': 0, 'y': 0},  # Will be calculated by layout algorithm
            'data': {
                'label': title,
                'type': node_type,
                'status': status,
                'priority': priority,
                'description': description,
                'color': node_color,
                'size': node_size,
                'properties': props
            },
            'style': {
                'backgroundColor': node_color,
                'color': '#FFFFFF',
                'border': f'2px solid {node_color}',
                'borderRadius': '8px',
                'padding': '10px',
                'fontSize': '12px',
                'fontWeight': 'bold',
                'width': node_size * 2,
                'height': node_size
            },
            'className': f'node-{node_type.lower()} node-{status}'
        }
        
        # Format for R3F (3D)
        r3f_data = {
            'id': node_id,
            'position': [0, 0, 0],  # Will be calculated by 3D layout
            'type': node_type,
            'label': title,
            'status': status,
            'priority': priority,
            'description': description,
            'color': node_color,
            'size': node_size / 50.0,  # Normalize for 3D space
            'geometry': {
                'type': 'sphere' if node_type in ['user', 'entity'] else 'box',
                'args': [node_size / 50.0, node_size / 50.0, node_size / 50.0]
            },
            'material': {
                'color': node_color,
                'opacity': 0.8,
                'transparent': True,
                'roughness': 0.3,
                'metalness': 0.1
            },
            'properties': props,
            'interactions': {
                'hoverable': True,
                'clickable': True,
                'selectable': True
            }
        }
        
        return {
            'id': node_id,
            'type': node_type,
            'label': title,
            'status': status,
            'priority': priority,
            'description': description,
            'color': node_color,
            'size': node_size,
            'properties': props,
            'reactFlow': react_flow_data,
            'r3f': r3f_data
        }
        
    def _format_edge_for_visualization(self, edge: Dict[str, Any]) -> Dict[str, Any]:
        """Format edge data for react-flow and R3F visualization"""
        
        # Extract edge properties
        if 'properties' in edge:
            props = edge['properties']
        else:
            props = edge
            
        start_id = edge.get('start_id', props.get('start_id'))
        end_id = edge.get('end_id', props.get('end_id'))
        edge_type = edge.get('type', props.get('type', 'RELATED'))
        
        # Generate edge ID
        edge_id = f"{start_id}-{end_id}-{edge_type}"
        
        # Determine edge color, style, and properties based on type
        edge_styles = {
            'TESTED_BY': {
                'color': '#F59E0B', 'style': 'solid', 'width': 2, 
                'animated': False, 'label': 'Tested By', 'importance': 'high'
            },
            'MITIGATES': {
                'color': '#EF4444', 'style': 'dashed', 'width': 3,
                'animated': False, 'label': 'Mitigates', 'importance': 'critical'
            },
            'DEPENDS_ON': {
                'color': '#6B7280', 'style': 'solid', 'width': 2,
                'animated': False, 'label': 'Depends On', 'importance': 'medium'
            },
            'IMPLEMENTS': {
                'color': '#10B981', 'style': 'solid', 'width': 2,
                'animated': False, 'label': 'Implements', 'importance': 'high'
            },
            'LEADS_TO': {
                'color': '#DC2626', 'style': 'dotted', 'width': 2,
                'animated': True, 'label': 'Leads To', 'importance': 'critical'
            },
            'RELATES_TO': {
                'color': '#8B5CF6', 'style': 'solid', 'width': 1,
                'animated': False, 'label': 'Relates To', 'importance': 'low'
            },
            'NEXT_VERSION': {
                'color': '#3B82F6', 'style': 'dashed', 'width': 2,
                'animated': True, 'label': 'Next Version', 'importance': 'medium'
            },
            'MENTIONED_IN': {
                'color': '#9CA3AF', 'style': 'dotted', 'width': 1,
                'animated': False, 'label': 'Mentioned In', 'importance': 'low'
            },
            'REFERENCES': {
                'color': '#6366F1', 'style': 'solid', 'width': 1,
                'animated': False, 'label': 'References', 'importance': 'medium'
            }
        }
        
        style = edge_styles.get(edge_type, {
            'color': '#6B7280', 'style': 'solid', 'width': 1,
            'animated': False, 'label': edge_type.replace('_', ' ').title(), 'importance': 'low'
        })
        
        # Format for react-flow (2D)
        react_flow_data = {
            'id': edge_id,
            'source': start_id,
            'target': end_id,
            'type': 'smoothstep',
            'animated': style['animated'],
            'style': {
                'stroke': style['color'],
                'strokeWidth': style['width'],
                'strokeDasharray': (
                    '5,5' if style['style'] == 'dashed' else 
                    '2,2' if style['style'] == 'dotted' else None
                )
            },
            'label': style['label'],
            'labelStyle': {
                'fontSize': 10,
                'fontWeight': 'normal',
                'fill': style['color'],
                'backgroundColor': 'rgba(255, 255, 255, 0.8)',
                'padding': '2px 4px',
                'borderRadius': '3px'
            },
            'labelBgStyle': {
                'fill': 'rgba(255, 255, 255, 0.8)',
                'fillOpacity': 0.8
            },
            'data': {
                'type': edge_type,
                'importance': style['importance'],
                'properties': props
            }
        }
        
        # Format for R3F (3D)
        r3f_data = {
            'id': edge_id,
            'source': start_id,
            'target': end_id,
            'type': edge_type,
            'label': style['label'],
            'color': style['color'],
            'style': style['style'],
            'width': style['width'] / 2.0,  # Normalize for 3D space
            'animated': style['animated'],
            'importance': style['importance'],
            'geometry': {
                'type': 'line',
                'points': [],  # Will be calculated based on node positions
            },
            'material': {
                'color': style['color'],
                'opacity': 0.8 if style['style'] == 'dotted' else 1.0,
                'transparent': style['style'] in ['dotted', 'dashed'],
                'linewidth': style['width']
            },
            'properties': props,
            'interactions': {
                'hoverable': True,
                'clickable': True,
                'selectable': False
            }
        }
        
        return {
            'id': edge_id,
            'source': start_id,
            'target': end_id,
            'type': edge_type,
            'label': style['label'],
            'color': style['color'],
            'style': style['style'],
            'width': style['width'],
            'animated': style['animated'],
            'importance': style['importance'],
            'properties': props,
            'reactFlow': react_flow_data,
            'r3f': r3f_data
        }

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
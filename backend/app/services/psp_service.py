from typing import Any
from app.db.graph import GraphService

class PSPService:
    """
    Service for Project Structure Plan (PSP) operations.
    Handles aggregating phases, departments, and workpackages into a matrix view.
    """

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    async def get_matrix_data(self) -> dict[str, list[dict[str, Any]]]:
        """
        Retrieves the complete data set for the PSP Matrix View.
        This includes all strictly topologically ordered Phases (via NEXT),
        all Departments, and all Workpackages belonging to those elements.
        """
        
        query = """
        // 1. Get all Phases and try to sort them topologically using the NEXT relationship
        // We match to find the root phase (no incoming NEXT) and traverse down
        OPTIONAL MATCH (root:phase)
        WHERE NOT ()-[:NEXT]->(root)
        
        // Find path from root to all connected phases or just single isolated phases
        OPTIONAL MATCH path = (root)-[:NEXT*0..]->(p:phase)
        WITH DISTINCT p
        ORDER BY length(path) ASC, p.created_at ASC
        // If there's no NEXT chain at all, it will just fallback to created_at
        
        // Collect phases into a list
        WITH collect({
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status
        }) as phases
        
        // 2. Get all Departments
        OPTIONAL MATCH (d:department)
        WITH phases, d
        ORDER BY d.name ASC
        WITH phases, collect({
            id: d.id,
            name: d.name,
            description: d.description
        }) as departments
        
        // 3. Get all Workpackages with their linked phase and department
        OPTIONAL MATCH (wp:workpackage)
        OPTIONAL MATCH (wp)-[:BELONGS_TO]->(p_linked:phase)
        OPTIONAL MATCH (wp)-[:LINKED_TO_DEPARTMENT]->(d_linked:department)
        WITH phases, departments, {
            id: wp.id,
            name: wp.name,
            status: wp.status,
            phase_id: p_linked.id,
            department_id: d_linked.id
        } as wp_data
        
        // Return final aggregated object
        RETURN phases, departments, collect(wp_data) as workpackages
        """
        
        results = await self.graph_service.execute_query(query)
        
        if not results:
            return {
                "phases": [],
                "departments": [],
                "workpackages": []
            }
            
        row = results[0]
        
        # Filter out empty dicts that might result from OPTIONAL MATCH aggregations
        phases = [p for p in row.get("phases", []) if p.get("id")]
        departments = [d for d in row.get("departments", []) if d.get("id")]
        
        # Filter workpackages to ensure valid IDs and remove nulls created from optional matches
        workpackages = []
        for wp in row.get("workpackages", []):
             if wp.get("id"):
                 # Make sure null values are strictly None as pydantic expects
                 wp["phase_id"] = wp.get("phase_id")
                 wp["department_id"] = wp.get("department_id")
                 workpackages.append(wp)
                 
        return {
            "phases": phases,
            "departments": departments,
            "workpackages": workpackages
        }

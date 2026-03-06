import logging
from typing import Any

from app.db.graph import GraphService

logger = logging.getLogger(__name__)


class PSPService:
    """
    Service for Project Structure Plan (PSP) operations.
    Handles aggregating phases, departments, and workpackages into a matrix view.
    """

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    async def get_matrix_data(self) -> dict[str, list[dict[str, Any]]]:
        """
        Retrieves the complete data set for the PSP Matrix View using a single
        efficient query with relationship traversal.
        
        This query uses ONLY relationships (NEXT, BELONGS_TO, LINKED_TO_DEPARTMENT)
        and does NOT rely on foreign key properties stored on nodes.

        Returns:
            Dictionary with phases (ordered by NEXT), departments (alphabetical),
            and workpackages with their phase_id and department_id derived from relationships
        """

        try:
            logger.info("Executing PSP matrix query with relationship traversal")

            # Single efficient query that gets everything with relationships
            matrix_query = """
            MATCH (p:Phase)
            OPTIONAL MATCH (p)<-[:NEXT]-(prev:Phase)
            WITH p, prev
            ORDER BY p.created_at ASC
            WITH collect({
                id: p.id,
                name: p.name,
                description: p.description,
                status: p.status,
                created_at: p.created_at,
                updated_at: p.updated_at,
                has_prev: prev IS NOT NULL
            }) as phases
            
            MATCH (d:Department)
            WITH phases, d
            ORDER BY d.name ASC
            WITH phases, collect({
                id: d.id,
                name: d.name,
                description: d.description,
                manager_user_id: d.manager_user_id,
                created_at: d.created_at,
                updated_at: d.updated_at
            }) as departments
            
            MATCH (wp:Workpackage)
            OPTIONAL MATCH (wp)-[:BELONGS_TO]->(p_linked:Phase)
            OPTIONAL MATCH (wp)-[:LINKED_TO_DEPARTMENT]->(d_linked:Department)
            WITH phases, departments, wp, p_linked, d_linked
            ORDER BY wp.order ASC, wp.created_at ASC
            WITH phases, departments, collect({
                id: wp.id,
                name: wp.name,
                description: wp.description,
                status: wp.status,
                order: wp.order,
                estimated_hours: wp.estimated_hours,
                actual_hours: wp.actual_hours,
                phase_id: p_linked.id,
                department_id: d_linked.id,
                created_at: wp.created_at,
                updated_at: wp.updated_at
            }) as workpackages
            
            RETURN phases, departments, workpackages
            """

            results = await self.graph_service.execute_query(matrix_query)

            # Handle empty results
            if not results:
                logger.info("No data returned from matrix query")
                return {
                    "phases": [],
                    "departments": [],
                    "workpackages": [],
                }

            row = results[0]

            # Extract data from result
            phases_raw = row.get("phases", [])
            departments_raw = row.get("departments", [])
            workpackages_raw = row.get("workpackages", [])

            # Filter out null entries where id is None (from OPTIONAL MATCH)
            phases = [p for p in phases_raw if p and p.get("id") is not None]
            departments = [d for d in departments_raw if d and d.get("id") is not None]

            # Filter workpackages and ensure null foreign keys are explicitly None
            workpackages = []
            for wp in workpackages_raw:
                if wp and wp.get("id") is not None:
                    # Ensure null foreign keys are explicitly None (not missing)
                    wp["phase_id"] = wp.get("phase_id") or None
                    wp["department_id"] = wp.get("department_id") or None
                    workpackages.append(wp)

            logger.info(
                f"PSP matrix data retrieved successfully: "
                f"{len(phases)} phases, {len(departments)} departments, "
                f"{len(workpackages)} workpackages"
            )

            # Log warning if data is empty
            if len(phases) == 0:
                logger.warning("No phases found in database")
            if len(departments) == 0:
                logger.warning("No departments found in database")
            if len(workpackages) == 0:
                logger.warning("No workpackages found in database")

            return {
                "phases": phases,
                "departments": departments,
                "workpackages": workpackages,
            }

        except Exception as e:
            logger.exception(f"Error retrieving PSP matrix data: {e}")
            raise

    async def get_ordered_phases(self) -> list[dict[str, Any]]:
        """
        Retrieves phases ordered by NEXT relationships.

        Returns:
            List of phases with order field based on NEXT chain traversal
        """
        try:
            logger.info("Retrieving ordered phases")

            # The matrix query already handles phase ordering
            matrix_data = await self.get_matrix_data()
            phases = matrix_data.get("phases", [])

            logger.info(f"Retrieved {len(phases)} ordered phases")
            return phases

        except Exception as e:
            logger.exception(f"Error retrieving ordered phases: {e}")
            raise

    async def get_departments(self) -> list[dict[str, Any]]:
        """
        Retrieves all departments in alphabetical order.

        Returns:
            List of departments ordered alphabetically by name
        """
        try:
            logger.info("Retrieving departments")

            # The matrix query already handles department ordering
            matrix_data = await self.get_matrix_data()
            departments = matrix_data.get("departments", [])

            logger.info(f"Retrieved {len(departments)} departments")
            return departments

        except Exception as e:
            logger.exception(f"Error retrieving departments: {e}")
            raise

    async def get_workpackages(
        self,
        phase_id: str | None = None,
        department_id: str | None = None,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Retrieves workpackages with optional filters.

        Args:
            phase_id: Optional phase ID filter
            department_id: Optional department ID filter
            status: Optional status filter

        Returns:
            List of workpackages matching the filters
        """
        try:
            logger.info(
                f"Retrieving workpackages with filters: "
                f"phase_id={phase_id}, department_id={department_id}, status={status}"
            )

            # Get all workpackages from matrix
            matrix_data = await self.get_matrix_data()
            workpackages = matrix_data.get("workpackages", [])

            # Apply filters
            filtered = workpackages

            if phase_id:
                filtered = [wp for wp in filtered if wp.get("phase_id") == phase_id]

            if department_id:
                filtered = [
                    wp for wp in filtered if wp.get("department_id") == department_id
                ]

            if status:
                filtered = [wp for wp in filtered if wp.get("status") == status]

            logger.info(f"Retrieved {len(filtered)} workpackages after filtering")
            return filtered

        except Exception as e:
            logger.exception(f"Error retrieving workpackages: {e}")
            raise

    async def get_statistics(self) -> dict[str, Any]:
        """
        Computes PSP matrix statistics.

        Returns:
            PSPStatistics with counts, coverage, and status breakdown
        """
        try:
            logger.info("Computing PSP statistics")

            matrix_data = await self.get_matrix_data()
            phases = matrix_data.get("phases", [])
            departments = matrix_data.get("departments", [])
            workpackages = matrix_data.get("workpackages", [])

            # Count workpackages by status
            workpackages_by_status = {
                "draft": 0,
                "active": 0,
                "completed": 0,
                "archived": 0,
            }

            for wp in workpackages:
                status = wp.get("status", "draft")
                if status in workpackages_by_status:
                    workpackages_by_status[status] += 1

            # Calculate coverage
            total_cells = len(phases) * len(departments)

            if total_cells > 0:
                # Count unique phase-department combinations with workpackages
                cells_with_workpackages = set()
                for wp in workpackages:
                    phase_id = wp.get("phase_id")
                    dept_id = wp.get("department_id")
                    if phase_id and dept_id:
                        cells_with_workpackages.add((phase_id, dept_id))

                coverage_percentage = len(cells_with_workpackages) / total_cells * 100
                avg_workpackages_per_cell = len(workpackages) / total_cells
            else:
                coverage_percentage = 0.0
                avg_workpackages_per_cell = 0.0

            statistics = {
                "total_phases": len(phases),
                "total_departments": len(departments),
                "total_workpackages": len(workpackages),
                "workpackages_by_status": workpackages_by_status,
                "coverage_percentage": round(coverage_percentage, 2),
                "avg_workpackages_per_cell": round(avg_workpackages_per_cell, 2),
            }

            logger.info(f"Computed PSP statistics: {statistics}")
            return statistics

        except Exception as e:
            logger.exception(f"Error computing PSP statistics: {e}")
            raise

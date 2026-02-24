from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.api import deps
from app.db.graph import GraphService
from app.services.psp_service import PSPService
from app.schemas.psp import PSPMatrixResponse

router = APIRouter()

@router.get("/matrix", response_model=PSPMatrixResponse)
async def get_psp_matrix(
    current_user: dict[str, Any] = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Retrieve the Project Structure Plan (PSP) Matrix.
    Returns structurally ordered Phases, Departments, and Workpackages mapping to the intersections.
    """
    graph_service = GraphService(db)
    psp_service = PSPService(graph_service)

    matrix_data = await psp_service.get_matrix_data()
    return matrix_data

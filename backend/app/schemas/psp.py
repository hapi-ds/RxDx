from pydantic import BaseModel, ConfigDict
from enum import Enum

class MatrixPhaseResponse(BaseModel):
    """Phase representation for the matrix columns."""
    id: str
    name: str
    description: str | None = None
    status: str
    
    model_config = ConfigDict(from_attributes=True)

class MatrixDepartmentResponse(BaseModel):
    """Department representation for the matrix rows."""
    id: str
    name: str
    description: str | None = None
    
    model_config = ConfigDict(from_attributes=True)

class MatrixWorkpackageResponse(BaseModel):
    """Workpackage representation for the matrix cells."""
    id: str
    name: str
    status: str
    phase_id: str | None = None
    department_id: str | None = None
    
    model_config = ConfigDict(from_attributes=True)

class PSPMatrixResponse(BaseModel):
    """Full payload containing dimensions and facts for the PSP Matrix."""
    phases: list[MatrixPhaseResponse]
    departments: list[MatrixDepartmentResponse]
    workpackages: list[MatrixWorkpackageResponse]
    
    model_config = ConfigDict(from_attributes=True)

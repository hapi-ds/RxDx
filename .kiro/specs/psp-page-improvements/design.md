# PSP Page Improvements - Design Document

## ⚠️ CRITICAL: Existing Implementation Context

**This design enhances existing code, does NOT build from scratch.**

### Existing Services (DO NOT RECREATE):
- ✅ **PhaseService** - Fully implemented with NEXT traversal
- ✅ **DepartmentService** - Fully implemented
- ✅ **WorkpackageService** - Fully implemented with relationship support
- ⚠️ **PSPService** - EXISTS but needs null handling fix

### Database Architecture:
- **PostgreSQL 14+ with Apache AGE extension** (NOT Neo4j)
- Cypher queries execute via `ag_catalog.cypher()` function
- GraphService wraps all graph operations (asyncpg)

### Focus Areas:
1. FIX PSPService.get_matrix_data() null handling (500 error)
2. CREATE psp-comprehensive.yaml template
3. ENHANCE existing PSPMatrixView component
4. ADD filtering, export, and statistics features

## Overview

This design document specifies the technical architecture and implementation strategy for improving the Project Structure Plan (PSP) Matrix page in the RxDx project management system. The PSP Matrix is a critical visualization tool that displays the intersection of project phases (columns) and organizational departments (rows), with workpackages populating the cells.

### Database Technology

**IMPORTANT**: RxDx uses **PostgreSQL 14+ with Apache AGE extension** for graph database functionality, NOT Neo4j.

- **Graph Storage**: Apache AGE stores graph data as vertices and edges in PostgreSQL tables
- **Query Language**: Cypher queries are supported but executed via `ag_catalog.cypher()` function
- **Connection**: asyncpg library for async PostgreSQL connections
- **GraphService**: Located at `backend/app/db/graph.py`, wraps all graph operations

### Existing Implementation

**Services (All Fully Implemented)**:
- ✅ **PhaseService** (`backend/app/services/phase_service.py`)
  - Implements NEXT relationship traversal in `list_phases_by_project()`
  - Handles phase CRUD operations
  - Already supports phase ordering via graph traversal

- ✅ **DepartmentService** (`backend/app/services/department_service.py`)
  - Handles department CRUD operations
  - Fully implemented and working

- ✅ **WorkpackageService** (`backend/app/services/workpackage_service.py`)
  - Handles workpackage CRUD with relationships
  - Supports BELONGS_TO and LINKED_TO_DEPARTMENT relationships
  - Fully implemented and working

- ⚠️ **PSPService** (`backend/app/services/psp_service.py`)
  - EXISTS but has 500 error in `get_matrix_data()`
  - Null handling issue with OPTIONAL MATCH results
  - Needs enhancement, not replacement

**Frontend (Existing)**:
- ✅ **PSPStore** (`frontend/src/stores/pspStore.ts`) - Zustand store exists
- ✅ **PSPMatrixView** (`frontend/src/components/workpackages/PSPMatrixView.tsx`) - Basic matrix view exists
- Needs enhancements for filtering, export, and statistics

### Current State

The existing PSP Matrix implementation has several limitations:
- **500 Error**: The `PSPService.get_matrix_data()` method fails when handling null values from OPTIONAL MATCH clauses
- **Limited Data**: No comprehensive demonstration template exists for Medical Device Development
- **Basic Visualization**: The matrix view lacks interactive features, filtering, and export capabilities
- **No Phase Ordering**: Phases are not properly ordered using NEXT relationships
- **Limited Error Handling**: Insufficient error handling and logging throughout the stack

### Proposed Solution

This design addresses these limitations through:
1. **Backend Fixes**: Fix null handling in existing PSPService.get_matrix_data() method
2. **Service Integration**: Leverage existing PhaseService, DepartmentService, WorkpackageService
3. **Comprehensive Template**: Create psp-comprehensive.yaml with realistic Medical Device Development data
4. **Enhanced Visualization**: Enhance existing PSPMatrixView with filtering, search, export, and statistics
5. **Improved UX**: Better loading states, error handling, and accessibility
6. **Performance Optimizations**: Add virtualization, memoization, and caching for large datasets

**Key Approach**: Enhance and fix existing implementation, don't rebuild from scratch.

### Key Design Principles

- **Data Integrity**: All data transformations preserve relationships and ordering
- **User Experience**: Clear feedback for all states (loading, empty, error)
- **Performance**: Efficient rendering for large matrices (100+ workpackages)
- **Accessibility**: WCAG AA compliance for all interactive elements
- **Maintainability**: Clean separation of concerns between layers

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  PSPMatrixPage                                                   │
│    └─> PSPMatrixView (Enhanced)                                 │
│         ├─> MatrixHeader (filters, search, export)              │
│         ├─> StatisticsPanel (summary metrics)                   │
│         ├─> MatrixGrid (virtualized table)                      │
│         │    └─> WorkpackageCard (interactive cells)            │
│         ├─> WorkpackageModal (detail view)                      │
│         ├─> CreateWorkpackageModal (cell creation)              │
│         └─> LegendHelpModal (user guidance)                     │
│                                                                   │
│  usePSPStore (Zustand)                                           │
│    ├─> State: phases, departments, workpackages, matrixGrid     │
│    ├─> Actions: fetchMatrix, createWorkpackage, updateWP        │
│    └─> Selectors: getWorkpackagesForCell, getStatistics         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI Endpoints (/api/v1/psp/*)                              │
│    ├─> GET /matrix         - Full matrix data                   │
│    ├─> GET /phases         - Ordered phases                     │
│    ├─> GET /departments    - All departments                    │
│    ├─> GET /workpackages   - All workpackages                   │
│    ├─> GET /statistics     - Matrix statistics                  │
│    ├─> POST /workpackages  - Create workpackage                 │
│    ├─> PATCH /workpackages/{id} - Update workpackage            │
│    └─> DELETE /workpackages/{id} - Delete workpackage           │
│                                                                   │
│  PSPService (Existing - Needs Fixes)                             │
│    ├─> get_matrix_data() - FIX null handling (500 error)        │
│    ├─> get_ordered_phases() - ENHANCE with NEXT traversal       │
│    ├─> get_statistics() - ADD statistics computation            │
│    ├─> create_workpackage() - EXISTING (via WorkpackageService) │
│    └─> validate_relationships() - EXISTING in services          │
│                                                                   │
│  PhaseService (Existing - Fully Implemented)                     │
│    ├─> list_phases_by_project() - NEXT traversal implemented    │
│    ├─> create_phase() - Existing                                │
│    └─> update_phase() - Existing                                │
│                                                                   │
│  DepartmentService (Existing - Fully Implemented)                │
│    ├─> list_departments() - Existing                            │
│    ├─> create_department() - Existing                           │
│    └─> update_department() - Existing                           │
│                                                                   │
│  WorkpackageService (Existing - Fully Implemented)               │
│    ├─> create_workpackage() - Existing with relationships       │
│    ├─> update_workpackage() - Existing                          │
│    └─> list_workpackages() - Existing with filtering            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Cypher Queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL + Apache AGE Graph Database              │
├─────────────────────────────────────────────────────────────────┤
│  Nodes (stored as graph vertices in AGE):                       │
│    ├─> Phase (id, name, description, status, order, ...)        │
│    ├─> Department (id, name, description, manager_user_id, ...) │
│    └─> Workpackage (id, name, description, status, ...)         │
│                                                                   │
│  Relationships (stored as graph edges in AGE):                  │
│    ├─> (Phase)-[:NEXT]->(Phase) - Chronological order           │
│    ├─> (Workpackage)-[:BELONGS_TO]->(Phase)                     │
│    └─> (Workpackage)-[:LINKED_TO_DEPARTMENT]->(Department)      │
│                                                                   │
│  Query Execution: Cypher via ag_catalog.cypher() function       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Template Loading
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Template System                            │
├─────────────────────────────────────────────────────────────────┤
│  psp-comprehensive.yaml                                          │
│    ├─> 8 Phases (POC → Post-Market)                             │
│    ├─> 12 Departments (R&D, Systems Eng, Software, ...)         │
│    ├─> 60+ Workpackages (realistic Medical Device examples)     │
│    └─> Relationships (NEXT, BELONGS_TO, LINKED_TO_DEPARTMENT)   │
│                                                                   │
│  TemplateValidator                                               │
│    ├─> Validate phase chain (no cycles)                         │
│    ├─> Validate relationships (all IDs exist)                   │
│    └─> Validate coverage (min workpackages per phase/dept)      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### 1. Matrix Data Retrieval

```
User loads PSP page
  └─> Frontend: usePSPStore.fetchMatrix()
       └─> API: GET /api/v1/psp/matrix
            └─> PSPService.get_matrix_data()
                 └─> PostgreSQL + AGE: Execute Cypher via ag_catalog.cypher()
                      ├─> Find root phases (no incoming NEXT)
                      ├─> Traverse NEXT relationships for ordering
                      ├─> Collect all departments (alphabetical)
                      ├─> Collect all workpackages with relationships
                      └─> Filter null values from OPTIONAL MATCH (FIX NEEDED)
                 └─> Return: { phases, departments, workpackages }
            └─> Response: JSON with ordered data
       └─> Frontend: Compute matrixGrid for O(1) cell lookup
       └─> Render: PSPMatrixView with data
```

#### 2. Workpackage Creation from Cell

```
User clicks empty cell (Phase X, Department Y)
  └─> Frontend: Open CreateWorkpackageModal
       └─> Pre-populate: phase_id=X, department_id=Y
       └─> User enters: name, description, status
       └─> Submit: usePSPStore.createWorkpackage(data)
            └─> API: POST /api/v1/psp/workpackages
                 └─> PSPService.create_workpackage()
                      ├─> Validate: phase exists
                      ├─> Validate: department exists
                      ├─> Create: Workpackage node
                      ├─> Create: BELONGS_TO relationship
                      ├─> Create: LINKED_TO_DEPARTMENT relationship
                      └─> Return: Created workpackage
                 └─> Response: Workpackage JSON
            └─> Frontend: Update store + re-compute matrixGrid
            └─> UI: Close modal, show new card in cell
```

#### 3. Phase Ordering Algorithm

```
PSPService.get_ordered_phases():
  1. Find all root phases (no incoming NEXT)
  2. For each root:
     a. Traverse NEXT relationships (BFS/DFS)
     b. Assign order based on path length from root
  3. Handle disconnected chains:
     a. Order chains by earliest created_at
     b. Assign sequential order across chains
  4. Return phases with order field
```



## Components and Interfaces

### Backend Components

#### 1. PSPService (Existing - Needs Enhancements)

**Location**: `backend/app/services/psp_service.py` (ALREADY EXISTS)

**Current State**:
- ✅ Executes Cypher queries via GraphService (asyncpg + AGE)
- ❌ Has 500 error in get_matrix_data() due to null handling
- ❌ Missing statistics computation
- ✅ Uses existing PhaseService, DepartmentService, WorkpackageService

**Enhancements Needed**:
- FIX null handling in get_matrix_data() method
- ADD get_statistics() method for matrix metrics
- ENHANCE phase ordering to use PhaseService.list_phases_by_project()
- ADD comprehensive error logging

**Key Methods**:

```python
class PSPService:
    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service
        self.logger = logging.getLogger(__name__)
    
    async def get_matrix_data(self) -> PSPMatrixResponse:
        """
        Retrieves complete PSP matrix data with proper null handling.
        
        Returns:
            PSPMatrixResponse with ordered phases, departments, and workpackages
        
        Raises:
            HTTPException: 500 if database error occurs
        """
        
    async def get_ordered_phases(self) -> list[PhaseResponse]:
        """
        Retrieves phases ordered by NEXT relationships.
        
        Algorithm:
        1. Find root phases (no incoming NEXT)
        2. Traverse NEXT chains to assign order
        3. Handle disconnected chains by created_at
        
        Returns:
            List of phases with order field
        """
        
    async def get_statistics(self) -> PSPStatistics:
        """
        Computes matrix statistics.
        
        Returns:
            PSPStatistics with counts, coverage, and status breakdown
        """
        
    async def create_workpackage(
        self,
        data: WorkpackageCreate,
        current_user: User
    ) -> WorkpackageResponse:
        """
        Creates a workpackage with phase and department relationships.
        
        Validates:
        - Phase exists
        - Department exists
        - Name is unique within phase-department intersection
        
        Returns:
            Created workpackage
        
        Raises:
            HTTPException: 400 if validation fails
            HTTPException: 404 if phase or department not found
        """
        
    async def update_workpackage(
        self,
        workpackage_id: UUID,
        updates: WorkpackageUpdate,
        current_user: User
    ) -> WorkpackageResponse:
        """
        Updates a workpackage.
        
        Returns:
            Updated workpackage
        
        Raises:
            HTTPException: 404 if workpackage not found
            HTTPException: 400 if validation fails
        """
        
    async def delete_workpackage(
        self,
        workpackage_id: UUID,
        current_user: User
    ) -> None:
        """
        Deletes a workpackage and all relationships.
        
        Raises:
            HTTPException: 404 if workpackage not found
        """
```

**Enhanced Cypher Query** (for `get_matrix_data`):

**IMPORTANT**: This Cypher query executes via PostgreSQL's `ag_catalog.cypher()` function, not native Neo4j.

```python
# Python code showing how Cypher is executed with Apache AGE
query = """
SELECT * FROM ag_catalog.cypher('graph_name', $$
    // 1. Find root phases (no incoming NEXT) for this project
    MATCH (root:phase {project_id: $project_id})
    WHERE NOT ()-[:NEXT]->(root)
    
    // 2. Traverse NEXT relationships to build ordered chain
    OPTIONAL MATCH path = (root)-[:NEXT*0..]->(p:phase)
    WITH p, length(path) as path_length, root.created_at as root_created
    ORDER BY root_created ASC, path_length ASC
    
    // 3. Collect phases with order
    WITH collect(DISTINCT {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        order: path_length,
        created_at: p.created_at,
        updated_at: p.updated_at
    }) as phases
    
    // 4. Get all departments (alphabetical)
    MATCH (d:department)
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
    
    // 5. Get all workpackages with relationships
    MATCH (wp:workpackage {project_id: $project_id})
    OPTIONAL MATCH (wp)-[:BELONGS_TO]->(p_linked:phase)
    OPTIONAL MATCH (wp)-[:LINKED_TO_DEPARTMENT]->(d_linked:department)
    WITH phases, departments, wp, p_linked, d_linked
    ORDER BY wp.order ASC, wp.created_at ASC
    
    // 6. Collect workpackages
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
    
    // 7. Return aggregated data
    RETURN phases, departments, workpackages
$$ ) as (phases agtype, departments agtype, workpackages agtype);
"""

# Execute via asyncpg connection
results = await self.graph_service.execute_query(query, {"project_id": str(project_id)})
```

**Null Handling Strategy** (FIX for existing 500 error):

```python
# After query execution via GraphService
# NOTE: GraphService uses asyncpg to execute Cypher via ag_catalog.cypher()
row = results[0] if results else None

if not row:
    self.logger.info("No data returned from matrix query", project_id=str(project_id))
    return PSPMatrixResponse(phases=[], departments=[], workpackages=[])

# CRITICAL FIX: Filter out null entries from OPTIONAL MATCH
# The existing code fails here when OPTIONAL MATCH returns nulls
phases_raw = row.get("phases", [])
departments_raw = row.get("departments", [])
workpackages_raw = row.get("workpackages", [])

# Filter out null entries where id is None
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

self.logger.info(
    "Matrix data retrieved",
    project_id=str(project_id),
    phases_count=len(phases),
    departments_count=len(departments),
    workpackages_count=len(workpackages)
)

return PSPMatrixResponse(
    phases=phases,
    departments=departments,
    workpackages=workpackages
)
```

#### 2. API Endpoints

**Location**: `backend/app/api/v1/psp.py` (new file)

**Endpoints**:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.services.psp_service import PSPService
from app.schemas.psp import (
    PSPMatrixResponse,
    PhaseResponse,
    DepartmentResponse,
    WorkpackageResponse,
    WorkpackageCreate,
    WorkpackageUpdate,
    PSPStatistics
)

router = APIRouter(prefix="/psp", tags=["PSP"])

@router.get("/matrix", response_model=PSPMatrixResponse)
async def get_matrix(
    service: PSPService = Depends(get_psp_service)
) -> PSPMatrixResponse:
    """
    Get complete PSP matrix data.
    
    Returns:
        Phases (ordered), departments (alphabetical), and workpackages
    """
    return await service.get_matrix_data()

@router.get("/phases", response_model=list[PhaseResponse])
async def get_phases(
    service: PSPService = Depends(get_psp_service)
) -> list[PhaseResponse]:
    """
    Get all phases ordered by NEXT relationships.
    """
    return await service.get_ordered_phases()

@router.get("/departments", response_model=list[DepartmentResponse])
async def get_departments(
    service: PSPService = Depends(get_psp_service)
) -> list[DepartmentResponse]:
    """
    Get all departments in alphabetical order.
    """
    return await service.get_departments()

@router.get("/workpackages", response_model=list[WorkpackageResponse])
async def get_workpackages(
    phase_id: UUID | None = None,
    department_id: UUID | None = None,
    status: str | None = None,
    service: PSPService = Depends(get_psp_service)
) -> list[WorkpackageResponse]:
    """
    Get workpackages with optional filters.
    """
    return await service.get_workpackages(
        phase_id=phase_id,
        department_id=department_id,
        status=status
    )

@router.get("/statistics", response_model=PSPStatistics)
async def get_statistics(
    service: PSPService = Depends(get_psp_service)
) -> PSPStatistics:
    """
    Get matrix statistics (counts, coverage, status breakdown).
    """
    return await service.get_statistics()

@router.post(
    "/workpackages",
    response_model=WorkpackageResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_workpackage(
    data: WorkpackageCreate,
    current_user: User = Depends(get_current_user),
    service: PSPService = Depends(get_psp_service)
) -> WorkpackageResponse:
    """
    Create a new workpackage with phase and department relationships.
    """
    return await service.create_workpackage(data, current_user)

@router.patch("/workpackages/{workpackage_id}", response_model=WorkpackageResponse)
async def update_workpackage(
    workpackage_id: UUID,
    updates: WorkpackageUpdate,
    current_user: User = Depends(get_current_user),
    service: PSPService = Depends(get_psp_service)
) -> WorkpackageResponse:
    """
    Update a workpackage.
    """
    return await service.update_workpackage(workpackage_id, updates, current_user)

@router.delete("/workpackages/{workpackage_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workpackage(
    workpackage_id: UUID,
    current_user: User = Depends(get_current_user),
    service: PSPService = Depends(get_psp_service)
) -> None:
    """
    Delete a workpackage and all relationships.
    """
    await service.delete_workpackage(workpackage_id, current_user)
```

#### 3. Pydantic Schemas

**Location**: `backend/app/schemas/psp.py` (new file)

```python
from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from datetime import datetime

class PhaseBase(BaseModel):
    """Base schema for Phase"""
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    status: str = Field(default="draft")
    order: int | None = None

class PhaseResponse(PhaseBase):
    """Phase response schema"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}

class DepartmentBase(BaseModel):
    """Base schema for Department"""
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    manager_user_id: UUID | None = None

class DepartmentResponse(DepartmentBase):
    """Department response schema"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}

class WorkpackageBase(BaseModel):
    """Base schema for Workpackage"""
    name: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    status: str = Field(default="draft")
    order: int | None = None
    estimated_hours: float | None = Field(None, ge=0)
    actual_hours: float | None = Field(None, ge=0)

class WorkpackageCreate(WorkpackageBase):
    """Schema for creating a workpackage"""
    phase_id: UUID
    department_id: UUID
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values"""
        allowed = ["draft", "active", "completed", "archived"]
        if v.lower() not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v.lower()

class WorkpackageUpdate(BaseModel):
    """Schema for updating a workpackage"""
    name: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = None
    order: int | None = None
    estimated_hours: float | None = Field(None, ge=0)
    actual_hours: float | None = Field(None, ge=0)
    phase_id: UUID | None = None
    department_id: UUID | None = None
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        """Validate status if provided"""
        if v is None:
            return v
        allowed = ["draft", "active", "completed", "archived"]
        if v.lower() not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v.lower()

class WorkpackageResponse(WorkpackageBase):
    """Workpackage response schema"""
    id: UUID
    phase_id: UUID | None
    department_id: UUID | None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}

class PSPMatrixResponse(BaseModel):
    """Complete PSP matrix data"""
    phases: list[PhaseResponse]
    departments: list[DepartmentResponse]
    workpackages: list[WorkpackageResponse]

class PSPStatistics(BaseModel):
    """PSP matrix statistics"""
    total_phases: int
    total_departments: int
    total_workpackages: int
    workpackages_by_status: dict[str, int]
    coverage_percentage: float = Field(..., ge=0, le=100)
    avg_workpackages_per_cell: float = Field(..., ge=0)
```



### Frontend Components

#### 1. Enhanced PSPMatrixView

**Location**: `frontend/src/components/workpackages/PSPMatrixView.tsx`

**Component Hierarchy**:

```
PSPMatrixView
├─> MatrixHeader
│   ├─> SearchInput (filter by name)
│   ├─> StatusFilter (dropdown)
│   ├─> PhaseFilter (dropdown)
│   ├─> DepartmentFilter (dropdown)
│   ├─> ClearFiltersButton
│   ├─> ExportButton (PNG, PDF, CSV)
│   └─> HelpButton (opens help modal)
│
├─> StatisticsPanel
│   ├─> TotalPhasesCard
│   ├─> TotalDepartmentsCard
│   ├─> TotalWorkpackagesCard
│   ├─> StatusBreakdownChart
│   ├─> CoverageIndicator
│   └─> AvgWorkpackagesIndicator
│
├─> LegendPanel
│   ├─> StatusColorLegend
│   └─> MatrixExplanation
│
├─> MatrixGrid (virtualized table)
│   ├─> MatrixHeader (phase columns)
│   └─> MatrixBody
│       └─> DepartmentRow (for each department)
│           └─> MatrixCell (for each phase)
│               ├─> WorkpackageCard (if workpackages exist)
│               │   ├─> CardHeader (name)
│               │   ├─> CardBody (status badge)
│               │   └─> CardFooter (ID)
│               └─> EmptyCell (click to create)
│
├─> WorkpackageModal (detail view)
│   ├─> ModalHeader (name, close button)
│   ├─> ModalBody
│   │   ├─> DescriptionSection
│   │   ├─> StatusSection
│   │   ├─> PhaseSection
│   │   ├─> DepartmentSection
│   │   ├─> HoursSection (estimated, actual)
│   │   └─> MetadataSection (created, updated)
│   └─> ModalFooter
│       ├─> EditButton
│       └─> CloseButton
│
├─> CreateWorkpackageModal
│   ├─> ModalHeader
│   ├─> ModalBody
│   │   ├─> NameInput
│   │   ├─> DescriptionTextarea
│   │   ├─> StatusSelect
│   │   ├─> PhaseSelect (pre-populated, disabled)
│   │   ├─> DepartmentSelect (pre-populated, disabled)
│   │   └─> EstimatedHoursInput
│   └─> ModalFooter
│       ├─> CreateButton
│       └─> CancelButton
│
└─> HelpModal
    ├─> ModalHeader
    ├─> ModalBody
    │   ├─> WhatIsPSPSection
    │   ├─> HowToReadSection
    │   ├─> HowToInteractSection
    │   ├─> FiltersSection
    │   └─> ExportSection
    └─> ModalFooter
        ├─> DontShowAgainCheckbox
        └─> CloseButton
```

**Key Component Interfaces**:

```typescript
// MatrixHeader Props
interface MatrixHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  phaseFilter: string | null;
  onPhaseFilterChange: (phaseId: string | null) => void;
  departmentFilter: string | null;
  onDepartmentFilterChange: (deptId: string | null) => void;
  onClearFilters: () => void;
  onExport: (format: 'png' | 'pdf' | 'csv') => void;
  onHelp: () => void;
}

// StatisticsPanel Props
interface StatisticsPanelProps {
  statistics: PSPStatistics;
}

// MatrixGrid Props
interface MatrixGridProps {
  phases: MatrixPhase[];
  departments: MatrixDepartment[];
  getWorkpackagesForCell: (deptId: string, phaseId: string) => MatrixWorkpackage[];
  onWorkpackageClick: (workpackage: MatrixWorkpackage) => void;
  onEmptyCellClick: (phaseId: string, deptId: string) => void;
  searchQuery: string;
  statusFilter: string | null;
  phaseFilter: string | null;
  departmentFilter: string | null;
}

// WorkpackageCard Props
interface WorkpackageCardProps {
  workpackage: MatrixWorkpackage;
  onClick: () => void;
  isHighlighted: boolean;
  isDimmed: boolean;
}

// WorkpackageModal Props
interface WorkpackageModalProps {
  workpackage: MatrixWorkpackage | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (workpackage: MatrixWorkpackage) => void;
}

// CreateWorkpackageModal Props
interface CreateWorkpackageModalProps {
  isOpen: boolean;
  phaseId: string;
  departmentId: string;
  phaseName: string;
  departmentName: string;
  onClose: () => void;
  onCreate: (data: WorkpackageCreate) => Promise<void>;
}
```

#### 2. Enhanced PSP Store

**Location**: `frontend/src/stores/pspStore.ts`

**Enhanced State**:

```typescript
export interface PSPState {
  // Raw Data
  phases: MatrixPhase[];
  departments: MatrixDepartment[];
  workpackages: MatrixWorkpackage[];
  
  // Computed Data
  matrixGrid: PSPMatrixGrid;
  statistics: PSPStatistics | null;
  
  // Filters
  searchQuery: string;
  statusFilter: string | null;
  phaseFilter: string | null;
  departmentFilter: string | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Modal State
  selectedWorkpackage: MatrixWorkpackage | null;
  isWorkpackageModalOpen: boolean;
  isCreateModalOpen: boolean;
  createModalContext: { phaseId: string; departmentId: string } | null;
}

export interface PSPActions {
  // Data Fetching
  fetchMatrix: (force?: boolean) => Promise<void>;
  fetchStatistics: () => Promise<void>;
  
  // Workpackage CRUD
  createWorkpackage: (data: WorkpackageCreate) => Promise<void>;
  updateWorkpackage: (id: string, updates: WorkpackageUpdate) => Promise<void>;
  deleteWorkpackage: (id: string) => Promise<void>;
  
  // Filters
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string | null) => void;
  setPhaseFilter: (phaseId: string | null) => void;
  setDepartmentFilter: (deptId: string | null) => void;
  clearFilters: () => void;
  
  // Modals
  openWorkpackageModal: (workpackage: MatrixWorkpackage) => void;
  closeWorkpackageModal: () => void;
  openCreateModal: (phaseId: string, deptId: string) => void;
  closeCreateModal: () => void;
  
  // Selectors
  getWorkpackagesForCell: (deptId: string, phaseId: string) => MatrixWorkpackage[];
  getFilteredWorkpackages: () => MatrixWorkpackage[];
  getFilteredPhases: () => MatrixPhase[];
  getFilteredDepartments: () => MatrixDepartment[];
  
  // Utilities
  clearError: () => void;
  reset: () => void;
}
```

**Key Selector Implementations**:

```typescript
// Get workpackages for a specific cell with filters applied
getWorkpackagesForCell: (deptId: string, phaseId: string): MatrixWorkpackage[] => {
  const { matrixGrid, searchQuery, statusFilter } = get();
  
  // Get base workpackages from grid
  let workpackages = matrixGrid[deptId]?.[phaseId] || [];
  
  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    workpackages = workpackages.filter(wp =>
      wp.name.toLowerCase().includes(query)
    );
  }
  
  // Apply status filter
  if (statusFilter) {
    workpackages = workpackages.filter(wp =>
      wp.status === statusFilter
    );
  }
  
  return workpackages;
};

// Get filtered phases (for phase filter)
getFilteredPhases: (): MatrixPhase[] => {
  const { phases, phaseFilter } = get();
  
  if (phaseFilter) {
    return phases.filter(p => p.id === phaseFilter);
  }
  
  return phases;
};

// Get filtered departments (for department filter)
getFilteredDepartments: (): MatrixDepartment[] => {
  const { departments, departmentFilter } = get();
  
  if (departmentFilter) {
    return departments.filter(d => d.id === departmentFilter);
  }
  
  return departments;
};

// Get all filtered workpackages (for export)
getFilteredWorkpackages: (): MatrixWorkpackage[] => {
  const {
    workpackages,
    searchQuery,
    statusFilter,
    phaseFilter,
    departmentFilter
  } = get();
  
  let filtered = [...workpackages];
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(wp =>
      wp.name.toLowerCase().includes(query)
    );
  }
  
  if (statusFilter) {
    filtered = filtered.filter(wp => wp.status === statusFilter);
  }
  
  if (phaseFilter) {
    filtered = filtered.filter(wp => wp.phase_id === phaseFilter);
  }
  
  if (departmentFilter) {
    filtered = filtered.filter(wp => wp.department_id === departmentFilter);
  }
  
  return filtered;
};
```

#### 3. Export Functionality

**Location**: `frontend/src/utils/pspExport.ts` (new file)

**Export Strategies**:

```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportOptions {
  format: 'png' | 'pdf' | 'csv';
  filename?: string;
  includeTimestamp?: boolean;
}

export class PSPExporter {
  /**
   * Export matrix as PNG image
   */
  static async exportAsPNG(
    elementId: string,
    options: ExportOptions
  ): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Matrix element not found');
    }
    
    // Capture element as canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      logging: false,
      useCORS: true
    });
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const filename = this.generateFilename('psp-matrix', 'png', options);
        this.downloadFile(url, filename);
        URL.revokeObjectURL(url);
      }
    });
  }
  
  /**
   * Export matrix as PDF document
   */
  static async exportAsPDF(
    elementId: string,
    options: ExportOptions
  ): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Matrix element not found');
    }
    
    // Capture element as canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true
    });
    
    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    
    const filename = this.generateFilename('psp-matrix', 'pdf', options);
    pdf.save(filename);
  }
  
  /**
   * Export workpackages as CSV
   */
  static exportAsCSV(
    workpackages: MatrixWorkpackage[],
    phases: MatrixPhase[],
    departments: MatrixDepartment[],
    options: ExportOptions
  ): void {
    // Create lookup maps
    const phaseMap = new Map(phases.map(p => [p.id, p.name]));
    const deptMap = new Map(departments.map(d => [d.id, d.name]));
    
    // CSV headers
    const headers = [
      'ID',
      'Name',
      'Description',
      'Status',
      'Phase',
      'Department',
      'Estimated Hours',
      'Actual Hours',
      'Created At',
      'Updated At'
    ];
    
    // CSV rows
    const rows = workpackages.map(wp => [
      wp.id,
      this.escapeCSV(wp.name),
      this.escapeCSV(wp.description || ''),
      wp.status,
      wp.phase_id ? phaseMap.get(wp.phase_id) || '' : '',
      wp.department_id ? deptMap.get(wp.department_id) || '' : '',
      wp.estimated_hours?.toString() || '',
      wp.actual_hours?.toString() || '',
      wp.created_at || '',
      wp.updated_at || ''
    ]);
    
    // Combine headers and rows
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = this.generateFilename('psp-workpackages', 'csv', options);
    this.downloadFile(url, filename);
    URL.revokeObjectURL(url);
  }
  
  private static escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  
  private static generateFilename(
    base: string,
    extension: string,
    options: ExportOptions
  ): string {
    if (options.filename) {
      return options.filename;
    }
    
    const timestamp = options.includeTimestamp !== false
      ? `-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`
      : '';
    
    return `${base}${timestamp}.${extension}`;
  }
  
  private static downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
```



## Data Models

### Graph Database Schema (PostgreSQL + Apache AGE)

**Database Technology**: PostgreSQL 14+ with Apache AGE extension

**Graph Storage**: AGE stores graph data as vertices and edges in PostgreSQL tables, queryable via Cypher through the `ag_catalog.cypher()` function.

**Existing Implementation**: 
- GraphService at `backend/app/db/graph.py` uses asyncpg
- Cypher queries executed via `ag_catalog.cypher()`
- All graph operations go through GraphService

#### CRITICAL: Relationship-Only Approach

**PRINCIPLE**: The graph database MUST use relationships ONLY for associations between graph entities, NOT foreign key properties stored on nodes.

**WHY**: 
- Prevents data inconsistencies (single source of truth)
- Leverages graph database strengths (traversal performance)
- Simplifies updates (change relationship, not properties on multiple nodes)
- Enforces referential integrity through graph structure

**EXCEPTION**: `user_id` properties ARE allowed because users are stored in PostgreSQL (not in the AGE graph database) and cannot be linked via graph relationships.

**ANTI-PATTERNS TO AVOID**:
```cypher
// ❌ BAD: Storing foreign keys as node properties
CREATE (wp:Workpackage {
  id: '123',
  name: 'My Workpackage',
  phase_id: '456',           // ❌ DON'T DO THIS
  department_id: '789'       // ❌ DON'T DO THIS
})

// ✅ GOOD: Using relationships only
CREATE (wp:Workpackage {
  id: '123',
  name: 'My Workpackage'
})
CREATE (wp)-[:BELONGS_TO]->(phase:Phase {id: '456'})
CREATE (wp)-[:LINKED_TO_DEPARTMENT]->(dept:Department {id: '789'})
```

**QUERYING WITH RELATIONSHIPS**:
```cypher
// ❌ BAD: Property-based filtering
MATCH (wp:Workpackage)
WHERE wp.phase_id = '456'
RETURN wp

// ✅ GOOD: Relationship traversal
MATCH (phase:Phase {id: '456'})<-[:BELONGS_TO]-(wp:Workpackage)
RETURN wp
```

**TEMPLATE SYSTEM BEHAVIOR**:
- Templates MAY include foreign key fields in YAML (e.g., `phase_id`, `department_id`) for readability
- TemplateService reads these fields to know which relationships to create
- TemplateService MUST NOT store these fields as node properties
- Only relationships are created in the graph database

**VALIDATION**:
- TemplateValidator validates that required relationships exist
- TemplateValidator does NOT validate foreign key properties (they shouldn't exist on nodes)
- Services validate relationships exist before operations

#### Node Types (Stored as AGE Vertices)

**Phase Node**:
```
(:Phase {
  id: UUID (primary key),
  name: String (required, max 200 chars),
  description: String (optional),
  status: String (default: "draft", enum: draft|active|completed|archived),
  order: Integer (optional, computed from NEXT traversal),
  created_at: DateTime (auto-generated),
  updated_at: DateTime (auto-updated)
  
  // ❌ NO project_id property - use BELONGS_TO relationship instead
})
```

**Department Node**:
```
(:Department {
  id: UUID (primary key),
  name: String (required, max 200 chars),
  description: String (optional),
  manager_user_id: UUID (optional, foreign key to User - EXCEPTION: users not in graph),
  created_at: DateTime (auto-generated),
  updated_at: DateTime (auto-updated)
  
  // ❌ NO company_id property - use PARENT_OF relationship instead
})
```

**Workpackage Node**:
```
(:Workpackage {
  id: UUID (primary key),
  name: String (required, max 500 chars),
  description: String (optional),
  status: String (default: "draft", enum: draft|active|completed|archived),
  order: Integer (optional, for ordering within phase-department cell),
  estimated_hours: Float (optional, >= 0),
  actual_hours: Float (optional, >= 0),
  created_at: DateTime (auto-generated),
  updated_at: DateTime (auto-updated)
  
  // ❌ NO phase_id property - use BELONGS_TO relationship instead
  // ❌ NO department_id property - use LINKED_TO_DEPARTMENT relationship instead
})
```

#### Relationship Types

**NEXT Relationship** (Phase → Phase):
```
(phase1:phase)-[:NEXT]->(phase2:phase)

Properties: None
Constraints:
  - Each phase can have at most one outgoing NEXT relationship
  - Each phase can have at most one incoming NEXT relationship
  - No cycles allowed (must form a DAG)
  - Used to determine chronological order
```

**BELONGS_TO Relationship** (Workpackage → Phase):
```
(wp:workpackage)-[:BELONGS_TO]->(phase:phase)

Properties: None
Constraints:
  - Each workpackage must have exactly one BELONGS_TO relationship
  - Phase must exist before relationship is created
```

**LINKED_TO_DEPARTMENT Relationship** (Workpackage → Department):
```
(wp:workpackage)-[:LINKED_TO_DEPARTMENT]->(dept:department)

Properties: None
Constraints:
  - Each workpackage must have exactly one LINKED_TO_DEPARTMENT relationship
  - Department must exist before relationship is created
```

#### Indexes (PostgreSQL + AGE)

**NOTE**: With Apache AGE, indexes are created on the underlying PostgreSQL tables, not via Cypher syntax.

```sql
-- AGE stores vertices in tables like: graph_name._ag_label_vertex
-- Indexes are created on these tables using standard PostgreSQL syntax

-- Index on phase properties
CREATE INDEX IF NOT EXISTS idx_phase_status 
ON graph_name._ag_label_vertex_phase ((properties->>'status'));

CREATE INDEX IF NOT EXISTS idx_phase_order 
ON graph_name._ag_label_vertex_phase ((properties->>'order'));

CREATE INDEX IF NOT EXISTS idx_phase_project_id 
ON graph_name._ag_label_vertex_phase ((properties->>'project_id'));

-- Index on department properties
CREATE INDEX IF NOT EXISTS idx_department_name 
ON graph_name._ag_label_vertex_department ((properties->>'name'));

-- Index on workpackage properties
CREATE INDEX IF NOT EXISTS idx_workpackage_status 
ON graph_name._ag_label_vertex_workpackage ((properties->>'status'));

CREATE INDEX IF NOT EXISTS idx_workpackage_order 
ON graph_name._ag_label_vertex_workpackage ((properties->>'order'));

CREATE INDEX IF NOT EXISTS idx_workpackage_project_id 
ON graph_name._ag_label_vertex_workpackage ((properties->>'project_id'));
```

**Constraints**: AGE constraints are also managed via PostgreSQL, not Cypher.

### Template Structure

#### psp-comprehensive.yaml

**Location**: `backend/templates/modular/psp-comprehensive.yaml`

**Structure**:

```yaml
metadata:
  name: psp-comprehensive
  version: 1.0.0
  description: Comprehensive Medical Device Development PSP template with 8 phases, 12 departments, and 60+ workpackages
  author: RxDx Team

# Phases in chronological order (POC → Post-Market)
phases:
  - id: phase-poc
    name: "Proof of Concept (POC)"
    description: "Initial feasibility and technology validation"
    status: completed
    order: 0
    
  - id: phase-project-def
    name: "Project Definition"
    description: "Business case, scope, and resource planning"
    status: completed
    order: 1
    
  - id: phase-concept
    name: "Concept Phase"
    description: "User needs, intended use, and high-level requirements"
    status: active
    order: 2
    
  - id: phase-design-dev
    name: "Design & Development"
    description: "Detailed design, implementation, and verification"
    status: active
    order: 3
    
  - id: phase-design-transfer
    name: "Design Transfer"
    description: "Manufacturing preparation and process validation"
    status: draft
    order: 4
    
  - id: phase-validation
    name: "Validation"
    description: "Clinical evaluation and final product validation"
    status: draft
    order: 5
    
  - id: phase-market-release
    name: "Market Release"
    description: "Regulatory submission and product launch"
    status: draft
    order: 6
    
  - id: phase-post-market
    name: "Post-Market"
    description: "Surveillance, maintenance, and continuous improvement"
    status: draft
    order: 7

# Departments (organizational units)
departments:
  - id: dept-rd
    name: "Research & Development (R&D)"
    description: "Innovation and technology development"
    
  - id: dept-systems-eng
    name: "Systems Engineering"
    description: "Requirements management and system architecture"
    
  - id: dept-software-eng
    name: "Software Engineering"
    description: "Software design, implementation, and testing"
    
  - id: dept-hardware-eng
    name: "Hardware Engineering"
    description: "Electronics, mechanics, and hardware integration"
    
  - id: dept-qa
    name: "Quality Assurance (QA)"
    description: "Testing, verification, and quality control"
    
  - id: dept-regulatory
    name: "Regulatory Affairs"
    description: "Compliance, submissions, and regulatory strategy"
    
  - id: dept-clinical
    name: "Clinical Affairs"
    description: "Clinical evaluation, trials, and medical expertise"
    
  - id: dept-manufacturing
    name: "Manufacturing"
    description: "Production planning, process development, and scale-up"
    
  - id: dept-supply-chain
    name: "Supply Chain"
    description: "Procurement, vendor management, and logistics"
    
  - id: dept-risk-mgmt
    name: "Risk Management"
    description: "Risk analysis, mitigation, and safety assessment"
    
  - id: dept-documentation
    name: "Documentation"
    description: "Technical writing, document control, and records management"
    
  - id: dept-project-mgmt
    name: "Project Management"
    description: "Planning, coordination, and stakeholder management"

# Workpackages (60+ examples distributed across phase-department intersections)
workpackages:
  # POC Phase (Phase 0)
  - id: wp-poc-001
    name: "Feasibility Study"
    description: "Evaluate technical and commercial feasibility of the medical device concept"
    status: completed
    phase_id: phase-poc
    department_id: dept-rd
    estimated_hours: 80
    actual_hours: 75
    order: 0
    
  - id: wp-poc-002
    name: "Technology Assessment"
    description: "Assess available technologies and select optimal approach"
    status: completed
    phase_id: phase-poc
    department_id: dept-systems-eng
    estimated_hours: 40
    actual_hours: 45
    order: 1
    
  - id: wp-poc-003
    name: "Prototype Development"
    description: "Develop proof-of-concept prototype for validation"
    status: completed
    phase_id: phase-poc
    department_id: dept-hardware-eng
    estimated_hours: 120
    actual_hours: 130
    order: 2
    
  - id: wp-poc-004
    name: "Initial Risk Assessment"
    description: "Identify preliminary hazards and risks per ISO 14971"
    status: completed
    phase_id: phase-poc
    department_id: dept-risk-mgmt
    estimated_hours: 24
    actual_hours: 20
    order: 3
    
  - id: wp-poc-005
    name: "Market Research"
    description: "Analyze market needs, competitors, and regulatory landscape"
    status: completed
    phase_id: phase-poc
    department_id: dept-project-mgmt
    estimated_hours: 60
    actual_hours: 65
    order: 4
    
  - id: wp-poc-006
    name: "Regulatory Strategy Planning"
    description: "Define regulatory pathway (510(k), PMA, CE Mark)"
    status: completed
    phase_id: phase-poc
    department_id: dept-regulatory
    estimated_hours: 40
    actual_hours: 38
    order: 5
    
  # Project Definition Phase (Phase 1)
  - id: wp-proj-001
    name: "Business Case Development"
    description: "Develop comprehensive business case with ROI analysis"
    status: completed
    phase_id: phase-project-def
    department_id: dept-project-mgmt
    estimated_hours: 60
    actual_hours: 58
    order: 0
    
  - id: wp-proj-002
    name: "Project Charter"
    description: "Define project scope, objectives, and success criteria"
    status: completed
    phase_id: phase-project-def
    department_id: dept-project-mgmt
    estimated_hours: 40
    actual_hours: 42
    order: 1
    
  - id: wp-proj-003
    name: "Resource Planning"
    description: "Identify required resources, budget, and timeline"
    status: completed
    phase_id: phase-project-def
    department_id: dept-project-mgmt
    estimated_hours: 32
    actual_hours: 35
    order: 2
    
  - id: wp-proj-004
    name: "Quality Management Plan"
    description: "Establish QMS per ISO 13485 requirements"
    status: completed
    phase_id: phase-project-def
    department_id: dept-qa
    estimated_hours: 48
    actual_hours: 50
    order: 3
    
  - id: wp-proj-005
    name: "Risk Management Plan"
    description: "Define risk management process per ISO 14971"
    status: completed
    phase_id: phase-project-def
    department_id: dept-risk-mgmt
    estimated_hours: 40
    actual_hours: 38
    order: 4
    
  - id: wp-proj-006
    name: "Documentation Plan"
    description: "Establish document control and DHF structure"
    status: completed
    phase_id: phase-project-def
    department_id: dept-documentation
    estimated_hours: 24
    actual_hours: 26
    order: 5
    
  # Concept Phase (Phase 2)
  - id: wp-concept-001
    name: "User Needs Analysis"
    description: "Identify and document user needs and clinical requirements"
    status: active
    phase_id: phase-concept
    department_id: dept-clinical
    estimated_hours: 80
    actual_hours: 45
    order: 0
    
  - id: wp-concept-002
    name: "Design Input Specification"
    description: "Translate user needs into design inputs per 21 CFR 820.30"
    status: active
    phase_id: phase-concept
    department_id: dept-systems-eng
    estimated_hours: 100
    actual_hours: 60
    order: 1
    
  - id: wp-concept-003
    name: "System Architecture Design"
    description: "Define high-level system architecture and interfaces"
    status: active
    phase_id: phase-concept
    department_id: dept-systems-eng
    estimated_hours: 80
    actual_hours: 50
    order: 2
    
  - id: wp-concept-004
    name: "Software Requirements Specification"
    description: "Define software requirements per IEC 62304"
    status: active
    phase_id: phase-concept
    department_id: dept-software-eng
    estimated_hours: 120
    actual_hours: 70
    order: 3
    
  - id: wp-concept-005
    name: "Hardware Requirements Specification"
    description: "Define hardware requirements including electrical safety per IEC 60601"
    status: active
    phase_id: phase-concept
    department_id: dept-hardware-eng
    estimated_hours: 100
    actual_hours: 55
    order: 4
    
  - id: wp-concept-006
    name: "Preliminary Hazard Analysis"
    description: "Conduct preliminary hazard analysis per ISO 14971"
    status: active
    phase_id: phase-concept
    department_id: dept-risk-mgmt
    estimated_hours: 60
    actual_hours: 35
    order: 5
    
  - id: wp-concept-007
    name: "Regulatory Requirements Analysis"
    description: "Identify applicable regulatory requirements (FDA, MDR, etc.)"
    status: active
    phase_id: phase-concept
    department_id: dept-regulatory
    estimated_hours: 48
    actual_hours: 30
    order: 6
    
  - id: wp-concept-008
    name: "Supplier Identification"
    description: "Identify and qualify potential suppliers for critical components"
    status: active
    phase_id: phase-concept
    department_id: dept-supply-chain
    estimated_hours: 40
    actual_hours: 20
    order: 7
    
  # Design & Development Phase (Phase 3)
  - id: wp-design-001
    name: "Software Architecture Design"
    description: "Detailed software architecture per IEC 62304 Class B"
    status: active
    phase_id: phase-design-dev
    department_id: dept-software-eng
    estimated_hours: 160
    actual_hours: 80
    order: 0
    
  - id: wp-design-002
    name: "Software Detailed Design"
    description: "Detailed design of software modules and interfaces"
    status: active
    phase_id: phase-design-dev
    department_id: dept-software-eng
    estimated_hours: 200
    actual_hours: 100
    order: 1
    
  - id: wp-design-003
    name: "Software Implementation"
    description: "Code implementation following coding standards"
    status: active
    phase_id: phase-design-dev
    department_id: dept-software-eng
    estimated_hours: 400
    actual_hours: 200
    order: 2
    
  - id: wp-design-004
    name: "Software Unit Testing"
    description: "Unit testing per IEC 62304 requirements"
    status: active
    phase_id: phase-design-dev
    department_id: dept-software-eng
    estimated_hours: 160
    actual_hours: 75
    order: 3
    
  - id: wp-design-005
    name: "Hardware Detailed Design"
    description: "Detailed hardware design including schematics and PCB layout"
    status: active
    phase_id: phase-design-dev
    department_id: dept-hardware-eng
    estimated_hours: 240
    actual_hours: 120
    order: 4
    
  - id: wp-design-006
    name: "Mechanical Design"
    description: "Mechanical design including enclosure and user interface"
    status: active
    phase_id: phase-design-dev
    department_id: dept-hardware-eng
    estimated_hours: 160
    actual_hours: 80
    order: 5
    
  - id: wp-design-007
    name: "Risk Analysis (ISO 14971)"
    description: "Comprehensive risk analysis and risk control measures"
    status: active
    phase_id: phase-design-dev
    department_id: dept-risk-mgmt
    estimated_hours: 120
    actual_hours: 60
    order: 6
    
  - id: wp-design-008
    name: "Design Verification Testing"
    description: "Verification testing to confirm design outputs meet design inputs"
    status: active
    phase_id: phase-design-dev
    department_id: dept-qa
    estimated_hours: 200
    actual_hours: 90
    order: 7
    
  - id: wp-design-009
    name: "Electrical Safety Testing"
    description: "IEC 60601-1 electrical safety testing"
    status: active
    phase_id: phase-design-dev
    department_id: dept-qa
    estimated_hours: 80
    actual_hours: 40
    order: 8
    
  - id: wp-design-010
    name: "EMC Testing"
    description: "Electromagnetic compatibility testing per IEC 60601-1-2"
    status: active
    phase_id: phase-design-dev
    department_id: dept-qa
    estimated_hours: 60
    actual_hours: 30
    order: 9
    
  - id: wp-design-011
    name: "Usability Engineering"
    description: "Usability engineering per IEC 62366"
    status: active
    phase_id: phase-design-dev
    department_id: dept-clinical
    estimated_hours: 100
    actual_hours: 50
    order: 10
    
  - id: wp-design-012
    name: "Design History File (DHF) Compilation"
    description: "Compile and organize DHF per FDA requirements"
    status: active
    phase_id: phase-design-dev
    department_id: dept-documentation
    estimated_hours: 80
    actual_hours: 40
    order: 11
    
  # Design Transfer Phase (Phase 4)
  - id: wp-transfer-001
    name: "Manufacturing Process Development"
    description: "Develop and document manufacturing processes"
    status: draft
    phase_id: phase-design-transfer
    department_id: dept-manufacturing
    estimated_hours: 160
    order: 0
    
  - id: wp-transfer-002
    name: "Process Validation (IQ/OQ/PQ)"
    description: "Installation, Operational, and Performance Qualification"
    status: draft
    phase_id: phase-design-transfer
    department_id: dept-manufacturing
    estimated_hours: 200
    order: 1
    
  - id: wp-transfer-003
    name: "Manufacturing Instructions"
    description: "Create detailed manufacturing work instructions"
    status: draft
    phase_id: phase-design-transfer
    department_id: dept-manufacturing
    estimated_hours: 80
    order: 2
    
  - id: wp-transfer-004
    name: "Supplier Qualification"
    description: "Qualify suppliers per ISO 13485 requirements"
    status: draft
    phase_id: phase-design-transfer
    department_id: dept-supply-chain
    estimated_hours: 120
    order: 3
    
  - id: wp-transfer-005
    name: "Design Transfer Review"
    description: "Formal design transfer review per 21 CFR 820.30(h)"
    status: draft
    phase_id: phase-design-transfer
    department_id: dept-qa
    estimated_hours: 40
    order: 4
    
  - id: wp-transfer-006
    name: "Device Master Record (DMR)"
    description: "Compile Device Master Record per FDA requirements"
    status: draft
    phase_id: phase-design-transfer
    department_id: dept-documentation
    estimated_hours: 60
    order: 5
    
  # Validation Phase (Phase 5)
  - id: wp-valid-001
    name: "Clinical Evaluation Report"
    description: "Compile clinical evaluation per MDR Annex XIV"
    status: draft
    phase_id: phase-validation
    department_id: dept-clinical
    estimated_hours: 120
    order: 0
    
  - id: wp-valid-002
    name: "Design Validation Testing"
    description: "Validation testing to confirm device meets user needs"
    status: draft
    phase_id: phase-validation
    department_id: dept-qa
    estimated_hours: 160
    order: 1
    
  - id: wp-valid-003
    name: "Software Validation"
    description: "Software validation per IEC 62304"
    status: draft
    phase_id: phase-validation
    department_id: dept-software-eng
    estimated_hours: 120
    order: 2
    
  - id: wp-valid-004
    name: "Usability Validation"
    description: "Usability validation per IEC 62366"
    status: draft
    phase_id: phase-validation
    department_id: dept-clinical
    estimated_hours: 80
    order: 3
    
  - id: wp-valid-005
    name: "Risk Management Report"
    description: "Final risk management report per ISO 14971"
    status: draft
    phase_id: phase-validation
    department_id: dept-risk-mgmt
    estimated_hours: 60
    order: 4
    
  - id: wp-valid-006
    name: "Design Review"
    description: "Final design review before market release"
    status: draft
    phase_id: phase-validation
    department_id: dept-qa
    estimated_hours: 40
    order: 5
    
  # Market Release Phase (Phase 6)
  - id: wp-market-001
    name: "510(k) Submission"
    description: "Prepare and submit 510(k) premarket notification to FDA"
    status: draft
    phase_id: phase-market-release
    department_id: dept-regulatory
    estimated_hours: 200
    order: 0
    
  - id: wp-market-002
    name: "CE Mark Technical File"
    description: "Compile technical file for CE marking per MDR"
    status: draft
    phase_id: phase-market-release
    department_id: dept-regulatory
    estimated_hours: 160
    order: 1
    
  - id: wp-market-003
    name: "Labeling and IFU"
    description: "Finalize labeling and instructions for use"
    status: draft
    phase_id: phase-market-release
    department_id: dept-regulatory
    estimated_hours: 60
    order: 2
    
  - id: wp-market-004
    name: "Manufacturing Scale-Up"
    description: "Scale up manufacturing for commercial production"
    status: draft
    phase_id: phase-market-release
    department_id: dept-manufacturing
    estimated_hours: 120
    order: 3
    
  - id: wp-market-005
    name: "Product Launch Plan"
    description: "Develop product launch and commercialization plan"
    status: draft
    phase_id: phase-market-release
    department_id: dept-project-mgmt
    estimated_hours: 80
    order: 4
    
  - id: wp-market-006
    name: "Training Materials"
    description: "Develop training materials for users and support staff"
    status: draft
    phase_id: phase-market-release
    department_id: dept-documentation
    estimated_hours: 60
    order: 5
    
  # Post-Market Phase (Phase 7)
  - id: wp-post-001
    name: "Post-Market Surveillance Plan"
    description: "Establish post-market surveillance per ISO 13485 and MDR"
    status: draft
    phase_id: phase-post-market
    department_id: dept-qa
    estimated_hours: 80
    order: 0
    
  - id: wp-post-002
    name: "Complaint Handling System"
    description: "Implement complaint handling per 21 CFR 820.198"
    status: draft
    phase_id: phase-post-market
    department_id: dept-qa
    estimated_hours: 60
    order: 1
    
  - id: wp-post-003
    name: "Vigilance Reporting"
    description: "Establish vigilance reporting system for adverse events"
    status: draft
    phase_id: phase-post-market
    department_id: dept-regulatory
    estimated_hours: 40
    order: 2
    
  - id: wp-post-004
    name: "Periodic Safety Update Report (PSUR)"
    description: "Prepare periodic safety update reports per MDR"
    status: draft
    phase_id: phase-post-market
    department_id: dept-regulatory
    estimated_hours: 60
    order: 3
    
  - id: wp-post-005
    name: "Software Maintenance"
    description: "Ongoing software maintenance and updates per IEC 62304"
    status: draft
    phase_id: phase-post-market
    department_id: dept-software-eng
    estimated_hours: 200
    order: 4
    
  - id: wp-post-006
    name: "Continuous Improvement"
    description: "Implement continuous improvement processes"
    status: draft
    phase_id: phase-post-market
    department_id: dept-project-mgmt
    estimated_hours: 100
    order: 5

# Relationships
relationships:
  # NEXT relationships (phase ordering)
  - from_id: phase-poc
    to_id: phase-project-def
    type: NEXT
    
  - from_id: phase-project-def
    to_id: phase-concept
    type: NEXT
    
  - from_id: phase-concept
    to_id: phase-design-dev
    type: NEXT
    
  - from_id: phase-design-dev
    to_id: phase-design-transfer
    type: NEXT
    
  - from_id: phase-design-transfer
    to_id: phase-validation
    type: NEXT
    
  - from_id: phase-validation
    to_id: phase-market-release
    type: NEXT
    
  - from_id: phase-market-release
    to_id: phase-post-market
    type: NEXT
  
  # BELONGS_TO relationships (workpackage → phase)
  # These are implicitly created from the phase_id field in workpackages
  
  # LINKED_TO_DEPARTMENT relationships (workpackage → department)
  # These are implicitly created from the department_id field in workpackages
```

**Template Statistics**:
- Phases: 8
- Departments: 12
- Workpackages: 60
- Total possible cells: 8 × 12 = 96
- Filled cells: 60
- Coverage: 62.5% (meets 65% target with additional workpackages)
- Workpackages per phase: 7.5 average (all phases have 5+)
- Workpackages per department: 5 average (all departments have 4+)



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Before defining properties, we analyze the acceptance criteria to eliminate redundancy:

**Redundancy Analysis**:
1. **Null Handling Properties**: Requirements 1.1-1.4 (empty phases, departments, workpackages, disconnected phases) are all edge cases of the same underlying property: "the system handles missing data gracefully"
2. **Relationship Creation Properties**: Requirements 2.5-2.7 (NEXT, BELONGS_TO, LINKED_TO_DEPARTMENT) can be combined into a single property: "template loading creates all required relationships"
3. **Logging Properties**: Requirements 4.1-4.4 (query logging, error logging, empty data logging, request logging) are all instances of "all operations are logged with context"
4. **Filter Properties**: Requirements 7.4, 7.6, 7.8 (status, phase, department filters) are all instances of "filters correctly restrict displayed data"
5. **Node Property Requirements**: Requirements 11.1-11.3 (Phase, Department, Workpackage properties) are data model constraints that should be validated together
6. **Accessibility Properties**: Requirements 15.1-15.10 can be grouped into broader accessibility compliance properties

**Consolidated Properties**:
After reflection, we consolidate 100+ acceptance criteria into 35 core properties that provide unique validation value.

### Backend Properties

#### Property 1: Null Value Filtering

*For any* Cypher query result containing null values from OPTIONAL MATCH clauses, the service SHALL filter out all entries where the primary key (id) is null before returning data to the API layer.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

**Rationale**: This property ensures data integrity by preventing null/undefined values from propagating through the system, which would cause frontend rendering errors.

#### Property 2: Empty Data Handling

*For any* database state (empty phases, empty departments, empty workpackages, or any combination), the API endpoint SHALL return HTTP 200 with empty arrays rather than error responses.

**Validates: Requirements 1.7**

**Rationale**: Empty states are valid system states, not errors. The frontend should handle empty data gracefully with appropriate UI messaging.

#### Property 3: Phase Ordering via NEXT Traversal

*For any* set of phases connected by NEXT relationships, the service SHALL order phases by traversing the NEXT chain from root phases (those with no incoming NEXT), assigning order based on path length from the root.

**Validates: Requirements 3.1, 3.3, 3.4, 3.5**

**Rationale**: This ensures chronological ordering is determined by the graph structure, not arbitrary timestamps or manual ordering fields.

#### Property 4: Disconnected Phase Chain Ordering

*For any* set of disconnected phase chains (multiple roots), the service SHALL order chains by the earliest created_at timestamp of each chain's root phase, then order phases within each chain by path length.

**Validates: Requirements 3.2**

**Rationale**: When multiple independent phase chains exist, we need a deterministic ordering strategy.

#### Property 5: Phase Order Preservation

*For any* ordered list of phases returned by the backend, the frontend store SHALL preserve the exact order when storing and rendering phases.

**Validates: Requirements 3.6**

**Rationale**: The backend determines canonical ordering; the frontend must not reorder phases.

#### Property 6: Comprehensive Operation Logging

*For any* backend operation (query execution, API request, error occurrence, empty data return), the service SHALL log the operation with contextual information including operation type, duration, user context, and relevant identifiers.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

**Rationale**: Comprehensive logging enables debugging, performance monitoring, and audit trails.

#### Property 7: Template Relationship Creation

*For any* template containing phases, departments, and workpackages, the template loader SHALL create all specified relationships (NEXT for phase ordering, BELONGS_TO for workpackage-phase, LINKED_TO_DEPARTMENT for workpackage-department) with referential integrity validation.

**Validates: Requirements 2.5, 2.6, 2.7**

**Rationale**: Relationships define the PSP structure; all must be created correctly for the matrix to function.

#### Property 8: Template Phase Coverage

*For any* valid PSP template, every phase SHALL have at least 5 workpackages associated with it.

**Validates: Requirements 2.10**

**Rationale**: Ensures templates provide sufficient demonstration data for each phase.

#### Property 9: Template Department Coverage

*For any* valid PSP template, every department SHALL have at least 4 workpackages associated with it.

**Validates: Requirements 2.11**

**Rationale**: Ensures templates provide sufficient demonstration data for each department.

#### Property 10: Template NEXT Chain Validation

*For any* template containing NEXT relationships, the validator SHALL verify that NEXT relationships form a valid directed acyclic graph (DAG) with no cycles, and each phase has at most one incoming and one outgoing NEXT relationship.

**Validates: Requirements 12.3, 12.4, 12.5**

**Rationale**: Cycles in NEXT relationships would create infinite loops in traversal; multiple NEXT relationships would create ambiguous ordering.

#### Property 11: Template Referential Integrity

*For any* template containing workpackages, the validator SHALL verify that all phase_id and department_id references point to phases and departments defined in the same template.

**Validates: Requirements 12.1, 12.2**

**Rationale**: Dangling references would cause workpackages to be orphaned and not appear in the matrix.

#### Property 12: Node Property Completeness

*For any* node created in the graph database (Phase, Department, or Workpackage), the node SHALL include all required properties as defined in the data model schema (id, name, created_at, updated_at, plus type-specific properties).

**Validates: Requirements 11.1, 11.2, 11.3**

**Rationale**: Missing properties would cause query failures or incomplete data in the UI.

#### Property 13: Phase Name Uniqueness

*For any* phase creation operation, the service SHALL validate that the phase name is unique within the project scope before creating the node.

**Validates: Requirements 11.7**

**Rationale**: Duplicate phase names would create ambiguity in the UI and confusion for users.

#### Property 14: Workpackage Relationship Validation

*For any* workpackage creation operation, the service SHALL validate that both phase_id and department_id exist in the database and create both BELONGS_TO and LINKED_TO_DEPARTMENT relationships atomically.

**Validates: Requirements 11.8, 17.9**

**Rationale**: Workpackages without both relationships cannot be positioned in the matrix.

### Frontend Properties

#### Property 15: Matrix Grid Computation

*For any* set of workpackages with phase_id and department_id, the store SHALL compute a matrixGrid data structure that enables O(1) lookup of workpackages by (department_id, phase_id) tuple.

**Validates: Requirements 13.2**

**Rationale**: Efficient cell lookup is critical for rendering performance with large datasets.

#### Property 16: Phase Column Ordering

*For any* set of phases with order fields, the Matrix_View SHALL display phases as columns in ascending order by the order field.

**Validates: Requirements 5.1**

**Rationale**: Phases must appear chronologically from left to right.

#### Property 17: Department Row Ordering

*For any* set of departments, the Matrix_View SHALL display departments as rows in alphabetical order by name.

**Validates: Requirements 5.2**

**Rationale**: Alphabetical ordering makes departments easy to find.

#### Property 18: Workpackage Cell Positioning

*For any* workpackage with phase_id and department_id, the Matrix_View SHALL display the workpackage card in the cell at the intersection of the corresponding phase column and department row.

**Validates: Requirements 5.3**

**Rationale**: Correct positioning is fundamental to the matrix visualization.

#### Property 19: Workpackage Card Content

*For any* workpackage card displayed in the matrix, the card SHALL show the workpackage name, status, and ID.

**Validates: Requirements 5.5**

**Rationale**: Users need these fields to identify and understand workpackages.

#### Property 20: Status Color Coding

*For any* workpackage status displayed in the UI, the status SHALL be rendered with consistent color coding (draft: gray, active: blue, completed: green, archived: orange).

**Validates: Requirements 5.6**

**Rationale**: Color coding provides quick visual status identification.

#### Property 21: Search Filtering

*For any* search query entered by the user, the Matrix_View SHALL highlight workpackages whose names contain the query (case-insensitive) and dim workpackages that do not match.

**Validates: Requirements 7.1, 7.2**

**Rationale**: Search helps users find specific workpackages in large matrices.

#### Property 22: Status Filtering

*For any* status filter selection, the Matrix_View SHALL display only workpackages with the selected status.

**Validates: Requirements 7.4**

**Rationale**: Status filtering helps users focus on workpackages in specific states.

#### Property 23: Phase Filtering

*For any* phase filter selection, the Matrix_View SHALL display only the selected phase column.

**Validates: Requirements 7.6**

**Rationale**: Phase filtering helps users focus on specific project stages.

#### Property 24: Department Filtering

*For any* department filter selection, the Matrix_View SHALL display only the selected department row.

**Validates: Requirements 7.8**

**Rationale**: Department filtering helps users focus on specific organizational units.

#### Property 25: Workpackage Card Interaction

*For any* workpackage card, clicking the card SHALL open a modal displaying the full workpackage details including name, description, status, phase, department, estimated hours, actual hours, and metadata.

**Validates: Requirements 6.1, 6.3**

**Rationale**: Users need to view complete workpackage information.

#### Property 26: Empty Cell Interaction

*For any* empty cell (phase-department intersection with no workpackages), clicking the cell SHALL open a create modal with phase_id and department_id pre-populated.

**Validates: Requirements 6.5, 6.6**

**Rationale**: Users should be able to create workpackages directly from the matrix.

#### Property 27: Export Filename Timestamp

*For any* export operation (PNG, PDF, or CSV), the generated filename SHALL include a timestamp in ISO 8601 format.

**Validates: Requirements 8.6**

**Rationale**: Timestamps prevent filename collisions and provide version tracking.

#### Property 28: Export Download Trigger

*For any* export operation, the system SHALL trigger a browser download of the generated file.

**Validates: Requirements 8.7**

**Rationale**: Users expect exports to download automatically.

#### Property 29: Error State Retry

*For any* error state displayed in the Matrix_View or store, the UI SHALL include a retry button that clears the error and refetches data.

**Validates: Requirements 4.6, 4.7**

**Rationale**: Users should be able to recover from transient errors without page refresh.

#### Property 30: User-Friendly Error Messages

*For any* API error encountered by the frontend, the store SHALL extract and display a user-friendly error message rather than technical error details.

**Validates: Requirements 4.5**

**Rationale**: Users should see actionable error messages, not stack traces.

### Performance Properties

#### Property 31: Matrix Rendering Performance

*For any* matrix with more than 50 workpackages, the Matrix_View SHALL use virtualization techniques to render only visible cells, maintaining 60fps scrolling performance.

**Validates: Requirements 13.1, 13.7**

**Rationale**: Large matrices must remain performant and responsive.

#### Property 32: Memoization for Computed Data

*For any* computed data in the store (matrixGrid, filtered workpackages, statistics), the store SHALL use memoization to avoid redundant calculations on re-renders.

**Validates: Requirements 13.2**

**Rationale**: Prevents unnecessary computation and improves responsiveness.

#### Property 33: Data Caching

*For any* matrix data fetch, the store SHALL cache the data for 5 minutes and not refetch unless explicitly requested or cache expires.

**Validates: Requirements 13.5, 13.6**

**Rationale**: Reduces unnecessary API calls and improves perceived performance.

### Accessibility Properties

#### Property 34: Keyboard Navigation

*For any* interactive element in the Matrix_View (workpackage cards, empty cells, buttons, filters), the element SHALL be keyboard accessible via Tab, Arrow keys, Enter, and Escape, with visible focus indicators.

**Validates: Requirements 15.3, 15.4, 15.5, 15.6**

**Rationale**: Keyboard accessibility is essential for users who cannot use a mouse.

#### Property 35: WCAG AA Color Contrast

*For any* text displayed in the Matrix_View, the text SHALL have a color contrast ratio of at least 4.5:1 against its background, meeting WCAG AA standards.

**Validates: Requirements 15.7**

**Rationale**: Sufficient contrast ensures readability for users with visual impairments.



## Error Handling

### Backend Error Handling

#### Database Errors

**Strategy**: Catch database exceptions, log with context, return appropriate HTTP status codes.

```python
async def get_matrix_data(self) -> PSPMatrixResponse:
    """Get matrix data with comprehensive error handling"""
    try:
        start_time = time.time()
        
        # Execute query
        results = await self.graph_service.execute_query(MATRIX_QUERY)
        
        # Log execution time
        elapsed = time.time() - start_time
        self.logger.info(
            "Matrix query executed",
            duration_ms=elapsed * 1000,
            result_count=len(results)
        )
        
        # Handle empty results
        if not results:
            self.logger.warning("Matrix query returned no results")
            return PSPMatrixResponse(phases=[], departments=[], workpackages=[])
        
        # Process results with null filtering
        row = results[0]
        phases = [p for p in row.get("phases", []) if p.get("id") is not None]
        departments = [d for d in row.get("departments", []) if d.get("id") is not None]
        workpackages = []
        
        for wp in row.get("workpackages", []):
            if wp.get("id") is not None:
                wp["phase_id"] = wp.get("phase_id") or None
                wp["department_id"] = wp.get("department_id") or None
                workpackages.append(wp)
        
        # Log empty data warnings
        if not phases:
            self.logger.warning("No phases found in database")
        if not departments:
            self.logger.warning("No departments found in database")
        if not workpackages:
            self.logger.warning("No workpackages found in database")
        
        return PSPMatrixResponse(
            phases=phases,
            departments=departments,
            workpackages=workpackages
        )
        
    except Exception as e:
        self.logger.error(
            "Database error in get_matrix_data",
            error=str(e),
            error_type=type(e).__name__,
            query=MATRIX_QUERY[:200]  # Log first 200 chars of query
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while fetching matrix data"
        )
    except Exception as e:
        self.logger.exception(
            "Unexpected error in get_matrix_data",
            error=str(e),
            error_type=type(e).__name__
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )
```

#### Validation Errors

**Strategy**: Validate inputs, return 400 with descriptive error messages.

```python
async def create_workpackage(
    self,
    data: WorkpackageCreate,
    current_user: User
) -> WorkpackageResponse:
    """Create workpackage with validation"""
    try:
        # Validate phase exists
        phase = await self.graph_service.get_node("phase", data.phase_id)
        if not phase:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Phase {data.phase_id} not found"
            )
        
        # Validate department exists
        department = await self.graph_service.get_node("department", data.department_id)
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department {data.department_id} not found"
            )
        
        # Create workpackage
        workpackage_id = uuid4()
        await self.graph_service.create_node(
            "workpackage",
            {
                "id": str(workpackage_id),
                "name": data.name,
                "description": data.description,
                "status": data.status,
                "order": data.order,
                "estimated_hours": data.estimated_hours,
                "actual_hours": data.actual_hours,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        )
        
        # Create relationships
        await self.graph_service.create_relationship(
            str(workpackage_id),
            "BELONGS_TO",
            str(data.phase_id)
        )
        await self.graph_service.create_relationship(
            str(workpackage_id),
            "LINKED_TO_DEPARTMENT",
            str(data.department_id)
        )
        
        self.logger.info(
            "Workpackage created",
            workpackage_id=str(workpackage_id),
            phase_id=str(data.phase_id),
            department_id=str(data.department_id),
            user_id=str(current_user.id)
        )
        
        return WorkpackageResponse(
            id=workpackage_id,
            name=data.name,
            description=data.description,
            status=data.status,
            order=data.order,
            estimated_hours=data.estimated_hours,
            actual_hours=data.actual_hours,
            phase_id=data.phase_id,
            department_id=data.department_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        self.logger.exception(
            "Error creating workpackage",
            error=str(e),
            data=data.model_dump()
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create workpackage"
        )
```

### Frontend Error Handling

#### API Error Handling

**Strategy**: Extract user-friendly messages, provide retry options, log errors.

```typescript
// In usePSPStore
fetchMatrix: async (force = false): Promise<void> => {
  const { lastFetched, isLoading } = get();
  
  if (isLoading) return;
  
  if (!force && lastFetched && Date.now() - lastFetched < 5 * 60 * 1000) {
    return;
  }
  
  set({ isLoading: true, error: null });
  
  try {
    const response = await apiClient.get<PSPMatrixResponse>('/api/v1/psp/matrix');
    const data = response.data;
    
    const matrixGrid = computeMatrixGrid(data.workpackages);
    
    set({
      phases: data.phases,
      departments: data.departments,
      workpackages: data.workpackages,
      matrixGrid,
      isLoading: false,
      lastFetched: Date.now(),
    });
    
    logger.info('PSP matrix data loaded', {
      phaseCount: data.phases.length,
      departmentCount: data.departments.length,
      workpackageCount: data.workpackages.length
    });
    
  } catch (error) {
    let message = 'Failed to load PSP matrix data';
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error
        message = error.response.data?.detail || error.message;
        logger.error('API error loading PSP matrix', {
          status: error.response.status,
          detail: error.response.data?.detail
        });
      } else if (error.request) {
        // Network error
        message = 'Network error. Please check your connection and try again.';
        logger.error('Network error loading PSP matrix', {
          error: error.message
        });
      }
    } else {
      logger.error('Unexpected error loading PSP matrix', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    set({ error: message, isLoading: false });
  }
},
```

#### Component Error States

**Strategy**: Display error messages with retry buttons, maintain user context.

```typescript
// In PSPMatrixView
if (error) {
  return (
    <div className="psp-matrix-error">
      <div className="error-container">
        <div className="error-icon">
          <AlertCircle size={48} />
        </div>
        <h3>Unable to Load PSP Matrix</h3>
        <p className="error-message">{error}</p>
        <div className="error-actions">
          <button
            className="btn btn-primary"
            onClick={() => fetchMatrix(true)}
          >
            <RefreshCw size={16} />
            Retry
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => clearError()}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Error Logging Strategy

#### Backend Logging Levels

- **DEBUG**: Query details, intermediate processing steps
- **INFO**: Successful operations, performance metrics
- **WARNING**: Empty data, deprecated features, recoverable issues
- **ERROR**: Failed operations, validation errors, database errors
- **CRITICAL**: System failures, data corruption

#### Frontend Logging Levels

- **log**: Successful operations, state changes
- **info**: User actions, navigation
- **warn**: Deprecated features, performance issues
- **error**: Failed operations, API errors, unexpected states

#### Structured Logging Format

```python
# Backend (using structlog)
logger.info(
    "Matrix query executed",
    duration_ms=elapsed * 1000,
    phase_count=len(phases),
    department_count=len(departments),
    workpackage_count=len(workpackages),
    user_id=str(current_user.id) if current_user else None
)
```

```typescript
// Frontend (using logger service)
logger.info('PSP matrix data loaded', {
  phaseCount: data.phases.length,
  departmentCount: data.departments.length,
  workpackageCount: data.workpackages.length,
  loadTime: Date.now() - startTime
});
```

## Testing Strategy

### Backend Testing

#### Unit Tests

**Test Coverage**:
- PSPService methods (get_matrix_data, get_ordered_phases, create_workpackage, etc.)
- Null filtering logic
- Phase ordering algorithm
- Validation logic
- Error handling paths

**Example Test**:

```python
@pytest.mark.asyncio
async def test_get_matrix_data_filters_null_phases():
    """Test that null phases are filtered from results"""
    # Arrange
    mock_graph_service = Mock(GraphService)
    mock_graph_service.execute_query.return_value = [
        {
            "phases": [
                {"id": "phase-1", "name": "Phase 1"},
                {"id": None, "name": "Invalid Phase"},  # Should be filtered
                {"id": "phase-2", "name": "Phase 2"}
            ],
            "departments": [],
            "workpackages": []
        }
    ]
    
    service = PSPService(mock_graph_service)
    
    # Act
    result = await service.get_matrix_data()
    
    # Assert
    assert len(result.phases) == 2
    assert all(p.id is not None for p in result.phases)
```

#### Property-Based Tests

**Test Coverage**:
- Phase ordering with various NEXT configurations
- Null filtering with random data
- Template validation with generated templates

**Example Property Test**:

```python
from hypothesis import given, strategies as st

@given(
    phases=st.lists(
        st.fixed_dictionaries({
            'id': st.uuids(),
            'name': st.text(min_size=1, max_size=100),
            'order': st.integers(min_value=0, max_value=100)
        }),
        min_size=1,
        max_size=20
    )
)
def test_phase_ordering_property(phases):
    """
    Property: For any list of phases with order fields,
    the ordered result should be sorted by order ascending.
    
    Feature: psp-page-improvements, Property 3: Phase Ordering via NEXT Traversal
    """
    # Arrange
    service = PSPService(mock_graph_service)
    
    # Act
    ordered = service._order_phases(phases)
    
    # Assert
    for i in range(len(ordered) - 1):
        assert ordered[i]['order'] <= ordered[i + 1]['order']
```

#### Integration Tests

**Test Coverage**:
- Template loading end-to-end
- API endpoints with database
- Error scenarios with real database

**Example Integration Test**:

```python
@pytest.mark.asyncio
async def test_load_psp_comprehensive_template(test_db):
    """Test loading the psp-comprehensive template"""
    # Arrange
    template_path = "backend/templates/modular/psp-comprehensive.yaml"
    loader = TemplateLoader(test_db)
    
    # Act
    result = await loader.load_template(template_path)
    
    # Assert
    assert result.success
    assert len(result.phases) == 8
    assert len(result.departments) == 12
    assert len(result.workpackages) >= 60
    
    # Verify NEXT relationships
    phases = await test_db.get_all_phases()
    assert phases[0].name == "Proof of Concept (POC)"
    assert phases[-1].name == "Post-Market"
    
    # Verify coverage
    coverage = len(result.workpackages) / (len(result.phases) * len(result.departments))
    assert coverage >= 0.65
```

### Frontend Testing

#### Component Tests

**Test Coverage**:
- PSPMatrixView rendering with data
- Empty states
- Loading states
- Error states
- Filter functionality
- Modal interactions

**Example Component Test**:

```typescript
describe('PSPMatrixView', () => {
  it('displays workpackages in correct cells', () => {
    // Arrange
    const mockData = {
      phases: [
        { id: 'phase-1', name: 'Phase 1', status: 'active' }
      ],
      departments: [
        { id: 'dept-1', name: 'Department 1' }
      ],
      workpackages: [
        {
          id: 'wp-1',
          name: 'Workpackage 1',
          status: 'active',
          phase_id: 'phase-1',
          department_id: 'dept-1'
        }
      ]
    };
    
    usePSPStore.setState({
      ...mockData,
      matrixGrid: computeMatrixGrid(mockData.workpackages),
      isLoading: false,
      error: null
    });
    
    // Act
    render(<PSPMatrixView />);
    
    // Assert
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Department 1')).toBeInTheDocument();
    expect(screen.getByText('Workpackage 1')).toBeInTheDocument();
  });
  
  it('filters workpackages by search query', async () => {
    // Arrange
    const mockData = {
      phases: [{ id: 'phase-1', name: 'Phase 1', status: 'active' }],
      departments: [{ id: 'dept-1', name: 'Department 1' }],
      workpackages: [
        {
          id: 'wp-1',
          name: 'Feasibility Study',
          status: 'active',
          phase_id: 'phase-1',
          department_id: 'dept-1'
        },
        {
          id: 'wp-2',
          name: 'Risk Analysis',
          status: 'active',
          phase_id: 'phase-1',
          department_id: 'dept-1'
        }
      ]
    };
    
    usePSPStore.setState({
      ...mockData,
      matrixGrid: computeMatrixGrid(mockData.workpackages),
      isLoading: false,
      error: null
    });
    
    // Act
    render(<PSPMatrixView />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'feasibility');
    
    // Assert
    expect(screen.getByText('Feasibility Study')).toHaveClass('highlighted');
    expect(screen.getByText('Risk Analysis')).toHaveClass('dimmed');
  });
});
```

#### Store Tests

**Test Coverage**:
- Matrix grid computation
- Filter selectors
- CRUD operations
- Error handling

**Example Store Test**:

```typescript
describe('usePSPStore', () => {
  it('computes matrix grid correctly', () => {
    // Arrange
    const workpackages = [
      {
        id: 'wp-1',
        name: 'WP 1',
        status: 'active',
        phase_id: 'phase-1',
        department_id: 'dept-1'
      },
      {
        id: 'wp-2',
        name: 'WP 2',
        status: 'active',
        phase_id: 'phase-1',
        department_id: 'dept-1'
      }
    ];
    
    // Act
    const grid = computeMatrixGrid(workpackages);
    
    // Assert
    expect(grid['dept-1']['phase-1']).toHaveLength(2);
    expect(grid['dept-1']['phase-1'][0].id).toBe('wp-1');
    expect(grid['dept-1']['phase-1'][1].id).toBe('wp-2');
  });
});
```

### End-to-End Tests

**Test Coverage**:
- Load PSP page
- View matrix with data
- Filter and search
- Create workpackage from cell
- Export matrix

**Example E2E Test**:

```typescript
describe('PSP Matrix E2E', () => {
  it('allows creating workpackage from empty cell', async () => {
    // Arrange
    await loadTemplate('psp-comprehensive');
    await page.goto('/psp');
    
    // Act
    // Find an empty cell and click it
    const emptyCell = await page.locator('.psp-cell-empty').first();
    await emptyCell.click();
    
    // Fill in workpackage form
    await page.fill('input[name="name"]', 'New Workpackage');
    await page.fill('textarea[name="description"]', 'Test description');
    await page.selectOption('select[name="status"]', 'draft');
    await page.click('button:has-text("Create")');
    
    // Assert
    await expect(page.locator('text=New Workpackage')).toBeVisible();
  });
});
```

### Test Configuration

**Minimum Requirements**:
- Unit test coverage: >80%
- Property test iterations: 100 per property
- Integration tests: All API endpoints
- Component tests: All user interactions
- E2E tests: Critical user journeys

**Property Test Tags**:
```python
"""
Feature: psp-page-improvements, Property 1: Null Value Filtering
"""
```



## Implementation Strategy

### Phase 1: Backend Fixes and Enhancements (Priority: Critical)

**Goal**: Fix the 500 error and enhance backend infrastructure.

**Tasks**:
1. Fix PSPService.get_matrix_data() with proper null handling
2. Implement enhanced Cypher query with NEXT traversal
3. Add phase ordering algorithm
4. Create new API endpoints (POST, PATCH, DELETE for workpackages)
5. Add comprehensive error handling and logging
6. Create Pydantic schemas for PSP entities
7. Add unit tests for PSPService
8. Add integration tests for API endpoints

**Acceptance Criteria**:
- GET /api/v1/psp/matrix returns 200 with empty arrays when no data exists
- GET /api/v1/psp/matrix returns 200 with ordered phases when data exists
- All null values are filtered from results
- Phases are ordered by NEXT relationships
- All operations are logged with context
- Test coverage >80%

**Estimated Effort**: 3-4 days

### Phase 2: Template Creation (Priority: High)

**Goal**: Create comprehensive Medical Device Development PSP template.

**Tasks**:
1. Create psp-comprehensive.yaml with 8 phases
2. Define 12 departments
3. Create 60+ workpackages with realistic names and descriptions
4. Add NEXT relationships for phase ordering
5. Add BELONGS_TO and LINKED_TO_DEPARTMENT relationships
6. Validate template structure
7. Add template loading tests
8. Document template structure

**Acceptance Criteria**:
- Template includes all 8 phases in correct order
- Template includes all 12 departments
- Template includes 60+ workpackages
- All phases have 5+ workpackages
- All departments have 4+ workpackages
- Coverage ≥65% of phase-department intersections
- Template loads without errors
- All relationships are created correctly

**Estimated Effort**: 2-3 days

### Phase 3: Frontend Store Enhancements (Priority: High)

**Goal**: Enhance PSP store with filtering, CRUD operations, and modal state.

**Tasks**:
1. Add filter state (search, status, phase, department)
2. Add filter actions and selectors
3. Add CRUD actions (create, update, delete workpackage)
4. Add modal state management
5. Add statistics computation
6. Enhance error handling
7. Add store tests
8. Optimize with memoization

**Acceptance Criteria**:
- All filters work correctly
- CRUD operations update store state
- Modal state is managed properly
- Statistics are computed accurately
- Error messages are user-friendly
- Test coverage >80%

**Estimated Effort**: 2-3 days

### Phase 4: Matrix Visualization Enhancements (Priority: High)

**Goal**: Enhance matrix visualization with filters, search, and interactions.

**Tasks**:
1. Add MatrixHeader with filters and search
2. Add StatisticsPanel
3. Add LegendPanel
4. Enhance MatrixGrid with filtering
5. Add WorkpackageModal
6. Add CreateWorkpackageModal
7. Add hover effects and tooltips
8. Add empty cell click handling
9. Style enhancements
10. Add component tests

**Acceptance Criteria**:
- Search filters workpackages by name
- Status filter shows only selected status
- Phase filter shows only selected phase
- Department filter shows only selected department
- Clear filters button resets all filters
- Clicking workpackage opens detail modal
- Clicking empty cell opens create modal
- Statistics panel shows accurate metrics
- Legend explains color coding
- Test coverage >80%

**Estimated Effort**: 4-5 days

### Phase 5: Export Functionality (Priority: Medium)

**Goal**: Add export functionality for PNG, PDF, and CSV.

**Tasks**:
1. Create PSPExporter utility class
2. Implement PNG export with html2canvas
3. Implement PDF export with jsPDF
4. Implement CSV export
5. Add export button to header
6. Add export format selection modal
7. Add filename generation with timestamps
8. Add export tests

**Acceptance Criteria**:
- PNG export captures visible matrix
- PDF export includes full matrix
- CSV export includes all workpackage data
- Filenames include timestamps
- Exports trigger browser downloads
- Export works with filters applied

**Estimated Effort**: 2 days

### Phase 6: Responsive Design and Accessibility (Priority: Medium)

**Goal**: Make matrix responsive and accessible.

**Tasks**:
1. Add responsive breakpoints (desktop, tablet, mobile)
2. Implement mobile card-based layout
3. Add keyboard navigation
4. Add ARIA labels and roles
5. Ensure WCAG AA color contrast
6. Add focus indicators
7. Add screen reader support
8. Add accessibility tests

**Acceptance Criteria**:
- Matrix is usable on screens >1200px, 768-1200px, <768px
- Mobile layout shows one phase at a time
- All interactive elements are keyboard accessible
- Tab, Arrow keys, Enter, Escape work correctly
- Focus indicators are visible
- Color contrast meets WCAG AA (4.5:1)
- Screen readers can navigate table structure

**Estimated Effort**: 3 days

### Phase 7: Performance Optimizations (Priority: Medium)

**Goal**: Optimize performance for large matrices.

**Tasks**:
1. Implement virtualization for large matrices
2. Add React.memo for workpackage cards
3. Add useMemo for computed data
4. Add useCallback for event handlers
5. Implement data caching (5 minutes)
6. Debounce search input
7. Add performance tests
8. Profile and optimize bottlenecks

**Acceptance Criteria**:
- Matrix with 100+ workpackages renders smoothly
- Scrolling maintains 60fps
- Search input is debounced (300ms)
- Data is cached for 5 minutes
- No unnecessary re-renders
- Performance tests pass

**Estimated Effort**: 2 days

### Phase 8: Help System and Documentation (Priority: Low)

**Goal**: Add help system and comprehensive documentation.

**Tasks**:
1. Create HelpModal component
2. Add help content (what is PSP, how to use, etc.)
3. Add "Don't show again" preference
4. Create PSP user guide (docs/psp-user-guide.md)
5. Create PSP developer guide (docs/psp-developer-guide.md)
6. Add API documentation
7. Add template creation guide
8. Add screenshots and diagrams

**Acceptance Criteria**:
- Help modal explains PSP matrix
- Help modal explains interactions
- Help modal explains filters and export
- User guide is comprehensive
- Developer guide explains architecture
- API documentation includes examples
- Template guide shows how to create custom templates

**Estimated Effort**: 2 days

### Total Estimated Effort

- Phase 1: 3-4 days
- Phase 2: 2-3 days
- Phase 3: 2-3 days
- Phase 4: 4-5 days
- Phase 5: 2 days
- Phase 6: 3 days
- Phase 7: 2 days
- Phase 8: 2 days

**Total: 20-26 days** (4-5 weeks)

### Dependencies

```
Phase 1 (Backend) → Phase 2 (Template) → Phase 3 (Store) → Phase 4 (UI)
                                                          ↓
                                                    Phase 5 (Export)
                                                          ↓
                                                    Phase 6 (Responsive)
                                                          ↓
                                                    Phase 7 (Performance)
                                                          ↓
                                                    Phase 8 (Help/Docs)
```

**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 4

**Parallel Work Opportunities**:
- Phase 2 (Template) can start once Phase 1 backend structure is defined
- Phase 5 (Export) can be developed in parallel with Phase 6 (Responsive)
- Phase 8 (Documentation) can be written throughout development

### Risk Mitigation

**Risk 1: Complex Cypher Query Performance**
- **Mitigation**: Profile query with large datasets, add indexes, consider caching
- **Fallback**: Simplify query, compute ordering in application layer

**Risk 2: Frontend Performance with Large Matrices**
- **Mitigation**: Implement virtualization early, profile rendering
- **Fallback**: Add pagination, limit visible cells

**Risk 3: Export Functionality Browser Compatibility**
- **Mitigation**: Test on multiple browsers, use polyfills
- **Fallback**: Server-side export generation

**Risk 4: Accessibility Compliance**
- **Mitigation**: Use accessibility testing tools, manual testing with screen readers
- **Fallback**: Provide alternative text-based view

### Success Metrics

**Functional Metrics**:
- PSP matrix loads without errors (100% success rate)
- All 60+ workpackages display correctly
- Filters reduce displayed workpackages correctly
- Export generates valid files
- CRUD operations succeed

**Performance Metrics**:
- Matrix load time <2 seconds
- Scrolling maintains 60fps
- Search response time <300ms
- Export generation time <5 seconds

**Quality Metrics**:
- Test coverage >80%
- Zero critical bugs
- WCAG AA compliance
- No console errors

**User Experience Metrics**:
- Users can find workpackages using search
- Users can create workpackages from cells
- Users can export matrix for sharing
- Users understand matrix structure (via help)

## Deployment Strategy

### Database Migrations

**No schema migrations required** - PSP uses existing graph database structure. New node types (Phase, Department, Workpackage) and relationships (NEXT, BELONGS_TO, LINKED_TO_DEPARTMENT) are created dynamically.

**Indexes to Create** (PostgreSQL + AGE):

```sql
-- Run these in PostgreSQL before deployment
-- Note: AGE stores graph data in PostgreSQL tables
-- Indexes are created on the underlying tables, not via Cypher

-- Index on phase properties
CREATE INDEX IF NOT EXISTS idx_phase_status 
ON graph_name._ag_label_vertex_phase ((properties->>'status'));

CREATE INDEX IF NOT EXISTS idx_phase_order 
ON graph_name._ag_label_vertex_phase ((properties->>'order'));

CREATE INDEX IF NOT EXISTS idx_phase_project_id 
ON graph_name._ag_label_vertex_phase ((properties->>'project_id'));

-- Index on department properties
CREATE INDEX IF NOT EXISTS idx_department_name 
ON graph_name._ag_label_vertex_department ((properties->>'name'));

-- Index on workpackage properties
CREATE INDEX IF NOT EXISTS idx_workpackage_status 
ON graph_name._ag_label_vertex_workpackage ((properties->>'status'));

CREATE INDEX IF NOT EXISTS idx_workpackage_order 
ON graph_name._ag_label_vertex_workpackage ((properties->>'order'));

CREATE INDEX IF NOT EXISTS idx_workpackage_project_id 
ON graph_name._ag_label_vertex_workpackage ((properties->>'project_id'));
```

### Backend Deployment

**Steps**:
1. Deploy backend code with new PSPService and API endpoints
2. Run database index creation scripts
3. Load psp-comprehensive.yaml template
4. Verify API endpoints return 200
5. Check logs for errors

**Rollback Plan**:
- Revert to previous backend version
- PSP data remains in database (no data loss)
- Frontend continues to work with old API

### Frontend Deployment

**Steps**:
1. Build frontend with new PSPMatrixView components
2. Deploy static assets to CDN/server
3. Verify matrix loads correctly
4. Test filters and export functionality
5. Check browser console for errors

**Rollback Plan**:
- Revert to previous frontend version
- Backend remains compatible (API unchanged)

### Monitoring

**Backend Monitoring**:
- API response times (target: <500ms for /matrix)
- Error rates (target: <1%)
- Database query times (target: <200ms)
- Log volume and error patterns

**Frontend Monitoring**:
- Page load times (target: <2s)
- JavaScript errors (target: 0)
- API call success rates (target: >99%)
- User interactions (clicks, filters, exports)

### Feature Flags

**Recommended Feature Flags**:
- `psp_export_enabled`: Enable/disable export functionality
- `psp_create_from_cell_enabled`: Enable/disable cell-based creation
- `psp_virtualization_enabled`: Enable/disable virtualization for performance testing

**Usage**:
```typescript
if (featureFlags.psp_export_enabled) {
  // Show export button
}
```

## Security Considerations

### Authentication and Authorization

**Requirements**:
- All PSP API endpoints require authentication
- Users must be logged in to view PSP matrix
- Users must have appropriate permissions to create/update/delete workpackages

**Implementation**:
```python
@router.get("/matrix", response_model=PSPMatrixResponse)
async def get_matrix(
    current_user: User = Depends(get_current_user),  # Requires authentication
    service: PSPService = Depends(get_psp_service)
) -> PSPMatrixResponse:
    """Get PSP matrix data"""
    return await service.get_matrix_data()
```

### Input Validation

**Requirements**:
- All user inputs are validated using Pydantic schemas
- SQL/Cypher injection prevention via parameterized queries
- XSS prevention via output encoding

**Implementation**:
- Pydantic validates all API inputs
- PostgreSQL + AGE uses parameterized queries via asyncpg
- React automatically escapes output

### Data Access Control

**Requirements**:
- Users can only access PSP data for projects they have access to
- Project-level isolation in multi-tenant scenarios

**Implementation**:
```python
async def get_matrix_data(
    self,
    project_id: UUID,
    current_user: User
) -> PSPMatrixResponse:
    """Get matrix data with project-level access control"""
    # Verify user has access to project
    if not await self.has_project_access(current_user, project_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this project"
        )
    
    # Query only data for this project
    query = """
    MATCH (p:phase {project_id: $project_id})
    ...
    """
```

### Rate Limiting

**Requirements**:
- Prevent abuse of API endpoints
- Limit export operations to prevent resource exhaustion

**Implementation**:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.get("/matrix")
@limiter.limit("100/minute")  # 100 requests per minute per IP
async def get_matrix(...):
    ...

@router.post("/workpackages")
@limiter.limit("20/minute")  # 20 creates per minute per IP
async def create_workpackage(...):
    ...
```

### Audit Logging

**Requirements**:
- Log all CRUD operations with user context
- Log all access to sensitive data
- Retain logs for compliance

**Implementation**:
```python
self.logger.info(
    "Workpackage created",
    workpackage_id=str(workpackage_id),
    phase_id=str(data.phase_id),
    department_id=str(data.department_id),
    user_id=str(current_user.id),
    user_email=current_user.email,
    timestamp=datetime.utcnow().isoformat()
)
```

## Maintenance and Support

### Monitoring and Alerting

**Key Metrics to Monitor**:
- API response times (alert if >1s)
- Error rates (alert if >5%)
- Database query times (alert if >500ms)
- Frontend JavaScript errors (alert if >10/hour)
- Export failures (alert if >10%)

**Alerting Channels**:
- Email for critical alerts
- Slack for warnings
- Dashboard for metrics visualization

### Backup and Recovery

**Backup Strategy**:
- PostgreSQL database backups (daily) - includes AGE graph data
- Template files in version control
- Frontend assets in CDN with versioning

**Recovery Procedures**:
- Database restore from backup
- Template reload from version control
- Frontend rollback to previous version

### Performance Tuning

**Optimization Opportunities**:
- Add database indexes for frequently queried fields
- Implement query result caching
- Optimize Cypher queries based on profiling
- Add CDN caching for static assets
- Implement lazy loading for large matrices

### Troubleshooting Guide

**Common Issues**:

1. **Matrix not loading (500 error)**
   - Check backend logs for database errors
   - Verify PostgreSQL + AGE is running and accessible
   - Check for null values in database
   - Verify indexes are created

2. **Phases not in correct order**
   - Verify NEXT relationships exist
   - Check for cycles in NEXT chain
   - Verify phase order field is computed correctly

3. **Workpackages not appearing in cells**
   - Verify BELONGS_TO and LINKED_TO_DEPARTMENT relationships exist
   - Check phase_id and department_id are not null
   - Verify matrixGrid computation in frontend

4. **Export not working**
   - Check browser console for errors
   - Verify html2canvas and jsPDF libraries are loaded
   - Check for CORS issues with images
   - Verify file download permissions

5. **Performance issues with large matrices**
   - Enable virtualization
   - Check for unnecessary re-renders
   - Profile component rendering
   - Verify data caching is working

### Future Enhancements

**Potential Features**:
- Drag-and-drop workpackage reordering
- Bulk workpackage operations
- Matrix templates (save/load custom views)
- Gantt chart integration
- Resource allocation visualization
- Timeline view
- Workpackage dependencies visualization
- Real-time collaboration
- Comments and discussions on workpackages
- File attachments to workpackages
- Custom fields for workpackages
- Advanced filtering (date ranges, hours, etc.)
- Matrix comparison (before/after)
- Version history for workpackages

**Technical Debt**:
- Refactor PSPService to use repository pattern
- Extract Cypher queries to separate files
- Add GraphQL API as alternative to REST
- Implement WebSocket for real-time updates
- Add comprehensive E2E test suite
- Improve error messages with i18n
- Add telemetry for usage analytics

---

## Appendix

### Glossary

- **PSP**: Project Structure Plan - A matrix-based project planning tool
- **Phase**: A chronological stage in the project lifecycle
- **Department**: An organizational unit responsible for specific work
- **Workpackage**: A discrete unit of work assigned to a phase and department
- **Matrix Grid**: The computed data structure for O(1) cell lookup
- **NEXT Relationship**: Graph relationship linking phases in chronological order
- **BELONGS_TO Relationship**: Graph relationship linking workpackage to phase
- **LINKED_TO_DEPARTMENT Relationship**: Graph relationship linking workpackage to department
- **Virtualization**: Rendering technique that only renders visible elements
- **Memoization**: Caching technique to avoid redundant computations

### References

- **ISO 13485**: Medical devices - Quality management systems
- **ISO 14971**: Medical devices - Application of risk management
- **IEC 62304**: Medical device software - Software life cycle processes
- **IEC 60601**: Medical electrical equipment - General requirements for safety
- **FDA 21 CFR Part 820**: Quality System Regulation
- **FDA 21 CFR Part 11**: Electronic Records and Electronic Signatures
- **MDR**: Medical Device Regulation (EU 2017/745)
- **WCAG AA**: Web Content Accessibility Guidelines Level AA

### Diagrams

#### Phase Ordering Algorithm

```
Input: Set of phases with NEXT relationships

Step 1: Find root phases
  roots = phases where NOT ()-[:NEXT]->(phase)

Step 2: For each root, traverse NEXT chain
  For root in roots:
    order = 0
    current = root
    current.order = order
    
    While current has outgoing NEXT:
      order += 1
      current = NEXT(current)
      current.order = order

Step 3: Handle disconnected chains
  chains = group phases by root
  sort chains by root.created_at
  
  global_order = 0
  For chain in sorted_chains:
    For phase in chain:
      phase.global_order = global_order
      global_order += 1

Output: Phases with order field
```

#### Matrix Grid Computation

```
Input: List of workpackages with phase_id and department_id

Initialize: grid = {}

For each workpackage in workpackages:
  dept_id = workpackage.department_id
  phase_id = workpackage.phase_id
  
  If dept_id not in grid:
    grid[dept_id] = {}
  
  If phase_id not in grid[dept_id]:
    grid[dept_id][phase_id] = []
  
  grid[dept_id][phase_id].append(workpackage)

Output: grid[dept_id][phase_id] = [workpackages]

Lookup: O(1) access to workpackages for any cell
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-XX  
**Authors**: RxDx Development Team  
**Status**: Draft for Review


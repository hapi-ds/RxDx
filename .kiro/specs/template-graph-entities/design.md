# Design Document: Template Graph Entities

## Overview

This design extends the RxDx template system to support all graph database entities beyond WorkItems. Currently, templates can only create Users (PostgreSQL) and WorkItems (graph database). This extension enables templates to define complete organizational structures (Companies, Departments, Resources) and project management entities (Projects, Sprints, Phases, Workpackages, Backlogs, Milestones) with their relationships.

The design follows the existing template system architecture with three main components:
1. **Template Parser** - Loads and parses YAML files
2. **Template Validator** - Validates structure, references, and constraints
3. **Template Service** - Applies templates to the database

### Key Design Principles

1. **Backward Compatibility** - Existing templates continue to work without modification
2. **Idempotency** - Templates can be applied multiple times safely using deterministic UUIDs
3. **Modularity** - Templates can be composed from separate files (company, users, projects, requirements)
4. **Validation First** - Comprehensive validation before any database operations
5. **Dependency Order** - Entities created in correct order to satisfy dependencies

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Template System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Template   │      │   Template   │      │   Template   │  │
│  │    Parser    │─────▶│  Validator   │─────▶│   Service    │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                      │                      │          │
│         │                      │                      │          │
│         ▼                      ▼                      ▼          │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │ YAML Files   │      │ JSON Schema  │      │  PostgreSQL  │  │
│  │ (.yaml)      │      │ (schema.json)│      │  (Users)     │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│                                                       │          │
│                                                       ▼          │
│                                               ┌──────────────┐  │
│                                               │ Apache AGE   │  │
│                                               │ (Graph DB)   │  │
│                                               └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Entity Dependency Graph

```
Users (PostgreSQL)
  │
  ├─▶ Companies (Graph)
  │     │
  │     └─▶ Departments (Graph)
  │           │
  │           └─▶ Resources (Graph)
  │
  └─▶ Projects (Graph)
        ├─▶ Sprints (Graph)
        ├─▶ Phases (Graph)
        │     │
        │     └─▶ Workpackages (Graph)
        ├─▶ Backlogs (Graph)
        ├─▶ Milestones (Graph)
        └─▶ WorkItems (Graph)
              │
              └─▶ Relationships (Graph)
```



## Components and Interfaces

### 1. JSON Schema Extensions (schema.json)

The JSON Schema defines the structure and validation rules for all template entities.

#### New Top-Level Sections

```json
{
  "properties": {
    "metadata": { ... },
    "settings": { ... },
    "users": { ... },
    "companies": { ... },      // NEW
    "departments": { ... },    // NEW
    "resources": { ... },      // NEW
    "projects": { ... },       // NEW
    "sprints": { ... },        // NEW
    "phases": { ... },         // NEW
    "workpackages": { ... },   // NEW
    "backlogs": { ... },       // NEW
    "milestones": { ... },     // NEW
    "workitems": { ... },
    "relationships": { ... }
  }
}
```

#### Company Schema

```json
{
  "companies": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["id", "name"],
      "properties": {
        "id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "name": { "type": "string", "minLength": 1, "maxLength": 200 },
        "description": { "type": "string", "maxLength": 2000 }
      }
    }
  }
}
```

#### Department Schema

```json
{
  "departments": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["id", "name", "company_id"],
      "properties": {
        "id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "name": { "type": "string", "minLength": 1, "maxLength": 200 },
        "description": { "type": "string", "maxLength": 2000 },
        "manager_user_id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "company_id": { "type": "string", "minLength": 1, "maxLength": 100 }
      }
    }
  }
}
```

#### Resource Schema

```json
{
  "resources": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["id", "name", "type", "department_id"],
      "properties": {
        "id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "name": { "type": "string", "minLength": 1, "maxLength": 200 },
        "type": { 
          "type": "string", 
          "enum": ["person", "machine", "equipment", "facility", "other"] 
        },
        "capacity": { "type": "number", "minimum": 0 },
        "department_id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "skills": { 
          "type": "array", 
          "items": { "type": "string", "maxLength": 100 } 
        },
        "availability": { 
          "type": "string", 
          "enum": ["available", "unavailable", "limited"],
          "default": "available"
        }
      }
    }
  }
}
```

#### Project Schema

```json
{
  "projects": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["id", "name"],
      "properties": {
        "id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "name": { "type": "string", "minLength": 1, "maxLength": 200 },
        "status": { 
          "type": "string", 
          "enum": ["planning", "active", "on_hold", "completed", "cancelled"],
          "default": "planning"
        }
      }
    }
  }
}
```



#### Sprint Schema

```json
{
  "sprints": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["id", "name", "start_date", "end_date", "project_id"],
      "properties": {
        "id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "name": { "type": "string", "minLength": 1, "maxLength": 200 },
        "goal": { "type": "string", "maxLength": 1000 },
        "start_date": { "type": "string", "format": "date-time" },
        "end_date": { "type": "string", "format": "date-time" },
        "status": { 
          "type": "string", 
          "enum": ["planning", "active", "completed", "cancelled"],
          "default": "planning"
        },
        "project_id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "capacity_hours": { "type": "number", "minimum": 0 },
        "capacity_story_points": { "type": "number", "minimum": 0 },
        "actual_velocity_hours": { "type": "number", "minimum": 0 },
        "actual_velocity_story_points": { "type": "number", "minimum": 0 }
      }
    }
  }
}
```

#### Phase Schema

```json
{
  "phases": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["id", "name", "order", "project_id"],
      "properties": {
        "id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "name": { "type": "string", "minLength": 1, "maxLength": 200 },
        "order": { "type": "integer", "minimum": 1 },
        "project_id": { "type": "string", "minLength": 1, "maxLength": 100 }
      }
    }
  }
}
```

#### Workpackage Schema

```json
{
  "workpackages": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["id", "name", "order", "phase_id"],
      "properties": {
        "id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "name": { "type": "string", "minLength": 1, "maxLength": 200 },
        "order": { "type": "integer", "minimum": 1 },
        "phase_id": { "type": "string", "minLength": 1, "maxLength": 100 }
      }
    }
  }
}
```

#### Backlog Schema

```json
{
  "backlogs": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["id", "name", "project_id"],
      "properties": {
        "id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "name": { "type": "string", "minLength": 1, "maxLength": 200 },
        "project_id": { "type": "string", "minLength": 1, "maxLength": 100 }
      }
    }
  }
}
```

#### Milestone Schema

```json
{
  "milestones": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["id", "name", "due_date", "project_id"],
      "properties": {
        "id": { "type": "string", "minLength": 1, "maxLength": 100 },
        "name": { "type": "string", "minLength": 1, "maxLength": 200 },
        "due_date": { "type": "string", "format": "date-time" },
        "status": { 
          "type": "string", 
          "enum": ["pending", "in_progress", "completed", "cancelled"],
          "default": "pending"
        },
        "project_id": { "type": "string", "minLength": 1, "maxLength": 100 }
      }
    }
  }
}
```

#### Extended Relationship Types

```json
{
  "relationships": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["from_id", "to_id", "type"],
      "properties": {
        "from_id": { "type": "string" },
        "to_id": { "type": "string" },
        "type": { 
          "type": "string", 
          "enum": [
            "IMPLEMENTS",
            "TESTED_BY",
            "MITIGATES",
            "DEPENDS_ON",
            "ASSIGNED_TO_SPRINT",
            "IN_BACKLOG",
            "LINKED_TO_DEPARTMENT",
            "ALLOCATED_TO",
            "PARENT_OF",
            "BELONGS_TO"
          ]
        },
        "allocation_percentage": { 
          "type": "number", 
          "minimum": 0, 
          "maximum": 100 
        },
        "lead": { "type": "boolean" }
      }
    }
  }
}
```



### 2. Pydantic Schema Extensions (template.py)

#### New Enumerations

```python
class ResourceType(str, Enum):
    """Resource type enumeration."""
    PERSON = "person"
    MACHINE = "machine"
    EQUIPMENT = "equipment"
    FACILITY = "facility"
    OTHER = "other"

class ResourceAvailability(str, Enum):
    """Resource availability enumeration."""
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    LIMITED = "limited"

class ProjectStatus(str, Enum):
    """Project status enumeration."""
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class SprintStatus(str, Enum):
    """Sprint status enumeration."""
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MilestoneStatus(str, Enum):
    """Milestone status enumeration."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ExtendedRelationshipType(str, Enum):
    """Extended relationship type enumeration."""
    # Existing
    IMPLEMENTS = "IMPLEMENTS"
    TESTED_BY = "TESTED_BY"
    MITIGATES = "MITIGATES"
    DEPENDS_ON = "DEPENDS_ON"
    # New
    ASSIGNED_TO_SPRINT = "ASSIGNED_TO_SPRINT"
    IN_BACKLOG = "IN_BACKLOG"
    LINKED_TO_DEPARTMENT = "LINKED_TO_DEPARTMENT"
    ALLOCATED_TO = "ALLOCATED_TO"
    PARENT_OF = "PARENT_OF"
    BELONGS_TO = "BELONGS_TO"
```

#### New Entity Schemas

```python
class TemplateCompany(BaseModel):
    """Template company schema."""
    id: str = Field(..., description="Template-local company identifier")
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)

class TemplateDepartment(BaseModel):
    """Template department schema."""
    id: str = Field(..., description="Template-local department identifier")
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    manager_user_id: str | None = Field(None, description="Template-local user ID")
    company_id: str = Field(..., description="Template-local company ID")

class TemplateResource(BaseModel):
    """Template resource schema."""
    id: str = Field(..., description="Template-local resource identifier")
    name: str = Field(..., min_length=1, max_length=200)
    type: ResourceType
    capacity: float | None = Field(None, ge=0)
    department_id: str = Field(..., description="Template-local department ID")
    skills: list[str] = Field(default_factory=list)
    availability: ResourceAvailability = Field(default=ResourceAvailability.AVAILABLE)

class TemplateProject(BaseModel):
    """Template project schema."""
    id: str = Field(..., description="Template-local project identifier")
    name: str = Field(..., min_length=1, max_length=200)
    status: ProjectStatus = Field(default=ProjectStatus.PLANNING)

class TemplateSprint(BaseModel):
    """Template sprint schema."""
    id: str = Field(..., description="Template-local sprint identifier")
    name: str = Field(..., min_length=1, max_length=200)
    goal: str | None = Field(None, max_length=1000)
    start_date: datetime
    end_date: datetime
    status: SprintStatus = Field(default=SprintStatus.PLANNING)
    project_id: str = Field(..., description="Template-local project ID")
    capacity_hours: float | None = Field(None, ge=0)
    capacity_story_points: float | None = Field(None, ge=0)
    actual_velocity_hours: float | None = Field(None, ge=0)
    actual_velocity_story_points: float | None = Field(None, ge=0)
    
    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: datetime, info: ValidationInfo) -> datetime:
        """Validate end_date is after start_date."""
        if "start_date" in info.data and v <= info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v

class TemplatePhase(BaseModel):
    """Template phase schema."""
    id: str = Field(..., description="Template-local phase identifier")
    name: str = Field(..., min_length=1, max_length=200)
    order: int = Field(..., ge=1)
    project_id: str = Field(..., description="Template-local project ID")

class TemplateWorkpackage(BaseModel):
    """Template workpackage schema."""
    id: str = Field(..., description="Template-local workpackage identifier")
    name: str = Field(..., min_length=1, max_length=200)
    order: int = Field(..., ge=1)
    phase_id: str = Field(..., description="Template-local phase ID")

class TemplateBacklog(BaseModel):
    """Template backlog schema."""
    id: str = Field(..., description="Template-local backlog identifier")
    name: str = Field(..., min_length=1, max_length=200)
    project_id: str = Field(..., description="Template-local project ID")

class TemplateMilestone(BaseModel):
    """Template milestone schema."""
    id: str = Field(..., description="Template-local milestone identifier")
    name: str = Field(..., min_length=1, max_length=200)
    due_date: datetime
    status: MilestoneStatus = Field(default=MilestoneStatus.PENDING)
    project_id: str = Field(..., description="Template-local project ID")

class TemplateRelationshipExtended(BaseModel):
    """Extended template relationship schema with properties."""
    from_id: str
    to_id: str
    type: ExtendedRelationshipType
    allocation_percentage: float | None = Field(None, ge=0, le=100)
    lead: bool | None = None
    
    @field_validator("allocation_percentage")
    @classmethod
    def validate_allocation(cls, v: float | None, info: ValidationInfo) -> float | None:
        """Validate allocation_percentage is only set for ALLOCATED_TO relationships."""
        if v is not None and info.data.get("type") != ExtendedRelationshipType.ALLOCATED_TO:
            raise ValueError("allocation_percentage can only be set for ALLOCATED_TO relationships")
        return v
    
    @field_validator("lead")
    @classmethod
    def validate_lead(cls, v: bool | None, info: ValidationInfo) -> bool | None:
        """Validate lead is only set for ALLOCATED_TO relationships."""
        if v is not None and info.data.get("type") != ExtendedRelationshipType.ALLOCATED_TO:
            raise ValueError("lead can only be set for ALLOCATED_TO relationships")
        return v
```

#### Updated TemplateDefinition

```python
class TemplateDefinition(BaseModel):
    """Complete template definition schema."""
    metadata: TemplateMetadata
    settings: TemplateSettings = Field(default_factory=TemplateSettings)
    users: list[TemplateUser] = Field(default_factory=list)
    companies: list[TemplateCompany] = Field(default_factory=list)
    departments: list[TemplateDepartment] = Field(default_factory=list)
    resources: list[TemplateResource] = Field(default_factory=list)
    projects: list[TemplateProject] = Field(default_factory=list)
    sprints: list[TemplateSprint] = Field(default_factory=list)
    phases: list[TemplatePhase] = Field(default_factory=list)
    workpackages: list[TemplateWorkpackage] = Field(default_factory=list)
    backlogs: list[TemplateBacklog] = Field(default_factory=list)
    milestones: list[TemplateMilestone] = Field(default_factory=list)
    workitems: TemplateWorkitems = Field(default_factory=TemplateWorkitems)
    relationships: list[TemplateRelationshipExtended] = Field(default_factory=list)
```



### 3. Template Validator Extensions (template_validator.py)

The validator needs to check:
1. All entity references are resolvable
2. Relationship constraints are satisfied
3. Date constraints are valid
4. Enum values are correct
5. Mutual exclusivity constraints (task in sprint XOR backlog)
6. Single-link constraints (workpackage to one department)

#### New Validation Methods

```python
def validate_graph_entity_references(self, template: TemplateDefinition) -> list[ValidationError]:
    """Validate all graph entity references are resolvable."""
    errors = []
    
    # Build ID sets for all entity types
    company_ids = {c.id for c in template.companies}
    department_ids = {d.id for d in template.departments}
    resource_ids = {r.id for r in template.resources}
    project_ids = {p.id for p in template.projects}
    sprint_ids = {s.id for s in template.sprints}
    phase_ids = {ph.id for ph in template.phases}
    workpackage_ids = {wp.id for wp in template.workpackages}
    backlog_ids = {b.id for b in template.backlogs}
    milestone_ids = {m.id for m in template.milestones}
    user_ids = {u.id for u in template.users}
    
    # Validate department.company_id references
    for idx, dept in enumerate(template.departments):
        if dept.company_id not in company_ids:
            errors.append(ValidationError(
                path=f"departments[{idx}].company_id",
                message=f"Company reference '{dept.company_id}' not found",
                value=dept.company_id
            ))
        if dept.manager_user_id and dept.manager_user_id not in user_ids:
            errors.append(ValidationError(
                path=f"departments[{idx}].manager_user_id",
                message=f"User reference '{dept.manager_user_id}' not found",
                value=dept.manager_user_id
            ))
    
    # Validate resource.department_id references
    for idx, res in enumerate(template.resources):
        if res.department_id not in department_ids:
            errors.append(ValidationError(
                path=f"resources[{idx}].department_id",
                message=f"Department reference '{res.department_id}' not found",
                value=res.department_id
            ))
    
    # Validate sprint.project_id references
    for idx, sprint in enumerate(template.sprints):
        if sprint.project_id not in project_ids:
            errors.append(ValidationError(
                path=f"sprints[{idx}].project_id",
                message=f"Project reference '{sprint.project_id}' not found",
                value=sprint.project_id
            ))
    
    # Similar validation for phases, workpackages, backlogs, milestones...
    
    return errors
```



```python
def validate_relationship_constraints(self, template: TemplateDefinition) -> list[ValidationError]:
    """Validate relationship constraints."""
    errors = []
    
    # Track task assignments to sprints and backlogs
    task_sprint_assignments = {}
    task_backlog_assignments = {}
    workpackage_department_links = {}
    
    for idx, rel in enumerate(template.relationships):
        # Validate ASSIGNED_TO_SPRINT and IN_BACKLOG mutual exclusivity
        if rel.type == ExtendedRelationshipType.ASSIGNED_TO_SPRINT:
            if rel.from_id in task_backlog_assignments:
                errors.append(ValidationError(
                    path=f"relationships[{idx}]",
                    message=f"Task '{rel.from_id}' cannot be in both sprint and backlog",
                    value=f"{rel.from_id} -> {rel.to_id}"
                ))
            task_sprint_assignments[rel.from_id] = rel.to_id
        
        elif rel.type == ExtendedRelationshipType.IN_BACKLOG:
            if rel.from_id in task_sprint_assignments:
                errors.append(ValidationError(
                    path=f"relationships[{idx}]",
                    message=f"Task '{rel.from_id}' cannot be in both sprint and backlog",
                    value=f"{rel.from_id} -> {rel.to_id}"
                ))
            task_backlog_assignments[rel.from_id] = rel.to_id
        
        # Validate LINKED_TO_DEPARTMENT single-link constraint
        elif rel.type == ExtendedRelationshipType.LINKED_TO_DEPARTMENT:
            if rel.from_id in workpackage_department_links:
                errors.append(ValidationError(
                    path=f"relationships[{idx}]",
                    message=f"Workpackage '{rel.from_id}' can only link to one department",
                    value=f"{rel.from_id} -> {rel.to_id}"
                ))
            workpackage_department_links[rel.from_id] = rel.to_id
        
        # Validate ALLOCATED_TO has required properties
        elif rel.type == ExtendedRelationshipType.ALLOCATED_TO:
            if rel.allocation_percentage is None:
                errors.append(ValidationError(
                    path=f"relationships[{idx}].allocation_percentage",
                    message="ALLOCATED_TO relationships must specify allocation_percentage",
                    value=None
                ))
    
    return errors
```



### 4. Template Service Extensions (template_service.py)

The service needs new methods to apply graph entities in the correct order.

#### Application Order

```python
async def apply_template(self, name: str, dry_run: bool = False) -> ApplicationResult:
    """Apply template with extended entity support."""
    # ... validation ...
    
    all_results = []
    
    # Step 1: Apply users (existing)
    user_results, user_map = await self._apply_users(...)
    all_results.extend(user_results)
    
    # Step 2: Apply companies
    company_results, company_map = await self._apply_companies(...)
    all_results.extend(company_results)
    
    # Step 3: Apply departments
    dept_results, dept_map = await self._apply_departments(...)
    all_results.extend(dept_results)
    
    # Step 4: Apply resources
    resource_results, resource_map = await self._apply_resources(...)
    all_results.extend(resource_results)
    
    # Step 5: Apply projects
    project_results, project_map = await self._apply_projects(...)
    all_results.extend(project_results)
    
    # Step 6: Apply phases
    phase_results, phase_map = await self._apply_phases(...)
    all_results.extend(phase_results)
    
    # Step 7: Apply workpackages
    wp_results, wp_map = await self._apply_workpackages(...)
    all_results.extend(wp_results)
    
    # Step 8: Apply sprints
    sprint_results, sprint_map = await self._apply_sprints(...)
    all_results.extend(sprint_results)
    
    # Step 9: Apply backlogs
    backlog_results, backlog_map = await self._apply_backlogs(...)
    all_results.extend(backlog_results)
    
    # Step 10: Apply milestones
    milestone_results, milestone_map = await self._apply_milestones(...)
    all_results.extend(milestone_results)
    
    # Step 11: Apply workitems (existing)
    workitem_results, workitem_map = await self._apply_workitems(...)
    all_results.extend(workitem_results)
    
    # Step 12: Apply relationships (existing, extended)
    relationship_results = await self._apply_relationships(...)
    all_results.extend(relationship_results)
    
    # ... calculate summary ...
```



#### Example Application Method

```python
async def _apply_companies(
    self,
    companies: list[TemplateCompany],
    template_name: str,
    dry_run: bool = False,
) -> tuple[list[EntityResult], dict[str, UUID]]:
    """Apply companies from template to graph database."""
    results = []
    company_map = {}
    
    for company in companies:
        try:
            # Generate deterministic UUID
            company_uuid = self._generate_deterministic_uuid(template_name, company.id)
            company_uuid_str = str(company_uuid)
            
            # Check if company already exists
            existing = await self.graph_service.get_node(company_uuid_str)
            if existing:
                logger.warning(f"Company '{company_uuid_str}' already exists, skipping")
                results.append(EntityResult(
                    id=company.id,
                    type="company",
                    status="skipped",
                    message=f"Company already exists"
                ))
                company_map[company.id] = company_uuid
                continue
            
            if dry_run:
                logger.info(f"[DRY RUN] Would create company: {company.name}")
                results.append(EntityResult(
                    id=company.id,
                    type="company",
                    status="created",
                    message=f"[DRY RUN] Would create company '{company.name}'"
                ))
                company_map[company.id] = company_uuid
                continue
            
            # Build properties
            properties = {
                "id": company_uuid_str,
                "name": company.name,
                "created_at": datetime.now(UTC).isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
            }
            if company.description:
                properties["description"] = company.description
            
            # Create company node
            await self.graph_service.create_node("Company", properties)
            
            logger.info(f"Created company: {company.name}")
            results.append(EntityResult(
                id=company.id,
                type="company",
                status="created",
                message=f"Created company '{company.name}'"
            ))
            company_map[company.id] = company_uuid
            
        except Exception as e:
            logger.error(f"Failed to create company '{company.id}': {e}")
            results.append(EntityResult(
                id=company.id,
                type="company",
                status="failed",
                message=f"Failed to create company: {str(e)}"
            ))
    
    return results, company_map
```



## Data Models

### Graph Database Node Labels

All graph entities are stored as nodes in Apache AGE with specific labels:

- **Company** - Top-level organization node
- **Department** - Organizational unit node
- **Resource** - Resource node (person, machine, equipment, facility, other)
- **Project** - Project container node
- **Sprint** - Sprint node
- **Phase** - Project phase node
- **Workpackage** - Work package node
- **Backlog** - Product backlog node
- **Milestone** - Milestone node
- **WorkItem** - Existing workitem node (requirement, task, test, risk)

### Graph Database Relationship Types

- **PARENT_OF** - Company → Department
- **BELONGS_TO** - Resource → Department, Sprint → Project, Phase → Project, Workpackage → Phase, Milestone → Project, Backlog → Project
- **LINKED_TO_DEPARTMENT** - Workpackage → Department (single link constraint)
- **ASSIGNED_TO_SPRINT** - Task → Sprint (mutually exclusive with IN_BACKLOG)
- **IN_BACKLOG** - Task → Backlog (mutually exclusive with ASSIGNED_TO_SPRINT)
- **ALLOCATED_TO** - Resource → Project or Task (with allocation_percentage and lead properties)
- **IMPLEMENTS** - Task → Requirement (existing)
- **TESTED_BY** - Requirement → Test (existing)
- **MITIGATES** - Requirement → Risk (existing)
- **DEPENDS_ON** - WorkItem → WorkItem (existing)

### Entity Property Mappings

#### Company Properties
- `id` (UUID string) - Deterministic UUID
- `name` (string) - Company name
- `description` (string, optional) - Company description
- `created_at` (ISO datetime string) - Auto-generated
- `updated_at` (ISO datetime string) - Auto-generated

#### Department Properties
- `id` (UUID string) - Deterministic UUID
- `name` (string) - Department name
- `description` (string, optional) - Department description
- `manager_user_id` (UUID string, optional) - Reference to User
- `company_id` (UUID string) - Reference to Company (for validation)
- `created_at` (ISO datetime string) - Auto-generated

#### Resource Properties
- `id` (UUID string) - Deterministic UUID
- `name` (string) - Resource name
- `type` (enum string) - person, machine, equipment, facility, other
- `capacity` (float, optional) - Resource capacity
- `department_id` (UUID string) - Reference to Department (for validation)
- `skills` (JSON array of strings) - Resource skills
- `availability` (enum string) - available, unavailable, limited
- `created_at` (ISO datetime string) - Auto-generated

#### Project Properties
- `id` (UUID string) - Deterministic UUID
- `name` (string) - Project name
- `status` (enum string) - planning, active, on_hold, completed, cancelled
- `created_at` (ISO datetime string) - Auto-generated
- `updated_at` (ISO datetime string) - Auto-generated

#### Sprint Properties
- `id` (UUID string) - Deterministic UUID
- `name` (string) - Sprint name
- `goal` (string, optional) - Sprint goal
- `start_date` (ISO datetime string) - Sprint start date
- `end_date` (ISO datetime string) - Sprint end date (must be after start_date)
- `status` (enum string) - planning, active, completed, cancelled
- `project_id` (UUID string) - Reference to Project (for validation)
- `capacity_hours` (float, optional) - Sprint capacity in hours
- `capacity_story_points` (float, optional) - Sprint capacity in story points
- `actual_velocity_hours` (float, optional) - Actual velocity in hours
- `actual_velocity_story_points` (float, optional) - Actual velocity in story points
- `created_at` (ISO datetime string) - Auto-generated
- `updated_at` (ISO datetime string) - Auto-generated

#### Phase Properties
- `id` (UUID string) - Deterministic UUID
- `name` (string) - Phase name
- `order` (integer) - Phase order (must be >= 1)
- `project_id` (UUID string) - Reference to Project (for validation)
- `created_at` (ISO datetime string) - Auto-generated

#### Workpackage Properties
- `id` (UUID string) - Deterministic UUID
- `name` (string) - Workpackage name
- `order` (integer) - Workpackage order (must be >= 1)
- `phase_id` (UUID string) - Reference to Phase (for validation)
- `created_at` (ISO datetime string) - Auto-generated

#### Backlog Properties
- `id` (UUID string) - Deterministic UUID
- `name` (string) - Backlog name
- `project_id` (UUID string) - Reference to Project (for validation)
- `created_at` (ISO datetime string) - Auto-generated

#### Milestone Properties
- `id` (UUID string) - Deterministic UUID
- `name` (string) - Milestone name
- `due_date` (ISO datetime string) - Milestone due date
- `status` (enum string) - pending, in_progress, completed, cancelled
- `project_id` (UUID string) - Reference to Project (for validation)
- `created_at` (ISO datetime string) - Auto-generated



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Project Management Entity Creation

*For any* valid template containing project management entities (Projects, Sprints, Phases, Workpackages, Backlogs, Milestones), when the template is applied, all entities should be created in the graph database with correct properties and BELONGS_TO relationships to their parent entities.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

### Property 2: Organizational Entity Creation

*For any* valid template containing organizational entities (Companies, Departments, Resources), when the template is applied, all entities should be created in the graph database with correct properties, PARENT_OF relationships from companies to departments, and BELONGS_TO relationships from resources to departments.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: User Reference Validation

*For any* template where a Department references a manager_user_id, validation should fail if the referenced user does not exist in the template's user list.

**Validates: Requirements 2.6**

### Property 4: Sprint and Backlog Assignment

*For any* valid template containing task-sprint or task-backlog assignments, when the template is applied, the corresponding ASSIGNED_TO_SPRINT or IN_BACKLOG relationships should be created in the graph database.

**Validates: Requirements 3.1, 3.2**

### Property 5: Task Assignment Mutual Exclusivity

*For any* template, if a task is assigned to both a sprint and a backlog, validation should fail with an error indicating the mutual exclusivity constraint violation.

**Validates: Requirements 3.3**

### Property 6: Sprint and Backlog Reference Validation

*For any* template containing sprint or backlog assignments, validation should fail if the referenced sprint, backlog, or task entities do not exist in the template.

**Validates: Requirements 3.5**

### Property 7: Workpackage-Department Linking

*For any* valid template containing workpackage-department links, when the template is applied, the corresponding LINKED_TO_DEPARTMENT relationships should be created in the graph database.

**Validates: Requirements 4.1**

### Property 8: Workpackage Single Department Constraint

*For any* template, if a workpackage is linked to multiple departments, validation should fail with an error indicating the single-link constraint violation.

**Validates: Requirements 4.2**

### Property 9: Workpackage-Department Reference Validation

*For any* template containing workpackage-department links, validation should fail if the referenced workpackage or department entities do not exist in the template.

**Validates: Requirements 4.3**

### Property 10: Resource Allocation Creation

*For any* valid template containing resource allocations to projects or tasks, when the template is applied, the corresponding ALLOCATED_TO relationships should be created with correct allocation_percentage and lead properties.

**Validates: Requirements 5.1, 5.2**

### Property 11: Allocation Percentage Validation

*For any* template containing resource allocations, validation should fail if allocation_percentage is not between 0 and 100.

**Validates: Requirements 5.3**

### Property 12: Resource Allocation Reference Validation

*For any* template containing resource allocations, validation should fail if the referenced resource, project, or task entities do not exist in the template.

**Validates: Requirements 5.4**

### Property 13: Deterministic UUID Generation

*For any* template name and entity ID, generating the UUID multiple times should produce identical results (idempotent UUID generation).

**Validates: Requirements 6.1**

### Property 14: Template Application Idempotency

*For any* valid template, applying it multiple times should skip existing entities on subsequent applications and produce the same final database state.

**Validates: Requirements 6.3**

### Property 15: Schema Validation

*For any* template with invalid structure (missing required fields, wrong types, etc.), validation should fail with errors indicating the structural problems.

**Validates: Requirements 7.1**

### Property 16: Entity Reference Validation

*For any* template with unresolvable entity references (e.g., department referencing non-existent company), validation should fail with errors indicating the missing references.

**Validates: Requirements 7.2**

### Property 17: Relationship Constraint Validation

*For any* template violating relationship constraints (e.g., task in both sprint and backlog, workpackage linked to multiple departments), validation should fail with errors indicating the constraint violations.

**Validates: Requirements 7.3**

### Property 18: Date Constraint Validation

*For any* template with invalid date constraints (e.g., sprint end_date before start_date), validation should fail with errors indicating the date problems.

**Validates: Requirements 7.4**

### Property 19: Comprehensive Error Collection

*For any* template with multiple validation errors, validation should return all errors, not just the first one.

**Validates: Requirements 7.6**

### Property 20: Backward Compatibility

*For any* existing template without graph entities, applying it should succeed without errors (backward compatibility maintained).

**Validates: Requirements 9.1**

### Property 21: Entity Creation Order

*For any* valid template, entities should be created in the correct dependency order: Users, Companies, Departments, Resources, Projects, Phases, Workpackages, Sprints, Backlogs, Milestones, WorkItems, Relationships.

**Validates: Requirements 10.1**

### Property 22: Relationship Type Support

*For any* valid template containing relationships of any supported type (IMPLEMENTS, TESTED_BY, MITIGATES, DEPENDS_ON, ASSIGNED_TO_SPRINT, IN_BACKLOG, LINKED_TO_DEPARTMENT, ALLOCATED_TO, PARENT_OF, BELONGS_TO), when the template is applied, all relationships should be created correctly.

**Validates: Requirements 11.1-11.11**

### Property 23: Sprint Date Validation

*For any* template containing sprints, validation should fail if any sprint's start_date is not before its end_date.

**Validates: Requirements 12.1**

### Property 24: Property Validation

*For any* template containing entities with constrained properties (sprint status, resource type, resource availability, milestone status, phase order, workpackage order, allocation percentage), validation should fail if any property violates its constraints.

**Validates: Requirements 12.2-12.10**

### Property 25: Modular Template Composition

*For any* set of valid modular templates, applying all templates should create entities from all templates without conflicts.

**Validates: Requirements 13.1**

### Property 26: Cross-Template Entity References

*For any* template referencing entities from another template using the same template name and entity ID, the deterministic UUID generation should produce identical UUIDs, enabling cross-template references.

**Validates: Requirements 13.2**

### Property 27: Flexible Application Order

*For any* set of modular templates with satisfied dependencies, applying them in any order should produce the same final database state.

**Validates: Requirements 13.4**



## Error Handling

### Validation Errors

All validation errors follow a consistent format:
- **path**: JSON path to the invalid field (e.g., "sprints[0].end_date")
- **message**: Human-readable error message explaining the problem
- **value**: The invalid value (optional, for debugging)

### Error Categories

1. **Schema Validation Errors**
   - Missing required fields
   - Wrong data types
   - Value out of range
   - Invalid enum values
   - Pattern mismatch

2. **Reference Validation Errors**
   - Entity reference not found (e.g., "Company reference 'acme-corp' not found")
   - User reference not found
   - Cross-entity reference not found

3. **Constraint Validation Errors**
   - Date constraint violation (e.g., "end_date must be after start_date")
   - Mutual exclusivity violation (e.g., "Task cannot be in both sprint and backlog")
   - Single-link constraint violation (e.g., "Workpackage can only link to one department")
   - Allocation percentage out of range

4. **Application Errors**
   - Database connection failure
   - Graph query execution failure
   - Transaction rollback

### Error Recovery

- **Validation Phase**: All errors collected and returned before any database operations
- **Application Phase**: Entities created in order; if one fails, subsequent entities are skipped
- **Idempotency**: Failed applications can be retried safely; existing entities are skipped
- **Dry Run Mode**: Test template application without making changes

### Logging

- **INFO**: Successful entity creation, skipped entities
- **WARNING**: Skipped entities (already exist), validation warnings
- **ERROR**: Failed entity creation, validation errors, database errors



## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific scenarios and property-based tests for comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, and error conditions
- **Property Tests**: Verify universal properties across all inputs

### Unit Testing

Unit tests focus on:
- **Specific Examples**: Test template application with known inputs and expected outputs
- **Edge Cases**: Empty templates, minimal templates, maximum-size templates
- **Error Conditions**: Invalid references, constraint violations, malformed YAML
- **Integration Points**: Database operations, graph service calls, validation flow

Example unit tests:
- Test applying a template with a single company
- Test applying a template with invalid company reference in department
- Test applying a template with sprint end_date before start_date
- Test applying a template with task in both sprint and backlog
- Test backward compatibility with existing templates

### Property-Based Testing

Property tests verify universal properties using randomized inputs (minimum 100 iterations per test):

#### Property Test Configuration
- **Library**: Hypothesis (Python)
- **Iterations**: Minimum 100 per property test
- **Tag Format**: `# Feature: template-graph-entities, Property {number}: {property_text}`

#### Property Test Examples

**Property 1: Project Management Entity Creation**
```python
@given(
    projects=st.lists(st.builds(TemplateProject, ...)),
    sprints=st.lists(st.builds(TemplateSprint, ...)),
    phases=st.lists(st.builds(TemplatePhase, ...)),
)
@settings(max_examples=100)
def test_project_management_entity_creation(projects, sprints, phases):
    """
    Feature: template-graph-entities, Property 1: For any valid template 
    containing project management entities, all entities should be created 
    with correct properties and relationships.
    """
    # Generate template with entities
    template = create_template(projects=projects, sprints=sprints, phases=phases)
    
    # Apply template
    result = apply_template(template)
    
    # Verify all entities created
    assert all_entities_created(result, projects, sprints, phases)
    assert all_relationships_created(result, sprints, phases)
```

**Property 13: Deterministic UUID Generation**
```python
@given(
    template_name=st.text(min_size=1, max_size=50),
    entity_id=st.text(min_size=1, max_size=100),
)
@settings(max_examples=100)
def test_deterministic_uuid_generation(template_name, entity_id):
    """
    Feature: template-graph-entities, Property 13: For any template name 
    and entity ID, generating the UUID multiple times should produce 
    identical results.
    """
    uuid1 = generate_deterministic_uuid(template_name, entity_id)
    uuid2 = generate_deterministic_uuid(template_name, entity_id)
    
    assert uuid1 == uuid2
```

**Property 5: Task Assignment Mutual Exclusivity**
```python
@given(
    task=st.builds(TemplateTask, ...),
    sprint=st.builds(TemplateSprint, ...),
    backlog=st.builds(TemplateBacklog, ...),
)
@settings(max_examples=100)
def test_task_assignment_mutual_exclusivity(task, sprint, backlog):
    """
    Feature: template-graph-entities, Property 5: For any template, if a 
    task is assigned to both a sprint and a backlog, validation should fail.
    """
    # Create template with task assigned to both sprint and backlog
    template = create_template(
        tasks=[task],
        sprints=[sprint],
        backlogs=[backlog],
        relationships=[
            TemplateRelationship(from_id=task.id, to_id=sprint.id, type="ASSIGNED_TO_SPRINT"),
            TemplateRelationship(from_id=task.id, to_id=backlog.id, type="IN_BACKLOG"),
        ]
    )
    
    # Validate template
    result = validate_template(template)
    
    # Should fail with mutual exclusivity error
    assert not result.valid
    assert any("mutual exclusivity" in err.message.lower() for err in result.errors)
```

### Integration Testing

Integration tests verify end-to-end flows:
- Apply complete template with all entity types
- Apply modular templates in sequence
- Test cross-template entity references
- Test template application with existing entities (idempotency)
- Test dry-run mode

### Test Coverage Requirements

- **Minimum Coverage**: 80% code coverage
- **Critical Paths**: 100% coverage for validation logic, UUID generation, entity creation
- **Property Tests**: All 27 correctness properties implemented as property-based tests
- **Unit Tests**: All error conditions and edge cases covered

### Test Organization

```
backend/tests/
├── test_template_parser.py          # Parser unit tests
├── test_template_validator.py       # Validator unit tests
├── test_template_service.py         # Service unit tests
├── test_template_properties.py      # Property-based tests
└── integration/
    └── test_template_integration.py # End-to-end integration tests
```


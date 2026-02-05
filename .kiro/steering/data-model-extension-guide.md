# RxDx Data Model Extension Guide

This document provides comprehensive guidance for extending data models in the RxDx project management system. Follow these patterns to ensure consistency across the entire stack from database to UI.

## Overview

Data model extensions in RxDx involve changes across multiple layers:

1. **Template System** - YAML schema and validation
2. **Backend Models** - SQLAlchemy/Graph database models
3. **Backend Schemas** - Pydantic validation schemas
4. **Backend Services** - Business logic and data handling
5. **Backend API** - REST endpoints
6. **Frontend Types** - TypeScript interfaces
7. **Frontend Services** - API client methods
8. **Frontend Components** - UI forms and displays

## Extension Workflow

When adding a new field or extending an existing data model, follow this sequence:

```
1. Template Schema → 2. Backend Model → 3. Pydantic Schema → 4. Service Layer → 
5. API Endpoints → 6. Frontend Types → 7. Frontend Service → 8. UI Components
```

---

## 1. Template System Extensions

### 1.1 Update JSON Schema

**Location**: `backend/templates/schema.json`

Add new fields to the appropriate workitem type definition:

```json
{
  "workitems": {
    "requirements": {
      "items": {
        "properties": {
          "new_field": {
            "type": "string",
            "description": "Description of the new field",
            "minLength": 1,
            "maxLength": 200
          }
        }
      }
    }
  }
}
```

**Field Definition Rules**:
- Always include `type` and `description`
- Add validation constraints (`minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `enum`)
- Use appropriate JSON Schema types: `string`, `number`, `integer`, `boolean`, `array`, `object`
- Mark required fields in the parent `required` array
- Use `format` for special types: `"format": "email"`, `"format": "date-time"`

### 1.2 Update Template Validator

**Location**: `backend/app/services/template_validator.py`

Add validation logic in the `validate_constraints` method:

```python
def validate_constraints(self, template: TemplateDefinition) -> list[ValidationError]:
    """Validate field constraints"""
    errors = []
    
    # Validate new field in requirements
    for idx, req in enumerate(template.workitems.requirements):
        if hasattr(req, 'new_field') and req.new_field:
            # Add custom validation logic
            if len(req.new_field) < 5:
                errors.append(
                    ValidationError(
                        path=f"workitems.requirements[{idx}].new_field",
                        message="New field must be at least 5 characters",
                        value=req.new_field,
                    )
                )
    
    return errors
```

**Validation Patterns**:
- ✅ **DO**: Validate business rules not expressible in JSON Schema
- ✅ **DO**: Collect all errors before returning (don't fail fast)
- ✅ **DO**: Provide clear error messages with field paths
- ✅ **DO**: Include the invalid value in error messages
- ❌ **DON'T**: Duplicate validations already in JSON Schema
- ❌ **DON'T**: Raise exceptions - return ValidationError objects

### 1.3 Update Template Examples

**Location**: `backend/templates/default.yaml`, `backend/templates/medical-device.yaml`

Add the new field to example workitems:

```yaml
workitems:
  requirements:
    - id: "10000000-0000-0000-0000-000000000001"
      title: User Authentication System
      new_field: "Example value for the new field"
      # ... other fields
```

---

## 2. Backend Model Extensions

### 2.1 Graph Database Properties

**Location**: `backend/app/services/workitem_service.py`

For graph database storage, add properties in the `create_workitem` method:

```python
async def create_workitem(
    self,
    workitem_data: WorkItemCreate,
    current_user: User
) -> WorkItemResponse:
    # Prepare node properties
    properties = {
        "id": workitem_id,
        "type": workitem_data.type,
        # ... existing properties
    }
    
    # Add new field if present
    if hasattr(workitem_data, 'new_field'):
        properties["new_field"] = workitem_data.new_field
    
    # Create the WorkItem node
    await self.graph_service.create_workitem_node(
        workitem_id=workitem_id,
        workitem_type=workitem_data.type,
        **properties
    )
```

**Also update** the `update_workitem` method:

```python
async def update_workitem(
    self,
    workitem_id: UUID,
    updates: WorkItemUpdate,
    current_user: User,
    change_description: str = "WorkItem updated"
) -> WorkItemResponse | None:
    # Prepare update data
    update_data = {}
    
    # Add new field update if present
    if hasattr(updates, 'new_field') and updates.new_field is not None:
        update_data["new_field"] = updates.new_field
    
    # ... rest of update logic
```

### 2.2 SQLAlchemy Models (if applicable)

**Location**: `backend/app/models/[model_name].py`

For relational database models, add columns:

```python
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID

class MyModel(Base):
    """Model description"""
    
    __tablename__ = "my_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    new_field = Column(String(200), nullable=True)
    
    def __repr__(self) -> str:
        return f"<MyModel(id={self.id}, new_field={self.new_field})>"
```

**Column Definition Rules**:
- Use appropriate SQLAlchemy types: `String`, `Integer`, `Boolean`, `DateTime`, `JSON`
- Specify length constraints: `String(200)`
- Set `nullable=True` for optional fields, `nullable=False` for required
- Add `index=True` for frequently queried fields
- Use `default` or `server_default` for default values
- Add foreign keys with `ForeignKey("table.column", ondelete="CASCADE")`

---

## 3. Pydantic Schema Extensions

### 3.1 Base Schema

**Location**: `backend/app/schemas/workitem.py` (or appropriate schema file)

Add field to the base schema:

```python
from pydantic import BaseModel, Field, field_validator

class RequirementBase(WorkItemBase):
    """Base schema for Requirement WorkItems"""
    
    # Existing fields
    acceptance_criteria: str | None = Field(None, description="Acceptance criteria")
    
    # New field
    new_field: str | None = Field(
        None,
        min_length=5,
        max_length=200,
        description="Description of the new field"
    )
    
    @field_validator("new_field")
    @classmethod
    def validate_new_field(cls, v: str | None) -> str | None:
        """Validate new field content"""
        if v is None:
            return v
        
        v = v.strip()
        if not v:
            return None
        
        if len(v) < 5:
            raise ValueError("New field must be at least 5 characters long")
        
        if len(v) > 200:
            raise ValueError("New field cannot exceed 200 characters")
        
        # Check for prohibited placeholder text
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        v_upper = v.upper()
        for pattern in prohibited_patterns:
            if pattern in v_upper:
                raise ValueError(f"New field cannot contain placeholder text: {pattern}")
        
        return v
```

### 3.2 Create Schema

Add field to create schema:

```python
class RequirementCreate(RequirementBase):
    """Schema for creating a new Requirement"""
    
    type: Literal["requirement"] = "requirement"
    # new_field is inherited from RequirementBase
```

### 3.3 Update Schema

Add field to update schema:

```python
class RequirementUpdate(BaseModel):
    """Schema for updating a Requirement"""
    
    title: str | None = Field(None, min_length=1, max_length=500)
    # ... other fields
    
    new_field: str | None = None
    
    @field_validator("new_field")
    @classmethod
    def validate_new_field(cls, v: str | None) -> str | None:
        """Validate new field if provided"""
        if v is None:
            return v
        
        if v:  # Only validate if not empty string
            field_value = v.strip()
            if len(field_value) < 5:
                raise ValueError("New field must be at least 5 characters long")
            
            if len(field_value) > 200:
                raise ValueError("New field cannot exceed 200 characters")
            
            return field_value
        
        return v
```

### 3.4 Response Schema

Add field to response schema:

```python
class RequirementResponse(RequirementBase):
    """Schema for Requirement response"""
    
    id: UUID
    type: str
    version: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool = False
    # new_field is inherited from RequirementBase
    
    model_config = {"from_attributes": True}
```

**Pydantic Best Practices**:
- ✅ **DO**: Use `Field()` for validation constraints and descriptions
- ✅ **DO**: Use `field_validator` for complex validation logic
- ✅ **DO**: Make fields optional with `| None` for nullable fields
- ✅ **DO**: Provide clear validation error messages
- ✅ **DO**: Use `Literal` types for fixed string values
- ✅ **DO**: Set `model_config = {"from_attributes": True}` for ORM models
- ❌ **DON'T**: Use `Any` type - always specify concrete types
- ❌ **DON'T**: Skip validation - validate all user inputs

---

## 4. Service Layer Extensions

### 4.1 Update Service Methods

**Location**: `backend/app/services/workitem_service.py`

The service layer handles the new field automatically if you've updated the schemas and the `create_workitem`/`update_workitem` methods as shown in section 2.1.

**Verify these methods handle the new field**:
- `create_workitem()` - Creates workitem with new field
- `update_workitem()` - Updates workitem with new field
- `_graph_data_to_response()` - Converts graph data to response (may need updates)

### 4.2 Add Business Logic (if needed)

If the new field requires special business logic:

```python
async def validate_new_field_business_rules(
    self,
    workitem_id: UUID,
    new_field_value: str
) -> bool:
    """
    Validate business rules for new field.
    
    Args:
        workitem_id: WorkItem UUID
        new_field_value: Value to validate
    
    Returns:
        True if valid, raises ValueError if invalid
    """
    # Example: Check uniqueness
    existing = await self.graph_service.search_workitems(
        search_text=new_field_value,
        limit=1
    )
    
    if existing and existing[0]["id"] != str(workitem_id):
        raise ValueError(f"New field value '{new_field_value}' already exists")
    
    return True
```

---

## 5. API Endpoint Extensions

### 5.1 Update Endpoint Schemas

**Location**: `backend/app/api/v1/workitems.py` (or appropriate endpoint file)

Endpoints automatically handle new fields if Pydantic schemas are updated. Verify:

```python
@router.post(
    "/workitems",
    response_model=WorkItemResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_workitem(
    data: WorkItemCreate,  # Includes new field from schema
    current_user: User = Depends(get_current_user),
    service: WorkItemService = Depends(get_workitem_service)
) -> WorkItemResponse:
    """Create a new workitem"""
    return await service.create_workitem(data, current_user)
```

### 5.2 Add Filtering (if needed)

If the new field should be filterable:

```python
@router.get("/workitems", response_model=list[WorkItemResponse])
async def list_workitems(
    type: WorkItemType | None = None,
    status: WorkItemStatus | None = None,
    new_field: str | None = None,  # Add new filter parameter
    service: WorkItemService = Depends(get_workitem_service)
) -> list[WorkItemResponse]:
    """List workitems with filters"""
    return await service.search_workitems(
        workitem_type=type,
        status=status,
        new_field=new_field  # Pass to service
    )
```

### 5.3 Update API Documentation

Add field documentation in the endpoint docstring:

```python
async def create_workitem(
    data: WorkItemCreate,
    current_user: User = Depends(get_current_user)
) -> WorkItemResponse:
    """
    Create a new workitem.
    
    Args:
        data: Workitem creation data including:
            - title: Workitem title (required)
            - description: Detailed description (optional)
            - new_field: New field description (optional)
        current_user: Authenticated user
    
    Returns:
        Created workitem with metadata
    
    Raises:
        HTTPException: 400 if validation fails
        HTTPException: 401 if not authenticated
    """
```

---

## 6. Frontend Type Extensions

### 6.1 Update TypeScript Interfaces

**Location**: `frontend/src/types/index.ts` or `frontend/src/services/workitemService.ts`

Add field to TypeScript interface:

```typescript
export interface WorkItem {
  id: string;
  type: 'requirement' | 'task' | 'test' | 'risk' | 'document';
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  priority?: number;
  assignedTo?: string;
  version: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isSigned: boolean;
  
  // New field
  newField?: string;
}
```

### 6.2 Update Create/Update Interfaces

```typescript
export interface WorkItemCreate {
  type: WorkItemType;
  title: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: number;
  assigned_to?: string;
  
  // New field
  newField?: string;
}

export interface WorkItemUpdate {
  title?: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: number;
  assigned_to?: string;
  
  // New field
  newField?: string;
}
```

**TypeScript Best Practices**:
- ✅ **DO**: Use optional fields with `?` for nullable values
- ✅ **DO**: Use union types for enums: `'draft' | 'active' | 'completed'`
- ✅ **DO**: Use `string` for dates (ISO format from API)
- ✅ **DO**: Match backend field names (use snake_case if backend uses it)
- ✅ **DO**: Export all interfaces for reuse
- ❌ **DON'T**: Use `any` type - always specify concrete types
- ❌ **DON'T**: Use `undefined` - use optional `?` instead

---

## 7. Frontend Service Extensions

### 7.1 Update Service Methods

**Location**: `frontend/src/services/workitemService.ts`

Service methods automatically handle new fields if interfaces are updated. Verify the service passes data correctly:

```typescript
class WorkItemService {
  async create(data: WorkItemCreate): Promise<WorkItem> {
    try {
      // Data includes newField automatically
      const response = await apiClient.post<WorkItem>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
  
  async update(id: string, data: WorkItemUpdate): Promise<WorkItem> {
    try {
      // Data includes newField automatically
      const response = await apiClient.patch<WorkItem>(
        `${this.basePath}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
}
```

### 7.2 Add Field-Specific Methods (if needed)

If the new field requires special handling:

```typescript
class WorkItemService {
  async validateNewField(value: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ valid: boolean }>(
        `${this.basePath}/validate-new-field`,
        { value }
      );
      return response.data.valid;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
}
```

---

## 8. UI Component Extensions

### 8.1 Update Form Component

**Location**: `frontend/src/components/workitems/WorkItemForm.tsx`

Add field to form data interface:

```typescript
interface FormData {
  type: WorkItemType;
  title: string;
  description: string;
  status: WorkItemStatus;
  priority: string;
  assigned_to: string;
  
  // New field
  newField: string;
}
```

Update initial form data:

```typescript
const initialFormData: FormData = {
  type: 'requirement',
  title: '',
  description: '',
  status: 'draft',
  priority: '',
  assigned_to: '',
  
  // New field
  newField: '',
};
```

Update form data initialization from existing item:

```typescript
const [formData, setFormData] = useState<FormData>(() => {
  if (item) {
    return {
      type: item.type,
      title: item.title,
      description: item.description || '',
      status: item.status,
      priority: item.priority?.toString() || '',
      assigned_to: item.assigned_to || '',
      
      // New field
      newField: item.newField || '',
    };
  }
  return {
    ...initialFormData,
    type: defaultType || 'requirement',
  };
});
```

### 8.2 Add Form Field

Add input field to the form JSX:

```tsx
<Input
  name="newField"
  label="New Field"
  value={formData.newField}
  onChange={handleChange}
  onBlur={handleBlur}
  error={touched.has('newField') ? errors.newField : undefined}
  placeholder="Enter new field value"
  maxLength={200}
  hint="Optional field for additional information"
/>
```

### 8.3 Add Validation

Add validation logic:

```typescript
const validateField = useCallback((name: keyof FormData, value: string): string | undefined => {
  switch (name) {
    case 'title':
      if (!value.trim()) {
        return 'Title is required';
      }
      if (value.length > 500) {
        return 'Title must be 500 characters or less';
      }
      break;
    
    // New field validation
    case 'newField':
      if (value && value.length < 5) {
        return 'New field must be at least 5 characters';
      }
      if (value.length > 200) {
        return 'New field must be 200 characters or less';
      }
      break;
  }
  return undefined;
}, []);
```

### 8.4 Update Submit Handler

Update create/update data preparation:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }

  try {
    let result: WorkItem;
    
    if (isEditing && item) {
      const updateData: WorkItemUpdate = {
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status,
        priority: formData.priority ? parseInt(formData.priority) : undefined,
        assigned_to: formData.assigned_to || undefined,
        
        // New field
        newField: formData.newField || undefined,
      };
      result = await updateItem(item.id, updateData);
    } else {
      const createData: WorkItemCreate = {
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status,
        priority: formData.priority ? parseInt(formData.priority) : undefined,
        assigned_to: formData.assigned_to || undefined,
        
        // New field
        newField: formData.newField || undefined,
      };
      result = await createItem(createData);
    }
    
    onSuccess?.(result);
  } catch {
    // Error is handled by the store
  }
};
```

### 8.5 Update Display Components

**Location**: `frontend/src/components/workitems/WorkItemDetail.tsx`

Add field to detail view:

```tsx
<div className="detail-section">
  <h3>New Field</h3>
  <p>{workitem.newField || 'Not specified'}</p>
</div>
```

**Location**: `frontend/src/components/workitems/WorkItemCard.tsx`

Add field to card view (if relevant):

```tsx
<div className="workitem-card">
  <h3>{workitem.title}</h3>
  <p>{workitem.description}</p>
  
  {workitem.newField && (
    <div className="new-field">
      <span className="label">New Field:</span>
      <span className="value">{workitem.newField}</span>
    </div>
  )}
</div>
```

---

## Complete Example: Adding "Regulatory Reference" Field

Here's a complete example of adding a "regulatory_reference" field to Requirements:

### Step 1: Template Schema

```json
{
  "workitems": {
    "requirements": {
      "items": {
        "properties": {
          "regulatory_reference": {
            "type": "string",
            "description": "Reference to regulatory standard (e.g., ISO 13485, FDA 21 CFR Part 820)",
            "pattern": "^[A-Z]{2,10}\\s+[0-9]{2,10}.*$",
            "maxLength": 100
          }
        }
      }
    }
  }
}
```

### Step 2: Pydantic Schema

```python
class RequirementBase(WorkItemBase):
    """Base schema for Requirement WorkItems"""
    
    regulatory_reference: str | None = Field(
        None,
        max_length=100,
        description="Reference to regulatory standard"
    )
    
    @field_validator("regulatory_reference")
    @classmethod
    def validate_regulatory_reference(cls, v: str | None) -> str | None:
        """Validate regulatory reference format"""
        if v is None:
            return v
        
        v = v.strip()
        if not v:
            return None
        
        # Check format: ISO 13485, FDA 21 CFR Part 820, etc.
        import re
        pattern = r'^[A-Z]{2,10}\s+[0-9]{2,10}.*$'
        if not re.match(pattern, v):
            raise ValueError(
                "Regulatory reference must start with standard abbreviation "
                "followed by number (e.g., 'ISO 13485', 'FDA 21 CFR Part 820')"
            )
        
        return v
```

### Step 3: Service Layer

```python
# In create_workitem method
if hasattr(workitem_data, 'regulatory_reference'):
    properties["regulatory_reference"] = workitem_data.regulatory_reference

# In update_workitem method
if hasattr(updates, 'regulatory_reference') and updates.regulatory_reference is not None:
    update_data["regulatory_reference"] = updates.regulatory_reference
```

### Step 4: Frontend Types

```typescript
export interface WorkItem {
  // ... existing fields
  regulatoryReference?: string;
}

export interface WorkItemCreate {
  // ... existing fields
  regulatoryReference?: string;
}

export interface WorkItemUpdate {
  // ... existing fields
  regulatoryReference?: string;
}
```

### Step 5: Frontend Form

```typescript
interface FormData {
  // ... existing fields
  regulatoryReference: string;
}

const initialFormData: FormData = {
  // ... existing fields
  regulatoryReference: '',
};

// In form JSX
<Input
  name="regulatoryReference"
  label="Regulatory Reference"
  value={formData.regulatoryReference}
  onChange={handleChange}
  onBlur={handleBlur}
  error={touched.has('regulatoryReference') ? errors.regulatoryReference : undefined}
  placeholder="e.g., ISO 13485, FDA 21 CFR Part 820"
  maxLength={100}
  hint="Reference to applicable regulatory standard"
/>

// Validation
case 'regulatoryReference':
  if (value && !/^[A-Z]{2,10}\s+[0-9]{2,10}.*$/.test(value)) {
    return 'Invalid format. Use: STANDARD NUMBER (e.g., ISO 13485)';
  }
  break;
```

---

## Testing Checklist

After extending a data model, verify:

### Backend Tests
- [ ] Template validation tests pass
- [ ] Pydantic schema validation tests pass
- [ ] Service layer CRUD operations work with new field
- [ ] API endpoints accept and return new field
- [ ] Database migrations applied (if using SQL)
- [ ] Graph database stores and retrieves new field

### Frontend Tests
- [ ] TypeScript compilation succeeds
- [ ] Form component renders new field
- [ ] Form validation works for new field
- [ ] Create operation includes new field
- [ ] Update operation includes new field
- [ ] Display components show new field
- [ ] API service sends/receives new field correctly

### Integration Tests
- [ ] End-to-end flow: create → read → update → delete
- [ ] Template application includes new field
- [ ] Version history preserves new field
- [ ] Search/filter works with new field (if applicable)

---

## Common Pitfalls

### ❌ Inconsistent Field Names
**Problem**: Backend uses `regulatory_reference`, frontend uses `regulatoryRef`

**Solution**: Use consistent naming. If backend uses snake_case, frontend should too (or use a mapper).

### ❌ Missing Validation
**Problem**: Field validated in backend but not frontend, or vice versa

**Solution**: Implement validation in both layers. Frontend for UX, backend for security.

### ❌ Forgetting Optional Fields
**Problem**: Making field required in one layer but optional in another

**Solution**: Decide if field is required or optional, then apply consistently everywhere.

### ❌ Not Updating All Schemas
**Problem**: Adding field to Create schema but forgetting Update or Response schemas

**Solution**: Update all related schemas: Base, Create, Update, Response.

### ❌ Missing Type Conversions
**Problem**: Backend returns datetime, frontend expects string

**Solution**: Use appropriate types and conversions. Backend: `datetime`, Frontend: `string` (ISO format).

### ❌ Skipping Template System
**Problem**: Adding field to code but not to template schema

**Solution**: Always update template schema first - it's the source of truth for data structure.

---

## Best Practices Summary

### General
- ✅ Start with template schema - it's the source of truth
- ✅ Follow the extension workflow in order
- ✅ Update all layers consistently
- ✅ Add validation at every layer
- ✅ Write tests for new fields
- ✅ Update documentation

### Backend
- ✅ Use Pydantic for validation
- ✅ Add field validators for complex rules
- ✅ Handle optional fields gracefully
- ✅ Update service layer methods
- ✅ Document API changes

### Frontend
- ✅ Use TypeScript for type safety
- ✅ Validate in forms for UX
- ✅ Handle loading/error states
- ✅ Update all display components
- ✅ Test form submission

### Testing
- ✅ Test validation rules
- ✅ Test CRUD operations
- ✅ Test edge cases (null, empty, max length)
- ✅ Test integration end-to-end
- ✅ Test template application

---

## Reference Implementation

For complete reference implementations, see:

- **Backend Model**: `backend/app/models/signature.py`
- **Pydantic Schema**: `backend/app/schemas/workitem.py` (RequirementBase)
- **Service Layer**: `backend/app/services/workitem_service.py`
- **Template Schema**: `backend/templates/schema.json`
- **Template Validator**: `backend/app/services/template_validator.py`
- **Frontend Types**: `frontend/src/services/workitemService.ts`
- **Frontend Form**: `frontend/src/components/workitems/WorkItemForm.tsx`

---

## Questions?

If you encounter issues or have questions about data model extensions:

1. Review this guide thoroughly
2. Check reference implementations
3. Verify all layers are updated consistently
4. Run tests to identify issues
5. Check error messages for validation failures

Remember: Consistency across all layers is key to successful data model extensions!

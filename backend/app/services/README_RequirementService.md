# RequirementService

The `RequirementService` extends the base `WorkItemService` to provide specialized functionality for managing requirements in the RxDx system with comprehensive validation, enhanced comment management, and business rules.

## Overview

The RequirementService provides:
- **Enhanced requirement-specific validation** with comprehensive business rules
- **Advanced comment management** with user attribution, pagination, and edit tracking
- Requirement dependency tracking with circular dependency detection
- Enhanced search capabilities for requirements
- Integration with audit logging and version control
- Cross-field validation based on requirement status and priority

## Key Features

### 1. Enhanced Comment Management with User Attribution

#### Comprehensive User Attribution
- **Full User Information**: Comments store user ID, name, email, and role at time of creation
- **Edit Tracking**: Complete edit history with edit count and timestamps
- **Permission-Based Access**: Role-based permissions for commenting, editing, and deletion
- **Audit Integration**: All comment operations are logged with detailed context

#### Comment Operations
```python
# Add comment with enhanced user attribution
comment_data = CommentCreate(comment="This is a detailed comment about the requirement")
comment = await service.add_comment(requirement_id, comment_data, current_user)

# Get paginated comments with user information
comments = await service.get_requirement_comments(
    requirement_id, 
    page=1, 
    page_size=20, 
    include_user_info=True
)

# Update comment (only by author or admin)
updated_comment = await service.update_comment(comment_id, comment_update, current_user)

# Delete comment (only by author or admin)
await service.delete_comment(comment_id, current_user)
```

#### Comment Features
- **Pagination Support**: Efficient pagination with configurable page sizes
- **User Information**: Includes user name, email, and role in comment responses
- **Edit History**: Tracks when comments are edited and by whom
- **Permission Control**: Archived requirements have restricted commenting
- **Validation**: Comprehensive validation with placeholder text detection

### 2. Comprehensive Validation System

#### Schema-Level Validation (Pydantic)
- **Title Validation**: Minimum 5 characters, meaningful content, no placeholder text (TODO, TBD, etc.)
- **Acceptance Criteria**: Structured format validation (Given-When-Then), minimum 20 characters
- **Business Value**: Meaningful content validation, minimum 10 characters
- **Source Validation**: 11 valid sources including stakeholder, regulation, security, compliance, etc.
- **Status Validation**: Includes 'rejected' status in addition to standard statuses

#### Service-Level Validation
- **Completeness Validation**: Requirements with 'active' status must have acceptance criteria, business value, and source
- **Completion Requirements**: 'completed' status requires all fields to be populated
- **Priority-Based Rules**: High priority requirements (4-5) must have business value defined
- **Content Quality**: Prohibition of placeholder text across all fields
- **Description Standards**: Minimum 20 characters for meaningful descriptions

#### Dependency Validation
- **Circular Dependency Detection**: Prevents requirement dependency loops
- **Self-Dependency Prevention**: Requirements cannot depend on themselves
- **Duplicate Prevention**: No duplicate dependencies allowed
- **Quantity Limits**: Maximum 10 direct dependencies per requirement
- **Existence Validation**: All dependencies must exist and be valid requirements

### 3. Enhanced Field Validation

#### Acceptance Criteria Requirements
- Must follow structured format (Given-When-Then or similar)
- Must include action keywords: 'given', 'when', 'then', 'should', 'must', 'shall'
- Minimum 20 characters, maximum 2000 characters
- No placeholder text allowed

#### Business Value Standards
- Must contain descriptive text (not just numbers/symbols)
- Minimum 10 characters, maximum 1000 characters
- Required for high-priority requirements (priority 4-5)
- Required for requirements with 'active' or 'completed' status

#### Source Categories
Valid requirement sources:
- `stakeholder` - Stakeholder requirements
- `regulation` - Regulatory requirements
- `standard` - Industry standards
- `user_story` - User story derived
- `business_rule` - Business rules
- `technical_constraint` - Technical constraints
- `compliance` - Compliance requirements
- `security` - Security requirements
- `performance` - Performance requirements
- `usability` - Usability requirements
- `other` - Other sources

### 4. Status-Based Validation Rules

#### Draft Status
- Basic validation only
- All fields optional except title and status

#### Active Status
- Must have acceptance criteria
- Must have business value
- Must have source defined
- Enhanced validation for all fields

#### Completed Status
- All fields must be populated
- Full validation applied to all content
- Cannot be modified without creating new version

#### Rejected Status
- Allows requirements to be formally rejected
- Maintains audit trail of rejection

### 5. Cross-Field Business Rules

- **High Priority Requirements**: Priority 4-5 must have business value
- **Active Requirements**: Must have acceptance criteria, business value, and source
- **Completed Requirements**: Must have all fields populated with valid content
- **Dependency Limits**: Maximum 10 direct dependencies per requirement
- **Content Quality**: No placeholder text in any field

## Usage Examples

### Creating a Requirement with Full Validation
```python
from app.services import get_requirement_service
from app.schemas.workitem import RequirementCreate

service = await get_requirement_service()

requirement_data = RequirementCreate(
    title="Enhanced User Authentication System",
    description="The system shall provide comprehensive user authentication with multi-factor support and session management",
    status="active",
    priority=4,
    acceptance_criteria="Given a user with valid credentials, when they log in with MFA, then they should be granted secure access to the system",
    business_value="Critical for system security, compliance, and user trust",
    source="security"
)

requirement = await service.create_requirement(requirement_data, current_user)
```

### Enhanced Comment Management
```python
# Add comment with comprehensive user attribution
comment_data = CommentCreate(
    comment="This requirement needs additional security considerations for multi-factor authentication implementation"
)
comment = await service.add_comment(requirement.id, comment_data, current_user)

# Get paginated comments with user information
comments_response = await service.get_requirement_comments(
    requirement.id,
    page=1,
    page_size=10,
    include_user_info=True
)

# Update comment (only by author or admin)
if current_user.id == comment.user_id or current_user.role in ["admin", "project_manager"]:
    updated_comment_data = CommentUpdate(
        comment="Updated: This requirement needs additional security considerations and compliance review"
    )
    updated_comment = await service.update_comment(comment.id, updated_comment_data, current_user)

# Delete comment (only by author or admin)
await service.delete_comment(comment.id, current_user)
```

### Validating Dependencies
```python
# Validate requirement dependencies before creating relationships
await service.validate_requirement_dependencies(
    requirement_id=req1.id,
    dependency_ids=[req2.id, req3.id]
)

# Create dependency relationship
await service.track_requirement_dependency(
    requirement_id=req1.id,
    depends_on_id=req2.id,
    current_user=current_user,
    dependency_type="depends_on"
)
```

### Enhanced Search with Validation-Aware Filters
```python
requirements = await service.search_requirements(
    search_text="authentication",
    source="security",
    has_acceptance_criteria=True,
    status="active"
)
```

## Comment Management API

### Comment Schemas
- **CommentCreate**: For creating new comments with validation
- **CommentUpdate**: For updating existing comments
- **CommentResponse**: Full comment data with user attribution
- **CommentListResponse**: Paginated comment list with metadata

### Comment Permissions
- **Regular Users**: Can comment on active requirements, edit/delete own comments
- **Admins/Project Managers**: Can comment on any requirement, edit/delete any comment
- **Archived Requirements**: Only admins and project managers can comment

### Comment Features
- **Edit Tracking**: Comments track edit count and last edit timestamp
- **User Attribution**: Full user information stored with each comment
- **Pagination**: Efficient pagination for large comment threads
- **Validation**: Comprehensive validation with business rules
- **Audit Logging**: All comment operations logged for compliance

## Validation Error Messages

The enhanced validation provides specific, actionable error messages:

- `"Requirement title must be at least 5 characters long"`
- `"Acceptance criteria should follow a structured format (e.g., Given-When-Then)"`
- `"Requirements with 'active' status must have acceptance criteria"`
- `"High priority requirements (4-5) should have business value defined"`
- `"Requirement cannot depend on itself"`
- `"Circular dependency detected in requirement relationships"`
- `"Comment cannot be empty"`
- `"You can only edit your own comments"`
- `"Cannot comment on archived requirements"`

## Integration

The RequirementService integrates with:
- **GraphService**: For storing requirements, comments, and relationships in the graph database
- **VersionService**: For version control and change tracking
- **AuditService**: For logging all requirement and comment operations
- **WorkItemService**: Inherits base functionality with enhanced validation

## Testing

The service includes comprehensive test coverage:
- Unit tests for all validation methods and comment operations
- Integration tests for dependency injection and schema validation
- Comment management tests for all CRUD operations
- Permission and security tests
- Cross-field validation tests
- Dependency validation tests with circular dependency detection
- Error handling and edge case tests

## Performance Considerations

- Validation is performed asynchronously to avoid blocking operations
- Comment pagination reduces memory usage for large comment threads
- Dependency validation includes circular dependency detection with visited set optimization
- Schema validation is performed at the Pydantic level for early error detection
- Service-level validation provides business rule enforcement
- Graph database queries are optimized for comment retrieval

## Dependencies

- `app.services.workitem_service.WorkItemService` (parent class)
- `app.db.graph.GraphService` (required)
- `app.services.version_service.VersionService` (optional)
- `app.services.audit_service.AuditService` (optional)

## API Endpoints

The RequirementService is used by the following API endpoints (to be implemented in Phase 8.2):
- `GET /api/v1/requirements`
- `POST /api/v1/requirements`
- `GET /api/v1/requirements/{id}`
- `PATCH /api/v1/requirements/{id}`
- `POST /api/v1/requirements/{id}/comments`
- `GET /api/v1/requirements/{id}/comments`
- `PATCH /api/v1/requirements/comments/{comment_id}`
- `DELETE /api/v1/requirements/comments/{comment_id}`
- `POST /api/v1/requirements/{id}/dependencies`
- `GET /api/v1/requirements/{id}/dependencies`
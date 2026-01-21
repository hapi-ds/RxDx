# Implementation Plan: Project Templating

## Overview

This implementation plan breaks down the project templating feature into discrete coding tasks. The approach prioritizes core functionality first (parsing, validation, application), followed by interfaces (CLI, API), and finally migration of existing seed data.

## Tasks

- [ ] 1. Set up project structure and core schemas
  - [ ] 1.1 Create template schema models in `backend/app/schemas/template.py`
    - Define TemplateMetadata, TemplateUser, TemplateRequirement, TemplateTask, TemplateTest, TemplateRisk, TemplateRelationship, TemplateWorkitems, TemplateSettings, TemplateDefinition models
    - Define ValidationError, ValidationResult, EntityResult, ApplicationResult response models
    - _Requirements: 2.1, 2.5_
  
  - [ ] 1.2 Create JSON Schema file at `backend/templates/schema.json`
    - Define schema for template validation
    - Include all required and optional fields
    - _Requirements: 2.2_
  
  - [ ] 1.3 Create templates directory structure
    - Create `backend/templates/` directory
    - Add `.gitkeep` to ensure directory is tracked
    - _Requirements: 1.1, 3.1_

- [ ] 2. Implement Template Parser
  - [ ] 2.1 Create `backend/app/services/template_parser.py`
    - Implement TemplateParser class with templates_dir configuration
    - Implement `load_template(name: str) -> TemplateDefinition` method
    - Implement `list_templates() -> list[TemplateMetadata]` method
    - Implement `validate_yaml(content: str) -> tuple[bool, list[str]]` method
    - Handle YAML parsing errors with descriptive messages
    - _Requirements: 2.1, 2.3, 3.1, 3.2, 3.4_
  
  - [ ] 2.2 Write property test for template round-trip
    - **Property 1: Template Round-Trip Consistency**
    - **Validates: Requirements 2.1, 2.5**

- [ ] 3. Implement Template Validator
  - [ ] 3.1 Create `backend/app/services/template_validator.py`
    - Implement TemplateValidator class with schema loading
    - Implement `validate_schema(template: dict) -> list[ValidationError]` method
    - Implement `validate_references(template: TemplateDefinition) -> list[ValidationError]` method
    - Implement `validate_constraints(template: TemplateDefinition) -> list[ValidationError]` method
    - Collect all validation errors, not just first one
    - _Requirements: 2.2, 2.4, 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ] 3.2 Write property test for schema validation
    - **Property 2: Schema Validation Correctness**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  
  - [ ] 3.3 Write property test for invalid input rejection
    - **Property 7: Invalid Input Rejection**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.5**

- [ ] 4. Checkpoint - Parser and Validator
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Template Service - Core Application Logic
  - [ ] 5.1 Create `backend/app/services/template_service.py`
    - Implement TemplateService class with parser, validator, db_session, graph_service dependencies
    - Implement `list_templates() -> list[TemplateMetadata]` method
    - Implement `get_template(name: str) -> Optional[TemplateDefinition]` method
    - Implement `validate_template(name: str) -> ValidationResult` method
    - _Requirements: 3.1, 3.2, 3.4_
  
  - [ ] 5.2 Implement user seeding in TemplateService
    - Implement `_apply_users(users: list[TemplateUser], dry_run: bool) -> list[EntityResult]` method
    - Hash passwords using Argon2 algorithm
    - Check for existing users by email before creation
    - Support default_password from template settings
    - Handle is_active=false for inactive users
    - _Requirements: 4.2, 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 5.3 Implement workitem seeding in TemplateService
    - Implement `_apply_workitems(workitems: TemplateWorkitems, user_map: dict, dry_run: bool) -> list[EntityResult]` method
    - Create workitems in Apache AGE graph database
    - Resolve user references (created_by, assigned_to) to UUIDs
    - Check for existing workitems by ID before creation
    - Support all workitem types and their specific fields
    - _Requirements: 4.3, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 5.4 Implement relationship seeding in TemplateService
    - Implement `_apply_relationships(relationships: list[TemplateRelationship], dry_run: bool) -> list[EntityResult]` method
    - Validate that both source and target workitems exist
    - Skip relationships with missing endpoints
    - Support all relationship types: IMPLEMENTS, TESTED_BY, MITIGATES, DEPENDS_ON
    - _Requirements: 4.4, 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 5.5 Implement main apply_template method
    - Implement `apply_template(name: str, dry_run: bool = False) -> ApplicationResult` method
    - Orchestrate user, workitem, and relationship application
    - Generate deterministic UUIDs based on template name and entity ID
    - Return summary with created, skipped, and failed counts
    - _Requirements: 4.1, 4.5, 5.1, 5.2, 5.3_

- [ ] 6. Checkpoint - Core Service Implementation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Write property tests for Template Service
  - [ ] 7.1 Write property test for idempotent application
    - **Property 3: Idempotent Application**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 5.1**
  
  - [ ] 7.2 Write property test for non-destructive application
    - **Property 4: Non-Destructive Application**
    - **Validates: Requirements 4.2, 4.3, 4.4**
  
  - [ ] 7.3 Write property test for deterministic UUID generation
    - **Property 5: Deterministic UUID Generation**
    - **Validates: Requirements 5.2, 5.3**
  
  - [ ] 7.4 Write property test for user reference resolution
    - **Property 6: User Reference Resolution**
    - **Validates: Requirements 7.4**
  
  - [ ] 7.5 Write property test for relationship endpoint validation
    - **Property 8: Relationship Endpoint Validation**
    - **Validates: Requirements 8.2, 8.3**
  
  - [ ] 7.6 Write property test for dry-run safety
    - **Property 9: Dry-Run Safety**
    - **Validates: Requirements 9.5**

- [ ] 8. Implement REST API Endpoints
  - [ ] 8.1 Create `backend/app/api/v1/templates.py`
    - Implement GET /api/v1/templates endpoint to list templates
    - Implement GET /api/v1/templates/{name} endpoint to get template details
    - Implement POST /api/v1/templates/{name}/apply endpoint with admin authorization
    - Implement POST /api/v1/templates/{name}/validate endpoint
    - Return appropriate HTTP status codes (200, 404, 403, 409)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 8.2 Register template router in main application
    - Add router to `backend/app/api/v1/__init__.py`
    - Update `backend/app/main.py` if needed
    - _Requirements: 10.1_
  
  - [ ] 8.3 Write property test for authorization enforcement
    - **Property 10: Authorization Enforcement**
    - **Validates: Requirements 10.4**

- [ ] 9. Implement CLI Commands
  - [ ] 9.1 Create `backend/scripts/template_cli.py`
    - Implement `list` command with table and JSON output formats
    - Implement `apply` command with --dry-run flag
    - Implement `validate` command for template validation
    - Support both human-readable and JSON output formats
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10. Checkpoint - Interfaces Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Create Built-in Templates
  - [ ] 11.1 Create default template from existing seed data
    - Create `backend/templates/default.yaml` with all current seed data
    - Include 7 users, 4 requirements, 3 tasks, 3 tests, 2 risks
    - Include all existing relationships
    - Preserve original UUIDs for backward compatibility
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [ ] 11.2 Create medical-device template
    - Create `backend/templates/medical-device.yaml`
    - Include regulatory-focused requirements and risks
    - Include compliance-oriented user roles
    - _Requirements: 3.3_
  
  - [ ] 11.3 Create software-only template
    - Create `backend/templates/software-only.yaml`
    - Include software development focused workitems
    - Simplified risk structure
    - _Requirements: 3.3_
  
  - [ ] 11.4 Create minimal template
    - Create `backend/templates/minimal.yaml`
    - Include only admin user and one requirement
    - For quick testing and development
    - _Requirements: 3.3_

- [ ] 12. Migration and Cleanup
  - [ ] 12.1 Update seed_data.py to use template service
    - Modify `backend/scripts/seed_data.py` to call template service
    - Remove hardcoded seed data definitions
    - Add --template flag to select which template to apply
    - _Requirements: 1.1, 1.3_
  
  - [ ] 12.2 Deprecate SQL seed file
    - Add deprecation notice to `backend/db/init/05-seed-data.sql`
    - Document migration path in SEED_DATA.md
    - _Requirements: 1.2_
  
  - [ ] 12.3 Update documentation
    - Update SEED_DATA.md with new template-based approach
    - Document available templates and their purposes
    - Document CLI and API usage
    - _Requirements: 1.3_

- [ ] 13. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify default template produces identical data to SQL seed file
  - Verify all three built-in templates are valid and can be applied

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses Python with FastAPI, following existing codebase patterns
- All database operations use existing services (GraphService for workitems, SQLAlchemy for users)

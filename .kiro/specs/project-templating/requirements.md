# Requirements Document

## Introduction

This document defines the requirements for a Project Templating system that consolidates seed data management into a single source of truth. The system will support multiple project templates (e.g., medical-device, software-only, minimal) that can be applied non-destructively to existing databases, enabling consistent project initialization while preserving existing data.

## Glossary

- **Template**: A structured data file (YAML) defining a set of users, workitems, and relationships to be created in the database
- **Template_Service**: The backend service responsible for loading, validating, and applying templates
- **Workitem**: A graph database node representing a requirement, task, test, risk, or document
- **Relationship**: A graph database edge connecting two workitems (e.g., IMPLEMENTS, TESTED_BY, MITIGATES, DEPENDS_ON)
- **Idempotent_Application**: The property that applying a template multiple times produces the same result as applying it once
- **Template_Registry**: The collection of available templates stored in the filesystem
- **Seed_User**: A user account defined in a template for development/testing purposes

## Requirements

### Requirement 1: Single Source of Truth

**User Story:** As a developer, I want seed data defined in one place, so that I can avoid inconsistencies between SQL and Python seed files.

#### Acceptance Criteria

1. THE Template_Service SHALL load template definitions exclusively from YAML files in the `backend/templates/` directory
2. WHEN the system initializes, THE Template_Service SHALL NOT rely on SQL seed files for template data
3. THE Template_Service SHALL provide a migration path to convert existing SQL seed data to YAML template format

### Requirement 2: Template Definition Format

**User Story:** As a developer, I want templates defined in a structured format, so that I can easily create and modify project templates.

#### Acceptance Criteria

1. THE Template_Service SHALL parse YAML template files containing users, workitems, and relationships sections
2. WHEN a template file is loaded, THE Template_Service SHALL validate the schema against a predefined JSON Schema
3. IF a template file contains invalid YAML syntax, THEN THE Template_Service SHALL return a descriptive parsing error
4. IF a template file fails schema validation, THEN THE Template_Service SHALL return specific validation errors with field paths
5. THE Template_Service SHALL support template metadata including name, version, description, and author fields

### Requirement 3: Template Registry Management

**User Story:** As a developer, I want to list and select from available templates, so that I can choose the appropriate template for my project type.

#### Acceptance Criteria

1. THE Template_Service SHALL discover all valid template files in the `backend/templates/` directory
2. WHEN listing templates, THE Template_Service SHALL return template metadata without loading full template content
3. THE Template_Service SHALL support at least three built-in templates: "medical-device", "software-only", and "minimal"
4. WHEN a template is requested by name, THE Template_Service SHALL load and return the complete template definition

### Requirement 4: Non-Destructive Template Application

**User Story:** As a developer, I want templates applied without affecting existing data, so that I can safely add template data to a database with existing content.

#### Acceptance Criteria

1. WHEN applying a template, THE Template_Service SHALL check for existing entities by their unique identifiers before creation
2. IF a user with the same email already exists, THEN THE Template_Service SHALL skip that user and log a warning
3. IF a workitem with the same ID already exists, THEN THE Template_Service SHALL skip that workitem and log a warning
4. IF a relationship between two workitems already exists, THEN THE Template_Service SHALL skip that relationship
5. THE Template_Service SHALL return a summary report of created, skipped, and failed entities after application

### Requirement 5: Idempotent Application

**User Story:** As a developer, I want to run template application multiple times safely, so that I can ensure consistent state without manual cleanup.

#### Acceptance Criteria

1. WHEN a template is applied multiple times, THE Template_Service SHALL produce the same database state as a single application
2. THE Template_Service SHALL use deterministic UUIDs for template entities based on template name and entity identifier
3. WHEN checking for existing entities, THE Template_Service SHALL match by both ID and natural keys (email for users, title+type for workitems)

### Requirement 6: User Seeding

**User Story:** As a developer, I want templates to create test users with predefined roles, so that I can immediately test role-based functionality.

#### Acceptance Criteria

1. THE Template_Service SHALL create users with hashed passwords using Argon2 algorithm
2. WHEN a template specifies a user, THE Template_Service SHALL support all user roles: admin, project_manager, validator, auditor, user
3. THE Template_Service SHALL support a default password field in templates that applies to all users unless overridden
4. IF a user definition includes is_active=false, THEN THE Template_Service SHALL create the user in inactive state

### Requirement 7: Workitem Seeding

**User Story:** As a developer, I want templates to create workitems with proper graph relationships, so that I can test traceability features.

#### Acceptance Criteria

1. THE Template_Service SHALL create workitems of all supported types: requirement, task, test, risk, document
2. WHEN creating workitems, THE Template_Service SHALL store them in the Apache AGE graph database
3. THE Template_Service SHALL support all workitem-specific fields (acceptance_criteria for requirements, severity/occurrence/detection for risks, etc.)
4. WHEN a workitem references a user (created_by, assigned_to), THE Template_Service SHALL resolve the reference to the user's UUID

### Requirement 8: Relationship Seeding

**User Story:** As a developer, I want templates to define relationships between workitems, so that I can test dependency tracking and traceability.

#### Acceptance Criteria

1. THE Template_Service SHALL create relationships of types: IMPLEMENTS, TESTED_BY, MITIGATES, DEPENDS_ON
2. WHEN creating relationships, THE Template_Service SHALL validate that both source and target workitems exist
3. IF a relationship references a non-existent workitem, THEN THE Template_Service SHALL log an error and skip that relationship
4. THE Template_Service SHALL support relationship metadata including created_at timestamp

### Requirement 9: CLI Interface

**User Story:** As a developer, I want to manage templates via command line, so that I can integrate template operations into scripts and CI/CD pipelines.

#### Acceptance Criteria

1. THE Template_Service SHALL provide a CLI command to list available templates
2. THE Template_Service SHALL provide a CLI command to apply a template by name
3. THE Template_Service SHALL provide a CLI command to validate a template file without applying it
4. WHEN running CLI commands, THE Template_Service SHALL output results in both human-readable and JSON formats
5. THE Template_Service SHALL provide a --dry-run flag that shows what would be created without making changes

### Requirement 10: API Interface

**User Story:** As a frontend developer, I want REST API endpoints for template management, so that I can build template selection UI.

#### Acceptance Criteria

1. THE Template_Service SHALL expose a GET /api/v1/templates endpoint to list available templates
2. THE Template_Service SHALL expose a GET /api/v1/templates/{name} endpoint to get template details
3. THE Template_Service SHALL expose a POST /api/v1/templates/{name}/apply endpoint to apply a template
4. WHEN applying via API, THE Template_Service SHALL require admin role authentication
5. THE Template_Service SHALL return appropriate HTTP status codes: 200 for success, 404 for not found, 409 for conflicts

### Requirement 11: Template Validation

**User Story:** As a developer, I want templates validated before application, so that I can catch errors early.

#### Acceptance Criteria

1. THE Template_Service SHALL validate user email formats in templates
2. THE Template_Service SHALL validate workitem field constraints (priority 1-5, severity/occurrence/detection 1-10)
3. THE Template_Service SHALL validate relationship type values against allowed types
4. THE Template_Service SHALL validate that all user references in workitems point to users defined in the same template or existing in the database
5. IF validation fails, THEN THE Template_Service SHALL return all validation errors, not just the first one

### Requirement 12: Backward Compatibility

**User Story:** As a developer, I want the existing seed data preserved in template format, so that I can continue using the current test data.

#### Acceptance Criteria

1. THE Template_Service SHALL include a "default" template containing all current seed data (7 users, 4 requirements, 3 tasks, 3 tests, 2 risks, and all relationships)
2. THE Template_Service SHALL maintain the same UUIDs for existing seed entities to preserve compatibility
3. WHEN the default template is applied, THE Template_Service SHALL produce identical data to the current SQL seed file

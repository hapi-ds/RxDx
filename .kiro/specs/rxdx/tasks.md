# Implementation Tasks: RxDx

**Status**: Ready for implementation - No code has been written yet. All tasks below represent the complete implementation plan.

**Last Updated**: 2026-01-17

## Phase 1: Project Setup and Infrastructure

### 1.1 Backend Project Setup
**References:** Requirement 17 (Technology Stack)
- [x] 1.1.1 Initialize backend project structure with Python 3.11+
- [x] 1.1.2 Configure uv for dependency management (pyproject.toml)
- [x] 1.1.3 Set up FastAPI application with main.py entry point
- [x] 1.1.4 Create module structure (api, core, models, schemas, services, db, utils)
- [x] 1.1.5 Configure Pydantic Settings for environment variables
- [x] 1.1.6 Set up pytest with hypothesis for testing

### 1.2 Frontend Project Setup
**References:** Requirement 17 (Technology Stack)
- [x] 1.2.1 Initialize React 18+ project with TypeScript using Vite
- [x] 1.2.2 Configure project structure (components, pages, stores, services, types, hooks, utils)
- [x] 1.2.3 Install and configure Zustand for state management
- [x] 1.2.4 Install react-flow for 2D graph visualization
- [x] 1.2.5 Install React Three Fiber (R3F) and WebXR dependencies for 3D/VR
- [x] 1.2.6 Set up Jest and React Testing Library for testing

### 1.3 Database Setup
**References:** Requirement 17 (Technology Stack)
- [x] 1.3.1 Create docker-compose.yml with PostgreSQL 15+ service
- [x] 1.3.2 Configure Apache AGE extension in PostgreSQL
- [x] 1.3.3 Set up SQLAlchemy async with PostgreSQL connection
- [x] 1.3.4 Create database initialization scripts
- [x] 1.3.5 Configure Apache AGE graph database schema

### 1.4 Docker and Infrastructure
**References:** Requirement 17 (Technology Stack)
- [x] 1.4.1 Create multi-stage Dockerfile for backend using uv
- [x] 1.4.2 Create Dockerfile for frontend with Vite build
- [x] 1.4.3 Configure docker-compose v2 for all services (backend, frontend, PostgreSQL, nginx)
- [x] 1.4.4 Set up nginx reverse proxy configuration
- [x] 1.4.5 Create development and production environment configurations

## Phase 2: Core Backend - Authentication & Authorization

### 2.1 User Model and Database
**References:** Requirement 1 (User Authentication and Authorization)
- [x] 2.1.1 Create User SQLAlchemy model with all fields (id, email, hashed_password, full_name, role, is_active, failed_login_attempts, locked_until, created_at, updated_at)
- [x] 2.1.2 Create Pydantic schemas for User (UserCreate, UserUpdate, UserResponse)
- [x] 2.1.3 Create database migration for users table
- [x] 2.1.4 Write unit tests for User model validation

### 2.2 Authentication Service
**References:** Requirement 1 (User Authentication and Authorization)
- [x] 2.2.1 Implement password hashing with passlib (Argon2id)
- [x] 2.2.2 Implement JWT token generation with python-jose
- [x] 2.2.3 Create AuthService with authenticate_user method
- [x] 2.2.4 Implement failed login attempt tracking and account locking (3 attempts, 1 hour lock)
- [x] 2.2.5 Implement session management with token expiration (30 minutes)
- [x] 2.2.6 Write unit tests for authentication logic
- [x] 2.2.7 Write property-based tests for password hashing

### 2.3 Authorization and RBAC
**References:** Requirement 1 (User Authentication and Authorization)
- [x] 2.3.1 Define Permission enum (READ_WORKITEM, WRITE_WORKITEM, SIGN_WORKITEM, DELETE_WORKITEM, MANAGE_USERS, VIEW_AUDIT)
- [x] 2.3.2 Create ROLE_PERMISSIONS mapping for all roles (admin, project_manager, validator, auditor, user)
- [x] 2.3.3 Implement require_permission decorator for endpoint protection
- [x] 2.3.4 Write unit tests for permission checking
- [x] 2.3.5 Write property-based tests for RBAC logic

### 2.4 Authentication API Endpoints
**References:** Requirement 1 (User Authentication and Authorization)
- [x] 2.4.1 Create POST /api/v1/auth/login endpoint
- [x] 2.4.2 Create POST /api/v1/auth/refresh endpoint
- [x] 2.4.3 Create POST /api/v1/auth/logout endpoint
- [x] 2.4.4 Create GET /api/v1/auth/me endpoint
- [x] 2.4.5 Implement FastAPI dependency injection for current user
- [x] 2.4.6 Write integration tests for auth endpoints

## Phase 3: Audit Trail System

### 3.1 Audit Log Model
**References:** Requirement 13 (Audit Trail and Compliance Reporting)
- [x] 3.1.1 Create AuditLog SQLAlchemy model (id, user_id, action, entity_type, entity_id, timestamp, ip_address, details)
- [x] 3.1.2 Create Pydantic schemas for AuditLog
- [x] 3.1.3 Create database migration for audit_logs table with indexes
- [x] 3.1.4 Write unit tests for AuditLog model

### 3.2 Audit Service
**References:** Requirement 13 (Audit Trail and Compliance Reporting)
- [x] 3.2.1 Create AuditService with log method for all CRUD operations
- [x] 3.2.2 Implement audit logging for authentication events
- [x] 3.2.3 Implement audit logging for authorization decisions
- [x] 3.2.4 Ensure audit logs are immutable (no update/delete operations)
- [x] 3.2.5 Write unit tests for audit logging
- [x] 3.2.6 Write property-based tests for audit log integrity

### 3.3 Audit API Endpoints
**References:** Requirement 13 (Audit Trail and Compliance Reporting)
- [x] 3.3.1 Create GET /api/v1/audit endpoint with filtering (user, entity_type, action, time_period)
- [x] 3.3.2 Create GET /api/v1/audit/export endpoint for compliance reports
- [x] 3.3.3 Implement audit log retention policy configuration
- [x] 3.3.4 Write integration tests for audit endpoints

## Phase 4: Graph Database Integration

### 4.1 Apache AGE Setup
**References:** Requirement 6 (Knowledge Management with Graph Database)
- [x] 4.1.1 Create GraphService class with asyncpg connection pool
- [x] 4.1.2 Implement create_workitem_node method for WorkItem nodes
- [x] 4.1.3 Implement create_relationship method for graph edges
- [x] 4.1.4 Create graph schema initialization script (node types and relationship types)
- [x] 4.1.5 Write unit tests for graph operations

### 4.2 Graph Query Methods
**References:** Requirement 6 (Knowledge Management with Graph Database)
- [x] 4.2.1 Implement get_workitem method to retrieve node by ID
- [x] 4.2.2 Implement get_workitem_version method for version history traversal
- [x] 4.2.3 Implement search_workitems method with full-text search
- [x] 4.2.4 Implement get_traceability_matrix method (requirements-tests-risks)
- [x] 4.2.5 Implement get_risk_chains method for FMEA failure paths
- [x] 4.2.6 Write unit tests for graph queries
- [x] 4.2.7 Write property-based tests for graph traversal

### 4.3 Graph Visualization API
**References:** Requirement 6 (Knowledge Management with Graph Database)
- [x] 4.3.1 Implement get_graph_for_visualization method with depth parameter
- [x] 4.3.2 Create GET /api/v1/graph/visualization endpoint
- [x] 4.3.3 Implement node/edge formatting for react-flow and R3F
- [x] 4.3.4 Add query performance optimization (limit 1000 nodes)
- [x] 4.3.5 Write integration tests for visualization endpoint

## Phase 5: WorkItem Management

### 5.1 WorkItem Models
**References:** Requirement 3 (Requirements Management with Version Control)
- [x] 5.1.1 Create WorkItem base Pydantic schema (title, description, status, priority, assigned_to)
- [x] 5.1.2 Create WorkItemCreate, WorkItemUpdate, WorkItemResponse schemas
- [x] 5.1.3 Create specialized schemas for Requirement, Task, Test, Risk, Document types
- [x] 5.1.4 Implement Pydantic validators for all fields
- [x] 5.1.5 Write unit tests for schema validation

### 5.2 WorkItem Service
**References:** Requirement 3 (Requirements Management with Version Control)
- [x] 5.2.1 Create WorkItemService with CRUD operations
- [x] 5.2.2 Implement create_workitem method (stores in graph DB)
- [x] 5.2.3 Implement get_workitem method
- [x] 5.2.4 Implement update_workitem method (creates new version)
- [x] 5.2.5 Implement delete_workitem method (checks for signatures)
- [x] 5.2.6 Write unit tests for WorkItem service

### 5.3 WorkItem API Endpoints
**References:** Requirement 3 (Requirements Management with Version Control)
- [x] 5.3.1 Create GET /api/v1/workitems endpoint with filtering
- [x] 5.3.2 Create POST /api/v1/workitems endpoint
- [x] 5.3.3 Create GET /api/v1/workitems/{id} endpoint
- [x] 5.3.4 Create PATCH /api/v1/workitems/{id} endpoint
- [x] 5.3.5 Create DELETE /api/v1/workitems/{id} endpoint
- [x] 5.3.6 Create GET /api/v1/workitems/{id}/history endpoint
- [x] 5.3.7 Create GET /api/v1/workitems/{id}/version/{version} endpoint
- [x] 5.3.8 Write integration tests for WorkItem endpoints

## Phase 6: Version Control System

### 6.1 Version Service
**References:** Requirement 3 (Requirements Management with Version Control)
- [x] 6.1.1 Create VersionService class
- [x] 6.1.2 Implement create_version method (increments version, creates graph node)
- [x] 6.1.3 Implement version number calculation (major.minor format)
- [x] 6.1.4 Create NEXT_VERSION relationships in graph
- [x] 6.1.5 Implement get_version_history method
- [x] 6.1.6 Store change descriptions with each version
- [x] 6.1.7 Write unit tests for version control
- [x] 6.1.8 Write property-based tests for version numbering

### 6.2 Version History Integration
**References:** Requirement 3 (Requirements Management with Version Control)
- [x] 6.2.1 Integrate version creation with WorkItem updates
- [x] 6.2.2 Ensure version history preserves complete snapshots
- [x] 6.2.3 Link versions to user identity and timestamps
- [x] 6.2.4 Implement version comparison functionality
- [x] 6.2.5 Write integration tests for version history

## Phase 7: Digital Signature System

### 7.1 Digital Signature Model
**References:** Requirement 2 (Digital Signature Management)
- [x] 7.1.1 Create DigitalSignature SQLAlchemy model (id, workitem_id, workitem_version, user_id, signature_hash, content_hash, signed_at, is_valid, invalidated_at, invalidation_reason)
- [x] 7.1.2 Create Pydantic schemas for DigitalSignature
- [x] 7.1.3 Create database migration for digital_signatures table
- [x] 7.1.4 Write unit tests for DigitalSignature model

### 7.2 Signature Service
**References:** Requirement 2 (Digital Signature Management)
- [x] 7.2.1 Create SignatureService class
- [x] 7.2.2 Implement sign_workitem method with RSA cryptographic signing
- [x] 7.2.3 Implement content hash generation (SHA-256)
- [x] 7.2.4 Implement verify_signature method
- [x] 7.2.5 Implement invalidate_signatures method (called on WorkItem modification)
- [x] 7.2.6 Prevent deletion of signed WorkItems
- [x] 7.2.7 Write unit tests for signature operations
- [x] 7.2.8 Write property-based tests for signature verification

### 7.3 Signature API Endpoints
**References:** Requirement 2 (Digital Signature Management)
- [x] 7.3.1 Create POST /api/v1/signatures endpoint
- [x] 7.3.2 Create GET /api/v1/signatures/{id} endpoint
- [x] 7.3.3 Create GET /api/v1/workitems/{id}/signatures endpoint
- [x] 7.3.4 Create POST /api/v1/signatures/{id}/verify endpoint
- [x] 7.3.5 Integrate signature validation with audit logging
- [x] 7.3.6 Write integration tests for signature endpoints

## Phase 8: Requirements Management

### 8.1 Requirements Service
**References:** Requirement 3 (Requirements Management with Version Control)
- [x] 8.1.1 Create RequirementService extending WorkItemService
- [x] 8.1.2 Implement requirement-specific validation
- [x] 8.1.3 Implement add_comment method with user attribution
- [x] 8.1.4 Implement requirement dependency tracking
- [x] 8.1.5 Write unit tests for requirement operations

### 8.2 Requirements API Endpoints
**References:** Requirement 3 (Requirements Management with Version Control)
- [x] 8.2.1 Create GET /api/v1/requirements endpoint
- [x] 8.2.2 Create POST /api/v1/requirements endpoint
- [x] 8.2.3 Create GET /api/v1/requirements/{id} endpoint
- [x] 8.2.4 Create PATCH /api/v1/requirements/{id} endpoint
- [x] 8.2.5 Create POST /api/v1/requirements/{id}/comments endpoint
- [x] 8.2.6 Write integration tests for requirements endpoints

## Phase 9: VV Management (Validation and Verification)

### 9.1 VV Models and Service
**References:** Requirement 9 (Verification and Validation Management)
- [x] 9.1.1 Create TestSpec and TestRun Pydantic schemas
- [x] 9.1.2 Create TestService class
- [x] 9.1.3 Implement create_test_spec method with requirement linking
- [x] 9.1.4 Implement create_test_run method with result recording
- [x] 9.1.5 Implement test coverage calculation
- [x] 9.1.6 Write unit tests for test management

### 9.2 VV API Endpoints
**References:** Requirement 9 (Verification and Validation Management)
- [x] 9.2.1 Create GET /api/v1/tests endpoint
- [x] 9.2.2 Create POST /api/v1/tests endpoint
- [x] 9.2.3 Create GET /api/v1/tests/{id} endpoint
- [x] 9.2.4 Create POST /api/v1/tests/{id}/runs endpoint
- [x] 9.2.5 Create GET /api/v1/tests/{id}/runs endpoint
- [x] 9.2.6 Create PATCH /api/v1/tests/runs/{run_id} endpoint
- [x] 9.2.7 Create GET /api/v1/tests/coverage endpoint
- [x] 9.2.8 Write integration tests for test endpoints

## Phase 10: Risk Management (FMEA)

### 10.1 Risk Models and Service
**References:** Requirement 10 (Risk Management with FMEA)
- [x] 10.1.1 Create Risk and Failure node schemas for graph DB
- [x] 10.1.2 Create RiskService class
- [x] 10.1.3 Implement create_risk method with severity, occurrence, detection ratings
- [x] 10.1.4 Implement RPN calculation (severity × occurrence × detection)
- [x] 10.1.5 Implement create_failure_chain method with probability attributes
- [x] 10.1.6 Implement mitigation action tracking
- [x] 10.1.7 Write unit tests for risk management
- [x] 10.1.8 Write property-based tests for RPN calculation

### 10.2 Risk API Endpoints
**References:** Requirement 10 (Risk Management with FMEA)
- [x] 10.2.1 Create GET /api/v1/risks endpoint
- [x] 10.2.2 Create POST /api/v1/risks endpoint
- [x] 10.2.3 Create GET /api/v1/risks/{id} endpoint
- [x] 10.2.4 Create PATCH /api/v1/risks/{id} endpoint
- [x] 10.2.5 Create POST /api/v1/risks/{id}/failures endpoint (create failure chain)
- [x] 10.2.6 Create GET /api/v1/risks/{id}/chains endpoint
- [x] 10.2.7 Create POST /api/v1/risks/{id}/mitigations endpoint
- [x] 10.2.8 Write integration tests for risk endpoints

## Phase 11: Local LLM Integration

### 11.1 LLM Service
**References:** Requirement 12 (Local LLM Integration)
- [x] 11.1.1 Create LLMService class with LM-Studio API client
- [x] 11.1.2 Implement extract_work_instruction method for email parsing
- [x] 11.1.3 Implement extract_meeting_knowledge method for entity extraction
- [x] 11.1.4 Implement suggest_requirement_improvements method
- [x] 11.1.5 Implement graceful degradation when LLM unavailable
- [x] 11.1.6 Add configuration for LLM endpoint and model name
- [x] 11.1.7 Write unit tests for LLM service (with mocked responses)

### 11.2 LLM API Endpoints
**References:** Requirement 12 (Local LLM Integration)
- [x] 11.2.1 Create POST /api/v1/llm/analyze-requirement endpoint
- [x] 11.2.2 Create POST /api/v1/llm/extract-meeting endpoint
- [x] 11.2.3 Create POST /api/v1/llm/parse-email endpoint
- [x] 11.2.4 Write integration tests for LLM endpoints

## Phase 12: Email Processing

### 12.1 Email Service
**References:** Requirement 5 (Email-Based Work Instructions and Knowledge Capture)
- [x] 12.1.1 Create EmailService class with aiosmtplib
- [x] 12.1.2 Implement send_work_instruction method
- [x] 12.1.3 Implement process_incoming_email method with WorkItem ID extraction
- [x] 12.1.4 Implement parse_structured_reply method (STATUS, COMMENT, TIME format)
- [x] 12.1.5 Integrate LLM for unstructured email parsing
- [x] 12.1.6 Implement send_parsing_error method
- [x] 12.1.7 Write unit tests for email processing
- [x] 12.1.8 Write property-based tests for email parsing

### 12.2 Email Integration
**References:** Requirement 5 (Email-Based Work Instructions and Knowledge Capture)
- [x] 12.2.1 Set up SMTP configuration for outgoing emails
- [x] 12.2.2 Set up IMAP/POP3 for incoming email monitoring
- [x] 12.2.3 Create background task for email polling
- [x] 12.2.4 Implement email thread history tracking
- [x] 12.2.5 Link email-derived knowledge to Graph DB
- [x] 12.2.6 Write integration tests for email workflows

## Phase 13: Project Scheduling

### 13.1 Scheduler Service
**References:** Requirement 7 (Project Scheduling)
- [x] 13.1.1 Create SchedulerService class with ortools
- [x] 13.1.2 Implement schedule_project method with constraint programming
- [x] 13.1.3 Implement task dependency constraints (finish-to-start, start-to-start, finish-to-finish)
- [x] 13.1.4 Implement resource capacity constraints
- [x] 13.1.5 Implement schedule optimization (minimize project duration)
- [x] 13.1.6 Implement conflict identification
- [x] 13.1.7 Write unit tests for scheduling logic
- [x] 13.1.8 Write property-based tests for constraint satisfaction

### 13.2 Scheduler API Endpoints
**References:** Requirement 7 (Project Scheduling)
- [x] 13.2.1 Create POST /api/v1/schedule/calculate endpoint
- [x] 13.2.2 Create GET /api/v1/schedule/{project_id} endpoint
- [x] 13.2.3 Create PATCH /api/v1/schedule/{project_id} endpoint (manual adjustments)
- [x] 13.2.4 Write integration tests for scheduler endpoints

## Phase 14: Document Generation

### 14.1 Document Service
**References:** Requirement 8 (Document Generation)
- [x] 14.1.1 Create DocumentService class
- [x] 14.1.2 Implement generate_design_review_pdf method with ReportLab
- [x] 14.1.3 Implement generate_traceability_matrix_pdf method
- [x] 14.1.4 Implement generate_fmea_excel method with openpyxl
- [x] 14.1.5 Implement generate_invoice_word method with python-docx-template
- [x] 14.1.6 Create document templates (PDF, Excel, Word)
- [x] 14.1.7 Implement signature inclusion in generated documents
- [x] 14.1.8 Write unit tests for document generation

### 14.2 Document API Endpoints
**References:** Requirement 8 (Document Generation)
- [x] 14.2.1 Create POST /api/v1/documents/design-review endpoint
- [x] 14.2.2 Create POST /api/v1/documents/traceability-matrix endpoint
- [x] 14.2.3 Create POST /api/v1/documents/fmea endpoint
- [x] 14.2.4 Create POST /api/v1/documents/invoice endpoint
- [x] 14.2.5 Create GET /api/v1/documents/{id} endpoint
- [x] 14.2.6 Write integration tests for document endpoints

## Phase 15: Time Recording Backend

### 15.1 Time Entry Models and Service
**References:** Requirement 5 (Email-Based Work Instructions and Knowledge Capture)
- [x] 15.1.1 Create TimeEntry Pydantic schema (id, user_id, project_id, task_id, start_time, end_time, duration, description, category)
- [x] 15.1.2 Create TimeService class
- [x] 15.1.3 Implement create_time_entry method
- [x] 15.1.4 Implement update_time_entry method
- [x] 15.1.5 Implement get_time_entries method with filtering
- [x] 15.1.6 Implement time aggregation for invoicing
- [x] 15.1.7 Write unit tests for time tracking

### 15.2 Time Recording API Endpoints
**References:** Requirement 4 (Email-Based Work Instructions and Knowledge Capture)
- [x] 15.2.1 Create POST /api/v1/time-entries endpoint
- [x] 15.2.2 Create GET /api/v1/time-entries endpoint
- [x] 15.2.3 Create PATCH /api/v1/time-entries/{id} endpoint
- [x] 15.2.4 Create DELETE /api/v1/time-entries/{id} endpoint
- [x] 15.2.5 Write integration tests for time entry endpoints

## Phase 16: Frontend - Core Setup

### 16.1 Authentication UI
**References:** Requirement 1 (User Authentication and Authorization)
- [x] 16.1.1 Create authStore with Zustand (login, logout, refreshToken)
- [x] 16.1.2 Create Login page component
- [x] 16.1.3 Create useAuth custom hook
- [x] 16.1.4 Implement JWT token storage and refresh logic
- [x] 16.1.5 Create ProtectedRoute component
- [x] 16.1.6 Write unit tests for auth store and components

### 16.2 API Client Setup
**References:** Requirement 17 (Technology Stack)
- [x] 16.2.1 Create API client with axios/fetch and TypeScript types
- [x] 16.2.2 Implement request interceptor for JWT token injection
- [x] 16.2.3 Implement response interceptor for token refresh
- [x] 16.2.4 Create service modules (authService, workitemService, graphService)
- [x] 16.2.5 Write unit tests for API client

### 16.3 Common UI Components
**References:** Requirement 17 (Technology Stack)
- [x] 16.3.1 Create Button component
- [x] 16.3.2 Create Modal component
- [x] 16.3.3 Create Form components (Input, Select, Textarea)
- [x] 16.3.4 Create Table component
- [x] 16.3.5 Create Loading and Error components
- [x] 16.3.6 Write unit tests for common components

## Phase 17: Frontend - WorkItem Management

### 17.1 WorkItem Store and Components
**References:** Requirement 3 (Requirements Management with Version Control)
- [x] 17.1.1 Create workitemStore with Zustand
- [x] 17.1.2 Create WorkItemList component
- [x] 17.1.3 Create WorkItemDetail component
- [x] 17.1.4 Create WorkItemForm component (create/edit)
- [x] 17.1.5 Create VersionHistory component
- [x] 17.1.6 Write unit tests for WorkItem components

### 17.2 Requirements UI
**References:** Requirement 3 (Requirements Management with Version Control)
- [x] 17.2.1 Create Requirements page
- [x] 17.2.2 Create RequirementCard component
- [x] 17.2.3 Create CommentSection component
- [x] 17.2.4 Implement requirement filtering and search
- [x] 17.2.5 Write unit tests for requirements UI

### 17.3 Digital Signature UI
**References:** Requirement 2 (Digital Signature Management)
- [x] 17.3.1 Create SignatureButton component
- [x] 17.3.2 Create SignatureList component
- [x] 17.3.3 Create SignatureVerification component
- [x] 17.3.4 Implement signature workflow UI
- [x] 17.3.5 Write unit tests for signature components

## Phase 18: Frontend - 2D Graph Visualization

### 18.1 2D Graph Components
**References:** Requirement 6 (Knowledge Management with Graph Database)
- [x] 18.1.1 Create graphStore with Zustand
- [x] 18.1.2 Create GraphView2D component with react-flow
- [x] 18.1.3 Create custom node components (RequirementNode, TaskNode, TestNode, RiskNode)
- [x] 18.1.4 Implement node selection and editing
- [x] 18.1.5 Implement relationship creation (drag-and-drop)
- [x] 18.1.6 Add MiniMap and Controls
- [x] 18.1.7 Write unit tests for graph components

### 18.2 Graph Explorer Page
**References:** Requirement 6 (Knowledge Management with Graph Database)
- [x] 18.2.1 Create GraphExplorer page
- [x] 18.2.2 Implement graph search functionality
- [x] 18.2.3 Implement depth control for graph loading
- [x] 18.2.4 Implement graph export (image/HTML)
- [x] 18.2.5 Write integration tests for graph explorer

## Phase 19: Frontend - 3D/VR Visualization

### 19.1 3D Graph Components
**References:** Requirement 16 (Dual Frontend Interface)
- [x] 19.1.1 Create GraphView3D component with React Three Fiber
- [x] 19.1.2 Implement 3D node rendering with custom geometries
- [x] 19.1.3 Implement 3D edge rendering with Line components
- [x] 19.1.4 Implement force-directed layout in 3D space
- [x] 19.1.5 Add OrbitControls for navigation
- [x] 19.1.6 Write unit tests for 3D components

### 19.2 WebXR Integration
**References:** Requirement 16 (Dual Frontend Interface)
- [x] 19.2.1 Add WebXR support with @react-three/xr
- [x] 19.2.2 Implement VRButton component
- [x] 19.2.3 Add Controllers and Hands support
- [x] 19.2.4 Implement VR interaction (node selection, movement)
- [x] 19.2.5 Test on Meta Quest devices
- [x] 19.2.6 Implement voice commands for hands-free operation
- [x] 19.2.7 Write integration tests for XR features

### 19.3 View Mode Switching
**References:** Requirement 16 (Dual Frontend Interface)
- [x] 19.3.1 Implement view mode toggle (2D/3D)
- [x] 19.3.2 Synchronize state between 2D and 3D views
- [x] 19.3.3 Implement graceful degradation for non-XR devices
- [x] 19.3.4 Write unit tests for view switching

## Phase 20: Frontend - Navigation and Routing

### 20.1 Navigation Header Component
**References:** Requirement 19 (Frontend Navigation and Routing)
- [x] 20.1.1 Create NavigationHeader component with all navigation links
- [x] 20.1.2 Implement navItems array with paths: /requirements, /graph, /tests, /risks, /schedule, /kanban, /documents
- [x] 20.1.3 Use useLocation hook to determine active route and apply active state styling
- [x] 20.1.4 Include user info display and logout button
- [x] 20.1.5 Implement responsive collapse for mobile screens
- [x] 20.1.6 Write unit tests for NavigationHeader (link rendering, active state, logout)
- [x] 20.1.7 Update AppLayout to use NavigationHeader component
- [x] 20.1.8 Ensure header is only shown when authenticated

### 20.2 Placeholder Pages
**References:** Requirement 19 (Frontend Navigation and Routing)
- [x] 20.2.1 Create reusable PlaceholderPage component
- [x] 20.2.2 Accept props: title, description, icon
- [x] 20.2.3 Display "Coming Soon" message and link back to Requirements
- [x] 20.2.4 Write property test for PlaceholderPage content rendering
- [x] 20.2.5 Create TestsPage using PlaceholderPage
- [x] 20.2.6 Create RisksPage using PlaceholderPage
- [x] 20.2.7 Create SchedulePage using PlaceholderPage
- [x] 20.2.8 Create KanbanPage using PlaceholderPage
- [x] 20.2.9 Create DocumentsPage using PlaceholderPage

### 20.3 Routing Configuration
**References:** Requirement 19 (Frontend Navigation and Routing)
- [x] 20.3.1 Add route for /graph pointing to existing GraphExplorer component
- [x] 20.3.2 Add routes for /tests, /risks, /schedule, /kanban, /documents
- [x] 20.3.3 Wrap all new routes with ProtectedRoute
- [x] 20.3.4 Update catch-all route to redirect appropriately
- [x] 20.3.5 Write property tests for route protection and unknown route redirect
- [x] 20.3.6 Verify navigation works between all pages
- [x] 20.3.7 Verify GraphExplorer page loads correctly

## Phase 21: Frontend - Enhanced Version Control UX

### 21.1 Version Display Components
**References:** Requirement 20 (Enhanced Version Control User Experience)
- [x] 21.1.1 Create VersionIndicator component to display version number in badge/pill style
- [x] 21.1.2 Create VersionPreview component to show next version and informational message
- [x] 21.1.3 Create version utility functions (calculateNextVersion, parseVersion)
- [x] 21.1.4 Write property test for version calculation

### 21.2 WorkItemForm Version Enhancements
**References:** Requirement 20 (Enhanced Version Control User Experience)
- [x] 21.2.1 Update button text: "Create Work Item" for new, "Save Changes" for edit
- [x] 21.2.2 Add VersionIndicator when editing existing item (near form title)
- [x] 21.2.3 Add VersionPreview near submit button (show next version for edits, v1.0 for new)
- [x] 21.2.4 Write property tests for button text, version indicator, and version preview

### 21.3 WorkItemDetail Version Enhancements
**References:** Requirement 20 (Enhanced Version Control User Experience)
- [x] 21.3.1 Enhance version badge visibility in header
- [x] 21.3.2 Add version count indicator (e.g., "v1.2 (5 versions)")
- [x] 21.3.3 Make "View History" button more prominent in actions
- [x] 21.3.4 Show "View History" only when version history is available
- [x] 21.3.5 Write property tests for version badge, view history visibility, and version count

### 21.4 VersionHistory Component Enhancements
**References:** Requirement 20 (Enhanced Version Control User Experience)
- [x] 21.4.1 Add current version highlighting in timeline
- [x] 21.4.2 Ensure change descriptions are displayed when available
- [x] 21.4.3 Add timeline indicator showing version progression for multiple versions
- [x] 21.4.4 Write property tests for current version highlighting and change description display

## Phase 22: Frontend - VV Management UI

### 22.1 VV Components
**References:** Requirement 9 (Verification and Validation Management)
- [x] 22.1.1 Create Tests page
- [x] 22.1.2 Create TestSpecList component
- [x] 22.1.3 Create TestRunForm component
- [x] 22.1.4 Create TestResultsDisplay component
- [x] 22.1.5 Create TestCoverageChart component
- [x] 22.1.6 Write unit tests for test components

## Phase 23: Frontend - Risk Management UI

### 23.1 Risk Components
**References:** Requirement 10 (Risk Management with FMEA)
- [x] 23.1.1 Create Risks page
- [x] 23.1.2 Create RiskCard component with RPN display
- [x] 23.1.3 Create FailureChainVisualization component
- [x] 23.1.4 Create MitigationTracker component
- [x] 23.1.5 Implement FMEA matrix view
- [x] 23.1.6 Write unit tests for risk components

## Phase 24: Frontend - Project Scheduling UI

### 24.1 Schedule Components
**References:** Requirement 7 (Project Scheduling)
- [x] 24.1.1 Create Schedule page
- [x] 24.1.2 Create GanttChart component
- [x] 24.1.3 Create TaskDependencyEditor component
- [x] 24.1.4 Create ResourceAllocation component
- [x] 24.1.5 Implement schedule conflict display
- [x] 24.1.6 Write unit tests for schedule components

### 24.2 Project Management Views
**References:** Requirement 11 (Project Management Workflows)
- [x] 24.2.1 Create KanbanBoard component
- [x] 24.2.2 Create SprintPlanning component
- [x] 24.2.3 Create BurndownChart component
- [x] 24.2.4 Create VelocityChart component
- [x] 24.2.5 Write unit tests for project management components

### 24.3 Connect Frontend to Backend Data
**References:** Requirement 7 (Project Scheduling), Requirement 10 (Risk Management with FMEA)
- [x] 24.3.1 Fix scheduleService to use /workitems?type=task endpoint instead of /schedule/tasks
- [x] 24.3.2 Implement statistics calculation in scheduleService from task data
- [x] 24.3.3 Verify riskService connects to /risks/ endpoint correctly
- [x] 24.3.4 Test Schedule page displays tasks from seeded medical-device template
- [x] 24.3.5 Test Risks page displays risks from seeded medical-device template
- [x] 24.3.6 Verify pagination works correctly for both pages

## Phase 25: Frontend - Document Generation UI

### 25.1 Document Components
**References:** Requirement 8 (Document Generation)
- [x] 25.1.1 Create Documents page
- [x] 25.1.2 Create DocumentGenerator component with template selection
- [x] 25.1.3 Create DocumentPreview component
- [x] 25.1.4 Create DocumentHistory component
- [x] 25.1.5 Implement document download functionality
- [x] 25.1.6 Write unit tests for document components

## Phase 25.5: Frontend - Template Management UI

### 25.5.1 Template Store and Services
**References:** Requirement 18 (Template Management UI)
- [x] 25.5.1.1 Create templateStore with Zustand for state management
- [x] 25.5.1.2 Implement loadTemplates action to fetch template list
- [x] 25.5.1.3 Implement selectTemplate action to fetch template details
- [x] 25.5.1.4 Implement validateTemplate action to validate templates
- [x] 25.5.1.5 Implement applyTemplate action with dry-run support
- [x] 25.5.1.6 Write unit tests for template store

### 25.5.2 Template List Components
**References:** Requirement 18 (Template Management UI)
- [x] 25.5.2.1 Create Templates page component with layout
- [x] 25.5.2.2 Create TemplateList component to display available templates
- [x] 25.5.2.3 Implement template selection and highlighting
- [x] 25.5.2.4 Add refresh button to reload template list
- [x] 25.5.2.5 Implement loading and empty states
- [x] 25.5.2.6 Write unit tests for template list components

### 25.5.3 Template Detail Components
**References:** Requirement 18 (Template Management UI)
- [x] 25.5.3.1 Create TemplateDetail component to display template information
- [x] 25.5.3.2 Display template metadata (name, version, author, description)
- [x] 25.5.3.3 Create tables for users, workitems, and relationships
- [x] 25.5.3.4 Implement validate button with validation results display
- [x] 25.5.3.5 Implement dry-run preview button (admin only)
- [x] 25.5.3.6 Implement apply button with confirmation dialog (admin only)
- [x] 25.5.3.7 Write unit tests for template detail components

### 25.5.4 Results Display Components
**References:** Requirement 18 (Template Management UI)
- [x] 25.5.4.1 Create ValidationResults component to display validation status
- [x] 25.5.4.2 Display validation errors and warnings with clear formatting
- [x] 25.5.4.3 Create ApplicationResults component to display application status
- [x] 25.5.4.4 Display created, skipped, and failed entity counts
- [x] 25.5.4.5 Create detailed failure table with error messages
- [x] 25.5.4.6 Write unit tests for results components

### 25.5.5 Authorization and Error Handling
**References:** Requirement 18 (Template Management UI)
- [x] 25.5.5.1 Implement role-based UI restrictions (admin-only actions)
- [x] 25.5.5.2 Display authorization error messages for non-admin users
- [x] 25.5.5.3 Implement confirmation dialogs for destructive operations
- [x] 25.5.5.4 Add error boundary for template page
- [x] 25.5.5.5 Implement loading states for all async operations
- [x] 25.5.5.6 Write integration tests for authorization flows

### 25.5.6 Styling and UX
**References:** Requirement 18 (Template Management UI)
- [x] 25.5.6.1 Create CSS styles for template page layout
- [x] 25.5.6.2 Style template list with hover and selection states
- [x] 25.5.6.3 Style entity tables with proper spacing and borders
- [x] 25.5.6.4 Style validation and application results with color coding
- [x] 25.5.6.5 Create responsive layout for mobile devices
- [x] 25.5.6.6 Ensure accessibility compliance (WCAG 2.1 AA)

## Phase 26: Mobile Time Recording App

### 26.1 Time Tracking Data Model
**References:** Requirement 4 (Mobile Time Recording)
- [x] 26.1.1 Create "worked" node schema for graph database with fields: resource (user_id), date, from (start_time), to (end_time), description (optional)
- [x] 26.1.2 Define "worked_on" relationship type from "worked" node to task node
- [x] 26.1.3 Implement GraphService method to create worked nodes and relationships
- [x] 26.1.4 Implement GraphService method to calculate worked_sum for tasks (aggregate all linked worked nodes)
- [x] 26.1.5 Write unit tests for worked node creation and aggregation
- [x] 26.1.6 Write property-based tests for time validation (end time after start time)

### 26.2 Time Tracking Backend Service
**References:** Requirement 4 (Mobile Time Recording)
- [x] 26.2.1 Create TimeTrackingService class
- [x] 26.2.2 Implement start_time_tracking method (creates worked node with start time)
- [x] 26.2.3 Implement stop_time_tracking method (updates worked node with end time)
- [x] 26.2.4 Implement get_active_tracking method (get currently running time entries for user)
- [x] 26.2.5 Implement get_task_worked_sum method (calculate total time for task)
- [x] 26.2.6 Implement add_time_entry method (manually add completed time entry)
- [x] 26.2.7 Implement update_time_entry method (edit existing time entry)
- [x] 26.2.8 Implement get_sorted_tasks_for_user method (sort: started by user → scheduled next → all others)
- [x] 26.2.9 Write unit tests for time tracking service

### 26.3 Time Tracking API Endpoints
**References:** Requirement 4 (Mobile Time Recording)
- [x] 26.3.1 Create POST /api/v1/time-tracking/start endpoint (start tracking for task)
- [x] 26.3.2 Create POST /api/v1/time-tracking/stop endpoint (stop active tracking)
- [x] 26.3.3 Create GET /api/v1/time-tracking/active endpoint (get user's active entries)
- [x] 26.3.4 Create GET /api/v1/time-tracking/task/{task_id} endpoint (get all time entries for task)
- [x] 26.3.5 Create POST /api/v1/time-tracking/entries endpoint (manually add time entry)
- [x] 26.3.6 Create PATCH /api/v1/time-tracking/entries/{id} endpoint (update time entry)
- [x] 26.3.7 Create DELETE /api/v1/time-tracking/entries/{id} endpoint (delete time entry)
- [x] 26.3.8 Create GET /api/v1/time-tracking/tasks endpoint (get sorted task list for user)
- [x] 26.3.9 Write integration tests for time tracking endpoints

### 26.4 Mobile App Setup
**References:** Requirement 4 (Mobile Time Recording)
- [ ] 26.4.1 Initialize React Native project for time recording app
- [ ] 26.4.2 Set up navigation (React Navigation)
- [ ] 26.4.3 Configure AsyncStorage for local data persistence
- [ ] 26.4.4 Set up API client for backend communication
- [ ] 26.4.5 Configure build for iOS and Android
- [ ] 26.4.6 Set up authentication flow (login screen)

### 26.5 Mobile App Time Tracking UI
**References:** Requirement 4 (Mobile Time Recording)
- [ ] 26.5.1 Create TaskSelector screen with sorted task list (started → scheduled → all others)
- [ ] 26.5.2 Implement task search and filtering
- [ ] 26.5.3 Create TimeTracking screen with start/stop button
- [ ] 26.5.4 Display active timer with elapsed time
- [ ] 26.5.5 Add optional description field for time entries
- [ ] 26.5.6 Display worked_sum on task items
- [ ] 26.5.7 Create TimeEntryList screen (view history)
- [ ] 26.5.8 Write unit tests for mobile screens

### 26.6 Mobile App User Guide
**References:** Requirement 4 (Mobile Time Recording)
- [ ] 26.6.1 Create user guide document for mobile time tracking app
- [ ] 26.6.2 Document how to select tasks and start/stop tracking
- [ ] 26.6.3 Document task list sorting behavior
- [ ] 26.6.4 Document how to add descriptions to time entries
- [ ] 26.6.5 Document how to view time entry history and worked_sum
- [ ] 26.6.6 Include screenshots and examples
- [ ] 26.6.7 Add troubleshooting section

## Phase 27: Data Export and Backup

### 27.1 Export Service
**References:** Requirement 14 (Data Export and Backup)
- [ ] 27.1.1 Create ExportService class
- [ ] 27.1.2 Implement export_workitems_json method
- [ ] 27.1.3 Implement export_graph_db method
- [ ] 27.1.4 Implement export_audit_logs method
- [ ] 27.1.5 Write unit tests for export service

### 27.2 Backup Service
**References:** Requirement 14 (Data Export and Backup)
- [ ] 27.2.1 Create BackupService class
- [ ] 27.2.2 Implement full backup method (WorkItems, Version_History, Digital_Signatures)
- [ ] 27.2.3 Implement scheduled backup with cron
- [ ] 27.2.4 Implement backup verification
- [ ] 27.2.5 Implement restore from backup
- [ ] 27.2.6 Write integration tests for backup/restore

### 27.3 Export API Endpoints
**References:** Requirement 14 (Data Export and Backup)
- [ ] 27.3.1 Create GET /api/v1/export/workitems endpoint
- [ ] 27.3.2 Create GET /api/v1/export/graph endpoint
- [ ] 27.3.3 Create GET /api/v1/export/audit-logs endpoint
- [ ] 27.3.4 Create POST /api/v1/backup/create endpoint
- [ ] 27.3.5 Create POST /api/v1/backup/restore endpoint
- [ ] 27.3.6 Write integration tests for export endpoints

## Phase 28: Performance Optimization

### 28.1 Backend Optimization
**References:** Requirement 6 (Knowledge Management with Graph Database)
- [ ] 28.1.1 Add database indexes for frequently queried fields
- [ ] 28.1.2 Implement query result caching with Redis (optional)
- [ ] 28.1.3 Optimize graph queries (limit results, pagination)
- [ ] 28.1.4 Implement connection pooling optimization
- [ ] 28.1.5 Add query performance monitoring

### 28.2 Frontend Optimization
**References:** Requirement 16 (Dual Frontend Interface)
- [ ] 28.2.1 Implement code splitting and lazy loading
- [ ] 28.2.2 Optimize 3D rendering (LOD, frustum culling)
- [ ] 28.2.3 Implement virtual scrolling for large lists
- [ ] 28.2.4 Optimize bundle size (tree shaking, minification)
- [ ] 28.2.5 Ensure 72 FPS minimum for VR mode

## Phase 29: Security Hardening

### 29.1 Security Implementation
**References:** Requirement 1 (User Authentication and Authorization)
- [ ] 29.1.1 Implement HTTPS enforcement
- [ ] 29.1.2 Add security headers (HSTS, CSP, X-Frame-Options)
- [ ] 29.1.3 Implement rate limiting on API endpoints
- [ ] 29.1.4 Add input sanitization and validation
- [ ] 29.1.5 Implement CORS configuration
- [ ] 29.1.6 Add SQL injection prevention checks
- [ ] 29.1.7 Conduct security audit and penetration testing

## Phase 30: Testing and Quality Assurance

### 30.1 Backend Testing
**References:** Requirement 17 (Technology Stack)
- [ ] 30.1.1 Achieve 80%+ unit test coverage for backend
- [ ] 30.1.2 Write property-based tests for critical logic
- [ ] 30.1.3 Write integration tests for all API endpoints
- [ ] 30.1.4 Implement API contract testing
- [ ] 30.1.5 Set up continuous integration (CI) pipeline

### 30.2 Frontend Testing
**References:** Requirement 17 (Technology Stack)
- [ ] 30.2.1 Achieve 80%+ unit test coverage for frontend
- [ ] 30.2.2 Write integration tests for critical user flows
- [ ] 30.2.3 Implement E2E tests with Playwright/Cypress
- [ ] 30.2.4 Test XR features on actual devices
- [ ] 30.2.5 Perform accessibility testing (WCAG compliance)

### 30.3 Performance Testing
**References:** Requirement 6 (Knowledge Management with Graph Database)
- [ ] 30.3.1 Load testing for API endpoints
- [ ] 30.3.2 Stress testing for graph queries
- [ ] 30.3.3 Performance testing for 3D/VR rendering
- [ ] 30.3.4 Verify 2-second query response time requirement

## Phase 31: Documentation and Deployment

### 31.1 API Documentation
**References:** Requirement 17 (Technology Stack)
- [ ] 31.1.1 Generate OpenAPI/Swagger documentation
- [ ] 31.1.2 Create API usage examples
- [ ] 31.1.3 Document authentication flow
- [ ] 31.1.4 Create Postman collection for API testing

### 31.2 User Documentation
- [ ] 31.2.1 Create user manual for web interface
- [ ] 31.2.2 Create user manual for XR interface
- [ ] 31.2.3 Create administrator guide
- [ ] 31.2.4 Create compliance documentation

### 31.3 Deployment Setup
**References:** Requirement 17 (Technology Stack)
- [ ] 31.3.1 Create production Docker images
- [ ] 31.3.2 Set up production docker-compose configuration
- [ ] 31.3.3 Configure environment variables for production
- [ ] 31.3.4 Set up SSL/TLS certificates
- [ ] 31.3.5 Configure database backups in production
- [ ] 31.3.6 Set up monitoring and logging (optional: Prometheus, Grafana)
- [ ] 31.3.7 Create deployment runbook
- [ ] 31.3.8 Perform production deployment and smoke testing

## Optional Enhancements

### Optional 1: Advanced Features
- [ ] Implement real-time collaboration with WebSockets
- [ ] Add notification system (email, in-app)
- [ ] Implement advanced search with Elasticsearch
- [ ] Add dashboard with analytics and metrics
- [ ] Implement custom workflow engine
- [ ] Add multi-language support (i18n)

### Optional 2: Integration Features
- [ ] Integrate with external project management tools (Jira, Trello)
- [ ] Integrate with version control systems (Git)
- [ ] Add calendar integration (Google Calendar, Outlook)
- [ ] Implement SSO with OAuth2/SAML
- [ ] Add LDAP/Active Directory integration

### Optional 3: Advanced Visualization
- [ ] Implement AR support for mobile devices
- [ ] Add collaborative multi-user VR sessions
- [ ] Implement gesture recognition for XR
- [ ] Add spatial audio for VR meetings
- [ ] Implement haptic feedback for VR interactions

---

## Task Execution Notes

- Tasks are organized in phases for logical progression
- Each task references specific requirements from requirements.md
- Complete Phase 1-3 before moving to feature development
- Backend and frontend can be developed in parallel after Phase 3
- Mobile app (Phase 24) can be developed independently after Phase 15
- Testing should be continuous throughout development
- Optional tasks are marked with asterisk (*) and can be skipped

## Estimated Timeline

- Phase 1-3: Project Setup (2-3 weeks)
- Phase 4-15: Core Backend (8-10 weeks)
- Phase 16-25: Core Frontend (8-10 weeks)
- Phase 26: Mobile Time Recording App (3-4 weeks)
- Phase 27-28: Export, Backup & Optimization (3-4 weeks)
- Phase 29-30: Security & Testing (3-4 weeks)
- Phase 31: Documentation & Deployment (2 weeks)

**Total Estimated Time: 28-36 weeks (7-9 months)**

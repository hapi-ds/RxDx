# Design Document: Regulated Industry Project Management System

## 1. System Overview

### 1.1 Purpose
This document specifies the technical design for a web-based project management system tailored for regulated industries (medtech, GxP, automotive). The system provides comprehensive project management with strict compliance tracking, digital signatures, versioned requirements management, offline scheduling, and local LLM integration.

### 1.2 Architecture Philosophy
The system follows a modern, scalable architecture with:
- **Backend**: Python 3.11+ with FastAPI for high-performance async API
- **Frontend**: Dual interface approach - standard React web UI and immersive WebXR 3D/VR interface
- **Data Layer**: PostgreSQL for relational data, Apache AGE for graph database
- **Offline-First**: Support for offline operation with synchronization
- **Privacy-First**: Local LLM integration (no external AI services)
- **Compliance-First**: Immutable audit trails and digital signatures

### 1.3 Key Design Decisions

**Decision 1: Dual Database Strategy**
- **Rationale**: User authentication and sensitive data require ACID guarantees (PostgreSQL), while project knowledge benefits from graph relationships (Apache AGE)
- **Trade-off**: Increased complexity vs. optimal data modeling for each domain

**Decision 2: Dual Frontend Interface**
- **Rationale**: Standard web interface for accessibility, immersive XR for enhanced visualization of complex project relationships
- **Trade-off**: Increased development effort vs. innovative user experience for knowledge graph exploration

**Decision 3: Local LLM Integration**
- **Rationale**: Regulatory compliance requires data privacy; no external AI services allowed
- **Trade-off**: Limited model capabilities vs. complete data sovereignty

**Decision 4: Offline-First Architecture**
- **Rationale**: Project managers need to work without constant connectivity
- **Trade-off**: Synchronization complexity vs. user productivity

**Decision 5: Email-Based Work Instructions**
- **Rationale**: Reduce friction for team members who prefer email over web interfaces
- **Trade-off**: Parsing complexity vs. improved adoption


## 2. Technology Stack

### 2.1 Backend Technologies
- **Framework**: FastAPI (Python 3.11+) - Modern async web framework with automatic OpenAPI documentation
- **Data Validation**: Pydantic v2 - Type-safe data validation and settings management
- **Async Runtime**: asyncio with async/await patterns for all I/O operations
- **Package Manager**: uv - Fast Python package installer and resolver
- **Database ORM**: SQLAlchemy 2.0+ (async) - For PostgreSQL operations
- **Graph Database**: Apache AGE - PostgreSQL extension for graph data
- **Authentication**: python-jose (JWT), passlib (password hashing)
- **Cryptography**: cryptography library for digital signatures
- **Document Generation**: 
  - ReportLab - PDF generation
  - openpyxl - Excel generation
  - python-docx-template - Word document generation
- **Scheduling**: ortools - Constraint-based project scheduling
- **Email Processing**: aiosmtplib, email-validator
- **LLM Integration**: LM-Studio compatible API client

### 2.2 Frontend Technologies
- **Framework**: React 18+ with TypeScript
- **State Management**: Zustand - Lightweight state management
- **2D Graph Visualization**: react-flow or react-force-graph - Interactive node editing and visualization
- **3D/VR Visualization**: React Three Fiber (R3F) with WebXR support
- **XR Compatibility**: Meta Quest (2, 3, Pro), Android-XR devices
- **UI Components**: shadcn/ui or Material-UI
- **API Client**: axios or fetch with TypeScript types
- **Build Tool**: Vite

### 2.3 Infrastructure
- **Containerization**: Docker with multi-stage builds using uv
- **Orchestration**: docker-compose v2
- **Database**: PostgreSQL 15+ with Apache AGE extension
- **Reverse Proxy**: nginx or Traefik
- **Mobile App**: React Native for time recording app

### 2.4 Testing
- **Backend Testing**: pytest with hypothesis for property-based testing
- **Frontend Testing**: Jest, React Testing Library
- **E2E Testing**: Playwright or Cypress
- **API Testing**: Postman collections


## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
├──────────────────┬──────────────────┬──────────────────────┤
│   Web Browser    │  Mobile App      │   XR Devices         │
│   (React + TS)   │  (React Native)  │   (R3F + WebXR)      │
└────────┬─────────┴────────┬─────────┴──────────┬───────────┘
         │                  │                     │
         └──────────────────┼─────────────────────┘
                            │ HTTPS/WebSocket
         ┌──────────────────┴─────────────────────┐
         │         API Gateway (FastAPI)          │
         └──────────────────┬─────────────────────┘
                            │
         ┌──────────────────┴─────────────────────┐
         │          Service Layer                  │
         │  ┌────────────────────────────────┐    │
         │  │ Auth │ WorkItem │ Document │... │    │
         │  └────────────────────────────────┘    │
         └──────────────────┬─────────────────────┘
                            │
         ┌──────────────────┴─────────────────────┐
         │          Data Layer                     │
         │  ┌──────────────┬──────────────────┐   │
         │  │ PostgreSQL   │  Apache AGE      │   │
         │  │ (User/Auth)  │  (Graph DB)      │   │
         │  └──────────────┴──────────────────┘   │
         └────────────────────────────────────────┘
                            │
         ┌──────────────────┴─────────────────────┐
         │      External Integrations              │
         │  ┌──────────────┬──────────────────┐   │
         │  │ Email Server │  Local LLM       │   │
         │  │ (SMTP/IMAP)  │  (LM-Studio)     │   │
         │  └──────────────┴──────────────────┘   │
         └────────────────────────────────────────┘
```

### 3.2 Backend Module Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── api/                    # API endpoints
│   │   ├── __init__.py
│   │   ├── deps.py            # Dependency injection
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── workitems.py
│   │   │   ├── requirements.py
│   │   │   ├── tests.py
│   │   │   ├── risks.py
│   │   │   ├── documents.py
│   │   │   ├── schedule.py
│   │   │   └── graph.py
│   ├── core/                   # Core configuration
│   │   ├── __init__.py
│   │   ├── config.py          # Pydantic Settings
│   │   ├── security.py        # Auth utilities
│   │   └── signatures.py      # Digital signature logic
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── workitem.py
│   │   ├── signature.py
│   │   └── audit.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── workitem.py
│   │   ├── requirement.py
│   │   ├── test.py
│   │   └── risk.py
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── workitem_service.py
│   │   ├── signature_service.py
│   │   ├── document_service.py
│   │   ├── scheduler_service.py
│   │   ├── email_service.py
│   │   ├── llm_service.py
│   │   └── graph_service.py
│   ├── db/                     # Database
│   │   ├── __init__.py
│   │   ├── session.py         # SQLAlchemy session
│   │   ├── base.py            # Base model
│   │   └── graph.py           # Apache AGE queries
│   └── utils/                  # Utilities
│       ├── __init__.py
│       ├── email_parser.py
│       └── validators.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   └── ...
├── pyproject.toml
└── uv.lock
```


### 3.3 Frontend Module Structure

```
frontend/
├── src/
│   ├── main.tsx               # Application entry point
│   ├── App.tsx
│   ├── components/            # Reusable components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   ├── workitems/
│   │   │   ├── WorkItemList.tsx
│   │   │   ├── WorkItemDetail.tsx
│   │   │   └── WorkItemForm.tsx
│   │   ├── graph/
│   │   │   ├── GraphView2D.tsx      # react-flow visualization
│   │   │   └── GraphView3D.tsx      # R3F visualization
│   │   └── xr/
│   │       ├── XRScene.tsx          # WebXR scene
│   │       ├── XRControls.tsx
│   │       └── XRWorkItemCard.tsx
│   ├── pages/                 # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Requirements.tsx
│   │   ├── Tests.tsx
│   │   ├── Risks.tsx
│   │   ├── Schedule.tsx
│   │   └── GraphExplorer.tsx
│   ├── stores/                # Zustand stores
│   │   ├── authStore.ts
│   │   ├── workitemStore.ts
│   │   ├── graphStore.ts
│   │   └── uiStore.ts
│   ├── services/              # API clients
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── workitemService.ts
│   │   └── graphService.ts
│   ├── types/                 # TypeScript types
│   │   ├── workitem.ts
│   │   ├── user.ts
│   │   └── graph.ts
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useWorkItems.ts
│   │   └── useGraph.ts
│   └── utils/
│       ├── validators.ts
│       └── formatters.ts
├── package.json
└── tsconfig.json
```

### 3.4 Mobile Time Recording App Structure

```
mobile/
├── src/
│   ├── App.tsx
│   ├── screens/
│   │   ├── TimeEntry.tsx
│   │   ├── TimeList.tsx
│   │   └── Sync.tsx
│   ├── services/
│   │   ├── storage.ts         # Local storage
│   │   ├── sync.ts            # Sync service
│   │   └── api.ts
│   └── types/
│       └── timeEntry.ts
├── package.json
└── app.json
```


## 4. Data Models

### 4.1 PostgreSQL Schema (User & Authentication)

#### User Model
```python
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum('admin', 'project_manager', 'validator', 'auditor', 'user', name='user_role'))
    is_active = Column(Boolean, default=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

#### Digital Signature Model
```python
class DigitalSignature(Base):
    __tablename__ = "digital_signatures"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workitem_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    workitem_version = Column(String, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    signature_hash = Column(String, nullable=False)  # Cryptographic signature
    content_hash = Column(String, nullable=False)    # Hash of signed content
    signed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_valid = Column(Boolean, default=True)
    invalidated_at = Column(DateTime, nullable=True)
    invalidation_reason = Column(String, nullable=True)
```

#### Audit Log Model
```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    action = Column(String, nullable=False)  # CREATE, READ, UPDATE, DELETE, SIGN, AUTH
    entity_type = Column(String, nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    ip_address = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
```

### 4.2 Pydantic Schemas

#### WorkItem Base Schema
```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class WorkItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    status: str = Field(..., pattern='^(draft|active|completed|archived)$')
    priority: Optional[int] = Field(None, ge=1, le=5)
    assigned_to: Optional[UUID] = None
    
class WorkItemCreate(WorkItemBase):
    type: str = Field(..., pattern='^(requirement|task|test|risk|document)$')
    
class WorkItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern='^(draft|active|completed|archived)$')
    priority: Optional[int] = Field(None, ge=1, le=5)
    
class WorkItemResponse(WorkItemBase):
    id: UUID
    type: str
    version: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_signed: bool
    
    class Config:
        from_attributes = True
```


### 4.3 Apache AGE Graph Schema

#### Node Types
```cypher
// WorkItem Node (stored in graph for relationships)
CREATE (:WorkItem {
    id: 'uuid',
    type: 'requirement|task|test|risk|document',
    title: 'string',
    version: 'string',
    status: 'string'
})

// Risk Node (FMEA)
CREATE (:Risk {
    id: 'uuid',
    title: 'string',
    severity: integer,      // 1-10
    occurrence: integer,    // 1-10
    detection: integer,     // 1-10
    rpn: integer           // severity × occurrence × detection
})

// Failure Node (FMEA)
CREATE (:Failure {
    id: 'uuid',
    description: 'string',
    impact: 'string'
})

// Entity Node (from LLM extraction)
CREATE (:Entity {
    id: 'uuid',
    name: 'string',
    type: 'person|component|decision|action',
    source: 'email|meeting|document'
})
```

#### Relationship Types
```cypher
// Traceability relationships
(:Requirement)-[:TESTED_BY]->(:Test)
(:Requirement)-[:MITIGATES]->(:Risk)
(:Requirement)-[:DEPENDS_ON]->(:Requirement)
(:Task)-[:IMPLEMENTS]->(:Requirement)

// FMEA relationships
(:Risk)-[:LEADS_TO {probability: float}]->(:Failure)
(:Failure)-[:LEADS_TO {probability: float}]->(:Failure)

// Knowledge graph relationships
(:Entity)-[:RELATES_TO]->(:Entity)
(:Entity)-[:MENTIONED_IN]->(:WorkItem)
(:WorkItem)-[:REFERENCES]->(:WorkItem)
```

### 4.4 Version History Structure

Version history is stored in the graph database as a linked list:

```cypher
(:WorkItem {version: '1.0'})-[:NEXT_VERSION]->(:WorkItem {version: '1.1'})
                                              -[:NEXT_VERSION]->(:WorkItem {version: '1.2'})
```

Each version node contains:
- Complete snapshot of the WorkItem at that version
- User who created the version
- Timestamp
- Change description
- Reference to digital signatures (stored in PostgreSQL)


## 5. Core Components Design

### 5.1 Authentication & Authorization

#### JWT Token Strategy
```python
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

class AuthService:
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire = timedelta(minutes=30)
        
    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user and handle failed attempts"""
        user = await self.get_user_by_email(email)
        if not user:
            await self.log_auth_attempt(email, success=False)
            return None
            
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise AccountLockedException()
            
        if not self.verify_password(password, user.hashed_password):
            await self.increment_failed_attempts(user)
            await self.log_auth_attempt(email, success=False)
            return None
            
        await self.reset_failed_attempts(user)
        await self.log_auth_attempt(email, success=True, user_id=user.id)
        return user
        
    async def increment_failed_attempts(self, user: User):
        """Lock account after 3 failed attempts"""
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 3:
            user.locked_until = datetime.utcnow() + timedelta(hours=1)
            await self.notify_admin_account_locked(user)
        await self.db.commit()
```

#### Role-Based Access Control
```python
from enum import Enum
from functools import wraps

class Permission(Enum):
    READ_WORKITEM = "read:workitem"
    WRITE_WORKITEM = "write:workitem"
    SIGN_WORKITEM = "sign:workitem"
    DELETE_WORKITEM = "delete:workitem"
    MANAGE_USERS = "manage:users"
    VIEW_AUDIT = "view:audit"

ROLE_PERMISSIONS = {
    "admin": [Permission.MANAGE_USERS, Permission.VIEW_AUDIT, ...],
    "project_manager": [Permission.READ_WORKITEM, Permission.WRITE_WORKITEM, ...],
    "validator": [Permission.READ_WORKITEM, Permission.SIGN_WORKITEM],
    "auditor": [Permission.READ_WORKITEM, Permission.VIEW_AUDIT],
    "user": [Permission.READ_WORKITEM, Permission.WRITE_WORKITEM]
}

def require_permission(permission: Permission):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User, **kwargs):
            if permission not in ROLE_PERMISSIONS.get(current_user.role, []):
                raise PermissionDeniedException()
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator
```

### 5.2 Digital Signature Service

```python
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import hashlib
import json

class SignatureService:
    async def sign_workitem(
        self, 
        workitem_id: UUID, 
        user: User,
        private_key: bytes
    ) -> DigitalSignature:
        """Create cryptographic signature for a WorkItem"""
        # Get current version of workitem from graph
        workitem = await self.graph_service.get_workitem(workitem_id)
        
        # Create content hash
        content = json.dumps(workitem, sort_keys=True)
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        
        # Create signature
        private_key_obj = serialization.load_pem_private_key(
            private_key, 
            password=None
        )
        signature_bytes = private_key_obj.sign(
            content_hash.encode(),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        signature_hash = signature_bytes.hex()
        
        # Store signature
        signature = DigitalSignature(
            workitem_id=workitem_id,
            workitem_version=workitem['version'],
            user_id=user.id,
            signature_hash=signature_hash,
            content_hash=content_hash,
            signed_at=datetime.utcnow()
        )
        self.db.add(signature)
        await self.db.commit()
        
        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="SIGN",
            entity_type="WorkItem",
            entity_id=workitem_id
        )
        
        return signature
        
    async def verify_signature(self, signature: DigitalSignature) -> bool:
        """Verify signature is still valid"""
        if not signature.is_valid:
            return False
            
        # Get workitem at signed version
        workitem = await self.graph_service.get_workitem_version(
            signature.workitem_id,
            signature.workitem_version
        )
        
        # Recalculate content hash
        content = json.dumps(workitem, sort_keys=True)
        current_hash = hashlib.sha256(content.encode()).hexdigest()
        
        return current_hash == signature.content_hash
        
    async def invalidate_signatures(self, workitem_id: UUID, reason: str):
        """Invalidate all signatures when workitem is modified"""
        signatures = await self.db.query(DigitalSignature).filter(
            DigitalSignature.workitem_id == workitem_id,
            DigitalSignature.is_valid == True
        ).all()
        
        for sig in signatures:
            sig.is_valid = False
            sig.invalidated_at = datetime.utcnow()
            sig.invalidation_reason = reason
            
        await self.db.commit()
```


### 5.3 Version Control Service

```python
class VersionService:
    async def create_version(
        self,
        workitem_id: UUID,
        updates: dict,
        user: User,
        change_description: str
    ) -> dict:
        """Create new version of a WorkItem"""
        # Get current version from graph
        current = await self.graph_service.get_workitem(workitem_id)
        
        # Invalidate signatures on current version
        await self.signature_service.invalidate_signatures(
            workitem_id,
            reason="WorkItem modified"
        )
        
        # Calculate new version number
        current_version = current['version']  # e.g., "1.2"
        major, minor = map(int, current_version.split('.'))
        new_version = f"{major}.{minor + 1}"
        
        # Create new version node in graph
        new_workitem = {**current, **updates, 'version': new_version}
        await self.graph_service.create_workitem_version(
            workitem_id=workitem_id,
            version=new_version,
            data=new_workitem,
            user_id=user.id,
            change_description=change_description
        )
        
        # Create version relationship
        await self.graph_service.create_relationship(
            from_id=current['id'],
            to_id=workitem_id,
            rel_type="NEXT_VERSION",
            properties={'created_at': datetime.utcnow().isoformat()}
        )
        
        # Log audit event
        await self.audit_service.log(
            user_id=user.id,
            action="UPDATE",
            entity_type="WorkItem",
            entity_id=workitem_id,
            details={'version': new_version, 'changes': change_description}
        )
        
        return new_workitem
        
    async def get_version_history(self, workitem_id: UUID) -> List[dict]:
        """Get complete version history"""
        query = """
        MATCH (w:WorkItem {id: $workitem_id})-[:NEXT_VERSION*]->(v:WorkItem)
        RETURN v
        ORDER BY v.version DESC
        """
        return await self.graph_service.execute_query(
            query,
            {'workitem_id': str(workitem_id)}
        )
```

### 5.4 Email Processing Service

```python
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
import re

class EmailService:
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        
    async def send_work_instruction(
        self,
        workitem: dict,
        recipients: List[str]
    ):
        """Send work instruction email"""
        message = MIMEMultipart()
        message['Subject'] = f"[WorkItem-{workitem['id']}] {workitem['title']}"
        message['From'] = settings.EMAIL_FROM
        message['To'] = ', '.join(recipients)
        message['Reply-To'] = settings.EMAIL_REPLY_TO
        
        body = f"""
        Work Instruction: {workitem['title']}
        
        Description:
        {workitem['description']}
        
        Status: {workitem['status']}
        Priority: {workitem.get('priority', 'N/A')}
        
        ---
        Reply to this email to update the work item.
        Format: STATUS: <status> | COMMENT: <your comment> | TIME: <hours>
        """
        
        message.attach(MIMEText(body, 'plain'))
        
        async with aiosmtplib.SMTP(
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT
        ) as smtp:
            await smtp.send_message(message)
            
    async def process_incoming_email(self, raw_email: bytes):
        """Process incoming email reply"""
        msg = email.message_from_bytes(raw_email)
        
        # Extract workitem ID from subject
        subject = msg['Subject']
        match = re.search(r'\[WorkItem-([a-f0-9-]+)\]', subject)
        if not match:
            await self.send_parsing_error(msg['From'], "Could not identify work item")
            return
            
        workitem_id = UUID(match.group(1))
        body = self.get_email_body(msg)
        
        # Try structured parsing first
        parsed = self.parse_structured_reply(body)
        
        # If structured parsing fails, use LLM
        if not parsed:
            parsed = await self.llm_service.extract_work_instruction(body)
            
        if not parsed:
            await self.send_parsing_error(
                msg['From'],
                "Could not parse email content"
            )
            return
            
        # Update workitem
        await self.workitem_service.update_from_email(
            workitem_id=workitem_id,
            updates=parsed,
            email_from=msg['From']
        )
        
    def parse_structured_reply(self, body: str) -> Optional[dict]:
        """Parse structured email format"""
        result = {}
        
        status_match = re.search(r'STATUS:\s*(\w+)', body, re.IGNORECASE)
        if status_match:
            result['status'] = status_match.group(1).lower()
            
        comment_match = re.search(r'COMMENT:\s*(.+?)(?=TIME:|$)', body, re.IGNORECASE | re.DOTALL)
        if comment_match:
            result['comment'] = comment_match.group(1).strip()
            
        time_match = re.search(r'TIME:\s*(\d+(?:\.\d+)?)', body, re.IGNORECASE)
        if time_match:
            result['time_spent'] = float(time_match.group(1))
            
        return result if result else None
```


### 5.5 Local LLM Service

```python
import aiohttp
from typing import Optional, List, Dict

class LLMService:
    def __init__(self):
        self.base_url = settings.LLM_STUDIO_URL  # e.g., http://localhost:1234/v1
        self.model = settings.LLM_MODEL_NAME
        self.enabled = settings.LLM_ENABLED
        
    async def extract_work_instruction(self, email_body: str) -> Optional[dict]:
        """Extract structured data from email using LLM"""
        if not self.enabled:
            return None
            
        prompt = f"""
        Extract work instruction information from this email:
        
        {email_body}
        
        Return JSON with these fields (if present):
        - status: current status (draft/active/completed)
        - comment: any comments or updates
        - time_spent: hours worked (as number)
        - next_steps: planned next actions
        
        Return only valid JSON, no other text.
        """
        
        try:
            response = await self._call_llm(prompt)
            return json.loads(response)
        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            return None
            
    async def extract_meeting_knowledge(
        self,
        meeting_text: str
    ) -> Dict[str, List[dict]]:
        """Extract entities and relationships from meeting minutes"""
        if not self.enabled:
            return {'entities': [], 'relationships': [], 'decisions': [], 'actions': []}
            
        prompt = f"""
        Analyze these meeting minutes and extract:
        1. Entities (people, components, systems mentioned)
        2. Decisions made
        3. Action items
        4. Relationships between entities
        
        Meeting text:
        {meeting_text}
        
        Return JSON with structure:
        {{
            "entities": [{{"name": "...", "type": "person|component|system"}}],
            "decisions": [{{"description": "...", "owner": "..."}}],
            "actions": [{{"description": "...", "assignee": "...", "deadline": "..."}}],
            "relationships": [{{"from": "...", "to": "...", "type": "..."}}]
        }}
        """
        
        try:
            response = await self._call_llm(prompt)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Meeting extraction failed: {e}")
            return {'entities': [], 'relationships': [], 'decisions': [], 'actions': []}
            
    async def suggest_requirement_improvements(
        self,
        requirement_text: str
    ) -> List[str]:
        """Analyze requirement quality and suggest improvements"""
        if not self.enabled:
            return []
            
        prompt = f"""
        Analyze this requirement for clarity, testability, and completeness:
        
        {requirement_text}
        
        Provide specific suggestions for improvement. Return JSON array of strings.
        """
        
        try:
            response = await self._call_llm(prompt)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Requirement analysis failed: {e}")
            return []
            
    async def _call_llm(self, prompt: str) -> str:
        """Call LM-Studio compatible API"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant that extracts structured data."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 2000
                },
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                result = await response.json()
                return result['choices'][0]['message']['content']
```


### 5.6 Graph Database Service

```python
from typing import List, Dict, Any
import asyncpg

class GraphService:
    def __init__(self, db_pool: asyncpg.Pool):
        self.pool = db_pool
        
    async def create_workitem_node(
        self,
        workitem_id: UUID,
        workitem_type: str,
        data: dict
    ):
        """Create WorkItem node in graph"""
        query = """
        SELECT * FROM cypher('project_graph', $$
            CREATE (w:WorkItem {
                id: $id,
                type: $type,
                title: $title,
                version: $version,
                status: $status,
                created_at: $created_at
            })
            RETURN w
        $$) as (workitem agtype);
        """
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                str(workitem_id),
                workitem_type,
                data['title'],
                data['version'],
                data['status'],
                data['created_at'].isoformat()
            )
            
    async def create_relationship(
        self,
        from_id: UUID,
        to_id: UUID,
        rel_type: str,
        properties: dict = None
    ):
        """Create relationship between nodes"""
        props_str = ""
        if properties:
            props_str = ", ".join([f"{k}: '{v}'" for k, v in properties.items()])
            props_str = f"{{{props_str}}}"
            
        query = f"""
        SELECT * FROM cypher('project_graph', $$
            MATCH (a {{id: $from_id}})
            MATCH (b {{id: $to_id}})
            CREATE (a)-[r:{rel_type} {props_str}]->(b)
            RETURN r
        $$) as (relationship agtype);
        """
        async with self.pool.acquire() as conn:
            await conn.execute(query, str(from_id), str(to_id))
            
    async def get_traceability_matrix(self, project_id: UUID) -> List[dict]:
        """Get requirements-tests-risks traceability"""
        query = """
        SELECT * FROM cypher('project_graph', $$
            MATCH (r:WorkItem {type: 'requirement'})
            OPTIONAL MATCH (r)-[:TESTED_BY]->(t:WorkItem {type: 'test'})
            OPTIONAL MATCH (r)-[:MITIGATES]->(risk:Risk)
            RETURN r.id as requirement_id,
                   r.title as requirement_title,
                   collect(DISTINCT t.id) as test_ids,
                   collect(DISTINCT risk.id) as risk_ids
        $$) as (requirement_id agtype, requirement_title agtype, 
                test_ids agtype, risk_ids agtype);
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query)
            return [dict(row) for row in rows]
            
    async def get_risk_chains(self, risk_id: UUID) -> List[dict]:
        """Get failure chains from a risk node"""
        query = """
        SELECT * FROM cypher('project_graph', $$
            MATCH path = (r:Risk {id: $risk_id})-[:LEADS_TO*]->(f:Failure)
            RETURN path
        $$) as (path agtype);
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, str(risk_id))
            return self._parse_paths(rows)
            
    async def search_workitems(
        self,
        search_text: str,
        workitem_type: Optional[str] = None
    ) -> List[dict]:
        """Full-text search across workitems"""
        type_filter = f"type: '{workitem_type}'" if workitem_type else ""
        
        query = f"""
        SELECT * FROM cypher('project_graph', $$
            MATCH (w:WorkItem {{{type_filter}}})
            WHERE w.title =~ '(?i).*{search_text}.*' 
               OR w.description =~ '(?i).*{search_text}.*'
            RETURN w
            LIMIT 50
        $$) as (workitem agtype);
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query)
            return [self._parse_node(row['workitem']) for row in rows]
            
    async def get_graph_for_visualization(
        self,
        center_node_id: Optional[UUID] = None,
        depth: int = 2
    ) -> Dict[str, Any]:
        """Get graph data for mind-map visualization"""
        if center_node_id:
            query = f"""
            SELECT * FROM cypher('project_graph', $$
                MATCH path = (center {{id: $center_id}})-[*1..{depth}]-(connected)
                RETURN path
            $$) as (path agtype);
            """
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, str(center_node_id))
        else:
            query = """
            SELECT * FROM cypher('project_graph', $$
                MATCH (n)
                OPTIONAL MATCH (n)-[r]->(m)
                RETURN n, r, m
                LIMIT 1000
            $$) as (node agtype, relationship agtype, target agtype);
            """
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
                
        return self._format_for_visualization(rows)
        
    def _format_for_visualization(self, rows: List) -> Dict[str, Any]:
        """Format graph data for react-flow or R3F"""
        nodes = []
        edges = []
        seen_nodes = set()
        
        for row in rows:
            # Extract nodes and relationships from AGE result
            # Format for frontend consumption
            pass
            
        return {'nodes': nodes, 'edges': edges}
```


### 5.7 Project Scheduler Service

```python
from ortools.sat.python import cp_model
from datetime import datetime, timedelta
from typing import List, Dict

class SchedulerService:
    def __init__(self):
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
    async def schedule_project(
        self,
        tasks: List[dict],
        resources: List[dict],
        constraints: dict
    ) -> Dict[str, Any]:
        """
        Schedule project tasks using constraint programming
        
        Args:
            tasks: List of tasks with duration, dependencies, resource requirements
            resources: List of available resources with capacity
            constraints: Project constraints (deadline, working hours, etc.)
        """
        # Create variables for task start times
        task_vars = {}
        horizon = constraints.get('horizon_days', 365) * 8  # Convert to hours
        
        for task in tasks:
            start_var = self.model.NewIntVar(0, horizon, f"start_{task['id']}")
            end_var = self.model.NewIntVar(0, horizon, f"end_{task['id']}")
            duration = task['estimated_hours']
            
            # Constraint: end = start + duration
            self.model.Add(end_var == start_var + duration)
            
            task_vars[task['id']] = {
                'start': start_var,
                'end': end_var,
                'duration': duration
            }
            
        # Add dependency constraints
        for task in tasks:
            if task.get('dependencies'):
                for dep_id in task['dependencies']:
                    # Task can't start until dependency finishes
                    self.model.Add(
                        task_vars[task['id']]['start'] >= 
                        task_vars[dep_id]['end']
                    )
                    
        # Add resource constraints
        for resource in resources:
            intervals = []
            demands = []
            
            for task in tasks:
                if resource['id'] in task.get('required_resources', []):
                    interval = self.model.NewIntervalVar(
                        task_vars[task['id']]['start'],
                        task_vars[task['id']]['duration'],
                        task_vars[task['id']]['end'],
                        f"interval_{task['id']}_{resource['id']}"
                    )
                    intervals.append(interval)
                    demands.append(task.get('resource_demand', {}).get(resource['id'], 1))
                    
            if intervals:
                self.model.AddCumulative(intervals, demands, resource['capacity'])
                
        # Objective: minimize project completion time
        project_end = self.model.NewIntVar(0, horizon, 'project_end')
        self.model.AddMaxEquality(
            project_end,
            [task_vars[t['id']]['end'] for t in tasks]
        )
        self.model.Minimize(project_end)
        
        # Solve
        status = self.solver.Solve(self.model)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            return self._extract_schedule(tasks, task_vars)
        else:
            return {'status': 'infeasible', 'conflicts': self._identify_conflicts()}
            
    def _extract_schedule(self, tasks: List[dict], task_vars: dict) -> dict:
        """Extract schedule from solved model"""
        schedule = []
        project_start = datetime.now()
        
        for task in tasks:
            start_hours = self.solver.Value(task_vars[task['id']]['start'])
            end_hours = self.solver.Value(task_vars[task['id']]['end'])
            
            # Convert hours to calendar dates (assuming 8-hour workdays)
            start_date = project_start + timedelta(hours=start_hours)
            end_date = project_start + timedelta(hours=end_hours)
            
            schedule.append({
                'task_id': task['id'],
                'task_title': task['title'],
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'duration_hours': end_hours - start_hours
            })
            
        return {
            'status': 'success',
            'schedule': schedule,
            'project_duration_hours': self.solver.Value(
                max(task_vars[t['id']]['end'] for t in tasks)
            )
        }
        
    def _identify_conflicts(self) -> List[str]:
        """Identify scheduling conflicts"""
        # Analyze model to find conflicting constraints
        conflicts = []
        # Implementation depends on ortools conflict detection
        return conflicts
```


### 5.8 Document Generation Service

```python
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from openpyxl import Workbook
from docxtpl import DocxTemplate
from datetime import datetime

class DocumentService:
    async def generate_design_review_pdf(
        self,
        project_id: UUID,
        include_signatures: bool = True
    ) -> bytes:
        """Generate design phase review PDF"""
        # Get all requirements and related items
        requirements = await self.graph_service.get_workitems_by_type(
            project_id,
            'requirement'
        )
        
        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        story.append(Paragraph("Design Phase Review", styles['Title']))
        story.append(Spacer(1, 12))
        
        # Metadata
        story.append(Paragraph(f"Generated: {datetime.now().isoformat()}", styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Requirements section
        for req in requirements:
            story.append(Paragraph(f"Requirement: {req['title']}", styles['Heading2']))
            story.append(Paragraph(req['description'], styles['Normal']))
            
            # Add signatures if requested
            if include_signatures:
                signatures = await self.signature_service.get_signatures(req['id'])
                if signatures:
                    sig_data = [[s.user.full_name, s.signed_at.isoformat(), 
                                "Valid" if s.is_valid else "Invalid"] 
                               for s in signatures]
                    sig_table = Table([['Signer', 'Date', 'Status']] + sig_data)
                    sig_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black)
                    ]))
                    story.append(sig_table)
                    
            story.append(Spacer(1, 12))
            
        doc.build(story)
        return buffer.getvalue()
        
    async def generate_traceability_matrix_pdf(
        self,
        project_id: UUID
    ) -> bytes:
        """Generate requirements traceability matrix"""
        matrix_data = await self.graph_service.get_traceability_matrix(project_id)
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        story.append(Paragraph("Requirements Traceability Matrix", styles['Title']))
        story.append(Spacer(1, 12))
        
        # Create table
        table_data = [['Requirement', 'Tests', 'Risks']]
        for row in matrix_data:
            table_data.append([
                row['requirement_title'],
                ', '.join(row['test_ids']) if row['test_ids'] else 'None',
                ', '.join(row['risk_ids']) if row['risk_ids'] else 'None'
            ])
            
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 8)
        ]))
        story.append(table)
        
        doc.build(story)
        return buffer.getvalue()
        
    async def generate_fmea_excel(
        self,
        project_id: UUID
    ) -> bytes:
        """Generate FMEA Excel file with risk chains"""
        risks = await self.graph_service.get_all_risks(project_id)
        
        wb = Workbook()
        ws = wb.active
        ws.title = "FMEA"
        
        # Headers
        headers = ['Risk ID', 'Description', 'Severity', 'Occurrence', 
                  'Detection', 'RPN', 'Failure Chain', 'Mitigation']
        ws.append(headers)
        
        for risk in risks:
            # Get failure chain
            chains = await self.graph_service.get_risk_chains(risk['id'])
            chain_str = ' -> '.join([f['description'] for f in chains])
            
            ws.append([
                str(risk['id']),
                risk['title'],
                risk['severity'],
                risk['occurrence'],
                risk['detection'],
                risk['rpn'],
                chain_str,
                risk.get('mitigation', '')
            ])
            
        # Style the header row
        for cell in ws[1]:
            cell.font = cell.font.copy(bold=True)
            cell.fill = cell.fill.copy(fgColor="CCCCCC")
            
        buffer = io.BytesIO()
        wb.save(buffer)
        return buffer.getvalue()
        
    async def generate_invoice_word(
        self,
        project_id: UUID,
        billing_period: dict,
        template_path: str
    ) -> bytes:
        """Generate invoice using Word template"""
        # Get time entries
        time_entries = await self.time_service.get_time_entries(
            project_id=project_id,
            start_date=billing_period['start'],
            end_date=billing_period['end']
        )
        
        # Aggregate by user and task
        aggregated = {}
        for entry in time_entries:
            key = (entry['user_id'], entry['task_id'])
            if key not in aggregated:
                aggregated[key] = {
                    'user_name': entry['user_name'],
                    'task_title': entry['task_title'],
                    'hours': 0,
                    'rate': entry['hourly_rate']
                }
            aggregated[key]['hours'] += entry['duration_hours']
            
        # Calculate totals
        line_items = []
        total = 0
        for item in aggregated.values():
            subtotal = item['hours'] * item['rate']
            line_items.append({
                'description': f"{item['user_name']} - {item['task_title']}",
                'hours': item['hours'],
                'rate': item['rate'],
                'subtotal': subtotal
            })
            total += subtotal
            
        # Load template and render
        doc = DocxTemplate(template_path)
        context = {
            'invoice_date': datetime.now().strftime('%Y-%m-%d'),
            'billing_period': f"{billing_period['start']} to {billing_period['end']}",
            'line_items': line_items,
            'subtotal': total,
            'tax': total * 0.19,  # Example tax rate
            'total': total * 1.19
        }
        doc.render(context)
        
        buffer = io.BytesIO()
        doc.save(buffer)
        return buffer.getvalue()
```


## 6. Frontend Architecture

### 6.1 State Management with Zustand

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'project_manager' | 'validator' | 'auditor' | 'user';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (email: string, password: string) => {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
          throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        set({
          user: data.user,
          token: data.access_token,
          isAuthenticated: true
        });
      },
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      refreshToken: async () => {
        const { token } = get();
        const response = await fetch('/api/v1/auth/refresh', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          set({ token: data.access_token });
        } else {
          get().logout();
        }
      }
    }),
    { name: 'auth-storage' }
  )
);
```

```typescript
// stores/graphStore.ts
import { create } from 'zustand';
import { Node, Edge } from 'react-flow-renderer';

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  viewMode: '2d' | '3d';
  
  loadGraph: (centerNodeId?: string, depth?: number) => Promise<void>;
  selectNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: any) => Promise<void>;
  createRelationship: (fromId: string, toId: string, type: string) => Promise<void>;
  setViewMode: (mode: '2d' | '3d') => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  viewMode: '2d',
  
  loadGraph: async (centerNodeId?: string, depth: number = 2) => {
    const params = new URLSearchParams();
    if (centerNodeId) params.append('center_node_id', centerNodeId);
    params.append('depth', depth.toString());
    
    const response = await fetch(`/api/v1/graph/visualization?${params}`);
    const data = await response.json();
    
    set({
      nodes: data.nodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        position: n.position || { x: 0, y: 0 },
        data: n.data
      })),
      edges: data.edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        label: e.label
      }))
    });
  },
  
  selectNode: (nodeId: string) => {
    const node = get().nodes.find(n => n.id === nodeId);
    set({ selectedNode: node || null });
  },
  
  updateNode: async (nodeId: string, data: any) => {
    await fetch(`/api/v1/workitems/${nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    await get().loadGraph();
  },
  
  createRelationship: async (fromId: string, toId: string, type: string) => {
    await fetch('/api/v1/graph/relationships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_id: fromId, to_id: toId, type })
    });
    
    await get().loadGraph();
  },
  
  setViewMode: (mode: '2d' | '3d') => {
    set({ viewMode: mode });
  }
}));
```


### 6.2 2D Graph Visualization with react-flow

```typescript
// components/graph/GraphView2D.tsx
import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MiniMap
} from 'react-flow-renderer';
import { useGraphStore } from '../../stores/graphStore';

const nodeTypes = {
  requirement: RequirementNode,
  task: TaskNode,
  test: TestNode,
  risk: RiskNode
};

export const GraphView2D: React.FC = () => {
  const { nodes, edges, loadGraph, selectNode, createRelationship } = useGraphStore();
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);
  
  useEffect(() => {
    loadGraph();
  }, []);
  
  useEffect(() => {
    setFlowNodes(nodes);
    setFlowEdges(edges);
  }, [nodes, edges]);
  
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        createRelationship(
          connection.source,
          connection.target,
          'RELATES_TO'
        );
      }
    },
    [createRelationship]
  );
  
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );
  
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

// Custom node component
const RequirementNode: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="requirement-node">
      <div className="node-header">
        <span className="node-type">REQ</span>
        <span className="node-id">{data.id}</span>
      </div>
      <div className="node-content">
        <h4>{data.title}</h4>
        {data.is_signed && <span className="signed-badge">✓ Signed</span>}
      </div>
    </div>
  );
};
```

### 6.3 3D/VR Visualization with React Three Fiber

```typescript
// components/graph/GraphView3D.tsx
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { VRButton, XR, Controllers, Hands } from '@react-three/xr';
import { useGraphStore } from '../../stores/graphStore';
import * as THREE from 'three';

export const GraphView3D: React.FC = () => {
  return (
    <>
      <VRButton />
      <Canvas>
        <XR>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Controllers />
          <Hands />
          <GraphScene />
          <OrbitControls />
        </XR>
      </Canvas>
    </>
  );
};

const GraphScene: React.FC = () => {
  const { nodes, edges, selectNode } = useGraphStore();
  
  // Position nodes in 3D space using force-directed layout
  const nodePositions = useMemo(() => {
    return calculateForceDirectedLayout3D(nodes, edges);
  }, [nodes, edges]);
  
  return (
    <group>
      {/* Render nodes */}
      {nodes.map((node, index) => (
        <Node3D
          key={node.id}
          node={node}
          position={nodePositions[index]}
          onClick={() => selectNode(node.id)}
        />
      ))}
      
      {/* Render edges */}
      {edges.map((edge) => {
        const sourcePos = nodePositions[nodes.findIndex(n => n.id === edge.source)];
        const targetPos = nodePositions[nodes.findIndex(n => n.id === edge.target)];
        return (
          <Line
            key={edge.id}
            points={[sourcePos, targetPos]}
            color="white"
            lineWidth={1}
          />
        );
      })}
    </group>
  );
};

const Node3D: React.FC<{
  node: any;
  position: THREE.Vector3;
  onClick: () => void;
}> = ({ node, position, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);
  
  useFrame(() => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y += 0.01;
    }
  });
  
  const color = useMemo(() => {
    const colors = {
      requirement: '#3b82f6',
      task: '#10b981',
      test: '#f59e0b',
      risk: '#ef4444'
    };
    return colors[node.type as keyof typeof colors] || '#6b7280';
  }, [node.type]);
  
  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.5 : 0}
        />
      </mesh>
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {node.data.title}
      </Text>
    </group>
  );
};

function calculateForceDirectedLayout3D(
  nodes: any[],
  edges: any[]
): THREE.Vector3[] {
  // Implement 3D force-directed layout algorithm
  // This is a simplified version - use a proper physics engine for production
  const positions: THREE.Vector3[] = [];
  
  nodes.forEach((_, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    const radius = 5;
    positions.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        (Math.random() - 0.5) * 3
      )
    );
  });
  
  return positions;
}
```


### 6.4 Mobile Time Recording App

```typescript
// mobile/src/screens/TimeEntry.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useTimeStore } from '../stores/timeStore';

export const TimeEntryScreen: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const { startEntry, stopEntry, syncEntries } = useTimeStore();
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && currentEntry) {
      interval = setInterval(() => {
        const now = Date.now();
        const start = new Date(currentEntry.start_time).getTime();
        setElapsed(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, currentEntry]);
  
  const handleStart = async () => {
    const entry = await startEntry({
      project_id: 'selected-project-id',
      task_id: 'selected-task-id',
      start_time: new Date().toISOString()
    });
    setCurrentEntry(entry);
    setIsTracking(true);
  };
  
  const handleStop = async () => {
    if (currentEntry) {
      await stopEntry(currentEntry.id, {
        end_time: new Date().toISOString(),
        description: 'Work completed'
      });
      setIsTracking(false);
      setCurrentEntry(null);
      setElapsed(0);
      
      // Try to sync
      await syncEntries();
    }
  };
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{formatTime(elapsed)}</Text>
      {!isTracking ? (
        <Button title="Start Tracking" onPress={handleStart} />
      ) : (
        <Button title="Stop Tracking" onPress={handleStop} color="red" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 30
  }
});
```

```typescript
// mobile/src/services/sync.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export class SyncService {
  private readonly STORAGE_KEY = 'pending_time_entries';
  
  async syncTimeEntries(): Promise<void> {
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      console.log('No network connection, skipping sync');
      return;
    }
    
    // Get pending entries from local storage
    const pendingJson = await AsyncStorage.getItem(this.STORAGE_KEY);
    if (!pendingJson) return;
    
    const pendingEntries = JSON.parse(pendingJson);
    const synced: string[] = [];
    
    for (const entry of pendingEntries) {
      try {
        const response = await fetch('/api/v1/time-entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getToken()}`
          },
          body: JSON.stringify(entry)
        });
        
        if (response.ok) {
          synced.push(entry.id);
        }
      } catch (error) {
        console.error('Failed to sync entry:', error);
      }
    }
    
    // Remove synced entries
    const remaining = pendingEntries.filter(
      (e: any) => !synced.includes(e.id)
    );
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(remaining));
  }
  
  async savePendingEntry(entry: any): Promise<void> {
    const pendingJson = await AsyncStorage.getItem(this.STORAGE_KEY);
    const pending = pendingJson ? JSON.parse(pendingJson) : [];
    pending.push(entry);
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(pending));
  }
  
  private async getToken(): Promise<string> {
    return await AsyncStorage.getItem('auth_token') || '';
  }
}
```


## 7. API Design

### 7.1 API Endpoints

#### Authentication
```
POST   /api/v1/auth/login              # Authenticate user
POST   /api/v1/auth/refresh            # Refresh access token
POST   /api/v1/auth/logout             # Logout user
GET    /api/v1/auth/me                 # Get current user
```

#### WorkItems
```
GET    /api/v1/workitems               # List workitems (with filters)
POST   /api/v1/workitems               # Create workitem
GET    /api/v1/workitems/{id}          # Get workitem details
PATCH  /api/v1/workitems/{id}          # Update workitem (creates new version)
DELETE /api/v1/workitems/{id}          # Delete workitem (if not signed)
GET    /api/v1/workitems/{id}/history  # Get version history
GET    /api/v1/workitems/{id}/version/{version}  # Get specific version
```

#### Digital Signatures
```
POST   /api/v1/signatures              # Sign a workitem
GET    /api/v1/signatures/{id}         # Get signature details
GET    /api/v1/workitems/{id}/signatures  # Get all signatures for workitem
POST   /api/v1/signatures/{id}/verify  # Verify signature
```

#### Requirements
```
GET    /api/v1/requirements            # List requirements
POST   /api/v1/requirements            # Create requirement
GET    /api/v1/requirements/{id}       # Get requirement
PATCH  /api/v1/requirements/{id}       # Update requirement
POST   /api/v1/requirements/{id}/comments  # Add comment
```

#### Tests
```
GET    /api/v1/tests                   # List test specs
POST   /api/v1/tests                   # Create test spec
GET    /api/v1/tests/{id}              # Get test spec
POST   /api/v1/tests/{id}/runs         # Create test run
GET    /api/v1/tests/{id}/runs         # List test runs
PATCH  /api/v1/tests/runs/{run_id}     # Update test run results
GET    /api/v1/tests/coverage          # Get test coverage metrics
```

#### Risks (FMEA)
```
GET    /api/v1/risks                   # List risks
POST   /api/v1/risks                   # Create risk
GET    /api/v1/risks/{id}              # Get risk details
PATCH  /api/v1/risks/{id}              # Update risk
POST   /api/v1/risks/{id}/failures     # Add failure node
GET    /api/v1/risks/{id}/chains       # Get failure chains
POST   /api/v1/risks/{id}/mitigations  # Add mitigation action
```

#### Graph & Knowledge
```
GET    /api/v1/graph/visualization     # Get graph for visualization
POST   /api/v1/graph/relationships     # Create relationship
DELETE /api/v1/graph/relationships/{id}  # Delete relationship
GET    /api/v1/graph/search            # Search graph
GET    /api/v1/graph/traceability      # Get traceability matrix
```

#### Scheduling
```
POST   /api/v1/schedule/calculate      # Calculate project schedule
GET    /api/v1/schedule/{project_id}   # Get current schedule
PATCH  /api/v1/schedule/{project_id}   # Update schedule manually
GET    /api/v1/schedule/{project_id}/gantt  # Get Gantt chart data
```

#### Documents
```
POST   /api/v1/documents/design-review  # Generate design review PDF
POST   /api/v1/documents/traceability   # Generate traceability matrix
POST   /api/v1/documents/fmea           # Generate FMEA Excel
POST   /api/v1/documents/invoice        # Generate invoice Word doc
GET    /api/v1/documents/{id}           # Download document
```

#### Time Tracking
```
POST   /api/v1/time-entries            # Create time entry
GET    /api/v1/time-entries            # List time entries
PATCH  /api/v1/time-entries/{id}       # Update time entry
DELETE /api/v1/time-entries/{id}       # Delete time entry
POST   /api/v1/time-entries/sync       # Sync mobile entries
```

#### Email Integration
```
POST   /api/v1/email/send-instruction  # Send work instruction email
POST   /api/v1/email/process-incoming  # Process incoming email (webhook)
POST   /api/v1/email/extract-knowledge # Extract knowledge from email
```

#### LLM Integration
```
POST   /api/v1/llm/extract-instruction # Extract work instruction from text
POST   /api/v1/llm/extract-meeting     # Extract meeting knowledge
POST   /api/v1/llm/analyze-requirement # Analyze requirement quality
GET    /api/v1/llm/status              # Check LLM availability
```

#### Audit
```
GET    /api/v1/audit/logs              # Get audit logs (with filters)
GET    /api/v1/audit/report            # Generate audit report
```

### 7.2 API Request/Response Examples

#### Create Requirement
```http
POST /api/v1/requirements
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "User authentication shall use JWT tokens",
  "description": "The system shall implement JWT-based authentication...",
  "priority": 1,
  "status": "draft"
}

Response 201:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "requirement",
  "title": "User authentication shall use JWT tokens",
  "description": "The system shall implement JWT-based authentication...",
  "version": "1.0",
  "status": "draft",
  "priority": 1,
  "created_by": "user-id",
  "created_at": "2026-01-17T10:00:00Z",
  "updated_at": "2026-01-17T10:00:00Z",
  "is_signed": false
}
```

#### Sign WorkItem
```http
POST /api/v1/signatures
Content-Type: application/json
Authorization: Bearer <token>

{
  "workitem_id": "550e8400-e29b-41d4-a716-446655440000",
  "private_key": "<base64-encoded-private-key>"
}

Response 201:
{
  "id": "signature-id",
  "workitem_id": "550e8400-e29b-41d4-a716-446655440000",
  "workitem_version": "1.0",
  "user_id": "user-id",
  "user_name": "John Doe",
  "signed_at": "2026-01-17T10:05:00Z",
  "is_valid": true
}
```


## 8. Database Design

### 8.1 PostgreSQL Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'project_manager', 'validator', 'auditor', 'user')),
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Digital signatures table
CREATE TABLE digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workitem_id UUID NOT NULL,
    workitem_version VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    signature_hash TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    signed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT TRUE,
    invalidated_at TIMESTAMP,
    invalidation_reason TEXT
);

CREATE INDEX idx_signatures_workitem ON digital_signatures(workitem_id);
CREATE INDEX idx_signatures_user ON digital_signatures(user_id);
CREATE INDEX idx_signatures_valid ON digital_signatures(is_valid);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    details JSONB
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Time entries table
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    project_id UUID NOT NULL,
    task_id UUID,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_hours DECIMAL(10, 2),
    description TEXT,
    category VARCHAR(100),
    synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_dates ON time_entries(start_time, end_time);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    version VARCHAR(50) NOT NULL,
    generated_by UUID NOT NULL REFERENCES users(id),
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_generated_at ON documents(generated_at DESC);
```

### 8.2 Apache AGE Graph Schema Setup

```sql
-- Load AGE extension
CREATE EXTENSION IF NOT EXISTS age;
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- Create graph
SELECT create_graph('project_graph');

-- Create vertex labels
SELECT create_vlabel('project_graph', 'WorkItem');
SELECT create_vlabel('project_graph', 'Risk');
SELECT create_vlabel('project_graph', 'Failure');
SELECT create_vlabel('project_graph', 'Entity');
SELECT create_vlabel('project_graph', 'Project');

-- Create edge labels
SELECT create_elabel('project_graph', 'TESTED_BY');
SELECT create_elabel('project_graph', 'MITIGATES');
SELECT create_elabel('project_graph', 'DEPENDS_ON');
SELECT create_elabel('project_graph', 'IMPLEMENTS');
SELECT create_elabel('project_graph', 'LEADS_TO');
SELECT create_elabel('project_graph', 'RELATES_TO');
SELECT create_elabel('project_graph', 'MENTIONED_IN');
SELECT create_elabel('project_graph', 'REFERENCES');
SELECT create_elabel('project_graph', 'NEXT_VERSION');
SELECT create_elabel('project_graph', 'BELONGS_TO');

-- Create indexes for performance
CREATE INDEX ON project_graph."WorkItem" USING gin (properties);
CREATE INDEX ON project_graph."Risk" USING gin (properties);
```

### 8.3 Graph Query Examples

```sql
-- Get all requirements with their tests
SELECT * FROM cypher('project_graph', $$
    MATCH (r:WorkItem {type: 'requirement'})-[:TESTED_BY]->(t:WorkItem {type: 'test'})
    RETURN r.id, r.title, collect(t.id) as test_ids
$$) as (req_id agtype, req_title agtype, test_ids agtype);

-- Get risk failure chains with probabilities
SELECT * FROM cypher('project_graph', $$
    MATCH path = (r:Risk {id: $risk_id})-[rel:LEADS_TO*]->(f:Failure)
    RETURN path, 
           reduce(prob = 1.0, r in relationships(path) | prob * r.probability) as chain_probability
$$) as (path agtype, probability agtype);

-- Get all workitems related to a specific entity
SELECT * FROM cypher('project_graph', $$
    MATCH (e:Entity {name: $entity_name})-[:MENTIONED_IN]->(w:WorkItem)
    RETURN w
$$) as (workitem agtype);

-- Get version history
SELECT * FROM cypher('project_graph', $$
    MATCH path = (w:WorkItem {id: $workitem_id})-[:NEXT_VERSION*]->(v:WorkItem)
    RETURN v
    ORDER BY v.version DESC
$$) as (version agtype);
```


## 9. Deployment Architecture

### 9.1 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: regulated_pm
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-age.sql:/docker-entrypoint-initdb.d/01-init-age.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@postgres:5432/regulated_pm
      SECRET_KEY: ${SECRET_KEY}
      LLM_STUDIO_URL: http://host.docker.internal:1234/v1
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
    volumes:
      - ./backend:/app
      - backend_uploads:/app/uploads
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    command: uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_URL: http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    command: npm run dev -- --host

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
  backend_uploads:
```

### 9.2 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim as builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Production stage
FROM python:3.11-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy uv and virtual environment from builder
COPY --from=builder /usr/local/bin/uv /usr/local/bin/uv
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY . .

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Run application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 9.3 Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 9.4 Environment Configuration

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    # Application
    APP_NAME: str = "Regulated PM System"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Email
    SMTP_HOST: str
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str
    EMAIL_REPLY_TO: str
    
    # LLM
    LLM_ENABLED: bool = True
    LLM_STUDIO_URL: str = "http://localhost:1234/v1"
    LLM_MODEL_NAME: str = "local-model"
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    
    # Audit
    AUDIT_LOG_RETENTION_DAYS: int = 3650  # 10 years

settings = Settings()
```


## 10. Security Design

### 10.1 Authentication Flow

```
1. User submits credentials (email + password)
2. Backend validates credentials
3. Backend checks account lock status
4. Backend increments failed attempts on failure (locks after 3 attempts)
5. Backend generates JWT token on success
6. Frontend stores token in secure storage
7. Frontend includes token in Authorization header for all requests
8. Backend validates token on each request
9. Backend refreshes token before expiration
```

### 10.2 Digital Signature Flow

```
1. User initiates signing of WorkItem
2. Frontend generates or retrieves user's private key
3. Backend retrieves current WorkItem version from graph
4. Backend creates content hash (SHA-256)
5. Backend signs content hash with private key (RSA-PSS)
6. Backend stores signature in PostgreSQL
7. Backend logs signature event in audit log
8. On WorkItem modification:
   a. Backend invalidates all existing signatures
   b. Backend requires re-signing
9. On signature verification:
   a. Backend retrieves WorkItem at signed version
   b. Backend recalculates content hash
   c. Backend compares with stored hash
```

### 10.3 Authorization Matrix

| Role             | Read WorkItem | Write WorkItem | Sign WorkItem | Delete WorkItem | Manage Users | View Audit |
|------------------|---------------|----------------|---------------|-----------------|--------------|------------|
| Admin            | ✓             | ✓              | ✓             | ✓               | ✓            | ✓          |
| Project Manager  | ✓             | ✓              | ✓             | ✓               | ✗            | ✗          |
| Validator        | ✓             | ✗              | ✓             | ✗               | ✗            | ✗          |
| Auditor          | ✓             | ✗              | ✗             | ✗               | ✗            | ✓          |
| User             | ✓             | ✓              | ✗             | ✗               | ✗            | ✗          |

### 10.4 Data Protection

#### Encryption at Rest
- Database: PostgreSQL with encryption enabled
- File uploads: Encrypted using AES-256
- Backup files: Encrypted before storage

#### Encryption in Transit
- All API communication over HTTPS (TLS 1.3)
- WebSocket connections over WSS
- Email communication over TLS

#### Sensitive Data Handling
- Passwords: Hashed with bcrypt (cost factor 12)
- JWT tokens: Signed with HS256, short expiration
- Private keys: Never stored on server, only client-side
- Audit logs: Immutable, append-only

### 10.5 Security Headers

```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```


## 11. Testing Strategy

### 11.1 Testing Framework

**Backend Testing**
- Framework: pytest with pytest-asyncio
- Property-Based Testing: hypothesis
- Coverage Target: >80%
- Test Types: Unit, Integration, Property-Based

**Frontend Testing**
- Framework: Jest + React Testing Library
- E2E Testing: Playwright
- Coverage Target: >75%

### 11.2 Property-Based Testing Approach

Property-based tests will validate correctness properties across the system:

#### Authentication Properties
```python
from hypothesis import given, strategies as st
import pytest

@given(
    email=st.emails(),
    password=st.text(min_size=8, max_size=100)
)
async def test_authentication_idempotency(email, password):
    """Property: Authenticating with same credentials produces same result"""
    result1 = await auth_service.authenticate(email, password)
    result2 = await auth_service.authenticate(email, password)
    assert (result1 is None) == (result2 is None)

@given(
    attempts=st.integers(min_value=3, max_value=10)
)
async def test_account_lockout_after_failed_attempts(attempts):
    """Property: Account locks after 3 failed attempts"""
    user = await create_test_user()
    for _ in range(attempts):
        await auth_service.authenticate(user.email, "wrong_password")
    
    user_refreshed = await get_user(user.id)
    assert user_refreshed.locked_until is not None
```

#### Version Control Properties
```python
@given(
    updates=st.lists(
        st.dictionaries(
            keys=st.sampled_from(['title', 'description', 'status']),
            values=st.text(min_size=1, max_size=100)
        ),
        min_size=1,
        max_size=10
    )
)
async def test_version_history_completeness(updates):
    """Property: All versions are preserved in history"""
    workitem = await create_test_workitem()
    
    for update in updates:
        await version_service.create_version(
            workitem.id,
            update,
            test_user,
            "Test update"
        )
    
    history = await version_service.get_version_history(workitem.id)
    assert len(history) == len(updates) + 1  # +1 for initial version
```

#### Digital Signature Properties
```python
@given(
    content=st.text(min_size=1, max_size=1000)
)
async def test_signature_invalidation_on_modification(content):
    """Property: Modifying signed content invalidates signature"""
    workitem = await create_test_workitem({'description': content})
    signature = await signature_service.sign_workitem(
        workitem.id,
        test_user,
        test_private_key
    )
    
    # Modify workitem
    await version_service.create_version(
        workitem.id,
        {'description': content + ' modified'},
        test_user,
        "Modified"
    )
    
    # Signature should be invalidated
    signature_refreshed = await get_signature(signature.id)
    assert signature_refreshed.is_valid == False
```

### 11.3 Integration Testing

```python
# tests/integration/test_workitem_lifecycle.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_complete_workitem_lifecycle(client: AsyncClient, auth_headers):
    """Test complete lifecycle: create -> update -> sign -> verify"""
    
    # Create requirement
    response = await client.post(
        "/api/v1/requirements",
        json={
            "title": "Test Requirement",
            "description": "Test description",
            "status": "draft"
        },
        headers=auth_headers
    )
    assert response.status_code == 201
    workitem = response.json()
    
    # Update requirement (creates new version)
    response = await client.patch(
        f"/api/v1/requirements/{workitem['id']}",
        json={"status": "active"},
        headers=auth_headers
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated['version'] == "1.1"
    
    # Sign requirement
    response = await client.post(
        "/api/v1/signatures",
        json={
            "workitem_id": workitem['id'],
            "private_key": test_private_key_b64
        },
        headers=auth_headers
    )
    assert response.status_code == 201
    signature = response.json()
    
    # Verify signature
    response = await client.post(
        f"/api/v1/signatures/{signature['id']}/verify",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()['is_valid'] == True
    
    # Attempt to modify signed workitem
    response = await client.patch(
        f"/api/v1/requirements/{workitem['id']}",
        json={"description": "Modified"},
        headers=auth_headers
    )
    assert response.status_code == 200
    
    # Verify signature is now invalid
    response = await client.post(
        f"/api/v1/signatures/{signature['id']}/verify",
        headers=auth_headers
    )
    assert response.json()['is_valid'] == False
```

### 11.4 E2E Testing

```typescript
// tests/e2e/requirement-management.spec.ts
import { test, expect } from '@playwright/test';

test('complete requirement workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Navigate to requirements
  await page.click('text=Requirements');
  await expect(page).toHaveURL('/requirements');
  
  // Create new requirement
  await page.click('text=New Requirement');
  await page.fill('[name="title"]', 'Test Requirement');
  await page.fill('[name="description"]', 'Test description');
  await page.click('button:has-text("Create")');
  
  // Verify requirement appears in list
  await expect(page.locator('text=Test Requirement')).toBeVisible();
  
  // Open requirement details
  await page.click('text=Test Requirement');
  
  // Sign requirement
  await page.click('button:has-text("Sign")');
  await page.fill('[name="private_key"]', testPrivateKey);
  await page.click('button:has-text("Confirm")');
  
  // Verify signature badge appears
  await expect(page.locator('text=✓ Signed')).toBeVisible();
});
```


## 12. Performance Considerations

### 12.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 200ms | For typical CRUD operations |
| Graph Query Time | < 2s | For visualization queries |
| Document Generation | < 5s | For PDF/Excel generation |
| WebXR Frame Rate | > 72 FPS | On Meta Quest 2/3 |
| Time to Interactive (Web) | < 3s | First meaningful paint |
| Database Query Time | < 100ms | For indexed queries |

### 12.2 Optimization Strategies

#### Backend Optimization
```python
# Use connection pooling
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)

# Cache frequently accessed data
from functools import lru_cache
from cachetools import TTLCache

graph_cache = TTLCache(maxsize=1000, ttl=300)  # 5 minute TTL

@lru_cache(maxsize=100)
async def get_user_permissions(user_id: UUID) -> List[Permission]:
    """Cache user permissions"""
    pass

# Batch database operations
async def create_multiple_workitems(workitems: List[dict]):
    """Batch insert workitems"""
    async with AsyncSession(engine) as session:
        session.add_all([WorkItem(**w) for w in workitems])
        await session.commit()
```

#### Frontend Optimization
```typescript
// Code splitting
const GraphView3D = lazy(() => import('./components/graph/GraphView3D'));
const XRScene = lazy(() => import('./components/xr/XRScene'));

// Virtualized lists for large datasets
import { FixedSizeList } from 'react-window';

const WorkItemList: React.FC<{ items: WorkItem[] }> = ({ items }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <WorkItemCard item={items[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};

// Debounce search inputs
import { useDebouncedCallback } from 'use-debounce';

const SearchBar: React.FC = () => {
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      searchWorkItems(value);
    },
    500
  );
  
  return <input onChange={(e) => debouncedSearch(e.target.value)} />;
};
```

#### Graph Database Optimization
```sql
-- Create indexes on frequently queried properties
CREATE INDEX ON project_graph."WorkItem" ((properties->>'type'));
CREATE INDEX ON project_graph."WorkItem" ((properties->>'status'));
CREATE INDEX ON project_graph."Risk" ((properties->>'rpn'));

-- Use query hints for complex queries
SELECT * FROM cypher('project_graph', $$
    MATCH (r:WorkItem {type: 'requirement'})
    USING INDEX r:WorkItem(type)
    OPTIONAL MATCH (r)-[:TESTED_BY]->(t:WorkItem)
    RETURN r, collect(t) as tests
$$) as (requirement agtype, tests agtype);
```

### 12.3 Caching Strategy

```python
# Redis caching for frequently accessed data
from redis.asyncio import Redis
import json

class CacheService:
    def __init__(self):
        self.redis = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            decode_responses=True
        )
        
    async def get_cached_graph(
        self,
        center_node_id: Optional[UUID],
        depth: int
    ) -> Optional[dict]:
        key = f"graph:{center_node_id}:{depth}"
        cached = await self.redis.get(key)
        return json.loads(cached) if cached else None
        
    async def cache_graph(
        self,
        center_node_id: Optional[UUID],
        depth: int,
        data: dict,
        ttl: int = 300
    ):
        key = f"graph:{center_node_id}:{depth}"
        await self.redis.setex(
            key,
            ttl,
            json.dumps(data)
        )
```


## 13. Offline Operation Design

### 13.1 Offline Data Synchronization

```typescript
// Frontend offline service
import Dexie, { Table } from 'dexie';

interface OfflineWorkItem {
  id: string;
  data: any;
  lastModified: number;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

class OfflineDatabase extends Dexie {
  workitems!: Table<OfflineWorkItem>;
  
  constructor() {
    super('RegulatedPMOffline');
    this.version(1).stores({
      workitems: 'id, lastModified, syncStatus'
    });
  }
}

const offlineDb = new OfflineDatabase();

export class OfflineService {
  async saveWorkItemOffline(workitem: any): Promise<void> {
    await offlineDb.workitems.put({
      id: workitem.id,
      data: workitem,
      lastModified: Date.now(),
      syncStatus: 'pending'
    });
  }
  
  async syncWithServer(): Promise<void> {
    const pendingItems = await offlineDb.workitems
      .where('syncStatus')
      .equals('pending')
      .toArray();
      
    for (const item of pendingItems) {
      try {
        const response = await fetch(`/api/v1/workitems/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });
        
        if (response.ok) {
          await offlineDb.workitems.update(item.id, {
            syncStatus: 'synced'
          });
        } else if (response.status === 409) {
          // Conflict detected
          await offlineDb.workitems.update(item.id, {
            syncStatus: 'conflict'
          });
        }
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
  
  async resolveConflict(
    workitemId: string,
    resolution: 'local' | 'server'
  ): Promise<void> {
    const item = await offlineDb.workitems.get(workitemId);
    if (!item) return;
    
    if (resolution === 'local') {
      // Force push local version
      await fetch(`/api/v1/workitems/${workitemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
    } else {
      // Fetch server version
      const response = await fetch(`/api/v1/workitems/${workitemId}`);
      const serverData = await response.json();
      await offlineDb.workitems.update(workitemId, {
        data: serverData,
        syncStatus: 'synced'
      });
    }
  }
}
```

### 13.2 Offline Scheduling

```python
# Backend service for offline schedule calculation
class OfflineSchedulerService:
    async def export_project_data(
        self,
        project_id: UUID
    ) -> dict:
        """Export all data needed for offline scheduling"""
        tasks = await self.get_project_tasks(project_id)
        resources = await self.get_project_resources(project_id)
        dependencies = await self.get_task_dependencies(project_id)
        
        return {
            'project_id': str(project_id),
            'tasks': [self._serialize_task(t) for t in tasks],
            'resources': [self._serialize_resource(r) for r in resources],
            'dependencies': dependencies,
            'exported_at': datetime.utcnow().isoformat()
        }
        
    async def import_schedule(
        self,
        project_id: UUID,
        schedule_data: dict
    ):
        """Import schedule calculated offline"""
        # Validate schedule
        if not self._validate_schedule(schedule_data):
            raise ValueError("Invalid schedule data")
            
        # Check for conflicts with server state
        conflicts = await self._detect_conflicts(project_id, schedule_data)
        if conflicts:
            return {'status': 'conflict', 'conflicts': conflicts}
            
        # Apply schedule
        for task_schedule in schedule_data['schedule']:
            await self.update_task_schedule(
                task_schedule['task_id'],
                task_schedule['start_date'],
                task_schedule['end_date']
            )
            
        return {'status': 'success'}
```

### 13.3 Offline Signature Queue

```python
class OfflineSignatureService:
    async def queue_signature_for_validation(
        self,
        signature_data: dict
    ) -> UUID:
        """Queue signature created offline for server validation"""
        # Store in pending signatures table
        pending_sig = PendingSignature(
            workitem_id=signature_data['workitem_id'],
            workitem_version=signature_data['workitem_version'],
            user_id=signature_data['user_id'],
            signature_hash=signature_data['signature_hash'],
            content_hash=signature_data['content_hash'],
            signed_at=signature_data['signed_at'],
            status='pending_validation'
        )
        
        self.db.add(pending_sig)
        await self.db.commit()
        
        return pending_sig.id
        
    async def validate_pending_signatures(self):
        """Validate all pending signatures"""
        pending = await self.db.query(PendingSignature).filter(
            PendingSignature.status == 'pending_validation'
        ).all()
        
        for sig in pending:
            # Verify signature
            is_valid = await self.signature_service.verify_signature_data(
                sig.workitem_id,
                sig.workitem_version,
                sig.content_hash,
                sig.signature_hash
            )
            
            if is_valid:
                # Create official signature
                await self.signature_service.create_signature_from_pending(sig)
                sig.status = 'validated'
            else:
                sig.status = 'invalid'
                
        await self.db.commit()
```


## 14. Monitoring and Observability

### 14.1 Logging Strategy

```python
# backend/app/core/logging.py
import logging
import json
from datetime import datetime
from typing import Any, Dict

class StructuredLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        self.logger.addHandler(handler)
        
    def log(
        self,
        level: str,
        message: str,
        **kwargs: Any
    ):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': level,
            'message': message,
            **kwargs
        }
        
        if level == 'error':
            self.logger.error(json.dumps(log_data))
        elif level == 'warning':
            self.logger.warning(json.dumps(log_data))
        else:
            self.logger.info(json.dumps(log_data))

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return record.getMessage()

# Usage
logger = StructuredLogger(__name__)
logger.log(
    'info',
    'User authenticated',
    user_id=str(user.id),
    email=user.email,
    ip_address=request.client.host
)
```

### 14.2 Metrics Collection

```python
# backend/app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge
import time

# Define metrics
api_requests_total = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

api_request_duration = Histogram(
    'api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint']
)

active_users = Gauge(
    'active_users',
    'Number of active users'
)

signatures_created = Counter(
    'signatures_created_total',
    'Total signatures created'
)

# Middleware for automatic metrics
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    api_requests_total.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    api_request_duration.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    return response
```

### 14.3 Health Checks

```python
# backend/app/api/v1/health.py
from fastapi import APIRouter, status
from sqlalchemy import text

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy"}

@router.get("/health/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """Detailed health check with dependencies"""
    checks = {
        "database": await check_database(db),
        "graph_db": await check_graph_db(db),
        "llm": await check_llm_service(),
        "email": await check_email_service()
    }
    
    all_healthy = all(c["status"] == "healthy" for c in checks.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks
    }

async def check_database(db: AsyncSession) -> dict:
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

async def check_graph_db(db: AsyncSession) -> dict:
    try:
        await db.execute(text("SELECT * FROM ag_catalog.ag_graph LIMIT 1"))
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

async def check_llm_service() -> dict:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{settings.LLM_STUDIO_URL}/models",
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.status == 200:
                    return {"status": "healthy"}
                return {"status": "unhealthy", "error": f"Status {response.status}"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### 14.4 Error Tracking

```python
# backend/app/core/errors.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
import traceback

class ErrorTracker:
    @staticmethod
    async def log_error(
        request: Request,
        exc: Exception,
        user_id: Optional[UUID] = None
    ):
        error_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'path': request.url.path,
            'method': request.method,
            'user_id': str(user_id) if user_id else None,
            'error_type': type(exc).__name__,
            'error_message': str(exc),
            'traceback': traceback.format_exc()
        }
        
        logger.log('error', 'Unhandled exception', **error_data)
        
        # Store in database for analysis
        await store_error_log(error_data)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    await ErrorTracker.log_error(request, exc)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }
    )
```


## 15. Correctness Properties

This section defines the formal correctness properties that the system must satisfy. These properties will be validated using property-based testing with hypothesis.

### 15.1 Authentication Properties

**Property 1.1: Authentication Idempotency**
- **Validates: Requirement 1.1, 1.2**
- **Statement**: Authenticating with the same credentials multiple times produces consistent results
- **Formal**: ∀ credentials c, authenticate(c) = authenticate(c)

**Property 1.2: Account Lockout Consistency**
- **Validates: Requirement 1.4**
- **Statement**: After 3 failed authentication attempts, the account is locked
- **Formal**: ∀ user u, failed_attempts(u) ≥ 3 → is_locked(u) = true

**Property 1.3: Session Expiration**
- **Validates: Requirement 1.6**
- **Statement**: Expired sessions cannot perform authenticated actions
- **Formal**: ∀ session s, is_expired(s) → requires_reauth(s) = true

### 15.2 Digital Signature Properties

**Property 2.1: Signature Immutability**
- **Validates: Requirement 2.2**
- **Statement**: Once created, a signature's hash cannot be modified
- **Formal**: ∀ signature s, create(s) → ∀ t > create_time(s), hash(s, t) = hash(s, create_time(s))

**Property 2.2: Signature Invalidation on Modification**
- **Validates: Requirement 2.3**
- **Statement**: Modifying a signed WorkItem invalidates all its signatures
- **Formal**: ∀ workitem w, signature s, is_signed(w, s) ∧ modify(w) → is_valid(s) = false

**Property 2.3: Signature Verification Correctness**
- **Validates: Requirement 2.4**
- **Statement**: A valid signature verifies successfully if and only if the content hasn't changed
- **Formal**: ∀ signature s, verify(s) = true ↔ content_hash(workitem) = s.content_hash

**Property 2.4: Signed WorkItem Deletion Prevention**
- **Validates: Requirement 2.6**
- **Statement**: WorkItems with valid signatures cannot be deleted
- **Formal**: ∀ workitem w, (∃ signature s, is_valid(s) ∧ signs(s, w)) → cannot_delete(w)

### 15.3 Version Control Properties

**Property 3.1: Version Monotonicity**
- **Validates: Requirement 3.1, 3.2**
- **Statement**: Version numbers strictly increase with each modification
- **Formal**: ∀ workitem w, versions v1, v2, created(v2) > created(v1) → version_number(v2) > version_number(v1)

**Property 3.2: Version History Completeness**
- **Validates: Requirement 3.2, 3.3**
- **Statement**: All previous versions are preserved and accessible
- **Formal**: ∀ workitem w, version v, created(v, w) → ∀ t > create_time(v), accessible(v, t) = true

**Property 3.3: Version Immutability After Signing**
- **Validates: Requirement 3.7**
- **Statement**: Signed versions cannot be modified
- **Formal**: ∀ version v, is_signed(v) → immutable(v) = true

### 15.4 Time Recording Properties

**Property 4.1: Time Entry Duration Consistency**
- **Validates: Requirement 4.3**
- **Statement**: Calculated duration equals end time minus start time
- **Formal**: ∀ entry e, duration(e) = end_time(e) - start_time(e)

**Property 4.2: Offline Synchronization Idempotency**
- **Validates: Requirement 4.6**
- **Statement**: Synchronizing the same entry multiple times produces the same result
- **Formal**: ∀ entry e, sync(e) = sync(sync(e))

### 15.5 Email Processing Properties

**Property 5.1: Email Thread Consistency**
- **Validates: Requirement 5.5**
- **Statement**: Email thread history is maintained in chronological order
- **Formal**: ∀ thread t, emails e1, e2 ∈ t, timestamp(e1) < timestamp(e2) → order(e1, t) < order(e2, t)

**Property 5.2: Knowledge Extraction Linkage**
- **Validates: Requirement 5.9, 5.10**
- **Statement**: Extracted knowledge is always linked to source email
- **Formal**: ∀ knowledge k, extracted_from(k, email e) → linked(k, e) = true

### 15.6 Graph Database Properties

**Property 6.1: Relationship Symmetry**
- **Validates: Requirement 6.3**
- **Statement**: Creating a relationship creates a traversable edge in both directions
- **Formal**: ∀ nodes a, b, relationship r, create_rel(a, r, b) → can_traverse(a, b) ∧ can_traverse(b, a)

**Property 6.2: Query Performance Bound**
- **Validates: Requirement 6.8**
- **Statement**: Typical graph queries complete within 2 seconds
- **Formal**: ∀ query q ∈ typical_queries, execution_time(q) ≤ 2000ms

### 15.7 Scheduling Properties

**Property 7.1: Dependency Ordering**
- **Validates: Requirement 7.3**
- **Statement**: Dependent tasks are scheduled after their dependencies
- **Formal**: ∀ tasks t1, t2, depends_on(t2, t1) → start_time(t2) ≥ end_time(t1)

**Property 7.2: Resource Capacity Constraint**
- **Validates: Requirement 7.4**
- **Statement**: Resource allocation never exceeds capacity
- **Formal**: ∀ resource r, time t, allocated(r, t) ≤ capacity(r)

**Property 7.3: Schedule Determinism**
- **Validates: Requirement 7.6**
- **Statement**: Same inputs produce same schedule (offline consistency)
- **Formal**: ∀ project p, constraints c, schedule(p, c) = schedule(p, c)

### 15.8 Document Generation Properties

**Property 8.1: Signature Inclusion Completeness**
- **Validates: Requirement 8.4**
- **Statement**: Generated documents include all valid signatures
- **Formal**: ∀ document d, workitem w ∈ d, signature s, is_valid(s) ∧ signs(s, w) → s ∈ d

**Property 8.2: Traceability Matrix Completeness**
- **Validates: Requirement 8.2**
- **Statement**: Traceability matrix includes all requirement-test-risk relationships
- **Formal**: ∀ requirement r, (test t, related(r, t)) → (r, t) ∈ trace_matrix

### 15.9 Test Management Properties

**Property 9.1: Test Coverage Accuracy**
- **Validates: Requirement 9.6**
- **Statement**: Coverage percentage accurately reflects tested requirements
- **Formal**: coverage = (requirements_with_passing_tests / total_requirements) × 100

**Property 9.2: Test Run Signature Requirement**
- **Validates: Requirement 9.7**
- **Statement**: Completed test runs must have valid signatures
- **Formal**: ∀ test_run tr, status(tr) = 'completed' → ∃ signature s, is_valid(s) ∧ signs(s, tr)

### 15.10 Risk Management Properties

**Property 10.1: RPN Calculation Correctness**
- **Validates: Requirement 10.4**
- **Statement**: RPN is always severity × occurrence × detection
- **Formal**: ∀ risk r, rpn(r) = severity(r) × occurrence(r) × detection(r)

**Property 10.2: Failure Chain Probability**
- **Validates: Requirement 10.3, 10.9**
- **Statement**: Chain probability is product of individual probabilities
- **Formal**: ∀ chain c = [r1, r2, ..., rn], prob(c) = ∏ prob(ri → ri+1)

**Property 10.3: Mitigation Requirement**
- **Validates: Requirement 10.6**
- **Statement**: High RPN risks require mitigation actions
- **Formal**: ∀ risk r, rpn(r) > threshold → ∃ mitigation m, assigned(m, r)

### 15.11 Audit Trail Properties

**Property 11.1: Audit Log Completeness**
- **Validates: Requirement 13.1, 13.2, 13.3**
- **Statement**: All CRUD operations are logged
- **Formal**: ∀ operation op ∈ {CREATE, READ, UPDATE, DELETE}, execute(op) → ∃ log l, records(l, op)

**Property 11.2: Audit Log Immutability**
- **Validates: Requirement 13.7**
- **Statement**: Audit log entries cannot be modified or deleted
- **Formal**: ∀ log_entry l, created(l) → ∀ t > create_time(l), immutable(l, t) = true

### 15.12 Offline Operation Properties

**Property 12.1: Conflict Detection Correctness**
- **Validates: Requirement 15.5**
- **Statement**: Conflicts are detected when local and server versions differ
- **Formal**: ∀ workitem w, local_version(w) ≠ server_version(w) → conflict_detected(w) = true

**Property 12.2: Offline Signature Validation**
- **Validates: Requirement 15.7**
- **Statement**: Offline signatures are validated upon reconnection
- **Formal**: ∀ signature s, created_offline(s) ∧ reconnect() → validated(s) ∨ rejected(s)

### 15.13 XR Interface Properties

**Property 13.1: State Synchronization**
- **Validates: Requirement 16.9**
- **Statement**: Standard and immersive interfaces maintain synchronized state
- **Formal**: ∀ state s, time t, standard_state(s, t) = immersive_state(s, t)

**Property 13.2: Frame Rate Maintenance**
- **Validates: Requirement 16.12**
- **Statement**: Immersive interface maintains minimum 72 FPS
- **Formal**: ∀ frame f, frame_time(f) ≤ 13.89ms (1000ms / 72fps)


## 16. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
**Goal**: Establish core infrastructure and authentication

**Deliverables**:
- Docker compose setup with PostgreSQL + Apache AGE
- FastAPI application structure with Pydantic models
- User authentication and JWT token management
- Basic CRUD operations for WorkItems
- Audit logging infrastructure
- Unit tests for core functionality

**Success Criteria**:
- Users can register, login, and access protected endpoints
- All operations are logged in audit trail
- Test coverage > 80%

### Phase 2: Version Control & Signatures (Weeks 5-7)
**Goal**: Implement version control and digital signatures

**Deliverables**:
- Version control service with graph storage
- Digital signature creation and verification
- Signature invalidation on modification
- Version history API endpoints
- Property-based tests for version control and signatures

**Success Criteria**:
- WorkItems can be versioned with complete history
- Digital signatures work correctly and are immutable
- All correctness properties 2.x and 3.x pass

### Phase 3: Graph Database & Knowledge Management (Weeks 8-10)
**Goal**: Implement graph database and knowledge extraction

**Deliverables**:
- Apache AGE integration with Cypher queries
- Graph service for node and relationship management
- Local LLM integration (LM-Studio compatible)
- Email processing with knowledge extraction
- Graph visualization API endpoints

**Success Criteria**:
- WorkItems stored in graph with relationships
- LLM extracts knowledge from emails and meetings
- Graph queries complete within 2 seconds

### Phase 4: Frontend - Standard Web Interface (Weeks 11-14)
**Goal**: Build React web interface with 2D graph visualization

**Deliverables**:
- React application with TypeScript
- Zustand state management
- Authentication UI and protected routes
- WorkItem CRUD interfaces
- 2D graph visualization with react-flow
- Requirements, tests, and risks management UI

**Success Criteria**:
- Users can manage all WorkItem types via web UI
- Graph visualization is interactive and performant
- UI is responsive and accessible

### Phase 5: Risk Management & FMEA (Weeks 15-17)
**Goal**: Implement FMEA and risk management

**Deliverables**:
- Risk node creation and management
- Failure chain modeling with probabilities
- RPN calculation and mitigation tracking
- FMEA Excel export
- Risk visualization in graph

**Success Criteria**:
- Complete FMEA workflow functional
- Risk chains visualized correctly
- All correctness properties 10.x pass

### Phase 6: Testing & Validation (Weeks 18-20)
**Goal**: Implement test management and validation

**Deliverables**:
- Test specification management
- Test run execution and results recording
- Test coverage calculation
- Traceability matrix generation
- Validation workflow with signatures

**Success Criteria**:
- Complete V&V workflow functional
- Test coverage metrics accurate
- All correctness properties 9.x pass

### Phase 7: Project Scheduling (Weeks 21-23)
**Goal**: Implement offline project scheduling

**Deliverables**:
- ortools integration for constraint-based scheduling
- Schedule calculation service
- Gantt chart generation
- Offline schedule export/import
- Schedule conflict detection

**Success Criteria**:
- Schedules calculated correctly with constraints
- Offline scheduling works without network
- All correctness properties 7.x pass

### Phase 8: Document Generation (Weeks 24-25)
**Goal**: Implement automated document generation

**Deliverables**:
- PDF generation with ReportLab
- Excel generation with openpyxl
- Word template processing with python-docx-template
- Invoice generation
- Document versioning and storage

**Success Criteria**:
- All document types generate correctly
- Documents include signatures and metadata
- All correctness properties 8.x pass

### Phase 9: Mobile Time Recording (Weeks 26-28)
**Goal**: Build mobile app for time tracking

**Deliverables**:
- React Native mobile app
- Time entry start/stop functionality
- Offline storage with local database
- Synchronization service
- Time entry aggregation for invoicing

**Success Criteria**:
- Time tracking works offline
- Synchronization handles conflicts
- All correctness properties 4.x pass

### Phase 10: Immersive XR Interface (Weeks 29-32)
**Goal**: Build 3D/VR interface with WebXR

**Deliverables**:
- React Three Fiber 3D visualization
- WebXR integration for VR devices
- 3D graph layout and navigation
- VR controllers and hand tracking
- Voice commands
- State synchronization with web interface

**Success Criteria**:
- XR interface works on Meta Quest devices
- Frame rate maintains > 72 FPS
- State syncs between standard and immersive interfaces
- All correctness properties 13.x pass

### Phase 11: Offline Operation (Weeks 33-35)
**Goal**: Implement comprehensive offline support

**Deliverables**:
- Offline data storage with IndexedDB
- Synchronization service with conflict resolution
- Offline signature queue
- Network status detection
- Conflict resolution UI

**Success Criteria**:
- All core features work offline
- Synchronization handles conflicts gracefully
- All correctness properties 12.x pass

### Phase 12: Integration & Testing (Weeks 36-38)
**Goal**: End-to-end integration and comprehensive testing

**Deliverables**:
- E2E tests with Playwright
- Performance testing and optimization
- Security audit and penetration testing
- Load testing
- Documentation completion

**Success Criteria**:
- All E2E scenarios pass
- Performance targets met
- Security vulnerabilities addressed
- All correctness properties pass

### Phase 13: Deployment & Documentation (Weeks 39-40)
**Goal**: Production deployment and user documentation

**Deliverables**:
- Production deployment configuration
- User documentation and training materials
- Administrator guide
- API documentation
- Compliance documentation

**Success Criteria**:
- System deployed to production
- Documentation complete
- Training materials ready
- Compliance requirements met


## 17. Risk Assessment

### 17.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Apache AGE performance issues with large graphs | Medium | High | Implement caching, query optimization, pagination |
| WebXR compatibility issues across devices | Medium | Medium | Extensive device testing, graceful degradation |
| Local LLM accuracy for knowledge extraction | High | Medium | Fallback to manual entry, user validation of extractions |
| Offline synchronization conflicts | High | Medium | Robust conflict detection and resolution UI |
| ortools scheduling complexity | Medium | High | Start with simple constraints, iterative complexity |
| Digital signature key management | Low | High | Clear documentation, secure key storage guidance |

### 17.2 Compliance Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Audit trail gaps | Low | Critical | Comprehensive logging, regular audits |
| Signature validation failures | Low | Critical | Extensive testing, backup verification methods |
| Data retention non-compliance | Low | High | Automated retention policies, compliance checks |
| Access control bypass | Low | Critical | Security testing, role-based access reviews |

### 17.3 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database corruption | Low | Critical | Regular backups, replication, integrity checks |
| Email processing failures | Medium | Medium | Error handling, manual fallback, retry logic |
| LLM service unavailability | High | Low | Graceful degradation, system works without LLM |
| Mobile app sync failures | Medium | Medium | Offline queue, retry logic, conflict resolution |

## 18. Future Enhancements

### 18.1 Potential Features (Post-MVP)

1. **Advanced Analytics Dashboard**
   - Project health metrics
   - Predictive analytics for schedule delays
   - Risk trend analysis

2. **Collaborative Editing**
   - Real-time collaborative document editing
   - Presence indicators
   - Conflict-free replicated data types (CRDTs)

3. **Advanced LLM Features**
   - Requirement generation from natural language
   - Automated test case generation
   - Risk prediction from design documents

4. **Integration Ecosystem**
   - JIRA integration
   - GitHub/GitLab integration
   - Slack/Teams notifications
   - CAD system integration

5. **Advanced Visualization**
   - Animated risk propagation
   - Timeline visualization
   - Resource utilization heatmaps

6. **Mobile Enhancements**
   - Offline document viewing
   - Mobile signature capture
   - Push notifications

7. **AI-Powered Insights**
   - Anomaly detection in project data
   - Automated compliance checking
   - Smart scheduling recommendations

## 19. Glossary

| Term | Definition |
|------|------------|
| **AGE** | Apache Graph Extension - PostgreSQL extension for graph database |
| **FMEA** | Failure Mode and Effects Analysis - systematic risk assessment |
| **JWT** | JSON Web Token - authentication token format |
| **LLM** | Large Language Model - AI for natural language processing |
| **ortools** | Google's optimization tools for constraint programming |
| **PBT** | Property-Based Testing - testing with generated inputs |
| **R3F** | React Three Fiber - React renderer for Three.js |
| **RPN** | Risk Priority Number - severity × occurrence × detection |
| **WebXR** | Web standard for VR/AR experiences |
| **WorkItem** | Base entity for all trackable work elements |

## 20. References

### 20.1 Technology Documentation
- FastAPI: https://fastapi.tiangolo.com/
- Pydantic: https://docs.pydantic.dev/
- Apache AGE: https://age.apache.org/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/
- ortools: https://developers.google.com/optimization
- hypothesis: https://hypothesis.readthedocs.io/

### 20.2 Standards and Regulations
- ISO 13485 (Medical Devices Quality Management)
- IEC 62304 (Medical Device Software Lifecycle)
- ISO 14971 (Risk Management for Medical Devices)
- 21 CFR Part 11 (Electronic Records and Signatures)
- GAMP 5 (Good Automated Manufacturing Practice)

### 20.3 Best Practices
- OWASP Security Guidelines
- Twelve-Factor App Methodology
- RESTful API Design Principles
- Graph Database Design Patterns

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-17  
**Status**: Draft - Pending Review

# Database Setup

This directory contains database initialization scripts and configuration for RxDx.

## Components

### PostgreSQL with Apache AGE

RxDx uses PostgreSQL 17 with the Apache AGE extension for graph database capabilities.

- **PostgreSQL**: Stores user authentication, digital signatures, and audit logs
- **Apache AGE**: Stores project knowledge graph (WorkItems, relationships, version history)

### Directory Structure

```
db/
├── init/
│   └── 01-init-age.sql       # Initializes Apache AGE extension
├── session.py                 # SQLAlchemy async session configuration
├── graph.py                   # Apache AGE graph service
└── init_schema.py            # Schema initialization script
```

## Setup Instructions

### 1. Start PostgreSQL with Docker Compose

From the project root:

```bash
docker compose up postgres -d
```

This will:
- Start PostgreSQL 17 container
- Automatically run `01-init-age.sql` to install Apache AGE
- Create the `rxdx_graph` graph database

### 2. Initialize Database Schema

```bash
cd backend
uv run python -m app.db.init_schema
```

This will:
- Create all SQLAlchemy tables
- Verify Apache AGE graph is accessible
- Display supported node and relationship types

### 3. Verify Setup

Check PostgreSQL is running:
```bash
docker compose ps postgres
```

Connect to PostgreSQL:
```bash
docker compose exec postgres psql -U rxdx -d rxdx
```

Verify AGE extension:
```sql
\dx age
SELECT * FROM ag_graph;
```

## Configuration

Database settings are configured in `backend/app/core/config.py` using environment variables:

```env
POSTGRES_USER=rxdx
POSTGRES_PASSWORD=rxdx_dev_password
POSTGRES_DB=rxdx
POSTGRES_PORT=5432
AGE_GRAPH_NAME=rxdx_graph
```

## Graph Schema

### Node Types

- `WorkItem`: Base type for all work items
- `Requirement`: Requirements with version control
- `Task`: Project tasks
- `Test`: Test specifications and runs
- `Risk`: FMEA risk nodes
- `Failure`: FMEA failure nodes
- `Document`: Generated documents
- `Entity`: Extracted entities from LLM
- `User`: User references in graph

### Relationship Types

- `TESTED_BY`: Requirement → Test
- `MITIGATES`: Requirement → Risk
- `DEPENDS_ON`: WorkItem → WorkItem
- `IMPLEMENTS`: Task → Requirement
- `LEADS_TO`: Risk → Failure (with probability)
- `RELATES_TO`: Entity → Entity
- `MENTIONED_IN`: Entity → WorkItem
- `REFERENCES`: WorkItem → WorkItem
- `NEXT_VERSION`: WorkItem → WorkItem (version history)
- `CREATED_BY`: WorkItem → User
- `ASSIGNED_TO`: WorkItem → User

## Usage Examples

### SQLAlchemy (PostgreSQL)

```python
from app.db import get_db
from sqlalchemy import select

async def get_users(db: AsyncSession):
    result = await db.execute(select(User))
    return result.scalars().all()
```

### Apache AGE (Graph)

```python
from app.db import get_graph_service

async def create_requirement():
    graph = await get_graph_service()
    
    # Create node
    req = await graph.create_node(
        label="Requirement",
        properties={
            "id": "req-001",
            "title": "User Authentication",
            "version": "1.0"
        }
    )
    
    # Create relationship
    await graph.create_relationship(
        from_id="req-001",
        to_id="test-001",
        rel_type="TESTED_BY"
    )
```

## Troubleshooting

### Apache AGE Extension Not Found

If you see "extension age does not exist":

1. Ensure you're using PostgreSQL 17
2. Check AGE is installed: `docker compose exec postgres ls /usr/lib/postgresql/17/lib/age.so`
3. Rebuild the container: `docker compose up postgres --build`

### Connection Issues

If you can't connect to the database:

1. Check container is running: `docker compose ps`
2. Check logs: `docker compose logs postgres`
3. Verify port is not in use: `lsof -i :5432`
4. Check DATABASE_URL in `.env` file

### Graph Query Errors

If graph queries fail:

1. Verify graph exists: `SELECT * FROM ag_graph;`
2. Check search_path: `SHOW search_path;`
3. Ensure AGE is loaded: `LOAD 'age';`

## Backup and Restore

### Backup

```bash
# PostgreSQL backup
docker compose exec postgres pg_dump -U rxdx rxdx > backup.sql

# Graph backup
docker compose exec postgres pg_dump -U rxdx -t ag_catalog.* rxdx > graph_backup.sql
```

### Restore

```bash
# PostgreSQL restore
docker compose exec -T postgres psql -U rxdx rxdx < backup.sql

# Graph restore
docker compose exec -T postgres psql -U rxdx rxdx < graph_backup.sql
```

## Development

### Reset Database

```bash
docker compose down -v
docker compose up postgres -d
cd backend && uv run python -m app.db.init_schema
```

### Run Migrations

(Future: Alembic migrations will be added here)

```bash
uv run alembic upgrade head
```

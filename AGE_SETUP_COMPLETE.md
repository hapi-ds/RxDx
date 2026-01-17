# Apache AGE Setup Complete

## Summary

Apache AGE (A Graph Extension) has been successfully integrated into the RxDx project using the official pre-built Docker image.

## What Was Done

### 1. Docker Configuration
- **Updated `docker-compose.yml`** to use `apache/age:release_PG15_1.6.0` image
- This image includes PostgreSQL 15.15 with Apache AGE 1.6.0 pre-installed

### 2. Database Initialization Scripts

Created two initialization scripts in `backend/db/init/`:

#### `01-init-age.sql`
- Loads the AGE extension
- Sets up the search path to include `ag_catalog`
- Creates the `rxdx_graph` graph for the main database
- Grants necessary permissions to the rxdx user
- Creates a helper function `load_age_extension()` for session initialization

#### `02-create-test-db.sql`
- Creates a separate `test_rxdx` database for testing
- Initializes AGE extension in the test database
- Creates the `rxdx_graph` graph in the test database
- Grants permissions to the rxdx user

### 3. Verification

Successfully verified that:
- ✅ AGE extension is loaded in both databases
- ✅ `rxdx_graph` exists in main database (graphid: 16985)
- ✅ `rxdx_graph` exists in test database (graphid: 17609)
- ✅ Can create and query graph nodes using Cypher queries
- ✅ All permissions are correctly configured

## Usage

### Connecting to the Database

```bash
# Main database
docker compose exec postgres psql -U rxdx -d rxdx

# Test database
docker compose exec postgres psql -U rxdx -d test_rxdx
```

### Using AGE in SQL

```sql
-- Load AGE extension (required at start of each session)
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- Create a node
SELECT * FROM cypher('rxdx_graph', $$
    CREATE (n:WorkItem {title: 'Example', status: 'active'})
    RETURN n
$$) as (n agtype);

-- Query nodes
SELECT * FROM cypher('rxdx_graph', $$
    MATCH (n:WorkItem)
    RETURN n
$$) as (n agtype);
```

### Using AGE with Python (asyncpg)

The `GraphService` class in `backend/app/db/graph.py` provides methods to interact with the graph database:

```python
from app.db.graph import GraphService

# Initialize service
graph_service = GraphService(db_session)

# Create a node
await graph_service.create_workitem_node(
    workitem_id="123",
    workitem_type="requirement",
    properties={"title": "User Authentication", "status": "active"}
)

# Create a relationship
await graph_service.create_relationship(
    from_id="123",
    to_id="456",
    relationship_type="DEPENDS_ON"
)

# Query the graph
results = await graph_service.search_workitems(
    workitem_type="requirement",
    filters={"status": "active"}
)
```

## Next Steps

With Apache AGE now configured, you can proceed with:

1. **Phase 4: Graph Database Integration** (Tasks 4.1-4.3)
   - Implement GraphService methods
   - Create graph query methods
   - Build graph visualization API

2. **Phase 5: WorkItem Management** (Tasks 5.1-5.3)
   - Store WorkItems as graph nodes
   - Create relationships between WorkItems
   - Implement version control using graph edges

## Technical Details

- **PostgreSQL Version**: 15.15
- **Apache AGE Version**: 1.6.0
- **Docker Image**: `apache/age:release_PG15_1.6.0`
- **Graph Name**: `rxdx_graph` (in both main and test databases)
- **Schema**: `ag_catalog`

## References

- [Apache AGE Documentation](https://age.apache.org/)
- [Apache AGE Docker Hub](https://hub.docker.com/r/apache/age)
- [Cypher Query Language](https://age.apache.org/age-manual/master/intro/cypher.html)

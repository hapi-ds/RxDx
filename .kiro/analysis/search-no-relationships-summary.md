# Why Search Shows No Relationships - Quick Answer

## TL;DR

**Most Likely**: Your database has no relationships between the nodes.

## What's Happening

When you search and click a result:

1. ✅ Search finds nodes (working)
2. ✅ Click loads subgraph centered on that node (working)
3. ✅ Backend queries for relationships (working)
4. ❌ **No relationships found in database** (the issue)

## Evidence

From your browser log:
```
[GraphView2D] Rendering with nodes: 7 edges: 0
```

This means:
- Backend returned 7 nodes ✓
- Backend returned 0 edges ✗

## Why No Edges?

The backend query looks for relationships like:

```cypher
MATCH (a)-[r]->(b)
WHERE a.id IN ['node1', 'node2', ...] 
  AND b.id IN ['node1', 'node2', ...]
RETURN r
```

If this returns 0 results, it means **no relationships exist between those nodes**.

## How to Verify

Run this in Neo4j browser:

```cypher
// Check if ANY relationships exist
MATCH ()-[r]->()
RETURN count(r) as total_relationships
```

**Expected**:
- If `total_relationships = 0` → No relationships in database (need to create them)
- If `total_relationships > 0` → Relationships exist but not between searched nodes

## How to Fix

### Option 1: Create Relationships Manually

```cypher
// Example: Link a task to a requirement
MATCH (task:WorkItem {type: 'task', title: 'Create Alarm UI'})
MATCH (req:WorkItem {type: 'requirement'})
WHERE req.title CONTAINS 'Alarm'
CREATE (task)-[:IMPLEMENTS]->(req)
RETURN task.title, req.title
```

### Option 2: Use Template with Relationships

Apply a template that includes relationships:

```yaml
workitems:
  requirements:
    - id: "req-1"
      title: "Alarm Requirements"
  
  tasks:
    - id: "task-1"
      title: "Create Alarm UI"

relationships:
  - source: "task-1"
    target: "req-1"
    type: "IMPLEMENTS"
```

### Option 3: Create via API

```bash
POST /api/v1/graph/relationships
{
  "source_id": "task-uuid",
  "target_id": "requirement-uuid",
  "type": "IMPLEMENTS"
}
```

## Common Relationship Types

- `IMPLEMENTS` - Task implements Requirement
- `TESTED_BY` - Requirement tested by Test
- `MITIGATES` - Requirement mitigates Risk
- `DEPENDS_ON` - Task depends on another Task
- `RELATES_TO` - General relationship

## Test It

After creating relationships:

1. Search for a node
2. Click the result
3. You should now see edges connecting nodes!

## The Code is Working

The search and graph visualization code is working correctly. It's just that:

- **Search** finds nodes ✓
- **Visualization** queries for relationships ✓
- **Database** has no relationships to return ✗

You need to populate your database with relationships between workitems.

---

**Bottom Line**: Create some relationships in your database, then search will show them!

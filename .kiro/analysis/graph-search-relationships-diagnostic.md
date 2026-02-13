# Graph Search Relationships Diagnostic

**Issue**: Search results show nodes but no relationships (edges)

## How It Should Work

When you click a search result:

1. **Search** returns matching nodes only (no edges)
2. **Click result** → calls `selectSearchResult()`
3. **Loads subgraph** → calls `loadGraph(nodeId)` with the clicked node as center
4. **Backend queries** → gets nodes within depth + relationships between them
5. **Display** → shows nodes AND edges

## Diagnostic Steps

### Step 1: Check Browser Console

When you click a search result, you should see logs like:

```
[GraphStore] loadGraph called: {centerNodeId: "...", depth: 2}
[GraphStore] Calling graphService.getVisualization with params: {...}
[GraphStore] Received graph data: {nodeCount: 7, edgeCount: X}
[GraphStore] Transformed data: {nodeCount: 7, edgeCount: X}
```

**Question**: What is the `edgeCount` value?

- If `edgeCount: 0` → Backend is not finding relationships
- If `edgeCount: > 0` → Frontend is not displaying them

### Step 2: Check Backend Logs

The backend should log:

```
[GraphService] Raw from DB: 7 nodes, X edges
[GraphService] Sample raw edge: {...}
```

**Question**: What does the backend log show for edges?

### Step 3: Check Database

Run this query in Neo4j browser or your graph database:

```cypher
// Replace with your actual node ID
MATCH (center {id: 'a1f91a05-308f-5f93-a5e3-3f303d828cfc'})
MATCH path = (center)-[*1..2]-(n)
RETURN path
LIMIT 100
```

**Question**: Does this return any relationships?

### Step 4: Check Relationship Creation

Check if relationships exist in your database:

```cypher
// Count all relationships
MATCH ()-[r]->()
RETURN type(r) as relationship_type, count(r) as count
ORDER BY count DESC
```

**Question**: Are there any relationships in the database?

## Common Causes

### 1. 🔴 No Relationships in Database

**Symptom**: Backend logs show `0 edges`

**Cause**: Your test data doesn't have relationships between nodes

**Solution**: Create relationships between workitems

```cypher
// Example: Create DEPENDS_ON relationship
MATCH (req:WorkItem {type: 'requirement'})
MATCH (task:WorkItem {type: 'task'})
WHERE req.id = 'requirement-id' AND task.id = 'task-id'
CREATE (task)-[:DEPENDS_ON]->(req)
```

### 2. 🟡 Depth Too Low

**Symptom**: Some nodes have relationships but not showing

**Cause**: Depth setting (default: 2) might be too low

**Solution**: Increase depth in the UI dropdown (try 3 or 4)

### 3. 🟡 Node Type Filter

**Symptom**: Edges exist but filtered out

**Cause**: Node type filter might be excluding connected nodes

**Solution**: Check the node type filter - ensure all relevant types are selected

### 4. 🟢 Relationships Exist But Not Displayed

**Symptom**: Backend logs show edges, but UI doesn't display them

**Cause**: Frontend rendering issue

**Solution**: Check React Flow edge rendering

## Quick Test

### Create Test Relationships

Run this in your Neo4j browser to create test relationships:

```cypher
// Find two workitems
MATCH (a:WorkItem)
MATCH (b:WorkItem)
WHERE a.id <> b.id
WITH a, b
LIMIT 1

// Create a test relationship
CREATE (a)-[:DEPENDS_ON]->(b)
RETURN a.title, b.title
```

Then search for one of those nodes and click it. You should see the relationship.

## Expected Behavior

### Search Flow

1. **Type "alarm"** in search box
2. **Click "Create Alarm UI"** in results
3. **Graph reloads** centered on that node
4. **Shows**:
   - The clicked node (highlighted)
   - Connected nodes within depth 2
   - Relationships (edges) between them

### What You Should See

```
Center Node: Create Alarm UI (task)
  ↓ DEPENDS_ON
Connected Node: Alarm Requirements (requirement)
  ↓ TESTED_BY
Connected Node: Alarm Tests (test)
```

## Debugging Commands

### Check Specific Node Relationships

```cypher
// Replace with your node ID
MATCH (n {id: 'a1f91a05-308f-5f93-a5e3-3f303d828cfc'})
MATCH (n)-[r]-(connected)
RETURN n.title, type(r), connected.title
```

### Check All Relationships

```cypher
MATCH (a)-[r]->(b)
RETURN a.title, type(r), b.title
LIMIT 50
```

### Count Relationships by Type

```cypher
MATCH ()-[r]->()
RETURN type(r) as rel_type, count(r) as count
ORDER BY count DESC
```

## Solution Based on Diagnosis

### If No Relationships Exist

You need to create relationships between your workitems. Options:

1. **Manual Creation**: Use Neo4j browser to create relationships
2. **Template Application**: Use a template that includes relationships
3. **API Creation**: Use the relationship creation endpoint

### If Relationships Exist But Not Showing

Check:
1. Depth setting (increase it)
2. Node type filters (disable filters temporarily)
3. Backend logs (are edges being returned?)
4. Frontend logs (are edges being received?)

## Next Steps

1. **Run the diagnostic queries** above
2. **Check the logs** (browser console + backend)
3. **Share the results**:
   - Edge count from logs
   - Relationship count from database
   - Any error messages

Then we can identify the exact issue and fix it!

---

## Most Likely Cause

Based on your description ("search draws no relationships"), the most likely cause is:

**🔴 No relationships exist in your test data**

The search functionality is working correctly - it's just that your nodes aren't connected yet. You need to create relationships between your workitems.

### Quick Fix

1. Open Neo4j browser
2. Run: `MATCH ()-[r]->() RETURN count(r)`
3. If count is 0, create some test relationships
4. Try search again

Let me know what you find!

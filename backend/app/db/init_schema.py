"""Database schema initialization script"""

import asyncio
from app.db.session import init_db
from app.db.graph import graph_service


async def initialize_graph_schema():
    """Initialize Apache AGE graph schema with node and relationship types"""
    
    await graph_service.connect()
    
    print("Initializing Apache AGE graph schema...")
    
    # Create sample nodes to establish schema
    # Note: AGE is schema-less, but we can document expected node types
    
    node_types = [
        "WorkItem",
        "Requirement",
        "Task",
        "Test",
        "Risk",
        "Failure",
        "Document",
        "Entity",
        "User",
    ]
    
    relationship_types = [
        "TESTED_BY",
        "MITIGATES",
        "DEPENDS_ON",
        "IMPLEMENTS",
        "LEADS_TO",
        "RELATES_TO",
        "MENTIONED_IN",
        "REFERENCES",
        "NEXT_VERSION",
        "CREATED_BY",
        "ASSIGNED_TO",
    ]
    
    print(f"Supported node types: {', '.join(node_types)}")
    print(f"Supported relationship types: {', '.join(relationship_types)}")
    
    # Verify graph is accessible
    try:
        result = await graph_service.execute_query("MATCH (n) RETURN count(n) as count")
        node_count = result[0].get('count', 0) if result else 0
        print(f"Graph initialized successfully. Current node count: {node_count}")
    except Exception as e:
        print(f"Warning: Could not verify graph: {e}")
    
    await graph_service.close()


async def main():
    """Main initialization function"""
    print("Starting database initialization...")
    
    # Initialize PostgreSQL tables
    print("\n1. Initializing PostgreSQL tables...")
    await init_db()
    print("PostgreSQL tables initialized successfully")
    
    # Initialize Apache AGE graph schema
    print("\n2. Initializing Apache AGE graph schema...")
    await initialize_graph_schema()
    
    print("\n✓ Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(main())

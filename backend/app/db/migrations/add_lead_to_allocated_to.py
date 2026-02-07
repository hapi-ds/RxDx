"""Migration: Add lead=false to existing ALLOCATED_TO relationships

This migration adds the 'lead' property to all existing ALLOCATED_TO relationships
that don't already have it, setting the default value to false.

Run this migration after deploying the code changes for Task 1.6.
"""

import asyncio
import logging

from app.db.graph import GraphService

logger = logging.getLogger(__name__)


async def migrate_add_lead_property():
    """
    Add lead=false to all existing ALLOCATED_TO relationships that don't have it.
    
    This migration:
    1. Finds all ALLOCATED_TO relationships
    2. Checks if they have a 'lead' property
    3. Adds lead=false to relationships that don't have it
    """
    graph_service = GraphService()
    
    try:
        # Connect to the graph database
        await graph_service.connect()
        logger.info("Connected to graph database")
        
        # Find all ALLOCATED_TO relationships
        query = """
        MATCH ()-[r:ALLOCATED_TO]->()
        RETURN r, id(r) as rel_id
        """
        
        results = await graph_service.execute_query(query)
        logger.info(f"Found {len(results)} ALLOCATED_TO relationships")
        
        # Track statistics
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        # Process each relationship
        for result in results:
            rel_data = result.get('r', {})
            
            # Extract properties
            if 'properties' in rel_data:
                props = rel_data['properties']
            else:
                props = rel_data
            
            # Check if lead property already exists
            if 'lead' in props:
                logger.debug(f"Relationship already has lead property: {props.get('lead')}")
                skipped_count += 1
                continue
            
            # Add lead=false property
            # Note: We need to match the relationship by its endpoints since AGE doesn't support
            # direct relationship ID updates in Cypher
            try:
                # Get the relationship endpoints
                get_endpoints_query = """
                MATCH (a)-[r:ALLOCATED_TO]->(b)
                WHERE id(r) = $rel_id
                RETURN a.id as source_id, b.id as target_id, r
                """
                
                # Since we can't use parameters easily, we'll update all relationships
                # that don't have the lead property
                update_query = """
                MATCH (a)-[r:ALLOCATED_TO]->(b)
                WHERE NOT exists(r.lead)
                SET r.lead = false
                RETURN count(r) as updated_count
                """
                
                update_results = await graph_service.execute_query(update_query)
                if update_results:
                    total_updated = update_results[0].get('updated_count', 0)
                    logger.info(f"Updated {total_updated} relationships with lead=false")
                    updated_count = total_updated
                    break  # Exit loop since we updated all at once
                
            except Exception as e:
                logger.error(f"Error updating relationship: {e}")
                error_count += 1
        
        # Log summary
        logger.info("Migration completed:")
        logger.info(f"  - Updated: {updated_count}")
        logger.info(f"  - Skipped (already had lead): {skipped_count}")
        logger.info(f"  - Errors: {error_count}")
        
        return {
            "success": True,
            "updated": updated_count,
            "skipped": skipped_count,
            "errors": error_count
        }
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        # Close the connection
        await graph_service.close()
        logger.info("Closed graph database connection")


async def rollback_lead_property():
    """
    Rollback migration: Remove lead property from ALLOCATED_TO relationships.
    
    WARNING: This will remove the lead property from ALL ALLOCATED_TO relationships.
    Use with caution!
    """
    graph_service = GraphService()
    
    try:
        # Connect to the graph database
        await graph_service.connect()
        logger.info("Connected to graph database for rollback")
        
        # Remove lead property from all ALLOCATED_TO relationships
        query = """
        MATCH ()-[r:ALLOCATED_TO]->()
        WHERE exists(r.lead)
        REMOVE r.lead
        RETURN count(r) as removed_count
        """
        
        results = await graph_service.execute_query(query)
        removed_count = results[0].get('removed_count', 0) if results else 0
        
        logger.info(f"Rollback completed: Removed lead property from {removed_count} relationships")
        
        return {
            "success": True,
            "removed": removed_count
        }
        
    except Exception as e:
        logger.error(f"Rollback failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        # Close the connection
        await graph_service.close()
        logger.info("Closed graph database connection")


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run migration
    print("Starting migration: Add lead property to ALLOCATED_TO relationships")
    print("=" * 70)
    
    result = asyncio.run(migrate_add_lead_property())
    
    print("=" * 70)
    if result["success"]:
        print("✓ Migration completed successfully")
        print(f"  Updated: {result['updated']}")
        print(f"  Skipped: {result['skipped']}")
        print(f"  Errors: {result['errors']}")
    else:
        print("✗ Migration failed")
        print(f"  Error: {result['error']}")
    
    # Uncomment to run rollback
    # print("\nRunning rollback...")
    # rollback_result = asyncio.run(rollback_lead_property())
    # if rollback_result["success"]:
    #     print(f"✓ Rollback completed: Removed lead from {rollback_result['removed']} relationships")
    # else:
    #     print(f"✗ Rollback failed: {rollback_result['error']}")

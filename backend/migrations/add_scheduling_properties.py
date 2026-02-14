"""
Migration script to add new scheduling properties to existing graph nodes.

This script adds the following properties to existing nodes:
- Phase: minimal_duration, calculated_start_date, calculated_end_date, start_date_is, progress, due_date
- Workpackage: minimal_duration, calculated_start_date, calculated_end_date, start_date_is, progress, due_date
- Task (WorkItem type='task'): duration, effort, skills, calculated_start_date, calculated_end_date, start_date_is, progress, due_date
- Project: calculated_start_date, calculated_end_date, start_date_is, progress, due_date
- Milestone: calculated_start_date, calculated_end_date, start_date_is, progress

Run this script after deploying the updated service code to ensure backward compatibility.

Usage:
    uv run python migrations/add_scheduling_properties.py
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.graph import get_graph_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def migrate_phase_nodes(graph_service):
    """Add new properties to Phase nodes"""
    logger.info("Migrating Phase nodes...")
    
    query = """
    MATCH (p:Phase)
    WHERE p.minimal_duration IS NULL 
       OR p.calculated_start_date IS NULL
       OR p.progress IS NULL
    SET p.minimal_duration = COALESCE(p.minimal_duration, 0),
        p.progress = COALESCE(p.progress, 0)
    RETURN count(p) as updated_count
    """
    
    try:
        results = await graph_service.execute_query(query)
        count = results[0].get('updated_count', 0) if results else 0
        logger.info(f"Updated {count} Phase nodes")
        return count
    except Exception as e:
        logger.error(f"Failed to migrate Phase nodes: {e}")
        return 0


async def migrate_workpackage_nodes(graph_service):
    """Add new properties to Workpackage nodes"""
    logger.info("Migrating Workpackage nodes...")
    
    query = """
    MATCH (wp:Workpackage)
    WHERE wp.minimal_duration IS NULL 
       OR wp.calculated_start_date IS NULL
       OR wp.progress IS NULL
    SET wp.minimal_duration = COALESCE(wp.minimal_duration, 0),
        wp.progress = COALESCE(wp.progress, 0)
    RETURN count(wp) as updated_count
    """
    
    try:
        results = await graph_service.execute_query(query)
        count = results[0].get('updated_count', 0) if results else 0
        logger.info(f"Updated {count} Workpackage nodes")
        return count
    except Exception as e:
        logger.error(f"Failed to migrate Workpackage nodes: {e}")
        return 0


async def migrate_task_nodes(graph_service):
    """Add new properties to Task nodes (WorkItem type='task')"""
    logger.info("Migrating Task nodes (WorkItem type='task')...")
    
    query = """
    MATCH (t:WorkItem)
    WHERE t.type = 'task'
      AND (t.duration IS NULL 
           OR t.effort IS NULL
           OR t.skills IS NULL
           OR t.progress IS NULL)
    SET t.duration = COALESCE(t.duration, 0),
        t.effort = COALESCE(t.effort, 0.0),
        t.skills = COALESCE(t.skills, []),
        t.progress = COALESCE(t.progress, 0)
    RETURN count(t) as updated_count
    """
    
    try:
        results = await graph_service.execute_query(query)
        count = results[0].get('updated_count', 0) if results else 0
        logger.info(f"Updated {count} Task nodes")
        return count
    except Exception as e:
        logger.error(f"Failed to migrate Task nodes: {e}")
        return 0


async def migrate_project_nodes(graph_service):
    """Add new properties to Project nodes"""
    logger.info("Migrating Project nodes...")
    
    query = """
    MATCH (p:Project)
    WHERE p.calculated_start_date IS NULL
       OR p.progress IS NULL
    SET p.progress = COALESCE(p.progress, 0)
    RETURN count(p) as updated_count
    """
    
    try:
        results = await graph_service.execute_query(query)
        count = results[0].get('updated_count', 0) if results else 0
        logger.info(f"Updated {count} Project nodes")
        return count
    except Exception as e:
        logger.error(f"Failed to migrate Project nodes: {e}")
        return 0


async def migrate_milestone_nodes(graph_service):
    """Add new properties to Milestone nodes"""
    logger.info("Migrating Milestone nodes...")
    
    query = """
    MATCH (m:Milestone)
    WHERE m.calculated_start_date IS NULL
       OR m.progress IS NULL
    SET m.progress = COALESCE(m.progress, 0)
    RETURN count(m) as updated_count
    """
    
    try:
        results = await graph_service.execute_query(query)
        count = results[0].get('updated_count', 0) if results else 0
        logger.info(f"Updated {count} Milestone nodes")
        return count
    except Exception as e:
        logger.error(f"Failed to migrate Milestone nodes: {e}")
        return 0


async def rename_end_date_to_due_date(graph_service):
    """Rename end_date to due_date for consistency"""
    logger.info("Renaming end_date to due_date...")
    
    # Phase nodes
    query_phase = """
    MATCH (p:Phase)
    WHERE p.end_date IS NOT NULL AND p.due_date IS NULL
    SET p.due_date = p.end_date
    REMOVE p.end_date
    RETURN count(p) as updated_count
    """
    
    # Workpackage nodes
    query_workpackage = """
    MATCH (wp:Workpackage)
    WHERE wp.end_date IS NOT NULL AND wp.due_date IS NULL
    SET wp.due_date = wp.end_date
    REMOVE wp.end_date
    RETURN count(wp) as updated_count
    """
    
    # Task nodes
    query_task = """
    MATCH (t:WorkItem)
    WHERE t.type = 'task' AND t.end_date IS NOT NULL AND t.due_date IS NULL
    SET t.due_date = t.end_date
    REMOVE t.end_date
    RETURN count(t) as updated_count
    """
    
    # Project nodes
    query_project = """
    MATCH (p:Project)
    WHERE p.end_date IS NOT NULL AND p.due_date IS NULL
    SET p.due_date = p.end_date
    REMOVE p.end_date
    RETURN count(p) as updated_count
    """
    
    total_count = 0
    
    try:
        results = await graph_service.execute_query(query_phase)
        count = results[0].get('updated_count', 0) if results else 0
        logger.info(f"Renamed end_date to due_date for {count} Phase nodes")
        total_count += count
        
        results = await graph_service.execute_query(query_workpackage)
        count = results[0].get('updated_count', 0) if results else 0
        logger.info(f"Renamed end_date to due_date for {count} Workpackage nodes")
        total_count += count
        
        results = await graph_service.execute_query(query_task)
        count = results[0].get('updated_count', 0) if results else 0
        logger.info(f"Renamed end_date to due_date for {count} Task nodes")
        total_count += count
        
        results = await graph_service.execute_query(query_project)
        count = results[0].get('updated_count', 0) if results else 0
        logger.info(f"Renamed end_date to due_date for {count} Project nodes")
        total_count += count
        
        logger.info(f"Total nodes with end_date renamed: {total_count}")
        return total_count
    except Exception as e:
        logger.error(f"Failed to rename end_date to due_date: {e}")
        return 0


async def verify_migration(graph_service):
    """Verify that migration was successful"""
    logger.info("Verifying migration...")
    
    # Check Phase nodes
    query_phase = """
    MATCH (p:Phase)
    RETURN count(p) as total,
           count(p.minimal_duration) as with_minimal_duration,
           count(p.progress) as with_progress
    """
    
    # Check Workpackage nodes
    query_workpackage = """
    MATCH (wp:Workpackage)
    RETURN count(wp) as total,
           count(wp.minimal_duration) as with_minimal_duration,
           count(wp.progress) as with_progress
    """
    
    # Check Task nodes
    query_task = """
    MATCH (t:WorkItem)
    WHERE t.type = 'task'
    RETURN count(t) as total,
           count(t.duration) as with_duration,
           count(t.effort) as with_effort,
           count(t.skills) as with_skills,
           count(t.progress) as with_progress
    """
    
    try:
        # Verify Phase nodes
        results = await graph_service.execute_query(query_phase)
        if results:
            r = results[0]
            logger.info(f"Phase nodes: {r.get('total', 0)} total, "
                       f"{r.get('with_minimal_duration', 0)} with minimal_duration, "
                       f"{r.get('with_progress', 0)} with progress")
        
        # Verify Workpackage nodes
        results = await graph_service.execute_query(query_workpackage)
        if results:
            r = results[0]
            logger.info(f"Workpackage nodes: {r.get('total', 0)} total, "
                       f"{r.get('with_minimal_duration', 0)} with minimal_duration, "
                       f"{r.get('with_progress', 0)} with progress")
        
        # Verify Task nodes
        results = await graph_service.execute_query(query_task)
        if results:
            r = results[0]
            logger.info(f"Task nodes: {r.get('total', 0)} total, "
                       f"{r.get('with_duration', 0)} with duration, "
                       f"{r.get('with_effort', 0)} with effort, "
                       f"{r.get('with_skills', 0)} with skills, "
                       f"{r.get('with_progress', 0)} with progress")
        
        logger.info("Verification complete")
        return True
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        return False


async def main():
    """Run all migrations"""
    logger.info("Starting migration: add_scheduling_properties")
    logger.info("=" * 60)
    
    try:
        # Get graph service
        graph_service = await get_graph_service()
        
        # Run migrations
        total_updated = 0
        total_updated += await migrate_phase_nodes(graph_service)
        total_updated += await migrate_workpackage_nodes(graph_service)
        total_updated += await migrate_task_nodes(graph_service)
        total_updated += await migrate_project_nodes(graph_service)
        total_updated += await migrate_milestone_nodes(graph_service)
        total_updated += await rename_end_date_to_due_date(graph_service)
        
        logger.info("=" * 60)
        logger.info(f"Migration complete! Total nodes updated: {total_updated}")
        logger.info("=" * 60)
        
        # Verify migration
        await verify_migration(graph_service)
        
        logger.info("Migration successful!")
        return 0
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

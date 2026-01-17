"""Database migration utilities"""

from sqlalchemy.ext.asyncio import AsyncEngine

from app.db.session import Base, engine
from app.models import User  # noqa: F401 - Import to register models


async def create_tables(engine_instance: AsyncEngine = engine) -> None:
    """
    Create all database tables.
    
    This function creates all tables defined in SQLAlchemy models.
    In production, use Alembic for proper migration management.
    
    Args:
        engine_instance: SQLAlchemy async engine (defaults to app engine)
    """
    async with engine_instance.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables(engine_instance: AsyncEngine = engine) -> None:
    """
    Drop all database tables.
    
    WARNING: This will delete all data. Use with caution!
    
    Args:
        engine_instance: SQLAlchemy async engine (defaults to app engine)
    """
    async with engine_instance.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

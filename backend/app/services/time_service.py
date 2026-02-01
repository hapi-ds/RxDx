"""Time Entry service for CRUD operations and business logic"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.time_entry import (
    TimeAggregation,
    TimeAggregationRequest,
    TimeEntryCreate,
    TimeEntryResponse,
    TimeEntrySyncItem,
    TimeEntrySyncResult,
    TimeEntryUpdate,
)


class TimeService:
    """Service for managing time entries"""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def create_time_entry(
        self,
        entry_data: TimeEntryCreate,
        current_user: User
    ) -> TimeEntryResponse:
        """
        Create a new time entry

        Args:
            entry_data: Time entry creation data
            current_user: User creating the entry

        Returns:
            Created time entry with metadata
        """
        entry_id = uuid.uuid4()
        now = datetime.now(UTC)

        # Calculate duration if end_time is provided
        duration_hours = None
        if entry_data.end_time:
            duration_seconds = (entry_data.end_time - entry_data.start_time).total_seconds()
            duration_hours = Decimal(str(round(duration_seconds / 3600, 2)))

        # Insert into database
        query = text("""
            INSERT INTO time_entries (
                id, user_id, project_id, task_id, start_time, end_time,
                duration_hours, description, category, synced, created_at
            ) VALUES (
                :id, :user_id, :project_id, :task_id, :start_time, :end_time,
                :duration_hours, :description, :category, :synced, :created_at
            )
        """)
        await self.db.execute(
            query,
            {
                "id": entry_id,
                "user_id": current_user.id,
                "project_id": entry_data.project_id,
                "task_id": entry_data.task_id,
                "start_time": entry_data.start_time,
                "end_time": entry_data.end_time,
                "duration_hours": duration_hours,
                "description": entry_data.description,
                "category": entry_data.category,
                "synced": False,
                "created_at": now,
            }
        )
        await self.db.commit()

        return TimeEntryResponse(
            id=entry_id,
            user_id=current_user.id,
            project_id=entry_data.project_id,
            task_id=entry_data.task_id,
            start_time=entry_data.start_time,
            end_time=entry_data.end_time,
            duration_hours=duration_hours,
            description=entry_data.description,
            category=entry_data.category,
            synced=False,
            created_at=now,
            updated_at=None,
        )

    async def update_time_entry(
        self,
        entry_id: UUID,
        updates: TimeEntryUpdate,
        current_user: User
    ) -> TimeEntryResponse | None:
        """
        Update a time entry

        Args:
            entry_id: Time entry UUID
            updates: Update data
            current_user: User making the update

        Returns:
            Updated time entry or None if not found
        """
        # Get existing entry
        existing = await self.get_time_entry(entry_id, current_user)
        if not existing:
            return None

        # Build update data
        update_fields = {}
        if updates.project_id is not None:
            update_fields["project_id"] = updates.project_id
        if updates.task_id is not None:
            update_fields["task_id"] = updates.task_id
        if updates.start_time is not None:
            update_fields["start_time"] = updates.start_time
        if updates.end_time is not None:
            update_fields["end_time"] = updates.end_time
        if updates.description is not None:
            update_fields["description"] = updates.description
        if updates.category is not None:
            update_fields["category"] = updates.category

        if not update_fields:
            return existing

        # Recalculate duration if times changed
        start_time = update_fields.get("start_time", existing.start_time)
        end_time = update_fields.get("end_time", existing.end_time)
        if end_time:
            duration_seconds = (end_time - start_time).total_seconds()
            update_fields["duration_hours"] = Decimal(str(round(duration_seconds / 3600, 2)))
        else:
            update_fields["duration_hours"] = None

        now = datetime.now(UTC)
        update_fields["updated_at"] = now

        # Build and execute update query
        set_clause = ", ".join(f"{k} = :{k}" for k in update_fields.keys())
        query = text(f"""
            UPDATE time_entries
            SET {set_clause}
            WHERE id = :entry_id AND user_id = :user_id
        """)
        update_fields["entry_id"] = entry_id
        update_fields["user_id"] = current_user.id

        await self.db.execute(query, update_fields)
        await self.db.commit()

        # Return updated entry
        return await self.get_time_entry(entry_id, current_user)

    async def get_time_entry(
        self,
        entry_id: UUID,
        current_user: User
    ) -> TimeEntryResponse | None:
        """
        Get a time entry by ID

        Args:
            entry_id: Time entry UUID
            current_user: User requesting the entry

        Returns:
            Time entry if found and owned by user, None otherwise
        """
        query = text("""
            SELECT id, user_id, project_id, task_id, start_time, end_time,
                   duration_hours, description, category, synced, created_at, updated_at
            FROM time_entries
            WHERE id = :entry_id AND user_id = :user_id
        """)
        result = await self.db.execute(
            query,
            {"entry_id": entry_id, "user_id": current_user.id}
        )
        row = result.fetchone()

        if not row:
            return None

        return self._row_to_response(row)

    async def get_time_entries(
        self,
        current_user: User,
        project_id: UUID | None = None,
        task_id: UUID | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        category: str | None = None,
        synced: bool | None = None,
        limit: int = 100,
        offset: int = 0
    ) -> list[TimeEntryResponse]:
        """
        Get time entries with filtering

        Args:
            current_user: User requesting entries
            project_id: Filter by project
            task_id: Filter by task
            start_date: Filter entries starting after this date
            end_date: Filter entries ending before this date
            category: Filter by category
            synced: Filter by sync status
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of matching time entries
        """
        conditions = ["user_id = :user_id"]
        params: dict[str, Any] = {"user_id": current_user.id}

        if project_id:
            conditions.append("project_id = :project_id")
            params["project_id"] = project_id
        if task_id:
            conditions.append("task_id = :task_id")
            params["task_id"] = task_id
        if start_date:
            conditions.append("start_time >= :start_date")
            params["start_date"] = start_date
        if end_date:
            conditions.append("(end_time IS NULL OR end_time <= :end_date)")
            params["end_date"] = end_date
        if category:
            conditions.append("category = :category")
            params["category"] = category
        if synced is not None:
            conditions.append("synced = :synced")
            params["synced"] = synced

        where_clause = " AND ".join(conditions)
        query = text(f"""
            SELECT id, user_id, project_id, task_id, start_time, end_time,
                   duration_hours, description, category, synced, created_at, updated_at
            FROM time_entries
            WHERE {where_clause}
            ORDER BY start_time DESC
            LIMIT :limit OFFSET :offset
        """)
        params["limit"] = limit
        params["offset"] = offset

        result = await self.db.execute(query, params)
        rows = result.fetchall()

        return [self._row_to_response(row) for row in rows]

    async def delete_time_entry(
        self,
        entry_id: UUID,
        current_user: User
    ) -> bool:
        """
        Delete a time entry

        Args:
            entry_id: Time entry UUID
            current_user: User requesting deletion

        Returns:
            True if deleted, False if not found
        """
        query = text("""
            DELETE FROM time_entries
            WHERE id = :entry_id AND user_id = :user_id
        """)
        result = await self.db.execute(
            query,
            {"entry_id": entry_id, "user_id": current_user.id}
        )
        await self.db.commit()

        return result.rowcount > 0

    async def sync_time_entries(
        self,
        entries: list[TimeEntrySyncItem],
        current_user: User,
        device_id: str | None = None
    ) -> list[TimeEntrySyncResult]:
        """
        Sync time entries from mobile device

        Args:
            entries: List of time entries to sync
            current_user: User syncing entries
            device_id: Identifier of the mobile device

        Returns:
            List of sync results for each entry
        """
        results = []
        now = datetime.now(UTC)

        for entry in entries:
            try:
                # Calculate duration
                duration_hours = None
                if entry.end_time:
                    duration_seconds = (entry.end_time - entry.start_time).total_seconds()
                    duration_hours = Decimal(str(round(duration_seconds / 3600, 2)))

                entry_id = uuid.uuid4()

                # Insert entry
                query = text("""
                    INSERT INTO time_entries (
                        id, user_id, project_id, task_id, start_time, end_time,
                        duration_hours, description, category, synced, created_at
                    ) VALUES (
                        :id, :user_id, :project_id, :task_id, :start_time, :end_time,
                        :duration_hours, :description, :category, :synced, :created_at
                    )
                """)
                await self.db.execute(
                    query,
                    {
                        "id": entry_id,
                        "user_id": current_user.id,
                        "project_id": entry.project_id,
                        "task_id": entry.task_id,
                        "start_time": entry.start_time,
                        "end_time": entry.end_time,
                        "duration_hours": duration_hours,
                        "description": entry.description,
                        "category": entry.category,
                        "synced": True,
                        "created_at": now,
                    }
                )

                results.append(TimeEntrySyncResult(
                    local_id=entry.local_id,
                    server_id=entry_id,
                    success=True,
                    error=None
                ))

            except Exception as e:
                results.append(TimeEntrySyncResult(
                    local_id=entry.local_id,
                    server_id=None,
                    success=False,
                    error=str(e)
                ))

        await self.db.commit()
        return results

    async def aggregate_time_entries(
        self,
        request: TimeAggregationRequest,
        current_user: User
    ) -> list[TimeAggregation]:
        """
        Aggregate time entries for invoicing

        Args:
            request: Aggregation request with filters and grouping
            current_user: User requesting aggregation

        Returns:
            List of aggregated time data
        """
        # Build group by clause
        group_fields = request.group_by
        select_fields = []
        group_by_fields = []

        for field in group_fields:
            select_fields.append(field)
            group_by_fields.append(field)

        # Build conditions
        conditions = ["user_id = :user_id"]
        params: dict[str, Any] = {"user_id": current_user.id}

        conditions.append("start_time >= :start_date")
        params["start_date"] = request.start_date

        conditions.append("(end_time IS NULL OR end_time <= :end_date)")
        params["end_date"] = request.end_date

        if request.project_id:
            conditions.append("project_id = :project_id")
            params["project_id"] = request.project_id

        if request.user_id:
            conditions.append("user_id = :filter_user_id")
            params["filter_user_id"] = request.user_id

        where_clause = " AND ".join(conditions)
        select_clause = ", ".join(select_fields)
        group_clause = ", ".join(group_by_fields)

        query = text(f"""
            SELECT {select_clause},
                   COALESCE(SUM(duration_hours), 0) as total_hours,
                   COUNT(*) as entry_count
            FROM time_entries
            WHERE {where_clause}
            GROUP BY {group_clause}
            ORDER BY total_hours DESC
        """)

        result = await self.db.execute(query, params)
        rows = result.fetchall()

        aggregations = []
        for row in rows:
            row_dict = dict(row._mapping)
            project_id_val = row_dict.get("project_id")
            task_id_val = row_dict.get("task_id")

            # Skip rows without project_id as it's required by the schema
            if not project_id_val:
                continue

            aggregations.append(TimeAggregation(
                project_id=UUID(project_id_val),
                user_id=row_dict.get("user_id", current_user.id),
                task_id=UUID(task_id_val) if task_id_val else None,
                category=row_dict.get("category"),
                total_hours=Decimal(str(row_dict.get("total_hours", 0))),
                entry_count=row_dict.get("entry_count", 0),
                start_date=request.start_date,
                end_date=request.end_date,
            ))

        return aggregations

    def _row_to_response(self, row) -> TimeEntryResponse:
        """Convert database row to TimeEntryResponse"""
        row_dict = dict(row._mapping)
        return TimeEntryResponse(
            id=row_dict["id"],
            user_id=row_dict["user_id"],
            project_id=row_dict["project_id"],
            task_id=row_dict.get("task_id"),
            start_time=row_dict["start_time"],
            end_time=row_dict.get("end_time"),
            duration_hours=row_dict.get("duration_hours"),
            description=row_dict.get("description"),
            category=row_dict.get("category"),
            synced=row_dict.get("synced", False),
            created_at=row_dict["created_at"],
            updated_at=row_dict.get("updated_at"),
        )


async def get_time_service(db: AsyncSession = Depends(get_db)) -> TimeService:
    """Dependency for getting TimeService"""
    return TimeService(db)

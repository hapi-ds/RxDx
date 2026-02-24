/**
 * TimeEntriesPanel Component
 * Displays recent time entries grouped by date with pagination
 */

import React from 'react';
import type { TimeEntry } from '../../services/timeTrackingService';
import { groupEntriesByDate } from '../../utils/dateGrouping';
import { formatTime, formatDuration } from '../../utils/timeFormatting';

// ============================================================================
// Props Interfaces
// ============================================================================

export interface TimeEntriesPanelProps {
  entries: TimeEntry[];
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
}

interface TimeEntryGroupProps {
  dateHeader: string;
  entries: TimeEntry[];
}

interface TimeEntryCardProps {
  entry: TimeEntry;
}

// ============================================================================
// TimeEntryCard Component
// ============================================================================

function TimeEntryCard({ entry }: TimeEntryCardProps): React.ReactElement {
  const startTime = formatTime(entry.start_time);
  const endTime = formatTime(entry.end_time);
  const duration = formatDuration(entry.duration_hours);

  // Truncate description if too long
  const maxDescriptionLength = 150;
  const truncatedDescription =
    entry.description.length > maxDescriptionLength
      ? `${entry.description.substring(0, maxDescriptionLength)}...`
      : entry.description;

  return (
    <div className="time-entry-card">
      <div className="time-entry-card__header">
        <h4 className="time-entry-card__task-title">{entry.task_title}</h4>
        <span className="time-entry-card__duration">{duration}</span>
      </div>
      <div className="time-entry-card__time">
        <span className="time-entry-card__time-range">
          {startTime} - {endTime}
        </span>
      </div>
      {entry.description && (
        <p className="time-entry-card__description">{truncatedDescription}</p>
      )}
    </div>
  );
}

// ============================================================================
// TimeEntryGroup Component
// ============================================================================

function TimeEntryGroup({ dateHeader, entries }: TimeEntryGroupProps): React.ReactElement {
  return (
    <div className="time-entry-group">
      <h3 className="time-entry-group__date-header">{dateHeader}</h3>
      <div className="time-entry-group__entries">
        {entries.map((entry) => (
          <TimeEntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TimeEntriesPanel Component
// ============================================================================

export function TimeEntriesPanel({
  entries,
  onLoadMore,
  hasMore,
  isLoading,
}: TimeEntriesPanelProps): React.ReactElement {
  // Group entries by date
  const groupedEntries = groupEntriesByDate(entries);

  // Handle load more button click
  const handleLoadMore = async () => {
    if (!isLoading && hasMore) {
      await onLoadMore();
    }
  };

  return (
    <div className="time-entries-panel">
      <div className="time-entries-panel__header">
        <h2 className="time-entries-panel__title">Recent Entries</h2>
      </div>

      <div className="time-entries-panel__content">
        {groupedEntries.length === 0 && !isLoading ? (
          <div className="time-entries-panel__empty">
            <p>No time entries yet</p>
            <p className="time-entries-panel__empty-hint">
              Start tracking time to see your entries here
            </p>
          </div>
        ) : (
          <>
            {groupedEntries.map((group) => (
              <TimeEntryGroup
                key={group.date}
                dateHeader={group.dateHeader}
                entries={group.entries}
              />
            ))}

            {hasMore && (
              <div className="time-entries-panel__load-more">
                <button
                  className="time-entries-panel__load-more-button"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  type="button"
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .time-entries-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .time-entries-panel__header {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .time-entries-panel__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .time-entries-panel__content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .time-entries-panel__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: #6b7280;
  }

  .time-entries-panel__empty p {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
  }

  .time-entries-panel__empty-hint {
    font-size: 0.875rem !important;
    color: #9ca3af !important;
  }

  .time-entries-panel__load-more {
    display: flex;
    justify-content: center;
    padding: 1rem 0;
  }

  .time-entries-panel__load-more-button {
    padding: 0.625rem 1.5rem;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
  }

  .time-entries-panel__load-more-button:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .time-entries-panel__load-more-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .time-entry-group {
    margin-bottom: 1.5rem;
  }

  .time-entry-group:last-child {
    margin-bottom: 0;
  }

  .time-entry-group__date-header {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .time-entry-group__entries {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .time-entry-card {
    padding: 1rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    transition: border-color 0.2s;
  }

  .time-entry-card:hover {
    border-color: #d1d5db;
  }

  .time-entry-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .time-entry-card__task-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #111827;
    flex: 1;
  }

  .time-entry-card__duration {
    font-size: 0.875rem;
    font-weight: 600;
    color: #3b82f6;
    white-space: nowrap;
  }

  .time-entry-card__time {
    margin-bottom: 0.5rem;
  }

  .time-entry-card__time-range {
    font-size: 0.8125rem;
    color: #6b7280;
    font-variant-numeric: tabular-nums;
  }

  .time-entry-card__description {
    margin: 0;
    font-size: 0.8125rem;
    color: #6b7280;
    line-height: 1.5;
  }

  /* Scrollbar styling */
  .time-entries-panel__content::-webkit-scrollbar {
    width: 8px;
  }

  .time-entries-panel__content::-webkit-scrollbar-track {
    background: #f3f4f6;
  }

  .time-entries-panel__content::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }

  .time-entries-panel__content::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;

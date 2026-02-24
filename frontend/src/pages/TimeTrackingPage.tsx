/**
 * TimeTrackingPage Component
 * Main page for time tracking functionality
 * Provides task selection, timer controls, and time entry history
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { TaskListPanel } from '../components/timetracking/TaskListPanel';
import { TimerPanel } from '../components/timetracking/TimerPanel';
import { TimeEntriesPanel } from '../components/timetracking/TimeEntriesPanel';
import { useTimeTrackingStore } from '../stores/timeTrackingStore';

export function TimeTrackingPage(): React.ReactElement {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Store state
  const {
    tasks,
    activeTracking,
    entries,
    selectedTaskId,
    searchQuery,
    entriesHasMore,
    isLoadingTasks,
    isLoadingEntries,
    isStarting,
    isStopping,
    error,
    fetchTasks,
    checkActiveTracking,
    fetchEntries,
    selectTask,
    setSearchQuery,
    startTracking,
    stopTracking,
    loadMoreEntries,
    clearError,
    getFilteredAndSortedTasks,
  } = useTimeTrackingStore();

  // Get filtered and sorted tasks
  const filteredTasks = getFilteredAndSortedTasks();

  // Get selected task object
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;

  // Initialize page data on mount
  useEffect(() => {
    fetchTasks();
    checkActiveTracking();
    fetchEntries();
  }, [fetchTasks, checkActiveTracking, fetchEntries]);

  // Handle task selection
  const handleTaskSelect = useCallback(
    (task: { id: string }) => {
      selectTask(task.id);
    },
    [selectTask]
  );

  // Handle search change
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [setSearchQuery]
  );

  // Handle start tracking
  const handleStartTracking = useCallback(
    async (taskId: string, description: string) => {
      await startTracking(taskId, description);
    },
    [startTracking]
  );

  // Handle stop tracking
  const handleStopTracking = useCallback(
    async (description: string) => {
      await stopTracking(description);
    },
    [stopTracking]
  );

  // Handle load more entries
  const handleLoadMoreEntries = useCallback(async () => {
    await loadMoreEntries();
  }, [loadMoreEntries]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Ctrl+Space (Cmd+Space on Mac) - Start/Stop tracking
      // This shortcut works even when typing in inputs
      if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
        e.preventDefault();
        if (activeTracking) {
          // Stop tracking - get description from active tracking
          stopTracking(activeTracking.description || '');
        } else if (selectedTask) {
          // Start tracking with empty description
          startTracking(selectedTask.id, '');
        }
        return;
      }

      // Don't process other shortcuts if typing in input fields
      if (isInputField) {
        return;
      }

      // Ctrl+F (Cmd+F on Mac) - Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Escape - Clear search or deselect task
      if (e.key === 'Escape') {
        if (searchQuery) {
          setSearchQuery('');
        } else if (selectedTaskId) {
          selectTask(null);
        }
        return;
      }

      // Arrow keys - Navigate task list
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = filteredTasks.findIndex(
          (task) => task.id === selectedTaskId
        );

        if (e.key === 'ArrowDown') {
          // Move down
          if (currentIndex < filteredTasks.length - 1) {
            selectTask(filteredTasks[currentIndex + 1].id);
          } else if (currentIndex === -1 && filteredTasks.length > 0) {
            // No selection, select first task
            selectTask(filteredTasks[0].id);
          }
        } else {
          // Move up
          if (currentIndex > 0) {
            selectTask(filteredTasks[currentIndex - 1].id);
          }
        }
        return;
      }

      // Enter - Select task (if navigating with arrows)
      if (e.key === 'Enter' && selectedTaskId) {
        // Task is already selected, no additional action needed
        // Could potentially start tracking here if desired
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTracking,
    selectedTask,
    selectedTaskId,
    searchQuery,
    filteredTasks,
    startTracking,
    stopTracking,
    setSearchQuery,
    selectTask,
  ]);

  return (
    <div className="time-tracking-page">
      {/* Page Header */}
      <div className="time-tracking-page__header">
        <h1 className="time-tracking-page__title">Time Tracking</h1>
        <p className="time-tracking-page__subtitle">
          Track time spent on tasks and view your work history
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="time-tracking-page__error" role="alert">
          <span className="time-tracking-page__error-icon" aria-hidden="true">
            ⚠️
          </span>
          <span className="time-tracking-page__error-message">{error}</span>
          <button
            onClick={clearError}
            className="time-tracking-page__error-dismiss"
            aria-label="Dismiss error"
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="time-tracking-page__content">
        {/* Left Column - Task List */}
        <div className="time-tracking-page__left-column">
          <TaskListPanel
            tasks={filteredTasks}
            selectedTaskId={selectedTaskId}
            onTaskSelect={handleTaskSelect}
            isLoading={isLoadingTasks}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />
        </div>

        {/* Right Column - Timer and Entries */}
        <div className="time-tracking-page__right-column">
          {/* Timer Panel */}
          <div className="time-tracking-page__timer-section">
            <TimerPanel
              selectedTask={selectedTask}
              activeTracking={activeTracking}
              onStart={handleStartTracking}
              onStop={handleStopTracking}
              isStarting={isStarting}
              isStopping={isStopping}
            />
          </div>

          {/* Time Entries Panel */}
          <div className="time-tracking-page__entries-section">
            <TimeEntriesPanel
              entries={entries}
              onLoadMore={handleLoadMoreEntries}
              hasMore={entriesHasMore}
              isLoading={isLoadingEntries}
            />
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .time-tracking-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.5rem;
    background-color: #f9fafb;
  }

  .time-tracking-page__header {
    margin-bottom: 1.5rem;
  }

  .time-tracking-page__title {
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
  }

  .time-tracking-page__subtitle {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .time-tracking-page__error {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    color: #991b1b;
  }

  .time-tracking-page__error-icon {
    font-size: 1.25rem;
    line-height: 1;
  }

  .time-tracking-page__error-message {
    flex: 1;
    font-size: 0.875rem;
  }

  .time-tracking-page__error-dismiss {
    background: none;
    border: none;
    color: #991b1b;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1.25rem;
    line-height: 1;
    transition: opacity 0.2s;
  }

  .time-tracking-page__error-dismiss:hover {
    opacity: 0.7;
  }

  .time-tracking-page__content {
    display: flex;
    gap: 1.5rem;
    flex: 1;
    min-height: 0;
  }

  .time-tracking-page__left-column {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .time-tracking-page__right-column {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .time-tracking-page__timer-section {
    flex-shrink: 0;
  }

  .time-tracking-page__entries-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* Responsive Layout - Tablet (<1024px) */
  @media (max-width: 1023px) {
    .time-tracking-page__content {
      flex-direction: column;
    }

    .time-tracking-page__left-column,
    .time-tracking-page__right-column {
      flex: none;
      width: 100%;
    }

    .time-tracking-page__left-column {
      height: 400px;
    }

    .time-tracking-page__entries-section {
      height: 400px;
    }
  }

  /* Responsive Layout - Mobile (<768px) */
  @media (max-width: 767px) {
    .time-tracking-page {
      padding: 1rem;
    }

    .time-tracking-page__title {
      font-size: 1.25rem;
    }

    .time-tracking-page__content {
      gap: 1rem;
    }

    .time-tracking-page__right-column {
      gap: 1rem;
    }
  }

  /* Screen reader only text */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`;

export default TimeTrackingPage;

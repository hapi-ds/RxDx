/**
 * TimerPanel Component
 * Displays timer controls and description input for time tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Task, ActiveTracking } from '../../services/timeTrackingService';
import { formatElapsedTime, calculateElapsedTime } from '../../utils/timeFormatting';
import { validateDescription } from '../../utils/validation';

// ============================================================================
// Props Interface
// ============================================================================

export interface TimerPanelProps {
  selectedTask: Task | null;
  activeTracking: ActiveTracking | null;
  onStart: (taskId: string, description: string) => Promise<void>;
  onStop: (description: string) => Promise<void>;
  isStarting: boolean;
  isStopping: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function TimerPanel({
  selectedTask,
  activeTracking,
  onStart,
  onStop,
  isStarting,
  isStopping,
}: TimerPanelProps): React.ReactElement {
  const [description, setDescription] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [validationError, setValidationError] = useState<string | undefined>();

  // Initialize description from active tracking
  useEffect(() => {
    if (activeTracking) {
      setDescription(activeTracking.description || '');
    } else {
      setDescription('');
    }
  }, [activeTracking]);

  // Timer update logic
  useEffect(() => {
    if (!activeTracking) {
      setElapsedTime(0);
      return;
    }

    // Calculate initial elapsed time
    const initialElapsed = calculateElapsedTime(activeTracking.start_time, Date.now());
    setElapsedTime(initialElapsed);

    // Update every second
    const interval = setInterval(() => {
      const elapsed = calculateElapsedTime(activeTracking.start_time, Date.now());
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTracking]);

  // Handle description change
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDescription(value);

    // Validate on change
    const validation = validateDescription(value);
    setValidationError(validation.error);
  }, []);

  // Handle start/stop button click
  const handleToggleTracking = useCallback(async () => {
    // Validate description before action
    const validation = validateDescription(description);
    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    try {
      if (activeTracking) {
        // Stop tracking
        await onStop(description);
      } else if (selectedTask) {
        // Start tracking
        await onStart(selectedTask.id, description);
      }
    } catch (error) {
      // Error is handled by the store
      console.error('Failed to toggle tracking:', error);
    }
  }, [activeTracking, selectedTask, description, onStart, onStop]);

  // Determine button state
  const isTracking = !!activeTracking;
  const isLoading = isStarting || isStopping;
  const isDisabled = isLoading || (!isTracking && !selectedTask);

  // Get button text
  const getButtonText = (): string => {
    if (isStarting) return 'Starting...';
    if (isStopping) return 'Stopping...';
    if (isTracking) return 'Stop Tracking';
    return 'Start Tracking';
  };

  // Get task to display (active tracking task or selected task)
  const displayTask = isTracking && activeTracking
    ? { id: activeTracking.task_id, title: activeTracking.task_title }
    : selectedTask;

  return (
    <div className="timer-panel">
      {/* Task Header */}
      <div className="timer-panel__header">
        {displayTask ? (
          <>
            <h3 className="timer-panel__task-title">{displayTask.title}</h3>
            {selectedTask && (
              <p className="timer-panel__task-description">
                {selectedTask.description}
              </p>
            )}
          </>
        ) : (
          <p className="timer-panel__no-task">Select a task to start tracking</p>
        )}
      </div>

      {/* Timer Display */}
      <div className="timer-panel__timer">
        <div className="timer-panel__timer-display">
          {formatElapsedTime(elapsedTime)}
        </div>
        {isTracking && (
          <div className="timer-panel__timer-status">
            <span className="timer-panel__timer-indicator" />
            <span>Tracking</span>
          </div>
        )}
      </div>

      {/* Description Input */}
      <div className="timer-panel__description">
        <label htmlFor="tracking-description" className="timer-panel__description-label">
          Description
        </label>
        <textarea
          id="tracking-description"
          className={`timer-panel__description-input ${validationError ? 'timer-panel__description-input--error' : ''}`}
          value={description}
          onChange={handleDescriptionChange}
          placeholder="What are you working on?"
          maxLength={500}
          rows={4}
          disabled={isLoading}
        />
        <div className="timer-panel__description-footer">
          <span className={`timer-panel__char-count ${description.length > 500 ? 'timer-panel__char-count--error' : ''}`}>
            {description.length}/500
          </span>
          {validationError && (
            <span className="timer-panel__validation-error">{validationError}</span>
          )}
        </div>
      </div>

      {/* Start/Stop Button */}
      <button
        className={`timer-panel__button ${isTracking ? 'timer-panel__button--stop' : 'timer-panel__button--start'}`}
        onClick={handleToggleTracking}
        disabled={isDisabled}
        type="button"
      >
        {getButtonText()}
      </button>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .timer-panel {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .timer-panel__header {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 1rem;
  }

  .timer-panel__task-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  .timer-panel__task-description {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .timer-panel__no-task {
    margin: 0;
    font-size: 0.875rem;
    color: #9ca3af;
    font-style: italic;
  }

  .timer-panel__timer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem 0;
    background: #f9fafb;
    border-radius: 6px;
  }

  .timer-panel__timer-display {
    font-size: 3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #111827;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', 'Source Code Pro', monospace;
  }

  .timer-panel__timer-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #059669;
    font-weight: 500;
  }

  .timer-panel__timer-indicator {
    width: 8px;
    height: 8px;
    background: #059669;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .timer-panel__description {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .timer-panel__description-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .timer-panel__description-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: inherit;
    line-height: 1.5;
    resize: vertical;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .timer-panel__description-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .timer-panel__description-input:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }

  .timer-panel__description-input--error {
    border-color: #ef4444;
  }

  .timer-panel__description-input--error:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .timer-panel__description-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .timer-panel__char-count {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .timer-panel__char-count--error {
    color: #ef4444;
    font-weight: 500;
  }

  .timer-panel__validation-error {
    font-size: 0.75rem;
    color: #ef4444;
  }

  .timer-panel__button {
    width: 100%;
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .timer-panel__button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .timer-panel__button--start {
    background: #3b82f6;
    color: #ffffff;
  }

  .timer-panel__button--start:hover:not(:disabled) {
    background: #2563eb;
  }

  .timer-panel__button--start:active:not(:disabled) {
    background: #1d4ed8;
  }

  .timer-panel__button--stop {
    background: #ef4444;
    color: #ffffff;
  }

  .timer-panel__button--stop:hover:not(:disabled) {
    background: #dc2626;
  }

  .timer-panel__button--stop:active:not(:disabled) {
    background: #b91c1c;
  }
`;

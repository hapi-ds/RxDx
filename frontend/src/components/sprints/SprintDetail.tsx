import React, { useEffect, useState, useCallback } from 'react';
import type { Sprint, SprintStatistics } from '../../services/sprintService';
import { sprintService } from '../../services/sprintService';

interface SprintDetailProps {
  sprint: Sprint;
  onEdit?: () => void;
  onDelete?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onViewBurndown?: () => void;
}

export const SprintDetail: React.FC<SprintDetailProps> = ({
  sprint,
  onEdit,
  onDelete,
  onStart,
  onComplete,
  onViewBurndown,
}) => {
  const [statistics, setStatistics] = useState<SprintStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await sprintService.getSprintStatistics(sprint.id);
      setStatistics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [sprint.id]);

  useEffect(() => {
    if (sprint.status === 'active' || sprint.status === 'completed') {
      loadStatistics();
    }
  }, [sprint.id, sprint.status, loadStatistics]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: Sprint['status']) => {
    switch (status) {
      case 'planning':
        return 'text-gray-600';
      case 'active':
        return 'text-green-600';
      case 'completed':
        return 'text-blue-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const canStart = sprint.status === 'planning';
  const canComplete = sprint.status === 'active';
  const canEdit = sprint.status === 'planning';
  const canViewBurndown = sprint.status === 'active' || sprint.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{sprint.name}</h2>
          <p className={`text-sm font-medium mt-1 ${getStatusColor(sprint.status)}`}>
            {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Edit
            </button>
          )}
          {canStart && onStart && (
            <button
              onClick={onStart}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Start Sprint
            </button>
          )}
          {canComplete && onComplete && (
            <button
              onClick={onComplete}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Complete Sprint
            </button>
          )}
          {canViewBurndown && onViewBurndown && (
            <button
              onClick={onViewBurndown}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              View Burndown
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Goal */}
      {sprint.goal && (
        <div>
          <h3 className="text-sm font-medium text-gray-700">Sprint Goal</h3>
          <p className="mt-1 text-gray-900">{sprint.goal}</p>
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Start Date</h3>
          <p className="mt-1 text-gray-900">{formatDate(sprint.start_date)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700">End Date</h3>
          <p className="mt-1 text-gray-900">{formatDate(sprint.end_date)}</p>
        </div>
      </div>

      {/* Capacity */}
      {(sprint.capacity_hours || sprint.capacity_story_points) && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Capacity</h3>
          <div className="grid grid-cols-2 gap-4">
            {sprint.capacity_hours && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Hours</p>
                <p className="text-2xl font-semibold text-gray-900">{sprint.capacity_hours}</p>
              </div>
            )}
            {sprint.capacity_story_points && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Story Points</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {sprint.capacity_story_points}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Velocity (for completed sprints) */}
      {sprint.status === 'completed' &&
        (sprint.actual_velocity_hours || sprint.actual_velocity_story_points) && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Actual Velocity</h3>
            <div className="grid grid-cols-2 gap-4">
              {sprint.actual_velocity_hours && (
                <div className="p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-600">Hours</p>
                  <p className="text-2xl font-semibold text-green-900">
                    {sprint.actual_velocity_hours}
                  </p>
                </div>
              )}
              {sprint.actual_velocity_story_points && (
                <div className="p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-600">Story Points</p>
                  <p className="text-2xl font-semibold text-green-900">
                    {sprint.actual_velocity_story_points}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Statistics */}
      {(sprint.status === 'active' || sprint.status === 'completed') && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Statistics</h3>
          {loading && <p className="text-sm text-gray-500">Loading statistics...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {statistics && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-600">Total Tasks</p>
                <p className="text-2xl font-semibold text-blue-900">{statistics.total_tasks}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-md">
                <p className="text-sm text-green-600">Completed</p>
                <p className="text-2xl font-semibold text-green-900">
                  {statistics.completed_tasks}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-600">In Progress</p>
                <p className="text-2xl font-semibold text-yellow-900">
                  {statistics.in_progress_tasks}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-md">
                <p className="text-sm text-purple-600">Completed Hours</p>
                <p className="text-2xl font-semibold text-purple-900">
                  {statistics.completed_hours}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-md">
                <p className="text-sm text-orange-600">Remaining Hours</p>
                <p className="text-2xl font-semibold text-orange-900">
                  {statistics.remaining_hours}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-md">
                <p className="text-sm text-indigo-600">Completion</p>
                <p className="text-2xl font-semibold text-indigo-900">
                  {statistics.completion_percentage}%
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Created: {formatDate(sprint.created_at)}
        </p>
      </div>
    </div>
  );
};

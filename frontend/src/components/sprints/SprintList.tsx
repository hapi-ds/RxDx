import React, { useEffect, useState, useCallback } from 'react';
import type { Sprint } from '../../services/sprintService';
import { sprintService } from '../../services/sprintService';

interface SprintListProps {
  projectId: string;
  onSelectSprint?: (sprint: Sprint) => void;
  onCreateSprint?: () => void;
}

export const SprintList: React.FC<SprintListProps> = ({
  projectId,
  onSelectSprint,
  onCreateSprint,
}) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSprints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sprintService.getSprints(projectId);
      setSprints(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sprints');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  const getStatusBadgeClass = (status: Sprint['status']) => {
    switch (status) {
      case 'planning':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-500">Loading sprints...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadSprints}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Sprints</h2>
        {onCreateSprint && (
          <button
            onClick={onCreateSprint}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Sprint
          </button>
        )}
      </div>

      {sprints.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-md">
          <p className="text-gray-500">No sprints found</p>
          {onCreateSprint && (
            <button
              onClick={onCreateSprint}
              className="mt-4 text-blue-600 hover:text-blue-800 underline"
            >
              Create your first sprint
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="p-4 border border-gray-200 rounded-md hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectSprint?.(sprint)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{sprint.name}</h3>
                  {sprint.goal && (
                    <p className="text-sm text-gray-600 mt-1">{sprint.goal}</p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeClass(
                    sprint.status
                  )}`}
                >
                  {sprint.status}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Start:</span>{' '}
                  <span className="font-medium">{formatDate(sprint.start_date)}</span>
                </div>
                <div>
                  <span className="text-gray-500">End:</span>{' '}
                  <span className="font-medium">{formatDate(sprint.end_date)}</span>
                </div>
              </div>

              {(sprint.capacity_hours || sprint.capacity_story_points) && (
                <div className="mt-3 flex gap-4 text-sm">
                  {sprint.capacity_hours && (
                    <div>
                      <span className="text-gray-500">Capacity:</span>{' '}
                      <span className="font-medium">{sprint.capacity_hours}h</span>
                    </div>
                  )}
                  {sprint.capacity_story_points && (
                    <div>
                      <span className="text-gray-500">Story Points:</span>{' '}
                      <span className="font-medium">{sprint.capacity_story_points}</span>
                    </div>
                  )}
                </div>
              )}

              {sprint.status === 'completed' &&
                (sprint.actual_velocity_hours || sprint.actual_velocity_story_points) && (
                  <div className="mt-3 flex gap-4 text-sm">
                    {sprint.actual_velocity_hours && (
                      <div>
                        <span className="text-gray-500">Velocity:</span>{' '}
                        <span className="font-medium text-green-600">
                          {sprint.actual_velocity_hours}h
                        </span>
                      </div>
                    )}
                    {sprint.actual_velocity_story_points && (
                      <div>
                        <span className="text-gray-500">Story Points:</span>{' '}
                        <span className="font-medium text-green-600">
                          {sprint.actual_velocity_story_points}
                        </span>
                      </div>
                    )}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

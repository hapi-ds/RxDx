/**
 * BacklogList component
 * Displays a list of backlogs for a project
 */

import React, { useEffect, useState } from 'react';
import { backlogService, Backlog } from '../../services/backlogService';
import { Button, Spinner, ErrorMessage, EmptyState } from '../common';

interface BacklogListProps {
  projectId: string;
  onSelectBacklog?: (backlog: Backlog) => void;
  onCreateBacklog?: () => void;
}

export function BacklogList({
  projectId,
  onSelectBacklog,
  onCreateBacklog,
}: BacklogListProps): React.ReactElement {
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBacklogs();
  }, [projectId]);

  async function loadBacklogs(): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);
      const data = await backlogService.getBacklogs(projectId);
      setBacklogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backlogs');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadBacklogs} />;
  }

  if (backlogs.length === 0) {
    return (
      <EmptyState
        title="No backlogs found"
        description="Create a backlog to start managing your tasks."
        action={
          onCreateBacklog ? (
            <Button onClick={onCreateBacklog}>Create Backlog</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="backlog-list">
      <div className="backlog-list-header">
        <h2>Backlogs</h2>
        {onCreateBacklog && (
          <Button onClick={onCreateBacklog}>Create Backlog</Button>
        )}
      </div>
      <div className="backlog-list-items">
        {backlogs.map((backlog) => (
          <div
            key={backlog.id}
            onClick={() => onSelectBacklog?.(backlog)}
            className="backlog-card"
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
              cursor: 'pointer',
            }}
          >
            <h3>{backlog.name}</h3>
            {backlog.description && <p>{backlog.description}</p>}
            <div className="backlog-meta">
              <span className="task-count">
                {backlog.task_count || 0} tasks
              </span>
              <span className="created-date">
                {' • '}
                Created: {new Date(backlog.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

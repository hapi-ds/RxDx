/**
 * BacklogPage component
 * Main page for backlog management
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BacklogList } from '../components/backlogs/BacklogList';
import { BacklogDetail } from '../components/backlogs/BacklogDetail';
import { Modal, Button, Input } from '../components/common';
import { backlogService, Backlog, BacklogCreate } from '../services/backlogService';

type ViewMode = 'list' | 'detail';

export function BacklogPage(): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedBacklog, setSelectedBacklog] = useState<Backlog | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState<BacklogCreate>({
    name: '',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  if (!projectId) {
    return (
      <div className="backlog-page">
        <h1>Backlog Management</h1>
        <p>No project selected. Please select a project first.</p>
      </div>
    );
  }

  const handleSelectBacklog = (backlog: Backlog): void => {
    setSelectedBacklog(backlog);
    setViewMode('detail');
  };

  const handleBackToList = (): void => {
    setSelectedBacklog(null);
    setViewMode('list');
  };

  const handleCreateBacklog = (): void => {
    setShowCreateModal(true);
    setCreateFormData({ name: '', description: '' });
    setCreateError(null);
  };

  const handleCloseCreateModal = (): void => {
    setShowCreateModal(false);
    setCreateFormData({ name: '', description: '' });
    setCreateError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!createFormData.name.trim()) {
      setCreateError('Backlog name is required');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);
      const newBacklog = await backlogService.createBacklog(projectId, createFormData);
      handleCloseCreateModal();
      setSelectedBacklog(newBacklog);
      setViewMode('detail');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create backlog');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="backlog-page">
      <div className="backlog-page-header">
        <h1>Backlog Management</h1>
        {viewMode === 'list' && (
          <Button onClick={() => navigate(`/projects/${projectId}`)}>
            ← Back to Project
          </Button>
        )}
      </div>

      {viewMode === 'list' ? (
        <BacklogList
          projectId={projectId}
          onSelectBacklog={handleSelectBacklog}
          onCreateBacklog={handleCreateBacklog}
        />
      ) : (
        selectedBacklog && (
          <BacklogDetail
            backlogId={selectedBacklog.id}
            projectId={projectId}
            onBack={handleBackToList}
          />
        )
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Create Backlog"
        size="medium"
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="form-group">
            <Input
              label="Backlog Name"
              value={createFormData.name}
              onChange={(e) =>
                setCreateFormData({ ...createFormData, name: e.target.value })
              }
              placeholder="Enter backlog name"
              required
            />
          </div>

          <div className="form-group">
            <Input
              label="Description"
              value={createFormData.description || ''}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  description: e.target.value,
                })
              }
              placeholder="Enter backlog description (optional)"
            />
          </div>

          {createError && (
            <div className="error-message" role="alert">
              {createError}
            </div>
          )}

          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseCreateModal}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Backlog'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

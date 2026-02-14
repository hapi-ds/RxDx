import React, { useState } from 'react';
import type { Sprint } from '../services/sprintService';
import { SprintList, SprintForm, SprintDetail, SprintBurndown } from '../components/sprints';

type ViewMode = 'list' | 'detail' | 'create' | 'edit' | 'burndown';

interface SprintPageProps {
  projectId: string;
}

export const SprintPage: React.FC<SprintPageProps> = ({ projectId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectSprint = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setViewMode('detail');
  };

  const handleCreateSprint = () => {
    setSelectedSprint(null);
    setViewMode('create');
  };

  const handleEditSprint = () => {
    setViewMode('edit');
  };

  const handleDeleteSprint = async () => {
    if (!selectedSprint) return;
    
    if (window.confirm(`Are you sure you want to delete sprint "${selectedSprint.name}"?`)) {
      try {
        const { sprintService } = await import('../services/sprintService');
        await sprintService.deleteSprint(selectedSprint.id);
        setSelectedSprint(null);
        setViewMode('list');
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete sprint');
      }
    }
  };

  const handleStartSprint = async () => {
    if (!selectedSprint) return;
    
    try {
      const { sprintService } = await import('../services/sprintService');
      const updatedSprint = await sprintService.startSprint(selectedSprint.id);
      setSelectedSprint(updatedSprint);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start sprint');
    }
  };

  const handleCompleteSprint = async () => {
    if (!selectedSprint) return;
    
    if (window.confirm(`Are you sure you want to complete sprint "${selectedSprint.name}"?`)) {
      try {
        const { sprintService } = await import('../services/sprintService');
        const updatedSprint = await sprintService.completeSprint(selectedSprint.id);
        setSelectedSprint(updatedSprint);
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to complete sprint');
      }
    }
  };

  const handleViewBurndown = () => {
    setViewMode('burndown');
  };

  const handleFormSuccess = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setViewMode('detail');
    setRefreshKey((prev) => prev + 1);
  };

  const handleFormCancel = () => {
    if (selectedSprint) {
      setViewMode('detail');
    } else {
      setViewMode('list');
    }
  };

  const handleBackToList = () => {
    setSelectedSprint(null);
    setViewMode('list');
  };

  const handleBackToDetail = () => {
    setViewMode('detail');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          <button
            onClick={handleBackToList}
            className="hover:text-gray-900 hover:underline"
          >
            Sprints
          </button>
          {selectedSprint && (
            <>
              <span>/</span>
              <button
                onClick={handleBackToDetail}
                className="hover:text-gray-900 hover:underline"
              >
                {selectedSprint.name}
              </button>
            </>
          )}
          {viewMode === 'create' && (
            <>
              <span>/</span>
              <span className="text-gray-900">Create Sprint</span>
            </>
          )}
          {viewMode === 'edit' && (
            <>
              <span>/</span>
              <span className="text-gray-900">Edit</span>
            </>
          )}
          {viewMode === 'burndown' && (
            <>
              <span>/</span>
              <span className="text-gray-900">Burndown Chart</span>
            </>
          )}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {viewMode === 'list' && (
          <SprintList
            key={refreshKey}
            projectId={projectId}
            onSelectSprint={handleSelectSprint}
            onCreateSprint={handleCreateSprint}
          />
        )}

        {viewMode === 'detail' && selectedSprint && (
          <SprintDetail
            sprint={selectedSprint}
            onEdit={handleEditSprint}
            onDelete={handleDeleteSprint}
            onStart={handleStartSprint}
            onComplete={handleCompleteSprint}
            onViewBurndown={handleViewBurndown}
          />
        )}

        {viewMode === 'create' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Create Sprint</h2>
            <SprintForm
              projectId={projectId}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        )}

        {viewMode === 'edit' && selectedSprint && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Edit Sprint</h2>
            <SprintForm
              projectId={projectId}
              sprint={selectedSprint}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        )}

        {viewMode === 'burndown' && selectedSprint && (
          <div>
            <button
              onClick={handleBackToDetail}
              className="mb-4 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Sprint Details
            </button>
            <SprintBurndown
              sprintId={selectedSprint.id}
              sprintName={selectedSprint.name}
              useStoryPoints={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Requirements page
 * Main page for managing requirements with list, detail, and form views
 */

import React, { useState, useCallback, useEffect } from 'react';
import { WorkItemList, WorkItemDetail, WorkItemForm, VersionHistory } from '../components/workitems';
import { Modal, ConfirmModal, Button } from '../components/common';
import { useWorkItemStore } from '../stores/workitemStore';
import type { WorkItem } from '../services/workitemService';

type ViewMode = 'list' | 'detail' | 'create' | 'edit' | 'history';

interface EditRequirementModalProps {
  itemId: string;
  onSuccess: (item: WorkItem) => void;
  onCancel: () => void;
}

function EditRequirementModal({ itemId, onSuccess, onCancel }: EditRequirementModalProps): React.ReactElement {
  const { selectedItem, fetchItem } = useWorkItemStore();

  useEffect(() => {
    if (itemId) {
      fetchItem(itemId);
    }
  }, [itemId, fetchItem]);

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Edit Requirement"
      size="lg"
    >
      {selectedItem && selectedItem.id === itemId ? (
        <WorkItemForm
          item={selectedItem}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      )}
    </Modal>
  );
}

export function Requirements(): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<WorkItem | null>(null);
  
  const { deleteItem, isDeleting, fetchItems } = useWorkItemStore();

  const handleItemClick = useCallback((item: WorkItem) => {
    setSelectedItemId(item.id);
    setViewMode('detail');
  }, []);

  const handleCreateClick = useCallback(() => {
    setSelectedItemId(null);
    setViewMode('create');
  }, []);

  const handleEdit = useCallback((item: WorkItem) => {
    setSelectedItemId(item.id);
    setViewMode('edit');
  }, []);

  const handleDelete = useCallback((item: WorkItem) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (itemToDelete) {
      try {
        await deleteItem(itemToDelete.id);
        setShowDeleteConfirm(false);
        setItemToDelete(null);
        setViewMode('list');
        setSelectedItemId(null);
      } catch {
        // Error handled by store
      }
    }
  }, [itemToDelete, deleteItem]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  }, []);

  const handleViewHistory = useCallback((item: WorkItem) => {
    setSelectedItemId(item.id);
    setViewMode('history');
  }, []);

  const handleFormSuccess = useCallback((item: WorkItem) => {
    setSelectedItemId(item.id);
    setViewMode('detail');
    fetchItems();
  }, [fetchItems]);

  const handleFormCancel = useCallback(() => {
    if (selectedItemId) {
      setViewMode('detail');
    } else {
      setViewMode('list');
    }
  }, [selectedItemId]);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedItemId(null);
  }, []);

  const handleBackToDetail = useCallback(() => {
    setViewMode('detail');
  }, []);

  return (
    <div className="requirements-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Requirements</h1>
          <p className="page-subtitle">
            Manage project requirements with version control and digital signatures
          </p>
        </div>
        {viewMode !== 'list' && (
          <Button variant="secondary" onClick={handleBackToList}>
            ← Back to List
          </Button>
        )}
      </div>

      <div className="page-content">
        {viewMode === 'list' && (
          <WorkItemList
            onItemClick={handleItemClick}
            onCreateClick={handleCreateClick}
            initialFilters={{ type: 'requirement' }}
            showFilters={true}
            showPagination={true}
          />
        )}

        {viewMode === 'detail' && selectedItemId && (
          <WorkItemDetail
            workItemId={selectedItemId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewHistory={handleViewHistory}
            onClose={handleBackToList}
          />
        )}

        {viewMode === 'create' && (
          <div className="form-container">
            <h2 className="form-title">Create New Requirement</h2>
            <WorkItemForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              defaultType="requirement"
            />
          </div>
        )}

        {viewMode === 'edit' && selectedItemId && (
          <EditRequirementModal
            itemId={selectedItemId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        )}

        {viewMode === 'history' && selectedItemId && (
          <div className="history-container">
            <VersionHistory
              workItemId={selectedItemId}
              onClose={handleBackToDetail}
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Requirement"
        message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <style>{`
        .requirements-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1.5rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .page-title-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .page-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .page-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .page-content {
          flex: 1;
          overflow: auto;
        }

        .form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .form-title {
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .history-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          height: calc(100vh - 200px);
        }
      `}</style>
    </div>
  );
}

export default Requirements;

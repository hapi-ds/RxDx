/**
 * Table page
 * Main page for managing all work items with list, detail, and form views
 */

import React, { useState, useCallback, useEffect } from 'react';
import { WorkItemList, WorkItemDetail, WorkItemForm, VersionHistory, BulkEditModal } from '../components/workitems';
import { Modal, ConfirmModal, Button, NodeTypeFilter } from '../components/common';
import { useWorkItemStore } from '../stores/workitemStore';
import { WORK_ITEM_TYPE_OPTIONS } from '../types/filters';
import { saveFilterState, loadFilterState } from '../utils/sessionStorage';
import type { WorkItem } from '../services/workitemService';

type ViewMode = 'list' | 'detail' | 'create' | 'edit' | 'history';

interface EditWorkItemModalProps {
  itemId: string;
  onSuccess: (item: WorkItem) => void;
  onCancel: () => void;
}

function EditWorkItemModal({ itemId, onSuccess, onCancel }: EditWorkItemModalProps): React.ReactElement {
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
      title="Edit Work Item"
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

export function Table(): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<WorkItem | null>(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  
  const {
    deleteItem,
    isDeleting,
    fetchItems,
    filters,
    setNodeTypeFilter,
    isBulkEditing,
    selectedIds,
    toggleBulkEdit,
    selectItemForBulk,
    deselectItemForBulk,
    selectAll,
    deselectAll,
    bulkUpdate,
    isBulkUpdating,
    error: storeError,
    clearError,
  } = useWorkItemStore();

  // Load filter state from session storage on mount
  useEffect(() => {
    const storedFilters = loadFilterState('table');
    
    if (storedFilters && storedFilters.size > 0) {
      // Restore filter state from session storage
      setNodeTypeFilter(storedFilters);
    } else if (!filters.nodeTypes || filters.nodeTypes.size === 0) {
      // Initialize with all types selected if no stored state
      const allTypes = new Set(WORK_ITEM_TYPE_OPTIONS.map(opt => opt.value));
      setNodeTypeFilter(allTypes);
    }
  }, []); // Run only on mount

  // Save filter state to session storage whenever it changes
  useEffect(() => {
    if (filters.nodeTypes && filters.nodeTypes.size > 0) {
      saveFilterState('table', filters.nodeTypes);
    }
  }, [filters.nodeTypes]);

  // Handle node type filter changes
  const handleNodeTypeFilterChange = useCallback((selectedTypes: Set<string>) => {
    setNodeTypeFilter(selectedTypes);
  }, [setNodeTypeFilter]);

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

  const handleToggleBulkEdit = useCallback(() => {
    toggleBulkEdit();
  }, [toggleBulkEdit]);

  const handleBulkEditClick = useCallback(() => {
    setShowBulkEditModal(true);
  }, []);

  const handleBulkEditSuccess = useCallback(() => {
    setShowBulkEditModal(false);
    fetchItems();
  }, [fetchItems]);

  const handleBulkEditCancel = useCallback(() => {
    setShowBulkEditModal(false);
    clearError();
  }, [clearError]);

  return (
    <div className="table-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Table</h1>
          <p className="page-subtitle">
            Manage all work items with version control and digital signatures
          </p>
        </div>
        <div className="page-header-actions">
          <NodeTypeFilter
            selectedTypes={filters.nodeTypes || new Set()}
            onChange={handleNodeTypeFilterChange}
            availableTypes={WORK_ITEM_TYPE_OPTIONS}
            showWorkItemTypes={true}
            showCategories={false}
            layout="compact"
            className="table-node-filter"
          />
          {viewMode === 'list' && (
            <>
              <Button
                variant={isBulkEditing ? 'primary' : 'secondary'}
                onClick={handleToggleBulkEdit}
              >
                {isBulkEditing ? 'Exit Bulk Edit' : 'Bulk Edit'}
              </Button>
              {isBulkEditing && selectedIds.size > 0 && (
                <Button
                  variant="primary"
                  onClick={handleBulkEditClick}
                >
                  Edit {selectedIds.size} Item{selectedIds.size !== 1 ? 's' : ''}
                </Button>
              )}
            </>
          )}
          {viewMode !== 'list' && (
            <Button variant="secondary" onClick={handleBackToList}>
              ← Back to List
            </Button>
          )}
        </div>
      </div>

      <div className="page-content">
        {viewMode === 'list' && (
          <WorkItemList
            onItemClick={handleItemClick}
            onCreateClick={handleCreateClick}
            showFilters={true}
            showPagination={true}
            isBulkEditing={isBulkEditing}
            selectedIds={selectedIds}
            onSelectItem={selectItemForBulk}
            onDeselectItem={deselectItemForBulk}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
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
            <h2 className="form-title">Create New Work Item</h2>
            <WorkItemForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              defaultType="requirement"
            />
          </div>
        )}

        {viewMode === 'edit' && selectedItemId && (
          <EditWorkItemModal
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
        title="Delete Work Item"
        message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {showBulkEditModal && (
        <BulkEditModal
          selectedIds={Array.from(selectedIds)}
          onSuccess={handleBulkEditSuccess}
          onCancel={handleBulkEditCancel}
          isUpdating={isBulkUpdating}
          error={storeError}
          onBulkUpdate={bulkUpdate}
        />
      )}

      <style>{`
        .table-page {
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
          gap: 1rem;
        }

        .page-title-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .page-header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .table-node-filter {
          min-width: 200px;
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

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: stretch;
          }

          .page-header-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .table-node-filter {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default Table;

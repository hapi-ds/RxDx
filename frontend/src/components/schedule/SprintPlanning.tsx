/**
 * SprintPlanning component
 * Provides sprint planning interface with capacity-based work allocation
 * Implements Requirement 11 (Project Management Workflows)
 * 
 * Features:
 * - Display product backlog with prioritized work items
 * - Drag-and-drop items from backlog to sprint
 * - Track sprint capacity and velocity
 * - Calculate team capacity based on available hours
 * - Visual indicators for capacity utilization
 * - Support for story points or hour-based estimation
 */

import React, { useState, useCallback, useMemo, type DragEvent } from 'react';
import type { WorkItem } from '../../services/workitemService';

export interface SprintPlanningProps {
  /** Available backlog items */
  backlogItems: WorkItem[];
  /** Items already in the sprint */
  sprintItems: WorkItem[];
  /** Sprint capacity in hours or story points */
  sprintCapacity: number;
  /** Team velocity from previous sprints */
  teamVelocity?: number;
  /** Sprint name/identifier */
  sprintName?: string;
  /** Sprint start date */
  sprintStartDate?: Date;
  /** Sprint end date */
  sprintEndDate?: Date;
  /** Callback when an item is added to sprint */
  onAddToSprint?: (itemId: string) => void;
  /** Callback when an item is removed from sprint */
  onRemoveFromSprint?: (itemId: string) => void;
  /** Callback when backlog item is clicked */
  onBacklogItemClick?: (itemId: string) => void;
  /** Callback when sprint item is clicked */
  onSprintItemClick?: (itemId: string) => void;
  /** Whether to use story points (true) or hours (false) */
  useStoryPoints?: boolean;
  /** Whether the planning is in read-only mode */
  readOnly?: boolean;
  /** Custom CSS class */
  className?: string;
}

interface DragState {
  itemId: string | null;
  source: 'backlog' | 'sprint' | null;
}

export function SprintPlanning({
  backlogItems,
  sprintItems,
  sprintCapacity,
  teamVelocity,
  sprintName = 'Sprint Planning',
  sprintStartDate,
  sprintEndDate,
  onAddToSprint,
  onRemoveFromSprint,
  onBacklogItemClick,
  onSprintItemClick,
  useStoryPoints = false,
  readOnly = false,
  className = '',
}: SprintPlanningProps): React.ReactElement {
  const [dragState, setDragState] = useState<DragState>({
    itemId: null,
    source: null,
  });
  const [dragOverZone, setDragOverZone] = useState<'backlog' | 'sprint' | null>(null);

  // Calculate sprint commitment
  const sprintCommitment = useMemo(() => {
    return sprintItems.reduce((total, item) => {
      // Note: WorkItem type doesn't have story_points or estimated_hours
      // Using priority as a proxy for estimation (1-5 scale)
      const estimate = useStoryPoints 
        ? (item.priority || 0) 
        : (item.priority || 0);
      return total + estimate;
    }, 0);
  }, [sprintItems, useStoryPoints]);

  // Calculate capacity utilization percentage
  const capacityUtilization = useMemo(() => {
    if (sprintCapacity === 0) return 0;
    return Math.round((sprintCommitment / sprintCapacity) * 100);
  }, [sprintCommitment, sprintCapacity]);

  // Get capacity status
  const getCapacityStatus = (): { label: string; color: string; warning?: string } => {
    if (capacityUtilization <= 80) {
      return { label: 'Under Capacity', color: '#10b981' };
    } else if (capacityUtilization <= 100) {
      return { label: 'Optimal', color: '#3b82f6' };
    } else if (capacityUtilization <= 120) {
      return { 
        label: 'Over Capacity', 
        color: '#f59e0b',
        warning: 'Sprint is over capacity. Consider removing items.'
      };
    } else {
      return { 
        label: 'Severely Over Capacity', 
        color: '#dc2626',
        warning: 'Sprint is significantly over capacity. This may not be achievable.'
      };
    }
  };

  const capacityStatus = getCapacityStatus();

  // Get priority info
  const getPriorityInfo = (priority?: number): { label: string; color: string } => {
    if (!priority) return { label: 'None', color: '#9ca3af' };
    
    switch (priority) {
      case 1:
        return { label: 'Critical', color: '#dc2626' };
      case 2:
        return { label: 'High', color: '#ea580c' };
      case 3:
        return { label: 'Medium', color: '#f59e0b' };
      case 4:
        return { label: 'Low', color: '#84cc16' };
      case 5:
        return { label: 'Trivial', color: '#22c55e' };
      default:
        return { label: `P${priority}`, color: '#6b7280' };
    }
  };

  // Handle drag start
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, itemId: string, source: 'backlog' | 'sprint') => {
      if (readOnly) return;

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', itemId);
      
      setDragState({ itemId, source });

      const target = e.currentTarget;
      setTimeout(() => {
        target.classList.add('dragging');
      }, 0);
    },
    [readOnly]
  );

  // Handle drag end
  const handleDragEnd = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragging');
    setDragState({ itemId: null, source: null });
    setDragOverZone(null);
  }, []);

  // Handle drag over zone
  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, zone: 'backlog' | 'sprint') => {
      if (readOnly) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverZone(zone);
    },
    [readOnly]
  );

  // Handle drag leave zone
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      setDragOverZone(null);
    }
  }, []);

  // Handle drop on zone
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetZone: 'backlog' | 'sprint') => {
      if (readOnly) return;

      e.preventDefault();
      setDragOverZone(null);

      const itemId = e.dataTransfer.getData('text/plain');
      const sourceZone = dragState.source;

      if (!itemId || !sourceZone || sourceZone === targetZone) {
        return;
      }

      // Move item between zones
      if (targetZone === 'sprint' && onAddToSprint) {
        onAddToSprint(itemId);
      } else if (targetZone === 'backlog' && onRemoveFromSprint) {
        onRemoveFromSprint(itemId);
      }

      setDragState({ itemId: null, source: null });
    },
    [readOnly, dragState, onAddToSprint, onRemoveFromSprint]
  );

  // Render work item card
  const renderItemCard = (
    item: WorkItem, 
    source: 'backlog' | 'sprint',
    onClick?: (itemId: string) => void
  ) => {
    const priorityInfo = getPriorityInfo(item.priority);
    const isDragging = dragState.itemId === item.id;
    // Note: WorkItem type doesn't have story_points or estimated_hours
    // Using priority as a proxy for estimation (1-5 scale)
    const estimate = useStoryPoints 
      ? (item.priority || 0) 
      : (item.priority || 0);

    return (
      <div
        key={item.id}
        className={`planning-card ${isDragging ? 'dragging' : ''}`}
        draggable={!readOnly}
        onDragStart={(e) => handleDragStart(e, item.id, source)}
        onDragEnd={handleDragEnd}
        onClick={() => onClick?.(item.id)}
        role="button"
        tabIndex={0}
        aria-label={`${item.title} - ${estimate} ${useStoryPoints ? 'points' : 'hours'}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(item.id);
          }
        }}
      >
        {/* Priority indicator */}
        {item.priority && (
          <div
            className="card-priority"
            style={{ backgroundColor: priorityInfo.color }}
            title={`Priority: ${priorityInfo.label}`}
          >
            {priorityInfo.label}
          </div>
        )}

        {/* Item title */}
        <h4 className="card-title">{item.title}</h4>

        {/* Item description */}
        {item.description && (
          <p className="card-description">
            {item.description.length > 80
              ? `${item.description.substring(0, 80)}...`
              : item.description}
          </p>
        )}

        {/* Item metadata */}
        <div className="card-footer">
          <span className="card-type">{item.type}</span>
          
          {estimate > 0 && (
            <span className="card-estimate">
              {estimate} {useStoryPoints ? 'pts' : 'hrs'}
            </span>
          )}

          {item.assigned_to && (
            <span className="card-assignee" title={`Assigned to: ${item.assigned_to}`}>
              👤
            </span>
          )}
        </div>
      </div>
    );
  };

  // Format date range
  const formatDateRange = (): string => {
    if (!sprintStartDate || !sprintEndDate) return '';
    
    const start = sprintStartDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const end = sprintEndDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${start} - ${end}`;
  };

  return (
    <div className={`sprint-planning ${className}`}>
      {/* Sprint header */}
      <div className="planning-header">
        <div className="header-info">
          <h2 className="planning-title">{sprintName}</h2>
          {(sprintStartDate || sprintEndDate) && (
            <p className="sprint-dates">{formatDateRange()}</p>
          )}
        </div>

        {/* Capacity metrics */}
        <div className="capacity-metrics">
          <div className="metric">
            <span className="metric-label">Capacity</span>
            <span className="metric-value">
              {sprintCapacity} {useStoryPoints ? 'pts' : 'hrs'}
            </span>
          </div>

          <div className="metric">
            <span className="metric-label">Committed</span>
            <span className="metric-value">
              {sprintCommitment} {useStoryPoints ? 'pts' : 'hrs'}
            </span>
          </div>

          {teamVelocity !== undefined && (
            <div className="metric">
              <span className="metric-label">Avg Velocity</span>
              <span className="metric-value">
                {teamVelocity} {useStoryPoints ? 'pts' : 'hrs'}
              </span>
            </div>
          )}

          <div className="metric">
            <span className="metric-label">Utilization</span>
            <span 
              className="metric-value"
              style={{ color: capacityStatus.color }}
            >
              {capacityUtilization}%
            </span>
          </div>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="capacity-bar-container">
        <div className="capacity-bar">
          <div
            className="capacity-fill"
            style={{
              width: `${Math.min(capacityUtilization, 100)}%`,
              backgroundColor: capacityStatus.color,
            }}
          />
          {capacityUtilization > 100 && (
            <div
              className="capacity-overflow"
              style={{
                width: `${Math.min(capacityUtilization - 100, 100)}%`,
              }}
            />
          )}
        </div>
        <div className="capacity-status" style={{ color: capacityStatus.color }}>
          {capacityStatus.label}
        </div>
      </div>

      {/* Warning message */}
      {capacityStatus.warning && (
        <div className="capacity-warning">
          ⚠️ {capacityStatus.warning}
        </div>
      )}

      {/* Hint */}
      {!readOnly && (
        <div className="planning-hint">
          💡 Drag items from the backlog to the sprint to plan your work
        </div>
      )}

      {/* Planning zones */}
      <div className="planning-zones">
        {/* Backlog zone */}
        <div
          className={`planning-zone backlog-zone ${dragOverZone === 'backlog' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'backlog')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'backlog')}
          role="region"
          aria-label="Product backlog"
        >
          <div className="zone-header">
            <h3 className="zone-title">Product Backlog</h3>
            <span className="zone-count">{backlogItems.length} items</span>
          </div>

          <div className="zone-content">
            {backlogItems.length === 0 ? (
              <div className="zone-empty">
                <p>No items in backlog</p>
              </div>
            ) : (
              backlogItems.map(item => renderItemCard(item, 'backlog', onBacklogItemClick))
            )}
          </div>
        </div>

        {/* Sprint zone */}
        <div
          className={`planning-zone sprint-zone ${dragOverZone === 'sprint' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'sprint')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'sprint')}
          role="region"
          aria-label="Sprint items"
        >
          <div className="zone-header">
            <h3 className="zone-title">Sprint Items</h3>
            <span className="zone-count">{sprintItems.length} items</span>
          </div>

          <div className="zone-content">
            {sprintItems.length === 0 ? (
              <div className="zone-empty">
                <p>No items in sprint</p>
                {!readOnly && <p className="hint">Drag items here to add to sprint</p>}
              </div>
            ) : (
              sprintItems.map(item => renderItemCard(item, 'sprint', onSprintItemClick))
            )}
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .sprint-planning {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .planning-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .header-info {
    flex: 1;
    min-width: 200px;
  }

  .planning-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .sprint-dates {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .capacity-metrics {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .metric-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  .capacity-bar-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .capacity-bar {
    position: relative;
    height: 24px;
    background: #f3f4f6;
    border-radius: 12px;
    overflow: hidden;
  }

  .capacity-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    transition: width 0.3s ease, background-color 0.3s ease;
  }

  .capacity-overflow {
    position: absolute;
    top: 0;
    left: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      45deg,
      #dc2626,
      #dc2626 10px,
      #ef4444 10px,
      #ef4444 20px
    );
    transition: width 0.3s ease;
  }

  .capacity-status {
    font-size: 0.875rem;
    font-weight: 600;
    text-align: center;
  }

  .capacity-warning {
    padding: 0.75rem 1rem;
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    border-radius: 4px;
    font-size: 0.875rem;
    color: #92400e;
  }

  .planning-hint {
    padding: 0.75rem 1rem;
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
    border-radius: 4px;
    font-size: 0.875rem;
    color: #1e40af;
  }

  .planning-zones {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1rem;
    min-height: 500px;
  }

  .planning-zone {
    display: flex;
    flex-direction: column;
    background: #f9fafb;
    border-radius: 8px;
    border: 2px solid #e5e7eb;
    transition: all 0.2s ease;
  }

  .planning-zone.drag-over {
    background: #eff6ff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .backlog-zone .zone-header {
    border-top-color: #94a3b8;
  }

  .sprint-zone .zone-header {
    border-top-color: #3b82f6;
  }

  .zone-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-top: 4px solid;
    border-bottom: 1px solid #e5e7eb;
    background: white;
    border-radius: 6px 6px 0 0;
  }

  .zone-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }

  .zone-count {
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
  }

  .zone-content {
    flex: 1;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
  }

  .zone-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: #9ca3af;
    font-style: italic;
  }

  .zone-empty p {
    margin: 0;
    font-size: 0.875rem;
  }

  .zone-empty .hint {
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }

  .planning-card {
    position: relative;
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .planning-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .planning-card:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .planning-card.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }

  .card-priority {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-title {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    line-height: 1.4;
    padding-right: 4rem;
  }

  .card-description {
    margin: 0 0 0.75rem 0;
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .card-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    padding-top: 0.75rem;
    border-top: 1px solid #f3f4f6;
  }

  .card-type {
    padding: 0.125rem 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-estimate {
    padding: 0.125rem 0.5rem;
    background: #dbeafe;
    color: #1e40af;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
  }

  .card-assignee {
    font-size: 0.875rem;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .sprint-planning {
      padding: 1rem;
    }

    .planning-header {
      flex-direction: column;
    }

    .capacity-metrics {
      width: 100%;
      justify-content: space-between;
    }

    .planning-zones {
      grid-template-columns: 1fr;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .planning-card,
    .planning-zone,
    .capacity-fill,
    .capacity-overflow {
      transition: none;
    }

    .planning-card:hover {
      transform: none;
    }
  }

  /* Print Styles */
  @media print {
    .sprint-planning {
      box-shadow: none;
      border: 1px solid #e5e7eb;
    }

    .planning-hint,
    .capacity-warning {
      display: none;
    }

    .planning-zones {
      display: block;
    }

    .planning-zone {
      page-break-inside: avoid;
      margin-bottom: 1rem;
    }
  }
`;

export default SprintPlanning;

/**
 * SprintPlanning component examples
 * Demonstrates various usage scenarios
 */

import React, { useState } from 'react';
import { SprintPlanning } from './SprintPlanning';
import type { WorkItem } from '../../services/workitemService';

// Mock data
const mockBacklogItems: WorkItem[] = [
  {
    id: '1',
    title: 'Implement user authentication',
    description: 'Add JWT-based authentication with refresh tokens',
    type: 'task',
    status: 'draft',
    priority: 1,
    version: '1.0',
    created_by: 'user-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    is_signed: false,
    estimated_hours: 8,
    story_points: 5,
  },
  {
    id: '2',
    title: 'Design database schema',
    description: 'Create ERD and implement migrations',
    type: 'task',
    status: 'draft',
    priority: 1,
    version: '1.0',
    created_by: 'user-1',
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02'),
    is_signed: false,
    estimated_hours: 12,
    story_points: 8,
  },
  {
    id: '3',
    title: 'Create API documentation',
    description: 'Document all REST endpoints with examples',
    type: 'task',
    status: 'draft',
    priority: 2,
    version: '1.0',
    created_by: 'user-1',
    created_at: new Date('2024-01-03'),
    updated_at: new Date('2024-01-03'),
    is_signed: false,
    estimated_hours: 6,
    story_points: 3,
  },
  {
    id: '4',
    title: 'Setup CI/CD pipeline',
    description: 'Configure GitHub Actions for automated testing and deployment',
    type: 'task',
    status: 'draft',
    priority: 3,
    version: '1.0',
    created_by: 'user-1',
    created_at: new Date('2024-01-04'),
    updated_at: new Date('2024-01-04'),
    is_signed: false,
    estimated_hours: 10,
    story_points: 5,
  },
  {
    id: '5',
    title: 'Write unit tests',
    description: 'Achieve 80% code coverage with unit tests',
    type: 'task',
    status: 'draft',
    priority: 2,
    version: '1.0',
    created_by: 'user-1',
    created_at: new Date('2024-01-05'),
    updated_at: new Date('2024-01-05'),
    is_signed: false,
    estimated_hours: 16,
    story_points: 8,
  },
];

const mockSprintItems: WorkItem[] = [
  {
    id: '6',
    title: 'Setup project structure',
    description: 'Initialize React and FastAPI projects',
    type: 'task',
    status: 'active',
    priority: 1,
    version: '1.0',
    created_by: 'user-1',
    created_at: new Date('2024-01-06'),
    updated_at: new Date('2024-01-06'),
    is_signed: false,
    estimated_hours: 4,
    story_points: 2,
    assigned_to: 'user-1',
  },
];

export function SprintPlanningExamples(): React.ReactElement {
  const [backlog, setBacklog] = useState<WorkItem[]>(mockBacklogItems);
  const [sprint, setSprint] = useState<WorkItem[]>(mockSprintItems);

  const handleAddToSprint = (itemId: string) => {
    const item = backlog.find(i => i.id === itemId);
    if (item) {
      setBacklog(prev => prev.filter(i => i.id !== itemId));
      setSprint(prev => [...prev, { ...item, status: 'active' }]);
    }
  };

  const handleRemoveFromSprint = (itemId: string) => {
    const item = sprint.find(i => i.id === itemId);
    if (item) {
      setSprint(prev => prev.filter(i => i.id !== itemId));
      setBacklog(prev => [...prev, { ...item, status: 'draft' }]);
    }
  };

  const handleItemClick = (itemId: string) => {
    console.log('Item clicked:', itemId);
  };

  return (
    <div style={{ padding: '2rem', background: '#f3f4f6', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '2rem' }}>SprintPlanning Component Examples</h1>

      {/* Example 1: Hour-based planning */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 1: Hour-Based Sprint Planning</h2>
        <p>Sprint planning with hour-based estimation and capacity tracking</p>
        <SprintPlanning
          backlogItems={backlog}
          sprintItems={sprint}
          sprintCapacity={40}
          teamVelocity={35}
          sprintName="Sprint 1"
          sprintStartDate={new Date('2024-02-01')}
          sprintEndDate={new Date('2024-02-14')}
          onAddToSprint={handleAddToSprint}
          onRemoveFromSprint={handleRemoveFromSprint}
          onBacklogItemClick={handleItemClick}
          onSprintItemClick={handleItemClick}
          useStoryPoints={false}
        />
      </section>

      {/* Example 2: Story point-based planning */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 2: Story Point-Based Sprint Planning</h2>
        <p>Sprint planning with story points and velocity tracking</p>
        <SprintPlanning
          backlogItems={backlog}
          sprintItems={sprint}
          sprintCapacity={20}
          teamVelocity={18}
          sprintName="Sprint 2"
          sprintStartDate={new Date('2024-02-15')}
          sprintEndDate={new Date('2024-02-28')}
          onAddToSprint={handleAddToSprint}
          onRemoveFromSprint={handleRemoveFromSprint}
          onBacklogItemClick={handleItemClick}
          onSprintItemClick={handleItemClick}
          useStoryPoints={true}
        />
      </section>

      {/* Example 3: Read-only mode */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 3: Read-Only Sprint View</h2>
        <p>View sprint plan without drag-and-drop editing</p>
        <SprintPlanning
          backlogItems={backlog}
          sprintItems={sprint}
          sprintCapacity={40}
          sprintName="Sprint 1 (Locked)"
          readOnly={true}
          useStoryPoints={false}
        />
      </section>

      {/* Example 4: Over capacity warning */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 4: Over Capacity Sprint</h2>
        <p>Sprint with too many items committed</p>
        <SprintPlanning
          backlogItems={[]}
          sprintItems={mockBacklogItems}
          sprintCapacity={30}
          teamVelocity={28}
          sprintName="Sprint 3 (Over Capacity)"
          useStoryPoints={false}
        />
      </section>

      {/* Example 5: Empty sprint */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>Example 5: Empty Sprint</h2>
        <p>New sprint with no items committed yet</p>
        <SprintPlanning
          backlogItems={mockBacklogItems}
          sprintItems={[]}
          sprintCapacity={40}
          sprintName="Sprint 4"
          sprintStartDate={new Date('2024-03-01')}
          sprintEndDate={new Date('2024-03-14')}
          onAddToSprint={handleAddToSprint}
          onRemoveFromSprint={handleRemoveFromSprint}
          useStoryPoints={false}
        />
      </section>
    </div>
  );
}

export default SprintPlanningExamples;

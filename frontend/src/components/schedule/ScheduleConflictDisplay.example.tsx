/**
 * Example usage of ScheduleConflictDisplay component
 * Demonstrates various conflict scenarios
 */

import React, { useState } from 'react';
import { ScheduleConflictDisplay } from './ScheduleConflictDisplay';
import type { ScheduledTask, Resource } from '../../services/scheduleService';
import type { TaskDependency, ScheduleConflict } from './ScheduleConflictDisplay';

export function ScheduleConflictDisplayExample(): React.ReactElement {
  const [selectedScenario, setSelectedScenario] = useState<string>('overlap');

  // Sample resources
  const resources: Resource[] = [
    { id: 'dev1', name: 'Alice (Developer)', type: 'developer', capacity: 160 },
    { id: 'dev2', name: 'Bob (Developer)', type: 'developer', capacity: 160 },
    { id: 'designer1', name: 'Carol (Designer)', type: 'designer', capacity: 120 },
  ];

  // Scenario 1: Resource Overlap
  const overlapTasks: ScheduledTask[] = [
    {
      task_id: 'task1',
      task_title: 'Implement Authentication',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-10T00:00:00Z',
      duration_hours: 80,
      assigned_resources: ['dev1'],
    },
    {
      task_id: 'task2',
      task_title: 'Build API Endpoints',
      start_date: '2024-01-05T00:00:00Z',
      end_date: '2024-01-15T00:00:00Z',
      duration_hours: 80,
      assigned_resources: ['dev1'],
    },
  ];

  // Scenario 2: Resource Over-allocation
  const overallocationTasks: ScheduledTask[] = [
    {
      task_id: 'task1',
      task_title: 'Frontend Development',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-15T00:00:00Z',
      duration_hours: 100,
      assigned_resources: ['dev1'],
    },
    {
      task_id: 'task2',
      task_title: 'Backend Development',
      start_date: '2024-01-16T00:00:00Z',
      end_date: '2024-01-31T00:00:00Z',
      duration_hours: 120,
      assigned_resources: ['dev1'],
    },
  ];

  // Scenario 3: Dependency Violations
  const dependencyViolationTasks: ScheduledTask[] = [
    {
      task_id: 'task1',
      task_title: 'Design Database Schema',
      start_date: '2024-01-10T00:00:00Z',
      end_date: '2024-01-15T00:00:00Z',
      duration_hours: 40,
      assigned_resources: ['dev1'],
    },
    {
      task_id: 'task2',
      task_title: 'Implement Database Models',
      start_date: '2024-01-12T00:00:00Z',
      end_date: '2024-01-20T00:00:00Z',
      duration_hours: 60,
      assigned_resources: ['dev2'],
    },
  ];

  const dependencyViolationDeps: TaskDependency[] = [
    {
      from_task_id: 'task1',
      to_task_id: 'task2',
      type: 'finish-to-start',
    },
  ];

  // Scenario 4: Circular Dependencies
  const circularTasks: ScheduledTask[] = [
    {
      task_id: 'task1',
      task_title: 'Module A',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-10T00:00:00Z',
      duration_hours: 40,
      assigned_resources: ['dev1'],
    },
    {
      task_id: 'task2',
      task_title: 'Module B',
      start_date: '2024-01-11T00:00:00Z',
      end_date: '2024-01-20T00:00:00Z',
      duration_hours: 40,
      assigned_resources: ['dev2'],
    },
    {
      task_id: 'task3',
      task_title: 'Module C',
      start_date: '2024-01-21T00:00:00Z',
      end_date: '2024-01-30T00:00:00Z',
      duration_hours: 40,
      assigned_resources: ['dev1'],
    },
  ];

  const circularDeps: TaskDependency[] = [
    { from_task_id: 'task1', to_task_id: 'task2', type: 'finish-to-start' },
    { from_task_id: 'task2', to_task_id: 'task3', type: 'finish-to-start' },
    { from_task_id: 'task3', to_task_id: 'task1', type: 'finish-to-start' },
  ];

  // Scenario 5: No Conflicts
  const noConflictTasks: ScheduledTask[] = [
    {
      task_id: 'task1',
      task_title: 'Design Phase',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-10T00:00:00Z',
      duration_hours: 40,
      assigned_resources: ['designer1'],
    },
    {
      task_id: 'task2',
      task_title: 'Development Phase',
      start_date: '2024-01-11T00:00:00Z',
      end_date: '2024-01-25T00:00:00Z',
      duration_hours: 80,
      assigned_resources: ['dev1'],
    },
    {
      task_id: 'task3',
      task_title: 'Testing Phase',
      start_date: '2024-01-26T00:00:00Z',
      end_date: '2024-01-31T00:00:00Z',
      duration_hours: 40,
      assigned_resources: ['dev2'],
    },
  ];

  const noConflictDeps: TaskDependency[] = [
    { from_task_id: 'task1', to_task_id: 'task2', type: 'finish-to-start' },
    { from_task_id: 'task2', to_task_id: 'task3', type: 'finish-to-start' },
  ];

  // Scenario 6: Mixed Conflicts
  const mixedTasks: ScheduledTask[] = [
    {
      task_id: 'task1',
      task_title: 'UI Design',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-10T00:00:00Z',
      duration_hours: 60,
      assigned_resources: ['designer1'],
    },
    {
      task_id: 'task2',
      task_title: 'Frontend Implementation',
      start_date: '2024-01-08T00:00:00Z',
      end_date: '2024-01-20T00:00:00Z',
      duration_hours: 100,
      assigned_resources: ['dev1'],
    },
    {
      task_id: 'task3',
      task_title: 'Backend API',
      start_date: '2024-01-15T00:00:00Z',
      end_date: '2024-01-25T00:00:00Z',
      duration_hours: 80,
      assigned_resources: ['dev1'],
    },
    {
      task_id: 'task4',
      task_title: 'Integration Testing',
      start_date: '2024-01-22T00:00:00Z',
      end_date: '2024-01-31T00:00:00Z',
      duration_hours: 60,
      assigned_resources: ['dev2'],
    },
  ];

  const mixedDeps: TaskDependency[] = [
    { from_task_id: 'task1', to_task_id: 'task2', type: 'finish-to-start' },
    { from_task_id: 'task2', to_task_id: 'task4', type: 'finish-to-start' },
    { from_task_id: 'task3', to_task_id: 'task4', type: 'finish-to-start' },
  ];

  const scenarios = {
    overlap: {
      title: 'Resource Overlap',
      description: 'Two tasks assigned to the same resource with overlapping time periods',
      tasks: overlapTasks,
      dependencies: [],
    },
    overallocation: {
      title: 'Resource Over-allocation',
      description: 'Resource allocated beyond capacity',
      tasks: overallocationTasks,
      dependencies: [],
    },
    dependency: {
      title: 'Dependency Violation',
      description: 'Task starts before its predecessor finishes',
      tasks: dependencyViolationTasks,
      dependencies: dependencyViolationDeps,
    },
    circular: {
      title: 'Circular Dependencies',
      description: 'Tasks form a circular dependency chain',
      tasks: circularTasks,
      dependencies: circularDeps,
    },
    noConflict: {
      title: 'No Conflicts',
      description: 'Well-planned schedule with no conflicts',
      tasks: noConflictTasks,
      dependencies: noConflictDeps,
    },
    mixed: {
      title: 'Mixed Conflicts',
      description: 'Multiple types of conflicts in one schedule',
      tasks: mixedTasks,
      dependencies: mixedDeps,
    },
  };

  const currentScenario = scenarios[selectedScenario as keyof typeof scenarios];

  const handleConflictClick = (conflict: ScheduleConflict) => {
    console.log('Conflict clicked:', conflict);
    alert(`Conflict Details:\n\nType: ${conflict.type}\nSeverity: ${conflict.severity}\nTitle: ${conflict.title}\n\nAffected Tasks: ${conflict.affectedTasks.join(', ')}`);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Schedule Conflict Display Examples</h1>
      <p style={{ marginBottom: '2rem', color: '#6b7280' }}>
        Explore different conflict scenarios and see how they are detected and displayed.
      </p>

      <div style={{ marginBottom: '2rem' }}>
        <label
          htmlFor="scenario-select"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 600,
            color: '#374151',
          }}
        >
          Select Scenario:
        </label>
        <select
          id="scenario-select"
          value={selectedScenario}
          onChange={e => setSelectedScenario(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '1rem',
            width: '100%',
            maxWidth: '400px',
          }}
        >
          {Object.entries(scenarios).map(([key, scenario]) => (
            <option key={key} value={key}>
              {scenario.title}
            </option>
          ))}
        </select>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
          {currentScenario.description}
        </p>
      </div>

      <ScheduleConflictDisplay
        tasks={currentScenario.tasks}
        resources={resources}
        dependencies={currentScenario.dependencies}
        onConflictClick={handleConflictClick}
      />

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
        <h3 style={{ marginTop: 0 }}>About This Example</h3>
        <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>
          This example demonstrates the ScheduleConflictDisplay component with various conflict scenarios:
        </p>
        <ul style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>
          <li><strong>Resource Overlap:</strong> Detects when the same resource is assigned to overlapping tasks</li>
          <li><strong>Resource Over-allocation:</strong> Identifies when resources are allocated beyond their capacity</li>
          <li><strong>Dependency Violation:</strong> Catches tasks that violate dependency constraints</li>
          <li><strong>Circular Dependencies:</strong> Finds circular dependency chains that make scheduling impossible</li>
          <li><strong>No Conflicts:</strong> Shows the success state when everything is properly scheduled</li>
          <li><strong>Mixed Conflicts:</strong> Demonstrates multiple conflict types in a single schedule</li>
        </ul>
        <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: 0 }}>
          Click on conflicts to expand details and see suggestions for resolution.
        </p>
      </div>
    </div>
  );
}

export default ScheduleConflictDisplayExample;

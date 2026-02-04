/**
 * ResourceAllocation component examples
 * Demonstrates various usage scenarios
 */

import React from 'react';
import { ResourceAllocation } from './ResourceAllocation';
import type { ScheduledTask, Resource } from '../../services/scheduleService';

export function ResourceAllocationExamples(): React.ReactElement {
  // Example resources
  const resources: Resource[] = [
    {
      id: 'dev-1',
      name: 'Alice Johnson',
      type: 'Developer',
      capacity: 160, // hours per month
      availability: 1.0,
    },
    {
      id: 'dev-2',
      name: 'Bob Smith',
      type: 'Developer',
      capacity: 160,
      availability: 1.0,
    },
    {
      id: 'dev-3',
      name: 'Carol Williams',
      type: 'Developer',
      capacity: 160,
      availability: 0.8,
    },
    {
      id: 'qa-1',
      name: 'David Brown',
      type: 'QA Engineer',
      capacity: 160,
      availability: 1.0,
    },
    {
      id: 'qa-2',
      name: 'Emma Davis',
      type: 'QA Engineer',
      capacity: 160,
      availability: 1.0,
    },
    {
      id: 'pm-1',
      name: 'Frank Miller',
      type: 'Project Manager',
      capacity: 160,
      availability: 1.0,
    },
    {
      id: 'arch-1',
      name: 'Grace Wilson',
      type: 'Architect',
      capacity: 160,
      availability: 1.0,
    },
    {
      id: 'devops-1',
      name: 'Henry Moore',
      type: 'DevOps',
      capacity: 160,
      availability: 1.0,
    },
  ];

  // Example 1: Balanced allocation
  const balancedTasks: ScheduledTask[] = [
    {
      task_id: 'req-1',
      task_title: 'Requirements Gathering',
      start_date: '2024-01-01',
      end_date: '2024-01-10',
      duration_hours: 80,
      assigned_resources: ['pm-1'],
    },
    {
      task_id: 'design-1',
      task_title: 'System Design',
      start_date: '2024-01-11',
      end_date: '2024-01-20',
      duration_hours: 80,
      assigned_resources: ['arch-1'],
    },
    {
      task_id: 'dev-1',
      task_title: 'Backend Development',
      start_date: '2024-01-21',
      end_date: '2024-02-10',
      duration_hours: 120,
      assigned_resources: ['dev-1', 'dev-2'],
    },
    {
      task_id: 'dev-2',
      task_title: 'Frontend Development',
      start_date: '2024-01-21',
      end_date: '2024-02-10',
      duration_hours: 120,
      assigned_resources: ['dev-3'],
    },
    {
      task_id: 'test-1',
      task_title: 'Integration Testing',
      start_date: '2024-02-11',
      end_date: '2024-02-20',
      duration_hours: 80,
      assigned_resources: ['qa-1', 'qa-2'],
    },
    {
      task_id: 'deploy-1',
      task_title: 'Deployment',
      start_date: '2024-02-21',
      end_date: '2024-02-25',
      duration_hours: 40,
      assigned_resources: ['devops-1'],
    },
  ];

  // Example 2: Over-allocated resources
  const overAllocatedTasks: ScheduledTask[] = [
    {
      task_id: 'task-a',
      task_title: 'Feature A Development',
      start_date: '2024-03-01',
      end_date: '2024-03-15',
      duration_hours: 120,
      assigned_resources: ['dev-1'],
    },
    {
      task_id: 'task-b',
      task_title: 'Feature B Development',
      start_date: '2024-03-05',
      end_date: '2024-03-20',
      duration_hours: 100,
      assigned_resources: ['dev-1'], // Over-allocated!
    },
    {
      task_id: 'task-c',
      task_title: 'Bug Fixes',
      start_date: '2024-03-10',
      end_date: '2024-03-25',
      duration_hours: 80,
      assigned_resources: ['dev-1'], // Over-allocated!
    },
    {
      task_id: 'task-d',
      task_title: 'Code Review',
      start_date: '2024-03-01',
      end_date: '2024-03-10',
      duration_hours: 40,
      assigned_resources: ['dev-2'],
    },
    {
      task_id: 'task-e',
      task_title: 'Testing',
      start_date: '2024-03-15',
      end_date: '2024-03-30',
      duration_hours: 120,
      assigned_resources: ['qa-1'],
    },
  ];

  // Example 3: Multiple resource types
  const multiTypeTasks: ScheduledTask[] = [
    {
      task_id: 'sprint-1',
      task_title: 'Sprint Planning',
      start_date: '2024-04-01',
      end_date: '2024-04-02',
      duration_hours: 16,
      assigned_resources: ['pm-1', 'dev-1', 'dev-2', 'qa-1'],
    },
    {
      task_id: 'dev-task-1',
      task_title: 'User Authentication',
      start_date: '2024-04-03',
      end_date: '2024-04-10',
      duration_hours: 60,
      assigned_resources: ['dev-1'],
    },
    {
      task_id: 'dev-task-2',
      task_title: 'Dashboard UI',
      start_date: '2024-04-03',
      end_date: '2024-04-12',
      duration_hours: 70,
      assigned_resources: ['dev-2'],
    },
    {
      task_id: 'qa-task-1',
      task_title: 'Test Plan Creation',
      start_date: '2024-04-05',
      end_date: '2024-04-08',
      duration_hours: 30,
      assigned_resources: ['qa-1'],
    },
    {
      task_id: 'qa-task-2',
      task_title: 'Automated Tests',
      start_date: '2024-04-11',
      end_date: '2024-04-18',
      duration_hours: 60,
      assigned_resources: ['qa-1', 'qa-2'],
    },
    {
      task_id: 'infra-task-1',
      task_title: 'CI/CD Setup',
      start_date: '2024-04-03',
      end_date: '2024-04-07',
      duration_hours: 40,
      assigned_resources: ['devops-1'],
    },
  ];

  // Example 4: Parallel workstreams
  const parallelTasks: ScheduledTask[] = [
    // Workstream 1: Backend
    {
      task_id: 'be-1',
      task_title: 'API Design',
      start_date: '2024-05-01',
      end_date: '2024-05-05',
      duration_hours: 40,
      assigned_resources: ['arch-1', 'dev-1'],
    },
    {
      task_id: 'be-2',
      task_title: 'Database Schema',
      start_date: '2024-05-06',
      end_date: '2024-05-10',
      duration_hours: 40,
      assigned_resources: ['dev-1'],
    },
    {
      task_id: 'be-3',
      task_title: 'API Implementation',
      start_date: '2024-05-11',
      end_date: '2024-05-25',
      duration_hours: 120,
      assigned_resources: ['dev-1', 'dev-2'],
    },
    // Workstream 2: Frontend
    {
      task_id: 'fe-1',
      task_title: 'UI Design',
      start_date: '2024-05-01',
      end_date: '2024-05-07',
      duration_hours: 50,
      assigned_resources: ['dev-3'],
    },
    {
      task_id: 'fe-2',
      task_title: 'Component Library',
      start_date: '2024-05-08',
      end_date: '2024-05-15',
      duration_hours: 60,
      assigned_resources: ['dev-3'],
    },
    {
      task_id: 'fe-3',
      task_title: 'Page Implementation',
      start_date: '2024-05-16',
      end_date: '2024-05-30',
      duration_hours: 120,
      assigned_resources: ['dev-3'],
    },
    // Workstream 3: Testing
    {
      task_id: 'test-1',
      task_title: 'Test Strategy',
      start_date: '2024-05-01',
      end_date: '2024-05-03',
      duration_hours: 20,
      assigned_resources: ['qa-1'],
    },
    {
      task_id: 'test-2',
      task_title: 'Unit Tests',
      start_date: '2024-05-11',
      end_date: '2024-05-20',
      duration_hours: 80,
      assigned_resources: ['qa-1', 'qa-2'],
    },
    {
      task_id: 'test-3',
      task_title: 'Integration Tests',
      start_date: '2024-05-21',
      end_date: '2024-05-31',
      duration_hours: 90,
      assigned_resources: ['qa-1', 'qa-2'],
    },
  ];

  // Event handlers
  const handleResourceClick = (resourceId: string) => {
    console.log('Resource clicked:', resourceId);
    alert(`Resource clicked: ${resourceId}`);
  };

  const handleTaskClick = (taskId: string) => {
    console.log('Task clicked:', taskId);
    alert(`Task clicked: ${taskId}`);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <h1 style={{ marginBottom: '1rem' }}>ResourceAllocation Component Examples</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Interactive examples demonstrating various features of the ResourceAllocation component.
        </p>
      </div>

      {/* Example 1: Balanced allocation */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 1: Balanced Resource Allocation</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Well-balanced project with resources allocated within their capacity.
        </p>
        <ResourceAllocation
          tasks={balancedTasks}
          resources={resources}
          onResourceClick={handleResourceClick}
          onTaskClick={handleTaskClick}
          showWarnings={true}
          height={500}
        />
      </section>

      {/* Example 2: Over-allocated resources */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 2: Over-Allocated Resources</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Demonstrates warning indicators when resources are over-allocated.
        </p>
        <ResourceAllocation
          tasks={overAllocatedTasks}
          resources={resources}
          onResourceClick={handleResourceClick}
          onTaskClick={handleTaskClick}
          showWarnings={true}
          height={400}
        />
      </section>

      {/* Example 3: Filter by resource type */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 3: Multiple Resource Types</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Project with different resource types. Use the filter to view specific types.
        </p>
        <ResourceAllocation
          tasks={multiTypeTasks}
          resources={resources}
          onResourceClick={handleResourceClick}
          onTaskClick={handleTaskClick}
          showWarnings={true}
          height={500}
        />
      </section>

      {/* Example 4: Parallel workstreams */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 4: Parallel Workstreams</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Complex project with multiple parallel workstreams and resource sharing.
        </p>
        <ResourceAllocation
          tasks={parallelTasks}
          resources={resources}
          onResourceClick={handleResourceClick}
          onTaskClick={handleTaskClick}
          showWarnings={true}
          height={600}
        />
      </section>

      {/* Example 5: Filtered by Developer type */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 5: Developers Only</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          View showing only Developer resources.
        </p>
        <ResourceAllocation
          tasks={balancedTasks}
          resources={resources}
          resourceTypeFilter="Developer"
          showWarnings={true}
          height={400}
        />
      </section>

      {/* Example 6: Without warnings */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 6: Clean View (No Warnings)</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Allocation view with warning indicators disabled.
        </p>
        <ResourceAllocation
          tasks={overAllocatedTasks}
          resources={resources}
          showWarnings={false}
          height={400}
        />
      </section>

      {/* Example 7: Empty state */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 7: Empty State</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          How the component appears when no resources are available.
        </p>
        <ResourceAllocation
          tasks={balancedTasks}
          resources={[]}
        />
      </section>

      {/* Example 8: Custom height */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 8: Compact View</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Reduced height for dashboard widgets or embedded views.
        </p>
        <ResourceAllocation
          tasks={balancedTasks}
          resources={resources.slice(0, 3)}
          height={300}
        />
      </section>

      {/* Usage instructions */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Usage Instructions</h2>
        <ul style={{ color: '#374151', lineHeight: '1.8' }}>
          <li><strong>Resource Details:</strong> Click on resource names to view detailed information</li>
          <li><strong>Task Details:</strong> Hover over allocation bars to see task information</li>
          <li><strong>Filter Resources:</strong> Use the dropdown to filter by resource type</li>
          <li><strong>Over-Allocation:</strong> Red indicators show resources that are over-allocated</li>
          <li><strong>Utilization:</strong> Percentage shows how much of each resource's capacity is used</li>
          <li><strong>Timeline:</strong> Horizontal bars show when tasks are scheduled</li>
          <li><strong>Statistics:</strong> Summary panel shows overall allocation metrics</li>
        </ul>
      </section>

      {/* Integration example */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0f9ff', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Integration Example</h2>
        <pre style={{ 
          background: '#1e293b', 
          color: '#e2e8f0', 
          padding: '1rem', 
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '0.875rem',
        }}>
{`import { ResourceAllocation } from './components/schedule/ResourceAllocation';
import { scheduleService } from './services/scheduleService';

function ResourceManagementPage() {
  const [tasks, setTasks] = useState([]);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    async function loadData() {
      // Load scheduled tasks
      const scheduleResult = await scheduleService.getSchedule('project-123');
      setTasks(scheduleResult.schedule || []);
      
      // Load resources
      const resourceList = await scheduleService.getResources();
      setResources(resourceList);
    }
    loadData();
  }, []);

  const handleResourceClick = (resourceId) => {
    // Navigate to resource details or open modal
    console.log('Resource clicked:', resourceId);
  };

  const handleTaskClick = (taskId) => {
    // Navigate to task details or open modal
    console.log('Task clicked:', taskId);
  };

  return (
    <ResourceAllocation
      tasks={tasks}
      resources={resources}
      onResourceClick={handleResourceClick}
      onTaskClick={handleTaskClick}
      showWarnings={true}
      height={600}
    />
  );
}`}
        </pre>
      </section>

      {/* Best practices */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: '#fef3c7', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Best Practices</h2>
        <ul style={{ color: '#374151', lineHeight: '1.8' }}>
          <li><strong>Monitor Over-Allocation:</strong> Regularly check for over-allocated resources and rebalance workload</li>
          <li><strong>Resource Capacity:</strong> Keep resource capacity data up-to-date to ensure accurate allocation</li>
          <li><strong>Task Duration:</strong> Provide realistic task duration estimates for better planning</li>
          <li><strong>Resource Types:</strong> Use consistent resource type naming for effective filtering</li>
          <li><strong>Parallel Tasks:</strong> Consider resource availability when scheduling parallel tasks</li>
          <li><strong>Buffer Time:</strong> Leave some buffer capacity for unexpected work or delays</li>
        </ul>
      </section>
    </div>
  );
}

export default ResourceAllocationExamples;

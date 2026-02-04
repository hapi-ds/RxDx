/**
 * GanttChart component examples
 * Demonstrates various usage scenarios
 */

import React from 'react';
import { GanttChart, type TaskDependency } from './GanttChart';
import type { ScheduledTask } from '../../services/scheduleService';

export function GanttChartExamples(): React.ReactElement {
  // Example 1: Basic project schedule
  const basicTasks: ScheduledTask[] = [
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
      duration_hours: 160,
      assigned_resources: ['dev-1', 'dev-2'],
    },
    {
      task_id: 'dev-2',
      task_title: 'Frontend Development',
      start_date: '2024-01-21',
      end_date: '2024-02-10',
      duration_hours: 160,
      assigned_resources: ['dev-3', 'dev-4'],
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

  const basicDependencies: TaskDependency[] = [
    { from_task_id: 'req-1', to_task_id: 'design-1', type: 'finish-to-start' },
    { from_task_id: 'design-1', to_task_id: 'dev-1', type: 'finish-to-start' },
    { from_task_id: 'design-1', to_task_id: 'dev-2', type: 'finish-to-start' },
    { from_task_id: 'dev-1', to_task_id: 'test-1', type: 'finish-to-start' },
    { from_task_id: 'dev-2', to_task_id: 'test-1', type: 'finish-to-start' },
    { from_task_id: 'test-1', to_task_id: 'deploy-1', type: 'finish-to-start' },
  ];

  const basicCriticalPath = ['req-1', 'design-1', 'dev-1', 'test-1', 'deploy-1'];

  // Example 2: Parallel tasks with different dependency types
  const parallelTasks: ScheduledTask[] = [
    {
      task_id: 'task-a',
      task_title: 'Task A - Foundation',
      start_date: '2024-03-01',
      end_date: '2024-03-05',
      duration_hours: 40,
    },
    {
      task_id: 'task-b',
      task_title: 'Task B - Parallel Work',
      start_date: '2024-03-01',
      end_date: '2024-03-08',
      duration_hours: 64,
    },
    {
      task_id: 'task-c',
      task_title: 'Task C - Dependent',
      start_date: '2024-03-06',
      end_date: '2024-03-10',
      duration_hours: 40,
    },
    {
      task_id: 'task-d',
      task_title: 'Task D - Final',
      start_date: '2024-03-09',
      end_date: '2024-03-12',
      duration_hours: 32,
    },
  ];

  const parallelDependencies: TaskDependency[] = [
    { from_task_id: 'task-a', to_task_id: 'task-b', type: 'start-to-start' },
    { from_task_id: 'task-a', to_task_id: 'task-c', type: 'finish-to-start' },
    { from_task_id: 'task-b', to_task_id: 'task-d', type: 'finish-to-finish' },
  ];

  // Example 3: Simple schedule without dependencies
  const simpleTasks: ScheduledTask[] = [
    {
      task_id: 'simple-1',
      task_title: 'Research Phase',
      start_date: '2024-04-01',
      end_date: '2024-04-07',
      duration_hours: 56,
    },
    {
      task_id: 'simple-2',
      task_title: 'Prototyping',
      start_date: '2024-04-08',
      end_date: '2024-04-14',
      duration_hours: 56,
    },
    {
      task_id: 'simple-3',
      task_title: 'Documentation',
      start_date: '2024-04-15',
      end_date: '2024-04-21',
      duration_hours: 56,
    },
  ];

  // Example 4: Complex project with many tasks
  const complexTasks: ScheduledTask[] = Array.from({ length: 15 }, (_, i) => {
    const startDay = 1 + Math.floor(i / 3) * 5;
    const endDay = startDay + 4;
    return {
      task_id: `complex-${i + 1}`,
      task_title: `Task ${i + 1}: ${['Planning', 'Execution', 'Review'][i % 3]}`,
      start_date: `2024-05-${String(startDay).padStart(2, '0')}`,
      end_date: `2024-05-${String(endDay).padStart(2, '0')}`,
      duration_hours: 40,
    };
  });

  const complexDependencies: TaskDependency[] = Array.from({ length: 12 }, (_, i) => ({
    from_task_id: `complex-${i + 1}`,
    to_task_id: `complex-${i + 4}`,
    type: 'finish-to-start' as const,
  }));

  const complexCriticalPath = ['complex-1', 'complex-4', 'complex-7', 'complex-10', 'complex-13'];

  // Event handlers
  const handleTaskClick = (taskId: string) => {
    console.log('Task clicked:', taskId);
    alert(`Task clicked: ${taskId}`);
  };

  const handleTaskHover = (taskId: string | null) => {
    console.log('Task hovered:', taskId);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <h1 style={{ marginBottom: '1rem' }}>GanttChart Component Examples</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Interactive examples demonstrating various features of the GanttChart component.
        </p>
      </div>

      {/* Example 1: Full-featured Gantt chart */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 1: Full-Featured Project Schedule</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Complete project schedule with dependencies, critical path, and all features enabled.
        </p>
        <GanttChart
          tasks={basicTasks}
          dependencies={basicDependencies}
          criticalPath={basicCriticalPath}
          onTaskClick={handleTaskClick}
          onTaskHover={handleTaskHover}
          showCriticalPath={true}
          showDependencies={true}
          showToday={true}
          height={500}
        />
      </section>

      {/* Example 2: Parallel tasks with different dependency types */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 2: Parallel Tasks with Various Dependencies</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Demonstrates start-to-start, finish-to-start, and finish-to-finish dependencies.
        </p>
        <GanttChart
          tasks={parallelTasks}
          dependencies={parallelDependencies}
          showCriticalPath={false}
          showDependencies={true}
          showToday={false}
          height={400}
        />
      </section>

      {/* Example 3: Simple schedule without dependencies */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 3: Simple Sequential Schedule</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Basic timeline view without dependencies or critical path.
        </p>
        <GanttChart
          tasks={simpleTasks}
          showCriticalPath={false}
          showDependencies={false}
          showToday={false}
          height={350}
        />
      </section>

      {/* Example 4: Complex project */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 4: Complex Project with Many Tasks</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Large project with multiple parallel workstreams and dependencies.
        </p>
        <GanttChart
          tasks={complexTasks}
          dependencies={complexDependencies}
          criticalPath={complexCriticalPath}
          showCriticalPath={true}
          showDependencies={true}
          showToday={false}
          height={600}
        />
      </section>

      {/* Example 5: Empty state */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 5: Empty State</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          How the component appears when no tasks are provided.
        </p>
        <GanttChart tasks={[]} />
      </section>

      {/* Example 6: Custom height */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Example 6: Custom Height</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Compact view with reduced height for dashboard widgets.
        </p>
        <GanttChart
          tasks={simpleTasks}
          showCriticalPath={false}
          showDependencies={false}
          height={250}
        />
      </section>

      {/* Usage instructions */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Usage Instructions</h2>
        <ul style={{ color: '#374151', lineHeight: '1.8' }}>
          <li><strong>Zoom:</strong> Use the +/- buttons or Ctrl+Scroll to zoom in/out</li>
          <li><strong>Pan:</strong> Hold Shift and drag to pan the view</li>
          <li><strong>Task Details:</strong> Hover over tasks to see detailed information</li>
          <li><strong>Interactions:</strong> Click tasks to trigger custom actions</li>
          <li><strong>Critical Path:</strong> Red bars indicate tasks on the critical path</li>
          <li><strong>Dependencies:</strong> Arrows show task dependencies and their types</li>
          <li><strong>Today Line:</strong> Red dashed line indicates the current date</li>
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
{`import { GanttChart } from './components/schedule/GanttChart';
import { scheduleService } from './services/scheduleService';

function SchedulePage() {
  const [tasks, setTasks] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [criticalPath, setCriticalPath] = useState([]);

  useEffect(() => {
    async function loadSchedule() {
      const result = await scheduleService.getSchedule('project-123');
      setTasks(result.schedule || []);
      
      // Load dependencies and critical path from your API
      const stats = await scheduleService.getStatistics('project-123');
      setCriticalPath(stats.critical_path_tasks || []);
    }
    loadSchedule();
  }, []);

  const handleTaskClick = (taskId) => {
    // Navigate to task details or open modal
    console.log('Task clicked:', taskId);
  };

  return (
    <GanttChart
      tasks={tasks}
      dependencies={dependencies}
      criticalPath={criticalPath}
      onTaskClick={handleTaskClick}
      showCriticalPath={true}
      showDependencies={true}
      showToday={true}
      height={600}
    />
  );
}`}
        </pre>
      </section>
    </div>
  );
}

export default GanttChartExamples;

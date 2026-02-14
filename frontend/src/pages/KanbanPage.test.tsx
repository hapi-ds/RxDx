/**
 * KanbanPage component tests
 * Tests sprint filtering, backlog management, and schedule integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { KanbanPage } from './KanbanPage';
import { sprintService } from '../services/sprintService';
import { backlogService } from '../services/backlogService';
import { workitemService } from '../services/workitemService';

// Mock services
vi.mock('../services/sprintService', () => ({
  sprintService: {
    getSprints: vi.fn(),
    getSprintTasks: vi.fn(),
    assignTaskToSprint: vi.fn(),
    removeTaskFromSprint: vi.fn(),
  },
}));

vi.mock('../services/backlogService', () => ({
  backlogService: {
    getTaskBacklogStatus: vi.fn(),
    getBacklogs: vi.fn(),
    addTaskToBacklog: vi.fn(),
  },
}));

vi.mock('../services/workitemService', () => ({
  workitemService: {
    getWorkItems: vi.fn(),
    updateWorkItem: vi.fn(),
  },
}));

describe('KanbanPage', () => {
  const mockSprints = [
    {
      id: 'sprint-1',
      name: 'Sprint 1',
      goal: 'Complete features',
      start_date: '2024-01-01',
      end_date: '2024-01-14',
      status: 'active' as const,
      project_id: 'project-1',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'sprint-2',
      name: 'Sprint 2',
      goal: 'Bug fixes',
      start_date: '2024-01-15',
      end_date: '2024-01-28',
      status: 'planning' as const,
      project_id: 'project-1',
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockTasks = [
    {
      id: 'task-1',
      type: 'task',
      title: 'Task 1',
      description: 'Description 1',
      status: 'draft',
      priority: 1,
      assigned_to: 'user1',
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      is_signed: false,
    },
    {
      id: 'task-2',
      type: 'task',
      title: 'Task 2',
      description: 'Description 2',
      status: 'active',
      priority: 2,
      assigned_to: 'user2',
      version: '1.0',
      created_by: 'admin',
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      is_signed: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(sprintService.getSprints).mockResolvedValue(mockSprints);
    vi.mocked(sprintService.getSprintTasks).mockResolvedValue([]);
    vi.mocked(workitemService.getWorkItems).mockResolvedValue(mockTasks);
    vi.mocked(backlogService.getTaskBacklogStatus).mockResolvedValue({ in_backlog: false });
  });

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      render(<KanbanPage />);
      expect(screen.getByText('Loading Kanban board...')).toBeInTheDocument();
    });

    it('renders sprint filter dropdown', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Sprint:')).toBeInTheDocument();
      });
      
      const select = screen.getByLabelText('Sprint:') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('all');
    });

    it('renders backlog checkbox filter', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Show backlog tasks only')).toBeInTheDocument();
      });
    });

    it('displays info message about task metadata', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Task cards show: assignee, sprint, estimated hours/)).toBeInTheDocument();
      });
    });
  });

  describe('Sprint Filtering', () => {
    it('loads sprints on mount', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(sprintService.getSprints).toHaveBeenCalled();
      });
    });

    it('displays sprint options in dropdown', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        const select = screen.getByLabelText('Sprint:') as HTMLSelectElement;
        const options = Array.from(select.options).map(opt => opt.text);
        
        expect(options).toContain('Sprint 1 (active)');
        expect(options).toContain('Sprint 2 (planning)');
      });
    });

    it('filters tasks by selected sprint', async () => {
      vi.mocked(sprintService.getSprintTasks).mockResolvedValue([mockTasks[0]]);
      
      render(<KanbanPage />);
      
      await waitFor(() => {
        const select = screen.getByLabelText('Sprint:') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'sprint-1' } });
      });
      
      await waitFor(() => {
        expect(sprintService.getSprintTasks).toHaveBeenCalledWith('sprint-1');
      });
    });

    it('shows all tasks when "All Tasks" is selected', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        const select = screen.getByLabelText('Sprint:') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'all' } });
      });
      
      await waitFor(() => {
        expect(workitemService.getWorkItems).toHaveBeenCalled();
      });
    });

    it('shows only backlog tasks when "Backlog Only" is selected', async () => {
      vi.mocked(backlogService.getTaskBacklogStatus).mockResolvedValue({ in_backlog: true });
      
      render(<KanbanPage />);
      
      await waitFor(() => {
        const select = screen.getByLabelText('Sprint:') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'backlog' } });
      });
      
      await waitFor(() => {
        expect(backlogService.getTaskBacklogStatus).toHaveBeenCalled();
      });
    });
  });

  describe('Backlog Filtering', () => {
    it('filters tasks when backlog checkbox is checked', async () => {
      vi.mocked(backlogService.getTaskBacklogStatus).mockResolvedValue({ in_backlog: true });
      
      render(<KanbanPage />);
      
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
      });
      
      await waitFor(() => {
        expect(backlogService.getTaskBacklogStatus).toHaveBeenCalled();
      });
    });
  });

  describe('Task Actions', () => {
    it('shows quick actions section when tasks are loaded', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });
    });

    it('shows Move to Sprint button', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Move to Sprint')).toBeInTheDocument();
      });
    });

    it('shows Return to Backlog button', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Return to Backlog')).toBeInTheDocument();
      });
    });

    it('disables Move to Sprint button when no sprints available', async () => {
      vi.mocked(sprintService.getSprints).mockResolvedValue([]);
      
      render(<KanbanPage />);
      
      await waitFor(() => {
        const button = screen.getByText('Move to Sprint') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
      });
    });

    it('enables Move to Sprint button when sprints are available', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        const button = screen.getByText('Move to Sprint') as HTMLButtonElement;
        expect(button.disabled).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when loading fails', async () => {
      vi.mocked(workitemService.getWorkItems).mockRejectedValue(new Error('Failed to load'));
      
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      vi.mocked(workitemService.getWorkItems).mockRejectedValue(new Error('Failed to load'));
      
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('retries loading when retry button is clicked', async () => {
      vi.mocked(workitemService.getWorkItems)
        .mockRejectedValueOnce(new Error('Failed to load'))
        .mockResolvedValueOnce(mockTasks);
      
      render(<KanbanPage />);
      
      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);
      });
      
      await waitFor(() => {
        expect(workitemService.getWorkItems).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Task Metadata Display', () => {
    it('enriches tasks with sprint information', async () => {
      vi.mocked(sprintService.getSprintTasks).mockResolvedValue([mockTasks[0]]);
      
      render(<KanbanPage />);
      
      await waitFor(() => {
        const select = screen.getByLabelText('Sprint:') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'sprint-1' } });
      });
      
      await waitFor(() => {
        expect(sprintService.getSprintTasks).toHaveBeenCalledWith('sprint-1');
      });
    });

    it('enriches tasks with backlog status', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(backlogService.getTaskBacklogStatus).toHaveBeenCalled();
      });
    });
  });

  describe('Schedule Dates', () => {
    it('does not display schedule dates on task cards', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(screen.queryByText(/start_date/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/due_date/i)).not.toBeInTheDocument();
      });
    });

    it('shows info message that schedule dates are read-only', async () => {
      render(<KanbanPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Schedule dates are read-only/)).toBeInTheDocument();
      });
    });
  });
});

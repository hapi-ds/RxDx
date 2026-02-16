import React from 'react';
import {renderHook, act, waitFor} from '@testing-library/react-native';
import {
  TimeTrackingProvider,
  useTimeTracking,
} from '../TimeTrackingContext';
import timeTrackingService from '../../services/TimeTrackingService';
import storageService from '../../services/StorageService';
import {WorkedEntry, Task} from '../../types';

// Mock services
jest.mock('../../services/TimeTrackingService');
jest.mock('../../services/StorageService');

// Mock timers
jest.useFakeTimers();

describe('TimeTrackingContext', () => {
  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'active',
    priority: 1,
    scheduled_start: null,
    scheduled_end: null,
  };

  const mockWorkedEntry: WorkedEntry = {
    id: 'worked-123',
    resource: 'user-123',
    task_id: 'task-123',
    date: '2026-02-16',
    start_time: '2026-02-16T10:00:00Z',
    end_time: null,
    description: 'Working on test',
    created_at: '2026-02-16T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Mock storage service to return null (no stored state)
    (storageService.getItem as jest.Mock).mockResolvedValue(null);
    (storageService.setItem as jest.Mock).mockResolvedValue(undefined);
    (storageService.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('useTimeTracking hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        renderHook(() => useTimeTracking());
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          'useTimeTracking must be used within a TimeTrackingProvider',
        );
      }

      consoleSpy.mockRestore();
    });

    it('should provide context value when used inside provider', async () => {
      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeEntry).toBeNull();
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.isTracking).toBe(false);
      expect(result.current.description).toBe('');
    });
  });

  describe('Initial state', () => {
    it('should initialize with correct default values', async () => {
      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeEntry).toBeNull();
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.isTracking).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.description).toBe('');
    });
  });

  describe('startTracking', () => {
    it('should start tracking successfully', async () => {
      (timeTrackingService.startTracking as jest.Mock).mockResolvedValue(
        mockWorkedEntry,
      );

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.startTracking(mockTask, 'Test description');
      });

      expect(timeTrackingService.startTracking).toHaveBeenCalledWith(
        'task-123',
        'Test description',
      );
      expect(result.current.activeEntry).toEqual(mockWorkedEntry);
      expect(result.current.isTracking).toBe(true);
      expect(result.current.description).toBe('Test description');
      expect(result.current.error).toBeNull();
    });

    it('should start tracking without description', async () => {
      (timeTrackingService.startTracking as jest.Mock).mockResolvedValue(
        mockWorkedEntry,
      );

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.startTracking(mockTask);
      });

      expect(timeTrackingService.startTracking).toHaveBeenCalledWith(
        'task-123',
        undefined,
      );
      expect(result.current.description).toBe('');
    });

    it('should persist tracking state to storage', async () => {
      (timeTrackingService.startTracking as jest.Mock).mockResolvedValue(
        mockWorkedEntry,
      );

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.startTracking(mockTask, 'Test description');
      });

      expect(storageService.setItem).toHaveBeenCalledWith(
        'active_tracking_entry',
        mockWorkedEntry,
      );
      expect(storageService.setItem).toHaveBeenCalledWith(
        'active_tracking_description',
        'Test description',
      );
      expect(storageService.setItem).toHaveBeenCalledWith(
        'active_tracking_start_time',
        '2026-02-16T10:00:00Z',
      );
    });

    it('should handle start tracking error', async () => {
      const error = new Error('Failed to start tracking');
      (timeTrackingService.startTracking as jest.Mock).mockRejectedValue(error);

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let caughtError: Error | null = null;
      try {
        await act(async () => {
          await result.current.startTracking(mockTask);
        });
      } catch (err) {
        caughtError = err as Error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toBe('Failed to start tracking');
      expect(result.current.isTracking).toBe(false);
    });

    it('should update elapsed time with timer', async () => {
      (timeTrackingService.startTracking as jest.Mock).mockResolvedValue(
        mockWorkedEntry,
      );

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.startTracking(mockTask);
      });

      expect(result.current.elapsedTime).toBeGreaterThanOrEqual(0);

      // Advance timer by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.elapsedTime).toBeGreaterThan(0);
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking successfully', async () => {
      (timeTrackingService.startTracking as jest.Mock).mockResolvedValue(
        mockWorkedEntry,
      );
      (timeTrackingService.stopTracking as jest.Mock).mockResolvedValue({
        ...mockWorkedEntry,
        end_time: '2026-02-16T11:00:00Z',
      });

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start tracking first
      await act(async () => {
        await result.current.startTracking(mockTask);
      });

      expect(result.current.isTracking).toBe(true);

      // Stop tracking
      await act(async () => {
        await result.current.stopTracking();
      });

      expect(timeTrackingService.stopTracking).toHaveBeenCalledWith('worked-123');
      expect(result.current.activeEntry).toBeNull();
      expect(result.current.isTracking).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.description).toBe('');
    });

    it('should clear persisted state on stop', async () => {
      (timeTrackingService.startTracking as jest.Mock).mockResolvedValue(
        mockWorkedEntry,
      );
      (timeTrackingService.stopTracking as jest.Mock).mockResolvedValue({
        ...mockWorkedEntry,
        end_time: '2026-02-16T11:00:00Z',
      });

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.startTracking(mockTask);
      });

      await act(async () => {
        await result.current.stopTracking();
      });

      expect(storageService.removeItem).toHaveBeenCalledWith(
        'active_tracking_entry',
      );
      expect(storageService.removeItem).toHaveBeenCalledWith(
        'active_tracking_description',
      );
      expect(storageService.removeItem).toHaveBeenCalledWith(
        'active_tracking_start_time',
      );
    });

    it('should handle stop tracking error when no active entry', async () => {
      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.stopTracking();
        }),
      ).rejects.toThrow('No active tracking to stop');
    });
  });

  describe('updateDescription', () => {
    it('should update description', async () => {
      (timeTrackingService.startTracking as jest.Mock).mockResolvedValue(
        mockWorkedEntry,
      );

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.startTracking(mockTask);
      });

      act(() => {
        result.current.updateDescription('Updated description');
      });

      expect(result.current.description).toBe('Updated description');
    });
  });

  describe('Restore tracking on app start', () => {
    it('should restore active tracking from storage', async () => {
      const storedEntry: WorkedEntry = {
        ...mockWorkedEntry,
        start_time: '2026-02-16T10:00:00Z',
      };

      (storageService.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'active_tracking_entry') {
          return Promise.resolve(storedEntry);
        }
        if (key === 'active_tracking_description') {
          return Promise.resolve('Stored description');
        }
        return Promise.resolve(null);
      });

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeEntry).toEqual(storedEntry);
      expect(result.current.description).toBe('Stored description');
      expect(result.current.isTracking).toBe(true);
      expect(result.current.elapsedTime).toBeGreaterThanOrEqual(0);
    });

    it('should not restore if entry has end_time', async () => {
      const completedEntry: WorkedEntry = {
        ...mockWorkedEntry,
        end_time: '2026-02-16T11:00:00Z',
      };

      (storageService.getItem as jest.Mock).mockResolvedValue(completedEntry);

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeEntry).toBeNull();
      expect(result.current.isTracking).toBe(false);
    });

    it('should handle restore error gracefully', async () => {
      (storageService.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const wrapper = ({children}: {children: React.ReactNode}) => (
        <TimeTrackingProvider>{children}</TimeTrackingProvider>
      );

      const {result} = renderHook(() => useTimeTracking(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeEntry).toBeNull();
      expect(result.current.isTracking).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to restore tracking:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });
});

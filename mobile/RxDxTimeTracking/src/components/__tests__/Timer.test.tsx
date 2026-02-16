import React from 'react';
import {render, waitFor, act} from '@testing-library/react-native';
import {Timer} from '../Timer';

// Mock timers
jest.useFakeTimers();

describe('Timer', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('renders with initial time 00:00:00', () => {
    const startTime = new Date();
    const {getByText} = render(<Timer startTime={startTime} />);
    expect(getByText('00:00:00')).toBeTruthy();
  });

  it('displays elapsed time correctly after 1 second', async () => {
    const startTime = new Date(Date.now() - 1000); // 1 second ago
    const {getByText} = render(<Timer startTime={startTime} />);
    
    await waitFor(() => {
      expect(getByText('00:00:01')).toBeTruthy();
    });
  });

  it('displays elapsed time correctly after 1 minute', async () => {
    const startTime = new Date(Date.now() - 60000); // 1 minute ago
    const {getByText} = render(<Timer startTime={startTime} />);
    
    await waitFor(() => {
      expect(getByText('00:01:00')).toBeTruthy();
    });
  });

  it('displays elapsed time correctly after 1 hour', async () => {
    const startTime = new Date(Date.now() - 3600000); // 1 hour ago
    const {getByText} = render(<Timer startTime={startTime} />);
    
    await waitFor(() => {
      expect(getByText('01:00:00')).toBeTruthy();
    });
  });

  it('displays elapsed time correctly for complex duration', async () => {
    // 2 hours, 34 minutes, 56 seconds ago
    const startTime = new Date(Date.now() - (2 * 3600000 + 34 * 60000 + 56000));
    const {getByText} = render(<Timer startTime={startTime} />);
    
    await waitFor(() => {
      expect(getByText('02:34:56')).toBeTruthy();
    });
  });

  it('updates every second when running', async () => {
    const startTime = new Date();
    const {getByText} = render(<Timer startTime={startTime} isRunning={true} />);
    
    // Initial state
    expect(getByText('00:00:00')).toBeTruthy();
    
    // Advance time by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(getByText('00:00:01')).toBeTruthy();
    });
    
    // Advance time by another second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(getByText('00:00:02')).toBeTruthy();
    });
  });

  it('does not update when isRunning is false', async () => {
    const startTime = new Date();
    const {getByText, queryByText} = render(
      <Timer startTime={startTime} isRunning={false} />
    );
    
    // Initial state
    expect(getByText('00:00:00')).toBeTruthy();
    
    // Advance time by 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    // Should still show 00:00:00
    expect(getByText('00:00:00')).toBeTruthy();
    expect(queryByText('00:00:02')).toBeNull();
  });

  it('formats time with leading zeros', async () => {
    // 5 seconds ago
    const startTime = new Date(Date.now() - 5000);
    const {getByText} = render(<Timer startTime={startTime} />);
    
    await waitFor(() => {
      expect(getByText('00:00:05')).toBeTruthy();
    });
  });

  it('handles hours greater than 9', async () => {
    // 12 hours, 30 minutes, 45 seconds ago
    const startTime = new Date(Date.now() - (12 * 3600000 + 30 * 60000 + 45000));
    const {getByText} = render(<Timer startTime={startTime} />);
    
    await waitFor(() => {
      expect(getByText('12:30:45')).toBeTruthy();
    });
  });

  it('handles very long durations', async () => {
    // 99 hours, 59 minutes, 59 seconds ago
    const startTime = new Date(Date.now() - (99 * 3600000 + 59 * 60000 + 59000));
    const {getByText} = render(<Timer startTime={startTime} />);
    
    await waitFor(() => {
      expect(getByText('99:59:59')).toBeTruthy();
    });
  });

  it('does not show negative time for future start times', async () => {
    // Start time in the future (should show 00:00:00)
    const startTime = new Date(Date.now() + 5000);
    const {getByText} = render(<Timer startTime={startTime} />);
    
    await waitFor(() => {
      expect(getByText('00:00:00')).toBeTruthy();
    });
  });

  it('has correct accessibility properties', () => {
    const startTime = new Date(Date.now() - 125000); // 2 minutes, 5 seconds ago
    const {getByRole} = render(<Timer startTime={startTime} />);
    
    const timer = getByRole('timer');
    expect(timer).toBeTruthy();
    expect(timer.props.accessibilityLabel).toContain('Elapsed time');
  });

  it('updates accessibility label with current time', async () => {
    const startTime = new Date(Date.now() - 1000);
    const {getByRole} = render(<Timer startTime={startTime} />);
    
    await waitFor(() => {
      const timer = getByRole('timer');
      expect(timer.props.accessibilityLabel).toBe('Elapsed time: 00:00:01');
    });
  });

  it('cleans up interval on unmount', () => {
    const startTime = new Date();
    const {unmount} = render(<Timer startTime={startTime} />);
    
    // Get the number of pending timers before unmount
    const timersBefore = jest.getTimerCount();
    
    unmount();
    
    // After unmount, the interval should be cleared
    const timersAfter = jest.getTimerCount();
    expect(timersAfter).toBeLessThan(timersBefore);
  });

  it('restarts interval when startTime changes', async () => {
    const startTime1 = new Date(Date.now() - 5000); // 5 seconds ago
    const {getByText, rerender} = render(<Timer startTime={startTime1} />);
    
    await waitFor(() => {
      expect(getByText('00:00:05')).toBeTruthy();
    });
    
    // Change start time to 10 seconds ago
    const startTime2 = new Date(Date.now() - 10000);
    rerender(<Timer startTime={startTime2} />);
    
    await waitFor(() => {
      expect(getByText('00:00:10')).toBeTruthy();
    });
  });

  it('restarts interval when isRunning changes from false to true', async () => {
    const startTime = new Date();
    const {getByText, rerender} = render(
      <Timer startTime={startTime} isRunning={false} />
    );
    
    // Should show 00:00:00 and not update
    expect(getByText('00:00:00')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(getByText('00:00:00')).toBeTruthy();
    
    // Start running
    rerender(<Timer startTime={startTime} isRunning={true} />);
    
    // Now it should update
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => {
      expect(getByText('00:00:03')).toBeTruthy();
    });
  });

  it('applies custom styles', () => {
    const startTime = new Date();
    const customStyle = {backgroundColor: 'red', padding: 10};
    const {getByRole} = render(
      <Timer startTime={startTime} style={customStyle} />
    );
    
    const timer = getByRole('timer');
    expect(timer.props.style).toMatchObject(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });
});

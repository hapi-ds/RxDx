/**
 * Unit tests for date grouping utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { groupEntriesByDate, formatDateHeader } from './dateGrouping';
import type { TimeEntry } from '../services/timeTrackingService';

describe('groupEntriesByDate', () => {
  const createEntry = (startTime: string, id: string = '1'): TimeEntry => ({
    id,
    task_id: 'task-1',
    task_title: 'Test Task',
    start_time: startTime,
    end_time: startTime,
    duration_hours: 1,
    description: 'Test description',
    created_at: startTime,
  });

  it('groups entries by date correctly', () => {
    const entries: TimeEntry[] = [
      createEntry('2024-01-15T09:00:00Z', '1'),
      createEntry('2024-01-15T14:00:00Z', '2'),
      createEntry('2024-01-14T10:00:00Z', '3'),
    ];
    
    const grouped = groupEntriesByDate(entries);
    
    expect(grouped).toHaveLength(2);
    expect(grouped[0].date).toBe('2024-01-15');
    expect(grouped[0].entries).toHaveLength(2);
    expect(grouped[1].date).toBe('2024-01-14');
    expect(grouped[1].entries).toHaveLength(1);
  });

  it('sorts groups by date descending (most recent first)', () => {
    const entries: TimeEntry[] = [
      createEntry('2024-01-10T09:00:00Z', '1'),
      createEntry('2024-01-15T09:00:00Z', '2'),
      createEntry('2024-01-12T09:00:00Z', '3'),
    ];
    
    const grouped = groupEntriesByDate(entries);
    
    expect(grouped).toHaveLength(3);
    expect(grouped[0].date).toBe('2024-01-15');
    expect(grouped[1].date).toBe('2024-01-12');
    expect(grouped[2].date).toBe('2024-01-10');
  });

  it('handles empty array', () => {
    const grouped = groupEntriesByDate([]);
    expect(grouped).toEqual([]);
  });

  it('handles single entry', () => {
    const entries: TimeEntry[] = [createEntry('2024-01-15T09:00:00Z')];
    
    const grouped = groupEntriesByDate(entries);
    
    expect(grouped).toHaveLength(1);
    expect(grouped[0].date).toBe('2024-01-15');
    expect(grouped[0].entries).toHaveLength(1);
  });

  it('includes date header for each group', () => {
    const entries: TimeEntry[] = [
      createEntry('2024-01-15T09:00:00Z', '1'),
      createEntry('2024-01-14T09:00:00Z', '2'),
    ];
    
    const grouped = groupEntriesByDate(entries);
    
    expect(grouped[0].dateHeader).toBeDefined();
    expect(grouped[1].dateHeader).toBeDefined();
  });

  it('skips entries with invalid dates', () => {
    const entries: TimeEntry[] = [
      createEntry('2024-01-15T09:00:00Z', '1'),
      createEntry('invalid-date', '2'),
      createEntry('2024-01-14T09:00:00Z', '3'),
    ];
    
    const grouped = groupEntriesByDate(entries);
    
    expect(grouped).toHaveLength(2);
    expect(grouped.flatMap(g => g.entries)).toHaveLength(2);
  });

  it('handles entries from same day at different times', () => {
    const entries: TimeEntry[] = [
      createEntry('2024-01-15T09:00:00Z', '1'),
      createEntry('2024-01-15T12:00:00Z', '2'),
      createEntry('2024-01-15T18:00:00Z', '3'),
    ];
    
    const grouped = groupEntriesByDate(entries);
    
    expect(grouped).toHaveLength(1);
    expect(grouped[0].entries).toHaveLength(3);
  });

  it('handles entries spanning multiple months', () => {
    const entries: TimeEntry[] = [
      createEntry('2024-01-15T09:00:00Z', '1'),
      createEntry('2024-02-10T09:00:00Z', '2'),
      createEntry('2024-03-05T09:00:00Z', '3'),
    ];
    
    const grouped = groupEntriesByDate(entries);
    
    expect(grouped).toHaveLength(3);
    expect(grouped[0].date).toBe('2024-03-05');
    expect(grouped[1].date).toBe('2024-02-10');
    expect(grouped[2].date).toBe('2024-01-15');
  });
});

describe('formatDateHeader', () => {
  beforeEach(() => {
    // Mock the current date to 2024-01-15 for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for today\'s date', () => {
    const result = formatDateHeader('2024-01-15');
    expect(result).toBe('Today');
  });

  it('returns "Yesterday" for yesterday\'s date', () => {
    const result = formatDateHeader('2024-01-14');
    expect(result).toBe('Yesterday');
  });

  it('formats older dates as "MMM DD, YYYY"', () => {
    expect(formatDateHeader('2024-01-10')).toBe('Jan 10, 2024');
    expect(formatDateHeader('2024-01-01')).toBe('Jan 1, 2024');
    expect(formatDateHeader('2023-12-25')).toBe('Dec 25, 2023');
  });

  it('formats dates from different months', () => {
    expect(formatDateHeader('2024-02-15')).toMatch(/Feb 15, 2024/);
    expect(formatDateHeader('2024-03-20')).toMatch(/Mar 20, 2024/);
    expect(formatDateHeader('2024-12-31')).toMatch(/Dec 31, 2024/);
  });

  it('handles invalid date strings', () => {
    const result = formatDateHeader('invalid');
    expect(result).toBe('invalid');
  });

  it('handles empty string', () => {
    const result = formatDateHeader('');
    expect(result).toBe('');
  });

  it('formats dates from previous years', () => {
    const result = formatDateHeader('2023-01-15');
    expect(result).toMatch(/Jan 15, 2023/);
  });

  it('formats dates from future (should not be "Today" or "Yesterday")', () => {
    const result = formatDateHeader('2024-01-20');
    expect(result).toMatch(/Jan 20, 2024/);
  });
});

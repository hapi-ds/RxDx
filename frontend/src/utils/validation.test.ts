/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { validateDescription, validateTaskSelection } from './validation';
import type { Task } from '../services/timeTrackingService';

describe('validateDescription', () => {
  it('accepts valid descriptions', () => {
    const result = validateDescription('This is a valid description');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts empty descriptions', () => {
    const result = validateDescription('');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts whitespace-only descriptions as valid (empty)', () => {
    const result = validateDescription('   ');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts descriptions at maximum length (500 characters)', () => {
    const description = 'x'.repeat(500);
    const result = validateDescription(description);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects descriptions exceeding 500 characters', () => {
    const description = 'x'.repeat(501);
    const result = validateDescription(description);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Description cannot exceed 500 characters');
  });

  it('rejects very long descriptions', () => {
    const description = 'x'.repeat(1000);
    const result = validateDescription(description);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('500 characters');
  });

  it('accepts multi-line descriptions', () => {
    const description = 'Line 1\nLine 2\nLine 3';
    const result = validateDescription(description);
    expect(result.isValid).toBe(true);
  });

  it('accepts descriptions with special characters', () => {
    const description = 'Description with special chars: @#$%^&*()';
    const result = validateDescription(description);
    expect(result.isValid).toBe(true);
  });

  it('accepts descriptions with unicode characters', () => {
    const description = 'Description with émojis 🎉 and ñ characters';
    const result = validateDescription(description);
    expect(result.isValid).toBe(true);
  });
});

describe('validateTaskSelection', () => {
  const createTask = (id: string): Task => ({
    id,
    title: `Task ${id}`,
    description: 'Test task',
    status: 'in_progress',
    priority: 1,
    estimated_hours: 5,
    worked_sum: 2,
    has_active_tracking: false,
    user_is_tracking: false,
  });

  const tasks: Task[] = [
    createTask('task-1'),
    createTask('task-2'),
    createTask('task-3'),
  ];

  it('accepts valid task selection', () => {
    const result = validateTaskSelection('task-1', tasks);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts any task from the list', () => {
    expect(validateTaskSelection('task-1', tasks).isValid).toBe(true);
    expect(validateTaskSelection('task-2', tasks).isValid).toBe(true);
    expect(validateTaskSelection('task-3', tasks).isValid).toBe(true);
  });

  it('rejects null task ID', () => {
    const result = validateTaskSelection(null, tasks);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('No task selected');
  });

  it('rejects task ID not in the list', () => {
    const result = validateTaskSelection('task-999', tasks);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Selected task not found');
  });

  it('rejects empty string task ID', () => {
    const result = validateTaskSelection('', tasks);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('No task selected');
  });

  it('handles empty task list', () => {
    const result = validateTaskSelection('task-1', []);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Selected task not found');
  });

  it('handles null task ID with empty task list', () => {
    const result = validateTaskSelection(null, []);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('No task selected');
  });

  it('is case-sensitive for task IDs', () => {
    const result = validateTaskSelection('TASK-1', tasks);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Selected task not found');
  });

  it('does not accept partial task ID matches', () => {
    const result = validateTaskSelection('task', tasks);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Selected task not found');
  });
});

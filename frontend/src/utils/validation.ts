/**
 * Validation utilities for time tracking feature
 * Provides functions to validate user inputs
 */

import type { Task } from '../services/timeTrackingService';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate description text
 * @param text - Description text to validate
 * @returns Validation result with isValid flag and optional error message
 * @example
 * validateDescription("Valid description") // { isValid: true }
 * validateDescription("x".repeat(501)) // { isValid: false, error: "Description cannot exceed 500 characters" }
 */
export function validateDescription(text: string): ValidationResult {
  // Empty description is valid (optional field)
  if (!text || text.trim().length === 0) {
    return { isValid: true };
  }
  
  // Check maximum length
  if (text.length > 500) {
    return {
      isValid: false,
      error: 'Description cannot exceed 500 characters',
    };
  }
  
  return { isValid: true };
}

/**
 * Validate task selection
 * @param taskId - Task ID to validate
 * @param tasks - Array of available tasks
 * @returns Validation result with isValid flag and optional error message
 * @example
 * validateTaskSelection("task-123", tasks) // { isValid: true }
 * validateTaskSelection("invalid-id", tasks) // { isValid: false, error: "Selected task not found" }
 * validateTaskSelection(null, tasks) // { isValid: false, error: "No task selected" }
 */
export function validateTaskSelection(
  taskId: string | null,
  tasks: Task[]
): ValidationResult {
  // Check if task is selected
  if (!taskId) {
    return {
      isValid: false,
      error: 'No task selected',
    };
  }
  
  // Check if task exists in the list
  const taskExists = tasks.some(task => task.id === taskId);
  
  if (!taskExists) {
    return {
      isValid: false,
      error: 'Selected task not found',
    };
  }
  
  return { isValid: true };
}

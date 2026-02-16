/**
 * Validation utility functions
 */

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns True if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate time range (end time must be after start time)
 * @param startTime - Start time in ISO 8601 format
 * @param endTime - End time in ISO 8601 format
 * @returns True if valid, false otherwise
 */
export function validateTimeRange(startTime: string, endTime: string): boolean {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }

    // End time must be after start time
    return end.getTime() > start.getTime();
  } catch (error) {
    return false;
  }
}

/**
 * Validate description length
 * @param description - Description text
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns True if valid, false otherwise
 */
export function validateDescriptionLength(
  description: string,
  maxLength: number = 500,
): boolean {
  if (!description) {
    return true; // Empty description is valid
  }

  return description.length <= maxLength;
}

/**
 * Validate required field
 * @param value - Value to validate
 * @returns True if not empty, false otherwise
 */
export function validateRequired(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
}

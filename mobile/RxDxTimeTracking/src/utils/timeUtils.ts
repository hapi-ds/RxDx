/**
 * Time utility functions for formatting and calculations
 */

/**
 * Format elapsed time in seconds to HH:MM:SS format
 * @param seconds - Elapsed time in seconds
 * @returns Formatted time string (HH:MM:SS)
 */
export function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in seconds to human-readable format (e.g., "2h 30m")
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) {
    return '0m';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Calculate elapsed time in seconds from start time to now
 * @param startTime - Start time in ISO 8601 format
 * @returns Elapsed time in seconds
 */
export function calculateElapsedTime(startTime: string): number {
  const start = new Date(startTime);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 1000);
}

/**
 * Calculate duration in seconds between start and end times
 * @param startTime - Start time in ISO 8601 format
 * @param endTime - End time in ISO 8601 format
 * @returns Duration in seconds
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.floor((end.getTime() - start.getTime()) / 1000);
}

/**
 * Parse time string in HH:MM:SS format to seconds
 * @param timeString - Time string in HH:MM:SS format
 * @returns Time in seconds
 */
export function parseTimeToSeconds(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid time format. Expected HH:MM:SS');
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    throw new Error('Invalid time values');
  }

  return hours * 3600 + minutes * 60 + seconds;
}

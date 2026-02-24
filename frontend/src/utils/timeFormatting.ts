/**
 * Time formatting utilities for time tracking feature
 * Provides functions to format durations, times, and elapsed time
 */

/**
 * Format duration in hours to "Xh Ym" format
 * @param hours - Duration in hours (can be decimal)
 * @returns Formatted string like "2h 30m" or "0h 0m"
 * @example
 * formatDuration(2.5) // "2h 30m"
 * formatDuration(0.25) // "0h 15m"
 * formatDuration(0) // "0h 0m"
 */
export function formatDuration(hours: number): string {
  if (isNaN(hours) || hours < 0) {
    hours = 0;
  }
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  return `${h}h ${m}m`;
}

/**
 * Format ISO datetime string to "HH:MM" format in local timezone
 * @param isoString - ISO 8601 datetime string
 * @returns Formatted time string like "09:30" or "14:45"
 * @example
 * formatTime("2024-01-15T09:30:00Z") // "09:30" (in local timezone)
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  
  if (isNaN(date.getTime())) {
    return '--:--';
  }
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Format elapsed time in milliseconds to "HH:MM:SS" format
 * @param milliseconds - Elapsed time in milliseconds
 * @returns Formatted string like "00:05:23" or "02:30:15"
 * @example
 * formatElapsedTime(5000) // "00:00:05"
 * formatElapsedTime(3661000) // "01:01:01"
 */
export function formatElapsedTime(milliseconds: number): string {
  if (milliseconds < 0) {
    milliseconds = 0;
  }
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate elapsed time between start time and current time
 * @param startTime - ISO 8601 datetime string representing start time
 * @param currentTime - Current time in milliseconds (from Date.now())
 * @returns Elapsed time in milliseconds
 * @example
 * const start = "2024-01-15T09:00:00Z";
 * const now = Date.now();
 * const elapsed = calculateElapsedTime(start, now);
 */
export function calculateElapsedTime(startTime: string, currentTime: number): number {
  const start = new Date(startTime);
  
  if (isNaN(start.getTime())) {
    return 0;
  }
  
  const elapsed = currentTime - start.getTime();
  
  return elapsed > 0 ? elapsed : 0;
}

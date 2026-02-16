import {format, parseISO, startOfDay, isSameDay} from 'date-fns';
import {WorkedEntry} from '../types';

/**
 * Date utility functions
 */

/**
 * Format date to display format (e.g., "Jan 15, 2024")
 * @param date - Date string in ISO 8601 format or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format date to short format (e.g., "01/15/2024")
 * @param date - Date string in ISO 8601 format or Date object
 * @returns Formatted date string
 */
export function formatDateShort(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'MM/dd/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format time to display format (e.g., "09:30 AM")
 * @param time - Time string in HH:MM:SS format or ISO 8601 format
 * @returns Formatted time string
 */
export function formatTime(time: string): string {
  try {
    // If it's an ISO 8601 string, parse it
    if (time.includes('T') || time.includes('Z')) {
      const dateObj = parseISO(time);
      return format(dateObj, 'h:mm a');
    }

    // If it's HH:MM:SS format, parse it manually
    const parts = time.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return format(date, 'h:mm a');
    }

    return time;
  } catch (error) {
    console.error('Error formatting time:', error);
    return time;
  }
}

/**
 * Group worked entries by date
 * @param entries - Array of worked entries
 * @returns Object with dates as keys and arrays of entries as values
 */
export function groupByDate(
  entries: WorkedEntry[],
): Record<string, WorkedEntry[]> {
  const grouped: Record<string, WorkedEntry[]> = {};

  entries.forEach(entry => {
    const date = entry.date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(entry);
  });

  return grouped;
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Today's date string
 */
export function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Check if a date is today
 * @param date - Date string in ISO 8601 format or Date object
 * @returns True if date is today, false otherwise
 */
export function isToday(date: string | Date): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isSameDay(dateObj, new Date());
  } catch (error) {
    return false;
  }
}

/**
 * Get start of day for a date
 * @param date - Date string in ISO 8601 format or Date object
 * @returns Date object at start of day
 */
export function getStartOfDay(date: string | Date): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(dateObj);
}

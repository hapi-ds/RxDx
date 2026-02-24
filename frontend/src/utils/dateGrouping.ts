/**
 * Date grouping utilities for time tracking feature
 * Provides functions to group time entries by date and format date headers
 */

import type { TimeEntry } from '../services/timeTrackingService';

/**
 * Interface for grouped time entries
 */
export interface GroupedTimeEntries {
  date: string; // YYYY-MM-DD format
  dateHeader: string; // Formatted header like "Today", "Yesterday", "Jan 15, 2024"
  entries: TimeEntry[];
}

/**
 * Group time entries by date (most recent first)
 * @param entries - Array of time entries
 * @returns Array of grouped entries sorted by date descending
 * @example
 * const entries = [
 *   { start_time: "2024-01-15T09:00:00Z", ... },
 *   { start_time: "2024-01-15T14:00:00Z", ... },
 *   { start_time: "2024-01-14T10:00:00Z", ... },
 * ];
 * const grouped = groupEntriesByDate(entries);
 * // Returns:
 * // [
 * //   { date: "2024-01-15", dateHeader: "Today", entries: [...] },
 * //   { date: "2024-01-14", dateHeader: "Yesterday", entries: [...] }
 * // ]
 */
export function groupEntriesByDate(entries: TimeEntry[]): GroupedTimeEntries[] {
  // Group entries by date
  const groups = new Map<string, TimeEntry[]>();
  
  entries.forEach(entry => {
    const date = new Date(entry.start_time);
    if (isNaN(date.getTime())) {
      return; // Skip invalid dates
    }
    
    // Get date in YYYY-MM-DD format (local timezone)
    const dateKey = date.toISOString().split('T')[0];
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(entry);
  });
  
  // Convert to array and sort by date descending (most recent first)
  const groupedArray: GroupedTimeEntries[] = Array.from(groups.entries())
    .map(([date, entries]) => ({
      date,
      dateHeader: formatDateHeader(date),
      entries,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  
  return groupedArray;
}

/**
 * Format date string to human-readable header
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted header like "Today", "Yesterday", or "Jan 15, 2024"
 * @example
 * formatDateHeader("2024-01-15") // "Today" (if today is 2024-01-15)
 * formatDateHeader("2024-01-14") // "Yesterday" (if today is 2024-01-15)
 * formatDateHeader("2024-01-10") // "Jan 10, 2024"
 */
export function formatDateHeader(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
  
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const entryDate = new Date(date);
  entryDate.setHours(0, 0, 0, 0);
  
  // Check if it's today
  if (entryDate.getTime() === today.getTime()) {
    return 'Today';
  }
  
  // Check if it's yesterday
  if (entryDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  
  // Format as "MMM DD, YYYY"
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  
  return date.toLocaleDateString('en-US', options);
}

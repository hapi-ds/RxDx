/**
 * Unit tests for time formatting utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatTime,
  formatElapsedTime,
  calculateElapsedTime,
} from './timeFormatting';

describe('formatDuration', () => {
  it('formats whole hours correctly', () => {
    expect(formatDuration(0)).toBe('0h 0m');
    expect(formatDuration(1)).toBe('1h 0m');
    expect(formatDuration(5)).toBe('5h 0m');
    expect(formatDuration(24)).toBe('24h 0m');
  });

  it('formats fractional hours correctly', () => {
    expect(formatDuration(0.5)).toBe('0h 30m');
    expect(formatDuration(1.5)).toBe('1h 30m');
    expect(formatDuration(2.25)).toBe('2h 15m');
    expect(formatDuration(3.75)).toBe('3h 45m');
  });

  it('rounds minutes to nearest integer', () => {
    expect(formatDuration(1.01)).toBe('1h 1m'); // 0.6 minutes rounds to 1
    expect(formatDuration(1.99)).toBe('1h 59m'); // 59.4 minutes rounds to 59
  });

  it('handles negative values by treating them as zero', () => {
    expect(formatDuration(-1)).toBe('0h 0m');
    expect(formatDuration(-5.5)).toBe('0h 0m');
  });

  it('handles very large values', () => {
    expect(formatDuration(100)).toBe('100h 0m');
    expect(formatDuration(1000.5)).toBe('1000h 30m');
  });

  it('handles very small fractional values', () => {
    expect(formatDuration(0.01)).toBe('0h 1m'); // 0.6 minutes rounds to 1
    expect(formatDuration(0.001)).toBe('0h 0m'); // 0.06 minutes rounds to 0
  });
});

describe('formatTime', () => {
  it('formats valid ISO strings correctly', () => {
    // Note: These tests assume UTC timezone for consistency
    // In real usage, times will be converted to local timezone
    const isoString = '2024-01-15T09:30:00Z';
    const result = formatTime(isoString);
    
    // Result will be in local timezone, so we just check format
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('handles midnight correctly', () => {
    const isoString = '2024-01-15T00:00:00Z';
    const result = formatTime(isoString);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('handles noon correctly', () => {
    const isoString = '2024-01-15T12:00:00Z';
    const result = formatTime(isoString);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('pads single-digit hours and minutes with zeros', () => {
    const isoString = '2024-01-15T03:05:00Z';
    const result = formatTime(isoString);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('handles invalid ISO strings', () => {
    expect(formatTime('invalid')).toBe('--:--');
    expect(formatTime('')).toBe('--:--');
    expect(formatTime('not-a-date')).toBe('--:--');
  });

  it('handles different ISO string formats', () => {
    const formats = [
      '2024-01-15T09:30:00Z',
      '2024-01-15T09:30:00.000Z',
      '2024-01-15T09:30:00+00:00',
    ];
    
    formats.forEach(format => {
      const result = formatTime(format);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});

describe('formatElapsedTime', () => {
  it('formats seconds correctly', () => {
    expect(formatElapsedTime(0)).toBe('00:00:00');
    expect(formatElapsedTime(1000)).toBe('00:00:01');
    expect(formatElapsedTime(5000)).toBe('00:00:05');
    expect(formatElapsedTime(59000)).toBe('00:00:59');
  });

  it('formats minutes correctly', () => {
    expect(formatElapsedTime(60000)).toBe('00:01:00');
    expect(formatElapsedTime(300000)).toBe('00:05:00');
    expect(formatElapsedTime(3540000)).toBe('00:59:00');
  });

  it('formats hours correctly', () => {
    expect(formatElapsedTime(3600000)).toBe('01:00:00');
    expect(formatElapsedTime(7200000)).toBe('02:00:00');
    expect(formatElapsedTime(36000000)).toBe('10:00:00');
  });

  it('formats combined hours, minutes, and seconds', () => {
    expect(formatElapsedTime(3661000)).toBe('01:01:01');
    expect(formatElapsedTime(7325000)).toBe('02:02:05');
    expect(formatElapsedTime(9999000)).toBe('02:46:39');
  });

  it('pads single-digit values with zeros', () => {
    expect(formatElapsedTime(3661000)).toBe('01:01:01');
    expect(formatElapsedTime(5000)).toBe('00:00:05');
  });

  it('handles negative values by treating them as zero', () => {
    expect(formatElapsedTime(-1000)).toBe('00:00:00');
    expect(formatElapsedTime(-60000)).toBe('00:00:00');
  });

  it('handles very large values', () => {
    expect(formatElapsedTime(360000000)).toBe('100:00:00'); // 100 hours
    expect(formatElapsedTime(3600000000)).toBe('1000:00:00'); // 1000 hours
  });

  it('truncates milliseconds', () => {
    expect(formatElapsedTime(1500)).toBe('00:00:01'); // 1.5 seconds -> 1 second
    expect(formatElapsedTime(1999)).toBe('00:00:01'); // 1.999 seconds -> 1 second
  });
});

describe('calculateElapsedTime', () => {
  it('calculates elapsed time correctly', () => {
    const startTime = '2024-01-15T09:00:00Z';
    const currentTime = new Date('2024-01-15T09:05:00Z').getTime();
    
    const elapsed = calculateElapsedTime(startTime, currentTime);
    expect(elapsed).toBe(5 * 60 * 1000); // 5 minutes in milliseconds
  });

  it('handles same start and current time', () => {
    const startTime = '2024-01-15T09:00:00Z';
    const currentTime = new Date('2024-01-15T09:00:00Z').getTime();
    
    const elapsed = calculateElapsedTime(startTime, currentTime);
    expect(elapsed).toBe(0);
  });

  it('handles current time before start time by returning zero', () => {
    const startTime = '2024-01-15T09:00:00Z';
    const currentTime = new Date('2024-01-15T08:00:00Z').getTime();
    
    const elapsed = calculateElapsedTime(startTime, currentTime);
    expect(elapsed).toBe(0);
  });

  it('handles invalid start time', () => {
    const elapsed = calculateElapsedTime('invalid', Date.now());
    expect(elapsed).toBe(0);
  });

  it('calculates elapsed time for hours', () => {
    const startTime = '2024-01-15T09:00:00Z';
    const currentTime = new Date('2024-01-15T11:30:00Z').getTime();
    
    const elapsed = calculateElapsedTime(startTime, currentTime);
    expect(elapsed).toBe(2.5 * 60 * 60 * 1000); // 2.5 hours in milliseconds
  });

  it('handles different timezones correctly', () => {
    const startTime = '2024-01-15T09:00:00+05:00'; // UTC+5 = 04:00:00Z
    const currentTime = new Date('2024-01-15T05:00:00Z').getTime(); // 1 hour later in UTC
    
    const elapsed = calculateElapsedTime(startTime, currentTime);
    expect(elapsed).toBe(3600000); // 1 hour in milliseconds
  });
});

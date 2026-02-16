import {
  formatElapsedTime,
  formatDuration,
  calculateElapsedTime,
  calculateDuration,
  parseTimeToSeconds,
} from '../timeUtils';

describe('timeUtils', () => {
  describe('formatElapsedTime', () => {
    it('should format seconds to HH:MM:SS', () => {
      expect(formatElapsedTime(0)).toBe('00:00:00');
      expect(formatElapsedTime(59)).toBe('00:00:59');
      expect(formatElapsedTime(60)).toBe('00:01:00');
      expect(formatElapsedTime(3599)).toBe('00:59:59');
      expect(formatElapsedTime(3600)).toBe('01:00:00');
      expect(formatElapsedTime(3661)).toBe('01:01:01');
      expect(formatElapsedTime(9000)).toBe('02:30:00');
      expect(formatElapsedTime(36000)).toBe('10:00:00');
    });

    it('should handle large values', () => {
      expect(formatElapsedTime(86400)).toBe('24:00:00'); // 24 hours
      expect(formatElapsedTime(90061)).toBe('25:01:01'); // 25 hours, 1 minute, 1 second
    });
  });

  describe('formatDuration', () => {
    it('should format zero duration', () => {
      expect(formatDuration(0)).toBe('0m');
    });

    it('should format minutes only', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(300)).toBe('5m');
      expect(formatDuration(1800)).toBe('30m');
      expect(formatDuration(3540)).toBe('59m');
    });

    it('should format hours only', () => {
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(7200)).toBe('2h');
      expect(formatDuration(36000)).toBe('10h');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(5400)).toBe('1h 30m');
      expect(formatDuration(9000)).toBe('2h 30m');
      expect(formatDuration(37800)).toBe('10h 30m');
    });
  });

  describe('calculateElapsedTime', () => {
    it('should calculate elapsed time from start to now', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const elapsed = calculateElapsedTime(fiveMinutesAgo.toISOString());
      
      // Allow for small timing differences (within 2 seconds)
      expect(elapsed).toBeGreaterThanOrEqual(298);
      expect(elapsed).toBeLessThanOrEqual(302);
    });

    it('should return 0 for future times', () => {
      const future = new Date(Date.now() + 60000).toISOString();
      const elapsed = calculateElapsedTime(future);
      
      expect(elapsed).toBeLessThanOrEqual(0);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration between two times', () => {
      const start = '2024-01-01T09:00:00Z';
      const end = '2024-01-01T10:00:00Z';
      
      expect(calculateDuration(start, end)).toBe(3600);
    });

    it('should handle different durations', () => {
      const start = '2024-01-01T09:00:00Z';
      
      expect(calculateDuration(start, '2024-01-01T09:30:00Z')).toBe(1800);
      expect(calculateDuration(start, '2024-01-01T11:00:00Z')).toBe(7200);
      expect(calculateDuration(start, '2024-01-01T09:00:01Z')).toBe(1);
    });

    it('should return negative for reversed times', () => {
      const start = '2024-01-01T10:00:00Z';
      const end = '2024-01-01T09:00:00Z';
      
      expect(calculateDuration(start, end)).toBe(-3600);
    });
  });

  describe('parseTimeToSeconds', () => {
    it('should parse HH:MM:SS to seconds', () => {
      expect(parseTimeToSeconds('00:00:00')).toBe(0);
      expect(parseTimeToSeconds('00:00:01')).toBe(1);
      expect(parseTimeToSeconds('00:01:00')).toBe(60);
      expect(parseTimeToSeconds('01:00:00')).toBe(3600);
      expect(parseTimeToSeconds('01:30:45')).toBe(5445);
      expect(parseTimeToSeconds('10:30:00')).toBe(37800);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseTimeToSeconds('invalid')).toThrow('Invalid time format');
      expect(() => parseTimeToSeconds('12:30')).toThrow('Invalid time format');
      expect(() => parseTimeToSeconds('12:30:45:00')).toThrow('Invalid time format');
    });

    it('should throw error for invalid values', () => {
      expect(() => parseTimeToSeconds('aa:bb:cc')).toThrow('Invalid time values');
      expect(() => parseTimeToSeconds('12:xx:30')).toThrow('Invalid time values');
    });
  });
});

import {
  validateEmail,
  validateTimeRange,
  validateDescriptionLength,
  validateRequired,
} from '../validation';

describe('validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@example.com')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
      expect(validateEmail('test123@test-domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test @example.com')).toBe(false);
      expect(validateEmail('test@example')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validateEmail('  test@example.com  ')).toBe(true); // Trimmed
    });
  });

  describe('validateTimeRange', () => {
    it('should validate valid time ranges', () => {
      const start = '2024-01-01T09:00:00Z';
      const end = '2024-01-01T10:00:00Z';
      
      expect(validateTimeRange(start, end)).toBe(true);
    });

    it('should reject invalid time ranges', () => {
      const start = '2024-01-01T10:00:00Z';
      const end = '2024-01-01T09:00:00Z';
      
      expect(validateTimeRange(start, end)).toBe(false);
    });

    it('should reject equal times', () => {
      const time = '2024-01-01T09:00:00Z';
      
      expect(validateTimeRange(time, time)).toBe(false);
    });

    it('should handle invalid date strings', () => {
      expect(validateTimeRange('invalid', '2024-01-01T10:00:00Z')).toBe(false);
      expect(validateTimeRange('2024-01-01T09:00:00Z', 'invalid')).toBe(false);
      expect(validateTimeRange('invalid', 'invalid')).toBe(false);
    });
  });

  describe('validateDescriptionLength', () => {
    it('should validate descriptions within length limit', () => {
      expect(validateDescriptionLength('')).toBe(true);
      expect(validateDescriptionLength('Short description')).toBe(true);
      expect(validateDescriptionLength('A'.repeat(500))).toBe(true);
    });

    it('should reject descriptions exceeding length limit', () => {
      expect(validateDescriptionLength('A'.repeat(501))).toBe(false);
      expect(validateDescriptionLength('A'.repeat(1000))).toBe(false);
    });

    it('should support custom max length', () => {
      expect(validateDescriptionLength('Test', 10)).toBe(true);
      expect(validateDescriptionLength('Test', 3)).toBe(false);
      expect(validateDescriptionLength('A'.repeat(100), 100)).toBe(true);
      expect(validateDescriptionLength('A'.repeat(101), 100)).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      expect(validateRequired('test')).toBe(true);
      expect(validateRequired('  test  ')).toBe(true);
      expect(validateRequired(123)).toBe(true);
      expect(validateRequired(true)).toBe(true);
      expect(validateRequired(false)).toBe(true);
      expect(validateRequired([])).toBe(true);
      expect(validateRequired({})).toBe(true);
    });

    it('should reject empty values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
    });
  });
});

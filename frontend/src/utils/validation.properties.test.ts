/**
 * Property-based tests for description validation
 * Feature: web-time-tracking, Property 5: Description Length Validation
 * Validates: Requirements 6.3
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateDescription } from './validation';

describe('Property 5: Description Length Validation', () => {
  it('descriptions under 500 characters are always valid', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 500 }),
        (description) => {
          const result = validateDescription(description);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('descriptions over 500 characters are always invalid', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 501, maxLength: 1000 }),
        (description) => {
          const result = validateDescription(description);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('500 characters');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('descriptions at exactly 500 characters are valid', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 500, maxLength: 500 }),
        (description) => {
          const result = validateDescription(description);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('descriptions at exactly 501 characters are invalid', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 501, maxLength: 501 }),
        (description) => {
          const result = validateDescription(description);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty descriptions are valid', () => {
    const result = validateDescription('');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('whitespace-only descriptions are valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('   ', '\t', '\n', '  \t  ', '\n\n\n'),
        (description) => {
          const result = validateDescription(description);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validation is consistent for same input', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 1000 }),
        (description) => {
          const result1 = validateDescription(description);
          const result2 = validateDescription(description);
          
          expect(result1.isValid).toBe(result2.isValid);
          expect(result1.error).toBe(result2.error);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validation depends only on length, not content', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (desc1, desc2) => {
          // If both have same length, both should have same validity
          if (desc1.length === desc2.length) {
            const result1 = validateDescription(desc1);
            const result2 = validateDescription(desc2);
            
            expect(result1.isValid).toBe(result2.isValid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles unicode characters correctly', () => {
    // Test with strings containing unicode characters
    const unicodeStrings = [
      'Hello 世界',
      'Émojis 🎉🎊',
      'Ñoño',
      'Привет мир',
      '你好世界',
    ];
    
    unicodeStrings.forEach(str => {
      // Pad to various lengths
      const short = str.padEnd(100, 'x');
      const medium = str.padEnd(500, 'x');
      const long = str.padEnd(501, 'x');
      
      expect(validateDescription(short).isValid).toBe(true);
      expect(validateDescription(medium).isValid).toBe(true);
      expect(validateDescription(long).isValid).toBe(false);
    });
  });

  it('handles multi-line descriptions correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 100 }), { maxLength: 5 }),
        (lines) => {
          const description = lines.join('\n');
          const result = validateDescription(description);
          
          if (description.length <= 500) {
            expect(result.isValid).toBe(true);
          } else {
            expect(result.isValid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles special characters correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 500 }).map(s => 
          s + '@#$%^&*()[]{}|\\;:\'",.<>?/`~'
        ),
        (description) => {
          const result = validateDescription(description);
          
          if (description.length <= 500) {
            expect(result.isValid).toBe(true);
          } else {
            expect(result.isValid).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('boundary test: 499, 500, 501 characters', () => {
    const desc499 = 'x'.repeat(499);
    const desc500 = 'x'.repeat(500);
    const desc501 = 'x'.repeat(501);
    
    expect(validateDescription(desc499).isValid).toBe(true);
    expect(validateDescription(desc500).isValid).toBe(true);
    expect(validateDescription(desc501).isValid).toBe(false);
  });

  it('error message is descriptive for invalid descriptions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 501, maxLength: 1000 }),
        (description) => {
          const result = validateDescription(description);
          
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error!.toLowerCase()).toContain('description');
          expect(result.error!).toContain('500');
        }
      ),
      { numRuns: 100 }
    );
  });
});

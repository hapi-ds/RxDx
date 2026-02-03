/**
 * Tests for version utility functions
 * 
 * References: Requirement 20 (Enhanced Version Control User Experience)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  parseVersion,
  calculateNextVersion,
  compareVersions,
  isValidVersion,
  formatVersion,
  type ParsedVersion,
} from './version';

describe('version utilities', () => {
  describe('parseVersion', () => {
    it('should parse valid version strings', () => {
      const result = parseVersion('1.2');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        raw: '1.2',
        isValid: true,
      });
    });

    it('should parse version with zero minor', () => {
      const result = parseVersion('1.0');
      expect(result).toEqual({
        major: 1,
        minor: 0,
        raw: '1.0',
        isValid: true,
      });
    });

    it('should parse version with zero major', () => {
      const result = parseVersion('0.1');
      expect(result).toEqual({
        major: 0,
        minor: 1,
        raw: '0.1',
        isValid: true,
      });
    });

    it('should parse large version numbers', () => {
      const result = parseVersion('99.999');
      expect(result).toEqual({
        major: 99,
        minor: 999,
        raw: '99.999',
        isValid: true,
      });
    });

    it('should handle version with too many parts', () => {
      const result = parseVersion('1.2.3');
      expect(result.isValid).toBe(false);
      expect(result.major).toBe(0);
      expect(result.minor).toBe(0);
      expect(result.raw).toBe('1.2.3');
    });

    it('should handle version with too few parts', () => {
      const result = parseVersion('1');
      expect(result.isValid).toBe(false);
      expect(result.major).toBe(0);
      expect(result.minor).toBe(0);
      expect(result.raw).toBe('1');
    });

    it('should handle non-numeric major version', () => {
      const result = parseVersion('a.2');
      expect(result.isValid).toBe(false);
      expect(result.major).toBe(0);
      expect(result.minor).toBe(0);
    });

    it('should handle non-numeric minor version', () => {
      const result = parseVersion('1.b');
      expect(result.isValid).toBe(false);
      expect(result.major).toBe(0);
      expect(result.minor).toBe(0);
    });

    it('should handle negative major version', () => {
      const result = parseVersion('-1.2');
      expect(result.isValid).toBe(false);
    });

    it('should handle negative minor version', () => {
      const result = parseVersion('1.-2');
      expect(result.isValid).toBe(false);
    });

    it('should handle empty string', () => {
      const result = parseVersion('');
      expect(result.isValid).toBe(false);
      expect(result.raw).toBe('');
    });

    it('should handle version with spaces', () => {
      const result = parseVersion('1. 2');
      expect(result.isValid).toBe(false);
    });

    it('should handle version with leading zeros', () => {
      const result = parseVersion('01.02');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        raw: '01.02',
        isValid: true,
      });
    });

    it('should handle decimal numbers', () => {
      const result = parseVersion('1.2.5');
      expect(result.isValid).toBe(false);
    });
  });

  describe('calculateNextVersion', () => {
    it('should increment minor version', () => {
      expect(calculateNextVersion('1.2')).toBe('1.3');
    });

    it('should increment from zero', () => {
      expect(calculateNextVersion('1.0')).toBe('1.1');
    });

    it('should handle large minor versions', () => {
      expect(calculateNextVersion('1.99')).toBe('1.100');
    });

    it('should handle version 1.0', () => {
      expect(calculateNextVersion('1.0')).toBe('1.1');
    });

    it('should handle version 0.0', () => {
      expect(calculateNextVersion('0.0')).toBe('0.1');
    });

    it('should return default for invalid version', () => {
      expect(calculateNextVersion('invalid')).toBe('1.1');
    });

    it('should return default for version with too many parts', () => {
      expect(calculateNextVersion('1.2.3')).toBe('1.1');
    });

    it('should return default for version with too few parts', () => {
      expect(calculateNextVersion('1')).toBe('1.1');
    });

    it('should return default for empty string', () => {
      expect(calculateNextVersion('')).toBe('1.1');
    });

    it('should return default for non-numeric version', () => {
      expect(calculateNextVersion('a.b')).toBe('1.1');
    });

    it('should handle version with leading zeros', () => {
      expect(calculateNextVersion('01.02')).toBe('1.3');
    });
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.2', '1.2')).toBe(0);
    });

    it('should return -1 when first version is less', () => {
      expect(compareVersions('1.2', '1.3')).toBe(-1);
    });

    it('should return 1 when first version is greater', () => {
      expect(compareVersions('1.3', '1.2')).toBe(1);
    });

    it('should compare major versions first', () => {
      expect(compareVersions('2.0', '1.99')).toBe(1);
    });

    it('should compare minor versions when major is equal', () => {
      expect(compareVersions('1.5', '1.10')).toBe(-1);
    });

    it('should handle version 0.0', () => {
      expect(compareVersions('0.0', '0.1')).toBe(-1);
      expect(compareVersions('0.1', '0.0')).toBe(1);
    });

    it('should handle large version numbers', () => {
      expect(compareVersions('99.999', '100.0')).toBe(-1);
    });

    it('should treat invalid versions as less than valid', () => {
      expect(compareVersions('invalid', '1.0')).toBe(-1);
      expect(compareVersions('1.0', 'invalid')).toBe(1);
    });

    it('should return 0 for two invalid versions', () => {
      expect(compareVersions('invalid', 'also-invalid')).toBe(0);
    });

    it('should handle mixed valid and invalid versions', () => {
      expect(compareVersions('1.2.3', '1.2')).toBe(-1);
      expect(compareVersions('1.2', '1.2.3')).toBe(1);
    });
  });

  describe('isValidVersion', () => {
    it('should return true for valid versions', () => {
      expect(isValidVersion('1.2')).toBe(true);
      expect(isValidVersion('0.0')).toBe(true);
      expect(isValidVersion('99.999')).toBe(true);
    });

    it('should return false for invalid versions', () => {
      expect(isValidVersion('invalid')).toBe(false);
      expect(isValidVersion('1.2.3')).toBe(false);
      expect(isValidVersion('1')).toBe(false);
      expect(isValidVersion('')).toBe(false);
      expect(isValidVersion('a.b')).toBe(false);
    });

    it('should return false for negative versions', () => {
      expect(isValidVersion('-1.2')).toBe(false);
      expect(isValidVersion('1.-2')).toBe(false);
    });

    it('should return true for versions with leading zeros', () => {
      expect(isValidVersion('01.02')).toBe(true);
    });
  });

  describe('formatVersion', () => {
    it('should format valid version string with v prefix', () => {
      expect(formatVersion('1.2')).toBe('v1.2');
    });

    it('should format version 0.0', () => {
      expect(formatVersion('0.0')).toBe('v0.0');
    });

    it('should format large version numbers', () => {
      expect(formatVersion('99.999')).toBe('v99.999');
    });

    it('should return v0.0 for invalid version string', () => {
      expect(formatVersion('invalid')).toBe('v0.0');
    });

    it('should format ParsedVersion object', () => {
      const parsed: ParsedVersion = {
        major: 1,
        minor: 2,
        raw: '1.2',
        isValid: true,
      };
      expect(formatVersion(parsed)).toBe('v1.2');
    });

    it('should return v0.0 for invalid ParsedVersion object', () => {
      const parsed: ParsedVersion = {
        major: 0,
        minor: 0,
        raw: 'invalid',
        isValid: false,
      };
      expect(formatVersion(parsed)).toBe('v0.0');
    });

    it('should handle version with leading zeros', () => {
      expect(formatVersion('01.02')).toBe('v1.2');
    });
  });

  describe('version workflow integration', () => {
    it('should support typical version progression', () => {
      let version = '1.0';
      
      // First update
      version = calculateNextVersion(version);
      expect(version).toBe('1.1');
      expect(isValidVersion(version)).toBe(true);
      
      // Second update
      version = calculateNextVersion(version);
      expect(version).toBe('1.2');
      
      // Third update
      version = calculateNextVersion(version);
      expect(version).toBe('1.3');
    });

    it('should maintain version ordering', () => {
      const versions = ['1.0', '1.1', '1.2', '1.3', '2.0', '2.1'];
      
      for (let i = 0; i < versions.length - 1; i++) {
        expect(compareVersions(versions[i], versions[i + 1])).toBe(-1);
        expect(compareVersions(versions[i + 1], versions[i])).toBe(1);
      }
    });

    it('should parse and format consistently', () => {
      const version = '1.2';
      const parsed = parseVersion(version);
      const formatted = formatVersion(parsed);
      
      expect(formatted).toBe('v1.2');
      expect(parsed.isValid).toBe(true);
    });

    it('should handle edge case of version 0.0', () => {
      const version = '0.0';
      expect(isValidVersion(version)).toBe(true);
      expect(calculateNextVersion(version)).toBe('0.1');
      expect(formatVersion(version)).toBe('v0.0');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null-like inputs gracefully', () => {
      // These should not throw, but return invalid results
      expect(parseVersion('null').isValid).toBe(false);
      expect(parseVersion('undefined').isValid).toBe(false);
      expect(calculateNextVersion('null')).toBe('1.1');
    });

    it('should handle whitespace', () => {
      expect(parseVersion(' 1.2 ').isValid).toBe(false);
      expect(parseVersion('1 . 2').isValid).toBe(false);
    });

    it('should handle special characters', () => {
      expect(parseVersion('1.2!').isValid).toBe(false);
      expect(parseVersion('v1.2').isValid).toBe(false);
      expect(parseVersion('1.2.0').isValid).toBe(false);
    });

    it('should handle very large numbers', () => {
      const result = parseVersion('999999.999999');
      expect(result.isValid).toBe(true);
      expect(result.major).toBe(999999);
      expect(result.minor).toBe(999999);
    });

    it('should handle floating point strings', () => {
      expect(parseVersion('1.2.5').isValid).toBe(false);
      expect(parseVersion('1.5.0').isValid).toBe(false);
    });
  });

  /**
   * Property-Based Tests for Version Calculation
   * 
   * **Validates: Requirement 20 (Enhanced Version Control User Experience)**
   * 
   * These tests use fast-check to verify universal properties that should hold
   * for all valid inputs, ensuring the version calculation logic is correct
   * across the entire input space.
   */
  describe('property-based tests', () => {
    // Arbitrary for generating valid version strings
    const validVersionArb = fc.tuple(
      fc.nat({ max: 999 }), // major version
      fc.nat({ max: 999 })  // minor version
    ).map(([major, minor]) => `${major}.${minor}`);

    describe('parseVersion properties', () => {
      it('property: parsing a valid version should always succeed', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            const parsed = parseVersion(version);
            expect(parsed.isValid).toBe(true);
            expect(parsed.raw).toBe(version);
          })
        );
      });

      it('property: parsed major and minor should match original', () => {
        fc.assert(
          fc.property(
            fc.nat({ max: 999 }),
            fc.nat({ max: 999 }),
            (major, minor) => {
              const version = `${major}.${minor}`;
              const parsed = parseVersion(version);
              expect(parsed.major).toBe(major);
              expect(parsed.minor).toBe(minor);
              expect(parsed.isValid).toBe(true);
            }
          )
        );
      });

      it('property: parsing should be idempotent', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            const parsed1 = parseVersion(version);
            const parsed2 = parseVersion(version);
            expect(parsed1).toEqual(parsed2);
          })
        );
      });

      it('property: invalid versions should always have isValid=false', () => {
        fc.assert(
          fc.property(
            fc.oneof(
              fc.string().filter(s => !/^\d+\.\d+$/.test(s)), // strings that don't match pattern
              fc.constant(''),
              fc.constant('1.2.3'),
              fc.constant('a.b'),
              fc.constant('1'),
            ),
            (invalidVersion) => {
              const parsed = parseVersion(invalidVersion);
              expect(parsed.isValid).toBe(false);
              expect(parsed.major).toBe(0);
              expect(parsed.minor).toBe(0);
            }
          )
        );
      });
    });

    describe('calculateNextVersion properties', () => {
      it('property: next version should always increment minor by 1', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            const parsed = parseVersion(version);
            const next = calculateNextVersion(version);
            const parsedNext = parseVersion(next);
            
            expect(parsedNext.isValid).toBe(true);
            expect(parsedNext.major).toBe(parsed.major);
            expect(parsedNext.minor).toBe(parsed.minor + 1);
          })
        );
      });

      it('property: next version should always be greater than current', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            const next = calculateNextVersion(version);
            expect(compareVersions(next, version)).toBe(1);
            expect(compareVersions(version, next)).toBe(-1);
          })
        );
      });

      it('property: calculating next version twice should increment by 2', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            const parsed = parseVersion(version);
            const next1 = calculateNextVersion(version);
            const next2 = calculateNextVersion(next1);
            const parsedNext2 = parseVersion(next2);
            
            expect(parsedNext2.major).toBe(parsed.major);
            expect(parsedNext2.minor).toBe(parsed.minor + 2);
          })
        );
      });

      it('property: next version should always be valid', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            const next = calculateNextVersion(version);
            expect(isValidVersion(next)).toBe(true);
          })
        );
      });

      it('property: invalid versions should return default 1.1', () => {
        fc.assert(
          fc.property(
            fc.string().filter(s => !/^\d+\.\d+$/.test(s)),
            (invalidVersion) => {
              const next = calculateNextVersion(invalidVersion);
              expect(next).toBe('1.1');
            }
          )
        );
      });
    });

    describe('compareVersions properties', () => {
      it('property: version comparison should be reflexive (v == v)', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            expect(compareVersions(version, version)).toBe(0);
          })
        );
      });

      it('property: version comparison should be antisymmetric', () => {
        fc.assert(
          fc.property(validVersionArb, validVersionArb, (v1, v2) => {
            const result1 = compareVersions(v1, v2);
            const result2 = compareVersions(v2, v1);
            
            if (result1 === 0) {
              expect(result2).toBe(0);
            } else if (result1 === 1) {
              expect(result2).toBe(-1);
            } else {
              expect(result2).toBe(1);
            }
          })
        );
      });

      it('property: version comparison should be transitive', () => {
        fc.assert(
          fc.property(
            validVersionArb,
            validVersionArb,
            validVersionArb,
            (v1, v2, v3) => {
              const cmp12 = compareVersions(v1, v2);
              const cmp23 = compareVersions(v2, v3);
              const cmp13 = compareVersions(v1, v3);
              
              // If v1 < v2 and v2 < v3, then v1 < v3
              if (cmp12 === -1 && cmp23 === -1) {
                expect(cmp13).toBe(-1);
              }
              // If v1 > v2 and v2 > v3, then v1 > v3
              if (cmp12 === 1 && cmp23 === 1) {
                expect(cmp13).toBe(1);
              }
              // If v1 == v2 and v2 == v3, then v1 == v3
              if (cmp12 === 0 && cmp23 === 0) {
                expect(cmp13).toBe(0);
              }
            }
          )
        );
      });

      it('property: higher major version should always be greater', () => {
        fc.assert(
          fc.property(
            fc.nat({ max: 999 }),
            fc.nat({ max: 999 }),
            fc.nat({ max: 999 }),
            fc.nat({ max: 999 }),
            (major1, minor1, major2, minor2) => {
              fc.pre(major1 < major2); // precondition: major1 < major2
              
              const v1 = `${major1}.${minor1}`;
              const v2 = `${major2}.${minor2}`;
              
              expect(compareVersions(v1, v2)).toBe(-1);
              expect(compareVersions(v2, v1)).toBe(1);
            }
          )
        );
      });

      it('property: when major equal, higher minor should be greater', () => {
        fc.assert(
          fc.property(
            fc.nat({ max: 999 }),
            fc.nat({ max: 999 }),
            fc.nat({ max: 999 }),
            (major, minor1, minor2) => {
              fc.pre(minor1 < minor2); // precondition: minor1 < minor2
              
              const v1 = `${major}.${minor1}`;
              const v2 = `${major}.${minor2}`;
              
              expect(compareVersions(v1, v2)).toBe(-1);
              expect(compareVersions(v2, v1)).toBe(1);
            }
          )
        );
      });
    });

    describe('isValidVersion properties', () => {
      it('property: valid format should always return true', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            expect(isValidVersion(version)).toBe(true);
          })
        );
      });

      it('property: isValidVersion should match parseVersion.isValid', () => {
        fc.assert(
          fc.property(fc.string(), (version) => {
            const parsed = parseVersion(version);
            expect(isValidVersion(version)).toBe(parsed.isValid);
          })
        );
      });
    });

    describe('formatVersion properties', () => {
      it('property: formatted version should always start with v', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            const formatted = formatVersion(version);
            expect(formatted.startsWith('v')).toBe(true);
          })
        );
      });

      it('property: formatting valid version should preserve numbers', () => {
        fc.assert(
          fc.property(
            fc.nat({ max: 999 }),
            fc.nat({ max: 999 }),
            (major, minor) => {
              const version = `${major}.${minor}`;
              const formatted = formatVersion(version);
              expect(formatted).toBe(`v${major}.${minor}`);
            }
          )
        );
      });

      it('property: formatting ParsedVersion should match formatting string', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            const parsed = parseVersion(version);
            const formatted1 = formatVersion(version);
            const formatted2 = formatVersion(parsed);
            expect(formatted1).toBe(formatted2);
          })
        );
      });

      it('property: invalid versions should format to v0.0', () => {
        fc.assert(
          fc.property(
            fc.string().filter(s => !/^\d+\.\d+$/.test(s)),
            (invalidVersion) => {
              const formatted = formatVersion(invalidVersion);
              expect(formatted).toBe('v0.0');
            }
          )
        );
      });
    });

    describe('version workflow properties', () => {
      it('property: version sequence should be monotonically increasing', () => {
        fc.assert(
          fc.property(
            validVersionArb,
            fc.nat({ max: 10 }), // number of increments
            (startVersion, increments) => {
              let current = startVersion;
              const versions = [current];
              
              for (let i = 0; i < increments; i++) {
                current = calculateNextVersion(current);
                versions.push(current);
              }
              
              // Check that each version is less than the next
              for (let i = 0; i < versions.length - 1; i++) {
                expect(compareVersions(versions[i], versions[i + 1])).toBe(-1);
              }
            }
          )
        );
      });

      it('property: parse -> format -> parse should be consistent', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            const parsed1 = parseVersion(version);
            const formatted = formatVersion(parsed1);
            // Remove 'v' prefix and parse again
            const versionFromFormatted = formatted.substring(1);
            const parsed2 = parseVersion(versionFromFormatted);
            
            expect(parsed2.major).toBe(parsed1.major);
            expect(parsed2.minor).toBe(parsed1.minor);
            expect(parsed2.isValid).toBe(parsed1.isValid);
          })
        );
      });

      it('property: calculateNextVersion should never decrease version', () => {
        fc.assert(
          fc.property(validVersionArb, (version) => {
            const next = calculateNextVersion(version);
            const comparison = compareVersions(version, next);
            expect(comparison).toBeLessThanOrEqual(0); // -1 or 0, never 1
          })
        );
      });
    });
  });
});

/**
 * Version utility functions for WorkItem version management
 * Supports major.minor version format (e.g., "1.2")
 */

export interface ParsedVersion {
  major: number;
  minor: number;
  raw: string;
  isValid: boolean;
}

/**
 * Parse a version string into its components
 * @param version - Version string in format "major.minor" (e.g., "1.2")
 * @returns ParsedVersion object with major, minor, raw string, and validity flag
 * 
 * @example
 * parseVersion("1.2") // { major: 1, minor: 2, raw: "1.2", isValid: true }
 * parseVersion("invalid") // { major: 0, minor: 0, raw: "invalid", isValid: false }
 */
export function parseVersion(version: string): ParsedVersion {
  const parts = version.split('.');
  
  // Version must have exactly 2 parts (major.minor)
  if (parts.length !== 2) {
    return {
      major: 0,
      minor: 0,
      raw: version,
      isValid: false,
    };
  }
  
  // Check that both parts contain only digits (with optional leading zeros)
  const majorStr = parts[0];
  const minorStr = parts[1];
  
  if (!/^\d+$/.test(majorStr) || !/^\d+$/.test(minorStr)) {
    return {
      major: 0,
      minor: 0,
      raw: version,
      isValid: false,
    };
  }
  
  const major = parseInt(majorStr, 10);
  const minor = parseInt(minorStr, 10);
  
  // Both parts must be valid non-negative integers
  if (isNaN(major) || isNaN(minor) || major < 0 || minor < 0) {
    return {
      major: 0,
      minor: 0,
      raw: version,
      isValid: false,
    };
  }
  
  return {
    major,
    minor,
    raw: version,
    isValid: true,
  };
}

/**
 * Calculate the next version number by incrementing the minor version
 * @param currentVersion - Current version string (e.g., "1.2")
 * @returns Next version string (e.g., "1.3")
 * 
 * @example
 * calculateNextVersion("1.2") // "1.3"
 * calculateNextVersion("2.9") // "2.10"
 * calculateNextVersion("invalid") // "1.1" (fallback for invalid versions)
 */
export function calculateNextVersion(currentVersion: string): string {
  const parsed = parseVersion(currentVersion);
  
  // If version is invalid, return default next version
  if (!parsed.isValid) {
    return '1.1';
  }
  
  // Increment minor version
  return `${parsed.major}.${parsed.minor + 1}`;
}

/**
 * Compare two version strings
 * @param version1 - First version string
 * @param version2 - Second version string
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 * 
 * @example
 * compareVersions("1.2", "1.3") // -1
 * compareVersions("2.0", "1.9") // 1
 * compareVersions("1.5", "1.5") // 0
 */
export function compareVersions(version1: string, version2: string): number {
  const parsed1 = parseVersion(version1);
  const parsed2 = parseVersion(version2);
  
  // Invalid versions are considered less than valid versions
  if (!parsed1.isValid && !parsed2.isValid) return 0;
  if (!parsed1.isValid) return -1;
  if (!parsed2.isValid) return 1;
  
  // Compare major version first
  if (parsed1.major !== parsed2.major) {
    return parsed1.major < parsed2.major ? -1 : 1;
  }
  
  // If major versions are equal, compare minor version
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor < parsed2.minor ? -1 : 1;
  }
  
  // Versions are equal
  return 0;
}

/**
 * Check if a version string is valid
 * @param version - Version string to validate
 * @returns true if version is valid, false otherwise
 * 
 * @example
 * isValidVersion("1.2") // true
 * isValidVersion("invalid") // false
 * isValidVersion("1.2.3") // false (too many parts)
 */
export function isValidVersion(version: string): boolean {
  return parseVersion(version).isValid;
}

/**
 * Format a version for display
 * @param version - Version string or ParsedVersion object
 * @returns Formatted version string with "v" prefix (e.g., "v1.2")
 * 
 * @example
 * formatVersion("1.2") // "v1.2"
 * formatVersion({ major: 1, minor: 2, raw: "1.2", isValid: true }) // "v1.2"
 */
export function formatVersion(version: string | ParsedVersion): string {
  if (typeof version === 'string') {
    const parsed = parseVersion(version);
    return parsed.isValid ? `v${parsed.major}.${parsed.minor}` : 'v0.0';
  }
  
  return version.isValid ? `v${version.major}.${version.minor}` : 'v0.0';
}

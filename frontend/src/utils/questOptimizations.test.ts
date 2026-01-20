/**
 * Tests for Meta Quest Device Optimizations
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectQuestDevice,
  getQuestCapabilities,
  isQuestDevice,
  getQuestXRConfig,
  getQuestPerformanceSettings,
  applyQuestPolyfills,
  calculateOptimalRenderScale,
  getRecommendedTextSize,
  getDeviceInfoString,
  DEFAULT_COMFORT_SETTINGS,
  COMFORT_PRESET_SENSITIVE,
  COMFORT_PRESET_EXPERIENCED,
  type QuestDevice,
} from './questOptimizations';

describe('questOptimizations', () => {
  // Store original navigator
  const originalNavigator = global.navigator;

  // Helper to mock navigator.userAgent
  const mockUserAgent = (userAgent: string): void => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent },
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    // Reset navigator before each test
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe('detectQuestDevice', () => {
    it('should detect Quest 2 from user agent', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36 OculusBrowser/23.0');
      expect(detectQuestDevice()).toBe('quest-2');
    });

    it('should detect Quest 3 from user agent', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36 OculusBrowser/25.0');
      expect(detectQuestDevice()).toBe('quest-3');
    });

    it('should detect Quest Pro from user agent', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 12; Quest Pro) AppleWebKit/537.36 OculusBrowser/24.0');
      expect(detectQuestDevice()).toBe('quest-pro');
    });

    it('should detect unknown Quest device', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 14; Quest) AppleWebKit/537.36 OculusBrowser/26.0');
      expect(detectQuestDevice()).toBe('unknown-quest');
    });

    it('should return non-quest for desktop Chrome', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0');
      expect(detectQuestDevice()).toBe('non-quest');
    });

    it('should return non-quest for mobile Safari', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
      expect(detectQuestDevice()).toBe('non-quest');
    });

    it('should handle case-insensitive detection', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; QUEST 2) AppleWebKit/537.36');
      expect(detectQuestDevice()).toBe('quest-2');
    });

    it('should detect Oculus browser indicator', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 OculusBrowser/23.0');
      expect(detectQuestDevice()).toBe('unknown-quest');
    });
  });

  describe('getQuestCapabilities', () => {
    it('should return Quest 2 capabilities', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36');
      const capabilities = getQuestCapabilities();
      
      expect(capabilities).not.toBeNull();
      expect(capabilities?.device).toBe('quest-2');
      expect(capabilities?.maxRefreshRate).toBe(120);
      expect(capabilities?.recommendedRefreshRate).toBe(90);
      expect(capabilities?.hasAdvancedHandTracking).toBe(false);
      expect(capabilities?.hasEyeTracking).toBe(false);
      expect(capabilities?.hasColorPassthrough).toBe(false);
    });

    it('should return Quest 3 capabilities', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36');
      const capabilities = getQuestCapabilities();
      
      expect(capabilities).not.toBeNull();
      expect(capabilities?.device).toBe('quest-3');
      expect(capabilities?.maxRefreshRate).toBe(120);
      expect(capabilities?.hasAdvancedHandTracking).toBe(true);
      expect(capabilities?.hasColorPassthrough).toBe(true);
      expect(capabilities?.eyeResolution.width).toBe(2064);
    });

    it('should return Quest Pro capabilities', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 12; Quest Pro) AppleWebKit/537.36');
      const capabilities = getQuestCapabilities();
      
      expect(capabilities).not.toBeNull();
      expect(capabilities?.device).toBe('quest-pro');
      expect(capabilities?.hasEyeTracking).toBe(true);
      expect(capabilities?.hasAdvancedHandTracking).toBe(true);
      expect(capabilities?.maxRefreshRate).toBe(90);
    });

    it('should return null for non-Quest devices', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
      expect(getQuestCapabilities()).toBeNull();
    });
  });

  describe('isQuestDevice', () => {
    it('should return true for Quest devices', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36');
      expect(isQuestDevice()).toBe(true);
    });

    it('should return false for non-Quest devices', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
      expect(isQuestDevice()).toBe(false);
    });
  });

  describe('getQuestXRConfig', () => {
    it('should return optimized config for Quest 3', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36');
      const config = getQuestXRConfig();
      
      expect(config.requiredFeatures).toContain('local-floor');
      expect(config.optionalFeatures).toContain('hand-tracking');
      expect(config.optionalFeatures).toContain('plane-detection');
      expect(config.frameRate).toBe('high');
      expect(config.foveation).toBe(0.8);
    });

    it('should return optimized config for Quest Pro with eye tracking', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 12; Quest Pro) AppleWebKit/537.36');
      const config = getQuestXRConfig();
      
      expect(config.optionalFeatures).toContain('eye-tracking');
      expect(config.optionalFeatures).toContain('hand-tracking');
      expect(config.foveation).toBe(0.7);
    });

    it('should return default config for non-Quest devices', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
      const config = getQuestXRConfig();
      
      expect(config.requiredFeatures).toContain('local-floor');
      expect(config.frameRate).toBe('high');
      expect(config.foveation).toBe(1);
    });
  });

  describe('getQuestPerformanceSettings', () => {
    it('should return conservative settings for Quest 2', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36');
      const settings = getQuestPerformanceSettings();
      
      expect(settings.maxNodes).toBe(200);
      expect(settings.maxEdges).toBe(400);
      expect(settings.shadowQuality).toBe(0);
      expect(settings.antialiasSamples).toBe(0);
      expect(settings.textureResolution).toBe(0.8);
    });

    it('should return better settings for Quest 3', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36');
      const settings = getQuestPerformanceSettings();
      
      expect(settings.maxNodes).toBe(300);
      expect(settings.maxEdges).toBe(600);
      expect(settings.shadowQuality).toBe(1);
      expect(settings.antialiasSamples).toBe(2);
      expect(settings.textureResolution).toBe(1.0);
    });

    it('should return high-end settings for non-Quest devices', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
      const settings = getQuestPerformanceSettings();
      
      expect(settings.maxNodes).toBe(500);
      expect(settings.maxEdges).toBe(1000);
      expect(settings.shadowQuality).toBe(2);
      expect(settings.antialiasSamples).toBe(4);
    });

    it('should always enable instancing and LOD', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36');
      const settings = getQuestPerformanceSettings();
      
      expect(settings.useInstancing).toBe(true);
      expect(settings.useLOD).toBe(true);
      expect(settings.useFrustumCulling).toBe(true);
    });
  });

  describe('calculateOptimalRenderScale', () => {
    it('should maintain scale when hitting target FPS', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36');
      const scale = calculateOptimalRenderScale(90, 90);
      expect(scale).toBeCloseTo(1.0, 1);
    });

    it('should increase scale when exceeding target FPS', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36');
      const scale = calculateOptimalRenderScale(90, 100);
      expect(scale).toBeGreaterThan(1.0);
      expect(scale).toBeLessThanOrEqual(1.2);
    });

    it('should decrease scale when below target FPS', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36');
      const scale = calculateOptimalRenderScale(90, 60);
      expect(scale).toBeLessThan(1.0);
      expect(scale).toBeGreaterThanOrEqual(0.5);
    });

    it('should not go below minimum scale', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36');
      const scale = calculateOptimalRenderScale(90, 20);
      expect(scale).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('getRecommendedTextSize', () => {
    it('should return larger size for farther distances', () => {
      const nearSize = getRecommendedTextSize(1);
      const farSize = getRecommendedTextSize(3);
      expect(farSize).toBeGreaterThan(nearSize);
    });

    it('should return reasonable size for typical VR distance', () => {
      const size = getRecommendedTextSize(2); // 2 meters is typical
      expect(size).toBeGreaterThan(0.01);
      expect(size).toBeLessThan(0.2);
    });

    it('should scale linearly with distance', () => {
      const size1 = getRecommendedTextSize(1);
      const size2 = getRecommendedTextSize(2);
      expect(size2 / size1).toBeCloseTo(2, 1);
    });
  });

  describe('getDeviceInfoString', () => {
    it('should return formatted string for Quest device', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36');
      const info = getDeviceInfoString();
      
      expect(info).toContain('quest-2');
      expect(info).toContain('120Hz');
      expect(info).toContain('1832x1920');
    });

    it('should return non-Quest info for desktop', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
      const info = getDeviceInfoString();
      
      expect(info).toContain('Non-Quest');
    });
  });

  describe('Comfort Settings', () => {
    it('should have valid default comfort settings', () => {
      expect(DEFAULT_COMFORT_SETTINGS.vignetteIntensity).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_COMFORT_SETTINGS.vignetteIntensity).toBeLessThanOrEqual(1);
      expect(DEFAULT_COMFORT_SETTINGS.snapTurnAngle).toBeGreaterThan(0);
      expect(DEFAULT_COMFORT_SETTINGS.movementSpeed).toBeGreaterThan(0);
    });

    it('should have more conservative sensitive preset', () => {
      expect(COMFORT_PRESET_SENSITIVE.vignetteIntensity).toBeGreaterThan(DEFAULT_COMFORT_SETTINGS.vignetteIntensity);
      expect(COMFORT_PRESET_SENSITIVE.useSnapTurn).toBe(true);
      expect(COMFORT_PRESET_SENSITIVE.useTeleportation).toBe(true);
      expect(COMFORT_PRESET_SENSITIVE.movementSpeed).toBeLessThan(DEFAULT_COMFORT_SETTINGS.movementSpeed);
    });

    it('should have less restrictive experienced preset', () => {
      expect(COMFORT_PRESET_EXPERIENCED.enableVignette).toBe(false);
      expect(COMFORT_PRESET_EXPERIENCED.useSnapTurn).toBe(false);
      expect(COMFORT_PRESET_EXPERIENCED.useTeleportation).toBe(false);
      expect(COMFORT_PRESET_EXPERIENCED.movementSpeed).toBeGreaterThan(DEFAULT_COMFORT_SETTINGS.movementSpeed);
    });
  });

  describe('applyQuestPolyfills', () => {
    it('should not throw when called', () => {
      expect(() => applyQuestPolyfills()).not.toThrow();
    });

    it('should handle missing window gracefully', () => {
      const originalWindow = global.window;
      // @ts-expect-error - intentionally setting to undefined for test
      global.window = undefined;
      
      expect(() => applyQuestPolyfills()).not.toThrow();
      
      global.window = originalWindow;
    });
  });
});

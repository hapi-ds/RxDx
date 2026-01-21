/**
 * Meta Quest Device Optimizations
 * Provides device-specific optimizations, polyfills, and utilities for Meta Quest devices
 * 
 * Supports: Meta Quest 2, Quest 3, Quest Pro
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://developer.oculus.com/documentation/web/browser-webxr/
 */

// ============================================================================
// Device Detection
// ============================================================================

/**
 * Meta Quest device types
 */
export type QuestDevice = 'quest-2' | 'quest-3' | 'quest-pro' | 'unknown-quest' | 'non-quest';

/**
 * Device capabilities based on Quest model
 */
export interface QuestDeviceCapabilities {
  /** Device identifier */
  device: QuestDevice;
  /** Maximum supported refresh rate in Hz */
  maxRefreshRate: number;
  /** Recommended refresh rate for optimal performance */
  recommendedRefreshRate: number;
  /** Whether device supports hand tracking v2.2 */
  hasAdvancedHandTracking: boolean;
  /** Whether device supports eye tracking */
  hasEyeTracking: boolean;
  /** Whether device supports mixed reality passthrough */
  hasMixedReality: boolean;
  /** Whether device supports color passthrough */
  hasColorPassthrough: boolean;
  /** Recommended foveation level (0-1) */
  recommendedFoveation: number;
  /** Per-eye resolution */
  eyeResolution: { width: number; height: number };
  /** Whether device supports spatial anchors */
  hasSpatialAnchors: boolean;
}

/**
 * Device capability presets for each Quest model
 */
const QUEST_CAPABILITIES: Record<Exclude<QuestDevice, 'non-quest'>, QuestDeviceCapabilities> = {
  'quest-2': {
    device: 'quest-2',
    maxRefreshRate: 120,
    recommendedRefreshRate: 90,
    hasAdvancedHandTracking: false,
    hasEyeTracking: false,
    hasMixedReality: true,
    hasColorPassthrough: false,
    recommendedFoveation: 1,
    eyeResolution: { width: 1832, height: 1920 },
    hasSpatialAnchors: true,
  },
  'quest-3': {
    device: 'quest-3',
    maxRefreshRate: 120,
    recommendedRefreshRate: 90,
    hasAdvancedHandTracking: true,
    hasEyeTracking: false,
    hasMixedReality: true,
    hasColorPassthrough: true,
    recommendedFoveation: 0.8,
    eyeResolution: { width: 2064, height: 2208 },
    hasSpatialAnchors: true,
  },
  'quest-pro': {
    device: 'quest-pro',
    maxRefreshRate: 90,
    recommendedRefreshRate: 90,
    hasAdvancedHandTracking: true,
    hasEyeTracking: true,
    hasMixedReality: true,
    hasColorPassthrough: true,
    recommendedFoveation: 0.7,
    eyeResolution: { width: 1800, height: 1920 },
    hasSpatialAnchors: true,
  },
  'unknown-quest': {
    device: 'unknown-quest',
    maxRefreshRate: 90,
    recommendedRefreshRate: 72,
    hasAdvancedHandTracking: false,
    hasEyeTracking: false,
    hasMixedReality: false,
    hasColorPassthrough: false,
    recommendedFoveation: 1,
    eyeResolution: { width: 1832, height: 1920 },
    hasSpatialAnchors: false,
  },
};

/**
 * Detect if running on a Meta Quest device and identify the model
 * Uses User-Agent string analysis for device identification
 */
export function detectQuestDevice(): QuestDevice {
  if (typeof navigator === 'undefined') {
    return 'non-quest';
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for Quest browser indicators
  if (!userAgent.includes('quest') && !userAgent.includes('oculus')) {
    // Additional check for Meta Quest Browser
    if (!userAgent.includes('oculusbrowser') && !userAgent.includes('meta')) {
      return 'non-quest';
    }
  }

  // Detect specific Quest model
  if (userAgent.includes('quest 3') || userAgent.includes('quest3')) {
    return 'quest-3';
  }
  
  if (userAgent.includes('quest pro') || userAgent.includes('questpro')) {
    return 'quest-pro';
  }
  
  if (userAgent.includes('quest 2') || userAgent.includes('quest2')) {
    return 'quest-2';
  }

  // Generic Quest detection
  if (userAgent.includes('quest') || userAgent.includes('oculus')) {
    return 'unknown-quest';
  }

  return 'non-quest';
}

/**
 * Get device capabilities for the current Quest device
 */
export function getQuestCapabilities(): QuestDeviceCapabilities | null {
  const device = detectQuestDevice();
  
  if (device === 'non-quest') {
    return null;
  }

  return QUEST_CAPABILITIES[device];
}

/**
 * Check if running on any Meta Quest device
 */
export function isQuestDevice(): boolean {
  return detectQuestDevice() !== 'non-quest';
}

// ============================================================================
// XR Session Configuration
// ============================================================================

/**
 * Optimized XR session configuration for Quest devices
 */
export interface QuestXRConfig {
  /** Required WebXR features */
  requiredFeatures: string[];
  /** Optional WebXR features */
  optionalFeatures: string[];
  /** Frame rate preference */
  frameRate: 'high' | 'low' | number;
  /** Foveation level (0-1) */
  foveation: number;
  /** Reference space type */
  referenceSpace: XRReferenceSpaceType;
}

/**
 * Get optimized XR configuration for the current Quest device
 */
export function getQuestXRConfig(): QuestXRConfig {
  const capabilities = getQuestCapabilities();
  
  // Default configuration for non-Quest or unknown devices
  const defaultConfig: QuestXRConfig = {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['bounded-floor', 'hand-tracking', 'layers'],
    frameRate: 'high',
    foveation: 1,
    referenceSpace: 'local-floor',
  };

  if (!capabilities) {
    return defaultConfig;
  }

  // Build optimized configuration based on device capabilities
  const config: QuestXRConfig = {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['bounded-floor', 'layers'],
    frameRate: capabilities.recommendedRefreshRate >= 90 ? 'high' : 72,
    foveation: capabilities.recommendedFoveation,
    referenceSpace: 'local-floor',
  };

  // Add hand tracking if supported
  if (capabilities.hasAdvancedHandTracking) {
    config.optionalFeatures.push('hand-tracking');
  }

  // Add eye tracking for Quest Pro
  if (capabilities.hasEyeTracking) {
    config.optionalFeatures.push('eye-tracking');
  }

  // Add spatial anchors if supported
  if (capabilities.hasSpatialAnchors) {
    config.optionalFeatures.push('anchors');
  }

  // Add mixed reality features for devices with passthrough
  if (capabilities.hasMixedReality) {
    config.optionalFeatures.push('plane-detection');
    config.optionalFeatures.push('hit-test');
  }

  return config;
}

// ============================================================================
// Performance Optimizations
// ============================================================================

/**
 * Performance settings for Quest devices
 */
export interface QuestPerformanceSettings {
  /** Maximum number of nodes to render */
  maxNodes: number;
  /** Maximum number of edges to render */
  maxEdges: number;
  /** Whether to use instanced rendering */
  useInstancing: boolean;
  /** Whether to use LOD (Level of Detail) */
  useLOD: boolean;
  /** LOD distance thresholds */
  lodDistances: { high: number; medium: number; low: number };
  /** Whether to enable frustum culling */
  useFrustumCulling: boolean;
  /** Shadow quality (0 = off, 1 = low, 2 = medium, 3 = high) */
  shadowQuality: number;
  /** Anti-aliasing samples (0, 2, 4, 8) */
  antialiasSamples: number;
  /** Texture resolution multiplier (0.5 - 2.0) */
  textureResolution: number;
  /** Force simulation update frequency (1 = every frame, 2 = every other frame) */
  simulationUpdateFrequency: number;
}

/**
 * Get optimized performance settings for the current Quest device
 */
export function getQuestPerformanceSettings(): QuestPerformanceSettings {
  const capabilities = getQuestCapabilities();

  // Default settings for non-Quest devices (desktop/high-end)
  const defaultSettings: QuestPerformanceSettings = {
    maxNodes: 500,
    maxEdges: 1000,
    useInstancing: true,
    useLOD: true,
    lodDistances: { high: 5, medium: 15, low: 30 },
    useFrustumCulling: true,
    shadowQuality: 2,
    antialiasSamples: 4,
    textureResolution: 1.0,
    simulationUpdateFrequency: 1,
  };

  if (!capabilities) {
    return defaultSettings;
  }

  // Optimize based on device
  switch (capabilities.device) {
    case 'quest-3':
      // Quest 3 has better GPU, can handle more
      return {
        maxNodes: 300,
        maxEdges: 600,
        useInstancing: true,
        useLOD: true,
        lodDistances: { high: 4, medium: 12, low: 25 },
        useFrustumCulling: true,
        shadowQuality: 1,
        antialiasSamples: 2,
        textureResolution: 1.0,
        simulationUpdateFrequency: 1,
      };

    case 'quest-pro':
      // Quest Pro has good GPU but higher resolution
      return {
        maxNodes: 250,
        maxEdges: 500,
        useInstancing: true,
        useLOD: true,
        lodDistances: { high: 4, medium: 10, low: 20 },
        useFrustumCulling: true,
        shadowQuality: 1,
        antialiasSamples: 2,
        textureResolution: 0.9,
        simulationUpdateFrequency: 1,
      };

    case 'quest-2':
    case 'unknown-quest':
    default:
      // Quest 2 / unknown - most conservative settings
      return {
        maxNodes: 200,
        maxEdges: 400,
        useInstancing: true,
        useLOD: true,
        lodDistances: { high: 3, medium: 8, low: 15 },
        useFrustumCulling: true,
        shadowQuality: 0,
        antialiasSamples: 0,
        textureResolution: 0.8,
        simulationUpdateFrequency: 2,
      };
  }
}

// ============================================================================
// Polyfills and Compatibility
// ============================================================================

/**
 * Apply Quest-specific polyfills and compatibility fixes
 * Should be called early in application initialization
 */
export function applyQuestPolyfills(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Polyfill for GamepadHapticActuator.pulse if not available
  if (typeof GamepadHapticActuator !== 'undefined') {
    const proto = GamepadHapticActuator.prototype;
    if (!proto.pulse) {
      // Some browsers use playEffect instead of pulse
      proto.pulse = function(value: number, duration: number): Promise<boolean> {
        if ('playEffect' in this) {
          return (this as unknown as { playEffect: (type: string, params: object) => Promise<string> })
            .playEffect('dual-rumble', {
              duration,
              strongMagnitude: value,
              weakMagnitude: value,
            })
            .then(() => true)
            .catch(() => false);
        }
        return Promise.resolve(false);
      };
    }
  }

  // Ensure requestAnimationFrame uses high-resolution timing
  if (isQuestDevice()) {
    // Quest browser may benefit from explicit high-resolution timing
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      return originalRAF((time) => {
        // Use performance.now() for more accurate timing if available
        const highResTime = typeof performance !== 'undefined' ? performance.now() : time;
        callback(highResTime);
      });
    };
  }
}

/**
 * Check if WebXR hand tracking is available
 */
export async function isHandTrackingAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.xr) {
    return false;
  }

  try {
    // Check if immersive-vr with hand-tracking is supported
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!supported) {
      return false;
    }

    // Try to check for hand-tracking feature
    // Note: This is a best-effort check; actual availability is determined at session request
    const capabilities = getQuestCapabilities();
    return capabilities?.hasAdvancedHandTracking ?? false;
  } catch {
    return false;
  }
}

/**
 * Check if WebXR eye tracking is available (Quest Pro only)
 */
export async function isEyeTrackingAvailable(): Promise<boolean> {
  const capabilities = getQuestCapabilities();
  return capabilities?.hasEyeTracking ?? false;
}

// ============================================================================
// Comfort and Accessibility
// ============================================================================

/**
 * Comfort settings for VR experience
 */
export interface VRComfortSettings {
  /** Enable vignette during movement to reduce motion sickness */
  enableVignette: boolean;
  /** Vignette intensity (0-1) */
  vignetteIntensity: number;
  /** Use snap turning instead of smooth turning */
  useSnapTurn: boolean;
  /** Snap turn angle in degrees */
  snapTurnAngle: number;
  /** Movement speed multiplier */
  movementSpeed: number;
  /** Enable teleportation instead of smooth locomotion */
  useTeleportation: boolean;
  /** Seated mode (adjusts height and controls) */
  seatedMode: boolean;
  /** Dominant hand for primary interactions */
  dominantHand: 'left' | 'right';
}

/**
 * Default comfort settings optimized for most users
 */
export const DEFAULT_COMFORT_SETTINGS: VRComfortSettings = {
  enableVignette: true,
  vignetteIntensity: 0.3,
  useSnapTurn: false,
  snapTurnAngle: 45,
  movementSpeed: 1.0,
  useTeleportation: false,
  seatedMode: false,
  dominantHand: 'right',
};

/**
 * Comfort preset for users sensitive to motion sickness
 */
export const COMFORT_PRESET_SENSITIVE: VRComfortSettings = {
  enableVignette: true,
  vignetteIntensity: 0.5,
  useSnapTurn: true,
  snapTurnAngle: 30,
  movementSpeed: 0.7,
  useTeleportation: true,
  seatedMode: false,
  dominantHand: 'right',
};

/**
 * Comfort preset for experienced VR users
 */
export const COMFORT_PRESET_EXPERIENCED: VRComfortSettings = {
  enableVignette: false,
  vignetteIntensity: 0,
  useSnapTurn: false,
  snapTurnAngle: 45,
  movementSpeed: 1.5,
  useTeleportation: false,
  seatedMode: false,
  dominantHand: 'right',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate optimal render scale based on device and performance target
 * @param targetFPS Target frame rate (72, 90, or 120)
 * @param currentFPS Current measured frame rate
 */
export function calculateOptimalRenderScale(
  targetFPS: number,
  currentFPS: number
): number {
  const capabilities = getQuestCapabilities();
  
  if (!capabilities) {
    return 1.0;
  }

  // If we're hitting target, maintain or slightly increase
  if (currentFPS >= targetFPS * 0.95) {
    return Math.min(1.2, 1.0 + (currentFPS - targetFPS) / targetFPS * 0.1);
  }

  // If we're below target, reduce render scale
  const ratio = currentFPS / targetFPS;
  return Math.max(0.5, ratio * 0.9);
}

/**
 * Get recommended text size for VR based on viewing distance
 * @param distanceMeters Distance from user to text in meters
 */
export function getRecommendedTextSize(distanceMeters: number): number {
  // Based on Meta's VR text guidelines
  // Minimum readable text is ~0.5 degrees of visual angle
  // Comfortable reading is ~1-2 degrees
  const degreesPerMeter = 57.2958; // radians to degrees conversion
  const targetDegrees = 1.5; // comfortable reading size
  
  return (distanceMeters * targetDegrees) / degreesPerMeter;
}

/**
 * Check if the current session is in VR mode
 */
export function isInVRSession(): boolean {
  if (typeof navigator === 'undefined' || !navigator.xr) {
    return false;
  }

  // Check for active XR session via document
  const xrSession = (document as unknown as { xrSession?: XRSession }).xrSession;
  return xrSession !== undefined && xrSession !== null;
}

/**
 * Format device info for debugging/logging
 */
export function getDeviceInfoString(): string {
  const device = detectQuestDevice();
  const capabilities = getQuestCapabilities();

  if (!capabilities) {
    return `Device: Non-Quest (${navigator.userAgent.substring(0, 50)}...)`;
  }

  return [
    `Device: ${device}`,
    `Max Refresh: ${capabilities.maxRefreshRate}Hz`,
    `Resolution: ${capabilities.eyeResolution.width}x${capabilities.eyeResolution.height}`,
    `Hand Tracking: ${capabilities.hasAdvancedHandTracking ? 'v2.2' : 'v2.0'}`,
    `Eye Tracking: ${capabilities.hasEyeTracking ? 'Yes' : 'No'}`,
    `Mixed Reality: ${capabilities.hasMixedReality ? 'Yes' : 'No'}`,
  ].join(' | ');
}

// Types are already exported at their definition points above

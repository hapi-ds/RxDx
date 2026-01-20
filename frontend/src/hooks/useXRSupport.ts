/**
 * useXRSupport Hook
 * Detects WebXR capabilities and provides XR session management utilities
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * XR session modes supported by WebXR
 */
export type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';

/**
 * XR reference space types for different experiences
 * - local: Seated experience, origin at initial position
 * - local-floor: Standing experience, origin at floor level
 * - bounded-floor: Room-scale experience with defined boundaries
 * - unbounded: Large-scale AR experience
 * - viewer: Head-locked content
 */
export type XRReferenceSpaceType = 
  | 'viewer' 
  | 'local' 
  | 'local-floor' 
  | 'bounded-floor' 
  | 'unbounded';

/**
 * XR feature flags for optional capabilities
 */
export interface XRFeatureFlags {
  /** Hand tracking support */
  handTracking: boolean;
  /** Controller support */
  controllers: boolean;
  /** Gaze/eye tracking support */
  gaze: boolean;
  /** Plane detection (AR) */
  planeDetection: boolean;
  /** Hit testing (AR) */
  hitTest: boolean;
  /** Anchors (AR) */
  anchors: boolean;
  /** Depth sensing */
  depthSensing: boolean;
  /** Light estimation (AR) */
  lightEstimation: boolean;
}

/**
 * XR support status for different session modes
 */
export interface XRSupportStatus {
  /** Whether WebXR API is available in the browser */
  isWebXRSupported: boolean;
  /** Whether immersive VR sessions are supported */
  isVRSupported: boolean;
  /** Whether immersive AR sessions are supported */
  isARSupported: boolean;
  /** Whether inline (non-immersive) sessions are supported */
  isInlineSupported: boolean;
  /** Whether the support check is still in progress */
  isChecking: boolean;
  /** Error message if support check failed */
  error: string | null;
  /** Detected XR features */
  features: Partial<XRFeatureFlags>;
}

/**
 * XR session state
 */
export interface XRSessionState {
  /** Whether an XR session is currently active */
  isSessionActive: boolean;
  /** Current session mode (if active) */
  currentMode: XRSessionMode | null;
  /** Current visibility state */
  visibilityState: XRVisibilityState | null;
  /** Session start timestamp */
  sessionStartTime: number | null;
  /** Session error (if any) */
  sessionError: string | null;
}

/**
 * XR session event handlers
 */
export interface XRSessionEventHandlers {
  /** Called when XR session starts */
  onSessionStart?: (session: XRSession, mode: XRSessionMode) => void;
  /** Called when XR session ends */
  onSessionEnd?: (mode: XRSessionMode, duration: number) => void;
  /** Called when visibility state changes */
  onVisibilityChange?: (state: XRVisibilityState) => void;
  /** Called when session error occurs */
  onSessionError?: (error: Error, mode: XRSessionMode) => void;
  /** Called when input sources change */
  onInputSourcesChange?: (event: XRInputSourceChangeEvent) => void;
}

/**
 * XR session configuration options
 */
export interface XRSessionConfig {
  /** Preferred reference space type for VR */
  vrReferenceSpace?: XRReferenceSpaceType;
  /** Preferred reference space type for AR */
  arReferenceSpace?: XRReferenceSpaceType;
  /** Required features for VR session */
  vrRequiredFeatures?: string[];
  /** Optional features for VR session */
  vrOptionalFeatures?: string[];
  /** Required features for AR session */
  arRequiredFeatures?: string[];
  /** Optional features for AR session */
  arOptionalFeatures?: string[];
  /** Frame rate preference ('high' | 'low' | number) */
  frameRate?: 'high' | 'low' | number;
  /** Foveation level (0-1, higher = more foveation) */
  foveation?: number;
}

/**
 * Default XR session configuration
 */
export const DEFAULT_XR_CONFIG: XRSessionConfig = {
  vrReferenceSpace: 'local-floor',
  arReferenceSpace: 'local-floor',
  vrRequiredFeatures: ['local-floor'],
  vrOptionalFeatures: ['bounded-floor', 'hand-tracking', 'layers'],
  arRequiredFeatures: ['local-floor'],
  arOptionalFeatures: ['hit-test', 'plane-detection', 'anchors', 'light-estimation'],
  frameRate: 'high',
  foveation: 1,
};

/**
 * Return type for useXRSupport hook
 */
export interface UseXRSupportReturn {
  /** XR support status */
  support: XRSupportStatus;
  /** Current XR session state */
  sessionState: XRSessionState;
  /** Check if a specific session mode is supported */
  checkSessionSupport: (mode: XRSessionMode) => Promise<boolean>;
  /** Request an XR session */
  requestSession: (mode: XRSessionMode) => Promise<XRSession | null>;
  /** End the current XR session */
  endSession: () => Promise<void>;
  /** Get the recommended reference space for a mode */
  getRecommendedReferenceSpace: (mode: XRSessionMode) => XRReferenceSpaceType;
  /** Refresh support status */
  refreshSupport: () => Promise<void>;
}

/**
 * useXRSupport - Hook for detecting and managing WebXR capabilities
 * 
 * @param config - XR session configuration options
 * @param eventHandlers - Event handlers for XR session events
 * @returns XR support status and session management utilities
 * 
 * @example
 * ```tsx
 * const { support, sessionState, requestSession, endSession } = useXRSupport({
 *   vrReferenceSpace: 'local-floor',
 *   onSessionStart: (session, mode) => console.log(`Started ${mode} session`),
 *   onSessionEnd: (mode, duration) => console.log(`Ended ${mode} after ${duration}ms`),
 * });
 * 
 * if (support.isVRSupported) {
 *   return <button onClick={() => requestSession('immersive-vr')}>Enter VR</button>;
 * }
 * ```
 */
export function useXRSupport(
  config: XRSessionConfig = DEFAULT_XR_CONFIG,
  eventHandlers: XRSessionEventHandlers = {}
): UseXRSupportReturn {
  // Merge config with defaults
  const mergedConfig = { ...DEFAULT_XR_CONFIG, ...config };

  // Support status state
  const [support, setSupport] = useState<XRSupportStatus>({
    isWebXRSupported: false,
    isVRSupported: false,
    isARSupported: false,
    isInlineSupported: false,
    isChecking: true,
    error: null,
    features: {},
  });

  // Session state
  const [sessionState, setSessionState] = useState<XRSessionState>({
    isSessionActive: false,
    currentMode: null,
    visibilityState: null,
    sessionStartTime: null,
    sessionError: null,
  });

  // Refs for current session and event handlers
  const currentSessionRef = useRef<XRSession | null>(null);
  const eventHandlersRef = useRef(eventHandlers);

  // Update event handlers ref when they change
  useEffect(() => {
    eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);

  /**
   * Check if WebXR is available
   */
  const isWebXRAvailable = useCallback((): boolean => {
    return typeof navigator !== 'undefined' && 'xr' in navigator;
  }, []);

  /**
   * Check support for a specific session mode
   */
  const checkSessionSupport = useCallback(async (mode: XRSessionMode): Promise<boolean> => {
    if (!isWebXRAvailable()) {
      return false;
    }

    try {
      const supported = await navigator.xr!.isSessionSupported(mode);
      return supported;
    } catch (error) {
      console.warn(`Error checking ${mode} support:`, error);
      return false;
    }
  }, [isWebXRAvailable]);

  /**
   * Detect available XR features
   */
  const detectFeatures = useCallback(async (): Promise<Partial<XRFeatureFlags>> => {
    const features: Partial<XRFeatureFlags> = {};

    if (!isWebXRAvailable()) {
      return features;
    }

    // Feature detection is limited in WebXR - we can only check session support
    // Actual feature availability is determined when requesting a session
    // For now, we assume features are available if VR/AR is supported

    const vrSupported = await checkSessionSupport('immersive-vr');
    const arSupported = await checkSessionSupport('immersive-ar');

    if (vrSupported) {
      features.controllers = true;
      features.handTracking = true; // Assume available, will fail gracefully if not
    }

    if (arSupported) {
      features.planeDetection = true;
      features.hitTest = true;
      features.anchors = true;
      features.lightEstimation = true;
    }

    return features;
  }, [isWebXRAvailable, checkSessionSupport]);

  /**
   * Refresh XR support status
   */
  const refreshSupport = useCallback(async (): Promise<void> => {
    setSupport(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const webXRSupported = isWebXRAvailable();

      if (!webXRSupported) {
        setSupport({
          isWebXRSupported: false,
          isVRSupported: false,
          isARSupported: false,
          isInlineSupported: false,
          isChecking: false,
          error: 'WebXR is not supported in this browser',
          features: {},
        });
        return;
      }

      // Check support for each session mode in parallel
      const [vrSupported, arSupported, inlineSupported] = await Promise.all([
        checkSessionSupport('immersive-vr'),
        checkSessionSupport('immersive-ar'),
        checkSessionSupport('inline'),
      ]);

      // Detect available features
      const features = await detectFeatures();

      setSupport({
        isWebXRSupported: true,
        isVRSupported: vrSupported,
        isARSupported: arSupported,
        isInlineSupported: inlineSupported,
        isChecking: false,
        error: null,
        features,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error checking XR support';
      setSupport(prev => ({
        ...prev,
        isChecking: false,
        error: errorMessage,
      }));
    }
  }, [isWebXRAvailable, checkSessionSupport, detectFeatures]);

  /**
   * Get recommended reference space for a session mode
   */
  const getRecommendedReferenceSpace = useCallback((mode: XRSessionMode): XRReferenceSpaceType => {
    switch (mode) {
      case 'immersive-vr':
        return mergedConfig.vrReferenceSpace || 'local-floor';
      case 'immersive-ar':
        return mergedConfig.arReferenceSpace || 'local-floor';
      case 'inline':
        return 'viewer';
      default:
        return 'local-floor';
    }
  }, [mergedConfig.vrReferenceSpace, mergedConfig.arReferenceSpace]);

  /**
   * Handle session end event
   */
  const handleSessionEnd = useCallback(() => {
    const session = currentSessionRef.current;
    const mode = sessionState.currentMode;
    const startTime = sessionState.sessionStartTime;

    // Calculate session duration
    const duration = startTime ? Date.now() - startTime : 0;

    // Clean up session reference
    currentSessionRef.current = null;

    // Update state
    setSessionState({
      isSessionActive: false,
      currentMode: null,
      visibilityState: null,
      sessionStartTime: null,
      sessionError: null,
    });

    // Call event handler
    if (mode && eventHandlersRef.current.onSessionEnd) {
      eventHandlersRef.current.onSessionEnd(mode, duration);
    }

    // Remove event listeners from session
    if (session) {
      session.removeEventListener('end', handleSessionEnd);
      session.removeEventListener('visibilitychange', handleVisibilityChange);
      session.removeEventListener('inputsourceschange', handleInputSourcesChange);
    }
  }, [sessionState.currentMode, sessionState.sessionStartTime]);

  /**
   * Handle visibility change event
   */
  const handleVisibilityChange = useCallback((event: XRSessionEvent) => {
    const session = event.target as XRSession;
    const visibilityState = session.visibilityState;

    setSessionState(prev => ({
      ...prev,
      visibilityState,
    }));

    if (eventHandlersRef.current.onVisibilityChange) {
      eventHandlersRef.current.onVisibilityChange(visibilityState);
    }
  }, []);

  /**
   * Handle input sources change event
   */
  const handleInputSourcesChange = useCallback((event: XRInputSourceChangeEvent) => {
    if (eventHandlersRef.current.onInputSourcesChange) {
      eventHandlersRef.current.onInputSourcesChange(event);
    }
  }, []);

  /**
   * Request an XR session
   */
  const requestSession = useCallback(async (mode: XRSessionMode): Promise<XRSession | null> => {
    if (!isWebXRAvailable()) {
      const error = new Error('WebXR is not available');
      setSessionState(prev => ({ ...prev, sessionError: error.message }));
      if (eventHandlersRef.current.onSessionError) {
        eventHandlersRef.current.onSessionError(error, mode);
      }
      return null;
    }

    // End any existing session first
    if (currentSessionRef.current) {
      await endSession();
    }

    try {
      // Build session options based on mode
      const sessionInit: XRSessionInit = {};

      if (mode === 'immersive-vr') {
        sessionInit.requiredFeatures = mergedConfig.vrRequiredFeatures;
        sessionInit.optionalFeatures = mergedConfig.vrOptionalFeatures;
      } else if (mode === 'immersive-ar') {
        sessionInit.requiredFeatures = mergedConfig.arRequiredFeatures;
        sessionInit.optionalFeatures = mergedConfig.arOptionalFeatures;
      }

      // Request the session
      const session = await navigator.xr!.requestSession(mode, sessionInit);

      // Store session reference
      currentSessionRef.current = session;

      // Set up event listeners
      session.addEventListener('end', handleSessionEnd);
      session.addEventListener('visibilitychange', handleVisibilityChange);
      session.addEventListener('inputsourceschange', handleInputSourcesChange);

      // Update state
      const startTime = Date.now();
      setSessionState({
        isSessionActive: true,
        currentMode: mode,
        visibilityState: session.visibilityState,
        sessionStartTime: startTime,
        sessionError: null,
      });

      // Call event handler
      if (eventHandlersRef.current.onSessionStart) {
        eventHandlersRef.current.onSessionStart(session, mode);
      }

      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start XR session';
      setSessionState(prev => ({
        ...prev,
        sessionError: errorMessage,
      }));

      if (eventHandlersRef.current.onSessionError) {
        eventHandlersRef.current.onSessionError(
          error instanceof Error ? error : new Error(errorMessage),
          mode
        );
      }

      return null;
    }
  }, [
    isWebXRAvailable,
    mergedConfig.vrRequiredFeatures,
    mergedConfig.vrOptionalFeatures,
    mergedConfig.arRequiredFeatures,
    mergedConfig.arOptionalFeatures,
    handleSessionEnd,
    handleVisibilityChange,
    handleInputSourcesChange,
  ]);

  /**
   * End the current XR session
   */
  const endSession = useCallback(async (): Promise<void> => {
    const session = currentSessionRef.current;
    if (!session) {
      return;
    }

    try {
      await session.end();
    } catch (error) {
      // Session may already be ended
      console.warn('Error ending XR session:', error);
    }

    // handleSessionEnd will be called by the 'end' event listener
  }, []);

  // Check XR support on mount
  useEffect(() => {
    refreshSupport();
  }, [refreshSupport]);

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      if (currentSessionRef.current) {
        currentSessionRef.current.end().catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, []);

  return {
    support,
    sessionState,
    checkSessionSupport,
    requestSession,
    endSession,
    getRecommendedReferenceSpace,
    refreshSupport,
  };
}

export default useXRSupport;

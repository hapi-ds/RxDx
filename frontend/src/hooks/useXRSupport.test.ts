/**
 * useXRSupport Hook Tests
 * Tests for WebXR capability detection and session management
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  useXRSupport, 
  DEFAULT_XR_CONFIG,
  type XRSessionMode,
  type XRSessionConfig,
} from './useXRSupport';

// Declare global for Node.js environment in tests
declare const global: typeof globalThis;

// Mock XRSession
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createMockXRSession = (_mode?: XRSessionMode): Partial<XRSession> => ({
  visibilityState: 'visible',
  end: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

// Mock navigator.xr
const createMockXR = (options: {
  vrSupported?: boolean;
  arSupported?: boolean;
  inlineSupported?: boolean;
} = {}): Partial<XRSystem> => {
  const { vrSupported = true, arSupported = false, inlineSupported = true } = options;
  
  return {
    isSessionSupported: vi.fn().mockImplementation(async (mode: XRSessionMode) => {
      switch (mode) {
        case 'immersive-vr':
          return vrSupported;
        case 'immersive-ar':
          return arSupported;
        case 'inline':
          return inlineSupported;
        default:
          return false;
      }
    }),
    requestSession: vi.fn().mockImplementation(async (mode: XRSessionMode) => {
      return createMockXRSession(mode);
    }),
  };
};

describe('useXRSupport', () => {
  let originalNavigator: Navigator;
  let mockXR: Partial<XRSystem>;

  beforeEach(() => {
    // Store original navigator
    originalNavigator = global.navigator;
    
    // Create mock XR system
    mockXR = createMockXR();
    
    // Mock navigator.xr
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        xr: mockXR,
      },
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
    vi.clearAllMocks();
  });

  describe('XR Support Detection', () => {
    it('detects WebXR support when navigator.xr is available', async () => {
      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      expect(result.current.support.isWebXRSupported).toBe(true);
    });

    it('detects VR support when immersive-vr is supported', async () => {
      mockXR = createMockXR({ vrSupported: true });
      Object.defineProperty(global.navigator, 'xr', { value: mockXR, configurable: true });

      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      expect(result.current.support.isVRSupported).toBe(true);
    });

    it('detects AR support when immersive-ar is supported', async () => {
      mockXR = createMockXR({ arSupported: true });
      Object.defineProperty(global.navigator, 'xr', { value: mockXR, configurable: true });

      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      expect(result.current.support.isARSupported).toBe(true);
    });

    it('reports no WebXR support when navigator.xr is undefined', async () => {
      // Create a new navigator object without xr property
      const navigatorWithoutXR = { ...originalNavigator };
      delete (navigatorWithoutXR as { xr?: unknown }).xr;
      
      Object.defineProperty(global, 'navigator', {
        value: navigatorWithoutXR,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      expect(result.current.support.isWebXRSupported).toBe(false);
      expect(result.current.support.isVRSupported).toBe(false);
      expect(result.current.support.isARSupported).toBe(false);
      expect(result.current.support.error).toBe('WebXR is not supported in this browser');
    });

    it('handles isSessionSupported errors gracefully', async () => {
      mockXR.isSessionSupported = vi.fn().mockRejectedValue(new Error('Test error'));
      Object.defineProperty(global.navigator, 'xr', { value: mockXR, configurable: true });

      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      // Should still report WebXR as supported, but individual modes as unsupported
      expect(result.current.support.isWebXRSupported).toBe(true);
      expect(result.current.support.isVRSupported).toBe(false);
      expect(result.current.support.isARSupported).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('starts with no active session', async () => {
      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      expect(result.current.sessionState.isSessionActive).toBe(false);
      expect(result.current.sessionState.currentMode).toBeNull();
    });

    it('requests VR session successfully', async () => {
      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      let session: XRSession | null = null;
      await act(async () => {
        session = await result.current.requestSession('immersive-vr');
      });

      expect(session).not.toBeNull();
      expect(result.current.sessionState.isSessionActive).toBe(true);
      expect(result.current.sessionState.currentMode).toBe('immersive-vr');
      expect(mockXR.requestSession).toHaveBeenCalledWith('immersive-vr', expect.any(Object));
    });

    it('requests AR session successfully', async () => {
      mockXR = createMockXR({ arSupported: true });
      Object.defineProperty(global.navigator, 'xr', { value: mockXR, configurable: true });

      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      await act(async () => {
        await result.current.requestSession('immersive-ar');
      });

      expect(result.current.sessionState.isSessionActive).toBe(true);
      expect(result.current.sessionState.currentMode).toBe('immersive-ar');
    });

    it('handles session request failure', async () => {
      const testError = new Error('Session request failed');
      mockXR.requestSession = vi.fn().mockRejectedValue(testError);
      Object.defineProperty(global.navigator, 'xr', { value: mockXR, configurable: true });

      const onSessionError = vi.fn();
      const { result } = renderHook(() => useXRSupport({}, { onSessionError }));

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      await act(async () => {
        await result.current.requestSession('immersive-vr');
      });

      expect(result.current.sessionState.isSessionActive).toBe(false);
      expect(result.current.sessionState.sessionError).toBe('Session request failed');
      expect(onSessionError).toHaveBeenCalledWith(testError, 'immersive-vr');
    });

    it('returns null when WebXR is not available', async () => {
      // Create a new navigator object without xr property
      const navigatorWithoutXR = { ...originalNavigator };
      delete (navigatorWithoutXR as { xr?: unknown }).xr;
      
      Object.defineProperty(global, 'navigator', {
        value: navigatorWithoutXR,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      let session: XRSession | null = null;
      await act(async () => {
        session = await result.current.requestSession('immersive-vr');
      });

      expect(session).toBeNull();
      expect(result.current.sessionState.sessionError).toBe('WebXR is not available');
    });
  });

  describe('Event Handlers', () => {
    it('calls onSessionStart when session starts', async () => {
      const onSessionStart = vi.fn();
      const { result } = renderHook(() => useXRSupport({}, { onSessionStart }));

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      await act(async () => {
        await result.current.requestSession('immersive-vr');
      });

      expect(onSessionStart).toHaveBeenCalledWith(expect.any(Object), 'immersive-vr');
    });

    it('records session start time', async () => {
      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      const beforeTime = Date.now();
      await act(async () => {
        await result.current.requestSession('immersive-vr');
      });
      const afterTime = Date.now();

      expect(result.current.sessionState.sessionStartTime).toBeGreaterThanOrEqual(beforeTime);
      expect(result.current.sessionState.sessionStartTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Configuration', () => {
    it('uses default configuration when none provided', async () => {
      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      await act(async () => {
        await result.current.requestSession('immersive-vr');
      });

      expect(mockXR.requestSession).toHaveBeenCalledWith('immersive-vr', {
        requiredFeatures: DEFAULT_XR_CONFIG.vrRequiredFeatures,
        optionalFeatures: DEFAULT_XR_CONFIG.vrOptionalFeatures,
      });
    });

    it('merges custom configuration with defaults', async () => {
      const customConfig: Partial<XRSessionConfig> = {
        vrRequiredFeatures: ['local'],
        vrOptionalFeatures: ['hand-tracking'],
      };

      const { result } = renderHook(() => useXRSupport(customConfig));

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      await act(async () => {
        await result.current.requestSession('immersive-vr');
      });

      expect(mockXR.requestSession).toHaveBeenCalledWith('immersive-vr', {
        requiredFeatures: ['local'],
        optionalFeatures: ['hand-tracking'],
      });
    });

    it('uses AR configuration for AR sessions', async () => {
      mockXR = createMockXR({ arSupported: true });
      Object.defineProperty(global.navigator, 'xr', { value: mockXR, configurable: true });

      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      await act(async () => {
        await result.current.requestSession('immersive-ar');
      });

      expect(mockXR.requestSession).toHaveBeenCalledWith('immersive-ar', {
        requiredFeatures: DEFAULT_XR_CONFIG.arRequiredFeatures,
        optionalFeatures: DEFAULT_XR_CONFIG.arOptionalFeatures,
      });
    });
  });

  describe('Reference Space', () => {
    it('returns local-floor for VR by default', async () => {
      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      expect(result.current.getRecommendedReferenceSpace('immersive-vr')).toBe('local-floor');
    });

    it('returns local-floor for AR by default', async () => {
      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      expect(result.current.getRecommendedReferenceSpace('immersive-ar')).toBe('local-floor');
    });

    it('returns viewer for inline sessions', async () => {
      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      expect(result.current.getRecommendedReferenceSpace('inline')).toBe('viewer');
    });

    it('uses custom reference space from config', async () => {
      const customConfig: Partial<XRSessionConfig> = {
        vrReferenceSpace: 'bounded-floor',
        arReferenceSpace: 'unbounded',
      };

      const { result } = renderHook(() => useXRSupport(customConfig));

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      expect(result.current.getRecommendedReferenceSpace('immersive-vr')).toBe('bounded-floor');
      expect(result.current.getRecommendedReferenceSpace('immersive-ar')).toBe('unbounded');
    });
  });

  describe('checkSessionSupport', () => {
    it('checks VR session support', async () => {
      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      let supported = false;
      await act(async () => {
        supported = await result.current.checkSessionSupport('immersive-vr');
      });

      expect(supported).toBe(true);
    });

    it('checks AR session support', async () => {
      mockXR = createMockXR({ arSupported: false });
      Object.defineProperty(global.navigator, 'xr', { value: mockXR, configurable: true });

      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      let supported = false;
      await act(async () => {
        supported = await result.current.checkSessionSupport('immersive-ar');
      });

      expect(supported).toBe(false);
    });

    it('returns false when WebXR is not available', async () => {
      // Create a new navigator object without xr property
      const navigatorWithoutXR = { ...originalNavigator };
      delete (navigatorWithoutXR as { xr?: unknown }).xr;
      
      Object.defineProperty(global, 'navigator', {
        value: navigatorWithoutXR,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      let supported = false;
      await act(async () => {
        supported = await result.current.checkSessionSupport('immersive-vr');
      });

      expect(supported).toBe(false);
    });
  });

  describe('refreshSupport', () => {
    it('refreshes XR support status', async () => {
      const { result } = renderHook(() => useXRSupport());

      await waitFor(() => {
        expect(result.current.support.isChecking).toBe(false);
      });

      // Change mock to return different values
      mockXR = createMockXR({ vrSupported: false, arSupported: true });
      Object.defineProperty(global.navigator, 'xr', { value: mockXR, configurable: true });

      await act(async () => {
        await result.current.refreshSupport();
      });

      expect(result.current.support.isVRSupported).toBe(false);
      expect(result.current.support.isARSupported).toBe(true);
    });
  });
});

describe('DEFAULT_XR_CONFIG', () => {
  it('has correct default VR reference space', () => {
    expect(DEFAULT_XR_CONFIG.vrReferenceSpace).toBe('local-floor');
  });

  it('has correct default AR reference space', () => {
    expect(DEFAULT_XR_CONFIG.arReferenceSpace).toBe('local-floor');
  });

  it('has correct default VR required features', () => {
    expect(DEFAULT_XR_CONFIG.vrRequiredFeatures).toContain('local-floor');
  });

  it('has correct default VR optional features', () => {
    expect(DEFAULT_XR_CONFIG.vrOptionalFeatures).toContain('bounded-floor');
    expect(DEFAULT_XR_CONFIG.vrOptionalFeatures).toContain('hand-tracking');
  });

  it('has correct default AR required features', () => {
    expect(DEFAULT_XR_CONFIG.arRequiredFeatures).toContain('local-floor');
  });

  it('has correct default AR optional features', () => {
    expect(DEFAULT_XR_CONFIG.arOptionalFeatures).toContain('hit-test');
    expect(DEFAULT_XR_CONFIG.arOptionalFeatures).toContain('plane-detection');
  });

  it('has high frame rate by default', () => {
    expect(DEFAULT_XR_CONFIG.frameRate).toBe('high');
  });

  it('has maximum foveation by default', () => {
    expect(DEFAULT_XR_CONFIG.foveation).toBe(1);
  });
});

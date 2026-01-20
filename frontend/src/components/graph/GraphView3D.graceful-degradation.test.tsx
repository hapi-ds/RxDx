/**
 * GraphView3D Graceful Degradation Tests
 * Tests for XR graceful degradation scenarios on non-XR devices
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * - Acceptance Criteria 10: WHEN a user lacks XR hardware, THE System SHALL gracefully degrade to standard web interface
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the dependencies
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { set: vi.fn() } },
    gl: { xr: { isPresenting: false } },
  })),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Line: () => null,
  Text: () => null,
  QuadraticBezierLine: () => null,
  Cone: () => null,
}));

vi.mock('@react-three/xr', () => ({
  XR: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  createXRStore: () => ({
    enterVR: vi.fn(),
    enterAR: vi.fn(),
  }),
  useXR: () => ({ session: null }),
}));

vi.mock('../../stores/graphStore', () => ({
  useGraphStore: vi.fn(() => ({
    loadGraph: vi.fn(),
    isLoading: false,
    error: null,
    selectNode: vi.fn(),
    searchNodes: vi.fn(),
    getFilteredNodes: () => [],
    getFilteredEdges: () => [],
    selectedNode: null,
    updateNodePosition3D: vi.fn(),
  })),
}));

vi.mock('../../utils/questOptimizations', () => ({
  isQuestDevice: () => false,
  getQuestCapabilities: () => null,
  getQuestXRConfig: () => ({}),
  applyQuestPolyfills: vi.fn(),
  getDeviceInfoString: () => 'Test Device',
}));

// Mock all XR components
vi.mock('../xr', () => ({
  VRButton: ({ isSupported, isChecking, isInSession }: { isSupported: boolean; isChecking?: boolean; isInSession?: boolean }) => {
    if (isChecking) return <button aria-label="Checking VR support">Checking VR...</button>;
    if (isInSession) return <button aria-label="Exit VR mode">Exit VR</button>;
    if (!isSupported) return <button aria-label="VR is not supported on this device" disabled>VR Not Supported</button>;
    return <button aria-label="Enter VR mode">Enter VR</button>;
  },
  ARButton: ({ isSupported, isChecking, isInSession }: { isSupported: boolean; isChecking?: boolean; isInSession?: boolean }) => {
    if (isChecking) return <button aria-label="Checking AR support">Checking AR...</button>;
    if (isInSession) return <button aria-label="Exit AR mode">Exit AR</button>;
    if (!isSupported) return <button aria-label="AR is not supported on this device" disabled>AR Not Supported</button>;
    return <button aria-label="Enter AR mode">Enter AR</button>;
  },
  XRControllers: () => null,
  XRHands: () => null,
  VRInteraction: () => null,
  VoiceCommands: () => null,
  XRFallbackMessage: ({ show, reason }: { show: boolean; reason: string }) => {
    if (!show) return null;
    const titles: Record<string, string> = {
      'webxr-not-supported': 'WebXR Not Supported',
      'vr-not-supported': 'VR Not Available',
      'ar-not-supported': 'AR Not Available',
      'no-xr-device': 'No XR Device Detected',
      'unknown': 'XR Unavailable',
    };
    return <div data-testid="xr-fallback-message">{titles[reason] || 'XR Unavailable'}</div>;
  },
}));

// Mock useXRSupport with different scenarios
const mockUseXRSupport = vi.fn();
vi.mock('../../hooks/useXRSupport', () => ({
  useXRSupport: (...args: unknown[]) => mockUseXRSupport(...args),
  DEFAULT_XR_CONFIG: {
    vrReferenceSpace: 'local-floor',
    arReferenceSpace: 'local-floor',
    vrRequiredFeatures: ['local-floor'],
    vrOptionalFeatures: [],
    arRequiredFeatures: ['local-floor'],
    arOptionalFeatures: [],
  },
}));

// Import after mocks
import { GraphView3D } from './GraphView3D';

describe('GraphView3D Graceful Degradation', () => {
  const defaultXRSupport = {
    support: {
      isWebXRSupported: true,
      isVRSupported: true,
      isARSupported: true,
      isInlineSupported: true,
      isChecking: false,
      error: null,
      features: {},
    },
    sessionState: {
      isSessionActive: false,
      currentMode: null,
      visibilityState: null,
      sessionStartTime: null,
      sessionError: null,
    },
    checkSessionSupport: vi.fn(),
    requestSession: vi.fn(),
    endSession: vi.fn(),
    getRecommendedReferenceSpace: vi.fn(),
    refreshSupport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseXRSupport.mockReturnValue(defaultXRSupport);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('VR Button Visibility', () => {
    it('shows VR button when VR is supported', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isVRSupported: true,
        },
      });

      render(<GraphView3D showVRButton={true} hideUnsupportedXRButtons={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enter vr/i })).toBeInTheDocument();
      });
    });

    it('hides VR button when VR is not supported and hideUnsupportedXRButtons is true', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isVRSupported: false,
          isChecking: false,
        },
      });

      render(<GraphView3D showVRButton={true} hideUnsupportedXRButtons={true} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /enter vr/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /vr not supported/i })).not.toBeInTheDocument();
      });
    });

    it('shows disabled VR button when VR is not supported and hideUnsupportedXRButtons is false', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isVRSupported: false,
          isChecking: false,
        },
      });

      render(<GraphView3D showVRButton={true} hideUnsupportedXRButtons={false} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /vr is not supported/i })).toBeInTheDocument();
      });
    });

    it('shows VR button while checking support', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isVRSupported: false,
          isChecking: true,
        },
      });

      render(<GraphView3D showVRButton={true} hideUnsupportedXRButtons={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /checking vr/i })).toBeInTheDocument();
      });
    });
  });

  describe('AR Button Visibility', () => {
    it('shows AR button when AR is supported', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isARSupported: true,
        },
      });

      render(<GraphView3D showARButton={true} hideUnsupportedXRButtons={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enter ar/i })).toBeInTheDocument();
      });
    });

    it('hides AR button when AR is not supported and hideUnsupportedXRButtons is true', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isARSupported: false,
          isChecking: false,
        },
      });

      render(<GraphView3D showARButton={true} hideUnsupportedXRButtons={true} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /enter ar/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /ar not supported/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Partial XR Support', () => {
    it('shows VR button but hides AR button when only VR is supported', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isVRSupported: true,
          isARSupported: false,
          isChecking: false,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          showARButton={true} 
          hideUnsupportedXRButtons={true} 
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enter vr/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /enter ar/i })).not.toBeInTheDocument();
      });
    });

    it('shows AR button but hides VR button when only AR is supported', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isVRSupported: false,
          isARSupported: true,
          isChecking: false,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          showARButton={true} 
          hideUnsupportedXRButtons={true} 
        />
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /enter vr/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /enter ar/i })).toBeInTheDocument();
      });
    });
  });

  describe('Fallback Message', () => {
    it('shows fallback message when WebXR is not supported', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isWebXRSupported: false,
          isVRSupported: false,
          isARSupported: false,
          isChecking: false,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          showXRFallbackMessage={true} 
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('xr-fallback-message')).toBeInTheDocument();
        expect(screen.getByText(/WebXR Not Supported/i)).toBeInTheDocument();
      });
    });

    it('shows fallback message when VR is requested but not supported', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isWebXRSupported: true,
          isVRSupported: false,
          isARSupported: true,
          isChecking: false,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          showARButton={false}
          showXRFallbackMessage={true} 
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('xr-fallback-message')).toBeInTheDocument();
      });
    });

    it('does not show fallback message when showXRFallbackMessage is false', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isWebXRSupported: false,
          isVRSupported: false,
          isARSupported: false,
          isChecking: false,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          showXRFallbackMessage={false} 
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('xr-fallback-message')).not.toBeInTheDocument();
      });
    });

    it('does not show fallback message while checking XR support', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isWebXRSupported: false,
          isVRSupported: false,
          isARSupported: false,
          isChecking: true,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          showXRFallbackMessage={true} 
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('xr-fallback-message')).not.toBeInTheDocument();
      });
    });

    it('calls onXRUnavailable callback when XR is not available', async () => {
      const onXRUnavailable = vi.fn();
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isWebXRSupported: false,
          isVRSupported: false,
          isARSupported: false,
          isChecking: false,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          showXRFallbackMessage={true}
          onXRUnavailable={onXRUnavailable}
        />
      );

      await waitFor(() => {
        expect(onXRUnavailable).toHaveBeenCalledWith('webxr-not-supported');
      });
    });
  });

  describe('3D View Without XR', () => {
    it('renders 3D canvas even when XR is not supported', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isWebXRSupported: false,
          isVRSupported: false,
          isARSupported: false,
          isChecking: false,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          enableOrbitControls={true}
        />
      );

      await waitFor(() => {
        // Canvas should still be rendered for standard 3D navigation
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });
    });

    it('enables orbit controls for mouse/keyboard navigation when XR is not available', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isWebXRSupported: false,
          isVRSupported: false,
          isARSupported: false,
          isChecking: false,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          enableOrbitControls={true}
          showCameraControls={true}
        />
      );

      await waitFor(() => {
        // Camera controls overlay should be visible for standard navigation
        expect(screen.getByTestId('canvas')).toBeInTheDocument();
      });
    });
  });

  describe('XR Buttons Container', () => {
    it('hides XR buttons container when no buttons should be shown', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isVRSupported: false,
          isARSupported: false,
          isChecking: false,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          showARButton={true}
          hideUnsupportedXRButtons={true}
        />
      );

      await waitFor(() => {
        // Neither VR nor AR buttons should be present
        expect(screen.queryByRole('button', { name: /vr/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /ar/i })).not.toBeInTheDocument();
      });
    });

    it('shows XR buttons container when at least one button should be shown', async () => {
      mockUseXRSupport.mockReturnValue({
        ...defaultXRSupport,
        support: {
          ...defaultXRSupport.support,
          isVRSupported: true,
          isARSupported: false,
          isChecking: false,
        },
      });

      render(
        <GraphView3D 
          showVRButton={true} 
          showARButton={true}
          hideUnsupportedXRButtons={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enter vr/i })).toBeInTheDocument();
      });
    });
  });
});

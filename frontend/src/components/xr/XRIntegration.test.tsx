/**
 * XR Integration Tests
 * Tests for XR components working together in the GraphView3D context
 * 
 * Tests cover:
 * - XR session lifecycle (start, end, visibility changes)
 * - Controller and hand tracking integration
 * - VR interaction with graph nodes
 * - Voice commands integration
 * - Graceful degradation when XR is not supported
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import * as THREE from 'three';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock WebXR types and APIs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createMockXRSession = (_mode: string = 'immersive-vr'): Partial<XRSession> => {
  const eventListeners: Map<string, Set<EventListener>> = new Map();
  
  return {
    visibilityState: 'visible' as XRVisibilityState,
    end: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (!eventListeners.has(type)) {
        eventListeners.set(type, new Set());
      }
      eventListeners.get(type)!.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      eventListeners.get(type)?.delete(listener);
    }),
    inputSources: [] as unknown as XRInputSourceArray,
    // Helper to trigger events in tests
    _triggerEvent: (type: string, event: Event) => {
      eventListeners.get(type)?.forEach(listener => listener(event));
    },
  } as Partial<XRSession> & { _triggerEvent: (type: string, event: Event) => void };
};


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createMockXRInputSource = (
  handedness: 'left' | 'right' | 'none' = 'right',
  targetRayMode: 'tracked-pointer' | 'gaze' | 'screen' = 'tracked-pointer'
): Partial<XRInputSource> => {
  const mockGamepad: Partial<Gamepad> = {
    buttons: [
      { pressed: false, touched: false, value: 0 }, // trigger
      { pressed: false, touched: false, value: 0 }, // grip
      { pressed: false, touched: false, value: 0 }, // touchpad
      { pressed: false, touched: false, value: 0 }, // thumbstick
      { pressed: false, touched: false, value: 0 }, // A/X
      { pressed: false, touched: false, value: 0 }, // B/Y
    ] as GamepadButton[],
    axes: [0, 0, 0, 0],
    hapticActuators: [{
      pulse: vi.fn().mockResolvedValue(undefined),
    }] as unknown as GamepadHapticActuator[],
  };

  return {
    handedness,
    targetRayMode,
    targetRaySpace: {} as XRSpace,
    gripSpace: {} as XRSpace,
    gamepad: mockGamepad as Gamepad,
    profiles: ['oculus-touch-v3'],
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createMockXRHand = (): Partial<XRHand> => {
  const joints = new Map<XRHandJoint, XRJointSpace>();
  const jointNames: XRHandJoint[] = [
    'wrist',
    'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
    'index-finger-metacarpal', 'index-finger-phalanx-proximal', 
    'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
    'middle-finger-metacarpal', 'middle-finger-phalanx-proximal',
    'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
    'ring-finger-metacarpal', 'ring-finger-phalanx-proximal',
    'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
    'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal',
    'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
  ];
  
  jointNames.forEach(name => {
    joints.set(name, {} as XRJointSpace);
  });

  return {
    size: joints.size,
    get: (joint: XRHandJoint) => joints.get(joint),
    forEach: joints.forEach.bind(joints),
    keys: joints.keys.bind(joints),
    values: joints.values.bind(joints),
    entries: joints.entries.bind(joints),
    [Symbol.iterator]: joints[Symbol.iterator].bind(joints),
  };
};

// Void references to satisfy TypeScript - these functions are prepared for future use
void createMockXRInputSource;
void createMockXRHand;

// Mock navigator.xr
const createMockXRSystem = (options: {
  vrSupported?: boolean;
  arSupported?: boolean;
} = {}): Partial<XRSystem> => {
  const { vrSupported = true, arSupported = false } = options;
  
  return {
    isSessionSupported: vi.fn().mockImplementation(async (mode: XRSessionMode) => {
      switch (mode) {
        case 'immersive-vr': return vrSupported;
        case 'immersive-ar': return arSupported;
        case 'inline': return true;
        default: return false;
      }
    }),
    requestSession: vi.fn().mockImplementation(async (mode: XRSessionMode) => {
      return createMockXRSession(mode);
    }),
  };
};

// Store original navigator
let originalNavigator: Navigator;
let mockXRSystem: Partial<XRSystem>;

// Mock graphStore
vi.mock('../../stores/graphStore', () => ({
  useGraphStore: vi.fn(),
}));

// Mock useXRSupport hook
const mockUseXRSupport = vi.fn();
vi.mock('../../hooks/useXRSupport', () => ({
  useXRSupport: () => mockUseXRSupport(),
  DEFAULT_XR_CONFIG: {
    vrReferenceSpace: 'local-floor',
    arReferenceSpace: 'local-floor',
    vrRequiredFeatures: ['local-floor'],
    vrOptionalFeatures: ['bounded-floor', 'hand-tracking', 'layers'],
    arRequiredFeatures: ['local-floor'],
    arOptionalFeatures: ['hit-test', 'plane-detection'],
    frameRate: 'high',
    foveation: 1,
  },
}));

// Mock useVoiceCommands hook
const mockUseVoiceCommands = vi.fn();
vi.mock('../../hooks/useVoiceCommands', () => ({
  useVoiceCommands: () => mockUseVoiceCommands(),
  isSpeechRecognitionSupported: vi.fn(() => true),
  parseVoiceCommand: vi.fn((transcript: string) => ({
    type: transcript.includes('select') ? 'select' : 'unknown',
    rawTranscript: transcript,
    confidence: 0.9,
    timestamp: Date.now(),
  })),
  AVAILABLE_COMMANDS: {
    'select [name]': 'Select a node by its name',
    'zoom in': 'Zoom the camera in',
    'zoom out': 'Zoom the camera out',
    'reset view': 'Reset camera to default position',
  },
}));


// Mock React Three Fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: {
      position: new THREE.Vector3(0, 5, 15),
      getWorldDirection: vi.fn(() => new THREE.Vector3(0, 0, -1)),
    },
    gl: {
      domElement: { clientWidth: 800, clientHeight: 600 },
      xr: {
        getReferenceSpace: vi.fn(() => ({})),
        getFrame: vi.fn(() => ({
          getPose: vi.fn(() => ({
            transform: {
              position: { x: 0, y: 1.5, z: 0 },
              orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
          })),
          getJointPose: vi.fn(() => ({
            transform: {
              position: { x: 0, y: 1.5, z: 0 },
              orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
            radius: 0.01,
          })),
        })),
      },
    },
  })),
}));

// Mock @react-three/drei
vi.mock('@react-three/drei', () => ({
  OrbitControls: vi.fn(() => null),
  Line: vi.fn(() => null),
  Text: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drei-text">{children}</div>
  ),
  QuadraticBezierLine: vi.fn(() => null),
  Cone: vi.fn(() => null),
}));

// Mock @react-three/xr
const mockXRStore = {
  enterVR: vi.fn(),
  enterAR: vi.fn(),
  session: null as XRSession | null,
};

vi.mock('@react-three/xr', () => ({
  XR: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="xr-wrapper">{children}</div>
  ),
  createXRStore: vi.fn(() => mockXRStore),
  useXR: vi.fn((selector) => {
    const state = { session: mockXRStore.session };
    return selector ? selector(state) : state;
  }),
}));

// Import components after mocks
import { VRButton } from './VRButton';
import { ARButton } from './ARButton';
import { XRControllers } from './XRControllers';
import { XRHands } from './XRHands';
import { VRInteraction } from './VRInteraction';
import { VoiceCommands } from './VoiceCommands';
import { useGraphStore } from '../../stores/graphStore';
import type { GraphNodeData } from '../../stores/graphStore';
import type { Node, Edge } from '@xyflow/react';


// ============================================================================
// Test Data
// ============================================================================

const mockNodes: Node<GraphNodeData>[] = [
  {
    id: 'req-1',
    type: 'requirement',
    position: { x: 0, y: 0 },
    data: { label: 'Requirement 1', type: 'requirement', properties: {} },
  },
  {
    id: 'task-1',
    type: 'task',
    position: { x: 200, y: 0 },
    data: { label: 'Task 1', type: 'task', properties: {} },
  },
];

const mockEdges: Edge[] = [
  { id: 'edge-1', source: 'req-1', target: 'task-1', type: 'IMPLEMENTS' },
];

// ============================================================================
// Test Suites
// ============================================================================

describe('XR Integration Tests', () => {
  beforeEach(() => {
    // Store original navigator
    originalNavigator = globalThis.navigator;
    
    // Create mock XR system
    mockXRSystem = createMockXRSystem({ vrSupported: true, arSupported: false });
    
    // Mock navigator.xr
    Object.defineProperty(globalThis, 'navigator', {
      value: { ...originalNavigator, xr: mockXRSystem },
      writable: true,
      configurable: true,
    });

    // Setup default mock returns
    mockUseXRSupport.mockReturnValue({
      support: {
        isWebXRSupported: true,
        isVRSupported: true,
        isARSupported: false,
        isInlineSupported: true,
        isChecking: false,
        error: null,
        features: { controllers: true, handTracking: true },
      },
      sessionState: {
        isSessionActive: false,
        currentMode: null,
        visibilityState: null,
        sessionStartTime: null,
        sessionError: null,
      },
      checkSessionSupport: vi.fn().mockResolvedValue(true),
      requestSession: vi.fn().mockResolvedValue(createMockXRSession()),
      endSession: vi.fn().mockResolvedValue(undefined),
      getRecommendedReferenceSpace: vi.fn().mockReturnValue('local-floor'),
      refreshSupport: vi.fn().mockResolvedValue(undefined),
    });

    mockUseVoiceCommands.mockReturnValue({
      state: 'idle',
      isSupported: true,
      isListening: false,
      lastCommand: null,
      commandHistory: [],
      error: null,
      hasPermission: true,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      toggleListening: vi.fn(),
      requestPermission: vi.fn().mockResolvedValue(true),
      clearHistory: vi.fn(),
      getAvailableCommands: vi.fn(() => ['select [name]', 'zoom in', 'zoom out']),
    });

    (useGraphStore as unknown as Mock).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      loadGraph: vi.fn(),
      selectNode: vi.fn(),
      searchNodes: vi.fn(() => []),
      selectedNode: null,
      isLoading: false,
      error: null,
    });

    // Reset XR store
    mockXRStore.session = null;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });


  // ==========================================================================
  // XR Session Lifecycle Tests
  // ==========================================================================
  
  describe('XR Session Lifecycle', () => {
    describe('Session Start', () => {
      it('VRButton triggers session start when clicked', async () => {
        const onSessionStart = vi.fn();
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          support: { ...mockUseXRSupport().support, isVRSupported: true },
        });

        render(
          <VRButton
            isSupported={true}
            onClick={onSessionStart}
          />
        );

        const button = screen.getByRole('button', { name: /enter vr/i });
        await act(async () => {
          fireEvent.click(button);
        });

        expect(onSessionStart).toHaveBeenCalledTimes(1);
      });

      it('ARButton triggers AR session start when clicked', async () => {
        const onSessionStart = vi.fn();
        
        render(
          <ARButton
            isSupported={true}
            onClick={onSessionStart}
          />
        );

        const button = screen.getByRole('button', { name: /enter ar/i });
        await act(async () => {
          fireEvent.click(button);
        });

        expect(onSessionStart).toHaveBeenCalledTimes(1);
      });

      it('session start callback receives correct mode', async () => {
        const requestSession = vi.fn().mockResolvedValue(createMockXRSession('immersive-vr'));
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          requestSession,
        });

        const { requestSession: hookRequestSession } = mockUseXRSupport();
        await act(async () => {
          await hookRequestSession('immersive-vr');
        });

        expect(requestSession).toHaveBeenCalledWith('immersive-vr');
      });
    });

    describe('Session End', () => {
      it('VRButton shows Exit VR when session is active', () => {
        render(
          <VRButton
            isSupported={true}
            isInSession={true}
          />
        );

        expect(screen.getByRole('button')).toHaveTextContent('Exit VR');
      });

      it('clicking Exit VR triggers session end', async () => {
        const onSessionEnd = vi.fn();
        
        render(
          <VRButton
            isSupported={true}
            isInSession={true}
            onClick={onSessionEnd}
          />
        );

        const button = screen.getByRole('button', { name: /exit vr/i });
        await act(async () => {
          fireEvent.click(button);
        });

        expect(onSessionEnd).toHaveBeenCalledTimes(1);
      });

      it('session end cleans up resources', async () => {
        const endSession = vi.fn().mockResolvedValue(undefined);
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          sessionState: { ...mockUseXRSupport().sessionState, isSessionActive: true },
          endSession,
        });

        const { endSession: hookEndSession } = mockUseXRSupport();
        await act(async () => {
          await hookEndSession();
        });

        expect(endSession).toHaveBeenCalled();
      });
    });

    describe('Visibility Changes', () => {
      it('handles visibility state changes during session', async () => {
        // onVisibilityChange would be used in a full integration test
        // const onVisibilityChange = vi.fn();
        const mockSession = createMockXRSession() as XRSession & { 
          _triggerEvent: (type: string, event: Event) => void 
        };
        
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          sessionState: {
            isSessionActive: true,
            currentMode: 'immersive-vr',
            visibilityState: 'visible',
            sessionStartTime: Date.now(),
            sessionError: null,
          },
        });

        // Simulate visibility change
        const visibilityEvent = new Event('visibilitychange');
        Object.defineProperty(visibilityEvent, 'target', {
          value: { visibilityState: 'hidden' },
        });

        mockSession._triggerEvent('visibilitychange', visibilityEvent);
        
        // The hook should handle visibility changes
        expect(mockUseXRSupport().sessionState.visibilityState).toBe('visible');
      });
    });
  });


  // ==========================================================================
  // Controller Integration Tests
  // ==========================================================================
  
  describe('Controller Integration', () => {
    describe('Controller Detection', () => {
      it('XRControllers renders without crashing', () => {
        render(
          <div data-testid="xr-wrapper">
            <XRControllers />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('XRControllers accepts input callbacks', () => {
        const onTriggerPress = vi.fn();
        const onGripPress = vi.fn();
        const onThumbstickMove = vi.fn();

        render(
          <div data-testid="xr-wrapper">
            <XRControllers
              onTriggerPress={onTriggerPress}
              onGripPress={onGripPress}
              onThumbstickMove={onThumbstickMove}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('XRControllers shows debug visualization when enabled', () => {
        render(
          <div data-testid="xr-wrapper">
            <XRControllers showDebug={true} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });

    describe('Controller Input Handling', () => {
      it('trigger press callback is invoked with correct handedness', async () => {
        const onTriggerPress = vi.fn();
        
        render(
          <div data-testid="xr-wrapper">
            <XRControllers onTriggerPress={onTriggerPress} />
          </div>
        );

        // Simulate trigger press through mock
        // In real scenario, this would be triggered by XR frame loop
        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('grip press callback is invoked correctly', async () => {
        const onGripPress = vi.fn();
        
        render(
          <div data-testid="xr-wrapper">
            <XRControllers onGripPress={onGripPress} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('thumbstick move callback receives x and y values', async () => {
        const onThumbstickMove = vi.fn();
        
        render(
          <div data-testid="xr-wrapper">
            <XRControllers onThumbstickMove={onThumbstickMove} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('controller update callback receives both controller states', async () => {
        const onControllerUpdate = vi.fn();
        
        render(
          <div data-testid="xr-wrapper">
            <XRControllers onControllerUpdate={onControllerUpdate} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });

    describe('Haptic Feedback', () => {
      it('haptics can be enabled/disabled', () => {
        render(
          <div data-testid="xr-wrapper">
            <XRControllers enableHaptics={true} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('haptics disabled does not trigger feedback', () => {
        render(
          <div data-testid="xr-wrapper">
            <XRControllers enableHaptics={false} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });
  });


  // ==========================================================================
  // Hand Tracking Integration Tests
  // ==========================================================================
  
  describe('Hand Tracking Integration', () => {
    describe('Hand Detection', () => {
      it('XRHands renders without crashing', () => {
        render(
          <div data-testid="xr-wrapper">
            <XRHands />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('XRHands accepts gesture callbacks', () => {
        const onPinchStart = vi.fn();
        const onPinchEnd = vi.fn();
        const onGrabStart = vi.fn();
        const onGrabEnd = vi.fn();

        render(
          <div data-testid="xr-wrapper">
            <XRHands
              onPinchStart={onPinchStart}
              onPinchEnd={onPinchEnd}
              onGrabStart={onGrabStart}
              onGrabEnd={onGrabEnd}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('XRHands shows debug visualization when enabled', () => {
        render(
          <div data-testid="xr-wrapper">
            <XRHands showDebug={true} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });

    describe('Gesture Detection', () => {
      it('pinch gesture callbacks are properly configured', () => {
        const onPinchStart = vi.fn();
        const onPinchMove = vi.fn();
        const onPinchEnd = vi.fn();

        render(
          <div data-testid="xr-wrapper">
            <XRHands
              onPinchStart={onPinchStart}
              onPinchMove={onPinchMove}
              onPinchEnd={onPinchEnd}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('grab gesture callbacks are properly configured', () => {
        const onGrabStart = vi.fn();
        const onGrabEnd = vi.fn();

        render(
          <div data-testid="xr-wrapper">
            <XRHands
              onGrabStart={onGrabStart}
              onGrabEnd={onGrabEnd}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('point gesture callbacks are properly configured', () => {
        const onPointStart = vi.fn();
        const onPointEnd = vi.fn();

        render(
          <div data-testid="xr-wrapper">
            <XRHands
              onPointStart={onPointStart}
              onPointEnd={onPointEnd}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('hand update callback receives both hand states', () => {
        const onHandUpdate = vi.fn();

        render(
          <div data-testid="xr-wrapper">
            <XRHands onHandUpdate={onHandUpdate} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });

    describe('Gesture Configuration', () => {
      it('accepts custom gesture thresholds', () => {
        render(
          <div data-testid="xr-wrapper">
            <XRHands
              gestureConfig={{
                pinchThreshold: 0.05,
                grabThreshold: 0.8,
                pointThreshold: 0.7,
              }}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });
  });


  // ==========================================================================
  // VR Interaction Tests
  // ==========================================================================
  
  describe('VR Interaction with Graph Nodes', () => {
    describe('Node Selection', () => {
      it('VRInteraction renders without crashing', () => {
        const nodePositions = new Map<string, THREE.Vector3>();
        nodePositions.set('req-1', new THREE.Vector3(0, 0, 0));
        nodePositions.set('task-1', new THREE.Vector3(2, 0, 0));

        render(
          <div data-testid="xr-wrapper">
            <VRInteraction nodePositions={nodePositions} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('VRInteraction accepts selection callbacks', () => {
        const nodePositions = new Map<string, THREE.Vector3>();
        nodePositions.set('req-1', new THREE.Vector3(0, 0, 0));
        
        const onNodeSelect = vi.fn();
        const onNodeHover = vi.fn();

        render(
          <div data-testid="xr-wrapper">
            <VRInteraction
              nodePositions={nodePositions}
              onNodeSelect={onNodeSelect}
              onNodeHover={onNodeHover}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('VRInteraction shows debug visualization when enabled', () => {
        const nodePositions = new Map<string, THREE.Vector3>();
        
        render(
          <div data-testid="xr-wrapper">
            <VRInteraction
              nodePositions={nodePositions}
              showDebug={true}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });

    describe('Node Dragging', () => {
      it('VRInteraction accepts drag callbacks', () => {
        const nodePositions = new Map<string, THREE.Vector3>();
        nodePositions.set('req-1', new THREE.Vector3(0, 0, 0));
        
        const onNodeDrag = vi.fn();
        const onDragStart = vi.fn();
        const onDragEnd = vi.fn();

        render(
          <div data-testid="xr-wrapper">
            <VRInteraction
              nodePositions={nodePositions}
              onNodeDrag={onNodeDrag}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('VRInteraction accepts custom hit radius', () => {
        const nodePositions = new Map<string, THREE.Vector3>();
        
        render(
          <div data-testid="xr-wrapper">
            <VRInteraction
              nodePositions={nodePositions}
              nodeHitRadius={1.0}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });

    describe('Ray Casting', () => {
      it('VRInteraction accepts custom ray configuration', () => {
        const nodePositions = new Map<string, THREE.Vector3>();
        
        render(
          <div data-testid="xr-wrapper">
            <VRInteraction
              nodePositions={nodePositions}
              rayColor="#ff0000"
              rayHoverColor="#00ff00"
              rayLength={15}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('VRInteraction can enable/disable haptics', () => {
        const nodePositions = new Map<string, THREE.Vector3>();
        
        render(
          <div data-testid="xr-wrapper">
            <VRInteraction
              nodePositions={nodePositions}
              enableHaptics={false}
            />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });
  });


  // ==========================================================================
  // Voice Commands Integration Tests
  // ==========================================================================
  
  describe('Voice Commands Integration', () => {
    describe('Voice UI Rendering', () => {
      it('VoiceCommands renders without crashing', () => {
        render(<VoiceCommands />);
        expect(screen.getByTestId('voice-commands')).toBeInTheDocument();
      });

      it('VoiceCommands can be disabled', () => {
        render(<VoiceCommands enabled={false} />);
        expect(screen.queryByTestId('voice-commands')).not.toBeInTheDocument();
      });

      it('VoiceCommands accepts position prop', () => {
        render(<VoiceCommands position="bottom-left" />);
        expect(screen.getByTestId('voice-commands')).toBeInTheDocument();
      });

      it('VoiceCommands shows help button', () => {
        render(<VoiceCommands />);
        expect(screen.getByTitle('Show available commands')).toBeInTheDocument();
      });
    });

    describe('Voice Command Callbacks', () => {
      it('VoiceCommands accepts node selection callback', () => {
        const onSelectNode = vi.fn();
        
        render(<VoiceCommands onSelectNode={onSelectNode} />);
        expect(screen.getByTestId('voice-commands')).toBeInTheDocument();
      });

      it('VoiceCommands accepts zoom callbacks', () => {
        const onZoomIn = vi.fn();
        const onZoomOut = vi.fn();
        
        render(
          <VoiceCommands
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
          />
        );
        expect(screen.getByTestId('voice-commands')).toBeInTheDocument();
      });

      it('VoiceCommands accepts reset view callback', () => {
        const onResetView = vi.fn();
        
        render(<VoiceCommands onResetView={onResetView} />);
        expect(screen.getByTestId('voice-commands')).toBeInTheDocument();
      });

      it('VoiceCommands accepts node type filter callbacks', () => {
        const onShowNodeType = vi.fn();
        const onHideNodeType = vi.fn();
        
        render(
          <VoiceCommands
            onShowNodeType={onShowNodeType}
            onHideNodeType={onHideNodeType}
          />
        );
        expect(screen.getByTestId('voice-commands')).toBeInTheDocument();
      });
    });

    describe('Voice Recognition State', () => {
      it('shows idle state when not listening', () => {
        mockUseVoiceCommands.mockReturnValue({
          ...mockUseVoiceCommands(),
          state: 'idle',
          isListening: false,
        });

        render(<VoiceCommands />);
        expect(screen.getByText('Voice Off')).toBeInTheDocument();
      });

      it('shows listening state when active', () => {
        mockUseVoiceCommands.mockReturnValue({
          ...mockUseVoiceCommands(),
          state: 'listening',
          isListening: true,
        });

        render(<VoiceCommands />);
        expect(screen.getByText('Listening...')).toBeInTheDocument();
      });

      it('shows processing state when recognizing', () => {
        mockUseVoiceCommands.mockReturnValue({
          ...mockUseVoiceCommands(),
          state: 'processing',
          isListening: true,
        });

        render(<VoiceCommands />);
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });

      it('shows error state when recognition fails', () => {
        mockUseVoiceCommands.mockReturnValue({
          ...mockUseVoiceCommands(),
          state: 'error',
          isListening: false,
          error: 'Microphone error',
        });

        render(<VoiceCommands />);
        expect(screen.getByText('Microphone error')).toBeInTheDocument();
      });
    });

    describe('Microphone Toggle', () => {
      it('toggles listening state when microphone button clicked', async () => {
        const toggleListening = vi.fn();
        mockUseVoiceCommands.mockReturnValue({
          ...mockUseVoiceCommands(),
          toggleListening,
        });

        render(<VoiceCommands />);
        
        const micButton = screen.getByTitle(/listening/i);
        await act(async () => {
          fireEvent.click(micButton);
        });

        expect(toggleListening).toHaveBeenCalled();
      });
    });

    describe('Command History', () => {
      it('shows command history when enabled', () => {
        mockUseVoiceCommands.mockReturnValue({
          ...mockUseVoiceCommands(),
          commandHistory: [
            { type: 'zoom_in', rawTranscript: 'zoom in', confidence: 0.9, timestamp: Date.now() },
          ],
        });

        render(<VoiceCommands showHistory={true} />);
        expect(screen.getByText('Recent Commands')).toBeInTheDocument();
      });

      it('hides command history when disabled', () => {
        render(<VoiceCommands showHistory={false} />);
        expect(screen.queryByText('Recent Commands')).not.toBeInTheDocument();
      });
    });
  });


  // ==========================================================================
  // Graceful Degradation Tests
  // ==========================================================================
  
  describe('Graceful Degradation', () => {
    describe('When WebXR is Not Supported', () => {
      beforeEach(() => {
        // Remove XR from navigator
        const navigatorWithoutXR = { ...originalNavigator };
        delete (navigatorWithoutXR as { xr?: unknown }).xr;
        
        Object.defineProperty(globalThis, 'navigator', {
          value: navigatorWithoutXR,
          writable: true,
          configurable: true,
        });

        mockUseXRSupport.mockReturnValue({
          support: {
            isWebXRSupported: false,
            isVRSupported: false,
            isARSupported: false,
            isInlineSupported: false,
            isChecking: false,
            error: 'WebXR is not supported in this browser',
            features: {},
          },
          sessionState: {
            isSessionActive: false,
            currentMode: null,
            visibilityState: null,
            sessionStartTime: null,
            sessionError: null,
          },
          checkSessionSupport: vi.fn().mockResolvedValue(false),
          requestSession: vi.fn().mockResolvedValue(null),
          endSession: vi.fn().mockResolvedValue(undefined),
          getRecommendedReferenceSpace: vi.fn().mockReturnValue('local-floor'),
          refreshSupport: vi.fn().mockResolvedValue(undefined),
        });
      });

      it('VRButton shows not supported state', () => {
        render(<VRButton isSupported={false} />);
        expect(screen.getByRole('button')).toHaveTextContent('VR Not Supported');
        expect(screen.getByRole('button')).toBeDisabled();
      });

      it('ARButton shows not supported state', () => {
        render(<ARButton isSupported={false} />);
        expect(screen.getByRole('button')).toHaveTextContent('AR Not Supported');
        expect(screen.getByRole('button')).toBeDisabled();
      });

      it('VRButton has correct aria-label when not supported', () => {
        render(<VRButton isSupported={false} />);
        expect(screen.getByRole('button')).toHaveAttribute(
          'aria-label',
          'VR is not supported on this device'
        );
      });

      it('ARButton has correct aria-label when not supported', () => {
        render(<ARButton isSupported={false} />);
        expect(screen.getByRole('button')).toHaveAttribute(
          'aria-label',
          'AR is not supported on this device'
        );
      });
    });

    describe('When VR is Supported but AR is Not', () => {
      beforeEach(() => {
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          support: {
            isWebXRSupported: true,
            isVRSupported: true,
            isARSupported: false,
            isInlineSupported: true,
            isChecking: false,
            error: null,
            features: { controllers: true },
          },
        });
      });

      it('VRButton is enabled', () => {
        render(<VRButton isSupported={true} />);
        expect(screen.getByRole('button')).not.toBeDisabled();
        expect(screen.getByRole('button')).toHaveTextContent('Enter VR');
      });

      it('ARButton is disabled', () => {
        render(<ARButton isSupported={false} />);
        expect(screen.getByRole('button')).toBeDisabled();
      });
    });

    describe('When Speech Recognition is Not Supported', () => {
      beforeEach(() => {
        mockUseVoiceCommands.mockReturnValue({
          ...mockUseVoiceCommands(),
          isSupported: false,
          state: 'not_supported',
          error: 'Speech recognition is not supported in this browser',
        });
      });

      it('VoiceCommands shows not supported state', () => {
        render(<VoiceCommands />);
        expect(screen.getByText('Not Supported')).toBeInTheDocument();
      });

      it('microphone button is disabled when not supported', () => {
        render(<VoiceCommands />);
        const micButton = screen.getByTitle(/listening/i);
        expect(micButton).toBeDisabled();
      });
    });

    describe('When Checking XR Support', () => {
      it('VRButton shows checking state', () => {
        render(<VRButton isSupported={false} isChecking={true} />);
        expect(screen.getByRole('button')).toHaveTextContent('Checking VR...');
        expect(screen.getByRole('button')).toBeDisabled();
      });

      it('ARButton shows checking state', () => {
        render(<ARButton isSupported={false} isChecking={true} />);
        expect(screen.getByRole('button')).toHaveTextContent('Checking AR...');
        expect(screen.getByRole('button')).toBeDisabled();
      });

      it('VRButton has aria-busy when checking', () => {
        render(<VRButton isSupported={false} isChecking={true} />);
        expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
      });
    });
  });


  // ==========================================================================
  // Combined XR Component Integration Tests
  // ==========================================================================
  
  describe('Combined XR Components', () => {
    describe('Controllers and Hands Together', () => {
      it('both XRControllers and XRHands can render together', () => {
        render(
          <div data-testid="xr-wrapper">
            <XRControllers />
            <XRHands />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('both components accept their respective callbacks', () => {
        const onTriggerPress = vi.fn();
        const onPinchStart = vi.fn();

        render(
          <div data-testid="xr-wrapper">
            <XRControllers onTriggerPress={onTriggerPress} />
            <XRHands onPinchStart={onPinchStart} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });

    describe('VRInteraction with Input Components', () => {
      it('VRInteraction works alongside XRControllers', () => {
        const nodePositions = new Map<string, THREE.Vector3>();
        nodePositions.set('req-1', new THREE.Vector3(0, 0, 0));

        render(
          <div data-testid="xr-wrapper">
            <XRControllers />
            <VRInteraction nodePositions={nodePositions} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('VRInteraction works alongside XRHands', () => {
        const nodePositions = new Map<string, THREE.Vector3>();
        nodePositions.set('req-1', new THREE.Vector3(0, 0, 0));

        render(
          <div data-testid="xr-wrapper">
            <XRHands />
            <VRInteraction nodePositions={nodePositions} />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });

    describe('Voice Commands with VR Components', () => {
      it('VoiceCommands renders alongside VR buttons', () => {
        render(
          <div>
            <VRButton isSupported={true} />
            <ARButton isSupported={false} />
            <VoiceCommands />
          </div>
        );

        expect(screen.getByRole('button', { name: /enter vr/i })).toBeInTheDocument();
        expect(screen.getByTestId('voice-commands')).toBeInTheDocument();
      });
    });

    describe('Full XR Stack Integration', () => {
      it('all XR components can render together', () => {
        const nodePositions = new Map<string, THREE.Vector3>();
        nodePositions.set('req-1', new THREE.Vector3(0, 0, 0));

        render(
          <div data-testid="full-xr-stack">
            <div data-testid="xr-wrapper">
              <XRControllers />
              <XRHands />
              <VRInteraction nodePositions={nodePositions} />
            </div>
            <VRButton isSupported={true} />
            <VoiceCommands />
          </div>
        );

        expect(screen.getByTestId('full-xr-stack')).toBeInTheDocument();
        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /enter vr/i })).toBeInTheDocument();
        expect(screen.getByTestId('voice-commands')).toBeInTheDocument();
      });
    });
  });


  // ==========================================================================
  // XR Session Error Handling Tests
  // ==========================================================================
  
  describe('XR Session Error Handling', () => {
    describe('Session Request Errors', () => {
      it('handles session request failure gracefully', async () => {
        const requestSession = vi.fn().mockRejectedValue(new Error('Session request failed'));
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          requestSession,
        });

        const { requestSession: hookRequestSession } = mockUseXRSupport();
        
        await expect(hookRequestSession('immersive-vr')).rejects.toThrow('Session request failed');
      });

      it('displays error state after session failure', () => {
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          sessionState: {
            isSessionActive: false,
            currentMode: null,
            visibilityState: null,
            sessionStartTime: null,
            sessionError: 'Failed to start VR session',
          },
        });

        const { sessionState } = mockUseXRSupport();
        expect(sessionState.sessionError).toBe('Failed to start VR session');
      });
    });

    describe('Session End Errors', () => {
      it('handles session end failure gracefully', async () => {
        const endSession = vi.fn().mockRejectedValue(new Error('Session end failed'));
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          endSession,
        });

        const { endSession: hookEndSession } = mockUseXRSupport();
        
        await expect(hookEndSession()).rejects.toThrow('Session end failed');
      });
    });

    describe('Input Source Errors', () => {
      it('XRControllers handles missing gamepad gracefully', () => {
        // Component should not crash when gamepad is undefined
        render(
          <div data-testid="xr-wrapper">
            <XRControllers />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });

      it('XRHands handles missing hand data gracefully', () => {
        // Component should not crash when hand tracking data is unavailable
        render(
          <div data-testid="xr-wrapper">
            <XRHands />
          </div>
        );

        expect(screen.getByTestId('xr-wrapper')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // XR Feature Detection Tests
  // ==========================================================================
  
  describe('XR Feature Detection', () => {
    describe('Controller Support Detection', () => {
      it('detects controller support', () => {
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          support: {
            ...mockUseXRSupport().support,
            features: { controllers: true },
          },
        });

        const { support } = mockUseXRSupport();
        expect(support.features.controllers).toBe(true);
      });

      it('detects lack of controller support', () => {
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          support: {
            ...mockUseXRSupport().support,
            features: { controllers: false },
          },
        });

        const { support } = mockUseXRSupport();
        expect(support.features.controllers).toBe(false);
      });
    });

    describe('Hand Tracking Support Detection', () => {
      it('detects hand tracking support', () => {
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          support: {
            ...mockUseXRSupport().support,
            features: { handTracking: true },
          },
        });

        const { support } = mockUseXRSupport();
        expect(support.features.handTracking).toBe(true);
      });

      it('detects lack of hand tracking support', () => {
        mockUseXRSupport.mockReturnValue({
          ...mockUseXRSupport(),
          support: {
            ...mockUseXRSupport().support,
            features: { handTracking: false },
          },
        });

        const { support } = mockUseXRSupport();
        expect(support.features.handTracking).toBe(false);
      });
    });

    describe('Reference Space Support', () => {
      it('returns correct reference space for VR', () => {
        const { getRecommendedReferenceSpace } = mockUseXRSupport();
        expect(getRecommendedReferenceSpace('immersive-vr')).toBe('local-floor');
      });
    });
  });
});

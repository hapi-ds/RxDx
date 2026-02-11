/**
 * GraphView3D Component
 * 3D graph visualization using React Three Fiber with WebXR support
 * Renders nodes and edges from the graphStore in 3D space with VR capabilities
 * Implements force-directed layout algorithm for natural graph positioning
 * Enhanced OrbitControls with auto-rotate, keyboard navigation, zoom-to-fit,
 * camera reset, smooth transitions, and touch gesture support
 * 
 * WebXR Features:
 * - VR mode (immersive-vr) with local-floor reference space
 * - AR mode (immersive-ar) with optional plane detection
 * - Session event handlers for start, end, and visibility changes
 * - XR feature detection with graceful degradation
 * - Controller and hand tracking support
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://docs.pmnd.rs/react-three-fiber
 * @see https://github.com/pmndrs/xr
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
 */

import React, { useEffect, useMemo, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Line, Text, QuadraticBezierLine, Cone } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { XR, createXRStore } from '@react-three/xr';
import { useGraphStore, type GraphNodeData } from '../../stores/graphStore';
import type { GraphEdge } from '../../services/graphService';
import { useXRSupport, type XRSessionMode, type XRSessionConfig, DEFAULT_XR_CONFIG } from '../../hooks/useXRSupport';
import { VRButton, ARButton, XRControllers, XRHands, VRInteraction, VoiceCommands, XRFallbackMessage } from '../xr';
import type { XRUnavailableReason } from '../xr/XRFallbackMessage';
import type { ControllerHandedness, ControllerInputState } from '../xr/XRControllers';
import type { HandTrackingState } from '../xr/XRHands';
import type { InteractionSource } from '../xr/VRInteraction';
import type { FilterableNodeType } from '../../hooks/useVoiceCommands';
import type { Node, Edge } from '@xyflow/react';
import * as THREE from 'three';
import {
  isQuestDevice,
  getQuestCapabilities,
  getQuestXRConfig,
  applyQuestPolyfills,
  getDeviceInfoString,
} from '../../utils/questOptimizations';

// ============================================================================
// XR Store Configuration
// ============================================================================

/**
 * XR store configuration options
 * @see https://github.com/pmndrs/xr#createxrstore
 */
export interface XRStoreConfig {
  /** Enable controller support */
  controller: boolean;
  /** Enable hand tracking */
  hand: boolean;
  /** Enable gaze/eye tracking */
  gaze: boolean;
  /** Frame rate preference: 'high' (90Hz) or 'low' (72Hz) */
  frameRate: 'high' | 'low';
  /** Foveation level (0-1, higher = more foveation for performance) */
  foveation: number;
}

/**
 * Default XR store configuration
 * Optimized for Meta Quest devices with high frame rate and foveation
 */
const DEFAULT_XR_STORE_CONFIG: XRStoreConfig = {
  controller: true,
  hand: true,
  gaze: true,
  frameRate: 'high',
  foveation: 1,
};

/**
 * Create XR store for WebXR session management
 * Configured with controllers, hand tracking, and gaze support
 * Frame rate set to 'high' for 90Hz on supported devices (Quest 2/3/Pro)
 * Foveation set to 1 for maximum performance optimization
 * 
 * Automatically detects Quest devices and applies device-specific optimizations
 */
const createConfiguredXRStore = (config: XRStoreConfig = DEFAULT_XR_STORE_CONFIG) => {
  // Apply Quest-specific optimizations if running on Quest device
  const capabilities = getQuestCapabilities();
  
  // Log device info for debugging
  if (isQuestDevice()) {
    console.log('[GraphView3D] Quest device detected:', getDeviceInfoString());
    console.log('[GraphView3D] Using Quest XR config:', getQuestXRConfig());
  }
  
  // Merge Quest config with provided config
  const mergedConfig: XRStoreConfig = {
    controller: config.controller,
    hand: config.hand,
    gaze: config.gaze,
    frameRate: capabilities?.recommendedRefreshRate === 90 ? 'high' : config.frameRate,
    foveation: capabilities?.recommendedFoveation ?? config.foveation,
  };
  
  return createXRStore({
    controller: mergedConfig.controller,
    hand: mergedConfig.hand,
    gaze: mergedConfig.gaze,
    frameRate: mergedConfig.frameRate,
    foveation: mergedConfig.foveation,
  });
};

// Lazy XR store initialization to prevent crashes when WebGL/XR is unavailable
let xrStore: ReturnType<typeof createConfiguredXRStore> | null = null;
let xrStoreError: Error | null = null;

/**
 * Get or create the XR store lazily
 * This prevents module-level crashes when WebGL/XR APIs are unavailable
 */
const getXRStore = (): ReturnType<typeof createConfiguredXRStore> | null => {
  if (xrStoreError) {
    return null;
  }
  if (xrStore) {
    return xrStore;
  }
  try {
    // Apply Quest polyfills before creating store
    applyQuestPolyfills();
    xrStore = createConfiguredXRStore();
    return xrStore;
  } catch (error) {
    console.warn('[GraphView3D] Failed to create XR store:', error);
    xrStoreError = error instanceof Error ? error : new Error('XR initialization failed');
    return null;
  }
};

// ============================================================================
// Force-Directed Layout Configuration
// ============================================================================

/**
 * Configuration parameters for the force-directed layout algorithm
 * These can be adjusted to tune the layout behavior
 */
export interface ForceLayoutConfig {
  /** Repulsion force strength between nodes (Coulomb's law constant) */
  repulsionStrength: number;
  /** Attraction force strength along edges (spring constant / Hooke's law) */
  attractionStrength: number;
  /** Ideal edge length (rest length of springs) */
  idealEdgeLength: number;
  /** Center gravity strength to keep graph centered */
  centerGravity: number;
  /** Damping factor to slow down velocities (0-1, higher = more damping) */
  damping: number;
  /** Initial temperature for simulated annealing */
  initialTemperature: number;
  /** Cooling rate per frame (temperature multiplier) */
  coolingRate: number;
  /** Minimum temperature threshold to stop simulation */
  minTemperature: number;
  /** Maximum velocity to prevent instability */
  maxVelocity: number;
  /** Barnes-Hut theta parameter for spatial partitioning (0 = exact, higher = faster but less accurate) */
  barnesHutTheta: number;
  /** Whether to use Barnes-Hut optimization for large graphs */
  useBarnesHut: boolean;
  /** Node count threshold to enable Barnes-Hut optimization */
  barnesHutThreshold: number;
}

/**
 * Default configuration for force-directed layout
 */
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_FORCE_CONFIG: ForceLayoutConfig = {
  repulsionStrength: 500,
  attractionStrength: 0.1,
  idealEdgeLength: 3,
  centerGravity: 0.02,
  damping: 0.85,
  initialTemperature: 1.0,
  coolingRate: 0.995,
  minTemperature: 0.001,
  maxVelocity: 2.0,
  barnesHutTheta: 0.5,
  useBarnesHut: true,
  barnesHutThreshold: 50,
};

// ============================================================================
// Force-Directed Layout State
// ============================================================================

/**
 * State for a single node in the force simulation
 */
interface NodeSimState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  force: THREE.Vector3;
  mass: number;
  pinned: boolean;
}

/**
 * State for the entire force simulation
 */
interface SimulationState {
  nodes: Map<string, NodeSimState>;
  temperature: number;
  isRunning: boolean;
  iteration: number;
}

// ============================================================================
// Barnes-Hut Octree for Spatial Partitioning
// ============================================================================

/**
 * Octree node for Barnes-Hut algorithm
 * Used for O(n log n) force calculation instead of O(n²)
 */
class OctreeNode {
  bounds: THREE.Box3;
  centerOfMass: THREE.Vector3;
  totalMass: number;
  children: (OctreeNode | null)[];
  body: { position: THREE.Vector3; mass: number } | null;
  isLeaf: boolean;

  constructor(bounds: THREE.Box3) {
    this.bounds = bounds;
    this.centerOfMass = new THREE.Vector3();
    this.totalMass = 0;
    this.children = new Array(8).fill(null);
    this.body = null;
    this.isLeaf = true;
  }

  insert(position: THREE.Vector3, mass: number): void {
    if (!this.bounds.containsPoint(position)) return;

    if (this.totalMass === 0) {
      // Empty node, add body directly
      this.body = { position: position.clone(), mass };
      this.centerOfMass.copy(position);
      this.totalMass = mass;
      return;
    }

    if (this.isLeaf && this.body) {
      // Node has one body, need to subdivide
      this.subdivide();
      const oldBody = this.body;
      this.body = null;
      this.insertIntoChild(oldBody.position, oldBody.mass);
    }

    // Insert into appropriate child
    this.insertIntoChild(position, mass);

    // Update center of mass
    const newTotalMass = this.totalMass + mass;
    this.centerOfMass.multiplyScalar(this.totalMass);
    this.centerOfMass.add(position.clone().multiplyScalar(mass));
    this.centerOfMass.divideScalar(newTotalMass);
    this.totalMass = newTotalMass;
  }

  private subdivide(): void {
    this.isLeaf = false;
    const center = this.bounds.getCenter(new THREE.Vector3());
    const min = this.bounds.min;
    const max = this.bounds.max;

    // Create 8 children octants
    for (let i = 0; i < 8; i++) {
      const childMin = new THREE.Vector3(
        (i & 1) ? center.x : min.x,
        (i & 2) ? center.y : min.y,
        (i & 4) ? center.z : min.z
      );
      const childMax = new THREE.Vector3(
        (i & 1) ? max.x : center.x,
        (i & 2) ? max.y : center.y,
        (i & 4) ? max.z : center.z
      );
      this.children[i] = new OctreeNode(new THREE.Box3(childMin, childMax));
    }
  }

  private insertIntoChild(position: THREE.Vector3, mass: number): void {
    const center = this.bounds.getCenter(new THREE.Vector3());
    const index = 
      (position.x > center.x ? 1 : 0) +
      (position.y > center.y ? 2 : 0) +
      (position.z > center.z ? 4 : 0);
    this.children[index]?.insert(position, mass);
  }

  calculateForce(position: THREE.Vector3, theta: number, repulsionStrength: number): THREE.Vector3 {
    const force = new THREE.Vector3();
    
    if (this.totalMass === 0) return force;

    const diff = new THREE.Vector3().subVectors(position, this.centerOfMass);
    const distance = diff.length();

    if (distance < 0.01) return force; // Avoid division by zero

    const size = this.bounds.getSize(new THREE.Vector3()).length();

    // Barnes-Hut criterion: if node is far enough, treat as single body
    if (this.isLeaf || (size / distance) < theta) {
      // Coulomb's law: F = k * m1 * m2 / r²
      const magnitude = repulsionStrength * this.totalMass / (distance * distance);
      force.copy(diff).normalize().multiplyScalar(magnitude);
    } else {
      // Recurse into children
      for (const child of this.children) {
        if (child && child.totalMass > 0) {
          force.add(child.calculateForce(position, theta, repulsionStrength));
        }
      }
    }

    return force;
  }
}


// ============================================================================
// Force Simulation Hook
// ============================================================================

/**
 * Custom hook for managing force-directed layout simulation
 * Handles physics calculations, animation, and node dragging
 */
function useForceSimulation(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
  config: ForceLayoutConfig = DEFAULT_FORCE_CONFIG
): {
  positions: Map<string, THREE.Vector3>;
  isSimulating: boolean;
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  pinNode: (nodeId: string, position?: THREE.Vector3) => void;
  unpinNode: (nodeId: string) => void;
  dragNode: (nodeId: string, position: THREE.Vector3) => void;
} {
  const simulationRef = useRef<SimulationState>({
    nodes: new Map(),
    temperature: config.initialTemperature,
    isRunning: true,
    iteration: 0,
  });

  const [positions, setPositions] = useState<Map<string, THREE.Vector3>>(new Map());
  const [isSimulating, setIsSimulating] = useState(true);

  // Initialize simulation state when nodes change
  useEffect(() => {
    const sim = simulationRef.current;
    const existingNodes = sim.nodes;
    const newNodes = new Map<string, NodeSimState>();

    // Calculate initial positions using Fibonacci sphere for new nodes
    const nodeCount = nodes.length;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const radius = Math.max(5, Math.sqrt(nodeCount) * 2);

    nodes.forEach((node, index) => {
      if (existingNodes.has(node.id)) {
        // Preserve existing node state
        newNodes.set(node.id, existingNodes.get(node.id)!);
      } else {
        // Create new node with Fibonacci sphere position
        const i = index + 0.5;
        const phi = Math.acos(1 - (2 * i) / nodeCount);
        const theta = 2 * Math.PI * i / goldenRatio;

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        newNodes.set(node.id, {
          position: new THREE.Vector3(x, y, z),
          velocity: new THREE.Vector3(),
          force: new THREE.Vector3(),
          mass: 1,
          pinned: false,
        });
      }
    });

    sim.nodes = newNodes;
    sim.temperature = config.initialTemperature;
    sim.isRunning = true;
    sim.iteration = 0;
    setIsSimulating(true);

    // Update positions state
    const posMap = new Map<string, THREE.Vector3>();
    newNodes.forEach((state, id) => {
      posMap.set(id, state.position.clone());
    });
    setPositions(posMap);
  }, [nodes, config.initialTemperature]);

  // Calculate forces and update positions each frame
  useFrame((_, delta) => {
    const sim = simulationRef.current;
    if (!sim.isRunning || sim.temperature < config.minTemperature) {
      if (sim.isRunning) {
        sim.isRunning = false;
        setIsSimulating(false);
      }
      return;
    }

    // Clamp delta to prevent instability
    const dt = Math.min(delta, 0.05);
    const nodeArray = Array.from(sim.nodes.entries());
    const useBarnesHut = config.useBarnesHut && nodeArray.length > config.barnesHutThreshold;

    // Build octree for Barnes-Hut if needed
    let octree: OctreeNode | null = null;
    if (useBarnesHut) {
      // Calculate bounds
      const bounds = new THREE.Box3();
      nodeArray.forEach(([, state]) => {
        bounds.expandByPoint(state.position);
      });
      // Expand bounds slightly
      bounds.expandByScalar(10);
      
      octree = new OctreeNode(bounds);
      nodeArray.forEach(([, state]) => {
        octree!.insert(state.position, state.mass);
      });
    }

    // Reset forces
    nodeArray.forEach(([, state]) => {
      state.force.set(0, 0, 0);
    });

    // Calculate repulsion forces
    if (useBarnesHut && octree) {
      // Barnes-Hut O(n log n) approximation
      nodeArray.forEach(([, state]) => {
        const repulsion = octree!.calculateForce(
          state.position,
          config.barnesHutTheta,
          config.repulsionStrength
        );
        state.force.add(repulsion);
      });
    } else {
      // Direct O(n²) calculation for small graphs
      for (let i = 0; i < nodeArray.length; i++) {
        for (let j = i + 1; j < nodeArray.length; j++) {
          const [, stateA] = nodeArray[i];
          const [, stateB] = nodeArray[j];

          const diff = new THREE.Vector3().subVectors(stateA.position, stateB.position);
          const distance = diff.length();

          if (distance < 0.01) continue;

          // Coulomb's law: F = k / r²
          const magnitude = config.repulsionStrength / (distance * distance);
          const force = diff.normalize().multiplyScalar(magnitude);

          stateA.force.add(force);
          stateB.force.sub(force);
        }
      }
    }

    // Calculate attraction forces along edges (Hooke's law)
    edges.forEach(edge => {
      const sourceState = sim.nodes.get(edge.source);
      const targetState = sim.nodes.get(edge.target);

      if (!sourceState || !targetState) return;

      const diff = new THREE.Vector3().subVectors(targetState.position, sourceState.position);
      const distance = diff.length();

      if (distance < 0.01) return;

      // Hooke's law: F = k * (x - x0)
      const displacement = distance - config.idealEdgeLength;
      const magnitude = config.attractionStrength * displacement;
      const force = diff.normalize().multiplyScalar(magnitude);

      sourceState.force.add(force);
      targetState.force.sub(force);
    });

    // Apply center gravity
    nodeArray.forEach(([, state]) => {
      const toCenter = state.position.clone().negate();
      toCenter.multiplyScalar(config.centerGravity);
      state.force.add(toCenter);
    });

    // Update velocities and positions
    nodeArray.forEach(([, state]) => {
      if (state.pinned) return;

      // Apply force to velocity (F = ma, a = F/m)
      const acceleration = state.force.clone().divideScalar(state.mass);
      state.velocity.add(acceleration.multiplyScalar(dt));

      // Apply damping
      state.velocity.multiplyScalar(config.damping);

      // Clamp velocity
      const speed = state.velocity.length();
      if (speed > config.maxVelocity * sim.temperature) {
        state.velocity.normalize().multiplyScalar(config.maxVelocity * sim.temperature);
      }

      // Update position
      state.position.add(state.velocity.clone().multiplyScalar(dt));
    });

    // Cool down
    sim.temperature *= config.coolingRate;
    sim.iteration++;

    // Update positions state (throttled to every few frames for performance)
    if (sim.iteration % 2 === 0) {
      const posMap = new Map<string, THREE.Vector3>();
      sim.nodes.forEach((state, id) => {
        posMap.set(id, state.position.clone());
      });
      setPositions(posMap);
    }
  });

  const startSimulation = useCallback(() => {
    simulationRef.current.isRunning = true;
    simulationRef.current.temperature = config.initialTemperature;
    setIsSimulating(true);
  }, [config.initialTemperature]);

  const stopSimulation = useCallback(() => {
    simulationRef.current.isRunning = false;
    setIsSimulating(false);
  }, []);

  const resetSimulation = useCallback(() => {
    const sim = simulationRef.current;
    const nodeCount = sim.nodes.size;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const radius = Math.max(5, Math.sqrt(nodeCount) * 2);

    let index = 0;
    sim.nodes.forEach((state) => {
      const i = index + 0.5;
      const phi = Math.acos(1 - (2 * i) / nodeCount);
      const theta = 2 * Math.PI * i / goldenRatio;

      state.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      state.velocity.set(0, 0, 0);
      state.pinned = false;
      index++;
    });

    sim.temperature = config.initialTemperature;
    sim.isRunning = true;
    sim.iteration = 0;
    setIsSimulating(true);
  }, [config.initialTemperature]);

  const pinNode = useCallback((nodeId: string, position?: THREE.Vector3) => {
    const state = simulationRef.current.nodes.get(nodeId);
    if (state) {
      state.pinned = true;
      if (position) {
        state.position.copy(position);
      }
      state.velocity.set(0, 0, 0);
    }
  }, []);

  const unpinNode = useCallback((nodeId: string) => {
    const state = simulationRef.current.nodes.get(nodeId);
    if (state) {
      state.pinned = false;
    }
  }, []);

  const dragNode = useCallback((nodeId: string, position: THREE.Vector3) => {
    const state = simulationRef.current.nodes.get(nodeId);
    if (state) {
      state.position.copy(position);
      state.velocity.set(0, 0, 0);
      // Reheat simulation slightly when dragging
      if (simulationRef.current.temperature < 0.1) {
        simulationRef.current.temperature = 0.1;
        simulationRef.current.isRunning = true;
        setIsSimulating(true);
      }
    }
  }, []);

  return {
    positions,
    isSimulating,
    startSimulation,
    stopSimulation,
    resetSimulation,
    pinNode,
    unpinNode,
    dragNode,
  };
}


// ============================================================================
// GraphView3D Component
// ============================================================================

/**
 * Props for the GraphView3D component
 */
export interface GraphView3DProps {
  /** Optional CSS class name for the container */
  className?: string;
  /** Optional inline styles for the container */
  style?: React.CSSProperties;
  /** Whether to show VR button (default: true) */
  showVRButton?: boolean;
  /** Whether to show AR button (default: false) */
  showARButton?: boolean;
  /** Whether to enable OrbitControls for desktop navigation (default: true) */
  enableOrbitControls?: boolean;
  /** Ambient light intensity (default: 0.5) */
  ambientLightIntensity?: number;
  /** Point light intensity (default: 1) */
  pointLightIntensity?: number;
  /** Force-directed layout configuration */
  forceConfig?: Partial<ForceLayoutConfig>;
  /** Whether to show simulation controls (default: true) */
  showSimulationControls?: boolean;
  /** Whether to show camera controls UI overlay (default: true) */
  showCameraControls?: boolean;
  /** Whether to enable auto-rotate when idle (default: false) */
  autoRotate?: boolean;
  /** Auto-rotate speed (default: 0.5) */
  autoRotateSpeed?: number;
  /** Whether to enable keyboard navigation (default: true) */
  enableKeyboardNavigation?: boolean;
  /** Camera transition duration in milliseconds (default: 500) */
  cameraTransitionDuration?: number;
  /** XR session configuration */
  xrConfig?: Partial<XRSessionConfig>;
  /** Callback when XR session starts */
  onXRSessionStart?: (mode: XRSessionMode) => void;
  /** Callback when XR session ends */
  onXRSessionEnd?: (mode: XRSessionMode, duration: number) => void;
  /** Callback when XR visibility changes */
  onXRVisibilityChange?: (state: XRVisibilityState) => void;
  /** Callback when XR session error occurs */
  onXRSessionError?: (error: Error, mode: XRSessionMode) => void;
  /** Whether to show XR support status indicator (default: true) */
  showXRStatus?: boolean;
  /** Whether to enable VR controllers (default: true) */
  enableControllers?: boolean;
  /** Whether to enable hand tracking (default: true) */
  enableHandTracking?: boolean;
  /** Whether to show XR input debug visualization (default: false) */
  showXRInputDebug?: boolean;
  /** Callback when VR controller trigger is pressed */
  onControllerTriggerPress?: (handedness: ControllerHandedness, value: number) => void;
  /** Callback when VR controller trigger is released */
  onControllerTriggerRelease?: (handedness: ControllerHandedness) => void;
  /** Callback when VR controller grip is pressed */
  onControllerGripPress?: (handedness: ControllerHandedness, value: number) => void;
  /** Callback when VR controller grip is released */
  onControllerGripRelease?: (handedness: ControllerHandedness) => void;
  /** Callback when VR controller thumbstick is moved */
  onControllerThumbstickMove?: (handedness: ControllerHandedness, x: number, y: number) => void;
  /** Callback when controller state updates */
  onControllerUpdate?: (leftState: ControllerInputState, rightState: ControllerInputState) => void;
  /** Callback when hand pinch gesture starts */
  onHandPinchStart?: (handedness: 'left' | 'right', position: THREE.Vector3) => void;
  /** Callback when hand pinch gesture ends */
  onHandPinchEnd?: (handedness: 'left' | 'right') => void;
  /** Callback when hand grab gesture starts */
  onHandGrabStart?: (handedness: 'left' | 'right') => void;
  /** Callback when hand grab gesture ends */
  onHandGrabEnd?: (handedness: 'left' | 'right') => void;
  /** Callback when hand tracking state updates */
  onHandUpdate?: (leftState: HandTrackingState, rightState: HandTrackingState) => void;
  /** Callback when a node is selected in VR */
  onVRNodeSelect?: (nodeId: string | null, source: InteractionSource) => void;
  /** Callback when a node is hovered in VR */
  onVRNodeHover?: (nodeId: string | null) => void;
  /** Callback when VR drag starts */
  onVRDragStart?: (nodeId: string, source: InteractionSource) => void;
  /** Callback when VR drag ends */
  onVRDragEnd?: (nodeId: string) => void;
  /** Whether to enable voice commands for hands-free operation (default: true) */
  enableVoiceCommands?: boolean;
  /** Whether to show voice command UI (default: true) */
  showVoiceUI?: boolean;
  /** Callback when a node is selected via voice command */
  onVoiceSelectNode?: (nodeName: string) => void;
  /** Callback when zoom in is requested via voice */
  onVoiceZoomIn?: () => void;
  /** Callback when zoom out is requested via voice */
  onVoiceZoomOut?: () => void;
  /** Callback when view reset is requested via voice */
  onVoiceResetView?: () => void;
  /** Callback when nodes of a type should be shown via voice */
  onVoiceShowNodeType?: (nodeType: FilterableNodeType) => void;
  /** Callback when nodes of a type should be hidden via voice */
  onVoiceHideNodeType?: (nodeType: FilterableNodeType) => void;
  /** Whether to hide XR buttons when XR is not supported (default: true for graceful degradation) */
  hideUnsupportedXRButtons?: boolean;
  /** Whether to show fallback message when XR is not available (default: true) */
  showXRFallbackMessage?: boolean;
  /** Auto-dismiss fallback message after specified milliseconds (0 = no auto-dismiss, default: 8000) */
  fallbackMessageAutoDismissMs?: number;
  /** Callback when user attempts to access XR on unsupported device */
  onXRUnavailable?: (reason: XRUnavailableReason) => void;
}

/**
 * Camera controls configuration
 */
export interface CameraControlsConfig {
  /** Enable auto-rotate */
  autoRotate: boolean;
  /** Auto-rotate speed */
  autoRotateSpeed: number;
  /** Enable keyboard navigation */
  enableKeyboard: boolean;
  /** Camera transition duration in ms */
  transitionDuration: number;
}

/**
 * Camera controls ref interface for external control
 */
export interface CameraControlsRef {
  /** Reset camera to initial position */
  resetCamera: () => void;
  /** Zoom to fit all nodes in view */
  zoomToFit: () => void;
  /** Focus camera on a specific node */
  focusOnNode: (nodeId: string) => void;
  /** Toggle auto-rotate */
  toggleAutoRotate: () => void;
  /** Get current auto-rotate state */
  isAutoRotating: () => boolean;
}

/**
 * GraphView3D - 3D graph visualization component with WebXR support
 * Uses React Three Fiber Canvas with XR wrapper for VR compatibility
 * Implements force-directed layout for natural graph positioning
 * Enhanced with auto-rotate, keyboard navigation, zoom-to-fit, and smooth camera transitions
 * 
 * WebXR Features:
 * - VR mode (immersive-vr) with local-floor reference space for standing experiences
 * - AR mode (immersive-ar) with optional plane detection and hit testing
 * - Session event handlers for lifecycle management
 * - XR feature detection with graceful degradation to standard web interface
 * - Controller and hand tracking support for Meta Quest devices
 */
export const GraphView3D: React.FC<GraphView3DProps> = ({
  className,
  style,
  showVRButton = true,
  showARButton = false,
  enableOrbitControls = true,
  ambientLightIntensity = 0.5,
  pointLightIntensity = 1,
  forceConfig,
  showSimulationControls = true,
  showCameraControls = true,
  autoRotate = false,
  autoRotateSpeed = 0.5,
  enableKeyboardNavigation = true,
  cameraTransitionDuration = 500,
  xrConfig,
  onXRSessionStart,
  onXRSessionEnd,
  onXRVisibilityChange,
  onXRSessionError,
  showXRStatus = true,
  enableControllers = true,
  enableHandTracking = true,
  showXRInputDebug = false,
  onControllerTriggerPress,
  onControllerTriggerRelease,
  onControllerGripPress,
  onControllerGripRelease,
  onControllerThumbstickMove,
  onControllerUpdate,
  onHandPinchStart,
  onHandPinchEnd,
  onHandGrabStart,
  onHandGrabEnd,
  onHandUpdate,
  onVRNodeSelect,
  onVRNodeHover,
  onVRDragStart,
  onVRDragEnd,
  enableVoiceCommands = true,
  showVoiceUI = true,
  onVoiceSelectNode,
  onVoiceZoomIn,
  onVoiceZoomOut,
  onVoiceResetView,
  onVoiceShowNodeType,
  onVoiceHideNodeType,
  hideUnsupportedXRButtons = true,
  showXRFallbackMessage = true,
  fallbackMessageAutoDismissMs = 8000,
  onXRUnavailable,
}) => {
  const { 
    isLoading, 
    error, 
    selectNode, 
    searchNodes,
    getFilteredNodes,
  } = useGraphStore();
  
  // Get filtered nodes for rendering
  const nodes = getFilteredNodes();
  
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotate);
  const cameraControlsRef = useRef<CameraControlsRef | null>(null);
  
  // State for graceful degradation fallback message
  const [showFallbackMessage, setShowFallbackMessage] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<XRUnavailableReason>('unknown');
  const [userDismissedFallback, setUserDismissedFallback] = useState(false);

  // Merge XR config with defaults
  const mergedXRConfig = useMemo(() => ({
    ...DEFAULT_XR_CONFIG,
    ...xrConfig,
  }), [xrConfig]);

  // XR support detection and session management
  const {
    support: xrSupport,
    sessionState: xrSessionState,
    requestSession: requestXRSession,
    endSession: endXRSession,
  } = useXRSupport(mergedXRConfig, {
    onSessionStart: (_session, mode) => {
      console.log(`[GraphView3D] XR session started: ${mode}`);
      onXRSessionStart?.(mode);
    },
    onSessionEnd: (mode, duration) => {
      console.log(`[GraphView3D] XR session ended: ${mode}, duration: ${duration}ms`);
      onXRSessionEnd?.(mode, duration);
    },
    onVisibilityChange: (state) => {
      console.log(`[GraphView3D] XR visibility changed: ${state}`);
      onXRVisibilityChange?.(state);
    },
    onSessionError: (error, mode) => {
      console.error(`[GraphView3D] XR session error (${mode}):`, error);
      onXRSessionError?.(error, mode);
    },
  });

  // Merge custom config with defaults
  const config = useMemo(() => ({
    ...DEFAULT_FORCE_CONFIG,
    ...forceConfig,
  }), [forceConfig]);

  // Camera controls config
  const cameraConfig: CameraControlsConfig = useMemo(() => ({
    autoRotate: isAutoRotating,
    autoRotateSpeed,
    enableKeyboard: enableKeyboardNavigation,
    transitionDuration: cameraTransitionDuration,
  }), [isAutoRotating, autoRotateSpeed, enableKeyboardNavigation, cameraTransitionDuration]);

  // ============================================================================
  // Graceful Degradation Logic
  // ============================================================================

  /**
   * Determine the XR unavailable reason based on support status
   */
  const getXRUnavailableReason = useCallback((): XRUnavailableReason => {
    if (!xrSupport.isWebXRSupported) {
      // Check if it's an insecure context
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        return 'insecure-context';
      }
      return 'webxr-not-supported';
    }
    if (!xrSupport.isVRSupported && !xrSupport.isARSupported) {
      return 'no-xr-device';
    }
    if (!xrSupport.isVRSupported) {
      return 'vr-not-supported';
    }
    if (!xrSupport.isARSupported) {
      return 'ar-not-supported';
    }
    if (xrSupport.error) {
      return 'session-error';
    }
    return 'unknown';
  }, [xrSupport]);

  /**
   * Show fallback message when XR support check completes and XR is not available
   * Only show if user hasn't dismissed it and showXRFallbackMessage is enabled
   */
  useEffect(() => {
    if (xrSupport.isChecking || userDismissedFallback || !showXRFallbackMessage) {
      return;
    }

    // Determine if we should show the fallback message
    const shouldShowFallback = 
      !xrSupport.isWebXRSupported ||
      (showVRButton && !xrSupport.isVRSupported) ||
      (showARButton && !xrSupport.isARSupported);

    if (shouldShowFallback) {
      const reason = getXRUnavailableReason();
      // Use a callback to avoid setState in effect
      Promise.resolve().then(() => {
        setFallbackReason(reason);
        setShowFallbackMessage(true);
        onXRUnavailable?.(reason);
      });
      console.log(`[GraphView3D] XR unavailable: ${reason}`);
    }
  }, [
    xrSupport.isChecking,
    xrSupport.isWebXRSupported,
    xrSupport.isVRSupported,
    xrSupport.isARSupported,
    showVRButton,
    showARButton,
    showXRFallbackMessage,
    userDismissedFallback,
    getXRUnavailableReason,
    onXRUnavailable,
  ]);

  /**
   * Handle fallback message dismissal
   */
  const handleFallbackDismiss = useCallback(() => {
    setShowFallbackMessage(false);
    setUserDismissedFallback(true);
  }, []);

  /**
   * Determine if VR button should be shown based on graceful degradation settings
   * - If hideUnsupportedXRButtons is true, hide button when VR is not supported
   * - If hideUnsupportedXRButtons is false, show button (will show "VR Not Supported" state)
   */
  const shouldShowVRButton = useMemo(() => {
    if (!showVRButton) return false;
    if (xrSupport.isChecking) return true; // Show while checking
    if (hideUnsupportedXRButtons && !xrSupport.isVRSupported) return false;
    return true;
  }, [showVRButton, xrSupport.isChecking, xrSupport.isVRSupported, hideUnsupportedXRButtons]);

  /**
   * Determine if AR button should be shown based on graceful degradation settings
   */
  const shouldShowARButton = useMemo(() => {
    if (!showARButton) return false;
    if (xrSupport.isChecking) return true; // Show while checking
    if (hideUnsupportedXRButtons && !xrSupport.isARSupported) return false;
    return true;
  }, [showARButton, xrSupport.isChecking, xrSupport.isARSupported, hideUnsupportedXRButtons]);

  /**
   * Check if any XR buttons will be shown
   */
  const hasAnyXRButtons = shouldShowVRButton || shouldShowARButton;

  // Note: Graph data is loaded by the parent GraphExplorer component
  // No need to load here to avoid duplicate API calls

  // Handler for entering VR mode using useXRSupport hook
  const handleEnterVR = async (): Promise<void> => {
    if (xrSupport.isVRSupported) {
      await requestXRSession('immersive-vr');
    } else {
      // Fallback to xrStore for basic VR entry
      const store = getXRStore();
      if (store) {
        store.enterVR();
      } else {
        console.warn('[GraphView3D] XR store not available for VR entry');
      }
    }
  };

  // Handler for entering AR mode
  const handleEnterAR = async (): Promise<void> => {
    if (xrSupport.isARSupported) {
      await requestXRSession('immersive-ar');
    } else {
      // Fallback to xrStore for basic AR entry
      const store = getXRStore();
      if (store) {
        store.enterAR();
      } else {
        console.warn('[GraphView3D] XR store not available for AR entry');
      }
    }
  };

  // Handler for exiting XR session
  const handleExitXR = async (): Promise<void> => {
    await endXRSession();
  };

  // Camera control handlers
  const handleResetCamera = (): void => {
    cameraControlsRef.current?.resetCamera();
  };

  const handleZoomToFit = (): void => {
    cameraControlsRef.current?.zoomToFit();
  };

  const handleToggleAutoRotate = (): void => {
    setIsAutoRotating(prev => !prev);
  };

  // Voice command handlers
  const handleVoiceSelectNode = useCallback((nodeName: string): void => {
    // Find node by name (case-insensitive partial match)
    const normalizedName = nodeName.toLowerCase();
    const matchingNode = nodes.find(node => {
      const nodeLabel = (node?.data?.label || node?.data?.properties?.title || node?.id || '') as string;
      return nodeLabel.toLowerCase().includes(normalizedName);
    });

    if (matchingNode) {
      selectNode(matchingNode.id);
      // Focus camera on the selected node
      cameraControlsRef.current?.focusOnNode(matchingNode.id);
      console.log(`[GraphView3D] Voice selected node: ${matchingNode.id}`);
    } else {
      // Try searching for the node
      searchNodes(nodeName);
      console.log(`[GraphView3D] Voice search for: ${nodeName}`);
    }

    onVoiceSelectNode?.(nodeName);
  }, [nodes, selectNode, searchNodes, onVoiceSelectNode]);

  const handleVoiceZoomIn = useCallback((): void => {
    // Simulate zoom in by moving camera closer
    // This is a simplified implementation - actual zoom would need camera access
    console.log('[GraphView3D] Voice zoom in');
    onVoiceZoomIn?.();
  }, [onVoiceZoomIn]);

  const handleVoiceZoomOut = useCallback((): void => {
    // Simulate zoom out by moving camera further
    console.log('[GraphView3D] Voice zoom out');
    onVoiceZoomOut?.();
  }, [onVoiceZoomOut]);

  const handleVoiceResetView = useCallback((): void => {
    cameraControlsRef.current?.resetCamera();
    console.log('[GraphView3D] Voice reset view');
    onVoiceResetView?.();
  }, [onVoiceResetView]);

  const handleVoiceShowNodeType = useCallback((nodeType: FilterableNodeType): void => {
    console.log(`[GraphView3D] Voice show node type: ${nodeType}`);
    onVoiceShowNodeType?.(nodeType);
  }, [onVoiceShowNodeType]);

  const handleVoiceHideNodeType = useCallback((nodeType: FilterableNodeType): void => {
    console.log(`[GraphView3D] Voice hide node type: ${nodeType}`);
    onVoiceHideNodeType?.(nodeType);
  }, [onVoiceHideNodeType]);

  // Container styles
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: '400px',
    position: 'relative',
    ...style,
  };

  // Loading state
  if (isLoading && nodes.length === 0) {
    return (
      <div
        className={className}
        style={{
          ...containerStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#ffffff',
        }}
      >
        <div>Loading 3D graph...</div>
      </div>
    );
  }

  // Error state
  if (error && nodes.length === 0) {
    return (
      <div
        className={className}
        style={{
          ...containerStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#ef4444',
        }}
      >
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      {/* XR Support Status Indicator */}
      {showXRStatus && (
        <XRStatusIndicator
          support={xrSupport}
          sessionState={xrSessionState}
        />
      )}

      {/* Camera Controls UI Overlay */}
      {showCameraControls && enableOrbitControls && (
        <CameraControlsOverlay
          isAutoRotating={isAutoRotating}
          onResetCamera={handleResetCamera}
          onZoomToFit={handleZoomToFit}
          onToggleAutoRotate={handleToggleAutoRotate}
        />
      )}

      {/* Voice Commands UI */}
      {enableVoiceCommands && showVoiceUI && (
        <VoiceCommands
          enabled={enableVoiceCommands}
          onSelectNode={handleVoiceSelectNode}
          onZoomIn={handleVoiceZoomIn}
          onZoomOut={handleVoiceZoomOut}
          onResetView={handleVoiceResetView}
          onShowNodeType={handleVoiceShowNodeType}
          onHideNodeType={handleVoiceHideNodeType}
          position="bottom-left"
          showHistory={true}
          maxHistoryItems={3}
        />
      )}

      {/* XR Fallback Message for graceful degradation */}
      {showXRFallbackMessage && showFallbackMessage && !xrSupport.isChecking && (
        <XRFallbackMessage
          show={showFallbackMessage}
          reason={fallbackReason}
          isVRSupported={xrSupport.isVRSupported}
          isARSupported={xrSupport.isARSupported}
          dismissible={true}
          autoDismissMs={fallbackMessageAutoDismissMs}
          onDismiss={handleFallbackDismiss}
          position="bottom"
          showAlternatives={true}
        />
      )}

      {/* XR Buttons Container - Only show if there are buttons to display */}
      {hasAnyXRButtons && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            gap: '12px',
          }}
        >
          {/* VR Button for WebXR entry - conditionally shown based on graceful degradation */}
          {shouldShowVRButton && (
            <VRButton
              isSupported={xrSupport.isVRSupported}
              isChecking={xrSupport.isChecking}
              isInSession={xrSessionState.isSessionActive && xrSessionState.currentMode === 'immersive-vr'}
              onClick={xrSessionState.isSessionActive && xrSessionState.currentMode === 'immersive-vr' ? handleExitXR : handleEnterVR}
            />
          )}

          {/* AR Button for WebXR entry - conditionally shown based on graceful degradation */}
          {shouldShowARButton && (
            <ARButton
              isSupported={xrSupport.isARSupported}
              isChecking={xrSupport.isChecking}
              isInSession={xrSessionState.isSessionActive && xrSessionState.currentMode === 'immersive-ar'}
              onClick={xrSessionState.isSessionActive && xrSessionState.currentMode === 'immersive-ar' ? handleExitXR : handleEnterAR}
            />
          )}
        </div>
      )}
      
      {/* React Three Fiber Canvas with XR support */}
      <Canvas
        style={{ background: '#1a1a2e' }}
        camera={{ position: [0, 5, 15], fov: 60 }}
        gl={{ antialias: true }}
      >
        {/* XR wrapper for WebXR support with store - only render if store is available */}
        {getXRStore() ? (
          <XR store={getXRStore()!}>
            {/* Lighting setup */}
            <ambientLight intensity={ambientLightIntensity} />
            <pointLight position={[10, 10, 10]} intensity={pointLightIntensity} />
            <pointLight position={[-10, -10, -10]} intensity={pointLightIntensity * 0.5} />
            
            {/* Main graph scene with force-directed layout */}
            <GraphScene 
              config={config} 
              showSimulationControls={showSimulationControls}
              cameraControlsRef={cameraControlsRef}
              showXRInputDebug={showXRInputDebug}
              onVRNodeSelect={onVRNodeSelect}
              onVRNodeHover={onVRNodeHover}
              onVRDragStart={onVRDragStart}
              onVRDragEnd={onVRDragEnd}
            />
            
            {/* VR Controllers for input handling */}
            {enableControllers && (
              <XRControllers
                onTriggerPress={onControllerTriggerPress}
                onTriggerRelease={onControllerTriggerRelease}
                onGripPress={onControllerGripPress}
                onGripRelease={onControllerGripRelease}
                onThumbstickMove={onControllerThumbstickMove}
                onControllerUpdate={onControllerUpdate}
                showDebug={showXRInputDebug}
                enableHaptics={true}
              />
            )}
            
            {/* Hand tracking for gesture-based interaction */}
            {enableHandTracking && (
              <XRHands
                onPinchStart={onHandPinchStart}
                onPinchEnd={onHandPinchEnd}
                onGrabStart={onHandGrabStart}
                onGrabEnd={onHandGrabEnd}
                onHandUpdate={onHandUpdate}
                showDebug={showXRInputDebug}
              />
            )}
            
            {/* Enhanced desktop navigation controls */}
            {enableOrbitControls && (
              <EnhancedOrbitControls
                ref={cameraControlsRef}
                cameraConfig={cameraConfig}
              />
            )}
          </XR>
        ) : (
          /* Fallback when XR store is not available - render without XR wrapper */
          <>
            {/* Lighting setup */}
            <ambientLight intensity={ambientLightIntensity} />
            <pointLight position={[10, 10, 10]} intensity={pointLightIntensity} />
            <pointLight position={[-10, -10, -10]} intensity={pointLightIntensity * 0.5} />
            
            {/* Main graph scene with force-directed layout */}
            <GraphScene 
              config={config} 
              showSimulationControls={showSimulationControls}
              cameraControlsRef={cameraControlsRef}
              showXRInputDebug={showXRInputDebug}
              onVRNodeSelect={onVRNodeSelect}
              onVRNodeHover={onVRNodeHover}
              onVRDragStart={onVRDragStart}
              onVRDragEnd={onVRDragEnd}
            />
            
            {/* Enhanced desktop navigation controls */}
            {enableOrbitControls && (
              <EnhancedOrbitControls
                ref={cameraControlsRef}
                cameraConfig={cameraConfig}
              />
            )}
          </>
        )}
      </Canvas>
    </div>
  );
};


// ============================================================================
// XR Status Indicator Component
// ============================================================================

/**
 * Props for XRStatusIndicator component
 */
interface XRStatusIndicatorProps {
  support: {
    isWebXRSupported: boolean;
    isVRSupported: boolean;
    isARSupported: boolean;
    isChecking: boolean;
    error: string | null;
  };
  sessionState: {
    isSessionActive: boolean;
    currentMode: XRSessionMode | null;
    visibilityState: XRVisibilityState | null;
    sessionError: string | null;
  };
}

/**
 * XRStatusIndicator - Shows XR support status and session state
 * Displays in the top-left corner of the 3D view
 */
const XRStatusIndicator: React.FC<XRStatusIndicatorProps> = ({
  support,
  sessionState,
}) => {
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: '8px',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    fontSize: '12px',
    color: '#e2e8f0',
  };

  const statusDotStyle = (isActive: boolean, isError: boolean = false): React.CSSProperties => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: isError ? '#ef4444' : (isActive ? '#10b981' : '#6b7280'),
    marginRight: '6px',
  });

  // Don't show if still checking
  if (support.isChecking) {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ ...statusDotStyle(false), animation: 'pulse 1.5s infinite' }} />
          Checking XR support...
        </div>
      </div>
    );
  }

  // Show error if any
  if (support.error || sessionState.sessionError) {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', color: '#ef4444' }}>
          <span style={statusDotStyle(false, true)} />
          {support.error || sessionState.sessionError}
        </div>
      </div>
    );
  }

  // Show session state if active
  if (sessionState.isSessionActive) {
    const modeLabel = sessionState.currentMode === 'immersive-ar' ? 'AR' : 'VR';
    const visibilityLabel = sessionState.visibilityState === 'visible' 
      ? 'Active' 
      : sessionState.visibilityState === 'visible-blurred' 
        ? 'Blurred' 
        : 'Hidden';

    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={statusDotStyle(true)} />
          {modeLabel} Session: {visibilityLabel}
        </div>
      </div>
    );
  }

  // Show support status
  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={statusDotStyle(support.isWebXRSupported)} />
        WebXR: {support.isWebXRSupported ? 'Supported' : 'Not Supported'}
      </div>
      {support.isWebXRSupported && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '14px' }}>
            <span style={statusDotStyle(support.isVRSupported)} />
            VR: {support.isVRSupported ? 'Available' : 'Unavailable'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '14px' }}>
            <span style={statusDotStyle(support.isARSupported)} />
            AR: {support.isARSupported ? 'Available' : 'Unavailable'}
          </div>
        </>
      )}
    </div>
  );
};


// ============================================================================
// GraphScene Component
// ============================================================================

interface GraphSceneProps {
  config: ForceLayoutConfig;
  showSimulationControls: boolean;
  cameraControlsRef: React.RefObject<CameraControlsRef | null>;
  showXRInputDebug?: boolean;
  onVRNodeSelect?: (nodeId: string | null, source: InteractionSource) => void;
  onVRNodeHover?: (nodeId: string | null) => void;
  onVRDragStart?: (nodeId: string, source: InteractionSource) => void;
  onVRDragEnd?: (nodeId: string) => void;
}

/**
 * GraphScene - Renders the 3D graph nodes and edges with force-directed layout
 * Uses physics simulation for natural-looking node positioning
 * Includes VR interaction support for node selection and movement
 * Synchronizes 3D positions with graphStore for 2D/3D view coordination
 */
const GraphScene: React.FC<GraphSceneProps> = ({ 
  config, 
  showSimulationControls, 
  cameraControlsRef,
  showXRInputDebug = false,
  onVRNodeSelect,
  onVRNodeHover,
  onVRDragStart,
  onVRDragEnd,
}) => {
  const { 
    selectNode, 
    selectRelationship,
    selectedNode, 
    getFilteredNodes, 
    getFilteredEdges,
    updateNodePosition3D,
  } = useGraphStore();
  
  // Get filtered nodes and edges for rendering
  const nodes = getFilteredNodes();
  const edges = getFilteredEdges();
  
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [vrHoveredNode, setVRHoveredNode] = useState<string | null>(null);

  // Force-directed layout simulation
  const {
    positions,
    isSimulating,
    startSimulation,
    stopSimulation,
    resetSimulation,
    pinNode,
    unpinNode,
    dragNode,
  } = useForceSimulation(nodes, edges, config);

  // Expose positions to camera controls for zoom-to-fit and focus functionality
  useEffect(() => {
    if (cameraControlsRef.current && 'setNodePositions' in cameraControlsRef.current) {
      (cameraControlsRef.current as unknown as { setNodePositions: (positions: Map<string, THREE.Vector3>) => void }).setNodePositions(positions);
    }
  }, [positions, cameraControlsRef]);

  // Sync 3D positions to graphStore for 2D/3D view synchronization
  useEffect(() => {
    positions.forEach((position, nodeId) => {
      updateNodePosition3D(nodeId, { x: position.x, y: position.y, z: position.z });
    });
  }, [positions, updateNodePosition3D]);

  // Handle edge hover
  const handleEdgeHover = useCallback((edgeId: string | null) => {
    setHoveredEdge(edgeId);
  }, []);

  // Handle node drag start
  const handleDragStart = useCallback((nodeId: string) => {
    setDraggedNode(nodeId);
    pinNode(nodeId);
  }, [pinNode]);

  // Handle node drag
  const handleDrag = useCallback((nodeId: string, position: THREE.Vector3) => {
    dragNode(nodeId, position);
    // Also update the store for synchronization
    updateNodePosition3D(nodeId, { x: position.x, y: position.y, z: position.z });
  }, [dragNode, updateNodePosition3D]);

  // Handle node drag end
  const handleDragEnd = useCallback(() => {
    setDraggedNode(null);
    // Keep node pinned after drag - user can unpin manually
  }, []);

  // Handle node double-click to unpin
  const handleDoubleClick = useCallback((nodeId: string) => {
    unpinNode(nodeId);
    // Reheat simulation
    startSimulation();
  }, [unpinNode, startSimulation]);

  // Handle node selection and focus
  const handleNodeClick = useCallback((nodeId: string) => {
    selectNode(nodeId);
    // Focus camera on selected node
    if (cameraControlsRef.current) {
      cameraControlsRef.current.focusOnNode(nodeId);
    }
  }, [selectNode, cameraControlsRef]);

  // Handle edge click (select relationship)
  const handleEdgeClick = useCallback((edge: Edge) => {
    // Convert react-three-fiber Edge to GraphEdge format
    const graphEdge: GraphEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'default',
      label: typeof edge.label === 'string' ? edge.label : undefined,
      properties: edge.data,
    };
    selectRelationship(graphEdge);
  }, [selectRelationship]);

  // VR-specific handlers
  const handleVRNodeSelect = useCallback((nodeId: string | null, source: InteractionSource) => {
    if (nodeId) {
      selectNode(nodeId);
      // Focus camera on selected node in VR
      if (cameraControlsRef.current) {
        cameraControlsRef.current.focusOnNode(nodeId);
      }
    } else {
      selectNode(null);
    }
    onVRNodeSelect?.(nodeId, source);
  }, [selectNode, cameraControlsRef, onVRNodeSelect]);

  const handleVRNodeHover = useCallback((nodeId: string | null) => {
    // Update hover state for visual feedback
    setVRHoveredNode(nodeId);
    onVRNodeHover?.(nodeId);
  }, [onVRNodeHover]);

  const handleVRDragStart = useCallback((nodeId: string, source: InteractionSource) => {
    setDraggedNode(nodeId);
    pinNode(nodeId);
    onVRDragStart?.(nodeId, source);
  }, [pinNode, onVRDragStart]);

  const handleVRDrag = useCallback((nodeId: string, position: THREE.Vector3) => {
    dragNode(nodeId, position);
  }, [dragNode]);

  const handleVRDragEnd = useCallback((nodeId: string) => {
    setDraggedNode(null);
    // Keep node pinned after VR drag
    onVRDragEnd?.(nodeId);
  }, [onVRDragEnd]);

  return (
    <group>
      {/* Simulation status indicator */}
      {showSimulationControls && (
        <SimulationIndicator 
          isSimulating={isSimulating}
          onStart={startSimulation}
          onStop={stopSimulation}
          onReset={resetSimulation}
        />
      )}

      {/* Render nodes with force-directed positions */}
      {nodes.map((node) => {
        const position = positions.get(node.id);
        if (!position) return null;

        return (
          <Node3D
            key={node.id}
            node={node}
            position={position}
            onClick={() => handleNodeClick(node.id)}
            onDoubleClick={() => handleDoubleClick(node.id)}
            onDragStart={() => handleDragStart(node.id)}
            onDrag={(pos) => handleDrag(node.id, pos)}
            onDragEnd={() => handleDragEnd()}
            isSelected={selectedNode?.id === node.id}
            isDragging={draggedNode === node.id}
            isVRHovered={vrHoveredNode === node.id}
          />
        );
      })}

      {/* Render edges with type-specific styling */}
      {edges.map((edge) => {
        const sourcePos = positions.get(edge.source);
        const targetPos = positions.get(edge.target);
        
        if (!sourcePos || !targetPos) return null;
        
        return (
          <Edge3D
            key={edge.id}
            edge={edge}
            start={sourcePos}
            end={targetPos}
            isHovered={hoveredEdge === edge.id}
            onHover={handleEdgeHover}
            onClick={handleEdgeClick}
          />
        );
      })}

      {/* VR Interaction handler for node selection and movement */}
      <VRInteraction
        nodePositions={positions}
        nodeHitRadius={0.6}
        onNodeSelect={(nodeId) => handleVRNodeSelect(nodeId, 'controller-right')}
        onNodeHover={handleVRNodeHover}
        onNodeDrag={handleVRDrag}
        onDragStart={(nodeId) => handleVRDragStart(nodeId, 'controller-right')}
        onDragEnd={handleVRDragEnd}
        showDebug={showXRInputDebug}
        rayColor="#3b82f6"
        rayHoverColor="#10b981"
        rayLength={10}
        enableHaptics={true}
      />

      {/* Ground plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#16213e" transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

// ============================================================================
// Simulation Indicator Component
// ============================================================================

interface SimulationIndicatorProps {
  isSimulating: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

/**
 * SimulationIndicator - Shows simulation status and controls in 3D space
 * Note: onStart, onStop, onReset are available for future UI controls
 */
const SimulationIndicator: React.FC<SimulationIndicatorProps> = ({
  isSimulating,
}) => {
  return (
    <group position={[0, 8, 0]}>
      <Text
        position={[0, 0, 0]}
        fontSize={0.3}
        color={isSimulating ? '#10b981' : '#6b7280'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {isSimulating ? '● Simulating' : '○ Stable'}
      </Text>
    </group>
  );
};


// ============================================================================
// Node3D Component
// ============================================================================

/**
 * Node type definitions for geometry mapping
 */
type NodeType = 'requirement' | 'task' | 'test' | 'risk' | 'document';

/**
 * Color scheme for different node types
 */
const NODE_COLORS: Record<NodeType | 'default', string> = {
  requirement: '#3b82f6', // Blue - represents structured requirements
  task: '#10b981',        // Green - represents actionable items
  test: '#f59e0b',        // Amber - represents verification
  risk: '#ef4444',        // Red - represents complexity/danger
  document: '#8b5cf6',    // Purple - represents documents/files
  default: '#6b7280',     // Gray - fallback
};

/**
 * Props for Node3D component
 */
interface Node3DProps {
  node: Node<GraphNodeData>;
  position: THREE.Vector3;
  onClick: () => void;
  onDoubleClick: () => void;
  onDragStart: () => void;
  onDrag: (position: THREE.Vector3) => void;
  onDragEnd: () => void;
  isSelected: boolean;
  isDragging: boolean;
  /** Whether the node is being hovered (from VR interaction) */
  isVRHovered?: boolean;
}

/**
 * Node3D - 3D representation of a graph node with custom geometry based on type
 * Supports dragging for manual positioning in force-directed layout
 * Includes visual feedback for VR hover and selection states
 * 
 * Geometry mapping:
 * - requirement: Box/Cube (represents structured requirements)
 * - task: Octahedron (represents actionable items)
 * - test: Cone (represents verification)
 * - risk: Icosahedron (represents complexity/danger)
 * - document: Cylinder (represents documents/files)
 */
const Node3D: React.FC<Node3DProps> = ({
  node,
  position,
  onClick,
  onDoubleClick,
  onDragStart,
  onDrag,
  onDragEnd,
  isSelected,
  isDragging,
  isVRHovered = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { camera, gl } = useThree();
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());
  const lastClickTime = useRef(0);

  // Combined hover state (desktop mouse or VR controller/hand)
  const isHovered = hovered || isVRHovered;

  // Get node type from data or node type field
  const nodeType = (node?.data?.type || node?.type || 'default') as NodeType | 'default';

  // Get color based on node type
  const color = useMemo(() => {
    return NODE_COLORS[nodeType] || NODE_COLORS.default;
  }, [nodeType]);

  // Get node title for label
  const title = useMemo(() => {
    const label = node.data?.label || node.data?.properties?.title || node.id;
    // Truncate long titles
    if (typeof label === 'string' && label.length > 20) {
      return label.substring(0, 17) + '...';
    }
    return String(label);
  }, [node.data?.label, node.data?.properties, node.id]);

  // Animation frame for hover rotation effect
  useFrame((_, delta) => {
    if (meshRef.current && isHovered && !isDragging) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  // Scale animation for hover, selection, and dragging
  const scale = useMemo(() => {
    if (isDragging) return 1.4;
    if (isSelected) return 1.3;
    if (isHovered) return 1.15;
    return 1;
  }, [isHovered, isSelected, isDragging]);

  // Emissive intensity for glow effect
  const emissiveIntensity = useMemo(() => {
    if (isDragging) return 0.8;
    if (isSelected) return 0.7;
    if (isHovered) return 0.5;
    return 0;
  }, [isHovered, isSelected, isDragging]);

  // Handle pointer down for drag start
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    
    // Check for double-click
    const now = Date.now();
    if (now - lastClickTime.current < 300) {
      onDoubleClick();
      lastClickTime.current = 0;
      return;
    }
    lastClickTime.current = now;

    // Set up drag plane perpendicular to camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    dragPlane.current.setFromNormalAndCoplanarPoint(cameraDirection, position);

    // Calculate offset from click point to node center
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (e.nativeEvent.offsetX / gl.domElement.clientWidth) * 2 - 1,
      -(e.nativeEvent.offsetY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersectPoint);
    dragOffset.current.subVectors(position, intersectPoint);

    onDragStart();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [camera, gl, position, onDragStart, onDoubleClick]);

  // Handle pointer move for dragging
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (e.nativeEvent.offsetX / gl.domElement.clientWidth) * 2 - 1,
      -(e.nativeEvent.offsetY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);

    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane.current, intersectPoint)) {
      const newPosition = intersectPoint.add(dragOffset.current);
      onDrag(newPosition);
    }
  }, [isDragging, camera, gl, onDrag]);

  // Handle pointer up for drag end
  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (isDragging) {
      e.stopPropagation();
      onDragEnd();
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } else {
      onClick();
    }
  }, [isDragging, onDragEnd, onClick]);

  return (
    <group ref={groupRef} position={position}>
      {/* Node mesh with type-specific geometry */}
      <mesh
        ref={meshRef}
        scale={scale}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = isDragging ? 'grabbing' : 'grab';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <NodeGeometry type={nodeType} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Selection ring indicator */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[0.7, 0.85, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Dragging indicator */}
      {isDragging && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[0.9, 1.0, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Text label positioned above the node */}
      <Text
        position={[0, 1.0, 0]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
        maxWidth={3}
      >
        {title}
      </Text>

      {/* Type indicator label below the node */}
      <Text
        position={[0, -0.9, 0]}
        fontSize={0.15}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {nodeType}
      </Text>
    </group>
  );
};


// ============================================================================
// NodeGeometry Component
// ============================================================================

/**
 * NodeGeometry - Returns the appropriate geometry based on node type
 * 
 * @param type - The node type determining which geometry to render
 */
const NodeGeometry: React.FC<{ type: NodeType | 'default' }> = ({ type }) => {
  switch (type) {
    case 'requirement':
      // Box/Cube - represents structured requirements
      return <boxGeometry args={[0.8, 0.8, 0.8]} />;
    
    case 'task':
      // Octahedron - represents actionable items (8 faces, dynamic)
      return <octahedronGeometry args={[0.5]} />;
    
    case 'test':
      // Cone - represents verification (pointing up like a checkmark)
      return <coneGeometry args={[0.4, 0.8, 32]} />;
    
    case 'risk':
      // Icosahedron - represents complexity/danger (20 faces, complex)
      return <icosahedronGeometry args={[0.5]} />;
    
    case 'document':
      // Cylinder - represents documents/files (like a rolled document)
      return <cylinderGeometry args={[0.35, 0.35, 0.8, 32]} />;
    
    default:
      // Default sphere for unknown types
      return <sphereGeometry args={[0.5, 32, 32]} />;
  }
};

// ============================================================================
// Edge3D Component
// ============================================================================

/**
 * Edge type definitions for styling
 * Based on relationship types from the design document
 */
type EdgeType = 
  | 'TESTED_BY' 
  | 'MITIGATES' 
  | 'DEPENDS_ON' 
  | 'IMPLEMENTS' 
  | 'LEADS_TO' 
  | 'RELATES_TO'
  | 'NEXT_VERSION'
  | 'REFERENCES'
  | 'MENTIONED_IN';

/**
 * Edge style configuration for different relationship types
 */
interface EdgeStyleConfig {
  color: string;
  lineWidth: number;
  dashed: boolean;
  dashScale: number;
  dashSize: number;
  gapSize: number;
  showArrow: boolean;
  curved: boolean;
  opacity: number;
}

/**
 * Edge styles mapping based on relationship types
 */
const EDGE_STYLES: Record<EdgeType | 'default', EdgeStyleConfig> = {
  TESTED_BY: {
    color: '#f59e0b',
    lineWidth: 2,
    dashed: true,
    dashScale: 1,
    dashSize: 0.3,
    gapSize: 0.15,
    showArrow: true,
    curved: true,
    opacity: 0.8,
  },
  MITIGATES: {
    color: '#10b981',
    lineWidth: 2.5,
    dashed: false,
    dashScale: 1,
    dashSize: 0,
    gapSize: 0,
    showArrow: true,
    curved: true,
    opacity: 0.85,
  },
  DEPENDS_ON: {
    color: '#3b82f6',
    lineWidth: 2,
    dashed: true,
    dashScale: 1,
    dashSize: 0.1,
    gapSize: 0.1,
    showArrow: true,
    curved: true,
    opacity: 0.8,
  },
  IMPLEMENTS: {
    color: '#8b5cf6',
    lineWidth: 2.5,
    dashed: false,
    dashScale: 1,
    dashSize: 0,
    gapSize: 0,
    showArrow: true,
    curved: true,
    opacity: 0.85,
  },
  LEADS_TO: {
    color: '#ef4444',
    lineWidth: 3,
    dashed: false,
    dashScale: 1,
    dashSize: 0,
    gapSize: 0,
    showArrow: true,
    curved: true,
    opacity: 0.9,
  },
  RELATES_TO: {
    color: '#9ca3af',
    lineWidth: 1,
    dashed: true,
    dashScale: 1,
    dashSize: 0.2,
    gapSize: 0.1,
    showArrow: false,
    curved: false,
    opacity: 0.6,
  },
  NEXT_VERSION: {
    color: '#06b6d4',
    lineWidth: 1.5,
    dashed: true,
    dashScale: 1,
    dashSize: 0.15,
    gapSize: 0.1,
    showArrow: true,
    curved: false,
    opacity: 0.7,
  },
  REFERENCES: {
    color: '#a855f7',
    lineWidth: 1.5,
    dashed: true,
    dashScale: 1,
    dashSize: 0.2,
    gapSize: 0.15,
    showArrow: true,
    curved: true,
    opacity: 0.7,
  },
  MENTIONED_IN: {
    color: '#64748b',
    lineWidth: 1,
    dashed: true,
    dashScale: 1,
    dashSize: 0.1,
    gapSize: 0.1,
    showArrow: false,
    curved: false,
    opacity: 0.5,
  },
  default: {
    color: '#ffffff',
    lineWidth: 1.5,
    dashed: false,
    dashScale: 1,
    dashSize: 0,
    gapSize: 0,
    showArrow: false,
    curved: false,
    opacity: 0.6,
  },
};

/**
 * Props for Edge3D component
 */
interface Edge3DProps {
  edge: Edge;
  start: THREE.Vector3;
  end: THREE.Vector3;
  isHovered: boolean;
  onHover: (edgeId: string | null) => void;
  onClick?: (edge: Edge) => void;
}

/**
 * Edge3D - 3D representation of a graph edge with type-specific styling
 */
const Edge3D: React.FC<Edge3DProps> = ({
  edge,
  start,
  end,
  isHovered,
  onHover,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [localHovered, setLocalHovered] = useState(false);

  // Get edge type from edge data or type field
  const edgeType = useMemo(() => {
    const type = (edge?.type || edge?.label || edge?.data?.type || 'default') as string;
    return type.toUpperCase() as EdgeType | 'default';
  }, [edge?.type, edge?.label, edge?.data]);

  // Get style configuration for this edge type
  const style = useMemo(() => {
    return EDGE_STYLES[edgeType] || EDGE_STYLES.default;
  }, [edgeType]);

  // Calculate the midpoint for curved edges and labels
  const midpoint = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    if (style.curved) {
      const direction = new THREE.Vector3().subVectors(end, start).normalize();
      const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
      const distance = start.distanceTo(end);
      mid.add(perpendicular.multiplyScalar(distance * 0.15));
    }
    return mid;
  }, [start, end, style.curved]);

  // Calculate arrow position and rotation
  const arrowData = useMemo(() => {
    if (!style.showArrow) return null;

    const t = 0.8;
    let arrowPos: THREE.Vector3;
    
    if (style.curved) {
      const p0 = start;
      const p1 = midpoint;
      const p2 = end;
      arrowPos = new THREE.Vector3(
        (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
        (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
        (1 - t) * (1 - t) * p0.z + 2 * (1 - t) * t * p1.z + t * t * p2.z
      );
    } else {
      arrowPos = new THREE.Vector3().lerpVectors(start, end, t);
    }

    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const rotationAxis = new THREE.Vector3().crossVectors(up, direction).normalize();
    const angle = Math.acos(up.dot(direction));
    
    if (rotationAxis.length() > 0.001) {
      quaternion.setFromAxisAngle(rotationAxis, angle);
    } else if (direction.y < 0) {
      quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    }

    return { position: arrowPos, quaternion };
  }, [start, end, midpoint, style.showArrow, style.curved]);

  // Calculate label position
  const labelPosition = useMemo(() => {
    const pos = midpoint.clone();
    pos.y += 0.3;
    return pos;
  }, [midpoint]);

  // Get display label for the edge
  const displayLabel = useMemo(() => {
    const label = edge?.label || edge?.type || '';
    return String(label)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [edge?.label, edge?.type]);

  const effectiveHovered = isHovered || localHovered;
  const effectiveLineWidth = effectiveHovered ? style.lineWidth * 1.5 : style.lineWidth;
  const effectiveOpacity = effectiveHovered ? Math.min(style.opacity + 0.2, 1) : style.opacity;
  const effectiveColor = effectiveHovered ? lightenColor(style.color, 0.2) : style.color;

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setLocalHovered(true);
    onHover(edge?.id || '');
    document.body.style.cursor = 'pointer';
  }, [edge?.id, onHover]);

  const handlePointerOut = useCallback(() => {
    setLocalHovered(false);
    onHover(null);
    document.body.style.cursor = 'auto';
  }, [onHover]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (onClick) {
      onClick(edge);
    }
  }, [edge, onClick]);

  return (
    <group ref={groupRef}>
      {/* Edge line - curved or straight based on style */}
      {style.curved ? (
        <QuadraticBezierLine
          start={[start.x, start.y, start.z]}
          end={[end.x, end.y, end.z]}
          mid={[midpoint.x, midpoint.y, midpoint.z]}
          color={effectiveColor}
          lineWidth={effectiveLineWidth}
          dashed={style.dashed}
          dashScale={style.dashScale}
          dashSize={style.dashSize}
          gapSize={style.gapSize}
          transparent
          opacity={effectiveOpacity}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        />
      ) : (
        <Line
          points={[
            [start.x, start.y, start.z] as [number, number, number],
            [end.x, end.y, end.z] as [number, number, number],
          ]}
          color={effectiveColor}
          lineWidth={effectiveLineWidth}
          dashed={style.dashed}
          dashScale={style.dashScale}
          dashSize={style.dashSize}
          gapSize={style.gapSize}
          transparent
          opacity={effectiveOpacity}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        />
      )}

      {/* Arrow indicator for directional relationships */}
      {arrowData && (
        <group position={arrowData.position} quaternion={arrowData.quaternion}>
          <Cone args={[0.08, 0.2, 8]} position={[0, 0.1, 0]}>
            <meshStandardMaterial
              color={effectiveColor}
              emissive={effectiveColor}
              emissiveIntensity={effectiveHovered ? 0.5 : 0.2}
              transparent
              opacity={effectiveOpacity}
            />
          </Cone>
        </group>
      )}

      {/* Edge label */}
      {(effectiveHovered || edgeType === 'LEADS_TO' || edgeType === 'TESTED_BY') && displayLabel && (
        <Text
          position={labelPosition}
          fontSize={0.15}
          color={effectiveColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
          renderOrder={1}
        >
          {displayLabel}
        </Text>
      )}

      {/* Hover highlight glow effect */}
      {effectiveHovered && style.curved && (
        <QuadraticBezierLine
          start={[start.x, start.y, start.z]}
          end={[end.x, end.y, end.z]}
          mid={[midpoint.x, midpoint.y, midpoint.z]}
          color={effectiveColor}
          lineWidth={effectiveLineWidth * 2}
          transparent
          opacity={0.2}
        />
      )}
      {effectiveHovered && !style.curved && (
        <Line
          points={[
            [start.x, start.y, start.z] as [number, number, number],
            [end.x, end.y, end.z] as [number, number, number],
          ]}
          color={effectiveColor}
          lineWidth={effectiveLineWidth * 2}
          transparent
          opacity={0.2}
        />
      )}
    </group>
  );
};


// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Utility function to lighten a hex color
 * @param color - Hex color string (e.g., '#ff0000')
 * @param amount - Amount to lighten (0-1)
 * @returns Lightened hex color string
 */
function lightenColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const newR = Math.min(255, Math.round(r + (255 - r) * amount));
  const newG = Math.min(255, Math.round(g + (255 - g) * amount));
  const newB = Math.min(255, Math.round(b + (255 - b) * amount));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}


// ============================================================================
// Camera Controls Overlay Component
// ============================================================================

/**
 * Props for CameraControlsOverlay component
 */
interface CameraControlsOverlayProps {
  isAutoRotating: boolean;
  onResetCamera: () => void;
  onZoomToFit: () => void;
  onToggleAutoRotate: () => void;
}

/**
 * CameraControlsOverlay - UI overlay with camera control buttons
 * Provides reset view, zoom to fit, and auto-rotate toggle functionality
 */
const CameraControlsOverlay: React.FC<CameraControlsOverlayProps> = ({
  isAutoRotating,
  onResetCamera,
  onZoomToFit,
  onToggleAutoRotate,
}) => {
  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '8px',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    borderColor: 'rgba(59, 130, 246, 0.8)',
  };

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const tooltipContainerStyle: React.CSSProperties = {
    position: 'relative',
  };

  return (
    <div style={containerStyle}>
      {/* Reset Camera Button */}
      <div style={tooltipContainerStyle} title="Reset Camera (R)">
        <button
          onClick={onResetCamera}
          style={buttonStyle}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.9)';
            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.9)';
            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
          }}
          aria-label="Reset Camera"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* Zoom to Fit Button */}
      <div style={tooltipContainerStyle} title="Zoom to Fit (F)">
        <button
          onClick={onZoomToFit}
          style={buttonStyle}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.9)';
            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.9)';
            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
          }}
          aria-label="Zoom to Fit"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
        </button>
      </div>

      {/* Auto-Rotate Toggle Button */}
      <div style={tooltipContainerStyle} title="Toggle Auto-Rotate (A)">
        <button
          onClick={onToggleAutoRotate}
          style={isAutoRotating ? activeButtonStyle : buttonStyle}
          onMouseOver={(e) => {
            if (!isAutoRotating) {
              e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.9)';
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.5)';
            }
          }}
          onMouseOut={(e) => {
            if (!isAutoRotating) {
              e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.9)';
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
            }
          }}
          aria-label="Toggle Auto-Rotate"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
        </button>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div style={tooltipContainerStyle} title="Keyboard Shortcuts">
        <button
          style={{
            ...buttonStyle,
            fontSize: '12px',
            fontWeight: 'bold',
          }}
          onClick={() => {
            alert(
              'Keyboard Shortcuts:\n\n' +
              'Navigation:\n' +
              '  W/↑ - Pan Up\n' +
              '  S/↓ - Pan Down\n' +
              '  A/← - Pan Left\n' +
              '  D/→ - Pan Right\n' +
              '  Q - Pan Forward\n' +
              '  E - Pan Backward\n\n' +
              'Camera Controls:\n' +
              '  R - Reset Camera\n' +
              '  F - Zoom to Fit\n' +
              '  T - Toggle Auto-Rotate\n\n' +
              'Mouse/Touch:\n' +
              '  Left Drag - Rotate\n' +
              '  Right Drag - Pan\n' +
              '  Scroll/Pinch - Zoom'
            );
          }}
          aria-label="Keyboard Shortcuts Help"
        >
          ?
        </button>
      </div>
    </div>
  );
};


// ============================================================================
// Enhanced OrbitControls Component
// ============================================================================

/**
 * Props for EnhancedOrbitControls component
 */
interface EnhancedOrbitControlsProps {
  cameraConfig: CameraControlsConfig;
}

/**
 * Internal state for camera transitions
 */
interface CameraTransitionState {
  isTransitioning: boolean;
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  targetTarget: THREE.Vector3;
  startTime: number;
  duration: number;
}

/**
 * EnhancedOrbitControls - Extended OrbitControls with additional features
 * Includes auto-rotate, keyboard navigation, zoom-to-fit, and smooth camera transitions
 */
const EnhancedOrbitControls = forwardRef<CameraControlsRef, EnhancedOrbitControlsProps>(
  ({ cameraConfig }, ref) => {
    const { camera } = useThree();
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const nodePositionsRef = useRef<Map<string, THREE.Vector3>>(new Map());
    const transitionRef = useRef<CameraTransitionState>({
      isTransitioning: false,
      startPosition: new THREE.Vector3(),
      targetPosition: new THREE.Vector3(),
      startTarget: new THREE.Vector3(),
      targetTarget: new THREE.Vector3(),
      startTime: 0,
      duration: 500,
    });
    const [autoRotateEnabled, setAutoRotateEnabled] = useState(cameraConfig.autoRotate);

    // Initial camera position for reset
    const initialCameraPosition = useMemo(() => new THREE.Vector3(0, 5, 15), []);
    const initialTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    // Update auto-rotate state when config changes
    useEffect(() => {
      setAutoRotateEnabled(cameraConfig.autoRotate);
    }, [cameraConfig.autoRotate]);

    // Easing function for smooth transitions (ease-in-out cubic)
    const easeInOutCubic = useCallback((t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }, []);

    // Start a smooth camera transition
    const startTransition = useCallback((
      targetPosition: THREE.Vector3,
      targetTarget: THREE.Vector3,
      duration: number = cameraConfig.transitionDuration
    ) => {
      const transition = transitionRef.current;
      transition.isTransitioning = true;
      transition.startPosition.copy(camera.position);
      transition.targetPosition.copy(targetPosition);
      transition.startTarget.copy(controlsRef.current?.target || initialTarget);
      transition.targetTarget.copy(targetTarget);
      transition.startTime = performance.now();
      transition.duration = duration;
    }, [camera, cameraConfig.transitionDuration, initialTarget]);

    // Reset camera to initial position
    const resetCamera = useCallback(() => {
      startTransition(initialCameraPosition, initialTarget);
    }, [startTransition, initialCameraPosition, initialTarget]);

    // Calculate bounding box of all nodes and zoom to fit
    const zoomToFit = useCallback(() => {
      const positions = nodePositionsRef.current;
      if (positions.size === 0) return;

      const boundingBox = new THREE.Box3();
      positions.forEach((pos) => {
        boundingBox.expandByPoint(pos);
      });

      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5; // Add 50% padding

      const direction = new THREE.Vector3(0, 0.5, 1).normalize();
      const targetPosition = center.clone().add(direction.multiplyScalar(distance));

      startTransition(targetPosition, center);
    }, [camera, startTransition]);

    // Focus camera on a specific node
    const focusOnNode = useCallback((nodeId: string) => {
      const positions = nodePositionsRef.current;
      const nodePosition = positions.get(nodeId);
      if (!nodePosition) return;

      const distance = 8; // Fixed distance from node
      const direction = new THREE.Vector3(0, 0.3, 1).normalize();
      const targetPosition = nodePosition.clone().add(direction.multiplyScalar(distance));

      startTransition(targetPosition, nodePosition);
    }, [startTransition]);

    // Toggle auto-rotate
    const toggleAutoRotate = useCallback(() => {
      setAutoRotateEnabled(prev => !prev);
    }, []);

    // Check if auto-rotating
    const isAutoRotating = useCallback(() => {
      return autoRotateEnabled;
    }, [autoRotateEnabled]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      resetCamera,
      zoomToFit,
      focusOnNode,
      toggleAutoRotate,
      isAutoRotating,
      // Internal method to update node positions
      setNodePositions: (positions: Map<string, THREE.Vector3>) => {
        nodePositionsRef.current = positions;
      },
    } as CameraControlsRef & { setNodePositions: (positions: Map<string, THREE.Vector3>) => void }), [resetCamera, zoomToFit, focusOnNode, toggleAutoRotate, isAutoRotating]);

    // Handle keyboard navigation
    useEffect(() => {
      if (!cameraConfig.enableKeyboard) return;

      const panSpeed = 0.5;
      const handleKeyDown = (event: KeyboardEvent) => {
        // Ignore if user is typing in an input
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
          return;
        }

        const controls = controlsRef.current;
        if (!controls) return;

        switch (event.key.toLowerCase()) {
          // WASD and Arrow keys for panning
          case 'w':
          case 'arrowup':
            event.preventDefault();
            camera.position.y += panSpeed;
            controls.target.y += panSpeed;
            break;
          case 's':
          case 'arrowdown':
            event.preventDefault();
            camera.position.y -= panSpeed;
            controls.target.y -= panSpeed;
            break;
          case 'a':
          case 'arrowleft':
            event.preventDefault();
            camera.position.x -= panSpeed;
            controls.target.x -= panSpeed;
            break;
          case 'd':
          case 'arrowright':
            event.preventDefault();
            camera.position.x += panSpeed;
            controls.target.x += panSpeed;
            break;
          case 'q':
            event.preventDefault();
            camera.position.z -= panSpeed;
            controls.target.z -= panSpeed;
            break;
          case 'e':
            event.preventDefault();
            camera.position.z += panSpeed;
            controls.target.z += panSpeed;
            break;
          // Camera control shortcuts
          case 'r':
            event.preventDefault();
            resetCamera();
            break;
          case 'f':
            event.preventDefault();
            zoomToFit();
            break;
          case 't':
            event.preventDefault();
            toggleAutoRotate();
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [camera, cameraConfig.enableKeyboard, resetCamera, zoomToFit, toggleAutoRotate]);

    // Handle camera transitions in animation frame
    useFrame(() => {
      const transition = transitionRef.current;
      if (!transition.isTransitioning) return;

      const elapsed = performance.now() - transition.startTime;
      const progress = Math.min(elapsed / transition.duration, 1);
      const easedProgress = easeInOutCubic(progress);

      // Interpolate camera position
      camera.position.lerpVectors(
        transition.startPosition,
        transition.targetPosition,
        easedProgress
      );

      // Interpolate controls target
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(
          transition.startTarget,
          transition.targetTarget,
          easedProgress
        );
        controlsRef.current.update();
      }

      // End transition
      if (progress >= 1) {
        transition.isTransitioning = false;
      }
    });

    return (
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={100}
        autoRotate={autoRotateEnabled}
        autoRotateSpeed={cameraConfig.autoRotateSpeed}
        // Touch gesture support
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        // Smooth damping for better feel
        enableDamping={true}
        dampingFactor={0.05}
        // Rotation limits (optional - can be adjusted)
        maxPolarAngle={Math.PI * 0.9}
        minPolarAngle={Math.PI * 0.1}
      />
    );
  }
);

EnhancedOrbitControls.displayName = 'EnhancedOrbitControls';


export default GraphView3D;

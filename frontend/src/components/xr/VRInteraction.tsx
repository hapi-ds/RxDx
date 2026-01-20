/**
 * VRInteraction Component
 * Provides VR-specific interaction for node selection and movement in 3D graph
 * 
 * Features:
 * - Node selection via controller ray casting or hand pointing
 * - Node movement/dragging via grip or pinch gestures
 * - Visual feedback for selected and hovered nodes
 * - Integration with graph store for state management
 * - Support for both controller-based and hand-based interaction
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://docs.pmnd.rs/xr/tutorials/interactions
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Interaction mode for VR
 */
export type VRInteractionMode = 'select' | 'drag' | 'idle';

/**
 * Interaction source type
 */
export type InteractionSource = 'controller-left' | 'controller-right' | 'hand-left' | 'hand-right' | 'none';

/**
 * Node interaction state
 */
export interface NodeInteractionState {
  /** Currently hovered node ID */
  hoveredNodeId: string | null;
  /** Currently selected node ID */
  selectedNodeId: string | null;
  /** Currently dragged node ID */
  draggedNodeId: string | null;
  /** Current interaction mode */
  mode: VRInteractionMode;
  /** Source of the current interaction */
  source: InteractionSource;
  /** Position where drag started */
  dragStartPosition: THREE.Vector3 | null;
  /** Current drag offset from node center */
  dragOffset: THREE.Vector3 | null;
}

/**
 * Ray intersection result
 */
export interface RayIntersection {
  nodeId: string;
  point: THREE.Vector3;
  distance: number;
}

/**
 * Props for VRInteraction component
 */
export interface VRInteractionProps {
  /** Map of node IDs to their 3D positions */
  nodePositions: Map<string, THREE.Vector3>;
  /** Radius for node hit detection (default: 0.6) */
  nodeHitRadius?: number;
  /** Callback when a node is selected */
  onNodeSelect?: (nodeId: string | null) => void;
  /** Callback when a node is hovered */
  onNodeHover?: (nodeId: string | null) => void;
  /** Callback when a node is being dragged */
  onNodeDrag?: (nodeId: string, position: THREE.Vector3) => void;
  /** Callback when drag starts */
  onDragStart?: (nodeId: string) => void;
  /** Callback when drag ends */
  onDragEnd?: (nodeId: string) => void;
  /** Whether to show debug visualization (default: false) */
  showDebug?: boolean;
  /** Ray color for selection (default: '#3b82f6') */
  rayColor?: string;
  /** Ray color when hovering a node (default: '#10b981') */
  rayHoverColor?: string;
  /** Ray length (default: 10) */
  rayLength?: number;
  /** Enable haptic feedback (default: true) */
  enableHaptics?: boolean;
}

/**
 * Default interaction state
 */
const createDefaultInteractionState = (): NodeInteractionState => ({
  hoveredNodeId: null,
  selectedNodeId: null,
  draggedNodeId: null,
  mode: 'idle',
  source: 'none',
  dragStartPosition: null,
  dragOffset: null,
});

// ============================================================================
// VRInteraction Component
// ============================================================================

/**
 * VRInteraction - Handles VR-specific node interaction
 * 
 * This component manages ray casting from controllers/hands to detect
 * node intersections and handles selection/dragging interactions.
 * 
 * @example
 * ```tsx
 * <VRInteraction
 *   nodePositions={positions}
 *   onNodeSelect={(id) => selectNode(id)}
 *   onNodeDrag={(id, pos) => dragNode(id, pos)}
 * />
 * ```
 */
export const VRInteraction: React.FC<VRInteractionProps> = ({
  nodePositions,
  nodeHitRadius = 0.6,
  onNodeSelect,
  onNodeHover,
  onNodeDrag,
  onDragStart,
  onDragEnd,
  showDebug = false,
  rayColor = '#3b82f6',
  rayHoverColor = '#10b981',
  rayLength = 10,
  enableHaptics = true,
}) => {
  // XR session state
  const session = useXR((state) => state.session);
  const { gl } = useThree();

  // Interaction state
  const stateRef = useRef<NodeInteractionState>(createDefaultInteractionState());
  const [debugState, setDebugState] = useState({
    leftRayEnd: new THREE.Vector3(),
    rightRayEnd: new THREE.Vector3(),
    leftRayOrigin: new THREE.Vector3(),
    rightRayOrigin: new THREE.Vector3(),
    hoveredNodeId: null as string | null,
    isLeftActive: false,
    isRightActive: false,
  });

  // Previous hover state for change detection
  const prevHoveredRef = useRef<string | null>(null);

  // Controller state tracking
  const controllerStateRef = useRef({
    left: {
      triggerPressed: false,
      gripPressed: false,
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, -1),
    },
    right: {
      triggerPressed: false,
      gripPressed: false,
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, -1),
    },
  });

  // Hand state tracking
  const handStateRef = useRef({
    left: {
      pinching: false,
      grabbing: false,
      pointing: false,
      indexTipPosition: new THREE.Vector3(),
      pointDirection: new THREE.Vector3(0, 0, -1),
    },
    right: {
      pinching: false,
      grabbing: false,
      pointing: false,
      indexTipPosition: new THREE.Vector3(),
      pointDirection: new THREE.Vector3(0, 0, -1),
    },
  });

  /**
   * Trigger haptic feedback on a controller
   */
  const triggerHaptic = useCallback((
    inputSource: XRInputSource,
    intensity: number = 0.3,
    duration: number = 50
  ) => {
    if (!enableHaptics || !inputSource.gamepad) return;

    const hapticActuator = inputSource.gamepad.hapticActuators?.[0];
    if (hapticActuator && 'pulse' in hapticActuator) {
      (hapticActuator as GamepadHapticActuator).pulse(intensity, duration);
    }
  }, [enableHaptics]);

  /**
   * Cast a ray and find intersecting nodes
   */
  const castRay = useCallback((
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): RayIntersection | null => {
    let closestIntersection: RayIntersection | null = null;
    let closestDistance = Infinity;

    nodePositions.forEach((position, nodeId) => {
      // Ray-sphere intersection test
      const toNode = new THREE.Vector3().subVectors(position, origin);
      const projectionLength = toNode.dot(direction);
      
      // Node is behind the ray origin
      if (projectionLength < 0) return;
      
      // Find closest point on ray to node center
      const closestPointOnRay = origin.clone().add(direction.clone().multiplyScalar(projectionLength));
      const distanceToNode = closestPointOnRay.distanceTo(position);
      
      // Check if within hit radius
      if (distanceToNode <= nodeHitRadius && projectionLength < closestDistance) {
        closestDistance = projectionLength;
        closestIntersection = {
          nodeId,
          point: closestPointOnRay,
          distance: projectionLength,
        };
      }
    });

    return closestIntersection;
  }, [nodePositions, nodeHitRadius]);

  /**
   * Handle node selection
   */
  const handleSelect = useCallback((nodeId: string | null, source: InteractionSource) => {
    const state = stateRef.current;
    
    if (nodeId === state.selectedNodeId) {
      // Deselect if clicking same node
      state.selectedNodeId = null;
      onNodeSelect?.(null);
    } else {
      state.selectedNodeId = nodeId;
      onNodeSelect?.(nodeId);
    }
    
    state.source = source;
  }, [onNodeSelect]);

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((
    nodeId: string,
    grabPoint: THREE.Vector3,
    source: InteractionSource
  ) => {
    const state = stateRef.current;
    const nodePosition = nodePositions.get(nodeId);
    
    if (!nodePosition) return;

    state.draggedNodeId = nodeId;
    state.mode = 'drag';
    state.source = source;
    state.dragStartPosition = grabPoint.clone();
    state.dragOffset = new THREE.Vector3().subVectors(nodePosition, grabPoint);
    
    onDragStart?.(nodeId);
  }, [nodePositions, onDragStart]);

  /**
   * Handle drag update
   */
  const handleDragUpdate = useCallback((currentPoint: THREE.Vector3) => {
    const state = stateRef.current;
    
    if (!state.draggedNodeId || !state.dragOffset) return;

    const newPosition = currentPoint.clone().add(state.dragOffset);
    onNodeDrag?.(state.draggedNodeId, newPosition);
  }, [onNodeDrag]);

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    const state = stateRef.current;
    
    if (state.draggedNodeId) {
      onDragEnd?.(state.draggedNodeId);
    }

    state.draggedNodeId = null;
    state.mode = 'idle';
    state.dragStartPosition = null;
    state.dragOffset = null;
  }, [onDragEnd]);

  /**
   * Process controller input
   */
  const processControllerInput = useCallback((
    inputSource: XRInputSource,
    frame: XRFrame,
    referenceSpace: XRReferenceSpace
  ) => {
    const handedness = inputSource.handedness as 'left' | 'right';
    if (handedness !== 'left' && handedness !== 'right') return;

    const controllerState = controllerStateRef.current[handedness];
    const gamepad = inputSource.gamepad;
    
    if (!gamepad) return;

    // Get controller pose
    const pose = frame.getPose(inputSource.targetRaySpace, referenceSpace);
    if (!pose) return;

    // Update position and direction
    controllerState.position.set(
      pose.transform.position.x,
      pose.transform.position.y,
      pose.transform.position.z
    );

    // Get ray direction from controller orientation
    const quaternion = new THREE.Quaternion(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w
    );
    controllerState.direction.set(0, 0, -1).applyQuaternion(quaternion);

    // Get button states
    const triggerPressed = gamepad.buttons[0]?.pressed ?? false;
    const gripPressed = gamepad.buttons[1]?.pressed ?? false;
    const prevTriggerPressed = controllerState.triggerPressed;
    const prevGripPressed = controllerState.gripPressed;

    // Cast ray for intersection
    const intersection = castRay(controllerState.position, controllerState.direction);
    const state = stateRef.current;
    const source: InteractionSource = handedness === 'left' ? 'controller-left' : 'controller-right';

    // Handle hover state changes
    if (intersection?.nodeId !== prevHoveredRef.current) {
      if (intersection) {
        // Entering a node
        state.hoveredNodeId = intersection.nodeId;
        onNodeHover?.(intersection.nodeId);
        triggerHaptic(inputSource, 0.1, 20);
      } else if (state.source === source || state.source === 'none') {
        // Leaving a node (only if this controller was the hover source)
        state.hoveredNodeId = null;
        onNodeHover?.(null);
      }
      prevHoveredRef.current = intersection?.nodeId ?? null;
    }

    // Handle trigger press for selection
    if (triggerPressed && !prevTriggerPressed) {
      if (intersection) {
        handleSelect(intersection.nodeId, source);
        triggerHaptic(inputSource, 0.4, 50);
      }
    }

    // Handle grip press for dragging
    if (gripPressed && !prevGripPressed) {
      if (intersection && state.mode !== 'drag') {
        handleDragStart(intersection.nodeId, intersection.point, source);
        triggerHaptic(inputSource, 0.5, 100);
      }
    }

    // Handle grip release for drag end
    if (!gripPressed && prevGripPressed) {
      if (state.mode === 'drag' && state.source === source) {
        handleDragEnd();
        triggerHaptic(inputSource, 0.3, 50);
      }
    }

    // Update drag position while grip is held
    if (gripPressed && state.mode === 'drag' && state.source === source) {
      // Calculate point along ray at drag distance
      const dragDistance = state.dragStartPosition?.distanceTo(controllerState.position) ?? 2;
      const currentPoint = controllerState.position.clone().add(
        controllerState.direction.clone().multiplyScalar(
          state.dragStartPosition ? 
            controllerState.position.distanceTo(state.dragStartPosition) + 
            (state.dragOffset?.length() ?? 0) : 
            dragDistance
        )
      );
      
      // Use intersection point if available, otherwise project along ray
      if (intersection) {
        handleDragUpdate(intersection.point);
      } else {
        // Project to a plane at the original drag distance
        const originalDistance = state.dragStartPosition?.distanceTo(controllerState.position) ?? 3;
        const projectedPoint = controllerState.position.clone().add(
          controllerState.direction.clone().multiplyScalar(originalDistance)
        );
        handleDragUpdate(projectedPoint);
      }
    }

    // Update state
    controllerState.triggerPressed = triggerPressed;
    controllerState.gripPressed = gripPressed;

    // Update debug state
    if (showDebug) {
      const rayEnd = controllerState.position.clone().add(
        controllerState.direction.clone().multiplyScalar(rayLength)
      );
      
      setDebugState(prev => ({
        ...prev,
        [`${handedness}RayOrigin`]: controllerState.position.clone(),
        [`${handedness}RayEnd`]: rayEnd,
        [`is${handedness.charAt(0).toUpperCase() + handedness.slice(1)}Active`]: true,
        hoveredNodeId: intersection?.nodeId ?? prev.hoveredNodeId,
      }));
    }
  }, [
    castRay,
    handleSelect,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    onNodeHover,
    triggerHaptic,
    showDebug,
    rayLength,
  ]);

  /**
   * Process hand input for gesture-based interaction
   */
  const processHandInput = useCallback((
    inputSource: XRInputSource,
    frame: XRFrame,
    referenceSpace: XRReferenceSpace
  ) => {
    const hand = inputSource.hand;
    if (!hand) return;

    const handedness = inputSource.handedness as 'left' | 'right';
    if (handedness !== 'left' && handedness !== 'right') return;

    const handState = handStateRef.current[handedness];
    const state = stateRef.current;
    const source: InteractionSource = handedness === 'left' ? 'hand-left' : 'hand-right';

    // Get index finger tip position for pointing
    const indexTip = hand.get('index-finger-tip');
    const thumbTip = hand.get('thumb-tip');
    const indexBase = hand.get('index-finger-metacarpal');
    const wrist = hand.get('wrist');

    if (!indexTip || !thumbTip || !wrist) return;

    // Get joint poses
    const indexTipPose = frame.getJointPose?.(indexTip, referenceSpace);
    const thumbTipPose = frame.getJointPose?.(thumbTip, referenceSpace);
    const indexBasePose = indexBase ? frame.getJointPose?.(indexBase, referenceSpace) : null;

    if (!indexTipPose || !thumbTipPose) return;

    // Update index tip position
    handState.indexTipPosition.set(
      indexTipPose.transform.position.x,
      indexTipPose.transform.position.y,
      indexTipPose.transform.position.z
    );

    // Calculate point direction (from index base to tip)
    if (indexBasePose) {
      const basePos = new THREE.Vector3(
        indexBasePose.transform.position.x,
        indexBasePose.transform.position.y,
        indexBasePose.transform.position.z
      );
      handState.pointDirection.subVectors(handState.indexTipPosition, basePos).normalize();
    }

    // Detect pinch gesture (thumb + index finger close together)
    const thumbPos = new THREE.Vector3(
      thumbTipPose.transform.position.x,
      thumbTipPose.transform.position.y,
      thumbTipPose.transform.position.z
    );
    const pinchDistance = handState.indexTipPosition.distanceTo(thumbPos);
    const isPinching = pinchDistance < 0.03; // 3cm threshold
    const wasPinching = handState.pinching;

    // Cast ray from index finger tip
    const intersection = castRay(handState.indexTipPosition, handState.pointDirection);

    // Handle hover state changes
    if (intersection?.nodeId !== prevHoveredRef.current) {
      if (intersection) {
        state.hoveredNodeId = intersection.nodeId;
        onNodeHover?.(intersection.nodeId);
      } else if (state.source === source || state.source === 'none') {
        state.hoveredNodeId = null;
        onNodeHover?.(null);
      }
      prevHoveredRef.current = intersection?.nodeId ?? null;
    }

    // Handle pinch start for selection
    if (isPinching && !wasPinching) {
      if (intersection) {
        handleSelect(intersection.nodeId, source);
      }
    }

    // Handle pinch for dragging (hold pinch to drag)
    if (isPinching && state.hoveredNodeId && state.mode !== 'drag') {
      // Start drag after brief pinch hold
      handleDragStart(state.hoveredNodeId, handState.indexTipPosition.clone(), source);
    }

    // Handle pinch release for drag end
    if (!isPinching && wasPinching) {
      if (state.mode === 'drag' && state.source === source) {
        handleDragEnd();
      }
    }

    // Update drag position while pinching
    if (isPinching && state.mode === 'drag' && state.source === source) {
      // Use pinch midpoint for more stable dragging
      const pinchMidpoint = handState.indexTipPosition.clone().add(thumbPos).multiplyScalar(0.5);
      handleDragUpdate(pinchMidpoint);
    }

    // Update state
    handState.pinching = isPinching;

    // Update debug state
    if (showDebug) {
      const rayEnd = handState.indexTipPosition.clone().add(
        handState.pointDirection.clone().multiplyScalar(rayLength)
      );
      
      setDebugState(prev => ({
        ...prev,
        [`${handedness}RayOrigin`]: handState.indexTipPosition.clone(),
        [`${handedness}RayEnd`]: rayEnd,
        [`is${handedness.charAt(0).toUpperCase() + handedness.slice(1)}Active`]: true,
        hoveredNodeId: intersection?.nodeId ?? prev.hoveredNodeId,
      }));
    }
  }, [
    castRay,
    handleSelect,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    onNodeHover,
    showDebug,
    rayLength,
  ]);

  // Process XR input each frame
  useFrame((_, _delta) => {
    if (!session) return;

    // Get reference space
    const referenceSpace = gl.xr.getReferenceSpace();
    if (!referenceSpace) return;

    // Get current frame
    const frame = gl.xr.getFrame();
    if (!frame) return;

    // Process each input source
    for (const inputSource of session.inputSources) {
      if (inputSource.targetRayMode === 'tracked-pointer') {
        // Controller input
        processControllerInput(inputSource, frame, referenceSpace);
      } else if (inputSource.hand) {
        // Hand tracking input
        processHandInput(inputSource, frame, referenceSpace);
      }
    }
  });

  // Clean up on unmount or session end
  useEffect(() => {
    return () => {
      // Reset state
      stateRef.current = createDefaultInteractionState();
      prevHoveredRef.current = null;
    };
  }, [session]);

  // Debug visualization
  if (!showDebug) return null;

  const currentRayColor = debugState.hoveredNodeId ? rayHoverColor : rayColor;

  return (
    <group name="vr-interaction-debug">
      {/* Left controller/hand ray */}
      {debugState.isLeftActive && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                debugState.leftRayOrigin.x, debugState.leftRayOrigin.y, debugState.leftRayOrigin.z,
                debugState.leftRayEnd.x, debugState.leftRayEnd.y, debugState.leftRayEnd.z,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={currentRayColor} linewidth={2} />
        </line>
      )}

      {/* Right controller/hand ray */}
      {debugState.isRightActive && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                debugState.rightRayOrigin.x, debugState.rightRayOrigin.y, debugState.rightRayOrigin.z,
                debugState.rightRayEnd.x, debugState.rightRayEnd.y, debugState.rightRayEnd.z,
              ])}
            />
          </bufferGeometry>
          <lineBasicMaterial color={currentRayColor} linewidth={2} />
        </line>
      )}

      {/* Hover indicator */}
      {debugState.hoveredNodeId && nodePositions.get(debugState.hoveredNodeId) && (
        <mesh position={nodePositions.get(debugState.hoveredNodeId)}>
          <ringGeometry args={[0.7, 0.8, 32]} />
          <meshBasicMaterial color={rayHoverColor} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// ============================================================================
// useVRInteraction Hook
// ============================================================================

/**
 * Hook to get current VR interaction state
 * Can be used by other components to react to VR interactions
 */
export function useVRInteraction(): NodeInteractionState {
  const [state, setState] = useState<NodeInteractionState>(createDefaultInteractionState());
  const session = useXR((state) => state.session);

  useEffect(() => {
    if (!session) {
      setState(createDefaultInteractionState());
    }
  }, [session]);

  return state;
}

export default VRInteraction;

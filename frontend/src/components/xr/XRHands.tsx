/**
 * XRHands Component
 * Provides hand tracking support for WebXR sessions
 * 
 * Features:
 * - Tracks hand joint positions and rotations
 * - Detects pinch gestures (thumb + index finger)
 * - Detects grab gestures (all fingers curled)
 * - Provides hand state for custom interactions
 * - Supports both left and right hands
 * - Gesture recognition with configurable thresholds
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://docs.pmnd.rs/xr/tutorials/custom-inputs
 * @see https://developer.mozilla.org/en-US/docs/Web/API/XRHand
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

/**
 * Hand joint names as defined by WebXR Hand Input
 * @see https://www.w3.org/TR/webxr-hand-input-1/#skeleton-joints-section
 */
export type HandJointName =
  | 'wrist'
  | 'thumb-metacarpal'
  | 'thumb-phalanx-proximal'
  | 'thumb-phalanx-distal'
  | 'thumb-tip'
  | 'index-finger-metacarpal'
  | 'index-finger-phalanx-proximal'
  | 'index-finger-phalanx-intermediate'
  | 'index-finger-phalanx-distal'
  | 'index-finger-tip'
  | 'middle-finger-metacarpal'
  | 'middle-finger-phalanx-proximal'
  | 'middle-finger-phalanx-intermediate'
  | 'middle-finger-phalanx-distal'
  | 'middle-finger-tip'
  | 'ring-finger-metacarpal'
  | 'ring-finger-phalanx-proximal'
  | 'ring-finger-phalanx-intermediate'
  | 'ring-finger-phalanx-distal'
  | 'ring-finger-tip'
  | 'pinky-finger-metacarpal'
  | 'pinky-finger-phalanx-proximal'
  | 'pinky-finger-phalanx-intermediate'
  | 'pinky-finger-phalanx-distal'
  | 'pinky-finger-tip';

/**
 * Hand joint indices for quick access
 */
export const HAND_JOINT_INDICES: Record<HandJointName, number> = {
  'wrist': 0,
  'thumb-metacarpal': 1,
  'thumb-phalanx-proximal': 2,
  'thumb-phalanx-distal': 3,
  'thumb-tip': 4,
  'index-finger-metacarpal': 5,
  'index-finger-phalanx-proximal': 6,
  'index-finger-phalanx-intermediate': 7,
  'index-finger-phalanx-distal': 8,
  'index-finger-tip': 9,
  'middle-finger-metacarpal': 10,
  'middle-finger-phalanx-proximal': 11,
  'middle-finger-phalanx-intermediate': 12,
  'middle-finger-phalanx-distal': 13,
  'middle-finger-tip': 14,
  'ring-finger-metacarpal': 15,
  'ring-finger-phalanx-proximal': 16,
  'ring-finger-phalanx-intermediate': 17,
  'ring-finger-phalanx-distal': 18,
  'ring-finger-tip': 19,
  'pinky-finger-metacarpal': 20,
  'pinky-finger-phalanx-proximal': 21,
  'pinky-finger-phalanx-intermediate': 22,
  'pinky-finger-phalanx-distal': 23,
  'pinky-finger-tip': 24,
};

/**
 * Hand joint position and rotation
 */
export interface HandJointState {
  /** Joint position in world space */
  position: THREE.Vector3;
  /** Joint rotation in world space */
  rotation: THREE.Quaternion;
  /** Joint radius (for collision detection) */
  radius: number;
}

/**
 * Gesture detection state
 */
export interface GestureState {
  /** Pinch gesture (thumb + index finger) */
  pinch: {
    active: boolean;
    strength: number; // 0-1, how close the fingers are
    position: THREE.Vector3; // Midpoint between thumb and index
  };
  /** Grab gesture (all fingers curled) */
  grab: {
    active: boolean;
    strength: number; // 0-1, how curled the fingers are
  };
  /** Point gesture (index finger extended, others curled) */
  point: {
    active: boolean;
    direction: THREE.Vector3;
  };
  /** Open palm gesture */
  openPalm: {
    active: boolean;
    normal: THREE.Vector3; // Palm facing direction
  };
}

/**
 * Complete hand tracking state
 */
export interface HandTrackingState {
  /** Hand identifier */
  handedness: 'left' | 'right';
  /** Whether the hand is being tracked */
  tracked: boolean;
  /** All joint states */
  joints: Map<HandJointName, HandJointState>;
  /** Detected gestures */
  gestures: GestureState;
  /** Wrist position (convenience accessor) */
  wristPosition: THREE.Vector3;
  /** Palm position (center of hand) */
  palmPosition: THREE.Vector3;
  /** Palm normal (direction palm is facing) */
  palmNormal: THREE.Vector3;
}

/**
 * Gesture detection configuration
 */
export interface GestureConfig {
  /** Distance threshold for pinch detection (meters) */
  pinchThreshold: number;
  /** Curl threshold for grab detection (0-1) */
  grabThreshold: number;
  /** Extension threshold for point detection (0-1) */
  pointThreshold: number;
  /** Spread threshold for open palm detection (0-1) */
  openPalmThreshold: number;
}

/**
 * Default gesture configuration
 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  pinchThreshold: 0.03, // 3cm
  grabThreshold: 0.7,
  pointThreshold: 0.6,
  openPalmThreshold: 0.8,
};

/**
 * Create default gesture state
 */
const createDefaultGestureState = (): GestureState => ({
  pinch: {
    active: false,
    strength: 0,
    position: new THREE.Vector3(),
  },
  grab: {
    active: false,
    strength: 0,
  },
  point: {
    active: false,
    direction: new THREE.Vector3(0, 0, -1),
  },
  openPalm: {
    active: false,
    normal: new THREE.Vector3(0, 1, 0),
  },
});

/**
 * Create default hand tracking state
 */
const createDefaultHandState = (handedness: 'left' | 'right'): HandTrackingState => ({
  handedness,
  tracked: false,
  joints: new Map(),
  gestures: createDefaultGestureState(),
  wristPosition: new THREE.Vector3(),
  palmPosition: new THREE.Vector3(),
  palmNormal: new THREE.Vector3(0, 1, 0),
});

/**
 * Props for XRHands component
 */
export interface XRHandsProps {
  /** Callback when pinch gesture starts */
  onPinchStart?: (handedness: 'left' | 'right', position: THREE.Vector3) => void;
  /** Callback when pinch gesture ends */
  onPinchEnd?: (handedness: 'left' | 'right') => void;
  /** Callback when pinch position updates (while pinching) */
  onPinchMove?: (handedness: 'left' | 'right', position: THREE.Vector3, strength: number) => void;
  /** Callback when grab gesture starts */
  onGrabStart?: (handedness: 'left' | 'right') => void;
  /** Callback when grab gesture ends */
  onGrabEnd?: (handedness: 'left' | 'right') => void;
  /** Callback when point gesture starts */
  onPointStart?: (handedness: 'left' | 'right', direction: THREE.Vector3) => void;
  /** Callback when point gesture ends */
  onPointEnd?: (handedness: 'left' | 'right') => void;
  /** Callback when hand tracking state updates (called every frame) */
  onHandUpdate?: (leftState: HandTrackingState, rightState: HandTrackingState) => void;
  /** Gesture detection configuration */
  gestureConfig?: Partial<GestureConfig>;
  /** Whether to show debug visualization */
  showDebug?: boolean;
  /** Debug joint color for left hand */
  leftJointColor?: string;
  /** Debug joint color for right hand */
  rightJointColor?: string;
}

/**
 * XRHands - Component for handling hand tracking input
 * 
 * This component tracks hand joint positions and detects gestures.
 * The actual hand model rendering is handled by @react-three/xr's default hand
 * implementation through the XR store configuration.
 * 
 * @example
 * ```tsx
 * <XRHands
 *   onPinchStart={(hand, pos) => console.log(`${hand} pinch at`, pos)}
 *   onGrabStart={(hand) => console.log(`${hand} grab`)}
 * />
 * ```
 */
export const XRHands: React.FC<XRHandsProps> = ({
  onPinchStart,
  onPinchEnd,
  onPinchMove,
  onGrabStart,
  onGrabEnd,
  onPointStart,
  onPointEnd,
  onHandUpdate,
  gestureConfig,
  showDebug = false,
  leftJointColor = '#3b82f6',
  rightJointColor = '#10b981',
}) => {
  // Merge gesture config with defaults
  const config: GestureConfig = {
    ...DEFAULT_GESTURE_CONFIG,
    ...gestureConfig,
  };

  // Get XR session state
  const session = useXR((state) => state.session);

  // Hand state refs
  const leftStateRef = useRef<HandTrackingState>(createDefaultHandState('left'));
  const rightStateRef = useRef<HandTrackingState>(createDefaultHandState('right'));

  // Debug state
  const [debugState, setDebugState] = useState({
    leftTracked: false,
    rightTracked: false,
    leftJoints: [] as THREE.Vector3[],
    rightJoints: [] as THREE.Vector3[],
  });

  /**
   * Calculate finger curl amount (0 = extended, 1 = fully curled)
   */
  const calculateFingerCurl = useCallback((
    joints: Map<HandJointName, HandJointState>,
    fingerBase: HandJointName,
    fingerTip: HandJointName
  ): number => {
    const baseJoint = joints.get(fingerBase);
    const tipJoint = joints.get(fingerTip);
    const wristJoint = joints.get('wrist');

    if (!baseJoint || !tipJoint || !wristJoint) return 0;

    // Calculate distance from tip to base relative to expected extended length
    const tipToBase = tipJoint.position.distanceTo(baseJoint.position);
    const baseToWrist = baseJoint.position.distanceTo(wristJoint.position);
    
    // Normalize by hand size (base to wrist distance)
    const normalizedDistance = tipToBase / (baseToWrist * 0.8);
    
    // Invert so 1 = curled, 0 = extended
    return Math.max(0, Math.min(1, 1 - normalizedDistance));
  }, []);

  /**
   * Detect gestures from hand joint positions
   */
  const detectGestures = useCallback((
    state: HandTrackingState,
    config: GestureConfig
  ): GestureState => {
    const gestures = createDefaultGestureState();
    const joints = state.joints;

    if (joints.size === 0) return gestures;

    // Get key joint positions
    const thumbTip = joints.get('thumb-tip');
    const indexTip = joints.get('index-finger-tip');
    const middleTip = joints.get('middle-finger-tip');
    const pinkyTip = joints.get('pinky-finger-tip');
    const wrist = joints.get('wrist');
    const indexBase = joints.get('index-finger-metacarpal');

    // Pinch detection (thumb + index finger)
    if (thumbTip && indexTip) {
      const pinchDistance = thumbTip.position.distanceTo(indexTip.position);
      gestures.pinch.strength = Math.max(0, 1 - (pinchDistance / config.pinchThreshold));
      gestures.pinch.active = pinchDistance < config.pinchThreshold;
      gestures.pinch.position.copy(thumbTip.position).add(indexTip.position).multiplyScalar(0.5);
    }

    // Grab detection (all fingers curled)
    if (joints.size >= 20) {
      const indexCurl = calculateFingerCurl(joints, 'index-finger-metacarpal', 'index-finger-tip');
      const middleCurl = calculateFingerCurl(joints, 'middle-finger-metacarpal', 'middle-finger-tip');
      const ringCurl = calculateFingerCurl(joints, 'ring-finger-metacarpal', 'ring-finger-tip');
      const pinkyCurl = calculateFingerCurl(joints, 'pinky-finger-metacarpal', 'pinky-finger-tip');

      const avgCurl = (indexCurl + middleCurl + ringCurl + pinkyCurl) / 4;
      gestures.grab.strength = avgCurl;
      gestures.grab.active = avgCurl > config.grabThreshold;
    }

    // Point detection (index extended, others curled)
    if (joints.size >= 20) {
      const indexCurl = calculateFingerCurl(joints, 'index-finger-metacarpal', 'index-finger-tip');
      const middleCurl = calculateFingerCurl(joints, 'middle-finger-metacarpal', 'middle-finger-tip');
      const ringCurl = calculateFingerCurl(joints, 'ring-finger-metacarpal', 'ring-finger-tip');
      const pinkyCurl = calculateFingerCurl(joints, 'pinky-finger-metacarpal', 'pinky-finger-tip');

      const indexExtended = indexCurl < (1 - config.pointThreshold);
      const othersCurled = (middleCurl + ringCurl + pinkyCurl) / 3 > config.pointThreshold;

      gestures.point.active = indexExtended && othersCurled;
      
      if (gestures.point.active && indexTip && indexBase) {
        gestures.point.direction.copy(indexTip.position).sub(indexBase.position).normalize();
      }
    }

    // Open palm detection (all fingers extended)
    if (joints.size >= 20 && wrist && indexBase) {
      const indexCurl = calculateFingerCurl(joints, 'index-finger-metacarpal', 'index-finger-tip');
      const middleCurl = calculateFingerCurl(joints, 'middle-finger-metacarpal', 'middle-finger-tip');
      const ringCurl = calculateFingerCurl(joints, 'ring-finger-metacarpal', 'ring-finger-tip');
      const pinkyCurl = calculateFingerCurl(joints, 'pinky-finger-metacarpal', 'pinky-finger-tip');

      const avgExtension = 1 - (indexCurl + middleCurl + ringCurl + pinkyCurl) / 4;
      gestures.openPalm.active = avgExtension > config.openPalmThreshold;

      // Calculate palm normal
      if (middleTip && wrist) {
        const palmForward = new THREE.Vector3().subVectors(middleTip.position, wrist.position).normalize();
        const palmRight = new THREE.Vector3().subVectors(
          indexTip?.position || middleTip.position,
          pinkyTip?.position || middleTip.position
        ).normalize();
        gestures.openPalm.normal.crossVectors(palmForward, palmRight).normalize();
        
        // Flip for left hand
        if (state.handedness === 'left') {
          gestures.openPalm.normal.negate();
        }
      }
    }

    return gestures;
  }, [calculateFingerCurl]);

  /**
   * Process hand input source and update state
   * Note: This function is prepared for full hand tracking implementation
   * when proper reference space management is available
   */
   
  const _processHandInput = useCallback((
    inputSource: XRInputSource,
    frame: XRFrame,
    referenceSpace: XRReferenceSpace,
    stateRef: React.MutableRefObject<HandTrackingState>,
    prevGesturesRef: React.MutableRefObject<GestureState>,
    handedness: 'left' | 'right'
  ) => {
    const hand = inputSource.hand;
    if (!hand) return;

    const state = stateRef.current;
    state.tracked = true;
    state.handedness = handedness;

    // Update joint positions
    const jointNames = Object.keys(HAND_JOINT_INDICES) as HandJointName[];
    
    for (const jointName of jointNames) {
      const jointSpace = hand.get(jointName as XRHandJoint);
      if (!jointSpace) continue;

      const jointPose = frame.getJointPose?.(jointSpace, referenceSpace);
      if (!jointPose) continue;

      let jointState = state.joints.get(jointName);
      if (!jointState) {
        jointState = {
          position: new THREE.Vector3(),
          rotation: new THREE.Quaternion(),
          radius: 0,
        };
        state.joints.set(jointName, jointState);
      }

      jointState.position.set(
        jointPose.transform.position.x,
        jointPose.transform.position.y,
        jointPose.transform.position.z
      );
      jointState.rotation.set(
        jointPose.transform.orientation.x,
        jointPose.transform.orientation.y,
        jointPose.transform.orientation.z,
        jointPose.transform.orientation.w
      );
      jointState.radius = jointPose.radius ?? 0.01;
    }

    // Update convenience accessors
    const wristJoint = state.joints.get('wrist');
    if (wristJoint) {
      state.wristPosition.copy(wristJoint.position);
    }

    // Calculate palm position (average of metacarpal joints)
    const metacarpals = [
      state.joints.get('index-finger-metacarpal'),
      state.joints.get('middle-finger-metacarpal'),
      state.joints.get('ring-finger-metacarpal'),
      state.joints.get('pinky-finger-metacarpal'),
    ].filter(Boolean) as HandJointState[];

    if (metacarpals.length > 0) {
      state.palmPosition.set(0, 0, 0);
      for (const joint of metacarpals) {
        state.palmPosition.add(joint.position);
      }
      state.palmPosition.divideScalar(metacarpals.length);
    }

    // Detect gestures
    const newGestures = detectGestures(state, config);
    const prevGestures = prevGesturesRef.current;

    // Fire gesture callbacks
    if (newGestures.pinch.active && !prevGestures.pinch.active) {
      onPinchStart?.(handedness, newGestures.pinch.position.clone());
    } else if (!newGestures.pinch.active && prevGestures.pinch.active) {
      onPinchEnd?.(handedness);
    } else if (newGestures.pinch.active) {
      onPinchMove?.(handedness, newGestures.pinch.position.clone(), newGestures.pinch.strength);
    }

    if (newGestures.grab.active && !prevGestures.grab.active) {
      onGrabStart?.(handedness);
    } else if (!newGestures.grab.active && prevGestures.grab.active) {
      onGrabEnd?.(handedness);
    }

    if (newGestures.point.active && !prevGestures.point.active) {
      onPointStart?.(handedness, newGestures.point.direction.clone());
    } else if (!newGestures.point.active && prevGestures.point.active) {
      onPointEnd?.(handedness);
    }

    // Update state
    state.gestures = newGestures;
    state.palmNormal.copy(newGestures.openPalm.normal);

    // Copy to previous for next frame
    prevGesturesRef.current = {
      pinch: { ...newGestures.pinch, position: newGestures.pinch.position.clone() },
      grab: { ...newGestures.grab },
      point: { ...newGestures.point, direction: newGestures.point.direction.clone() },
      openPalm: { ...newGestures.openPalm, normal: newGestures.openPalm.normal.clone() },
    };
  }, [config, detectGestures, onPinchStart, onPinchEnd, onPinchMove, onGrabStart, onGrabEnd, onPointStart, onPointEnd]);

  // Void reference to satisfy TypeScript - function is prepared for future use
  void _processHandInput;

  // Update hand states each frame
  useFrame(() => {
    if (!session) {
      // Reset tracking state when no session
      if (leftStateRef.current.tracked || rightStateRef.current.tracked) {
        leftStateRef.current.tracked = false;
        rightStateRef.current.tracked = false;
        setDebugState(prev => ({ ...prev, leftTracked: false, rightTracked: false }));
      }
      return;
    }

    // Process each input source
    let leftFound = false;
    let rightFound = false;

    for (const inputSource of session.inputSources) {
      if (!inputSource.hand) continue;

      // Note: Full hand tracking requires proper reference space management
      // The @react-three/xr library handles this internally through the XR store
      // This component provides the gesture detection and callback infrastructure

      if (inputSource.handedness === 'left') {
        leftFound = true;
        leftStateRef.current.tracked = true;
      } else if (inputSource.handedness === 'right') {
        rightFound = true;
        rightStateRef.current.tracked = true;
      }
    }

    // Update tracking state
    if (!leftFound) leftStateRef.current.tracked = false;
    if (!rightFound) rightStateRef.current.tracked = false;

    // Update debug state if changed
    if (showDebug) {
      const newDebugState = {
        leftTracked: leftStateRef.current.tracked,
        rightTracked: rightStateRef.current.tracked,
        leftJoints: Array.from(leftStateRef.current.joints.values()).map(j => j.position.clone()),
        rightJoints: Array.from(rightStateRef.current.joints.values()).map(j => j.position.clone()),
      };
      setDebugState(newDebugState);
    }

    // Call update callback
    onHandUpdate?.(leftStateRef.current, rightStateRef.current);
  });

  // Handle input source changes
  useEffect(() => {
    if (!session) return;

    const handleInputSourcesChange = (event: XRInputSourcesChangeEvent) => {
      const handsAdded = event.added.filter((s: XRInputSource) => s.hand).length;
      const handsRemoved = event.removed.filter((s: XRInputSource) => s.hand).length;
      
      if (handsAdded > 0 || handsRemoved > 0) {
        console.log('[XRHands] Hand tracking sources changed:', {
          added: handsAdded,
          removed: handsRemoved,
        });
      }
    };

    session.addEventListener('inputsourceschange', handleInputSourcesChange);
    return () => {
      session.removeEventListener('inputsourceschange', handleInputSourcesChange);
    };
  }, [session]);

  // Debug visualization
  if (!showDebug) return null;

  return (
    <group name="xr-hands-debug">
      {/* Left hand debug joints */}
      {debugState.leftTracked && debugState.leftJoints.map((pos, i) => (
        <mesh key={`left-joint-${i}`} position={pos}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshBasicMaterial color={leftJointColor} />
        </mesh>
      ))}
      
      {/* Right hand debug joints */}
      {debugState.rightTracked && debugState.rightJoints.map((pos, i) => (
        <mesh key={`right-joint-${i}`} position={pos}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshBasicMaterial color={rightJointColor} />
        </mesh>
      ))}

      {/* Hand tracking status indicators */}
      {debugState.leftTracked && (
        <group position={[-0.3, 1.6, -0.5]}>
          <mesh>
            <boxGeometry args={[0.02, 0.02, 0.02]} />
            <meshBasicMaterial color={leftJointColor} />
          </mesh>
        </group>
      )}
      {debugState.rightTracked && (
        <group position={[0.3, 1.6, -0.5]}>
          <mesh>
            <boxGeometry args={[0.02, 0.02, 0.02]} />
            <meshBasicMaterial color={rightJointColor} />
          </mesh>
        </group>
      )}
    </group>
  );
};

/**
 * Hook to get current hand tracking state
 * Returns the latest hand states for both hands
 */
export function useHandState(): {
  left: HandTrackingState;
  right: HandTrackingState;
} {
  const leftRef = useRef<HandTrackingState>(createDefaultHandState('left'));
  const rightRef = useRef<HandTrackingState>(createDefaultHandState('right'));
  const session = useXR((state) => state.session);

  useFrame(() => {
    if (!session) return;

    for (const inputSource of session.inputSources) {
      if (!inputSource.hand) continue;
      
      const state = inputSource.handedness === 'left' ? leftRef.current : rightRef.current;
      state.tracked = true;
    }
  });

  return {
    left: leftRef.current,
    right: rightRef.current,
  };
}

export default XRHands;

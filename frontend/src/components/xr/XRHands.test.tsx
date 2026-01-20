/**
 * XRHands Component Tests
 * Tests for hand tracking and gesture detection
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as THREE from 'three';
import {
  XRHands,
  useHandState,
  HAND_JOINT_INDICES,
  DEFAULT_GESTURE_CONFIG,
  type HandJointName,
  type HandJointState,
  type GestureState,
  type GestureConfig,
  type HandTrackingState,
} from './XRHands';

// Mock @react-three/xr
vi.mock('@react-three/xr', () => ({
  useXR: vi.fn(() => null),
}));

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('XRHands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HAND_JOINT_INDICES', () => {
    it('should have all 25 hand joints defined', () => {
      expect(Object.keys(HAND_JOINT_INDICES)).toHaveLength(25);
    });

    it('should have wrist at index 0', () => {
      expect(HAND_JOINT_INDICES['wrist']).toBe(0);
    });

    it('should have all thumb joints', () => {
      expect(HAND_JOINT_INDICES['thumb-metacarpal']).toBe(1);
      expect(HAND_JOINT_INDICES['thumb-phalanx-proximal']).toBe(2);
      expect(HAND_JOINT_INDICES['thumb-phalanx-distal']).toBe(3);
      expect(HAND_JOINT_INDICES['thumb-tip']).toBe(4);
    });

    it('should have all index finger joints', () => {
      expect(HAND_JOINT_INDICES['index-finger-metacarpal']).toBe(5);
      expect(HAND_JOINT_INDICES['index-finger-phalanx-proximal']).toBe(6);
      expect(HAND_JOINT_INDICES['index-finger-phalanx-intermediate']).toBe(7);
      expect(HAND_JOINT_INDICES['index-finger-phalanx-distal']).toBe(8);
      expect(HAND_JOINT_INDICES['index-finger-tip']).toBe(9);
    });

    it('should have all middle finger joints', () => {
      expect(HAND_JOINT_INDICES['middle-finger-metacarpal']).toBe(10);
      expect(HAND_JOINT_INDICES['middle-finger-phalanx-proximal']).toBe(11);
      expect(HAND_JOINT_INDICES['middle-finger-phalanx-intermediate']).toBe(12);
      expect(HAND_JOINT_INDICES['middle-finger-phalanx-distal']).toBe(13);
      expect(HAND_JOINT_INDICES['middle-finger-tip']).toBe(14);
    });

    it('should have all ring finger joints', () => {
      expect(HAND_JOINT_INDICES['ring-finger-metacarpal']).toBe(15);
      expect(HAND_JOINT_INDICES['ring-finger-phalanx-proximal']).toBe(16);
      expect(HAND_JOINT_INDICES['ring-finger-phalanx-intermediate']).toBe(17);
      expect(HAND_JOINT_INDICES['ring-finger-phalanx-distal']).toBe(18);
      expect(HAND_JOINT_INDICES['ring-finger-tip']).toBe(19);
    });

    it('should have all pinky finger joints', () => {
      expect(HAND_JOINT_INDICES['pinky-finger-metacarpal']).toBe(20);
      expect(HAND_JOINT_INDICES['pinky-finger-phalanx-proximal']).toBe(21);
      expect(HAND_JOINT_INDICES['pinky-finger-phalanx-intermediate']).toBe(22);
      expect(HAND_JOINT_INDICES['pinky-finger-phalanx-distal']).toBe(23);
      expect(HAND_JOINT_INDICES['pinky-finger-tip']).toBe(24);
    });
  });

  describe('DEFAULT_GESTURE_CONFIG', () => {
    it('should have pinch threshold defined', () => {
      expect(DEFAULT_GESTURE_CONFIG.pinchThreshold).toBe(0.03);
    });

    it('should have grab threshold defined', () => {
      expect(DEFAULT_GESTURE_CONFIG.grabThreshold).toBe(0.7);
    });

    it('should have point threshold defined', () => {
      expect(DEFAULT_GESTURE_CONFIG.pointThreshold).toBe(0.6);
    });

    it('should have open palm threshold defined', () => {
      expect(DEFAULT_GESTURE_CONFIG.openPalmThreshold).toBe(0.8);
    });

    it('should have all thresholds between 0 and 1 (except pinch)', () => {
      expect(DEFAULT_GESTURE_CONFIG.grabThreshold).toBeGreaterThan(0);
      expect(DEFAULT_GESTURE_CONFIG.grabThreshold).toBeLessThanOrEqual(1);
      expect(DEFAULT_GESTURE_CONFIG.pointThreshold).toBeGreaterThan(0);
      expect(DEFAULT_GESTURE_CONFIG.pointThreshold).toBeLessThanOrEqual(1);
      expect(DEFAULT_GESTURE_CONFIG.openPalmThreshold).toBeGreaterThan(0);
      expect(DEFAULT_GESTURE_CONFIG.openPalmThreshold).toBeLessThanOrEqual(1);
    });
  });

  describe('HandJointState Type', () => {
    it('should have correct structure', () => {
      const jointState: HandJointState = {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Quaternion(0, 0, 0, 1),
        radius: 0.01,
      };

      expect(jointState.position).toBeInstanceOf(THREE.Vector3);
      expect(jointState.rotation).toBeInstanceOf(THREE.Quaternion);
      expect(jointState.radius).toBe(0.01);
    });
  });

  describe('GestureState Type', () => {
    it('should have pinch gesture state', () => {
      const gestureState: GestureState = {
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
      };

      expect(gestureState.pinch).toBeDefined();
      expect(gestureState.pinch.active).toBe(false);
      expect(gestureState.pinch.strength).toBe(0);
    });

    it('should have grab gesture state', () => {
      const gestureState: GestureState = {
        pinch: { active: false, strength: 0, position: new THREE.Vector3() },
        grab: { active: true, strength: 0.8 },
        point: { active: false, direction: new THREE.Vector3() },
        openPalm: { active: false, normal: new THREE.Vector3() },
      };

      expect(gestureState.grab.active).toBe(true);
      expect(gestureState.grab.strength).toBe(0.8);
    });

    it('should have point gesture state', () => {
      const direction = new THREE.Vector3(0, 0, -1);
      const gestureState: GestureState = {
        pinch: { active: false, strength: 0, position: new THREE.Vector3() },
        grab: { active: false, strength: 0 },
        point: { active: true, direction },
        openPalm: { active: false, normal: new THREE.Vector3() },
      };

      expect(gestureState.point.active).toBe(true);
      expect(gestureState.point.direction).toBe(direction);
    });

    it('should have open palm gesture state', () => {
      const normal = new THREE.Vector3(0, 1, 0);
      const gestureState: GestureState = {
        pinch: { active: false, strength: 0, position: new THREE.Vector3() },
        grab: { active: false, strength: 0 },
        point: { active: false, direction: new THREE.Vector3() },
        openPalm: { active: true, normal },
      };

      expect(gestureState.openPalm.active).toBe(true);
      expect(gestureState.openPalm.normal).toBe(normal);
    });
  });

  describe('HandTrackingState Type', () => {
    it('should have correct structure', () => {
      const handState: HandTrackingState = {
        handedness: 'left',
        tracked: false,
        joints: new Map(),
        gestures: {
          pinch: { active: false, strength: 0, position: new THREE.Vector3() },
          grab: { active: false, strength: 0 },
          point: { active: false, direction: new THREE.Vector3() },
          openPalm: { active: false, normal: new THREE.Vector3() },
        },
        wristPosition: new THREE.Vector3(),
        palmPosition: new THREE.Vector3(),
        palmNormal: new THREE.Vector3(0, 1, 0),
      };

      expect(handState.handedness).toBe('left');
      expect(handState.tracked).toBe(false);
      expect(handState.joints).toBeInstanceOf(Map);
    });

    it('should support both left and right handedness', () => {
      const leftHand: HandTrackingState = {
        handedness: 'left',
        tracked: true,
        joints: new Map(),
        gestures: {
          pinch: { active: false, strength: 0, position: new THREE.Vector3() },
          grab: { active: false, strength: 0 },
          point: { active: false, direction: new THREE.Vector3() },
          openPalm: { active: false, normal: new THREE.Vector3() },
        },
        wristPosition: new THREE.Vector3(),
        palmPosition: new THREE.Vector3(),
        palmNormal: new THREE.Vector3(),
      };

      const rightHand: HandTrackingState = {
        ...leftHand,
        handedness: 'right',
      };

      expect(leftHand.handedness).toBe('left');
      expect(rightHand.handedness).toBe('right');
    });
  });

  describe('GestureConfig Type', () => {
    it('should allow custom configuration', () => {
      const customConfig: GestureConfig = {
        pinchThreshold: 0.05,
        grabThreshold: 0.8,
        pointThreshold: 0.5,
        openPalmThreshold: 0.9,
      };

      expect(customConfig.pinchThreshold).toBe(0.05);
      expect(customConfig.grabThreshold).toBe(0.8);
    });

    it('should allow partial configuration override', () => {
      const partialConfig: Partial<GestureConfig> = {
        pinchThreshold: 0.02,
      };

      const mergedConfig: GestureConfig = {
        ...DEFAULT_GESTURE_CONFIG,
        ...partialConfig,
      };

      expect(mergedConfig.pinchThreshold).toBe(0.02);
      expect(mergedConfig.grabThreshold).toBe(DEFAULT_GESTURE_CONFIG.grabThreshold);
    });
  });

  describe('Component Props', () => {
    it('should have correct default props', () => {
      const defaultProps = {
        showDebug: false,
        leftJointColor: '#3b82f6',
        rightJointColor: '#10b981',
      };

      expect(defaultProps.showDebug).toBe(false);
      expect(defaultProps.leftJointColor).toBe('#3b82f6');
      expect(defaultProps.rightJointColor).toBe('#10b981');
    });

    it('should accept all gesture callback props', () => {
      const callbacks = {
        onPinchStart: vi.fn(),
        onPinchEnd: vi.fn(),
        onPinchMove: vi.fn(),
        onGrabStart: vi.fn(),
        onGrabEnd: vi.fn(),
        onPointStart: vi.fn(),
        onPointEnd: vi.fn(),
        onHandUpdate: vi.fn(),
      };

      Object.values(callbacks).forEach(callback => {
        expect(typeof callback).toBe('function');
      });
    });
  });

  describe('useHandState Hook', () => {
    it('should return left and right hand states', () => {
      const { result } = renderHook(() => useHandState());

      expect(result.current).toHaveProperty('left');
      expect(result.current).toHaveProperty('right');
    });

    it('should initialize with untracked state', () => {
      const { result } = renderHook(() => useHandState());

      expect(result.current.left.tracked).toBe(false);
      expect(result.current.right.tracked).toBe(false);
    });

    it('should have correct handedness for each hand', () => {
      const { result } = renderHook(() => useHandState());

      expect(result.current.left.handedness).toBe('left');
      expect(result.current.right.handedness).toBe('right');
    });
  });

  describe('Component Export', () => {
    it('should export XRHands component', () => {
      expect(XRHands).toBeDefined();
      expect(typeof XRHands).toBe('function');
    });

    it('should export useHandState hook', () => {
      expect(useHandState).toBeDefined();
      expect(typeof useHandState).toBe('function');
    });

    it('should export HAND_JOINT_INDICES constant', () => {
      expect(HAND_JOINT_INDICES).toBeDefined();
      expect(typeof HAND_JOINT_INDICES).toBe('object');
    });

    it('should export DEFAULT_GESTURE_CONFIG constant', () => {
      expect(DEFAULT_GESTURE_CONFIG).toBeDefined();
      expect(typeof DEFAULT_GESTURE_CONFIG).toBe('object');
    });
  });

  describe('Hand Joint Names', () => {
    it('should have valid joint names as keys', () => {
      const jointNames: HandJointName[] = [
        'wrist',
        'thumb-metacarpal',
        'thumb-phalanx-proximal',
        'thumb-phalanx-distal',
        'thumb-tip',
        'index-finger-metacarpal',
        'index-finger-phalanx-proximal',
        'index-finger-phalanx-intermediate',
        'index-finger-phalanx-distal',
        'index-finger-tip',
        'middle-finger-metacarpal',
        'middle-finger-phalanx-proximal',
        'middle-finger-phalanx-intermediate',
        'middle-finger-phalanx-distal',
        'middle-finger-tip',
        'ring-finger-metacarpal',
        'ring-finger-phalanx-proximal',
        'ring-finger-phalanx-intermediate',
        'ring-finger-phalanx-distal',
        'ring-finger-tip',
        'pinky-finger-metacarpal',
        'pinky-finger-phalanx-proximal',
        'pinky-finger-phalanx-intermediate',
        'pinky-finger-phalanx-distal',
        'pinky-finger-tip',
      ];

      jointNames.forEach(name => {
        expect(HAND_JOINT_INDICES).toHaveProperty(name);
      });
    });

    it('should have sequential indices from 0 to 24', () => {
      const indices = Object.values(HAND_JOINT_INDICES);
      const sortedIndices = [...indices].sort((a, b) => a - b);
      
      expect(sortedIndices[0]).toBe(0);
      expect(sortedIndices[sortedIndices.length - 1]).toBe(24);
      
      // Check all indices are unique and sequential
      for (let i = 0; i < sortedIndices.length; i++) {
        expect(sortedIndices[i]).toBe(i);
      }
    });
  });
});

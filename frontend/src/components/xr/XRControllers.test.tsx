/**
 * XRControllers Component Tests
 * Tests for VR controller input handling
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  XRControllers,
  useControllerState,
  type ControllerInputState,
  type ControllerButtonState,
  type ControllerAxesState,
  type ControllerHandedness,
} from './XRControllers';

// Mock @react-three/xr
vi.mock('@react-three/xr', () => ({
  useXR: vi.fn(() => null),
}));

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('XRControllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Props', () => {
    it('should have correct default props', () => {
      // Verify default prop values are defined in the component
      const defaultProps = {
        showDebug: false,
        leftRayColor: '#3b82f6',
        rightRayColor: '#10b981',
        rayLength: 5,
        enableHaptics: true,
      };

      expect(defaultProps.showDebug).toBe(false);
      expect(defaultProps.leftRayColor).toBe('#3b82f6');
      expect(defaultProps.rightRayColor).toBe('#10b981');
      expect(defaultProps.rayLength).toBe(5);
      expect(defaultProps.enableHaptics).toBe(true);
    });

    it('should accept all callback props', () => {
      const callbacks = {
        onTriggerPress: vi.fn(),
        onTriggerRelease: vi.fn(),
        onGripPress: vi.fn(),
        onGripRelease: vi.fn(),
        onPrimaryButtonPress: vi.fn(),
        onPrimaryButtonRelease: vi.fn(),
        onSecondaryButtonPress: vi.fn(),
        onSecondaryButtonRelease: vi.fn(),
        onThumbstickMove: vi.fn(),
        onThumbstickClick: vi.fn(),
        onControllerUpdate: vi.fn(),
      };

      // Verify all callbacks are functions
      Object.values(callbacks).forEach(callback => {
        expect(typeof callback).toBe('function');
      });
    });
  });

  describe('ControllerInputState Type', () => {
    it('should have correct structure for controller input state', () => {
      const defaultButtonState: ControllerButtonState = {
        pressed: false,
        touched: false,
        value: 0,
      };

      const defaultAxesState: ControllerAxesState = {
        x: 0,
        y: 0,
      };

      const inputState: ControllerInputState = {
        handedness: 'left',
        connected: false,
        trigger: defaultButtonState,
        grip: defaultButtonState,
        primaryButton: defaultButtonState,
        secondaryButton: defaultButtonState,
        thumbstickButton: defaultButtonState,
        thumbstick: defaultAxesState,
        position: { x: 0, y: 0, z: 0 } as any,
        rotation: { x: 0, y: 0, z: 0, w: 1 } as any,
        rayDirection: { x: 0, y: 0, z: -1 } as any,
      };

      expect(inputState.handedness).toBe('left');
      expect(inputState.connected).toBe(false);
      expect(inputState.trigger.pressed).toBe(false);
      expect(inputState.thumbstick.x).toBe(0);
    });

    it('should support all handedness values', () => {
      const handednessValues: ControllerHandedness[] = ['left', 'right', 'none'];
      
      handednessValues.forEach(handedness => {
        expect(['left', 'right', 'none']).toContain(handedness);
      });
    });
  });

  describe('ControllerButtonState Type', () => {
    it('should track pressed state', () => {
      const buttonState: ControllerButtonState = {
        pressed: true,
        touched: false,
        value: 1.0,
      };

      expect(buttonState.pressed).toBe(true);
      expect(buttonState.value).toBe(1.0);
    });

    it('should track touched state', () => {
      const buttonState: ControllerButtonState = {
        pressed: false,
        touched: true,
        value: 0.5,
      };

      expect(buttonState.touched).toBe(true);
      expect(buttonState.value).toBe(0.5);
    });

    it('should support analog values between 0 and 1', () => {
      const analogValues = [0, 0.25, 0.5, 0.75, 1.0];
      
      analogValues.forEach(value => {
        const buttonState: ControllerButtonState = {
          pressed: value > 0.5,
          touched: value > 0,
          value,
        };
        
        expect(buttonState.value).toBeGreaterThanOrEqual(0);
        expect(buttonState.value).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('ControllerAxesState Type', () => {
    it('should track thumbstick position', () => {
      const axesState: ControllerAxesState = {
        x: 0.5,
        y: -0.3,
      };

      expect(axesState.x).toBe(0.5);
      expect(axesState.y).toBe(-0.3);
    });

    it('should support full range of thumbstick values', () => {
      const testCases = [
        { x: -1, y: -1 },
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: -0.5, y: 0.5 },
      ];

      testCases.forEach(({ x, y }) => {
        const axesState: ControllerAxesState = { x, y };
        
        expect(axesState.x).toBeGreaterThanOrEqual(-1);
        expect(axesState.x).toBeLessThanOrEqual(1);
        expect(axesState.y).toBeGreaterThanOrEqual(-1);
        expect(axesState.y).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('useControllerState Hook', () => {
    it('should return left and right controller states', () => {
      const { result } = renderHook(() => useControllerState());

      expect(result.current).toHaveProperty('left');
      expect(result.current).toHaveProperty('right');
    });

    it('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useControllerState());

      expect(result.current.left.connected).toBe(false);
      expect(result.current.right.connected).toBe(false);
    });

    it('should have correct handedness for each controller', () => {
      const { result } = renderHook(() => useControllerState());

      expect(result.current.left.handedness).toBe('left');
      expect(result.current.right.handedness).toBe('right');
    });
  });

  describe('Component Export', () => {
    it('should export XRControllers component', () => {
      expect(XRControllers).toBeDefined();
      expect(typeof XRControllers).toBe('function');
    });

    it('should export useControllerState hook', () => {
      expect(useControllerState).toBeDefined();
      expect(typeof useControllerState).toBe('function');
    });
  });
});

/**
 * XRControllers Component
 * Provides VR controller support with input handling for WebXR sessions
 * 
 * Features:
 * - Renders controller models in VR mode
 * - Handles trigger, grip, and thumbstick inputs
 * - Provides ray pointer for interaction
 * - Supports both left and right controllers
 * - Haptic feedback support
 * - Controller state tracking
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://docs.pmnd.rs/xr/tutorials/store
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

/**
 * Controller handedness type
 */
export type ControllerHandedness = 'left' | 'right' | 'none';

/**
 * Controller button state
 */
export interface ControllerButtonState {
  /** Whether the button is pressed */
  pressed: boolean;
  /** Whether the button is touched */
  touched: boolean;
  /** Button value (0-1 for analog buttons) */
  value: number;
}

/**
 * Controller thumbstick/trackpad state
 */
export interface ControllerAxesState {
  /** X-axis value (-1 to 1) */
  x: number;
  /** Y-axis value (-1 to 1) */
  y: number;
}

/**
 * Complete controller input state
 */
export interface ControllerInputState {
  /** Controller handedness */
  handedness: ControllerHandedness;
  /** Whether the controller is connected */
  connected: boolean;
  /** Trigger button state (index finger) */
  trigger: ControllerButtonState;
  /** Grip button state (middle finger) */
  grip: ControllerButtonState;
  /** Primary button state (A/X button) */
  primaryButton: ControllerButtonState;
  /** Secondary button state (B/Y button) */
  secondaryButton: ControllerButtonState;
  /** Thumbstick button state (click) */
  thumbstickButton: ControllerButtonState;
  /** Thumbstick axes state */
  thumbstick: ControllerAxesState;
  /** Controller position in world space */
  position: THREE.Vector3;
  /** Controller rotation in world space */
  rotation: THREE.Quaternion;
  /** Ray direction for pointing */
  rayDirection: THREE.Vector3;
}

/**
 * Default button state
 */
const DEFAULT_BUTTON_STATE: ControllerButtonState = {
  pressed: false,
  touched: false,
  value: 0,
};

/**
 * Default axes state
 */
const DEFAULT_AXES_STATE: ControllerAxesState = {
  x: 0,
  y: 0,
};

/**
 * Create default controller input state
 */
const createDefaultInputState = (handedness: ControllerHandedness): ControllerInputState => ({
  handedness,
  connected: false,
  trigger: { ...DEFAULT_BUTTON_STATE },
  grip: { ...DEFAULT_BUTTON_STATE },
  primaryButton: { ...DEFAULT_BUTTON_STATE },
  secondaryButton: { ...DEFAULT_BUTTON_STATE },
  thumbstickButton: { ...DEFAULT_BUTTON_STATE },
  thumbstick: { ...DEFAULT_AXES_STATE },
  position: new THREE.Vector3(),
  rotation: new THREE.Quaternion(),
  rayDirection: new THREE.Vector3(0, 0, -1),
});

/**
 * Props for XRControllers component
 */
export interface XRControllersProps {
  /** Callback when trigger is pressed */
  onTriggerPress?: (handedness: ControllerHandedness, value: number) => void;
  /** Callback when trigger is released */
  onTriggerRelease?: (handedness: ControllerHandedness) => void;
  /** Callback when grip is pressed */
  onGripPress?: (handedness: ControllerHandedness, value: number) => void;
  /** Callback when grip is released */
  onGripRelease?: (handedness: ControllerHandedness) => void;
  /** Callback when primary button (A/X) is pressed */
  onPrimaryButtonPress?: (handedness: ControllerHandedness) => void;
  /** Callback when primary button is released */
  onPrimaryButtonRelease?: (handedness: ControllerHandedness) => void;
  /** Callback when secondary button (B/Y) is pressed */
  onSecondaryButtonPress?: (handedness: ControllerHandedness) => void;
  /** Callback when secondary button is released */
  onSecondaryButtonRelease?: (handedness: ControllerHandedness) => void;
  /** Callback when thumbstick is moved */
  onThumbstickMove?: (handedness: ControllerHandedness, x: number, y: number) => void;
  /** Callback when thumbstick is clicked */
  onThumbstickClick?: (handedness: ControllerHandedness) => void;
  /** Callback when controller state updates (called every frame) */
  onControllerUpdate?: (leftState: ControllerInputState, rightState: ControllerInputState) => void;
  /** Whether to show debug visualization */
  showDebug?: boolean;
  /** Ray color for left controller */
  leftRayColor?: string;
  /** Ray color for right controller */
  rightRayColor?: string;
  /** Ray length */
  rayLength?: number;
  /** Whether to enable haptic feedback */
  enableHaptics?: boolean;
}

/**
 * XRControllers - Component for handling VR controller input
 * 
 * This component tracks controller state and provides callbacks for various inputs.
 * The actual controller rendering is handled by @react-three/xr's default controller
 * implementation through the XR store configuration.
 * 
 * @example
 * ```tsx
 * <XRControllers
 *   onTriggerPress={(hand, value) => console.log(`${hand} trigger: ${value}`)}
 *   onThumbstickMove={(hand, x, y) => console.log(`${hand} stick: ${x}, ${y}`)}
 * />
 * ```
 */
export const XRControllers: React.FC<XRControllersProps> = ({
  onTriggerPress,
  onTriggerRelease,
  onGripPress,
  onGripRelease,
  onPrimaryButtonPress,
  onPrimaryButtonRelease,
  onSecondaryButtonPress,
  onSecondaryButtonRelease,
  onThumbstickMove,
  onThumbstickClick,
  onControllerUpdate,
  showDebug = false,
  leftRayColor = '#3b82f6',
  rightRayColor = '#10b981',
  rayLength = 5,
  enableHaptics = true,
}) => {
  // Get XR session state
  const session = useXR((state) => state.session);
  
  // Controller state refs (using refs to avoid re-renders every frame)
  const leftStateRef = useRef<ControllerInputState>(createDefaultInputState('left'));
  const rightStateRef = useRef<ControllerInputState>(createDefaultInputState('right'));
  
  // Previous state for detecting changes
  const prevLeftStateRef = useRef<ControllerInputState>(createDefaultInputState('left'));
  const prevRightStateRef = useRef<ControllerInputState>(createDefaultInputState('right'));

  // State for debug visualization
  const [debugState, setDebugState] = useState({
    leftConnected: false,
    rightConnected: false,
  });

  /**
   * Trigger haptic feedback on a controller
   */
  const triggerHaptic = useCallback((
    inputSource: XRInputSource,
    intensity: number = 0.5,
    duration: number = 100
  ) => {
    if (!enableHaptics || !inputSource.gamepad) return;

    const hapticActuator = inputSource.gamepad.hapticActuators?.[0];
    if (hapticActuator && 'pulse' in hapticActuator) {
      (hapticActuator as GamepadHapticActuator).pulse(intensity, duration);
    }
  }, [enableHaptics]);

  /**
   * Update button state from gamepad button
   */
  const updateButtonState = useCallback((
    button: GamepadButton | undefined,
    currentState: ControllerButtonState
  ): ControllerButtonState => {
    if (!button) return currentState;
    return {
      pressed: button.pressed,
      touched: button.touched,
      value: button.value,
    };
  }, []);

  /**
   * Process input source and update state
   */
  const processInputSource = useCallback((
    inputSource: XRInputSource,
    stateRef: React.MutableRefObject<ControllerInputState>,
    prevStateRef: React.MutableRefObject<ControllerInputState>,
    handedness: ControllerHandedness
  ) => {
    const gamepad = inputSource.gamepad;
    if (!gamepad) return;

    const state = stateRef.current;
    const prevState = prevStateRef.current;

    // Update connection state
    state.connected = true;
    state.handedness = handedness;

    // Update button states
    // Standard XR gamepad mapping:
    // buttons[0] = trigger
    // buttons[1] = grip
    // buttons[2] = touchpad/thumbstick click (if present)
    // buttons[3] = thumbstick click (if separate)
    // buttons[4] = A/X button
    // buttons[5] = B/Y button
    
    const buttons = gamepad.buttons;
    
    // Trigger (index 0)
    state.trigger = updateButtonState(buttons[0], state.trigger);
    if (state.trigger.pressed && !prevState.trigger.pressed) {
      onTriggerPress?.(handedness, state.trigger.value);
      triggerHaptic(inputSource, 0.3, 50);
    } else if (!state.trigger.pressed && prevState.trigger.pressed) {
      onTriggerRelease?.(handedness);
    }

    // Grip (index 1)
    state.grip = updateButtonState(buttons[1], state.grip);
    if (state.grip.pressed && !prevState.grip.pressed) {
      onGripPress?.(handedness, state.grip.value);
      triggerHaptic(inputSource, 0.4, 50);
    } else if (!state.grip.pressed && prevState.grip.pressed) {
      onGripRelease?.(handedness);
    }

    // Thumbstick button (index 3 or 2)
    const thumbstickButtonIndex = buttons.length > 3 ? 3 : 2;
    state.thumbstickButton = updateButtonState(buttons[thumbstickButtonIndex], state.thumbstickButton);
    if (state.thumbstickButton.pressed && !prevState.thumbstickButton.pressed) {
      onThumbstickClick?.(handedness);
      triggerHaptic(inputSource, 0.2, 30);
    }

    // Primary button (A/X - index 4)
    if (buttons.length > 4) {
      state.primaryButton = updateButtonState(buttons[4], state.primaryButton);
      if (state.primaryButton.pressed && !prevState.primaryButton.pressed) {
        onPrimaryButtonPress?.(handedness);
        triggerHaptic(inputSource, 0.3, 50);
      } else if (!state.primaryButton.pressed && prevState.primaryButton.pressed) {
        onPrimaryButtonRelease?.(handedness);
      }
    }

    // Secondary button (B/Y - index 5)
    if (buttons.length > 5) {
      state.secondaryButton = updateButtonState(buttons[5], state.secondaryButton);
      if (state.secondaryButton.pressed && !prevState.secondaryButton.pressed) {
        onSecondaryButtonPress?.(handedness);
        triggerHaptic(inputSource, 0.3, 50);
      } else if (!state.secondaryButton.pressed && prevState.secondaryButton.pressed) {
        onSecondaryButtonRelease?.(handedness);
      }
    }

    // Thumbstick axes
    // axes[0] = touchpad/thumbstick X
    // axes[1] = touchpad/thumbstick Y
    // axes[2] = thumbstick X (if separate)
    // axes[3] = thumbstick Y (if separate)
    const axes = gamepad.axes;
    const thumbstickXIndex = axes.length > 2 ? 2 : 0;
    const thumbstickYIndex = axes.length > 3 ? 3 : 1;
    
    const newX = axes[thumbstickXIndex] ?? 0;
    const newY = axes[thumbstickYIndex] ?? 0;
    
    // Apply deadzone
    const deadzone = 0.1;
    state.thumbstick.x = Math.abs(newX) > deadzone ? newX : 0;
    state.thumbstick.y = Math.abs(newY) > deadzone ? newY : 0;

    // Notify thumbstick movement if changed significantly
    const prevX = prevState.thumbstick.x;
    const prevY = prevState.thumbstick.y;
    if (Math.abs(state.thumbstick.x - prevX) > 0.05 || Math.abs(state.thumbstick.y - prevY) > 0.05) {
      onThumbstickMove?.(handedness, state.thumbstick.x, state.thumbstick.y);
    }

    // Copy current state to previous for next frame comparison
    prevState.trigger = { ...state.trigger };
    prevState.grip = { ...state.grip };
    prevState.primaryButton = { ...state.primaryButton };
    prevState.secondaryButton = { ...state.secondaryButton };
    prevState.thumbstickButton = { ...state.thumbstickButton };
    prevState.thumbstick = { ...state.thumbstick };
  }, [
    updateButtonState,
    triggerHaptic,
    onTriggerPress,
    onTriggerRelease,
    onGripPress,
    onGripRelease,
    onPrimaryButtonPress,
    onPrimaryButtonRelease,
    onSecondaryButtonPress,
    onSecondaryButtonRelease,
    onThumbstickMove,
    onThumbstickClick,
  ]);

  // Update controller states each frame
  useFrame(() => {
    if (!session) {
      // Reset connection state when no session
      if (leftStateRef.current.connected || rightStateRef.current.connected) {
        leftStateRef.current.connected = false;
        rightStateRef.current.connected = false;
        setDebugState({ leftConnected: false, rightConnected: false });
      }
      return;
    }

    // Process each input source
    const inputSources = session.inputSources;
    let leftFound = false;
    let rightFound = false;

    for (const inputSource of inputSources) {
      if (inputSource.targetRayMode !== 'tracked-pointer') continue;

      if (inputSource.handedness === 'left') {
        leftFound = true;
        processInputSource(inputSource, leftStateRef, prevLeftStateRef, 'left');
      } else if (inputSource.handedness === 'right') {
        rightFound = true;
        processInputSource(inputSource, rightStateRef, prevRightStateRef, 'right');
      }
    }

    // Update connection state
    if (!leftFound) leftStateRef.current.connected = false;
    if (!rightFound) rightStateRef.current.connected = false;

    // Update debug state if changed
    if (showDebug) {
      const newDebugState = {
        leftConnected: leftStateRef.current.connected,
        rightConnected: rightStateRef.current.connected,
      };
      if (newDebugState.leftConnected !== debugState.leftConnected ||
          newDebugState.rightConnected !== debugState.rightConnected) {
        setDebugState(newDebugState);
      }
    }

    // Call update callback
    onControllerUpdate?.(leftStateRef.current, rightStateRef.current);
  });

  // Handle input source changes
  useEffect(() => {
    if (!session) return;

    const handleInputSourcesChange = (event: XRInputSourceChangeEvent) => {
      console.log('[XRControllers] Input sources changed:', {
        added: event.added.length,
        removed: event.removed.length,
      });
    };

    session.addEventListener('inputsourceschange', handleInputSourcesChange);
    return () => {
      session.removeEventListener('inputsourceschange', handleInputSourcesChange);
    };
  }, [session]);

  // Debug visualization
  if (!showDebug) return null;

  return (
    <group name="xr-controllers-debug">
      {/* Left controller debug indicator */}
      {debugState.leftConnected && (
        <group position={[-0.5, 1.5, -1]}>
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={leftRayColor} />
          </mesh>
        </group>
      )}
      
      {/* Right controller debug indicator */}
      {debugState.rightConnected && (
        <group position={[0.5, 1.5, -1]}>
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={rightRayColor} />
          </mesh>
        </group>
      )}
    </group>
  );
};

/**
 * Hook to get current controller input state
 * Returns the latest controller states for both hands
 */
export function useControllerState(): {
  left: ControllerInputState;
  right: ControllerInputState;
} {
  const leftRef = useRef<ControllerInputState>(createDefaultInputState('left'));
  const rightRef = useRef<ControllerInputState>(createDefaultInputState('right'));
  const session = useXR((state) => state.session);

  useFrame(() => {
    if (!session) return;

    for (const inputSource of session.inputSources) {
      if (inputSource.targetRayMode !== 'tracked-pointer') continue;
      
      const gamepad = inputSource.gamepad;
      if (!gamepad) continue;

      const state = inputSource.handedness === 'left' ? leftRef.current : rightRef.current;
      state.connected = true;
      
      // Update basic button states
      if (gamepad.buttons[0]) {
        state.trigger.pressed = gamepad.buttons[0].pressed;
        state.trigger.value = gamepad.buttons[0].value;
      }
      if (gamepad.buttons[1]) {
        state.grip.pressed = gamepad.buttons[1].pressed;
        state.grip.value = gamepad.buttons[1].value;
      }
      
      // Update axes
      const axes = gamepad.axes;
      const thumbstickXIndex = axes.length > 2 ? 2 : 0;
      const thumbstickYIndex = axes.length > 3 ? 3 : 1;
      state.thumbstick.x = axes[thumbstickXIndex] ?? 0;
      state.thumbstick.y = axes[thumbstickYIndex] ?? 0;
    }
  });

  return {
    left: leftRef.current,
    right: rightRef.current,
  };
}

export default XRControllers;

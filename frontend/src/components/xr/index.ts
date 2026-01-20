/**
 * XR Components Index
 * Exports all XR-related components for WebXR support
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

// Button components
export { VRButton } from './VRButton';
export type { VRButtonProps } from './VRButton';

export { ARButton } from './ARButton';
export type { ARButtonProps } from './ARButton';

// Fallback components for graceful degradation
export { XRFallbackMessage } from './XRFallbackMessage';
export type { XRFallbackMessageProps, XRUnavailableReason } from './XRFallbackMessage';

// Controller components
export { XRControllers, useControllerState } from './XRControllers';
export type {
  XRControllersProps,
  ControllerHandedness,
  ControllerButtonState,
  ControllerAxesState,
  ControllerInputState,
} from './XRControllers';

// Hand tracking components
export { XRHands, useHandState, HAND_JOINT_INDICES, DEFAULT_GESTURE_CONFIG } from './XRHands';
export type {
  XRHandsProps,
  HandJointName,
  HandJointState,
  GestureState,
  GestureConfig,
  HandTrackingState,
} from './XRHands';

// VR Interaction components
export { VRInteraction, useVRInteraction } from './VRInteraction';
export type {
  VRInteractionProps,
  VRInteractionMode,
  InteractionSource,
  NodeInteractionState,
  RayIntersection,
} from './VRInteraction';

// Voice Commands components
export { VoiceCommands } from './VoiceCommands';
export type { VoiceCommandsProps } from './VoiceCommands';

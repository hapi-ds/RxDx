/**
 * XRFallbackMessage Component
 * Displays informative messages when XR features are not available
 * Provides graceful degradation for non-XR devices
 * 
 * Features:
 * - Shows appropriate message based on XR support status
 * - Explains why XR is not available
 * - Provides alternative navigation instructions
 * - Dismissible with optional auto-dismiss
 * - Accessible with proper ARIA attributes
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
 */

import React, { useState, useEffect, useCallback } from 'react';

/**
 * XR support reason for why XR is not available
 */
export type XRUnavailableReason =
  | 'webxr-not-supported'
  | 'vr-not-supported'
  | 'ar-not-supported'
  | 'no-xr-device'
  | 'insecure-context'
  | 'permission-denied'
  | 'session-error'
  | 'unknown';

/**
 * Props for XRFallbackMessage component
 */
export interface XRFallbackMessageProps {
  /** Whether to show the message */
  show: boolean;
  /** The reason XR is not available */
  reason: XRUnavailableReason;
  /** Whether VR is supported (for partial support messages) */
  isVRSupported?: boolean;
  /** Whether AR is supported (for partial support messages) */
  isARSupported?: boolean;
  /** Custom error message to display */
  customMessage?: string;
  /** Whether the message can be dismissed */
  dismissible?: boolean;
  /** Auto-dismiss after specified milliseconds (0 = no auto-dismiss) */
  autoDismissMs?: number;
  /** Callback when message is dismissed */
  onDismiss?: () => void;
  /** Position of the message */
  position?: 'top' | 'bottom' | 'center';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show alternative navigation instructions */
  showAlternatives?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Get user-friendly message based on the unavailable reason
 */
const getReasonMessage = (reason: XRUnavailableReason): { title: string; description: string } => {
  switch (reason) {
    case 'webxr-not-supported':
      return {
        title: 'WebXR Not Supported',
        description: 'Your browser does not support WebXR. Try using a WebXR-compatible browser like Chrome, Edge, or Firefox on a supported device.',
      };
    case 'vr-not-supported':
      return {
        title: 'VR Not Available',
        description: 'Virtual Reality is not available on this device. Connect a VR headset or use a VR-capable device to access VR features.',
      };
    case 'ar-not-supported':
      return {
        title: 'AR Not Available',
        description: 'Augmented Reality is not available on this device. Use a mobile device with AR capabilities or an AR headset.',
      };
    case 'no-xr-device':
      return {
        title: 'No XR Device Detected',
        description: 'No VR or AR device was detected. Please connect a compatible headset and try again.',
      };
    case 'insecure-context':
      return {
        title: 'Secure Connection Required',
        description: 'WebXR requires a secure connection (HTTPS). Please access this page over HTTPS to use XR features.',
      };
    case 'permission-denied':
      return {
        title: 'Permission Denied',
        description: 'XR permission was denied. Please allow XR access in your browser settings and try again.',
      };
    case 'session-error':
      return {
        title: 'XR Session Error',
        description: 'An error occurred while starting the XR session. Please try again or check your device connection.',
      };
    case 'unknown':
    default:
      return {
        title: 'XR Unavailable',
        description: 'XR features are not available at this time. You can still use the standard 3D view with mouse and keyboard navigation.',
      };
  }
};

/**
 * Get alternative navigation instructions
 */
const getAlternativeInstructions = (): string[] => [
  'Use mouse to rotate the view (click and drag)',
  'Scroll to zoom in and out',
  'Use arrow keys for keyboard navigation',
  'Double-click on a node to focus on it',
  'Press R to reset the camera view',
];

/**
 * Info icon SVG component
 */
const InfoIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

/**
 * Close icon SVG component
 */
const CloseIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * Mouse icon SVG component for alternative navigation
 */
const MouseIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="6" y="3" width="12" height="18" rx="6" />
    <line x1="12" y1="7" x2="12" y2="11" />
  </svg>
);

/**
 * Get size-specific styles
 */
const getSizeStyles = (size: 'sm' | 'md' | 'lg'): React.CSSProperties => {
  switch (size) {
    case 'sm':
      return {
        padding: '8px 12px',
        fontSize: '12px',
        maxWidth: '280px',
      };
    case 'lg':
      return {
        padding: '16px 20px',
        fontSize: '14px',
        maxWidth: '420px',
      };
    case 'md':
    default:
      return {
        padding: '12px 16px',
        fontSize: '13px',
        maxWidth: '350px',
      };
  }
};

/**
 * Get position-specific styles
 */
const getPositionStyles = (position: 'top' | 'bottom' | 'center'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
  };

  switch (position) {
    case 'top':
      return { ...base, top: '20px' };
    case 'bottom':
      return { ...base, bottom: '80px' }; // Above XR buttons
    case 'center':
    default:
      return {
        ...base,
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };
  }
};

/**
 * XRFallbackMessage - Displays informative messages when XR is not available
 * Provides graceful degradation with alternative navigation instructions
 */
export const XRFallbackMessage: React.FC<XRFallbackMessageProps> = ({
  show,
  reason,
  isVRSupported = false,
  isARSupported = false,
  customMessage,
  dismissible = true,
  autoDismissMs = 0,
  onDismiss,
  position = 'bottom',
  size = 'md',
  showAlternatives = true,
  className,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update visibility when show prop changes
  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismissMs > 0 && isVisible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, isVisible, handleDismiss]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const { title, description } = getReasonMessage(reason);
  const sizeStyles = getSizeStyles(size);
  const positionStyles = getPositionStyles(position);

  // Build partial support message
  let partialSupportMessage = '';
  if (reason === 'vr-not-supported' && isARSupported) {
    partialSupportMessage = 'AR is available on this device.';
  } else if (reason === 'ar-not-supported' && isVRSupported) {
    partialSupportMessage = 'VR is available on this device.';
  }

  const containerStyle: React.CSSProperties = {
    ...positionStyles,
    ...sizeStyles,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    color: '#e2e8f0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
    ...style,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  };

  const iconContainerStyle: React.CSSProperties = {
    flexShrink: 0,
    color: '#fbbf24',
    marginTop: '2px',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: '4px',
    color: '#f8fafc',
  };

  const descriptionStyle: React.CSSProperties = {
    color: '#94a3b8',
    lineHeight: 1.5,
  };

  const partialSupportStyle: React.CSSProperties = {
    marginTop: '8px',
    padding: '6px 10px',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: '6px',
    color: '#4ade80',
    fontSize: '0.9em',
  };

  const alternativesStyle: React.CSSProperties = {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(148, 163, 184, 0.2)',
  };

  const alternativesTitleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 500,
    marginBottom: '8px',
    color: '#cbd5e1',
    cursor: 'pointer',
  };

  const alternativesListStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: '20px',
    color: '#94a3b8',
    fontSize: '0.9em',
    lineHeight: 1.6,
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s, background-color 0.2s',
  };

  return (
    <div
      className={`xr-fallback-message ${className ?? ''}`}
      style={containerStyle}
      role="alert"
      aria-live="polite"
      data-testid="xr-fallback-message"
    >
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          style={closeButtonStyle}
          aria-label="Dismiss message"
          className="xr-fallback-close"
        >
          <CloseIcon size={16} />
        </button>
      )}

      <div style={headerStyle}>
        <div style={iconContainerStyle}>
          <InfoIcon size={size === 'sm' ? 18 : size === 'lg' ? 24 : 20} />
        </div>
        <div style={contentStyle}>
          <div style={titleStyle}>{title}</div>
          <div style={descriptionStyle}>
            {customMessage || description}
          </div>

          {partialSupportMessage && (
            <div style={partialSupportStyle}>
              ✓ {partialSupportMessage}
            </div>
          )}

          {showAlternatives && (
            <div style={alternativesStyle}>
              <div
                style={alternativesTitleStyle}
                onClick={toggleExpanded}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpanded();
                  }
                }}
                aria-expanded={isExpanded}
              >
                <MouseIcon size={14} />
                <span>Alternative Navigation {isExpanded ? '▼' : '▶'}</span>
              </div>
              {isExpanded && (
                <ul style={alternativesListStyle}>
                  {getAlternativeInstructions().map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .xr-fallback-close:hover {
          color: #e2e8f0 !important;
          background-color: rgba(148, 163, 184, 0.2) !important;
        }
        .xr-fallback-close:focus-visible {
          outline: 2px solid #60a5fa;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default XRFallbackMessage;

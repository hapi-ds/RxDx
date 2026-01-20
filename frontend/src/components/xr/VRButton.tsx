/**
 * VRButton Component
 * Standalone button for entering/exiting VR mode with WebXR support
 * 
 * Features:
 * - Shows "Enter VR" when VR is supported and not in session
 * - Shows "Exit VR" when in VR session
 * - Shows "VR Not Supported" when VR is not available
 * - Shows loading state while checking VR support
 * - Customizable styling (className, style props)
 * - Support for onClick callback for custom handling
 * - VR headset icon display
 * - Hover and active states
 * - Accessible (proper aria labels, keyboard support)
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
 */

import React, { useCallback, useState } from 'react';

/**
 * Props for VRButton component
 */
export interface VRButtonProps {
  /** Whether VR is supported on this device */
  isSupported: boolean;
  /** Whether VR support check is in progress */
  isChecking?: boolean;
  /** Whether currently in a VR session */
  isInSession?: boolean;
  /** Click handler for the button */
  onClick?: () => void | Promise<void>;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Custom label for enter VR state */
  enterLabel?: string;
  /** Custom label for exit VR state */
  exitLabel?: string;
  /** Custom label for not supported state */
  notSupportedLabel?: string;
  /** Custom label for checking state */
  checkingLabel?: string;
  /** Whether to show the VR headset icon */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * VR Headset Icon SVG component
 */
const VRHeadsetIcon: React.FC<{ size?: number; className?: string }> = ({ 
  size = 20, 
  className 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* VR Headset shape */}
    <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-2 2-2-2H4a2 2 0 0 1-2-2V8z" />
    {/* Left lens */}
    <circle cx="8" cy="12" r="2" />
    {/* Right lens */}
    <circle cx="16" cy="12" r="2" />
    {/* Nose bridge */}
    <path d="M10 12h4" />
  </svg>
);

/**
 * Loading spinner component
 */
const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="vr-button-spinner"
    aria-hidden="true"
    style={{
      animation: 'spin 1s linear infinite',
    }}
  >
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
  </svg>
);

/**
 * Get size-specific styles
 */
const getSizeStyles = (size: 'sm' | 'md' | 'lg'): React.CSSProperties => {
  switch (size) {
    case 'sm':
      return {
        padding: '8px 16px',
        fontSize: '12px',
        borderRadius: '6px',
      };
    case 'lg':
      return {
        padding: '16px 32px',
        fontSize: '16px',
        borderRadius: '10px',
      };
    case 'md':
    default:
      return {
        padding: '12px 24px',
        fontSize: '14px',
        borderRadius: '8px',
      };
  }
};

/**
 * VRButton - Button for entering/exiting VR mode
 * Shows appropriate state based on XR support detection and session state
 */
export const VRButton: React.FC<VRButtonProps> = ({
  isSupported,
  isChecking = false,
  isInSession = false,
  onClick,
  className,
  style,
  disabled = false,
  enterLabel = 'Enter VR',
  exitLabel = 'Exit VR',
  notSupportedLabel = 'VR Not Supported',
  checkingLabel = 'Checking VR...',
  showIcon = true,
  size = 'md',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Color scheme for VR (blue theme)
  const baseColor = '#3b82f6';
  const hoverColor = '#2563eb';
  const activeColor = '#1d4ed8';
  const exitColor = '#ef4444';
  const exitHoverColor = '#dc2626';
  const exitActiveColor = '#b91c1c';
  const disabledColor = '#6b7280';

  // Determine current state
  const isButtonDisabled = disabled || isChecking || (!isSupported && !isInSession) || isLoading;
  const showExitState = isInSession;

  // Get button text based on state
  const getButtonText = (): string => {
    if (isChecking) return checkingLabel;
    if (isInSession) return exitLabel;
    if (!isSupported) return notSupportedLabel;
    return enterLabel;
  };

  // Get current background color based on state
  const getBackgroundColor = (): string => {
    if (isChecking || (!isSupported && !isInSession)) return disabledColor;
    
    if (showExitState) {
      if (isActive) return exitActiveColor;
      if (isHovered) return exitHoverColor;
      return exitColor;
    }
    
    if (isActive) return activeColor;
    if (isHovered) return hoverColor;
    return baseColor;
  };

  // Handle click with loading state
  const handleClick = useCallback(async () => {
    if (isButtonDisabled || !onClick) return;
    
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  }, [isButtonDisabled, onClick]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  // Size-specific styles
  const sizeStyles = getSizeStyles(size);

  // Combined button styles
  const buttonStyle: React.CSSProperties = {
    ...sizeStyles,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: getBackgroundColor(),
    border: 'none',
    cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    opacity: isButtonDisabled && !isChecking ? 0.7 : 1,
    transition: 'background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease',
    transform: isActive && !isButtonDisabled ? 'scale(0.98)' : 'scale(1)',
    outline: 'none',
    fontFamily: 'inherit',
    ...style,
  };

  // Get aria-label for accessibility
  const getAriaLabel = (): string => {
    if (isChecking) return 'Checking VR support';
    if (isInSession) return 'Exit VR mode';
    if (!isSupported) return 'VR is not supported on this device';
    return 'Enter VR mode';
  };

  // Get icon size based on button size
  const getIconSize = (): number => {
    switch (size) {
      case 'sm': return 16;
      case 'lg': return 24;
      default: return 20;
    }
  };

  return (
    <>
      {/* Keyframe animation for spinner */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .vr-button:focus-visible {
            outline: 2px solid #60a5fa;
            outline-offset: 2px;
          }
        `}
      </style>
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsActive(false);
        }}
        onMouseDown={() => setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        disabled={isButtonDisabled}
        style={buttonStyle}
        className={`vr-button ${className || ''}`}
        aria-label={getAriaLabel()}
        aria-busy={isChecking || isLoading}
        aria-disabled={isButtonDisabled}
        role="button"
        tabIndex={isButtonDisabled ? -1 : 0}
      >
        {(isChecking || isLoading) && <LoadingSpinner size={getIconSize()} />}
        {showIcon && !isChecking && !isLoading && <VRHeadsetIcon size={getIconSize()} />}
        <span>{getButtonText()}</span>
      </button>
    </>
  );
};

export default VRButton;

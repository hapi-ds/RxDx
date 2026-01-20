/**
 * ARButton Component
 * Standalone button for entering/exiting AR mode with WebXR support
 * 
 * Features:
 * - Shows "Enter AR" when AR is supported and not in session
 * - Shows "Exit AR" when in AR session
 * - Shows "AR Not Supported" when AR is not available
 * - Shows loading state while checking AR support
 * - Customizable styling (className, style props)
 * - Support for onClick callback for custom handling
 * - AR camera icon display
 * - Hover and active states
 * - Accessible (proper aria labels, keyboard support)
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
 */

import React, { useCallback, useState } from 'react';

/**
 * Props for ARButton component
 */
export interface ARButtonProps {
  /** Whether AR is supported on this device */
  isSupported: boolean;
  /** Whether AR support check is in progress */
  isChecking?: boolean;
  /** Whether currently in an AR session */
  isInSession?: boolean;
  /** Click handler for the button */
  onClick?: () => void | Promise<void>;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Custom label for enter AR state */
  enterLabel?: string;
  /** Custom label for exit AR state */
  exitLabel?: string;
  /** Custom label for not supported state */
  notSupportedLabel?: string;
  /** Custom label for checking state */
  checkingLabel?: string;
  /** Whether to show the AR icon */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * AR Camera Icon SVG component
 */
const ARCameraIcon: React.FC<{ size?: number; className?: string }> = ({ 
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
    {/* Phone/device frame */}
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    {/* Camera lens */}
    <circle cx="12" cy="10" r="3" />
    {/* AR overlay corners */}
    <path d="M8 6h2" />
    <path d="M14 6h2" />
    <path d="M8 14h2" />
    <path d="M14 14h2" />
    {/* Home button indicator */}
    <line x1="12" y1="18" x2="12" y2="18" strokeWidth="3" strokeLinecap="round" />
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
    className="ar-button-spinner"
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
 * ARButton - Button for entering/exiting AR mode
 * Shows appropriate state based on XR support detection and session state
 */
export const ARButton: React.FC<ARButtonProps> = ({
  isSupported,
  isChecking = false,
  isInSession = false,
  onClick,
  className,
  style,
  disabled = false,
  enterLabel = 'Enter AR',
  exitLabel = 'Exit AR',
  notSupportedLabel = 'AR Not Supported',
  checkingLabel = 'Checking AR...',
  showIcon = true,
  size = 'md',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Color scheme for AR (purple theme)
  const baseColor = '#8b5cf6';
  const hoverColor = '#7c3aed';
  const activeColor = '#6d28d9';
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
    if (isChecking) return 'Checking AR support';
    if (isInSession) return 'Exit AR mode';
    if (!isSupported) return 'AR is not supported on this device';
    return 'Enter AR mode';
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
          .ar-button:focus-visible {
            outline: 2px solid #a78bfa;
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
        className={`ar-button ${className || ''}`}
        aria-label={getAriaLabel()}
        aria-busy={isChecking || isLoading}
        aria-disabled={isButtonDisabled}
        role="button"
        tabIndex={isButtonDisabled ? -1 : 0}
      >
        {(isChecking || isLoading) && <LoadingSpinner size={getIconSize()} />}
        {showIcon && !isChecking && !isLoading && <ARCameraIcon size={getIconSize()} />}
        <span>{getButtonText()}</span>
      </button>
    </>
  );
};

export default ARButton;

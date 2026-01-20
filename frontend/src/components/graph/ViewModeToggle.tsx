/**
 * ViewModeToggle Component
 * Provides a toggle button to switch between 2D and 3D graph visualization modes
 * Supports keyboard shortcut (Ctrl+Shift+V) for quick toggling
 * Preserves node selection and other state when switching views
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useGraphStore, type ViewMode } from '../../stores/graphStore';

/**
 * Props for the ViewModeToggle component
 */
export interface ViewModeToggleProps {
  /** Optional CSS class name for the container */
  className?: string;
  /** Optional inline styles for the container */
  style?: React.CSSProperties;
  /** Whether to show the keyboard shortcut hint (default: true) */
  showShortcutHint?: boolean;
  /** Whether to enable keyboard shortcut (default: true) */
  enableKeyboardShortcut?: boolean;
  /** Custom keyboard shortcut key (default: 'V') - used with Ctrl+Shift */
  shortcutKey?: string;
  /** Callback when view mode changes */
  onViewModeChange?: (mode: ViewMode) => void;
  /** Whether the toggle is disabled (default: false) */
  disabled?: boolean;
  /** Size variant of the toggle (default: 'md') */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show labels (default: true) */
  showLabels?: boolean;
  /** Whether to animate the transition (default: true) */
  animated?: boolean;
}

/**
 * Icon component for 2D view mode
 */
const Icon2D: React.FC<{ size?: number }> = ({ size = 20 }) => (
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
    {/* Grid pattern representing 2D view */}
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

/**
 * Icon component for 3D view mode
 */
const Icon3D: React.FC<{ size?: number }> = ({ size = 20 }) => (
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
    {/* Cube representing 3D view */}
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
    <line x1="12" y1="22" x2="12" y2="12" />
    <line x1="2" y1="7" x2="2" y2="17" />
    <line x1="22" y1="7" x2="22" y2="17" />
  </svg>
);

/**
 * ViewModeToggle - Toggle button component for switching between 2D and 3D views
 * 
 * Features:
 * - Visual toggle with icons for each mode
 * - Keyboard shortcut support (Ctrl+Shift+V by default)
 * - Smooth transition animation
 * - Accessible with ARIA attributes
 * - Preserves graph state when switching
 */
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  className,
  style,
  showShortcutHint = true,
  enableKeyboardShortcut = true,
  shortcutKey = 'V',
  onViewModeChange,
  disabled = false,
  size = 'md',
  showLabels = true,
  animated = true,
}) => {
  const { viewMode, setViewMode, selectedNode } = useGraphStore();
  const [isTransitioning, setIsTransitioning] = useState(false);

  /**
   * Handle view mode toggle with transition animation
   */
  const handleToggle = useCallback((newMode: ViewMode) => {
    if (disabled || newMode === viewMode) return;

    // Start transition animation
    if (animated) {
      setIsTransitioning(true);
    }

    // Store current selection to preserve it
    const currentSelection = selectedNode?.id;

    // Change view mode
    setViewMode(newMode);

    // Notify parent component
    onViewModeChange?.(newMode);

    // Log the transition for debugging
    console.log(`[ViewModeToggle] Switched to ${newMode} view`, {
      preservedSelection: currentSelection,
    });

    // End transition animation after a short delay
    if (animated) {
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
  }, [disabled, viewMode, selectedNode, setViewMode, onViewModeChange, animated]);

  /**
   * Toggle between modes
   */
  const toggleMode = useCallback(() => {
    const newMode: ViewMode = viewMode === '2d' ? '3d' : '2d';
    handleToggle(newMode);
  }, [viewMode, handleToggle]);

  /**
   * Handle keyboard shortcut (Ctrl+Shift+V by default)
   */
  useEffect(() => {
    if (!enableKeyboardShortcut || disabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Check for Ctrl+Shift+<shortcutKey>
      if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toUpperCase() === shortcutKey.toUpperCase()
      ) {
        event.preventDefault();
        toggleMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboardShortcut, disabled, shortcutKey, toggleMode]);

  // Size configurations
  const sizeConfig = {
    sm: {
      iconSize: 16,
      padding: '0.25rem 0.5rem',
      fontSize: '0.75rem',
      gap: '0.25rem',
    },
    md: {
      iconSize: 20,
      padding: '0.375rem 0.75rem',
      fontSize: '0.875rem',
      gap: '0.375rem',
    },
    lg: {
      iconSize: 24,
      padding: '0.5rem 1rem',
      fontSize: '1rem',
      gap: '0.5rem',
    },
  };

  const config = sizeConfig[size];

  // Container styles
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: config.gap,
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '4px',
    border: '1px solid #e5e7eb',
    ...style,
  };

  // Button base styles
  const getButtonStyle = (mode: ViewMode): React.CSSProperties => {
    const isActive = viewMode === mode;
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: config.gap,
      padding: config.padding,
      fontSize: config.fontSize,
      fontWeight: 500,
      border: 'none',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: animated ? 'all 0.2s ease' : 'none',
      backgroundColor: isActive ? '#667eea' : 'transparent',
      color: isActive ? '#ffffff' : '#6b7280',
      opacity: disabled ? 0.5 : 1,
      outline: 'none',
    };
  };

  // Shortcut hint text
  const shortcutHintText = `Ctrl+Shift+${shortcutKey}`;

  return (
    <div
      className={`view-mode-toggle ${className ?? ''}`}
      style={containerStyle}
      role="group"
      aria-label="View mode toggle"
    >
      {/* 2D Mode Button */}
      <button
        type="button"
        style={getButtonStyle('2d')}
        onClick={() => handleToggle('2d')}
        disabled={disabled}
        aria-pressed={viewMode === '2d'}
        aria-label={`Switch to 2D view${showShortcutHint ? ` (${shortcutHintText})` : ''}`}
        title={showShortcutHint ? `2D View (${shortcutHintText})` : '2D View'}
        className={`view-mode-btn ${viewMode === '2d' ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}
      >
        <Icon2D size={config.iconSize} />
        {showLabels && <span>2D</span>}
      </button>

      {/* 3D Mode Button */}
      <button
        type="button"
        style={getButtonStyle('3d')}
        onClick={() => handleToggle('3d')}
        disabled={disabled}
        aria-pressed={viewMode === '3d'}
        aria-label={`Switch to 3D view${showShortcutHint ? ` (${shortcutHintText})` : ''}`}
        title={showShortcutHint ? `3D View (${shortcutHintText})` : '3D View'}
        className={`view-mode-btn ${viewMode === '3d' ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}
      >
        <Icon3D size={config.iconSize} />
        {showLabels && <span>3D</span>}
      </button>

      <style>{`
        .view-mode-toggle {
          user-select: none;
        }

        .view-mode-btn {
          position: relative;
          overflow: hidden;
        }

        .view-mode-btn:hover:not(:disabled) {
          background-color: ${viewMode === '2d' ? '#5a67d8' : '#e5e7eb'} !important;
        }

        .view-mode-btn:focus-visible {
          box-shadow: 0 0 0 2px #667eea40;
        }

        .view-mode-btn.active {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .view-mode-btn.transitioning {
          transform: scale(0.95);
        }

        .view-mode-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        /* Ripple effect on click */
        .view-mode-btn::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.3s, height 0.3s;
        }

        .view-mode-btn:active::after {
          width: 100px;
          height: 100px;
        }
      `}</style>
    </div>
  );
};

export default ViewModeToggle;

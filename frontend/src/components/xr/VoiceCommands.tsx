/**
 * VoiceCommands Component
 * Provides voice command UI and integration for VR hands-free operation
 * 
 * Features:
 * - Visual feedback for voice recognition state (listening, processing, error)
 * - Microphone permission handling with user-friendly prompts
 * - Command history display
 * - Help overlay showing available commands
 * - Integration with GraphView3D for node selection and camera control
 * 
 * References: Requirement 16 (Dual Frontend Interface) - Voice commands for hands-free operation
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  useVoiceCommands,
  type VoiceCommandCallbacks,
  type VoiceCommandsConfig,
  type ParsedVoiceCommand,
  type FilterableNodeType,
  AVAILABLE_COMMANDS,
} from '../../hooks/useVoiceCommands';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Props for VoiceCommands component
 */
export interface VoiceCommandsProps {
  /** Whether voice commands are enabled (default: true) */
  enabled?: boolean;
  /** Callback when a node should be selected by name */
  onSelectNode?: (nodeName: string) => void;
  /** Callback when zoom in is requested */
  onZoomIn?: () => void;
  /** Callback when zoom out is requested */
  onZoomOut?: () => void;
  /** Callback when view reset is requested */
  onResetView?: () => void;
  /** Callback when nodes of a type should be shown */
  onShowNodeType?: (nodeType: FilterableNodeType) => void;
  /** Callback when nodes of a type should be hidden */
  onHideNodeType?: (nodeType: FilterableNodeType) => void;
  /** Whether to show the help overlay initially (default: false) */
  showHelpInitially?: boolean;
  /** Whether to show command history (default: true) */
  showHistory?: boolean;
  /** Maximum history items to display (default: 5) */
  maxHistoryItems?: number;
  /** Position of the voice UI (default: 'top-right') */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Voice recognition configuration */
  config?: VoiceCommandsConfig;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

/**
 * Voice indicator visual state
 */
type IndicatorState = 'idle' | 'listening' | 'processing' | 'error' | 'not_supported';

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Microphone icon component
 */
const MicrophoneIcon: React.FC<{ isActive: boolean; size?: number }> = ({ 
  isActive, 
  size = 24 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={isActive ? '#10b981' : 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

/**
 * Muted microphone icon component
 */
const MicrophoneMutedIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

/**
 * Help icon component
 */
const HelpIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/**
 * Close icon component
 */
const CloseIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================================
// Styles
// ============================================================================

const getPositionStyles = (position: VoiceCommandsProps['position']): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    zIndex: 100,
  };

  switch (position) {
    case 'top-left':
      return { ...base, top: '20px', left: '20px' };
    case 'top-right':
      return { ...base, top: '20px', right: '20px' };
    case 'bottom-left':
      return { ...base, bottom: '80px', left: '20px' };
    case 'bottom-right':
      return { ...base, bottom: '80px', right: '20px' };
    default:
      return { ...base, top: '20px', right: '20px' };
  }
};

const containerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const indicatorContainerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  backgroundColor: 'rgba(30, 41, 59, 0.95)',
  borderRadius: '8px',
  border: '1px solid rgba(148, 163, 184, 0.3)',
  color: '#e2e8f0',
  fontSize: '13px',
  backdropFilter: 'blur(8px)',
};

const buttonStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  color: '#e2e8f0',
  transition: 'background-color 0.2s',
};

const historyContainerStyles: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: 'rgba(30, 41, 59, 0.9)',
  borderRadius: '8px',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  color: '#94a3b8',
  fontSize: '12px',
  maxWidth: '250px',
};

const helpOverlayStyles: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: 'rgba(30, 41, 59, 0.95)',
  borderRadius: '8px',
  border: '1px solid rgba(148, 163, 184, 0.3)',
  color: '#e2e8f0',
  fontSize: '12px',
  maxWidth: '280px',
  backdropFilter: 'blur(8px)',
};

const commandItemStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '4px 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Voice indicator showing current recognition state
 */
interface VoiceIndicatorProps {
  state: IndicatorState;
  isListening: boolean;
  onToggle: () => void;
  onHelpClick: () => void;
  error: string | null;
}

const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
  state,
  isListening,
  onToggle,
  onHelpClick,
  error,
}) => {
  const getStateColor = (): string => {
    switch (state) {
      case 'listening':
        return '#10b981'; // Green
      case 'processing':
        return '#f59e0b'; // Amber
      case 'error':
        return '#ef4444'; // Red
      case 'not_supported':
        return '#6b7280'; // Gray
      default:
        return '#6b7280'; // Gray
    }
  };

  const getStateText = (): string => {
    switch (state) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'error':
        return error || 'Error';
      case 'not_supported':
        return 'Not Supported';
      default:
        return 'Voice Off';
    }
  };

  const pulseAnimation = state === 'listening' ? {
    animation: 'pulse 1.5s ease-in-out infinite',
  } : {};

  return (
    <div style={indicatorContainerStyles}>
      {/* Microphone button */}
      <button
        onClick={onToggle}
        style={{
          ...buttonStyles,
          backgroundColor: isListening ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
        }}
        title={isListening ? 'Stop listening' : 'Start listening'}
        disabled={state === 'not_supported'}
      >
        {state === 'not_supported' ? (
          <MicrophoneMutedIcon size={20} />
        ) : (
          <MicrophoneIcon isActive={isListening} size={20} />
        )}
      </button>

      {/* Status indicator dot */}
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStateColor(),
          ...pulseAnimation,
        }}
      />

      {/* Status text */}
      <span style={{ flex: 1, minWidth: '80px' }}>
        {getStateText()}
      </span>

      {/* Help button */}
      <button
        onClick={onHelpClick}
        style={buttonStyles}
        title="Show available commands"
      >
        <HelpIcon size={18} />
      </button>

      {/* Pulse animation keyframes */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

/**
 * Command history display
 */
interface CommandHistoryProps {
  commands: ParsedVoiceCommand[];
  maxItems: number;
}

const CommandHistory: React.FC<CommandHistoryProps> = ({ commands, maxItems }) => {
  if (commands.length === 0) return null;

  const recentCommands = commands.slice(-maxItems).reverse();

  return (
    <div style={historyContainerStyles}>
      <div style={{ fontWeight: 500, marginBottom: '6px', color: '#e2e8f0' }}>
        Recent Commands
      </div>
      {recentCommands.map((cmd, index) => (
        <div
          key={cmd.timestamp}
          style={{
            padding: '3px 0',
            opacity: 1 - (index * 0.15),
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            "{cmd.rawTranscript}"
          </span>
          <span style={{ 
            color: cmd.type === 'unknown' ? '#ef4444' : '#10b981',
            fontSize: '11px',
          }}>
            {cmd.type === 'unknown' ? '?' : '✓'}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Help overlay showing available commands
 */
interface HelpOverlayProps {
  onClose: () => void;
}

const HelpOverlay: React.FC<HelpOverlayProps> = ({ onClose }) => {
  const commands = Object.entries(AVAILABLE_COMMANDS);

  return (
    <div style={helpOverlayStyles}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
      }}>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>
          Voice Commands
        </span>
        <button
          onClick={onClose}
          style={{ ...buttonStyles, padding: '4px' }}
          title="Close help"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {commands.map(([command, description]) => (
          <div key={command} style={commandItemStyles}>
            <code style={{ 
              color: '#3b82f6', 
              fontSize: '11px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              padding: '2px 4px',
              borderRadius: '3px',
            }}>
              {command}
            </code>
            <span style={{ 
              color: '#94a3b8', 
              fontSize: '11px',
              textAlign: 'right',
              marginLeft: '8px',
            }}>
              {description}
            </span>
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '10px', 
        paddingTop: '8px', 
        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
        fontSize: '11px',
        color: '#64748b',
      }}>
        Tip: Speak clearly and wait for the indicator to turn green before speaking.
      </div>
    </div>
  );
};

/**
 * Permission request overlay
 */
interface PermissionOverlayProps {
  onRequestPermission: () => void;
  error: string | null;
}

const PermissionOverlay: React.FC<PermissionOverlayProps> = ({ 
  onRequestPermission, 
  error 
}) => (
  <div style={{
    ...indicatorContainerStyles,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <MicrophoneMutedIcon size={20} />
      <span>Microphone access required</span>
    </div>
    {error && (
      <div style={{ color: '#ef4444', fontSize: '12px' }}>
        {error}
      </div>
    )}
    <button
      onClick={onRequestPermission}
      style={{
        padding: '6px 12px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        width: '100%',
      }}
    >
      Grant Permission
    </button>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * VoiceCommands - Voice command UI component for VR hands-free operation
 * 
 * Provides visual feedback for voice recognition state and integrates
 * with the graph visualization for node selection and camera control.
 * 
 * @example
 * ```tsx
 * <VoiceCommands
 *   onSelectNode={(name) => selectNodeByName(name)}
 *   onZoomIn={() => camera.zoomIn()}
 *   onZoomOut={() => camera.zoomOut()}
 *   onResetView={() => camera.reset()}
 *   position="top-right"
 * />
 * ```
 */
export const VoiceCommands: React.FC<VoiceCommandsProps> = ({
  enabled = true,
  onSelectNode,
  onZoomIn,
  onZoomOut,
  onResetView,
  onShowNodeType,
  onHideNodeType,
  showHelpInitially = false,
  showHistory = true,
  maxHistoryItems = 5,
  position = 'top-right',
  config,
  className,
  style,
}) => {
  const [showHelp, setShowHelp] = useState(showHelpInitially);

  // Voice command callbacks
  const callbacks: VoiceCommandCallbacks = useMemo(() => ({
    onSelectNode,
    onZoomIn,
    onZoomOut,
    onResetView,
    onShowNodeType,
    onHideNodeType,
    onHelp: () => setShowHelp(true),
    onCommand: (cmd) => {
      console.log('[VoiceCommands] Command received:', cmd);
    },
  }), [onSelectNode, onZoomIn, onZoomOut, onResetView, onShowNodeType, onHideNodeType]);

  // Use voice commands hook
  const {
    state,
    isSupported,
    isListening,
    commandHistory,
    error,
    hasPermission,
    startListening,
    // stopListening is available but we use toggleListening for the UI
    stopListening: _stopListening,
    toggleListening,
    requestPermission,
  } = useVoiceCommands(callbacks, config);

  // Map state to indicator state
  const indicatorState: IndicatorState = useMemo(() => {
    if (!isSupported) return 'not_supported';
    if (state === 'error') return 'error';
    if (state === 'processing') return 'processing';
    if (state === 'listening') return 'listening';
    return 'idle';
  }, [isSupported, state]);

  // Handle toggle
  const handleToggle = useCallback(async () => {
    await toggleListening();
  }, [toggleListening]);

  // Handle help toggle
  const handleHelpToggle = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  // Handle permission request
  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      await startListening();
    }
  }, [requestPermission, startListening]);

  // Don't render if disabled
  if (!enabled) return null;

  // Position styles
  const positionStyles = getPositionStyles(position);

  return (
    <div
      className={className}
      style={{
        ...positionStyles,
        ...containerStyles,
        ...style,
      }}
      data-testid="voice-commands"
    >
      {/* Show permission request if needed */}
      {hasPermission === false && (
        <PermissionOverlay
          onRequestPermission={handleRequestPermission}
          error={error}
        />
      )}

      {/* Main voice indicator */}
      {hasPermission !== false && (
        <VoiceIndicator
          state={indicatorState}
          isListening={isListening}
          onToggle={handleToggle}
          onHelpClick={handleHelpToggle}
          error={error}
        />
      )}

      {/* Command history */}
      {showHistory && hasPermission !== false && (
        <CommandHistory
          commands={commandHistory}
          maxItems={maxHistoryItems}
        />
      )}

      {/* Help overlay */}
      {showHelp && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
};

export default VoiceCommands;

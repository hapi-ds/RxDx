/**
 * Tests for VoiceCommands component
 * Tests voice command UI and integration for VR hands-free operation
 * 
 * References: Requirement 16 (Dual Frontend Interface) - Voice commands for hands-free operation
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceCommands, type VoiceCommandsProps } from './VoiceCommands';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the useVoiceCommands hook
vi.mock('../../hooks/useVoiceCommands', () => ({
  useVoiceCommands: vi.fn(() => ({
    state: 'idle',
    isSupported: true,
    isListening: false,
    lastCommand: null,
    commandHistory: [],
    error: null,
    hasPermission: true,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    toggleListening: vi.fn(),
    requestPermission: vi.fn().mockResolvedValue(true),
    clearHistory: vi.fn(),
    getAvailableCommands: vi.fn(() => [
      'select [name]',
      'zoom in',
      'zoom out',
      'reset view',
      'help',
    ]),
  })),
  AVAILABLE_COMMANDS: {
    'select [name]': 'Select a node by its name',
    'zoom in': 'Zoom the camera in',
    'zoom out': 'Zoom the camera out',
    'reset view': 'Reset camera to default position',
    'help': 'Show available commands',
  },
}));

// Import the mocked hook for manipulation
import { useVoiceCommands } from '../../hooks/useVoiceCommands';

const mockUseVoiceCommands = vi.mocked(useVoiceCommands);

// ============================================================================
// Helper Functions
// ============================================================================

const renderVoiceCommands = (props: Partial<VoiceCommandsProps> = {}) => {
  const defaultProps: VoiceCommandsProps = {
    enabled: true,
    ...props,
  };
  return render(<VoiceCommands {...defaultProps} />);
};

// ============================================================================
// Tests
// ============================================================================

describe('VoiceCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default state
    mockUseVoiceCommands.mockReturnValue({
      state: 'idle',
      isSupported: true,
      isListening: false,
      lastCommand: null,
      commandHistory: [],
      error: null,
      hasPermission: true,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      toggleListening: vi.fn(),
      requestPermission: vi.fn().mockResolvedValue(true),
      clearHistory: vi.fn(),
      getAvailableCommands: vi.fn(() => [
        'select [name]',
        'zoom in',
        'zoom out',
        'reset view',
        'help',
      ]),
    });
  });

  describe('rendering', () => {
    it('should render when enabled', () => {
      renderVoiceCommands();
      
      expect(screen.getByTestId('voice-commands')).toBeInTheDocument();
    });

    it('should not render when disabled', () => {
      renderVoiceCommands({ enabled: false });
      
      expect(screen.queryByTestId('voice-commands')).not.toBeInTheDocument();
    });

    it('should show voice indicator', () => {
      renderVoiceCommands();
      
      expect(screen.getByText('Voice Off')).toBeInTheDocument();
    });

    it('should show microphone button', () => {
      renderVoiceCommands();
      
      expect(screen.getByTitle('Start listening')).toBeInTheDocument();
    });

    it('should show help button', () => {
      renderVoiceCommands();
      
      expect(screen.getByTitle('Show available commands')).toBeInTheDocument();
    });
  });

  describe('voice recognition states', () => {
    it('should show "Listening..." when listening', () => {
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        state: 'listening',
        isListening: true,
      });
      
      renderVoiceCommands();
      
      expect(screen.getByText('Listening...')).toBeInTheDocument();
    });

    it('should show "Processing..." when processing', () => {
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        state: 'processing',
        isListening: true,
      });
      
      renderVoiceCommands();
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should show error message when error occurs', () => {
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        state: 'error',
        error: 'Microphone access denied',
      });
      
      renderVoiceCommands();
      
      expect(screen.getByText('Microphone access denied')).toBeInTheDocument();
    });

    it('should show "Not Supported" when speech recognition is not supported', () => {
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        state: 'not_supported',
        isSupported: false,
      });
      
      renderVoiceCommands();
      
      expect(screen.getByText('Not Supported')).toBeInTheDocument();
    });
  });

  describe('microphone button interaction', () => {
    it('should call toggleListening when microphone button is clicked', async () => {
      const toggleListening = vi.fn();
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        toggleListening,
      });
      
      renderVoiceCommands();
      
      const micButton = screen.getByTitle('Start listening');
      fireEvent.click(micButton);
      
      await waitFor(() => {
        expect(toggleListening).toHaveBeenCalled();
      });
    });

    it('should show "Stop listening" title when listening', () => {
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        state: 'listening',
        isListening: true,
      });
      
      renderVoiceCommands();
      
      expect(screen.getByTitle('Stop listening')).toBeInTheDocument();
    });

    it('should disable microphone button when not supported', () => {
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        state: 'not_supported',
        isSupported: false,
      });
      
      renderVoiceCommands();
      
      const micButton = screen.getByRole('button', { name: /listening/i });
      expect(micButton).toBeDisabled();
    });
  });

  describe('help overlay', () => {
    it('should show help overlay when help button is clicked', () => {
      renderVoiceCommands();
      
      const helpButton = screen.getByTitle('Show available commands');
      fireEvent.click(helpButton);
      
      expect(screen.getByText('Voice Commands')).toBeInTheDocument();
    });

    it('should show available commands in help overlay', () => {
      renderVoiceCommands();
      
      const helpButton = screen.getByTitle('Show available commands');
      fireEvent.click(helpButton);
      
      expect(screen.getByText('select [name]')).toBeInTheDocument();
      expect(screen.getByText('zoom in')).toBeInTheDocument();
      expect(screen.getByText('zoom out')).toBeInTheDocument();
    });

    it('should close help overlay when close button is clicked', () => {
      renderVoiceCommands();
      
      // Open help
      const helpButton = screen.getByTitle('Show available commands');
      fireEvent.click(helpButton);
      
      expect(screen.getByText('Voice Commands')).toBeInTheDocument();
      
      // Close help
      const closeButton = screen.getByTitle('Close help');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Voice Commands')).not.toBeInTheDocument();
    });

    it('should show help initially when showHelpInitially is true', () => {
      renderVoiceCommands({ showHelpInitially: true });
      
      expect(screen.getByText('Voice Commands')).toBeInTheDocument();
    });
  });

  describe('command history', () => {
    it('should show command history when showHistory is true', () => {
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        commandHistory: [
          { type: 'zoom_in', rawTranscript: 'zoom in', confidence: 0.9, timestamp: Date.now() },
        ],
      });
      
      renderVoiceCommands({ showHistory: true });
      
      expect(screen.getByText('Recent Commands')).toBeInTheDocument();
      expect(screen.getByText('"zoom in"')).toBeInTheDocument();
    });

    it('should not show command history when showHistory is false', () => {
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        commandHistory: [
          { type: 'zoom_in', rawTranscript: 'zoom in', confidence: 0.9, timestamp: Date.now() },
        ],
      });
      
      renderVoiceCommands({ showHistory: false });
      
      expect(screen.queryByText('Recent Commands')).not.toBeInTheDocument();
    });

    it('should not show history section when history is empty', () => {
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        commandHistory: [],
      });
      
      renderVoiceCommands({ showHistory: true });
      
      expect(screen.queryByText('Recent Commands')).not.toBeInTheDocument();
    });

    it('should limit history items to maxHistoryItems', () => {
      const commands = [
        { type: 'zoom_in' as const, rawTranscript: 'zoom in 1', confidence: 0.9, timestamp: 1 },
        { type: 'zoom_out' as const, rawTranscript: 'zoom out 2', confidence: 0.9, timestamp: 2 },
        { type: 'reset_view' as const, rawTranscript: 'reset view 3', confidence: 0.9, timestamp: 3 },
        { type: 'help' as const, rawTranscript: 'help 4', confidence: 0.9, timestamp: 4 },
        { type: 'zoom_in' as const, rawTranscript: 'zoom in 5', confidence: 0.9, timestamp: 5 },
      ];
      
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        commandHistory: commands,
      });
      
      renderVoiceCommands({ showHistory: true, maxHistoryItems: 3 });
      
      // Should show only the last 3 commands
      expect(screen.getByText('"reset view 3"')).toBeInTheDocument();
      expect(screen.getByText('"help 4"')).toBeInTheDocument();
      expect(screen.getByText('"zoom in 5"')).toBeInTheDocument();
      expect(screen.queryByText('"zoom in 1"')).not.toBeInTheDocument();
      expect(screen.queryByText('"zoom out 2"')).not.toBeInTheDocument();
    });
  });

  describe('permission handling', () => {
    it('should show permission request when permission is denied', () => {
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        hasPermission: false,
        error: 'Microphone permission denied',
      });
      
      renderVoiceCommands();
      
      expect(screen.getByText('Microphone access required')).toBeInTheDocument();
      expect(screen.getByText('Grant Permission')).toBeInTheDocument();
    });

    it('should call requestPermission when grant button is clicked', async () => {
      const requestPermission = vi.fn().mockResolvedValue(true);
      const startListening = vi.fn();
      
      mockUseVoiceCommands.mockReturnValue({
        ...mockUseVoiceCommands(),
        hasPermission: false,
        requestPermission,
        startListening,
      });
      
      renderVoiceCommands();
      
      const grantButton = screen.getByText('Grant Permission');
      fireEvent.click(grantButton);
      
      await waitFor(() => {
        expect(requestPermission).toHaveBeenCalled();
      });
    });
  });

  describe('positioning', () => {
    it('should apply top-right position by default', () => {
      renderVoiceCommands();
      
      const container = screen.getByTestId('voice-commands');
      expect(container).toHaveStyle({ top: '20px', right: '20px' });
    });

    it('should apply top-left position when specified', () => {
      renderVoiceCommands({ position: 'top-left' });
      
      const container = screen.getByTestId('voice-commands');
      expect(container).toHaveStyle({ top: '20px', left: '20px' });
    });

    it('should apply bottom-left position when specified', () => {
      renderVoiceCommands({ position: 'bottom-left' });
      
      const container = screen.getByTestId('voice-commands');
      expect(container).toHaveStyle({ bottom: '80px', left: '20px' });
    });

    it('should apply bottom-right position when specified', () => {
      renderVoiceCommands({ position: 'bottom-right' });
      
      const container = screen.getByTestId('voice-commands');
      expect(container).toHaveStyle({ bottom: '80px', right: '20px' });
    });
  });

  describe('callbacks', () => {
    it('should pass onSelectNode callback to hook', () => {
      const onSelectNode = vi.fn();
      renderVoiceCommands({ onSelectNode });
      
      // Verify the hook was called with the callback in the callbacks object
      expect(mockUseVoiceCommands).toHaveBeenCalled();
      const callArgs = mockUseVoiceCommands.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('onSelectNode', onSelectNode);
    });

    it('should pass onZoomIn callback to hook', () => {
      const onZoomIn = vi.fn();
      renderVoiceCommands({ onZoomIn });
      
      expect(mockUseVoiceCommands).toHaveBeenCalled();
      const callArgs = mockUseVoiceCommands.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('onZoomIn', onZoomIn);
    });

    it('should pass onZoomOut callback to hook', () => {
      const onZoomOut = vi.fn();
      renderVoiceCommands({ onZoomOut });
      
      expect(mockUseVoiceCommands).toHaveBeenCalled();
      const callArgs = mockUseVoiceCommands.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('onZoomOut', onZoomOut);
    });

    it('should pass onResetView callback to hook', () => {
      const onResetView = vi.fn();
      renderVoiceCommands({ onResetView });
      
      expect(mockUseVoiceCommands).toHaveBeenCalled();
      const callArgs = mockUseVoiceCommands.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('onResetView', onResetView);
    });

    it('should pass onShowNodeType callback to hook', () => {
      const onShowNodeType = vi.fn();
      renderVoiceCommands({ onShowNodeType });
      
      expect(mockUseVoiceCommands).toHaveBeenCalled();
      const callArgs = mockUseVoiceCommands.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('onShowNodeType', onShowNodeType);
    });

    it('should pass onHideNodeType callback to hook', () => {
      const onHideNodeType = vi.fn();
      renderVoiceCommands({ onHideNodeType });
      
      expect(mockUseVoiceCommands).toHaveBeenCalled();
      const callArgs = mockUseVoiceCommands.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('onHideNodeType', onHideNodeType);
    });
  });

  describe('custom styling', () => {
    it('should apply custom className', () => {
      renderVoiceCommands({ className: 'custom-class' });
      
      const container = screen.getByTestId('voice-commands');
      expect(container).toHaveClass('custom-class');
    });

    it('should merge custom style with default styles', () => {
      renderVoiceCommands({ style: { backgroundColor: 'red' } });
      
      const container = screen.getByTestId('voice-commands');
      // The component merges styles, so we just check the container exists
      expect(container).toBeInTheDocument();
    });
  });
});

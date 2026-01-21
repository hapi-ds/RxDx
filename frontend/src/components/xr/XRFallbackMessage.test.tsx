/**
 * Unit tests for XRFallbackMessage component
 * Tests graceful degradation scenarios for non-XR devices
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { XRFallbackMessage, type XRUnavailableReason } from './XRFallbackMessage';

describe('XRFallbackMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering States', () => {
    it('renders when show is true', () => {
      render(<XRFallbackMessage show={true} reason="webxr-not-supported" />);
      
      expect(screen.getByTestId('xr-fallback-message')).toBeInTheDocument();
    });

    it('does not render when show is false', () => {
      render(<XRFallbackMessage show={false} reason="webxr-not-supported" />);
      
      expect(screen.queryByTestId('xr-fallback-message')).not.toBeInTheDocument();
    });

    it('has correct role and aria-live attributes', () => {
      render(<XRFallbackMessage show={true} reason="webxr-not-supported" />);
      
      const message = screen.getByTestId('xr-fallback-message');
      expect(message).toHaveAttribute('role', 'alert');
      expect(message).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Reason Messages', () => {
    const reasonTests: Array<{ reason: XRUnavailableReason; expectedTitle: string }> = [
      { reason: 'webxr-not-supported', expectedTitle: 'WebXR Not Supported' },
      { reason: 'vr-not-supported', expectedTitle: 'VR Not Available' },
      { reason: 'ar-not-supported', expectedTitle: 'AR Not Available' },
      { reason: 'no-xr-device', expectedTitle: 'No XR Device Detected' },
      { reason: 'insecure-context', expectedTitle: 'Secure Connection Required' },
      { reason: 'permission-denied', expectedTitle: 'Permission Denied' },
      { reason: 'session-error', expectedTitle: 'XR Session Error' },
      { reason: 'unknown', expectedTitle: 'XR Unavailable' },
    ];

    reasonTests.forEach(({ reason, expectedTitle }) => {
      it(`displays correct title for reason: ${reason}`, () => {
        render(<XRFallbackMessage show={true} reason={reason} />);
        
        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      });
    });

    it('displays custom message when provided', () => {
      const customMessage = 'This is a custom error message';
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          customMessage={customMessage} 
        />
      );
      
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('Partial XR Support Messages', () => {
    it('shows AR available message when VR is not supported but AR is', () => {
      render(
        <XRFallbackMessage 
          show={true} 
          reason="vr-not-supported" 
          isARSupported={true}
          isVRSupported={false}
        />
      );
      
      expect(screen.getByText(/AR is available on this device/i)).toBeInTheDocument();
    });

    it('shows VR available message when AR is not supported but VR is', () => {
      render(
        <XRFallbackMessage 
          show={true} 
          reason="ar-not-supported" 
          isVRSupported={true}
          isARSupported={false}
        />
      );
      
      expect(screen.getByText(/VR is available on this device/i)).toBeInTheDocument();
    });

    it('does not show partial support message when neither is supported', () => {
      render(
        <XRFallbackMessage 
          show={true} 
          reason="webxr-not-supported" 
          isVRSupported={false}
          isARSupported={false}
        />
      );
      
      expect(screen.queryByText(/is available on this device/i)).not.toBeInTheDocument();
    });
  });

  describe('Dismissible Behavior', () => {
    it('shows close button when dismissible is true', () => {
      render(<XRFallbackMessage show={true} reason="unknown" dismissible={true} />);
      
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('hides close button when dismissible is false', () => {
      render(<XRFallbackMessage show={true} reason="unknown" dismissible={false} />);
      
      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    it('calls onDismiss when close button is clicked', async () => {
      const onDismiss = vi.fn();
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          dismissible={true}
          onDismiss={onDismiss}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(closeButton);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('hides message after dismiss', async () => {
      const onDismiss = vi.fn();
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          dismissible={true}
          onDismiss={onDismiss}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('xr-fallback-message')).not.toBeInTheDocument();
    });
  });

  describe('Auto-Dismiss', () => {
    it('auto-dismisses after specified time', async () => {
      const onDismiss = vi.fn();
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          autoDismissMs={5000}
          onDismiss={onDismiss}
        />
      );
      
      expect(screen.getByTestId('xr-fallback-message')).toBeInTheDocument();
      
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not auto-dismiss when autoDismissMs is 0', () => {
      const onDismiss = vi.fn();
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          autoDismissMs={0}
          onDismiss={onDismiss}
        />
      );
      
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      expect(onDismiss).not.toHaveBeenCalled();
      expect(screen.getByTestId('xr-fallback-message')).toBeInTheDocument();
    });
  });

  describe('Alternative Navigation Instructions', () => {
    it('shows alternative navigation section when showAlternatives is true', () => {
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          showAlternatives={true}
        />
      );
      
      expect(screen.getByText(/Alternative Navigation/i)).toBeInTheDocument();
    });

    it('hides alternative navigation section when showAlternatives is false', () => {
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          showAlternatives={false}
        />
      );
      
      expect(screen.queryByText(/Alternative Navigation/i)).not.toBeInTheDocument();
    });

    it('expands alternative instructions on click', async () => {
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          showAlternatives={true}
        />
      );
      
      const expandButton = screen.getByText(/Alternative Navigation/i);
      fireEvent.click(expandButton);
      
      // Check that instructions are visible
      expect(screen.getByText(/Use mouse to rotate/i)).toBeInTheDocument();
    });

    it('collapses alternative instructions on second click', async () => {
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          showAlternatives={true}
        />
      );
      
      const expandButton = screen.getByText(/Alternative Navigation/i);
      
      // Expand
      fireEvent.click(expandButton);
      expect(screen.getByText(/Use mouse to rotate/i)).toBeInTheDocument();
      
      // Collapse
      fireEvent.click(expandButton);
      expect(screen.queryByText(/Use mouse to rotate/i)).not.toBeInTheDocument();
    });

    it('supports keyboard navigation for expand/collapse', async () => {
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          showAlternatives={true}
        />
      );
      
      const expandButton = screen.getByText(/Alternative Navigation/i);
      expandButton.focus();
      
      // Press Enter to expand
      fireEvent.keyDown(expandButton, { key: 'Enter' });
      expect(screen.getByText(/Use mouse to rotate/i)).toBeInTheDocument();
      
      // Press Space to collapse
      fireEvent.keyDown(expandButton, { key: ' ' });
      expect(screen.queryByText(/Use mouse to rotate/i)).not.toBeInTheDocument();
    });
  });

  describe('Position Variants', () => {
    it('renders with top position', () => {
      render(<XRFallbackMessage show={true} reason="unknown" position="top" />);
      
      const message = screen.getByTestId('xr-fallback-message');
      expect(message).toHaveStyle({ top: '20px' });
    });

    it('renders with bottom position', () => {
      render(<XRFallbackMessage show={true} reason="unknown" position="bottom" />);
      
      const message = screen.getByTestId('xr-fallback-message');
      expect(message).toHaveStyle({ bottom: '80px' });
    });

    it('renders with center position', () => {
      render(<XRFallbackMessage show={true} reason="unknown" position="center" />);
      
      const message = screen.getByTestId('xr-fallback-message');
      expect(message).toHaveStyle({ top: '50%' });
    });
  });

  describe('Size Variants', () => {
    it('renders with small size', () => {
      render(<XRFallbackMessage show={true} reason="unknown" size="sm" />);
      
      const message = screen.getByTestId('xr-fallback-message');
      expect(message).toHaveStyle({ fontSize: '12px' });
    });

    it('renders with medium size (default)', () => {
      render(<XRFallbackMessage show={true} reason="unknown" size="md" />);
      
      const message = screen.getByTestId('xr-fallback-message');
      expect(message).toHaveStyle({ fontSize: '13px' });
    });

    it('renders with large size', () => {
      render(<XRFallbackMessage show={true} reason="unknown" size="lg" />);
      
      const message = screen.getByTestId('xr-fallback-message');
      expect(message).toHaveStyle({ fontSize: '14px' });
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          className="custom-class" 
        />
      );
      
      const message = screen.getByTestId('xr-fallback-message');
      expect(message).toHaveClass('custom-class');
      expect(message).toHaveClass('xr-fallback-message');
    });

    it('applies custom style', () => {
      render(
        <XRFallbackMessage 
          show={true} 
          reason="unknown" 
          style={{ marginTop: '30px' }} 
        />
      );
      
      const message = screen.getByTestId('xr-fallback-message');
      expect(message).toHaveStyle({ marginTop: '30px' });
    });
  });

  describe('Visibility Updates', () => {
    it('updates visibility when show prop changes', () => {
      const { rerender } = render(
        <XRFallbackMessage show={true} reason="unknown" />
      );
      
      expect(screen.getByTestId('xr-fallback-message')).toBeInTheDocument();
      
      rerender(<XRFallbackMessage show={false} reason="unknown" />);
      
      expect(screen.queryByTestId('xr-fallback-message')).not.toBeInTheDocument();
    });

    it('shows message again when show changes from false to true', () => {
      const { rerender } = render(
        <XRFallbackMessage show={false} reason="unknown" />
      );
      
      expect(screen.queryByTestId('xr-fallback-message')).not.toBeInTheDocument();
      
      rerender(<XRFallbackMessage show={true} reason="unknown" />);
      
      expect(screen.getByTestId('xr-fallback-message')).toBeInTheDocument();
    });
  });
});

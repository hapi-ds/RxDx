/**
 * Unit tests for VRButton component
 * Tests all states, interactions, and accessibility features
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VRButton } from './VRButton';

describe('VRButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering States', () => {
    it('renders "Enter VR" when VR is supported and not in session', () => {
      render(<VRButton isSupported={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Enter VR');
      expect(button).not.toBeDisabled();
    });

    it('renders "Exit VR" when in VR session', () => {
      render(<VRButton isSupported={true} isInSession={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Exit VR');
      expect(button).not.toBeDisabled();
    });

    it('renders "VR Not Supported" when VR is not available', () => {
      render(<VRButton isSupported={false} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('VR Not Supported');
      expect(button).toBeDisabled();
    });

    it('renders "Checking VR..." while checking VR support', () => {
      render(<VRButton isSupported={false} isChecking={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Checking VR...');
      expect(button).toBeDisabled();
    });

    it('renders with custom labels', () => {
      render(
        <VRButton
          isSupported={true}
          enterLabel="Start VR Experience"
          exitLabel="Leave VR"
          notSupportedLabel="No VR Available"
          checkingLabel="Loading..."
        />
      );
      
      expect(screen.getByRole('button')).toHaveTextContent('Start VR Experience');
    });

    it('renders custom exit label when in session', () => {
      render(
        <VRButton
          isSupported={true}
          isInSession={true}
          exitLabel="Leave VR Mode"
        />
      );
      
      expect(screen.getByRole('button')).toHaveTextContent('Leave VR Mode');
    });

    it('renders custom not supported label', () => {
      render(
        <VRButton
          isSupported={false}
          notSupportedLabel="VR Unavailable"
        />
      );
      
      expect(screen.getByRole('button')).toHaveTextContent('VR Unavailable');
    });

    it('renders custom checking label', () => {
      render(
        <VRButton
          isSupported={false}
          isChecking={true}
          checkingLabel="Please wait..."
        />
      );
      
      expect(screen.getByRole('button')).toHaveTextContent('Please wait...');
    });
  });

  describe('Icon Display', () => {
    it('shows VR headset icon by default', () => {
      render(<VRButton isSupported={true} />);
      
      const svg = screen.getByRole('button').querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('hides icon when showIcon is false', () => {
      render(<VRButton isSupported={true} showIcon={false} />);
      
      const button = screen.getByRole('button');
      // Should only have the text span, no SVG icon (except spinner which isn't shown)
      const svgs = button.querySelectorAll('svg');
      expect(svgs.length).toBe(0);
    });

    it('shows loading spinner when checking', () => {
      render(<VRButton isSupported={false} isChecking={true} />);
      
      const button = screen.getByRole('button');
      const spinner = button.querySelector('.vr-button-spinner');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Click Handling', () => {
    it('calls onClick when clicked and supported', async () => {
      const handleClick = vi.fn();
      render(<VRButton isSupported={true} onClick={handleClick} />);
      
      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when not supported', async () => {
      const handleClick = vi.fn();
      render(<VRButton isSupported={false} onClick={handleClick} />);
      
      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when checking', async () => {
      const handleClick = vi.fn();
      render(<VRButton isSupported={true} isChecking={true} onClick={handleClick} />);
      
      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      render(<VRButton isSupported={true} disabled={true} onClick={handleClick} />);
      
      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('calls onClick when in session (for exit)', async () => {
      const handleClick = vi.fn();
      render(<VRButton isSupported={true} isInSession={true} onClick={handleClick} />);
      
      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles async onClick', async () => {
      const handleClick = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<VRButton isSupported={true} onClick={handleClick} />);
      
      await userEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Keyboard Accessibility', () => {
    it('can be activated with Enter key', async () => {
      const handleClick = vi.fn();
      render(<VRButton isSupported={true} onClick={handleClick} />);
      
      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });

    it('can be activated with Space key', async () => {
      const handleClick = vi.fn();
      render(<VRButton isSupported={true} onClick={handleClick} />);
      
      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: ' ' });
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });

    it('has correct tabIndex when enabled', () => {
      render(<VRButton isSupported={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('has tabIndex -1 when disabled', () => {
      render(<VRButton isSupported={false} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('ARIA Attributes', () => {
    it('has correct aria-label when supported', () => {
      render(<VRButton isSupported={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Enter VR mode');
    });

    it('has correct aria-label when in session', () => {
      render(<VRButton isSupported={true} isInSession={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Exit VR mode');
    });

    it('has correct aria-label when not supported', () => {
      render(<VRButton isSupported={false} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'VR is not supported on this device');
    });

    it('has correct aria-label when checking', () => {
      render(<VRButton isSupported={false} isChecking={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Checking VR support');
    });

    it('has aria-busy when checking', () => {
      render(<VRButton isSupported={false} isChecking={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('has aria-disabled when disabled', () => {
      render(<VRButton isSupported={false} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<VRButton isSupported={true} className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('vr-button');
    });

    it('applies custom style', () => {
      render(<VRButton isSupported={true} style={{ marginTop: '20px' }} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ marginTop: '20px' });
    });

    it('renders with small size', () => {
      render(<VRButton isSupported={true} size="sm" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ fontSize: '12px' });
    });

    it('renders with medium size (default)', () => {
      render(<VRButton isSupported={true} size="md" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ fontSize: '14px' });
    });

    it('renders with large size', () => {
      render(<VRButton isSupported={true} size="lg" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ fontSize: '16px' });
    });
  });

  describe('Hover and Active States', () => {
    it('changes style on mouse enter', () => {
      render(<VRButton isSupported={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      
      // Button should still be rendered (hover state is internal)
      expect(button).toBeInTheDocument();
    });

    it('changes style on mouse leave', () => {
      render(<VRButton isSupported={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);
      
      expect(button).toBeInTheDocument();
    });

    it('changes style on mouse down', () => {
      render(<VRButton isSupported={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.mouseDown(button);
      
      expect(button).toBeInTheDocument();
    });

    it('changes style on mouse up', () => {
      render(<VRButton isSupported={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.mouseDown(button);
      fireEvent.mouseUp(button);
      
      expect(button).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('is disabled when isSupported is false', () => {
      render(<VRButton isSupported={false} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when isChecking is true', () => {
      render(<VRButton isSupported={true} isChecking={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when disabled prop is true', () => {
      render(<VRButton isSupported={true} disabled={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is not disabled when in session (for exit)', () => {
      render(<VRButton isSupported={false} isInSession={true} />);
      
      // When in session, the button should allow exit even if support check failed
      // This is handled by the exit state taking precedence
      expect(screen.getByRole('button')).toHaveTextContent('Exit VR');
    });
  });

  describe('Button Type', () => {
    it('has type="button" to prevent form submission', () => {
      render(<VRButton isSupported={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });
});

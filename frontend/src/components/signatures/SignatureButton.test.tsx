/**
 * SignatureButton component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignatureButton } from './SignatureButton';

describe('SignatureButton', () => {
  const defaultProps = {
    workItemId: 'test-id',
    workItemTitle: 'Test Work Item',
    workItemVersion: '1.0',
    isSigned: false,
    onSign: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unsigned state', () => {
    it('should render sign button when not signed', () => {
      render(<SignatureButton {...defaultProps} />);

      expect(screen.getByText('Sign')).toBeInTheDocument();
    });

    it('should open confirmation modal when clicked', async () => {
      const user = userEvent.setup();
      render(<SignatureButton {...defaultProps} />);

      await user.click(screen.getByText('Sign'));

      expect(screen.getByText('Sign Work Item')).toBeInTheDocument();
      expect(screen.getByText(/You are about to digitally sign/)).toBeInTheDocument();
    });

    it('should show work item details in confirmation modal', async () => {
      const user = userEvent.setup();
      render(<SignatureButton {...defaultProps} />);

      await user.click(screen.getByText('Sign'));

      expect(screen.getByText('Test Work Item')).toBeInTheDocument();
      expect(screen.getByText('v1.0')).toBeInTheDocument();
    });

    it('should call onSign when confirmed', async () => {
      const user = userEvent.setup();
      const onSign = vi.fn().mockResolvedValue(undefined);
      render(<SignatureButton {...defaultProps} onSign={onSign} />);

      await user.click(screen.getByText('Sign'));
      await user.click(screen.getByText('Confirm Signature'));

      await waitFor(() => {
        expect(onSign).toHaveBeenCalledWith('test-id');
      });
    });

    it('should close modal after successful sign', async () => {
      const user = userEvent.setup();
      const onSign = vi.fn().mockResolvedValue(undefined);
      render(<SignatureButton {...defaultProps} onSign={onSign} />);

      await user.click(screen.getByText('Sign'));
      await user.click(screen.getByText('Confirm Signature'));

      await waitFor(() => {
        expect(screen.queryByText('Sign Work Item')).not.toBeInTheDocument();
      });
    });

    it('should show error when sign fails', async () => {
      const user = userEvent.setup();
      const onSign = vi.fn().mockRejectedValue(new Error('Signing failed'));
      render(<SignatureButton {...defaultProps} onSign={onSign} />);

      await user.click(screen.getByText('Sign'));
      await user.click(screen.getByText('Confirm Signature'));

      await waitFor(() => {
        expect(screen.getByText('Signing failed')).toBeInTheDocument();
      });
    });

    it('should close modal when cancelled', async () => {
      const user = userEvent.setup();
      render(<SignatureButton {...defaultProps} />);

      await user.click(screen.getByText('Sign'));
      await user.click(screen.getByText('Cancel'));

      expect(screen.queryByText('Sign Work Item')).not.toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<SignatureButton {...defaultProps} disabled={true} />);

      expect(screen.getByText('Sign').closest('button')).toBeDisabled();
    });
  });

  describe('Signed state', () => {
    it('should show signed status when already signed', () => {
      render(<SignatureButton {...defaultProps} isSigned={true} />);

      expect(screen.getByText('Signed')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should not open modal when signed', () => {
      render(<SignatureButton {...defaultProps} isSigned={true} />);

      // There's no button to click, so we verify the signed state is shown
      expect(screen.getByText('Signed')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show loading state during signing', async () => {
      const user = userEvent.setup();
      let resolveSign: () => void;
      const onSign = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => { resolveSign = resolve; })
      );
      
      render(<SignatureButton {...defaultProps} onSign={onSign} />);

      await user.click(screen.getByText('Sign'));
      await user.click(screen.getByText('Confirm Signature'));

      // Button should be in loading state
      expect(screen.getByText('Confirm Signature').closest('button')).toBeDisabled();

      // Resolve the promise
      resolveSign!();
    });
  });
});

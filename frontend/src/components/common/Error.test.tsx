/**
 * Unit tests for Error components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage, ErrorBoundaryFallback, EmptyState } from './Error';

describe('ErrorMessage', () => {
  describe('inline variant', () => {
    it('renders error message', () => {
      render(<ErrorMessage message="Something went wrong" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('has alert role', () => {
      render(<ErrorMessage message="Error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('banner variant', () => {
    it('renders error message', () => {
      render(<ErrorMessage message="Error occurred" variant="banner" />);
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(<ErrorMessage message="Details" variant="banner" title="Error" />);
      expect(screen.getByText('Error:')).toBeInTheDocument();
    });

    it('shows retry button when onRetry is provided', () => {
      const handleRetry = vi.fn();
      render(<ErrorMessage message="Error" variant="banner" onRetry={handleRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Retry' });
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('shows dismiss button when onDismiss is provided', () => {
      const handleDismiss = vi.fn();
      render(<ErrorMessage message="Error" variant="banner" onDismiss={handleDismiss} />);
      
      const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
      expect(dismissButton).toBeInTheDocument();
      
      fireEvent.click(dismissButton);
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('page variant', () => {
    it('renders error message', () => {
      render(<ErrorMessage message="Page error" variant="page" />);
      expect(screen.getByText('Page error')).toBeInTheDocument();
    });

    it('renders default title', () => {
      render(<ErrorMessage message="Error" variant="page" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders custom title', () => {
      render(<ErrorMessage message="Error" variant="page" title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('shows Try Again button when onRetry is provided', () => {
      const handleRetry = vi.fn();
      render(<ErrorMessage message="Error" variant="page" onRetry={handleRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Try Again' });
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('shows Go Back button when onDismiss is provided', () => {
      const handleDismiss = vi.fn();
      render(<ErrorMessage message="Error" variant="page" onDismiss={handleDismiss} />);
      
      const backButton = screen.getByRole('button', { name: 'Go Back' });
      expect(backButton).toBeInTheDocument();
      
      fireEvent.click(backButton);
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ErrorBoundaryFallback', () => {
  it('renders error message', () => {
    const error = new Error('Test error message');
    render(<ErrorBoundaryFallback error={error} resetError={() => {}} />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders Application Error title', () => {
    const error = new Error('Error');
    render(<ErrorBoundaryFallback error={error} resetError={() => {}} />);
    expect(screen.getByText('Application Error')).toBeInTheDocument();
  });

  it('calls resetError when Try Again is clicked', () => {
    const handleReset = vi.fn();
    const error = new Error('Error');
    render(<ErrorBoundaryFallback error={error} resetError={handleReset} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('handles error without message', () => {
    const error = new Error();
    render(<ErrorBoundaryFallback error={error} resetError={() => {}} />);
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders message when provided', () => {
    render(<EmptyState title="No items" message="Create your first item" />);
    expect(screen.getByText('Create your first item')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <EmptyState
        title="No items"
        icon={<span data-testid="empty-icon">📭</span>}
      />
    );
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <EmptyState
        title="No items"
        action={<button>Create Item</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<EmptyState title="No items" className="custom-empty" />);
    expect(document.querySelector('.custom-empty')).toBeInTheDocument();
  });
});

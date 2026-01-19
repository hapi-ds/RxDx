/**
 * Unit tests for Loading components
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, LoadingOverlay, Skeleton, SkeletonText, LoadingPage } from './Loading';

describe('Spinner', () => {
  it('renders with default size', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Spinner size="sm" />);
    expect(screen.getByRole('status')).toHaveStyle({ width: '16px' });

    rerender(<Spinner size="lg" />);
    expect(screen.getByRole('status')).toHaveStyle({ width: '40px' });

    rerender(<Spinner size="xl" />);
    expect(screen.getByRole('status')).toHaveStyle({ width: '56px' });
  });

  it('applies custom color', () => {
    render(<Spinner color="#ff0000" />);
    expect(screen.getByRole('status')).toHaveStyle({ borderTopColor: '#ff0000' });
  });

  it('applies custom className', () => {
    render(<Spinner className="custom-spinner" />);
    expect(screen.getByRole('status')).toHaveClass('custom-spinner');
  });
});

describe('LoadingOverlay', () => {
  it('renders children', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows overlay when loading', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('hides overlay when not loading', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('shows custom message', () => {
    render(
      <LoadingOverlay isLoading={true} message="Please wait...">
        <div>Content</div>
      </LoadingOverlay>
    );
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('applies blur class when blur is true', () => {
    render(
      <LoadingOverlay isLoading={true} blur={true}>
        <div>Content</div>
      </LoadingOverlay>
    );
    expect(document.querySelector('.loading-overlay.blur')).toBeInTheDocument();
  });

  it('does not apply blur class when blur is false', () => {
    render(
      <LoadingOverlay isLoading={true} blur={false}>
        <div>Content</div>
      </LoadingOverlay>
    );
    expect(document.querySelector('.loading-overlay.blur')).not.toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('renders with default dimensions', () => {
    render(<Skeleton />);
    const skeleton = document.querySelector('.skeleton');
    expect(skeleton).toHaveStyle({ width: '100%', height: '1rem' });
  });

  it('renders with custom dimensions', () => {
    render(<Skeleton width="200px" height="50px" />);
    const skeleton = document.querySelector('.skeleton');
    expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
  });

  it('renders with custom border radius', () => {
    render(<Skeleton borderRadius="50%" />);
    const skeleton = document.querySelector('.skeleton');
    expect(skeleton).toHaveStyle({ borderRadius: '50%' });
  });

  it('is hidden from screen readers', () => {
    render(<Skeleton />);
    const skeleton = document.querySelector('.skeleton');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SkeletonText', () => {
  it('renders default 3 lines', () => {
    render(<SkeletonText />);
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('renders custom number of lines', () => {
    render(<SkeletonText lines={5} />);
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons).toHaveLength(5);
  });

  it('last line is shorter', () => {
    render(<SkeletonText lines={3} />);
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons[2]).toHaveStyle({ width: '60%' });
  });
});

describe('LoadingPage', () => {
  it('renders with default message', () => {
    render(<LoadingPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingPage message="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('renders spinner', () => {
    render(<LoadingPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

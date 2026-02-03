/**
 * Tests for VersionIndicator component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionIndicator } from './VersionIndicator';

describe('VersionIndicator', () => {
  it('renders version number with v prefix', () => {
    render(<VersionIndicator version="1.0" />);
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });

  it('renders with default size and variant', () => {
    render(<VersionIndicator version="2.3" />);
    const indicator = screen.getByText('v2.3');
    expect(indicator).toHaveClass('version-indicator-md');
    expect(indicator).toHaveClass('version-indicator-default');
  });

  it('renders with small size', () => {
    render(<VersionIndicator version="1.0" size="sm" />);
    const indicator = screen.getByText('v1.0');
    expect(indicator).toHaveClass('version-indicator-sm');
  });

  it('renders with large size', () => {
    render(<VersionIndicator version="1.0" size="lg" />);
    const indicator = screen.getByText('v1.0');
    expect(indicator).toHaveClass('version-indicator-lg');
  });

  it('renders with primary variant', () => {
    render(<VersionIndicator version="1.0" variant="primary" />);
    const indicator = screen.getByText('v1.0');
    expect(indicator).toHaveClass('version-indicator-primary');
  });

  it('renders with success variant', () => {
    render(<VersionIndicator version="1.0" variant="success" />);
    const indicator = screen.getByText('v1.0');
    expect(indicator).toHaveClass('version-indicator-success');
  });

  it('applies custom className', () => {
    render(<VersionIndicator version="1.0" className="custom-class" />);
    const indicator = screen.getByText('v1.0');
    expect(indicator).toHaveClass('custom-class');
  });

  it('includes title attribute with version', () => {
    render(<VersionIndicator version="1.5" />);
    const indicator = screen.getByText('v1.5');
    expect(indicator).toHaveAttribute('title', 'Version 1.5');
  });

  it('renders complex version numbers', () => {
    render(<VersionIndicator version="10.25" />);
    expect(screen.getByText('v10.25')).toBeInTheDocument();
  });

  it('renders with all props combined', () => {
    render(
      <VersionIndicator
        version="3.14"
        size="lg"
        variant="success"
        className="test-class"
      />
    );
    const indicator = screen.getByText('v3.14');
    expect(indicator).toHaveClass('version-indicator-lg');
    expect(indicator).toHaveClass('version-indicator-success');
    expect(indicator).toHaveClass('test-class');
    expect(indicator).toHaveAttribute('title', 'Version 3.14');
  });
});

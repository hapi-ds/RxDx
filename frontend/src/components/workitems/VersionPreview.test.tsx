/**
 * Tests for VersionPreview component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionPreview } from './VersionPreview';

describe('VersionPreview', () => {
  describe('New Item Mode', () => {
    it('should display version 1.0 for new items', () => {
      render(<VersionPreview isNewItem={true} />);
      expect(screen.getByText(/This will create version 1\.0/i)).toBeInTheDocument();
    });

    it('should show creation message for new items', () => {
      render(<VersionPreview isNewItem={true} />);
      const text = screen.getByText(/This will create version/i);
      expect(text).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should calculate next version from current version', () => {
      render(<VersionPreview currentVersion="1.2" isNewItem={false} />);
      expect(screen.getByText(/Saving will create a new version \(1\.3\)/i)).toBeInTheDocument();
    });

    it('should show update message for existing items', () => {
      render(<VersionPreview currentVersion="2.5" isNewItem={false} />);
      expect(screen.getByText(/Saving will create a new version \(2\.6\)/i)).toBeInTheDocument();
    });

    it('should handle version 1.0 correctly', () => {
      render(<VersionPreview currentVersion="1.0" isNewItem={false} />);
      expect(screen.getByText(/Saving will create a new version \(1\.1\)/i)).toBeInTheDocument();
    });

    it('should handle major version increments', () => {
      render(<VersionPreview currentVersion="3.9" isNewItem={false} />);
      expect(screen.getByText(/Saving will create a new version \(3\.10\)/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing currentVersion in edit mode', () => {
      render(<VersionPreview isNewItem={false} />);
      expect(screen.getByText(/Saving will create a new version \(1\.1\)/i)).toBeInTheDocument();
    });

    it('should handle invalid version format', () => {
      render(<VersionPreview currentVersion="invalid" isNewItem={false} />);
      expect(screen.getByText(/Saving will create a new version \(1\.1\)/i)).toBeInTheDocument();
    });

    it('should handle version with too many parts', () => {
      render(<VersionPreview currentVersion="1.2.3" isNewItem={false} />);
      expect(screen.getByText(/Saving will create a new version \(1\.1\)/i)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<VersionPreview isNewItem={true} className="custom-class" />);
      const preview = container.querySelector('.version-preview');
      expect(preview).toHaveClass('custom-class');
    });

    it('should render info icon', () => {
      const { container } = render(<VersionPreview isNewItem={true} />);
      const icon = container.querySelector('.version-preview-icon');
      expect(icon).toBeInTheDocument();
    });
  });
});

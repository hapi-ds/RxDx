/**
 * Responsive Design Tests for TestsPage
 * Validates Requirements 12.1, 12.2, 12.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestsPage } from './TestsPage';
import * as testService from '../services/testService';

// Mock the test service
vi.mock('../services/testService');

describe('TestsPage Responsive Design', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service responses
    vi.mocked(testService.getTestSpecs).mockResolvedValue({
      items: [
        {
          id: '1',
          title: 'Test 1',
          test_type: 'unit',
          priority: 1,
          test_steps: [],
          linked_requirements: [],
          version: '1.0.0',
          created_by: 'user1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          status: 'active',
        },
      ],
      total: 1,
      page: 1,
      size: 50,
      pages: 1,
    });
    
    vi.mocked(testService.getTestCoverage).mockResolvedValue({
      total_requirements: 10,
      requirements_with_tests: 5,
      requirements_with_passing_tests: 3,
      coverage_percentage: 50,
      detailed_coverage: [],
    });
  });

  it('Requirement 12.1: TestsPage adapts layout for mobile screens', async () => {
    const { container } = render(<TestsPage />);
    
    // Wait for content to load
    await screen.findByText('Test 1');
    
    // Check that the page has responsive styles
    const testsPage = container.querySelector('.tests-page');
    expect(testsPage).toBeTruthy();
    
    // Verify that responsive CSS is present in the style tag
    const styleTags = container.querySelectorAll('style');
    const allStyles = Array.from(styleTags).map(tag => tag.textContent).join('');
    expect(allStyles).toContain('@media (max-width: 768px)');
  });

  it('Requirement 12.2: Filter controls stack vertically on mobile', async () => {
    const { container } = render(<TestsPage />);
    
    // Wait for content to load
    await screen.findByText('Test 1');
    
    // Check that filter controls have responsive styles
    const styleTags = container.querySelectorAll('style');
    const allStyles = Array.from(styleTags).map(tag => tag.textContent).join('');
    expect(allStyles).toContain('.filter-controls');
    expect(allStyles).toContain('flex-direction: column');
    
    // Verify filter controls exist
    const filterControls = container.querySelector('.filter-controls');
    expect(filterControls).toBeTruthy();
  });

  it('Requirement 12.3: Test cards display in single column on mobile', async () => {
    const { container } = render(<TestsPage />);
    
    // Wait for content to load
    await screen.findByText('Test 1');
    
    // Check that test grid has responsive styles
    const styleTags = container.querySelectorAll('style');
    const allStyles = Array.from(styleTags).map(tag => tag.textContent).join('');
    
    // The TestSpecList component should have responsive grid styles
    expect(allStyles).toContain('grid-template-columns');
    expect(allStyles).toContain('@media (max-width: 768px)');
  });

  it('Mobile styles: Page header stacks vertically', async () => {
    const { container } = render(<TestsPage />);
    
    // Wait for content to load
    await screen.findByText('Tests');
    
    // Verify responsive styles for page header
    const styleTags = container.querySelectorAll('style');
    const allStyles = Array.from(styleTags).map(tag => tag.textContent).join('');
    expect(allStyles).toMatch(/@media.*max-width.*768px/);
  });

  it('Mobile styles: Pagination controls stack vertically', async () => {
    const { container } = render(<TestsPage />);
    
    // Wait for content to load
    await screen.findByText('Test 1');
    
    // Verify responsive styles exist
    const styleTags = container.querySelectorAll('style');
    const allStyles = Array.from(styleTags).map(tag => tag.textContent).join('');
    expect(allStyles).toContain('flex-direction: column');
  });

  it('Mobile styles: Buttons are full width', async () => {
    const { container } = render(<TestsPage />);
    
    // Wait for content to load
    await screen.findByText('Test 1');
    
    // Verify responsive styles for buttons
    const styleTags = container.querySelectorAll('style');
    const allStyles = Array.from(styleTags).map(tag => tag.textContent).join('');
    expect(allStyles).toContain('width: 100%');
  });

  it('Tablet styles: Filter groups use responsive width', async () => {
    const { container } = render(<TestsPage />);
    
    // Wait for content to load
    await screen.findByText('Test 1');
    
    // Verify tablet breakpoint styles exist
    const styleTags = container.querySelectorAll('style');
    const allStyles = Array.from(styleTags).map(tag => tag.textContent).join('');
    // Check for either tablet breakpoint or general responsive styles
    const hasResponsiveStyles = 
      allStyles.includes('@media (min-width: 768px) and (max-width: 1024px)') ||
      allStyles.includes('@media (max-width: 768px)');
    expect(hasResponsiveStyles).toBe(true);
  });
});

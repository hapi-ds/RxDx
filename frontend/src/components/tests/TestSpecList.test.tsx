/**
 * TestSpecList component tests
 * Tests filtering, sorting, and search functionality
 */


import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestSpecList, type TestSpec } from './TestSpecList';

// Mock test data
const mockTestSpecs: TestSpec[] = [
  {
    id: '1',
    title: 'User Authentication Test',
    description: 'Test user login and authentication flow',
    test_type: 'integration',
    priority: 1,
    status: 'active',
    version: '1.0',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z',
    is_signed: true,
    linked_requirements: ['req-1', 'req-2'],
    test_steps: [
      {
        step_number: 1,
        description: 'Navigate to login page',
        expected_result: 'Login page displayed',
        status: 'pass',
      },
      {
        step_number: 2,
        description: 'Enter credentials',
        expected_result: 'Credentials accepted',
        status: 'pass',
      },
    ],
  },
  {
    id: '2',
    title: 'API Response Validation',
    description: 'Validate API response structure',
    test_type: 'unit',
    priority: 2,
    status: 'completed',
    version: '2.1',
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-18T12:00:00Z',
    is_signed: false,
    linked_requirements: ['req-3'],
    test_steps: [
      {
        step_number: 1,
        description: 'Call API endpoint',
        expected_result: 'Response received',
        status: 'pass',
      },
    ],
  },
  {
    id: '3',
    title: 'System Performance Test',
    description: 'Test system under load',
    test_type: 'system',
    priority: 3,
    status: 'draft',
    version: '1.0',
    created_at: '2024-01-20T14:00:00Z',
    updated_at: '2024-01-20T14:00:00Z',
    is_signed: false,
    linked_requirements: ['req-4', 'req-5', 'req-6'],
    test_steps: [],
  },
  {
    id: '4',
    title: 'Acceptance Criteria Validation',
    description: 'Validate all acceptance criteria',
    test_type: 'acceptance',
    priority: 1,
    status: 'active',
    version: '1.5',
    created_at: '2024-01-12T09:00:00Z',
    updated_at: '2024-01-22T11:00:00Z',
    is_signed: true,
    linked_requirements: ['req-7'],
    test_steps: [
      {
        step_number: 1,
        description: 'Check criteria 1',
        expected_result: 'Criteria met',
        status: 'pass',
      },
      {
        step_number: 2,
        description: 'Check criteria 2',
        expected_result: 'Criteria met',
        status: 'pass',
      },
      {
        step_number: 3,
        description: 'Check criteria 3',
        expected_result: 'Criteria met',
        status: 'pass',
      },
    ],
  },
  {
    id: '5',
    title: 'Regression Test Suite',
    description: 'Run all regression tests',
    test_type: 'regression',
    priority: 4,
    status: 'archived',
    version: '3.0',
    created_at: '2024-01-05T07:00:00Z',
    updated_at: '2024-01-15T16:00:00Z',
    is_signed: false,
    linked_requirements: [],
    test_steps: [],
  },
];

describe('TestSpecList', () => {
  const mockOnTestClick = vi.fn();
  const mockOnViewRuns = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all test specifications', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      expect(screen.getByText('User Authentication Test')).toBeInTheDocument();
      expect(screen.getByText('API Response Validation')).toBeInTheDocument();
      expect(screen.getByText('System Performance Test')).toBeInTheDocument();
      expect(screen.getByText('Acceptance Criteria Validation')).toBeInTheDocument();
      expect(screen.getByText('Regression Test Suite')).toBeInTheDocument();
    });

    it('should display results count', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      expect(screen.getByText(/Showing 5 of 5 test specifications/i)).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <TestSpecList
          testSpecs={[]}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
          isLoading={true}
        />
      );

      expect(screen.getByText(/Loading test specifications/i)).toBeInTheDocument();
    });

    it('should render error message', () => {
      const errorMessage = 'Failed to load tests';
      render(
        <TestSpecList
          testSpecs={[]}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
          error={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should render empty state when no tests', () => {
      render(
        <TestSpecList
          testSpecs={[]}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      expect(screen.getByText(/No Test Specifications/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter tests by search query in title', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search test specifications/i);
      fireEvent.change(searchInput, { target: { value: 'Authentication' } });

      expect(screen.getByText('User Authentication Test')).toBeInTheDocument();
      expect(screen.queryByText('API Response Validation')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 1 of 5 test specifications/i)).toBeInTheDocument();
    });

    it('should filter tests by search query in description', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search test specifications/i);
      fireEvent.change(searchInput, { target: { value: 'API response' } });

      expect(screen.getByText('API Response Validation')).toBeInTheDocument();
      expect(screen.queryByText('User Authentication Test')).not.toBeInTheDocument();
    });

    it('should be case-insensitive', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search test specifications/i);
      fireEvent.change(searchInput, { target: { value: 'AUTHENTICATION' } });

      expect(screen.getByText('User Authentication Test')).toBeInTheDocument();
    });

    it('should show empty state when no matches', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search test specifications/i);
      fireEvent.change(searchInput, { target: { value: 'NonexistentTest' } });

      expect(screen.getByText(/No Matching Tests/i)).toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    it('should filter by test type', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const testTypeSelect = screen.getByLabelText(/Test Type:/i);
      fireEvent.change(testTypeSelect, { target: { value: 'unit' } });

      expect(screen.getByText('API Response Validation')).toBeInTheDocument();
      expect(screen.queryByText('User Authentication Test')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 1 of 5 test specifications/i)).toBeInTheDocument();
    });

    it('should filter by priority', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const prioritySelect = screen.getByLabelText(/Priority:/i);
      fireEvent.change(prioritySelect, { target: { value: '1' } });

      expect(screen.getByText('User Authentication Test')).toBeInTheDocument();
      expect(screen.getByText('Acceptance Criteria Validation')).toBeInTheDocument();
      expect(screen.queryByText('API Response Validation')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 2 of 5 test specifications/i)).toBeInTheDocument();
    });

    it('should filter by status', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const statusSelect = screen.getByLabelText(/Status:/i);
      fireEvent.change(statusSelect, { target: { value: 'active' } });

      expect(screen.getByText('User Authentication Test')).toBeInTheDocument();
      expect(screen.getByText('Acceptance Criteria Validation')).toBeInTheDocument();
      expect(screen.queryByText('API Response Validation')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 2 of 5 test specifications/i)).toBeInTheDocument();
    });

    it('should filter by signature status', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const signedSelect = screen.getByLabelText(/Signature:/i);
      fireEvent.change(signedSelect, { target: { value: 'signed' } });

      expect(screen.getByText('User Authentication Test')).toBeInTheDocument();
      expect(screen.getByText('Acceptance Criteria Validation')).toBeInTheDocument();
      expect(screen.queryByText('API Response Validation')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 2 of 5 test specifications/i)).toBeInTheDocument();
    });

    it('should combine multiple filters', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const testTypeSelect = screen.getByLabelText(/Test Type:/i);
      const statusSelect = screen.getByLabelText(/Status:/i);

      fireEvent.change(testTypeSelect, { target: { value: 'integration' } });
      fireEvent.change(statusSelect, { target: { value: 'active' } });

      expect(screen.getByText('User Authentication Test')).toBeInTheDocument();
      expect(screen.queryByText('API Response Validation')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 1 of 5 test specifications/i)).toBeInTheDocument();
    });

    it('should clear all filters', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const testTypeSelect = screen.getByLabelText(/Test Type:/i);
      const searchInput = screen.getByPlaceholderText(/Search test specifications/i);

      fireEvent.change(testTypeSelect, { target: { value: 'unit' } });
      fireEvent.change(searchInput, { target: { value: 'test' } });

      const clearButtons = screen.getAllByText(/Clear Filters/i);
      fireEvent.click(clearButtons[0]);

      expect(screen.getByText(/Showing 5 of 5 test specifications/i)).toBeInTheDocument();
      expect(searchInput).toHaveValue('');
      expect(testTypeSelect).toHaveValue('all');
    });
  });

  describe('Sort Functionality', () => {
    it('should sort by title ascending', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const titleButton = screen.getByRole('button', { name: /Title/i });
      fireEvent.click(titleButton);

      // Check that the first test card contains the alphabetically first title
      const testCards = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('test-card')
      );
      
      expect(testCards.length).toBeGreaterThan(0);
      expect(within(testCards[0]).getByText('Acceptance Criteria Validation')).toBeInTheDocument();
    });

    it('should toggle sort direction', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const titleButton = screen.getByRole('button', { name: /Title/i });
      fireEvent.click(titleButton); // Ascending
      fireEvent.click(titleButton); // Descending

      const testCards = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('test-card')
      );
      
      expect(testCards.length).toBeGreaterThan(0);
      expect(within(testCards[0]).getByText('User Authentication Test')).toBeInTheDocument();
    });

    it('should sort by priority', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      // Find the sort button specifically (it has class 'sort-button')
      const allButtons = screen.getAllByRole('button');
      const priorityButton = allButtons.find(btn => 
        btn.textContent?.trim().startsWith('Priority') && btn.classList.contains('sort-button')
      );
      
      expect(priorityButton).toBeDefined();
      fireEvent.click(priorityButton!);

      // After sorting, re-query for test cards
      const updatedButtons = screen.getAllByRole('button');
      const testCards = updatedButtons.filter(btn => {
        return btn.classList.contains('test-card');
      });
      
      // Priority 1 (Critical) should be first after sorting
      expect(testCards.length).toBeGreaterThan(0);
      
      // Check that the first card has a Critical priority
      const firstCardText = testCards[0].textContent || '';
      expect(firstCardText).toMatch(/Priority: Critical/i);
    });

    it('should sort by created date', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      // Find the sort button specifically (it has class 'sort-button')
      const allButtons = screen.getAllByRole('button');
      const createdButton = allButtons.find(btn => 
        btn.textContent?.trim().startsWith('Created') && btn.classList.contains('sort-button')
      );
      
      expect(createdButton).toBeDefined();
      fireEvent.click(createdButton!);

      // After sorting, re-query for test cards
      const updatedButtons = screen.getAllByRole('button');
      const testCards = updatedButtons.filter(btn => {
        return btn.classList.contains('test-card');
      });
      
      // Oldest first (Regression Test Suite from 2024-01-05)
      expect(testCards.length).toBeGreaterThan(0);
      
      // Check that the first card is the Regression Test Suite
      const firstCardText = testCards[0].textContent || '';
      expect(firstCardText).toMatch(/Regression Test Suite/i);
    });
  });

  describe('Interaction', () => {
    it('should call onTestClick when card is clicked', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const testCard = screen.getByText('User Authentication Test').closest('[role="button"]');
      fireEvent.click(testCard!);

      expect(mockOnTestClick).toHaveBeenCalledWith(mockTestSpecs[0]);
    });

    it('should call onTestClick when Enter key is pressed', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const testCard = screen.getByText('User Authentication Test').closest('[role="button"]');
      fireEvent.keyDown(testCard!, { key: 'Enter' });

      expect(mockOnTestClick).toHaveBeenCalledWith(mockTestSpecs[0]);
    });

    it('should call onViewRuns when View Runs button is clicked', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      // Find all buttons with class btn (actual button elements)
      const allButtons = screen.getAllByRole('button');
      const viewRunsButton = allButtons.find(btn => 
        btn.textContent?.includes('View Runs') && btn.classList.contains('btn')
      );
      
      expect(viewRunsButton).toBeDefined();
      fireEvent.click(viewRunsButton!);

      // Should be called with some test ID (order depends on default sort)
      expect(mockOnViewRuns).toHaveBeenCalledTimes(1);
      expect(mockOnTestClick).not.toHaveBeenCalled();
    });

    it('should not call onTestClick when View Runs button is clicked', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      // Find all buttons with class btn (actual button elements)
      const allButtons = screen.getAllByRole('button');
      const viewRunsButton = allButtons.find(btn => 
        btn.textContent?.includes('View Runs') && btn.classList.contains('btn')
      );
      
      expect(viewRunsButton).toBeDefined();
      fireEvent.click(viewRunsButton!);

      expect(mockOnTestClick).not.toHaveBeenCalled();
    });
  });

  describe('Display Information', () => {
    it('should display test type badges with correct colors', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const integrationBadge = screen.getByText('integration');
      expect(integrationBadge).toHaveStyle({ backgroundColor: '#3b82f6' });

      const unitBadge = screen.getByText('unit');
      expect(unitBadge).toHaveStyle({ backgroundColor: '#10b981' });
    });

    it('should display signed badge for signed tests', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const signedBadges = screen.getAllByText(/✓ Signed/i);
      expect(signedBadges).toHaveLength(2); // Two signed tests in mock data
    });

    it('should display priority labels correctly', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      expect(screen.getAllByText(/Priority: Critical/i)).toHaveLength(2);
      expect(screen.getByText(/Priority: High/i)).toBeInTheDocument();
      expect(screen.getByText(/Priority: Medium/i)).toBeInTheDocument();
      expect(screen.getByText(/Priority: Low/i)).toBeInTheDocument();
    });

    it('should display test steps count', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      expect(screen.getByText(/Steps: 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Steps: 1/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Steps: 0/i)).toHaveLength(2);
    });

    it('should display linked requirements count', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      expect(screen.getByText(/Requirements: 2/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Requirements: 1/i)).toHaveLength(2);
      expect(screen.getByText(/Requirements: 3/i)).toBeInTheDocument();
      expect(screen.getByText(/Requirements: 0/i)).toBeInTheDocument();
    });

    it('should display version badges', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      // Check for version badges - there are multiple v1.0 badges
      const v10Badges = screen.getAllByText('v1.0');
      expect(v10Badges.length).toBeGreaterThan(0);
      
      expect(screen.getByText('v2.1')).toBeInTheDocument();
      expect(screen.getByText('v1.5')).toBeInTheDocument();
      expect(screen.getByText('v3.0')).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      // Check that dates are formatted (multiple tests have these dates)
      const createdDates = screen.getAllByText(/Created:/i);
      const updatedDates = screen.getAllByText(/Updated:/i);
      
      expect(createdDates.length).toBeGreaterThan(0);
      expect(updatedDates.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      expect(screen.getByLabelText(/Search test specifications/i)).toBeInTheDocument();
    });

    it('should have keyboard navigation support', () => {
      render(
        <TestSpecList
          testSpecs={mockTestSpecs}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
        />
      );

      const testCard = screen.getByText('User Authentication Test').closest('[role="button"]');
      expect(testCard).toHaveAttribute('tabIndex', '0');
    });

    it('should show error with alert role', () => {
      render(
        <TestSpecList
          testSpecs={[]}
          onTestClick={mockOnTestClick}
          onViewRuns={mockOnViewRuns}
          error="Test error"
        />
      );

      const errorBanner = screen.getByRole('alert');
      expect(errorBanner).toBeInTheDocument();
    });
  });
});

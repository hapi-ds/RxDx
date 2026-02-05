/**
 * TemplatesPage Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TemplatesPage } from './TemplatesPage';
import { useTemplateStore } from '../stores/templateStore';
import { useAuthStore } from '../stores/authStore';

// Mock the stores
vi.mock('../stores/templateStore');
vi.mock('../stores/authStore');

describe('TemplatesPage', () => {
  const mockLoadTemplates = vi.fn();
  const mockSelectTemplate = vi.fn();
  const mockValidateTemplate = vi.fn();
  const mockApplyTemplate = vi.fn();
  const mockClearError = vi.fn();
  const mockClearValidation = vi.fn();
  const mockClearApplication = vi.fn();

  const mockTemplates = [
    {
      name: 'default',
      version: '1.0.0',
      author: 'System',
      description: 'Default project template',
    },
    {
      name: 'medical-device',
      version: '1.0.0',
      author: 'System',
      description: 'Medical device project template',
    },
  ];

  const mockSelectedTemplate = {
    metadata: {
      name: 'default',
      version: '1.0.0',
      author: 'System',
      description: 'Default project template',
    },
    users: [{ email: 'user@example.com', full_name: 'Test User', role: 'user' }],
    workitems: {
      requirements: [{ id: '1', title: 'Requirement 1' }],
      tasks: [],
      tests: [],
      risks: [],
      documents: [],
    },
    relationships: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAuthStore
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: '1', email: 'admin@example.com', fullName: 'Admin', role: 'admin' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      isLoading: false,
      error: null,
    });

    // Mock useTemplateStore
    vi.mocked(useTemplateStore).mockReturnValue({
      templates: [],
      selectedTemplate: null,
      validationResult: null,
      applicationResult: null,
      isLoading: false,
      error: null,
      loadTemplates: mockLoadTemplates,
      selectTemplate: mockSelectTemplate,
      validateTemplate: mockValidateTemplate,
      applyTemplate: mockApplyTemplate,
      clearError: mockClearError,
      clearValidation: mockClearValidation,
      clearApplication: mockClearApplication,
      reset: vi.fn(),
    });
  });

  describe('Initial Render', () => {
    it('renders the page title and description', () => {
      render(<TemplatesPage />);
      
      expect(screen.getByText('📋 Templates')).toBeInTheDocument();
      expect(screen.getByText(/Browse and apply project templates/)).toBeInTheDocument();
    });

    it('calls loadTemplates on mount', () => {
      render(<TemplatesPage />);
      
      expect(mockLoadTemplates).toHaveBeenCalledTimes(1);
    });

    it('renders refresh button', () => {
      render(<TemplatesPage />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('Template List', () => {
    it('displays loading state when templates are loading', () => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: [],
        selectedTemplate: null,
        validationResult: null,
        applicationResult: null,
        isLoading: true,
        error: null,
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });

      render(<TemplatesPage />);
      
      expect(screen.getByText('Loading templates...')).toBeInTheDocument();
    });

    it('displays empty state when no templates available', () => {
      render(<TemplatesPage />);
      
      expect(screen.getByText('No templates available')).toBeInTheDocument();
    });

    it('displays template list when templates are loaded', () => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: mockTemplates,
        selectedTemplate: null,
        validationResult: null,
        applicationResult: null,
        isLoading: false,
        error: null,
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });

      render(<TemplatesPage />);
      
      expect(screen.getByText('default')).toBeInTheDocument();
      expect(screen.getByText('medical-device')).toBeInTheDocument();
      expect(screen.getByText('Default project template')).toBeInTheDocument();
    });

    it('calls selectTemplate when template is clicked', async () => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: mockTemplates,
        selectedTemplate: null,
        validationResult: null,
        applicationResult: null,
        isLoading: false,
        error: null,
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });

      render(<TemplatesPage />);
      
      const templateButton = screen.getByRole('button', { name: /default/i });
      fireEvent.click(templateButton);
      
      await waitFor(() => {
        expect(mockSelectTemplate).toHaveBeenCalledWith('default');
      });
    });
  });

  describe('Template Details', () => {
    it('displays placeholder when no template selected', () => {
      render(<TemplatesPage />);
      
      expect(screen.getByText('Select a Template')).toBeInTheDocument();
    });

    it('displays template details when template is selected', () => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: mockTemplates,
        selectedTemplate: mockSelectedTemplate,
        validationResult: null,
        applicationResult: null,
        isLoading: false,
        error: null,
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });

      render(<TemplatesPage />);
      
      expect(screen.getByText('default')).toBeInTheDocument();
      expect(screen.getByText(/Version:/)).toBeInTheDocument();
      expect(screen.getByText(/Author:/)).toBeInTheDocument();
    });

    it('displays template content summary', () => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: mockTemplates,
        selectedTemplate: mockSelectedTemplate,
        validationResult: null,
        applicationResult: null,
        isLoading: false,
        error: null,
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });

      render(<TemplatesPage />);
      
      expect(screen.getByText('Template Contents')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Work Items')).toBeInTheDocument();
      expect(screen.getByText('Relationships')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    beforeEach(() => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: mockTemplates,
        selectedTemplate: mockSelectedTemplate,
        validationResult: null,
        applicationResult: null,
        isLoading: false,
        error: null,
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });
    });

    it('displays validate button', () => {
      render(<TemplatesPage />);
      
      expect(screen.getByRole('button', { name: /validate template/i })).toBeInTheDocument();
    });

    it('calls validateTemplate when validate button is clicked', () => {
      render(<TemplatesPage />);
      
      const validateButton = screen.getByRole('button', { name: /validate template/i });
      fireEvent.click(validateButton);
      
      expect(mockValidateTemplate).toHaveBeenCalledWith('default');
    });

    it('displays admin-only buttons for admin users', () => {
      render(<TemplatesPage />);
      
      expect(screen.getByRole('button', { name: /preview \(dry run\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply template/i })).toBeInTheDocument();
    });

    it('hides admin-only buttons for non-admin users', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: { id: '1', email: 'user@example.com', fullName: 'User', role: 'user' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        clearError: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<TemplatesPage />);
      
      expect(screen.queryByRole('button', { name: /preview \(dry run\)/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /apply template/i })).not.toBeInTheDocument();
    });

    it('displays read-only warning for non-admin users', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: { id: '1', email: 'user@example.com', fullName: 'User', role: 'user' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        clearError: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<TemplatesPage />);
      
      expect(screen.getByText(/Admin role required to apply templates/)).toBeInTheDocument();
    });

    it('calls applyTemplate with dry_run=true when preview button is clicked', () => {
      render(<TemplatesPage />);
      
      const previewButton = screen.getByRole('button', { name: /preview \(dry run\)/i });
      fireEvent.click(previewButton);
      
      expect(mockApplyTemplate).toHaveBeenCalledWith('default', true);
    });
  });

  describe('Validation Results', () => {
    it('displays validation section when validationResult is present and valid', () => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: mockTemplates,
        selectedTemplate: mockSelectedTemplate,
        validationResult: { valid: true, errors: [] },
        applicationResult: null,
        isLoading: false,
        error: null,
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });

      const { container } = render(<TemplatesPage />);
      
      // Trigger validation display by clicking validate button
      const validateButton = screen.getByRole('button', { name: /validate template/i });
      fireEvent.click(validateButton);
      
      // Check that validation results section exists
      const validationSection = container.querySelector('.validation-results');
      expect(validationSection).toBeTruthy();
    });

    it('displays validation errors when present', () => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: mockTemplates,
        selectedTemplate: mockSelectedTemplate,
        validationResult: {
          valid: false,
          errors: [
            { path: 'users[0].email', message: 'Invalid email format', value: 'invalid' },
          ],
        },
        applicationResult: null,
        isLoading: false,
        error: null,
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });

      const { container } = render(<TemplatesPage />);
      
      // Trigger validation display
      const validateButton = screen.getByRole('button', { name: /validate template/i });
      fireEvent.click(validateButton);
      
      // Check that validation errors section exists
      const validationSection = container.querySelector('.validation-results');
      expect(validationSection).toBeTruthy();
    });
  });

  describe('Application Results', () => {
    it('displays application results when present', () => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: mockTemplates,
        selectedTemplate: mockSelectedTemplate,
        validationResult: null,
        applicationResult: {
          success: true,
          dry_run: false,
          created_count: 5,
          skipped_count: 0,
          failed_count: 0,
          entities: [],
        },
        isLoading: false,
        error: null,
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });

      const { container } = render(<TemplatesPage />);
      
      // Trigger application display
      const previewButton = screen.getByRole('button', { name: /preview \(dry run\)/i });
      fireEvent.click(previewButton);
      
      // Check that application results section exists
      const applicationSection = container.querySelector('.application-results');
      expect(applicationSection).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error occurs', () => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: [],
        selectedTemplate: null,
        validationResult: null,
        applicationResult: null,
        isLoading: false,
        error: 'Failed to load templates',
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });

      render(<TemplatesPage />);
      
      expect(screen.getByText('Failed to load templates')).toBeInTheDocument();
    });

    it('calls clearError when error close button is clicked', () => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: [],
        selectedTemplate: null,
        validationResult: null,
        applicationResult: null,
        isLoading: false,
        error: 'Failed to load templates',
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });

      render(<TemplatesPage />);
      
      const closeButton = screen.getByRole('button', { name: '×' });
      fireEvent.click(closeButton);
      
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Confirmation Dialog', () => {
    beforeEach(() => {
      vi.mocked(useTemplateStore).mockReturnValue({
        templates: mockTemplates,
        selectedTemplate: mockSelectedTemplate,
        validationResult: null,
        applicationResult: null,
        isLoading: false,
        error: null,
        loadTemplates: mockLoadTemplates,
        selectTemplate: mockSelectTemplate,
        validateTemplate: mockValidateTemplate,
        applyTemplate: mockApplyTemplate,
        clearError: mockClearError,
        clearValidation: mockClearValidation,
        clearApplication: mockClearApplication,
        reset: vi.fn(),
      });
    });

    it('shows confirmation dialog when apply button is clicked', () => {
      render(<TemplatesPage />);
      
      const applyButton = screen.getByRole('button', { name: /apply template/i });
      fireEvent.click(applyButton);
      
      expect(screen.getByText(/Confirm Template Application/)).toBeInTheDocument();
    });

    it('closes confirmation dialog when cancel is clicked', () => {
      render(<TemplatesPage />);
      
      const applyButton = screen.getByRole('button', { name: /apply template/i });
      fireEvent.click(applyButton);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText(/Confirm Template Application/)).not.toBeInTheDocument();
    });

    it('calls applyTemplate when confirmed', () => {
      render(<TemplatesPage />);
      
      // Open confirmation dialog
      const applyButton = screen.getByRole('button', { name: /✨ apply template/i });
      fireEvent.click(applyButton);
      
      // Click the confirm button in the dialog
      const confirmButtons = screen.getAllByRole('button');
      const confirmButton = confirmButtons.find(btn => 
        btn.textContent?.includes('Apply Template') && !btn.textContent?.includes('✨')
      );
      
      expect(confirmButton).toBeTruthy();
      if (confirmButton) {
        fireEvent.click(confirmButton);
        expect(mockApplyTemplate).toHaveBeenCalledWith('default', false);
      }
    });
  });

  describe('Refresh Functionality', () => {
    it('reloads templates when refresh button is clicked', () => {
      render(<TemplatesPage />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      
      expect(mockLoadTemplates).toHaveBeenCalledTimes(2); // Once on mount, once on click
    });
  });
});

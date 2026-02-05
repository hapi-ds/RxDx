/**
 * Template Store
 * Manages template state using Zustand
 */

import { create } from 'zustand';
import {
  templateService,
  type TemplateMetadata,
  type TemplateDefinition,
  type ApplicationResult,
  type ValidationResult,
} from '../services/templateService';

interface TemplateStore {
  // State
  templates: TemplateMetadata[];
  selectedTemplate: TemplateDefinition | null;
  validationResult: ValidationResult | null;
  applicationResult: ApplicationResult | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTemplates: () => Promise<void>;
  selectTemplate: (name: string) => Promise<void>;
  validateTemplate: (name: string) => Promise<void>;
  applyTemplate: (name: string, dryRun?: boolean) => Promise<void>;
  clearError: () => void;
  clearValidation: () => void;
  clearApplication: () => void;
  reset: () => void;
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  // Initial state
  templates: [],
  selectedTemplate: null,
  validationResult: null,
  applicationResult: null,
  isLoading: false,
  error: null,

  // Load all available templates
  loadTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await templateService.listTemplates();
      set({ templates, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load templates';
      set({ error: message, isLoading: false });
      console.error('Failed to load templates:', error);
    }
  },

  // Select and load a specific template
  selectTemplate: async (name: string) => {
    set({ isLoading: true, error: null, selectedTemplate: null });
    try {
      const template = await templateService.getTemplate(name);
      set({ selectedTemplate: template, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load template';
      set({ error: message, isLoading: false, selectedTemplate: null });
      console.error('Failed to load template:', error);
    }
  },

  // Validate a template
  validateTemplate: async (name: string) => {
    set({ isLoading: true, error: null, validationResult: null });
    try {
      const result = await templateService.validateTemplate(name);
      set({ validationResult: result, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to validate template';
      set({ error: message, isLoading: false });
      console.error('Failed to validate template:', error);
    }
  },

  // Apply a template (with optional dry-run)
  applyTemplate: async (name: string, dryRun: boolean = false) => {
    set({ isLoading: true, error: null, applicationResult: null });
    try {
      const result = await templateService.applyTemplate(name, dryRun);
      set({ applicationResult: result, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply template';
      set({ error: message, isLoading: false });
      console.error('Failed to apply template:', error);
    }
  },

  // Clear error message
  clearError: () => {
    set({ error: null });
  },

  // Clear validation result
  clearValidation: () => {
    set({ validationResult: null });
  },

  // Clear application result
  clearApplication: () => {
    set({ applicationResult: null });
  },

  // Reset store to initial state
  reset: () => {
    set({
      templates: [],
      selectedTemplate: null,
      validationResult: null,
      applicationResult: null,
      isLoading: false,
      error: null,
    });
  },
}));

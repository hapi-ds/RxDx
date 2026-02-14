import React, { useState, useEffect } from 'react';
import type { Sprint, SprintCreate, SprintUpdate } from '../../services/sprintService';
import { sprintService } from '../../services/sprintService';

interface SprintFormProps {
  projectId: string;
  sprint?: Sprint;
  onSuccess?: (sprint: Sprint) => void;
  onCancel?: () => void;
}

export const SprintForm: React.FC<SprintFormProps> = ({
  projectId,
  sprint,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    capacity_hours: '',
    capacity_story_points: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (sprint) {
      setFormData({
        name: sprint.name,
        goal: sprint.goal || '',
        start_date: sprint.start_date.split('T')[0],
        end_date: sprint.end_date.split('T')[0],
        capacity_hours: sprint.capacity_hours?.toString() || '',
        capacity_story_points: sprint.capacity_story_points?.toString() || '',
      });
    }
  }, [sprint]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Sprint name is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      
      if (end <= start) {
        newErrors.end_date = 'End date must be after start date';
      }

      const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (durationDays > 30) {
        newErrors.end_date = 'Sprint duration cannot exceed 30 days';
      }
    }

    if (formData.capacity_hours && parseFloat(formData.capacity_hours) < 0) {
      newErrors.capacity_hours = 'Capacity hours must be non-negative';
    }

    if (formData.capacity_story_points && parseFloat(formData.capacity_story_points) < 0) {
      newErrors.capacity_story_points = 'Capacity story points must be non-negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const data: SprintCreate | SprintUpdate = {
        name: formData.name,
        goal: formData.goal || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        capacity_hours: formData.capacity_hours ? parseFloat(formData.capacity_hours) : undefined,
        capacity_story_points: formData.capacity_story_points
          ? parseFloat(formData.capacity_story_points)
          : undefined,
      };

      let result: Sprint;
      if (sprint) {
        result = await sprintService.updateSprint(sprint.id, data);
      } else {
        result = await sprintService.createSprint(projectId, data as SprintCreate);
      }

      onSuccess?.(result);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save sprint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Sprint Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          } px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          placeholder="Sprint 1"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="goal" className="block text-sm font-medium text-gray-700">
          Sprint Goal
        </label>
        <textarea
          id="goal"
          name="goal"
          value={formData.goal}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="What do you want to achieve in this sprint?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
            Start Date *
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border ${
              errors.start_date ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          />
          {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>}
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
            End Date *
          </label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border ${
              errors.end_date ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          />
          {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="capacity_hours" className="block text-sm font-medium text-gray-700">
            Capacity (Hours)
          </label>
          <input
            type="number"
            id="capacity_hours"
            name="capacity_hours"
            value={formData.capacity_hours}
            onChange={handleChange}
            min="0"
            step="0.5"
            className={`mt-1 block w-full rounded-md border ${
              errors.capacity_hours ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
            placeholder="80"
          />
          {errors.capacity_hours && (
            <p className="mt-1 text-sm text-red-600">{errors.capacity_hours}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="capacity_story_points"
            className="block text-sm font-medium text-gray-700"
          >
            Capacity (Story Points)
          </label>
          <input
            type="number"
            id="capacity_story_points"
            name="capacity_story_points"
            value={formData.capacity_story_points}
            onChange={handleChange}
            min="0"
            step="1"
            className={`mt-1 block w-full rounded-md border ${
              errors.capacity_story_points ? 'border-red-300' : 'border-gray-300'
            } px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
            placeholder="20"
          />
          {errors.capacity_story_points && (
            <p className="mt-1 text-sm text-red-600">{errors.capacity_story_points}</p>
          )}
        </div>
      </div>

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{submitError}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : sprint ? 'Update Sprint' : 'Create Sprint'}
        </button>
      </div>
    </form>
  );
};

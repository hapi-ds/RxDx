/**
 * DistanceControl Component
 * Slider control for adjusting node spacing in graph layouts
 * Integrates with graphStore for state management and persists selection to local storage
 * 
 * References: Requirements 1.1, 1.2, 1.7
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useGraphStore } from '../../stores/graphStore';

export interface DistanceControlProps {
  /** Optional CSS class name */
  className?: string;
  /** Whether to show the label */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Minimum distance value (default: 50) */
  min?: number;
  /** Maximum distance value (default: 500) */
  max?: number;
  /** Step increment (default: 10) */
  step?: number;
  /** Whether to show the numeric value (default: true) */
  showValue?: boolean;
}

/**
 * DistanceControl - Slider component for adjusting graph layout distance
 * Provides a range input with debounced updates and numeric display
 */
export const DistanceControl: React.FC<DistanceControlProps> = ({
  className = '',
  showLabel = true,
  label = 'Distance',
  min = 50,
  max = 500,
  step = 10,
  showValue = true,
}) => {
  const { layoutDistance, setLayoutDistance } = useGraphStore();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localValue, setLocalValue] = React.useState(layoutDistance);

  // Sync local value with store when store changes externally
  useEffect(() => {
    setLocalValue(layoutDistance);
  }, [layoutDistance]);

  // Debounced update to store (300ms)
  const debouncedSetDistance = useCallback(
    (value: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setLayoutDistance(value);
      }, 300);
    },
    [setLayoutDistance]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setLocalValue(value);
    debouncedSetDistance(value);
  };

  return (
    <div className={`distance-control ${className}`}>
      {showLabel && (
        <label htmlFor="distance-slider" className="distance-label">
          {label}:
        </label>
      )}
      
      <div className="distance-slider-container">
        <input
          id="distance-slider"
          type="range"
          className="distance-slider"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          aria-label="Graph layout distance"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localValue}
          aria-valuetext={`${localValue} pixels`}
        />
        
        {showValue && (
          <span className="distance-value" aria-live="polite">
            {localValue}
          </span>
        )}
      </div>

      <style>{`
        .distance-control {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .distance-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          white-space: nowrap;
        }

        .distance-slider-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .distance-slider {
          width: 120px;
          height: 6px;
          background: linear-gradient(to right, #e5e7eb 0%, #667eea 100%);
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
          cursor: pointer;
        }

        /* Webkit browsers (Chrome, Safari, Edge) */
        .distance-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: #667eea;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .distance-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
        }

        .distance-slider::-webkit-slider-thumb:active {
          transform: scale(1.05);
        }

        /* Firefox */
        .distance-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #667eea;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .distance-slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
        }

        .distance-slider::-moz-range-thumb:active {
          transform: scale(1.05);
        }

        .distance-slider::-moz-range-track {
          background: transparent;
          border: none;
        }

        /* Focus styles for accessibility */
        .distance-slider:focus {
          outline: none;
        }

        .distance-slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
        }

        .distance-slider:focus::-moz-range-thumb {
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
        }

        .distance-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: #667eea;
          min-width: 40px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

export default DistanceControl;

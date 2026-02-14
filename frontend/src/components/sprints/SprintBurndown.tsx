import React, { useEffect, useState, useCallback } from 'react';
import type { BurndownPoint } from '../../services/sprintService';
import { sprintService } from '../../services/sprintService';

interface SprintBurndownProps {
  sprintId: string;
  sprintName: string;
  useStoryPoints?: boolean;
}

export const SprintBurndown: React.FC<SprintBurndownProps> = ({
  sprintId,
  sprintName,
  useStoryPoints = false,
}) => {
  const [burndownData, setBurndownData] = useState<BurndownPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBurndownData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sprintService.getSprintBurndown(sprintId);
      setBurndownData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load burndown data');
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    loadBurndownData();
  }, [loadBurndownData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getMaxValue = () => {
    if (burndownData.length === 0) return 100;
    
    const values = burndownData.flatMap((point) =>
      useStoryPoints
        ? [point.ideal_remaining_points, point.actual_remaining_points]
        : [point.ideal_remaining_hours, point.actual_remaining_hours]
    );
    
    return Math.max(...values, 0);
  };

  const getChartHeight = 300;
  const getChartWidth = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = getChartWidth - padding.left - padding.right;
  const chartHeight = getChartHeight - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (burndownData.length <= 1) return padding.left;
    return padding.left + (index / (burndownData.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    const maxValue = getMaxValue();
    if (maxValue === 0) return padding.top + chartHeight;
    return padding.top + chartHeight - (value / maxValue) * chartHeight;
  };

  const getIdealLine = () => {
    if (burndownData.length === 0) return '';
    
    return burndownData
      .map((point, index) => {
        const x = getX(index);
        const y = getY(
          useStoryPoints ? point.ideal_remaining_points : point.ideal_remaining_hours
        );
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const getActualLine = () => {
    if (burndownData.length === 0) return '';
    
    return burndownData
      .map((point, index) => {
        const x = getX(index);
        const y = getY(
          useStoryPoints ? point.actual_remaining_points : point.actual_remaining_hours
        );
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-500">Loading burndown chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadBurndownData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (burndownData.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">No burndown data available</p>
      </div>
    );
  }

  const maxValue = getMaxValue();
  const yAxisTicks = 5;
  const yAxisStep = maxValue / yAxisTicks;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Burndown Chart - {sprintName}</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span>Ideal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500"></div>
            <span>Actual</span>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-md p-4 bg-white">
        <svg width={getChartWidth} height={getChartHeight} className="overflow-visible">
          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + chartHeight}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          
          {/* Y-axis ticks and labels */}
          {Array.from({ length: yAxisTicks + 1 }).map((_, i) => {
            const value = maxValue - i * yAxisStep;
            const y = padding.top + (i / yAxisTicks) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={padding.left - 5}
                  y1={y}
                  x2={padding.left}
                  y2={y}
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {/* X-axis labels */}
          {burndownData.map((point, index) => {
            const x = getX(index);
            const showLabel = index === 0 || index === burndownData.length - 1 || index % Math.ceil(burndownData.length / 7) === 0;
            if (!showLabel) return null;
            
            return (
              <text
                key={index}
                x={x}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {formatDate(point.date)}
              </text>
            );
          })}

          {/* Ideal line */}
          <path
            d={getIdealLine()}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="5,5"
          />

          {/* Actual line */}
          <path
            d={getActualLine()}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
          />

          {/* Data points */}
          {burndownData.map((point, index) => {
            const x = getX(index);
            const idealY = getY(
              useStoryPoints ? point.ideal_remaining_points : point.ideal_remaining_hours
            );
            const actualY = getY(
              useStoryPoints ? point.actual_remaining_points : point.actual_remaining_hours
            );
            
            return (
              <g key={index}>
                <circle cx={x} cy={idealY} r="3" fill="#3b82f6" />
                <circle cx={x} cy={actualY} r="3" fill="#10b981" />
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={padding.left - 35}
            y={padding.top + chartHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
            transform={`rotate(-90, ${padding.left - 35}, ${padding.top + chartHeight / 2})`}
          >
            {useStoryPoints ? 'Story Points' : 'Hours'} Remaining
          </text>
        </svg>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-blue-50 rounded-md">
          <p className="text-blue-600 font-medium">Ideal Remaining</p>
          <p className="text-2xl font-semibold text-blue-900">
            {useStoryPoints
              ? burndownData[burndownData.length - 1]?.ideal_remaining_points || 0
              : burndownData[burndownData.length - 1]?.ideal_remaining_hours || 0}
          </p>
        </div>
        <div className="p-3 bg-green-50 rounded-md">
          <p className="text-green-600 font-medium">Actual Remaining</p>
          <p className="text-2xl font-semibold text-green-900">
            {useStoryPoints
              ? burndownData[burndownData.length - 1]?.actual_remaining_points || 0
              : burndownData[burndownData.length - 1]?.actual_remaining_hours || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

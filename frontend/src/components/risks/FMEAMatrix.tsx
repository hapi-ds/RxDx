/**
 * FMEAMatrix component
 * Displays risks in a matrix format based on severity and occurrence ratings
 * Implements Requirement 10 (Risk Management with FMEA)
 * 
 * Features:
 * - Matrix grid layout (severity vs occurrence)
 * - Color-coded cells based on RPN levels (low/medium/high/critical)
 * - Clickable cells to show risk details
 * - Responsive design with proper scaling
 * - Accessible with ARIA labels
 * - Shows risk count per cell
 * - Hover effects for better UX
 */

import React, { useMemo, useState } from 'react';
import type { RiskNode } from '../../services/riskService';
import { riskService } from '../../services';

export interface FMEAMatrixProps {
  risks: RiskNode[];
  onRiskClick?: (risk: RiskNode) => void;
  onCellClick?: (severity: number, occurrence: number, risks: RiskNode[]) => void;
  showRiskCount?: boolean;
  showLegend?: boolean;
  className?: string;
}

interface MatrixCell {
  severity: number;
  occurrence: number;
  risks: RiskNode[];
  rpnRange: { min: number; max: number };
  color: string;
  level: 'critical' | 'high' | 'medium' | 'low';
}

export function FMEAMatrix({
  risks,
  onRiskClick,
  onCellClick,
  showRiskCount = true,
  showLegend = true,
  className = '',
}: FMEAMatrixProps): React.ReactElement {
  const [selectedCell, setSelectedCell] = useState<{ severity: number; occurrence: number } | null>(null);

  // Matrix dimensions (1-10 scale for both severity and occurrence)
  const severityLevels = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const occurrenceLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Build matrix data structure
  const matrixData = useMemo((): MatrixCell[][] => {
    // Initialize matrix
    const matrix: MatrixCell[][] = severityLevels.map(severity =>
      occurrenceLevels.map(occurrence => {
        // Calculate RPN range for this cell (detection varies 1-10)
        const minRPN = severity * occurrence * 1;
        const maxRPN = severity * occurrence * 10;
        
        // Determine color based on average RPN
        const avgRPN = (minRPN + maxRPN) / 2;
        const level = riskService.getRiskLevel(avgRPN);
        const color = riskService.getRiskLevelColor(avgRPN);

        return {
          severity,
          occurrence,
          risks: [],
          rpnRange: { min: minRPN, max: maxRPN },
          color,
          level,
        };
      })
    );

    // Populate matrix with risks
    risks.forEach(risk => {
      const severityIndex = severityLevels.indexOf(risk.severity);
      const occurrenceIndex = occurrenceLevels.indexOf(risk.occurrence);
      
      if (severityIndex !== -1 && occurrenceIndex !== -1) {
        matrix[severityIndex][occurrenceIndex].risks.push(risk);
      }
    });

    return matrix;
  }, [risks]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRisks = risks.length;
    const criticalCount = risks.filter(r => riskService.getRiskLevel(r.rpn) === 'critical').length;
    const highCount = risks.filter(r => riskService.getRiskLevel(r.rpn) === 'high').length;
    const mediumCount = risks.filter(r => riskService.getRiskLevel(r.rpn) === 'medium').length;
    const lowCount = risks.filter(r => riskService.getRiskLevel(r.rpn) === 'low').length;

    return { totalRisks, criticalCount, highCount, mediumCount, lowCount };
  }, [risks]);

  // Handle cell click
  const handleCellClick = (cell: MatrixCell) => {
    if (cell.risks.length === 0) return;

    setSelectedCell({ severity: cell.severity, occurrence: cell.occurrence });
    
    if (onCellClick) {
      onCellClick(cell.severity, cell.occurrence, cell.risks);
    }
  };

  // Handle risk click from cell popup
  const handleRiskClickFromCell = (risk: RiskNode) => {
    if (onRiskClick) {
      onRiskClick(risk);
    }
    setSelectedCell(null);
  };

  // Render matrix cell
  const renderCell = (cell: MatrixCell, rowIndex: number, colIndex: number) => {
    const isSelected = selectedCell?.severity === cell.severity && selectedCell?.occurrence === cell.occurrence;
    const hasRisks = cell.risks.length > 0;
    const isClickable = hasRisks && (onCellClick || onRiskClick);

    return (
      <div
        key={`cell-${rowIndex}-${colIndex}`}
        className={`matrix-cell ${isClickable ? 'clickable' : ''} ${isSelected ? 'selected' : ''} ${hasRisks ? 'has-risks' : 'empty'}`}
        style={{
          backgroundColor: cell.color,
          opacity: hasRisks ? 1 : 0.3,
        }}
        onClick={isClickable ? () => handleCellClick(cell) : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => e.key === 'Enter' && handleCellClick(cell) : undefined}
        aria-label={`Severity ${cell.severity}, Occurrence ${cell.occurrence}, ${cell.risks.length} risk${cell.risks.length !== 1 ? 's' : ''}, RPN range ${cell.rpnRange.min}-${cell.rpnRange.max}`}
        title={`S:${cell.severity} × O:${cell.occurrence}\nRPN: ${cell.rpnRange.min}-${cell.rpnRange.max}\n${cell.risks.length} risk${cell.risks.length !== 1 ? 's' : ''}`}
      >
        {showRiskCount && hasRisks && (
          <span className="risk-count">{cell.risks.length}</span>
        )}
      </div>
    );
  };

  // Render cell popup with risk list
  const renderCellPopup = () => {
    if (!selectedCell) return null;

    const cell = matrixData
      .flat()
      .find(c => c.severity === selectedCell.severity && c.occurrence === selectedCell.occurrence);

    if (!cell || cell.risks.length === 0) return null;

    return (
      <div className="cell-popup-overlay" onClick={() => setSelectedCell(null)}>
        <div className="cell-popup" onClick={(e) => e.stopPropagation()}>
          <div className="popup-header">
            <h3 className="popup-title">
              Risks at S:{cell.severity} × O:{cell.occurrence}
            </h3>
            <button
              className="popup-close"
              onClick={() => setSelectedCell(null)}
              aria-label="Close popup"
            >
              ×
            </button>
          </div>

          <div className="popup-info">
            <div className="info-item">
              <span className="info-label">RPN Range:</span>
              <span className="info-value">{cell.rpnRange.min} - {cell.rpnRange.max}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Risk Level:</span>
              <span className="info-value" style={{ color: cell.color }}>
                {cell.level.toUpperCase()}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Risk Count:</span>
              <span className="info-value">{cell.risks.length}</span>
            </div>
          </div>

          <div className="popup-risks">
            {cell.risks.map(risk => (
              <div
                key={risk.id}
                className={`popup-risk-item ${onRiskClick ? 'clickable' : ''}`}
                onClick={onRiskClick ? () => handleRiskClickFromCell(risk) : undefined}
                role={onRiskClick ? 'button' : undefined}
                tabIndex={onRiskClick ? 0 : undefined}
                onKeyDown={onRiskClick ? (e) => e.key === 'Enter' && handleRiskClickFromCell(risk) : undefined}
              >
                <div className="risk-item-header">
                  <span className="risk-item-title">{risk.title}</span>
                  <span className="risk-item-rpn">RPN: {risk.rpn}</span>
                </div>
                <div className="risk-item-metrics">
                  <span>S:{risk.severity}</span>
                  <span>O:{risk.occurrence}</span>
                  <span>D:{risk.detection}</span>
                </div>
                {risk.description && (
                  <p className="risk-item-description">
                    {risk.description.length > 100
                      ? `${risk.description.substring(0, 100)}...`
                      : risk.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Empty state
  if (risks.length === 0) {
    return (
      <div className={`fmea-matrix ${className}`}>
        <div className="matrix-header">
          <h2 className="matrix-title">FMEA Risk Matrix</h2>
        </div>

        <div className="empty-state">
          <p>No risks to display</p>
          <p className="hint">
            The FMEA matrix visualizes risks based on their severity and occurrence ratings.
          </p>
        </div>

        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className={`fmea-matrix ${className}`}>
      <div className="matrix-header">
        <h2 className="matrix-title">FMEA Risk Matrix</h2>
        <div className="matrix-stats">
          <span className="stat-item">Total: {stats.totalRisks}</span>
          {stats.criticalCount > 0 && (
            <span className="stat-item critical">Critical: {stats.criticalCount}</span>
          )}
          {stats.highCount > 0 && (
            <span className="stat-item high">High: {stats.highCount}</span>
          )}
          {stats.mediumCount > 0 && (
            <span className="stat-item medium">Medium: {stats.mediumCount}</span>
          )}
          {stats.lowCount > 0 && (
            <span className="stat-item low">Low: {stats.lowCount}</span>
          )}
        </div>
      </div>

      {showLegend && (
        <div className="matrix-legend">
          <div className="legend-title">Risk Levels (based on average RPN):</div>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#dc2626' }} />
              <span className="legend-label">Critical (RPN ≥ 200)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#ea580c' }} />
              <span className="legend-label">High (RPN 100-199)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#ca8a04' }} />
              <span className="legend-label">Medium (RPN 50-99)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#16a34a' }} />
              <span className="legend-label">Low (RPN &lt; 50)</span>
            </div>
          </div>
        </div>
      )}

      <div className="matrix-container">
        <div className="matrix-wrapper">
          {/* Y-axis label (Severity) */}
          <div className="y-axis-label">
            <span>Severity</span>
            <span className="axis-arrow">↑</span>
          </div>

          {/* Y-axis values */}
          <div className="y-axis">
            {severityLevels.map(level => (
              <div key={`y-${level}`} className="axis-value">
                {level}
              </div>
            ))}
          </div>

          {/* Matrix grid */}
          <div className="matrix-grid-wrapper">
            <div className="matrix-grid">
              {matrixData.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="matrix-row">
                  {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
                </div>
              ))}
            </div>

            {/* X-axis values */}
            <div className="x-axis">
              {occurrenceLevels.map(level => (
                <div key={`x-${level}`} className="axis-value">
                  {level}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* X-axis label (Occurrence) */}
        <div className="x-axis-label">
          <span className="axis-arrow">→</span>
          <span>Occurrence</span>
        </div>
      </div>

      {/* Cell popup */}
      {renderCellPopup()}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .fmea-matrix {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .matrix-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
    flex-wrap: wrap;
  }

  .matrix-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .matrix-stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .stat-item {
    padding: 0.25rem 0.75rem;
    background: #f3f4f6;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
  }

  .stat-item.critical {
    background: #fee2e2;
    color: #dc2626;
  }

  .stat-item.high {
    background: #ffedd5;
    color: #ea580c;
  }

  .stat-item.medium {
    background: #fef3c7;
    color: #ca8a04;
  }

  .stat-item.low {
    background: #dcfce7;
    color: #16a34a;
  }

  .matrix-legend {
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .legend-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .legend-items {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-color {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid #d1d5db;
  }

  .legend-label {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 500;
  }

  .matrix-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .matrix-wrapper {
    display: grid;
    grid-template-columns: auto auto 1fr;
    grid-template-rows: auto;
    gap: 0.5rem;
    align-items: center;
  }

  .y-axis-label {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }

  .x-axis-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-top: 0.5rem;
  }

  .axis-arrow {
    font-size: 1.25rem;
    color: #6b7280;
  }

  .y-axis {
    grid-column: 2;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .x-axis {
    display: flex;
    gap: 2px;
  }

  .axis-value {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    background: #f3f4f6;
    border-radius: 4px;
  }

  .matrix-grid-wrapper {
    grid-column: 3;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .matrix-grid {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: #e5e7eb;
    padding: 2px;
    border-radius: 4px;
  }

  .matrix-row {
    display: flex;
    gap: 2px;
  }

  .matrix-cell {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    transition: all 0.2s;
    position: relative;
  }

  .matrix-cell.clickable {
    cursor: pointer;
  }

  .matrix-cell.clickable:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    z-index: 10;
  }

  .matrix-cell.selected {
    transform: scale(1.15);
    box-shadow: 0 0 0 3px #3b82f6;
    z-index: 20;
  }

  .matrix-cell:focus {
    outline: none;
    box-shadow: 0 0 0 3px #3b82f6;
    z-index: 20;
  }

  .matrix-cell.empty {
    cursor: default;
  }

  .risk-count {
    font-size: 0.875rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .cell-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .cell-popup {
    background: white;
    border-radius: 8px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .popup-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  .popup-close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    border: none;
    border-radius: 6px;
    font-size: 1.5rem;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
  }

  .popup-close:hover {
    background: #e5e7eb;
    color: #111827;
  }

  .popup-info {
    display: flex;
    gap: 1.5rem;
    padding: 1rem 1.5rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    flex-wrap: wrap;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .info-value {
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }

  .popup-risks {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .popup-risk-item {
    padding: 1rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .popup-risk-item.clickable {
    cursor: pointer;
  }

  .popup-risk-item.clickable:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .popup-risk-item:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .risk-item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .risk-item-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    flex: 1;
  }

  .risk-item-rpn {
    font-size: 0.875rem;
    font-weight: 700;
    color: #3b82f6;
    white-space: nowrap;
  }

  .risk-item-metrics {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
  }

  .risk-item-description {
    margin: 0;
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
    background: white;
    border: 2px dashed #d1d5db;
    border-radius: 6px;
  }

  .empty-state p {
    margin: 0 0 0.5rem 0;
    color: #6b7280;
  }

  .empty-state .hint {
    font-size: 0.875rem;
    font-style: italic;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .matrix-wrapper {
      grid-template-columns: auto auto 1fr;
    }

    .axis-value,
    .matrix-cell {
      width: 35px;
      height: 35px;
      font-size: 0.75rem;
    }
  }

  @media (max-width: 768px) {
    .fmea-matrix {
      padding: 1rem;
    }

    .matrix-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .matrix-stats {
      width: 100%;
    }

    .legend-items {
      flex-direction: column;
      gap: 0.75rem;
    }

    .axis-value,
    .matrix-cell {
      width: 30px;
      height: 30px;
      font-size: 0.625rem;
    }

    .risk-count {
      font-size: 0.75rem;
    }

    .cell-popup {
      max-height: 90vh;
    }

    .popup-info {
      flex-direction: column;
      gap: 0.75rem;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .matrix-cell,
    .popup-risk-item {
      transition: none;
    }
  }

  /* Print Styles */
  @media print {
    .fmea-matrix {
      box-shadow: none;
      border: 1px solid #e5e7eb;
    }

    .cell-popup-overlay {
      display: none;
    }

    .matrix-cell.clickable:hover {
      transform: none;
      box-shadow: none;
    }
  }
`;

export default FMEAMatrix;

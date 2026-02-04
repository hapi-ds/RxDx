/**
 * RiskCard component
 * Reusable card for displaying risk information with RPN display
 * Supports Requirement 10 (Risk Management with FMEA)
 */

import React from 'react';
import type { RiskNode } from '../../services/riskService';
import { riskService } from '../../services';

export interface RiskCardProps {
  risk: RiskNode;
  onClick?: (risk: RiskNode) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

export function RiskCard({
  risk,
  onClick,
  isSelected = false,
}: RiskCardProps): React.ReactElement {
  const handleClick = () => {
    onClick?.(risk);
  };

  const getRiskLevelBadge = (rpn: number): React.ReactElement => {
    const level = riskService.getRiskLevel(rpn);
    const color = riskService.getRiskLevelColor(rpn);
    
    return (
      <span 
        className="risk-level-badge"
        style={{ backgroundColor: color }}
      >
        {level.toUpperCase()}
      </span>
    );
  };

  return (
    <div 
      className={`risk-card ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
    >
      <div className="risk-card-header">
        <h3 className="risk-title">{risk.title}</h3>
        {getRiskLevelBadge(risk.rpn)}
      </div>
      
      <div className="risk-card-body">
        {risk.description && (
          <p className="risk-description">
            {risk.description.length > 150 
              ? `${risk.description.substring(0, 150)}...` 
              : risk.description}
          </p>
        )}
        
        <div className="risk-metrics">
          <div className="metric">
            <span className="metric-label">RPN:</span>
            <span className="metric-value">{risk.rpn}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Severity:</span>
            <span className="metric-value">{risk.severity}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Occurrence:</span>
            <span className="metric-value">{risk.occurrence}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Detection:</span>
            <span className="metric-value">{risk.detection}</span>
          </div>
        </div>

        {risk.risk_category && (
          <div className="risk-category">
            Category: {risk.risk_category}
          </div>
        )}
      </div>

      <div className="risk-card-footer">
        <span className="risk-status">{risk.status}</span>
        {risk.mitigation_count > 0 && (
          <span className="mitigation-count">
            {risk.mitigation_count} mitigation{risk.mitigation_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <style>{`
        .risk-card {
          display: flex;
          flex-direction: column;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          background: white;
          transition: all 0.2s;
        }

        .risk-card.clickable {
          cursor: pointer;
        }

        .risk-card.clickable:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .risk-card.selected {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .risk-card:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .risk-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .risk-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .risk-level-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .risk-card-body {
          margin-bottom: 0.75rem;
        }

        .risk-description {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
        }

        .risk-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .metric {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metric-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }

        .metric-value {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .risk-category {
          font-size: 0.75rem;
          color: #6b7280;
          padding: 0.25rem 0.5rem;
          background: #f3f4f6;
          border-radius: 4px;
          display: inline-block;
        }

        .risk-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
        }

        .risk-status {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          text-transform: capitalize;
        }

        .mitigation-count {
          font-size: 0.75rem;
          color: #3b82f6;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .risk-metrics {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

export default RiskCard;

/**
 * FMEAMatrix component examples
 * Demonstrates usage of the FMEA matrix visualization component
 */

import React from 'react';
import { FMEAMatrix } from './FMEAMatrix';
import type { RiskNode } from '../../services/riskService';

// Sample risk data for examples
const sampleRisks: RiskNode[] = [
  {
    id: '1',
    title: 'Software Crash During Critical Operation',
    description: 'System may crash during patient data processing',
    status: 'identified',
    severity: 10,
    occurrence: 3,
    detection: 2,
    rpn: 60,
    risk_category: 'Software',
    version: '1.0',
    created_by: 'risk-manager',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    is_signed: false,
    linked_design_items: [],
    linked_process_items: [],
    mitigation_count: 2,
    has_open_mitigations: true,
  },
  {
    id: '2',
    title: 'Data Corruption in Storage',
    description: 'Patient records may become corrupted',
    status: 'assessed',
    severity: 9,
    occurrence: 2,
    detection: 3,
    rpn: 54,
    risk_category: 'Data',
    version: '1.0',
    created_by: 'risk-manager',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
    is_signed: false,
    linked_design_items: [],
    linked_process_items: [],
    mitigation_count: 1,
    has_open_mitigations: true,
  },
  {
    id: '3',
    title: 'Unauthorized Access to System',
    description: 'Unauthorized users may gain access to sensitive data',
    status: 'mitigated',
    severity: 8,
    occurrence: 4,
    detection: 5,
    rpn: 160,
    risk_category: 'Security',
    version: '1.1',
    created_by: 'security-officer',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z',
    is_signed: true,
    linked_design_items: ['design-1'],
    linked_process_items: [],
    mitigation_count: 3,
    has_open_mitigations: false,
  },
  {
    id: '4',
    title: 'Network Communication Failure',
    description: 'Loss of network connectivity during data transmission',
    status: 'identified',
    severity: 7,
    occurrence: 5,
    detection: 4,
    rpn: 140,
    risk_category: 'Infrastructure',
    version: '1.0',
    created_by: 'risk-manager',
    created_at: '2024-01-18T10:00:00Z',
    updated_at: '2024-01-18T10:00:00Z',
    is_signed: false,
    linked_design_items: [],
    linked_process_items: ['process-1'],
    mitigation_count: 1,
    has_open_mitigations: true,
  },
  {
    id: '5',
    title: 'Incorrect Calculation Results',
    description: 'Mathematical calculations may produce incorrect results',
    status: 'assessed',
    severity: 9,
    occurrence: 2,
    detection: 6,
    rpn: 108,
    risk_category: 'Software',
    version: '1.0',
    created_by: 'qa-engineer',
    created_at: '2024-01-12T10:00:00Z',
    updated_at: '2024-01-12T10:00:00Z',
    is_signed: false,
    linked_design_items: ['design-2'],
    linked_process_items: [],
    mitigation_count: 2,
    has_open_mitigations: true,
  },
  {
    id: '6',
    title: 'User Interface Confusion',
    description: 'Users may misinterpret UI elements leading to errors',
    status: 'identified',
    severity: 5,
    occurrence: 6,
    detection: 7,
    rpn: 210,
    risk_category: 'Usability',
    version: '1.0',
    created_by: 'ux-designer',
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T10:00:00Z',
    is_signed: false,
    linked_design_items: [],
    linked_process_items: [],
    mitigation_count: 1,
    has_open_mitigations: true,
  },
  {
    id: '7',
    title: 'Battery Depletion',
    description: 'Device battery may deplete during critical operation',
    status: 'mitigated',
    severity: 6,
    occurrence: 4,
    detection: 8,
    rpn: 192,
    risk_category: 'Hardware',
    version: '1.2',
    created_by: 'hardware-engineer',
    created_at: '2024-01-08T10:00:00Z',
    updated_at: '2024-01-22T10:00:00Z',
    is_signed: true,
    linked_design_items: ['design-3'],
    linked_process_items: [],
    mitigation_count: 2,
    has_open_mitigations: false,
  },
  {
    id: '8',
    title: 'Sensor Calibration Drift',
    description: 'Sensors may drift out of calibration over time',
    status: 'assessed',
    severity: 7,
    occurrence: 3,
    detection: 5,
    rpn: 105,
    risk_category: 'Hardware',
    version: '1.0',
    created_by: 'hardware-engineer',
    created_at: '2024-01-11T10:00:00Z',
    updated_at: '2024-01-11T10:00:00Z',
    is_signed: false,
    linked_design_items: [],
    linked_process_items: ['process-2'],
    mitigation_count: 1,
    has_open_mitigations: true,
  },
];

/**
 * Example 1: Basic FMEA Matrix
 * Shows the default matrix with all features enabled
 */
export function BasicFMEAMatrix(): React.ReactElement {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Basic FMEA Matrix</h2>
      <p>Default matrix showing risk distribution across severity and occurrence dimensions.</p>
      <FMEAMatrix risks={sampleRisks} />
    </div>
  );
}

/**
 * Example 2: Matrix with Cell Click Handler
 * Demonstrates handling cell clicks to show risks in that cell
 */
export function InteractiveFMEAMatrix(): React.ReactElement {
  const handleCellClick = (severity: number, occurrence: number, risks: RiskNode[]) => {
    console.log(`Cell clicked: S=${severity}, O=${occurrence}`);
    console.log(`Risks in cell:`, risks);
    alert(`Cell S:${severity} × O:${occurrence} contains ${risks.length} risk(s)`);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Interactive FMEA Matrix</h2>
      <p>Click on cells to see alerts with risk information.</p>
      <FMEAMatrix risks={sampleRisks} onCellClick={handleCellClick} />
    </div>
  );
}

/**
 * Example 3: Matrix with Risk Click Handler
 * Demonstrates handling individual risk clicks from the popup
 */
export function RiskClickableFMEAMatrix(): React.ReactElement {
  const handleRiskClick = (risk: RiskNode) => {
    console.log('Risk clicked:', risk);
    alert(`Risk clicked: ${risk.title}\nRPN: ${risk.rpn}`);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Risk Clickable FMEA Matrix</h2>
      <p>Click on a cell, then click on individual risks in the popup.</p>
      <FMEAMatrix risks={sampleRisks} onRiskClick={handleRiskClick} />
    </div>
  );
}

/**
 * Example 4: Matrix without Legend
 * Shows matrix with legend hidden
 */
export function MatrixWithoutLegend(): React.ReactElement {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>FMEA Matrix without Legend</h2>
      <p>Matrix with legend hidden for compact display.</p>
      <FMEAMatrix risks={sampleRisks} showLegend={false} />
    </div>
  );
}

/**
 * Example 5: Matrix without Risk Counts
 * Shows matrix without displaying risk counts in cells
 */
export function MatrixWithoutCounts(): React.ReactElement {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>FMEA Matrix without Risk Counts</h2>
      <p>Matrix showing only color coding without risk counts.</p>
      <FMEAMatrix risks={sampleRisks} showRiskCount={false} />
    </div>
  );
}

/**
 * Example 6: Empty Matrix
 * Shows how the matrix handles no risks
 */
export function EmptyFMEAMatrix(): React.ReactElement {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Empty FMEA Matrix</h2>
      <p>Matrix with no risks to display.</p>
      <FMEAMatrix risks={[]} />
    </div>
  );
}

/**
 * Example 7: High Risk Concentration
 * Shows matrix with many high-severity, high-occurrence risks
 */
export function HighRiskMatrix(): React.ReactElement {
  const highRisks: RiskNode[] = [
    {
      id: 'h1',
      title: 'Critical System Failure',
      status: 'identified',
      severity: 10,
      occurrence: 10,
      detection: 1,
      rpn: 1000,
      version: '1.0',
      created_by: 'user',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_signed: false,
      linked_design_items: [],
      linked_process_items: [],
      mitigation_count: 0,
      has_open_mitigations: false,
    },
    {
      id: 'h2',
      title: 'Data Loss Event',
      status: 'identified',
      severity: 9,
      occurrence: 9,
      detection: 2,
      rpn: 162,
      version: '1.0',
      created_by: 'user',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_signed: false,
      linked_design_items: [],
      linked_process_items: [],
      mitigation_count: 0,
      has_open_mitigations: false,
    },
    {
      id: 'h3',
      title: 'Security Breach',
      status: 'identified',
      severity: 8,
      occurrence: 8,
      detection: 3,
      rpn: 192,
      version: '1.0',
      created_by: 'user',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_signed: false,
      linked_design_items: [],
      linked_process_items: [],
      mitigation_count: 0,
      has_open_mitigations: false,
    },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <h2>High Risk Concentration Matrix</h2>
      <p>Matrix showing critical and high-severity risks requiring immediate attention.</p>
      <FMEAMatrix risks={highRisks} />
    </div>
  );
}

/**
 * Example 8: Custom Styled Matrix
 * Shows matrix with custom className for styling
 */
export function CustomStyledMatrix(): React.ReactElement {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Custom Styled FMEA Matrix</h2>
      <p>Matrix with custom styling applied.</p>
      <FMEAMatrix 
        risks={sampleRisks} 
        className="custom-matrix-style"
      />
      <style>{`
        .custom-matrix-style {
          border: 3px solid #3b82f6;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}

/**
 * Example 9: Complete Interactive Example
 * Full-featured example with all handlers
 */
export function CompleteFMEAMatrix(): React.ReactElement {
  const [selectedRisk, setSelectedRisk] = React.useState<RiskNode | null>(null);
  const [selectedCell, setSelectedCell] = React.useState<{
    severity: number;
    occurrence: number;
    count: number;
  } | null>(null);

  const handleCellClick = (severity: number, occurrence: number, risks: RiskNode[]) => {
    setSelectedCell({ severity, occurrence, count: risks.length });
    setSelectedRisk(null);
  };

  const handleRiskClick = (risk: RiskNode) => {
    setSelectedRisk(risk);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Complete Interactive FMEA Matrix</h2>
      <p>Full-featured matrix with cell and risk selection.</p>
      
      <FMEAMatrix 
        risks={sampleRisks}
        onCellClick={handleCellClick}
        onRiskClick={handleRiskClick}
      />

      {selectedCell && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#f3f4f6',
          borderRadius: '6px',
        }}>
          <h3>Selected Cell</h3>
          <p>
            <strong>Severity:</strong> {selectedCell.severity}<br />
            <strong>Occurrence:</strong> {selectedCell.occurrence}<br />
            <strong>Risk Count:</strong> {selectedCell.count}
          </p>
        </div>
      )}

      {selectedRisk && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#eff6ff',
          border: '2px solid #3b82f6',
          borderRadius: '6px',
        }}>
          <h3>Selected Risk</h3>
          <p>
            <strong>Title:</strong> {selectedRisk.title}<br />
            <strong>RPN:</strong> {selectedRisk.rpn}<br />
            <strong>Severity:</strong> {selectedRisk.severity}<br />
            <strong>Occurrence:</strong> {selectedRisk.occurrence}<br />
            <strong>Detection:</strong> {selectedRisk.detection}<br />
            <strong>Status:</strong> {selectedRisk.status}
          </p>
        </div>
      )}
    </div>
  );
}

// Export all examples
export default {
  BasicFMEAMatrix,
  InteractiveFMEAMatrix,
  RiskClickableFMEAMatrix,
  MatrixWithoutLegend,
  MatrixWithoutCounts,
  EmptyFMEAMatrix,
  HighRiskMatrix,
  CustomStyledMatrix,
  CompleteFMEAMatrix,
};

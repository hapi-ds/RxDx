/**
 * MitigationTracker Example
 * Demonstrates usage of the MitigationTracker component
 */

import React from 'react';
import { MitigationTracker } from './MitigationTracker';
import type { MitigationAction } from '../../services/riskService';

export function MitigationTrackerExample(): React.ReactElement {
  const exampleMitigations: MitigationAction[] = [
    {
      id: 'mit-1',
      risk_id: 'risk-1',
      title: 'Implement Safety Interlock System',
      description: 'Add hardware safety interlock to prevent operation during maintenance mode. This will include proximity sensors and mechanical locks.',
      action_type: 'Design Change',
      status: 'in_progress',
      assigned_to: 'John Doe',
      due_date: '2024-12-31T00:00:00Z',
      expected_severity_reduction: 3,
      expected_occurrence_reduction: 2,
      expected_detection_improvement: 1,
      verification_method: 'Design Review, FMEA Re-assessment, and Physical Testing',
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 'mit-2',
      risk_id: 'risk-1',
      title: 'Update Standard Operating Procedures',
      description: 'Revise SOPs to include new safety checks and lockout/tagout procedures for maintenance activities.',
      action_type: 'Process Change',
      status: 'completed',
      assigned_to: 'Jane Smith',
      due_date: '2024-06-30T00:00:00Z',
      completed_date: '2024-06-15T00:00:00Z',
      expected_occurrence_reduction: 2,
      verification_method: 'Procedure Review and Training Verification',
      verification_result: 'Verified - All procedures updated, approved by QA, and training completed for all operators',
      created_by: 'user-2',
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-06-15T00:00:00Z',
    },
    {
      id: 'mit-3',
      risk_id: 'risk-1',
      title: 'Install Real-Time Monitoring System',
      description: 'Add real-time monitoring for critical parameters including temperature, pressure, and vibration with automated alerts.',
      action_type: 'Control Enhancement',
      status: 'planned',
      assigned_to: 'Bob Johnson',
      due_date: '2025-03-31T00:00:00Z',
      expected_detection_improvement: 4,
      verification_method: 'System Validation and Alarm Testing',
      created_by: 'user-3',
      created_at: '2024-02-01T00:00:00Z',
      updated_at: '2024-02-01T00:00:00Z',
    },
    {
      id: 'mit-4',
      risk_id: 'risk-1',
      title: 'Conduct Operator Training Program',
      description: 'Develop and deliver comprehensive training program on new safety procedures and emergency response.',
      action_type: 'Training',
      status: 'verified',
      assigned_to: 'Alice Williams',
      due_date: '2024-08-31T00:00:00Z',
      completed_date: '2024-08-20T00:00:00Z',
      expected_occurrence_reduction: 1,
      expected_detection_improvement: 2,
      verification_method: 'Training Records Review and Competency Assessment',
      verification_result: 'Verified - All operators completed training with passing scores. Competency assessments documented.',
      created_by: 'user-4',
      created_at: '2024-03-01T00:00:00Z',
      updated_at: '2024-08-25T00:00:00Z',
    },
    {
      id: 'mit-5',
      risk_id: 'risk-1',
      title: 'Upgrade Emergency Stop System',
      description: 'Replace existing emergency stop buttons with redundant system meeting latest safety standards.',
      action_type: 'Design Change',
      status: 'in_progress',
      assigned_to: 'Charlie Brown',
      due_date: '2024-11-30T00:00:00Z',
      expected_severity_reduction: 2,
      expected_detection_improvement: 1,
      verification_method: 'Safety System Validation per IEC 61508',
      created_by: 'user-5',
      created_at: '2024-04-01T00:00:00Z',
      updated_at: '2024-09-15T00:00:00Z',
    },
    {
      id: 'mit-6',
      risk_id: 'risk-1',
      title: 'Implement Redundant Power Supply',
      description: 'This mitigation was cancelled due to cost constraints and alternative solutions being more effective.',
      action_type: 'Design Change',
      status: 'cancelled',
      created_by: 'user-6',
      created_at: '2024-01-05T00:00:00Z',
      updated_at: '2024-02-20T00:00:00Z',
    },
    {
      id: 'mit-7',
      risk_id: 'risk-1',
      title: 'Overdue Mitigation Example',
      description: 'This mitigation is overdue and should be highlighted.',
      action_type: 'Process Change',
      status: 'in_progress',
      assigned_to: 'David Lee',
      due_date: '2023-12-31T00:00:00Z',
      expected_occurrence_reduction: 1,
      created_by: 'user-7',
      created_at: '2023-10-01T00:00:00Z',
      updated_at: '2023-11-15T00:00:00Z',
    },
  ];

  const handleRefresh = () => {
    console.log('Refreshing mitigations...');
    alert('Refresh functionality would reload mitigations from the API');
  };

  const handleMitigationClick = (mitigation: MitigationAction) => {
    console.log('Mitigation clicked:', mitigation);
    alert(`Clicked: ${mitigation.title}\nStatus: ${mitigation.status}`);
  };

  return (
    <div style={{ padding: '2rem', background: '#f3f4f6', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '2rem', color: '#111827' }}>
        MitigationTracker Component Examples
      </h1>

      {/* Example 1: Full Featured */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>
          Example 1: Full Featured with All Props
        </h2>
        <MitigationTracker
          riskId="risk-1"
          mitigations={exampleMitigations}
          onRefresh={handleRefresh}
          onMitigationClick={handleMitigationClick}
          showFilters={true}
        />
      </section>

      {/* Example 2: Without Filters */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>
          Example 2: Without Status Filters
        </h2>
        <MitigationTracker
          riskId="risk-1"
          mitigations={exampleMitigations.slice(0, 3)}
          showFilters={false}
        />
      </section>

      {/* Example 3: Read-Only (No Click Handler) */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>
          Example 3: Read-Only View (No Click Handler)
        </h2>
        <MitigationTracker
          riskId="risk-1"
          mitigations={exampleMitigations.filter(m => m.status === 'completed' || m.status === 'verified')}
          onRefresh={handleRefresh}
        />
      </section>

      {/* Example 4: Empty State */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>
          Example 4: Empty State
        </h2>
        <MitigationTracker
          riskId="risk-2"
          mitigations={[]}
          onRefresh={handleRefresh}
        />
      </section>

      {/* Example 5: Single Mitigation */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>
          Example 5: Single Mitigation
        </h2>
        <MitigationTracker
          riskId="risk-1"
          mitigations={[exampleMitigations[0]]}
          onMitigationClick={handleMitigationClick}
        />
      </section>

      {/* Example 6: Only Overdue Mitigations */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>
          Example 6: Overdue Mitigations
        </h2>
        <MitigationTracker
          riskId="risk-1"
          mitigations={exampleMitigations.filter(m => {
            if (!m.due_date || m.status === 'completed' || m.status === 'verified' || m.status === 'cancelled') {
              return false;
            }
            return new Date(m.due_date) < new Date();
          })}
          onRefresh={handleRefresh}
          onMitigationClick={handleMitigationClick}
        />
      </section>

      {/* Example 7: Custom Styling */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#374151' }}>
          Example 7: With Custom Class
        </h2>
        <MitigationTracker
          riskId="risk-1"
          mitigations={exampleMitigations.slice(0, 2)}
          className="custom-mitigation-tracker"
          onRefresh={handleRefresh}
        />
      </section>

      {/* Usage Notes */}
      <section style={{ 
        marginTop: '3rem', 
        padding: '1.5rem', 
        background: 'white', 
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: '#111827' }}>Usage Notes</h2>
        <ul style={{ color: '#374151', lineHeight: '1.8' }}>
          <li>
            <strong>riskId:</strong> Required. The ID of the risk these mitigations belong to.
          </li>
          <li>
            <strong>mitigations:</strong> Required. Array of mitigation actions to display.
          </li>
          <li>
            <strong>onRefresh:</strong> Optional. Callback function when refresh button is clicked.
          </li>
          <li>
            <strong>onMitigationClick:</strong> Optional. Callback function when a mitigation card is clicked.
            When provided, cards become clickable.
          </li>
          <li>
            <strong>showFilters:</strong> Optional. Default true. Controls visibility of status filter dropdown.
          </li>
          <li>
            <strong>className:</strong> Optional. Additional CSS class for custom styling.
          </li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', color: '#111827' }}>
          Features
        </h3>
        <ul style={{ color: '#374151', lineHeight: '1.8' }}>
          <li>Displays mitigation status with color-coded badges</li>
          <li>Shows assigned person, due dates, and completion dates</li>
          <li>Displays expected RPN reductions (severity, occurrence, detection)</li>
          <li>Highlights overdue mitigations with visual indicators</li>
          <li>Supports filtering by status</li>
          <li>Shows verification methods and results</li>
          <li>Provides statistics summary</li>
          <li>Responsive design for mobile and desktop</li>
          <li>Accessible with proper ARIA labels and keyboard navigation</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', color: '#111827' }}>
          Status Values
        </h3>
        <ul style={{ color: '#374151', lineHeight: '1.8' }}>
          <li><strong>planned:</strong> Mitigation is planned but not started (gray badge)</li>
          <li><strong>in_progress:</strong> Mitigation is currently being implemented (blue badge)</li>
          <li><strong>completed:</strong> Mitigation is completed but not yet verified (green badge)</li>
          <li><strong>verified:</strong> Mitigation is completed and verified (dark green badge)</li>
          <li><strong>cancelled:</strong> Mitigation was cancelled (red badge)</li>
        </ul>
      </section>
    </div>
  );
}

export default MitigationTrackerExample;

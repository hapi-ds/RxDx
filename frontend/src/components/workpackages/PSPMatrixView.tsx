import React, { useEffect } from 'react';
import { usePSPStore, type MatrixWorkpackage } from '../../stores/pspStore';
import { Spinner, ErrorMessage } from '../common';
import './PSPMatrixView.css';

// ============================================================================
// Internal Components
// ============================================================================

const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
        draft: '#6b7280',
        active: '#2563eb',
        completed: '#059669',
        archived: '#d97706',
    };
    return colors[status.toLowerCase()] || '#6b7280';
};

const WorkpackageCard: React.FC<{ wp: MatrixWorkpackage }> = ({ wp }) => (
    <div className="psp-wp-card">
        <div className="psp-wp-header">
            <span className="psp-wp-title" title={wp.name}>{wp.name}</span>
        </div>
        <div className="psp-wp-footer">
            <span className="psp-wp-id">{wp.id}</span>
            <span
                className="psp-wp-status"
                style={{ backgroundColor: getStatusColor(wp.status) }}
            >
                {wp.status}
            </span>
        </div>
    </div>
);

// ============================================================================
// Main Export
// ============================================================================

export function PSPMatrixView(): React.ReactElement {
    const {
        phases,
        departments,
        isLoading,
        error,
        fetchMatrix,
        getWorkpackagesForCell
    } = usePSPStore();

    useEffect(() => {
        // Initial fetch
        fetchMatrix();
    }, [fetchMatrix]);

    if (isLoading && phases.length === 0) {
        return (
            <div className="psp-matrix-loading">
                <Spinner size="lg" />
                <span>Loading PSP Matrix...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="psp-matrix-error">
                <ErrorMessage
                    message={error}
                    onRetry={() => fetchMatrix(true)}
                />
            </div>
        );
    }

    if (phases.length === 0 || departments.length === 0) {
        return (
            <div className="psp-matrix-empty">
                <div className="empty-state">
                    <h3>No Matrix Data Available</h3>
                    <p>Please ensure you have configured valid Project Phases connected with NEXT relationships and Organizational Departments.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="psp-matrix-container">
            <div className="psp-matrix-header-bar">
                <h2>Project Structure Plan (PSP) Matrix</h2>
                <div className="psp-legend">
                    <span>Columns (Phases) progress chronologically. Rows (Departments) determine ownership.</span>
                </div>
            </div>

            <div className="psp-table-wrapper">
                <table className="psp-table">
                    <thead>
                        <tr>
                            <th className="psp-th-corner">
                                <span className="corner-label">Department \ Phase</span>
                            </th>
                            {phases.map(phase => (
                                <th key={phase.id} className="psp-th-phase">
                                    <div className="phase-header-content">
                                        <span className="phase-name" title={phase.description}>{phase.name}</span>
                                        <span className="phase-status {phase.status.toLowerCase()}">{phase.status}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {departments.map(dept => (
                            <tr key={dept.id}>
                                <th className="psp-td-dept">
                                    <div className="dept-cell-content" title={dept.description}>
                                        {dept.name}
                                    </div>
                                </th>
                                {phases.map(phase => {
                                    const cellWorkpackages = getWorkpackagesForCell(dept.id, phase.id);

                                    return (
                                        <td key={`${dept.id}-${phase.id}`} className="psp-td-cell">
                                            <div className="psp-cell-container">
                                                {cellWorkpackages.length > 0 ? (
                                                    <div className="psp-cell-workpackages">
                                                        {cellWorkpackages.map(wp => (
                                                            <WorkpackageCard key={wp.id} wp={wp} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="psp-cell-empty">
                                                        {/* Empty cell rendering */}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PSPMatrixView;

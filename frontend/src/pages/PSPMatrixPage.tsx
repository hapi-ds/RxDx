import React from 'react';
import PSPMatrixView from '../components/workpackages/PSPMatrixView';

export function PSPMatrixPage(): React.ReactElement {
    return (
        <div className="psp-page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', backgroundColor: '#f9fafb' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div className="page-title-section">
                    <h1 className="page-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>PSP Matrix</h1>
                    <p className="page-subtitle" style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                        View Project Structure Plan with phases and departments
                    </p>
                </div>
            </div>
            <div className="page-content" style={{ flex: 1, overflow: 'auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <PSPMatrixView />
            </div>
        </div>
    );
}

export default PSPMatrixPage;

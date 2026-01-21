/**
 * PlaceholderPage component
 * Reusable component for pages under development
 * Displays page title, "Coming Soon" message, and description
 */

import React from 'react';
import { Link } from 'react-router-dom';

export interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: string;
}

export function PlaceholderPage({
  title,
  description,
  icon,
}: PlaceholderPageProps): React.ReactElement {
  return (
    <div className="placeholder-page" data-testid="placeholder-page">
      <div className="placeholder-content">
        {icon && (
          <span className="placeholder-icon" data-testid="placeholder-icon">
            {icon}
          </span>
        )}
        <h1 className="placeholder-title" data-testid="placeholder-title">
          {title}
        </h1>
        <span className="placeholder-badge" data-testid="placeholder-badge">
          Coming Soon
        </span>
        <p className="placeholder-description" data-testid="placeholder-description">
          {description}
        </p>
        <Link to="/requirements" className="placeholder-link" data-testid="placeholder-link">
          ← Back to Requirements
        </Link>
      </div>

      <style>{`
        .placeholder-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 60px);
          padding: 2rem;
          background: #f3f4f6;
        }

        .placeholder-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 480px;
          padding: 3rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .placeholder-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .placeholder-title {
          margin: 0 0 0.75rem 0;
          font-size: 1.75rem;
          font-weight: 600;
          color: #111827;
        }

        .placeholder-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          margin-bottom: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #667eea;
          background: #eef2ff;
          border-radius: 9999px;
        }

        .placeholder-description {
          margin: 0 0 1.5rem 0;
          font-size: 1rem;
          line-height: 1.6;
          color: #6b7280;
        }

        .placeholder-link {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #667eea;
          text-decoration: none;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .placeholder-link:hover {
          background: #eef2ff;
          color: #5a67d8;
        }
      `}</style>
    </div>
  );
}

export default PlaceholderPage;

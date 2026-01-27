/**
 * NavigationHeader component
 * Main application header with navigation links to all pages
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navItems } from './NavigationHeader.types';
import type { NavigationHeaderProps } from './NavigationHeader.types';

export function NavigationHeader({
  user,
  onLogout,
}: NavigationHeaderProps): React.ReactElement {
  const location = useLocation();

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <header className="nav-header" data-testid="navigation-header">
      <div className="nav-header-brand">
        <h1>RxDx</h1>
      </div>
      <nav className="nav-header-nav" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${isActive(item.path) ? 'nav-link-active' : ''}`}
            aria-current={isActive(item.path) ? 'page' : undefined}
          >
            {item.icon && <span className="nav-link-icon">{item.icon}</span>}
            <span className="nav-link-label">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="nav-header-user">
        <span className="nav-user-name">{user?.fullName || user?.email}</span>
        <button
          onClick={onLogout}
          className="nav-logout-btn"
          data-testid="logout-button"
        >
          Logout
        </button>
      </div>
      <style>{`
        .nav-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.5rem;
          background: #1f2937;
          color: white;
        }
        .nav-header-brand h1 {
          margin: 0;
          font-size: 1.25rem;
        }
        .nav-header-nav {
          display: flex;
          gap: 0.5rem;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          color: #d1d5db;
          text-decoration: none;
          font-size: 0.875rem;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .nav-link:hover {
          color: white;
          background: #374151;
        }
        .nav-link-active {
          color: white;
          background: #4b5563;
        }
        .nav-link-icon {
          font-size: 1rem;
        }
        .nav-link-label {
          display: inline;
        }
        .nav-header-user {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .nav-user-name {
          font-size: 0.875rem;
          color: #d1d5db;
        }
        .nav-logout-btn {
          padding: 0.375rem 0.75rem;
          background: transparent;
          border: 1px solid #4b5563;
          border-radius: 4px;
          color: #d1d5db;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-logout-btn:hover {
          background: #374151;
          border-color: #6b7280;
          color: white;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .nav-header {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .nav-header-nav {
            order: 3;
            width: 100%;
            overflow-x: auto;
            padding-bottom: 0.25rem;
          }
          .nav-link-label {
            display: none;
          }
          .nav-link {
            padding: 0.5rem;
          }
          .nav-link-icon {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </header>
  );
}

export default NavigationHeader;

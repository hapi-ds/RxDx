import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the application title', () => {
    render(<App />);
    expect(screen.getByText('RxDx')).toBeInTheDocument();
  });

  it('renders the login page subtitle', () => {
    render(<App />);
    // The login page shows "Project Management System" (shorter version)
    expect(screen.getByText('Project Management System')).toBeInTheDocument();
  });
});

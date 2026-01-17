import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the application title', () => {
    render(<App />);
    expect(screen.getByText('RxDx')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<App />);
    expect(
      screen.getByText('Project Management System for Regulated Industries')
    ).toBeInTheDocument();
  });
});

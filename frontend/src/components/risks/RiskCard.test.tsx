/**
 * RiskCard component tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { RiskCard } from './RiskCard';
import type { RiskNode } from '../../services/riskService';

describe('RiskCard', () => {
  const mockRisk: RiskNode = {
    id: 'risk-1',
    title: 'Test Risk',
    description: 'This is a test risk description',
    status: 'identified',
    severity: 8,
    occurrence: 6,
    detection: 4,
    rpn: 192, // 8 * 6 * 4
    risk_category: 'Safety',
    version: '1.0',
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_signed: false,
    linked_design_items: [],
    linked_process_items: [],
    mitigation_count: 2,
    has_open_mitigations: true,
  };

  it('renders risk title', () => {
    render(<RiskCard risk={mockRisk} />);
    expect(screen.getByText('Test Risk')).toBeInTheDocument();
  });

  it('renders risk description', () => {
    render(<RiskCard risk={mockRisk} />);
    expect(screen.getByText('This is a test risk description')).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const longDescription = 'A'.repeat(200);
    const riskWithLongDesc = { ...mockRisk, description: longDescription };
    render(<RiskCard risk={riskWithLongDesc} />);
    
    const description = screen.getByText(/^A+\.\.\.$/, { exact: false });
    expect(description.textContent?.length).toBeLessThan(longDescription.length);
  });

  it('renders FMEA ratings', () => {
    render(<RiskCard risk={mockRisk} />);
    
    expect(screen.getByText('Severity:')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    
    expect(screen.getByText('Occurrence:')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    
    expect(screen.getByText('Detection:')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders RPN value', () => {
    render(<RiskCard risk={mockRisk} />);
    expect(screen.getByText('RPN:')).toBeInTheDocument();
    expect(screen.getByText('192')).toBeInTheDocument();
  });

  it('renders risk level badge with correct color', () => {
    render(<RiskCard risk={mockRisk} />);
    const badge = screen.getByText('HIGH');
    expect(badge).toHaveClass('risk-level-badge');
    expect(badge).toHaveStyle({ backgroundColor: '#ea580c' });
  });

  it('renders critical risk level for high RPN', () => {
    const criticalRisk = { ...mockRisk, rpn: 250, severity: 10, occurrence: 5, detection: 5 };
    render(<RiskCard risk={criticalRisk} />);
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('renders medium risk level', () => {
    const mediumRisk = { ...mockRisk, rpn: 75, severity: 5, occurrence: 5, detection: 3 };
    render(<RiskCard risk={mediumRisk} />);
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('renders low risk level', () => {
    const lowRisk = { ...mockRisk, rpn: 24, severity: 2, occurrence: 3, detection: 4 };
    render(<RiskCard risk={lowRisk} />);
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('renders risk category when present', () => {
    render(<RiskCard risk={mockRisk} />);
    expect(screen.getByText('Category: Safety')).toBeInTheDocument();
  });

  it('does not render category when not present', () => {
    const riskWithoutCategory = { ...mockRisk, risk_category: undefined };
    render(<RiskCard risk={riskWithoutCategory} />);
    expect(screen.queryByText(/Category:/)).not.toBeInTheDocument();
  });

  it('renders risk status', () => {
    render(<RiskCard risk={mockRisk} />);
    expect(screen.getByText('identified')).toBeInTheDocument();
  });

  it('renders mitigation count', () => {
    render(<RiskCard risk={mockRisk} />);
    expect(screen.getByText('2 mitigations')).toBeInTheDocument();
  });

  it('renders singular mitigation text', () => {
    const riskWithOneMitigation = { ...mockRisk, mitigation_count: 1 };
    render(<RiskCard risk={riskWithOneMitigation} />);
    expect(screen.getByText('1 mitigation')).toBeInTheDocument();
  });

  it('does not render mitigation count when zero', () => {
    const riskWithNoMitigations = { ...mockRisk, mitigation_count: 0 };
    render(<RiskCard risk={riskWithNoMitigations} />);
    expect(screen.queryByText(/mitigation/)).not.toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const handleClick = vi.fn();
    render(<RiskCard risk={mockRisk} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(handleClick).toHaveBeenCalledWith(mockRisk);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter key is pressed', () => {
    const handleClick = vi.fn();
    render(<RiskCard risk={mockRisk} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    
    expect(handleClick).toHaveBeenCalledWith(mockRisk);
  });

  it('does not call onClick for other keys', () => {
    const handleClick = vi.fn();
    render(<RiskCard risk={mockRisk} onClick={handleClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Space' });
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies clickable class when onClick is provided', () => {
    const handleClick = vi.fn();
    const { container } = render(<RiskCard risk={mockRisk} onClick={handleClick} />);
    
    const card = container.querySelector('.risk-card');
    expect(card).toHaveClass('clickable');
  });

  it('does not apply clickable class when onClick is not provided', () => {
    const { container } = render(<RiskCard risk={mockRisk} />);
    
    const card = container.querySelector('.risk-card');
    expect(card).not.toHaveClass('clickable');
  });

  it('applies selected class when isSelected is true', () => {
    const { container } = render(<RiskCard risk={mockRisk} isSelected={true} />);
    
    const card = container.querySelector('.risk-card');
    expect(card).toHaveClass('selected');
  });

  it('does not apply selected class when isSelected is false', () => {
    const { container } = render(<RiskCard risk={mockRisk} isSelected={false} />);
    
    const card = container.querySelector('.risk-card');
    expect(card).not.toHaveClass('selected');
  });

  it('renders without onClick handler', () => {
    render(<RiskCard risk={mockRisk} />);
    
    const card = screen.queryByRole('button');
    expect(card).not.toBeInTheDocument();
  });

  it('handles missing description gracefully', () => {
    const riskWithoutDescription = { ...mockRisk, description: undefined };
    render(<RiskCard risk={riskWithoutDescription} />);
    
    expect(screen.getByText('Test Risk')).toBeInTheDocument();
    expect(screen.queryByText(/This is a test/)).not.toBeInTheDocument();
  });

  it('renders all FMEA metrics in correct order', () => {
    const { container } = render(<RiskCard risk={mockRisk} />);
    
    const metrics = container.querySelectorAll('.metric');
    expect(metrics).toHaveLength(4);
    
    expect(metrics[0].textContent).toContain('RPN:');
    expect(metrics[1].textContent).toContain('Severity:');
    expect(metrics[2].textContent).toContain('Occurrence:');
    expect(metrics[3].textContent).toContain('Detection:');
  });
});

/**
 * FMEAMatrix component tests
 * Tests for FMEA matrix visualization component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FMEAMatrix } from './FMEAMatrix';
import type { RiskNode } from '../../services/riskService';

// Mock risk data
const createMockRisk = (
  id: string,
  title: string,
  severity: number,
  occurrence: number,
  detection: number
): RiskNode => ({
  id,
  title,
  description: `Description for ${title}`,
  status: 'identified',
  severity,
  occurrence,
  detection,
  rpn: severity * occurrence * detection,
  version: '1.0',
  created_by: 'test-user',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_signed: false,
  linked_design_items: [],
  linked_process_items: [],
  mitigation_count: 0,
  has_open_mitigations: false,
});

describe('FMEAMatrix', () => {
  describe('Rendering', () => {
    it('should render empty state when no risks provided', () => {
      render(<FMEAMatrix risks={[]} />);
      
      expect(screen.getByText('No risks to display')).toBeInTheDocument();
      expect(screen.getByText(/FMEA matrix visualizes risks/)).toBeInTheDocument();
    });

    it('should render matrix title', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      render(<FMEAMatrix risks={risks} />);
      
      expect(screen.getByText('FMEA Risk Matrix')).toBeInTheDocument();
    });

    it('should render severity axis label', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      render(<FMEAMatrix risks={risks} />);
      
      expect(screen.getByText('Severity')).toBeInTheDocument();
    });

    it('should render occurrence axis label', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      render(<FMEAMatrix risks={risks} />);
      
      expect(screen.getByText('Occurrence')).toBeInTheDocument();
    });

    it('should render legend when showLegend is true', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const { container } = render(<FMEAMatrix risks={risks} showLegend={true} />);
      
      const legend = container.querySelector('.matrix-legend');
      expect(legend).toBeInTheDocument();
      expect(screen.getByText(/Risk Levels/)).toBeInTheDocument();
      expect(screen.getAllByText(/Critical/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/High/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Medium/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Low/).length).toBeGreaterThan(0);
    });

    it('should not render legend when showLegend is false', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      render(<FMEAMatrix risks={risks} showLegend={false} />);
      
      expect(screen.queryByText(/Risk Levels/)).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const { container } = render(<FMEAMatrix risks={risks} className="custom-class" />);
      
      const matrixElement = container.querySelector('.fmea-matrix');
      expect(matrixElement).toHaveClass('custom-class');
    });
  });

  describe('Statistics Display', () => {
    it('should display total risk count', () => {
      const risks = [
        createMockRisk('1', 'Risk 1', 5, 5, 5),
        createMockRisk('2', 'Risk 2', 8, 8, 8),
      ];
      render(<FMEAMatrix risks={risks} />);
      
      expect(screen.getByText('Total: 2')).toBeInTheDocument();
    });

    it('should display critical risk count', () => {
      const risks = [
        createMockRisk('1', 'Critical Risk', 10, 10, 10), // RPN = 1000 (critical)
      ];
      render(<FMEAMatrix risks={risks} />);
      
      expect(screen.getByText(/Critical: 1/)).toBeInTheDocument();
    });

    it('should display high risk count', () => {
      const risks = [
        createMockRisk('1', 'High Risk', 10, 5, 5), // RPN = 250 (critical)
        createMockRisk('2', 'High Risk 2', 5, 5, 5), // RPN = 125 (high)
      ];
      render(<FMEAMatrix risks={risks} />);
      
      expect(screen.getByText(/High: 1/)).toBeInTheDocument();
    });

    it('should display medium risk count', () => {
      const risks = [
        createMockRisk('1', 'Medium Risk', 5, 5, 2), // RPN = 50 (medium)
      ];
      render(<FMEAMatrix risks={risks} />);
      
      expect(screen.getByText(/Medium: 1/)).toBeInTheDocument();
    });

    it('should display low risk count', () => {
      const risks = [
        createMockRisk('1', 'Low Risk', 2, 2, 2), // RPN = 8 (low)
      ];
      render(<FMEAMatrix risks={risks} />);
      
      expect(screen.getByText(/Low: 1/)).toBeInTheDocument();
    });

    it('should not display zero counts', () => {
      const risks = [
        createMockRisk('1', 'Low Risk', 2, 2, 2), // RPN = 8 (low)
      ];
      render(<FMEAMatrix risks={risks} />);
      
      expect(screen.queryByText(/Critical: 0/)).not.toBeInTheDocument();
      expect(screen.queryByText(/High: 0/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Medium: 0/)).not.toBeInTheDocument();
    });
  });

  describe('Matrix Grid', () => {
    it('should render matrix cells', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const { container } = render(<FMEAMatrix risks={risks} />);
      
      const cells = container.querySelectorAll('.matrix-cell');
      expect(cells.length).toBe(100); // 10x10 matrix
    });

    it('should display risk count in cells when showRiskCount is true', () => {
      const risks = [
        createMockRisk('1', 'Risk 1', 5, 5, 5),
        createMockRisk('2', 'Risk 2', 5, 5, 5),
      ];
      const { container } = render(<FMEAMatrix risks={risks} showRiskCount={true} />);
      
      const riskCounts = container.querySelectorAll('.risk-count');
      expect(riskCounts.length).toBeGreaterThan(0);
    });

    it('should not display risk count when showRiskCount is false', () => {
      const risks = [
        createMockRisk('1', 'Risk 1', 5, 5, 5),
        createMockRisk('2', 'Risk 2', 5, 5, 5),
      ];
      const { container } = render(<FMEAMatrix risks={risks} showRiskCount={false} />);
      
      const riskCounts = container.querySelectorAll('.risk-count');
      expect(riskCounts.length).toBe(0);
    });

    it('should mark cells with risks as clickable', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCells = container.querySelectorAll('.matrix-cell.clickable');
      expect(clickableCells.length).toBeGreaterThan(0);
    });

    it('should mark empty cells as not clickable', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const { container } = render(<FMEAMatrix risks={risks} />);
      
      const emptyCells = container.querySelectorAll('.matrix-cell.empty');
      expect(emptyCells.length).toBeGreaterThan(0);
    });

    it('should apply correct color coding based on RPN', () => {
      const risks = [
        createMockRisk('1', 'Critical', 10, 10, 10), // Critical
        createMockRisk('2', 'Low', 1, 1, 1), // Low
      ];
      const { container } = render(<FMEAMatrix risks={risks} />);
      
      const cells = container.querySelectorAll('.matrix-cell.has-risks');
      expect(cells.length).toBe(2);
      
      // Check that cells have background colors
      cells.forEach(cell => {
        const bgColor = (cell as HTMLElement).style.backgroundColor;
        expect(bgColor).toBeTruthy();
      });
    });
  });

  describe('Cell Interactions', () => {
    it('should call onCellClick when cell is clicked', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.clickable');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        
        expect(onCellClick).toHaveBeenCalledTimes(1);
        expect(onCellClick).toHaveBeenCalledWith(5, 5, expect.arrayContaining([risks[0]]));
      }
    });

    it('should not call onCellClick for empty cells', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const emptyCell = container.querySelector('.matrix-cell.empty');
      expect(emptyCell).toBeTruthy();
      
      if (emptyCell) {
        fireEvent.click(emptyCell);
        expect(onCellClick).not.toHaveBeenCalled();
      }
    });

    it('should open popup when cell is clicked', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        expect(screen.getByText(/Risks at S:5 × O:5/)).toBeInTheDocument();
      }
    });

    it('should display risk details in popup', () => {
      const risks = [createMockRisk('1', 'Test Risk', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        
        expect(screen.getByText('Test Risk')).toBeInTheDocument();
        expect(screen.getByText(/RPN: 125/)).toBeInTheDocument();
      }
    });

    it('should close popup when close button is clicked', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        
        const closeButton = screen.getByLabelText('Close popup');
        fireEvent.click(closeButton);
        
        expect(screen.queryByText(/Risks at S:5 × O:5/)).not.toBeInTheDocument();
      }
    });

    it('should close popup when overlay is clicked', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        
        const overlay = container.querySelector('.cell-popup-overlay');
        expect(overlay).toBeTruthy();
        
        if (overlay) {
          fireEvent.click(overlay);
          expect(screen.queryByText(/Risks at S:5 × O:5/)).not.toBeInTheDocument();
        }
      }
    });

    it('should call onRiskClick when risk in popup is clicked', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onRiskClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onRiskClick={onRiskClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        
        const riskItem = screen.getByText('Risk 1').closest('.popup-risk-item');
        expect(riskItem).toBeTruthy();
        
        if (riskItem) {
          fireEvent.click(riskItem);
          
          expect(onRiskClick).toHaveBeenCalledTimes(1);
          expect(onRiskClick).toHaveBeenCalledWith(risks[0]);
        }
      }
    });

    it('should support keyboard navigation on cells', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.clickable') as HTMLElement;
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        clickableCell.focus();
        fireEvent.keyDown(clickableCell, { key: 'Enter' });
        
        expect(onCellClick).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Risk Distribution', () => {
    it('should correctly distribute risks across matrix cells', () => {
      const risks = [
        createMockRisk('1', 'Risk 1', 5, 5, 5),
        createMockRisk('2', 'Risk 2', 5, 5, 5),
        createMockRisk('3', 'Risk 3', 8, 8, 8),
      ];
      const { container } = render(<FMEAMatrix risks={risks} />);
      
      const cellsWithRisks = container.querySelectorAll('.matrix-cell.has-risks');
      expect(cellsWithRisks.length).toBe(2); // Two unique severity-occurrence combinations
    });

    it('should group multiple risks in same cell', () => {
      const risks = [
        createMockRisk('1', 'Risk 1', 5, 5, 5),
        createMockRisk('2', 'Risk 2', 5, 5, 8), // Same S and O, different D
      ];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} showRiskCount={true} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        
        // Both risks should appear in popup
        expect(screen.getByText('Risk 1')).toBeInTheDocument();
        expect(screen.getByText('Risk 2')).toBeInTheDocument();
      }
    });

    it('should handle risks at matrix boundaries', () => {
      const risks = [
        createMockRisk('1', 'Min Risk', 1, 1, 1),
        createMockRisk('2', 'Max Risk', 10, 10, 10),
      ];
      const { container } = render(<FMEAMatrix risks={risks} />);
      
      const cellsWithRisks = container.querySelectorAll('.matrix-cell.has-risks');
      expect(cellsWithRisks.length).toBe(2);
    });
  });

  describe('Popup Content', () => {
    it('should display RPN range in popup', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        expect(screen.getByText(/RPN Range:/)).toBeInTheDocument();
      }
    });

    it('should display risk level in popup', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        expect(screen.getByText(/Risk Level:/)).toBeInTheDocument();
      }
    });

    it('should display risk count in popup', () => {
      const risks = [
        createMockRisk('1', 'Risk 1', 5, 5, 5),
        createMockRisk('2', 'Risk 2', 5, 5, 8),
      ];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        
        expect(screen.getByText(/Risk Count:/)).toBeInTheDocument();
        // Query within the popup info section to avoid matching axis values
        const popup = container.querySelector('.cell-popup');
        expect(popup).toBeTruthy();
        if (popup) {
          const infoValue = within(popup).getAllByText('2').find(el => 
            el.classList.contains('info-value')
          );
          expect(infoValue).toBeInTheDocument();
        }
      }
    });

    it('should display risk metrics (S, O, D) in popup', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 6, 7)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        
        const popup = container.querySelector('.cell-popup');
        expect(popup).toBeTruthy();
        
        if (popup) {
          // Query within the risk-item-metrics section to avoid matching the title
          const metricsSection = popup.querySelector('.risk-item-metrics');
          expect(metricsSection).toBeTruthy();
          if (metricsSection) {
            expect(within(metricsSection).getByText(/S:5/)).toBeInTheDocument();
            expect(within(metricsSection).getByText(/O:6/)).toBeInTheDocument();
            expect(within(metricsSection).getByText(/D:7/)).toBeInTheDocument();
          }
        }
      }
    });

    it('should truncate long risk descriptions in popup', () => {
      const longDescription = 'A'.repeat(150);
      const risk = createMockRisk('1', 'Risk 1', 5, 5, 5);
      risk.description = longDescription;
      
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={[risk]} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        
        const description = container.querySelector('.risk-item-description');
        expect(description?.textContent).toBeTruthy();
        if (description?.textContent) {
          expect(description.textContent).toContain('...');
          expect(description.textContent.length).toBeLessThan(longDescription.length);
        }
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on cells', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const { container } = render(<FMEAMatrix risks={risks} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        expect(clickableCell).toHaveAttribute('aria-label');
        expect(clickableCell.getAttribute('aria-label')).toContain('Severity 5');
        expect(clickableCell.getAttribute('aria-label')).toContain('Occurrence 5');
      }
    });

    it('should have proper role attributes on clickable cells', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={vi.fn()} />);
      
      const clickableCell = container.querySelector('.matrix-cell.clickable');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        expect(clickableCell).toHaveAttribute('role', 'button');
        expect(clickableCell).toHaveAttribute('tabIndex', '0');
      }
    });

    it('should have proper ARIA label on close button', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      const onCellClick = vi.fn();
      const { container } = render(<FMEAMatrix risks={risks} onCellClick={onCellClick} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        fireEvent.click(clickableCell);
        
        const closeButton = screen.getByLabelText('Close popup');
        expect(closeButton).toBeInTheDocument();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle single risk', () => {
      const risks = [createMockRisk('1', 'Single Risk', 5, 5, 5)];
      render(<FMEAMatrix risks={risks} />);
      
      expect(screen.getByText('Total: 1')).toBeInTheDocument();
    });

    it('should handle many risks in same cell', () => {
      const risks = Array.from({ length: 10 }, (_, i) =>
        createMockRisk(`${i}`, `Risk ${i}`, 5, 5, i + 1)
      );
      const { container } = render(<FMEAMatrix risks={risks} showRiskCount={true} />);
      
      const clickableCell = container.querySelector('.matrix-cell.has-risks');
      expect(clickableCell).toBeTruthy();
      
      if (clickableCell) {
        const riskCount = clickableCell.querySelector('.risk-count');
        expect(riskCount?.textContent).toBe('10');
      }
    });

    it('should handle risks with invalid severity/occurrence gracefully', () => {
      const risk = createMockRisk('1', 'Invalid Risk', 15, 15, 5); // Out of 1-10 range
      const { container } = render(<FMEAMatrix risks={[risk]} />);
      
      // Should not crash, but risk won't be displayed in matrix
      const cellsWithRisks = container.querySelectorAll('.matrix-cell.has-risks');
      expect(cellsWithRisks.length).toBe(0);
    });

    it('should handle missing optional props', () => {
      const risks = [createMockRisk('1', 'Risk 1', 5, 5, 5)];
      
      expect(() => {
        render(<FMEAMatrix risks={risks} />);
      }).not.toThrow();
    });
  });
});

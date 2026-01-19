/**
 * Unit tests for Table component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Table, type Column } from './Table';

interface TestItem {
  id: string;
  name: string;
  email: string;
  status: string;
}

const testData: TestItem[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com', status: 'active' },
];

const columns: Column<TestItem>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'status', header: 'Status' },
];

describe('Table', () => {
  it('renders column headers', () => {
    render(
      <Table
        columns={columns}
        data={testData}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(
      <Table
        columns={columns}
        data={testData}
        keyExtractor={(item) => item.id}
      />
    );

    // Check that data is rendered
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1); // Header + data rows
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(
      <Table
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
        emptyMessage="No users found"
      />
    );

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <Table
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles row click', () => {
    const handleRowClick = vi.fn();
    render(
      <Table
        columns={columns}
        data={testData}
        keyExtractor={(item) => item.id}
        onRowClick={handleRowClick}
      />
    );

    fireEvent.click(screen.getByText('John Doe'));
    expect(handleRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('renders custom cell content', () => {
    const columnsWithRender: Column<TestItem>[] = [
      { key: 'name', header: 'Name' },
      {
        key: 'status',
        header: 'Status',
        render: (item) => <span data-testid="status-badge">{item.status.toUpperCase()}</span>,
      },
    ];

    render(
      <Table
        columns={columnsWithRender}
        data={testData}
        keyExtractor={(item) => item.id}
      />
    );

    const badges = screen.getAllByTestId('status-badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  describe('sorting', () => {
    it('shows sort indicator on sortable columns', () => {
      const sortableColumns: Column<TestItem>[] = [
        { key: 'name', header: 'Name', sortable: true },
        { key: 'email', header: 'Email' },
      ];

      render(
        <Table
          columns={sortableColumns}
          data={testData}
          keyExtractor={(item) => item.id}
        />
      );

      expect(screen.getByText('↕')).toBeInTheDocument();
    });

    it('calls onSort when sortable column is clicked', () => {
      const handleSort = vi.fn();
      const sortableColumns: Column<TestItem>[] = [
        { key: 'name', header: 'Name', sortable: true },
      ];

      render(
        <Table
          columns={sortableColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          onSort={handleSort}
        />
      );

      fireEvent.click(screen.getByText('Name'));
      expect(handleSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('shows ascending indicator when sorted', () => {
      const sortableColumns: Column<TestItem>[] = [
        { key: 'name', header: 'Name', sortable: true },
      ];

      render(
        <Table
          columns={sortableColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          sortKey="name"
          sortDirection="asc"
        />
      );

      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('shows descending indicator when sorted', () => {
      const sortableColumns: Column<TestItem>[] = [
        { key: 'name', header: 'Name', sortable: true },
      ];

      render(
        <Table
          columns={sortableColumns}
          data={testData}
          keyExtractor={(item) => item.id}
          sortKey="name"
          sortDirection="desc"
        />
      );

      expect(screen.getByText('↓')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('renders checkboxes when selectable', () => {
      render(
        <Table
          columns={columns}
          data={testData}
          keyExtractor={(item) => item.id}
          selectable={true}
          selectedKeys={new Set()}
          onSelectionChange={() => {}}
        />
      );

      // Header checkbox + 3 row checkboxes
      expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    });

    it('calls onSelectionChange when row is selected', () => {
      const handleSelectionChange = vi.fn();
      render(
        <Table
          columns={columns}
          data={testData}
          keyExtractor={(item) => item.id}
          selectable={true}
          selectedKeys={new Set()}
          onSelectionChange={handleSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // First row checkbox

      expect(handleSelectionChange).toHaveBeenCalledWith(new Set(['1']));
    });

    it('selects all when header checkbox is clicked', () => {
      const handleSelectionChange = vi.fn();
      render(
        <Table
          columns={columns}
          data={testData}
          keyExtractor={(item) => item.id}
          selectable={true}
          selectedKeys={new Set()}
          onSelectionChange={handleSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Header checkbox

      expect(handleSelectionChange).toHaveBeenCalledWith(new Set(['1', '2', '3']));
    });

    it('deselects all when all are selected and header is clicked', () => {
      const handleSelectionChange = vi.fn();
      render(
        <Table
          columns={columns}
          data={testData}
          keyExtractor={(item) => item.id}
          selectable={true}
          selectedKeys={new Set(['1', '2', '3'])}
          onSelectionChange={handleSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Header checkbox

      expect(handleSelectionChange).toHaveBeenCalledWith(new Set());
    });

    it('shows selected row styling', () => {
      render(
        <Table
          columns={columns}
          data={testData}
          keyExtractor={(item) => item.id}
          selectable={true}
          selectedKeys={new Set(['1'])}
          onSelectionChange={() => {}}
        />
      );

      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveClass('selected'); // First data row
    });
  });
});

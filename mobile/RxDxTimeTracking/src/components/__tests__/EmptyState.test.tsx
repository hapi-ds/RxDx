import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {EmptyState} from '../EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    const {getByText} = render(<EmptyState title="No tasks found" />);
    expect(getByText('No tasks found')).toBeTruthy();
  });

  it('renders with default icon', () => {
    const {getByText} = render(<EmptyState title="No tasks found" />);
    expect(getByText('📭')).toBeTruthy();
  });

  it('renders with custom icon', () => {
    const {getByText} = render(
      <EmptyState title="No tasks found" icon="🔍" />
    );
    expect(getByText('🔍')).toBeTruthy();
  });

  it('renders message when provided', () => {
    const {getByText} = render(
      <EmptyState
        title="No tasks found"
        message="Try adjusting your search criteria"
      />
    );
    expect(getByText('Try adjusting your search criteria')).toBeTruthy();
  });

  it('renders without message when not provided', () => {
    const {queryByText} = render(<EmptyState title="No tasks found" />);
    expect(queryByText('Try adjusting your search criteria')).toBeNull();
  });

  it('renders action button when actionLabel and onAction provided', () => {
    const {getByText} = render(
      <EmptyState
        title="No tasks found"
        actionLabel="Refresh"
        onAction={() => {}}
      />
    );
    expect(getByText('Refresh')).toBeTruthy();
  });

  it('does not render action button when actionLabel not provided', () => {
    const {queryByText} = render(
      <EmptyState title="No tasks found" onAction={() => {}} />
    );
    expect(queryByText('Refresh')).toBeNull();
  });

  it('does not render action button when onAction not provided', () => {
    const {queryByText} = render(
      <EmptyState title="No tasks found" actionLabel="Refresh" />
    );
    expect(queryByText('Refresh')).toBeNull();
  });

  it('calls onAction when action button pressed', () => {
    const onAction = jest.fn();
    const {getByText} = render(
      <EmptyState
        title="No tasks found"
        actionLabel="Refresh"
        onAction={onAction}
      />
    );
    
    fireEvent.press(getByText('Refresh'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility label', () => {
    const {getByLabelText} = render(
      <EmptyState
        title="No tasks found"
        message="Try adjusting your search criteria"
      />
    );
    expect(
      getByLabelText('No tasks found. Try adjusting your search criteria')
    ).toBeTruthy();
  });

  it('has correct accessibility label without message', () => {
    const {getByLabelText} = render(<EmptyState title="No tasks found" />);
    expect(getByLabelText('No tasks found. ')).toBeTruthy();
  });
});

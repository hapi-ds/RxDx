import React from 'react';
import {render} from '@testing-library/react-native';
import {LoadingSpinner} from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders without message', () => {
    const {root} = render(<LoadingSpinner />);
    expect(root).toBeTruthy();
  });

  it('renders with message', () => {
    const {getByText} = render(<LoadingSpinner message="Loading tasks..." />);
    expect(getByText('Loading tasks...')).toBeTruthy();
  });

  it('has correct accessibility label with message', () => {
    const {getByLabelText} = render(<LoadingSpinner message="Loading tasks..." />);
    expect(getByLabelText('Loading tasks...')).toBeTruthy();
  });

  it('has default accessibility label without message', () => {
    const {getByLabelText} = render(<LoadingSpinner />);
    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('renders with small size', () => {
    const {root} = render(<LoadingSpinner size="small" />);
    expect(root).toBeTruthy();
  });

  it('renders with large size', () => {
    const {root} = render(<LoadingSpinner size="large" />);
    expect(root).toBeTruthy();
  });

  it('renders with custom color', () => {
    const {root} = render(<LoadingSpinner color="#FF0000" />);
    expect(root).toBeTruthy();
  });
});

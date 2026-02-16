import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {ErrorMessage} from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('renders error message', () => {
    const {getByText} = render(
      <ErrorMessage message="Something went wrong" />
    );
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('renders without retry button when onRetry not provided', () => {
    const {queryByText} = render(
      <ErrorMessage message="Something went wrong" />
    );
    expect(queryByText('Retry')).toBeNull();
  });

  it('renders with retry button when onRetry provided', () => {
    const {getByText} = render(
      <ErrorMessage message="Something went wrong" onRetry={() => {}} />
    );
    expect(getByText('Retry')).toBeTruthy();
  });

  it('calls onRetry when retry button pressed', () => {
    const onRetry = jest.fn();
    const {getByText} = render(
      <ErrorMessage message="Something went wrong" onRetry={onRetry} />
    );
    
    fireEvent.press(getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility label', () => {
    const {getByLabelText} = render(
      <ErrorMessage message="Something went wrong" />
    );
    expect(getByLabelText('Error: Something went wrong')).toBeTruthy();
  });

  it('renders error icon', () => {
    const {getByText} = render(
      <ErrorMessage message="Something went wrong" />
    );
    expect(getByText('⚠️')).toBeTruthy();
  });
});

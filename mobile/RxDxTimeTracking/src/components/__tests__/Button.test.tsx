import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {Button} from '../Button';

describe('Button', () => {
  it('renders with title', () => {
    const {getByText} = render(<Button title="Click Me" onPress={() => {}} />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const {getByText} = render(<Button title="Click Me" onPress={onPress} />);
    
    fireEvent.press(getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const {getByText} = render(
      <Button title="Click Me" onPress={onPress} disabled={true} />
    );
    
    fireEvent.press(getByText('Click Me'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    const {queryByText, getByTestId} = render(
      <Button title="Click Me" onPress={() => {}} loading={true} />
    );
    
    expect(queryByText('Click Me')).toBeNull();
  });

  it('applies primary variant styles by default', () => {
    const {getByRole} = render(<Button title="Click Me" onPress={() => {}} />);
    const button = getByRole('button');
    expect(button.props.style).toMatchObject(
      expect.objectContaining({backgroundColor: '#007AFF'})
    );
  });

  it('applies secondary variant styles', () => {
    const {getByRole} = render(
      <Button title="Click Me" onPress={() => {}} variant="secondary" />
    );
    const button = getByRole('button');
    expect(button.props.style).toMatchObject(
      expect.objectContaining({backgroundColor: '#FFFFFF'})
    );
  });

  it('applies danger variant styles', () => {
    const {getByRole} = render(
      <Button title="Click Me" onPress={() => {}} variant="danger" />
    );
    const button = getByRole('button');
    expect(button.props.style).toMatchObject(
      expect.objectContaining({backgroundColor: '#FF3B30'})
    );
  });

  it('has correct accessibility properties', () => {
    const {getByRole} = render(
      <Button title="Click Me" onPress={() => {}} accessibilityLabel="Custom Label" />
    );
    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Custom Label');
  });

  it('sets disabled accessibility state when disabled', () => {
    const {getByRole} = render(
      <Button title="Click Me" onPress={() => {}} disabled={true} />
    );
    const button = getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});

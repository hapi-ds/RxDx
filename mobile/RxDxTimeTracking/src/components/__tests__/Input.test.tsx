import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {Input} from '../Input';

describe('Input', () => {
  it('renders with label', () => {
    const {getByText} = render(
      <Input label="Email" value="" onChangeText={() => {}} />
    );
    expect(getByText('Email')).toBeTruthy();
  });

  it('renders without label', () => {
    const {queryByText} = render(
      <Input placeholder="Enter text" value="" onChangeText={() => {}} />
    );
    expect(queryByText('Email')).toBeNull();
  });

  it('displays error message', () => {
    const {getByText} = render(
      <Input
        label="Email"
        value=""
        onChangeText={() => {}}
        error="Email is required"
      />
    );
    expect(getByText('Email is required')).toBeTruthy();
  });

  it('displays hint text when no error', () => {
    const {getByText} = render(
      <Input
        label="Email"
        value=""
        onChangeText={() => {}}
        hint="Enter your email address"
      />
    );
    expect(getByText('Enter your email address')).toBeTruthy();
  });

  it('hides hint text when error is present', () => {
    const {queryByText} = render(
      <Input
        label="Email"
        value=""
        onChangeText={() => {}}
        error="Email is required"
        hint="Enter your email address"
      />
    );
    expect(queryByText('Enter your email address')).toBeNull();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const {getByDisplayValue} = render(
      <Input label="Email" value="" onChangeText={onChangeText} />
    );
    
    const input = getByDisplayValue('');
    fireEvent.changeText(input, 'test@example.com');
    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
  });

  it('applies error styles when error is present', () => {
    const {getByDisplayValue} = render(
      <Input
        label="Email"
        value=""
        onChangeText={() => {}}
        error="Email is required"
      />
    );
    const input = getByDisplayValue('');
    expect(input.props.style).toContainEqual(
      expect.objectContaining({borderColor: '#FF3B30'})
    );
  });

  it('has correct accessibility label', () => {
    const {getByLabelText} = render(
      <Input label="Email" value="" onChangeText={() => {}} />
    );
    expect(getByLabelText('Email')).toBeTruthy();
  });

  it('uses placeholder as accessibility label when no label provided', () => {
    const {getByLabelText} = render(
      <Input placeholder="Enter email" value="" onChangeText={() => {}} />
    );
    expect(getByLabelText('Enter email')).toBeTruthy();
  });
});

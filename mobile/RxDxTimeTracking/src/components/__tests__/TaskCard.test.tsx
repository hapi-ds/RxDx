import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {TaskCard} from '../TaskCard';
import {Task} from '../../types';

describe('TaskCard', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test description',
    status: 'active',
    priority: 1,
    scheduled_start: null,
    scheduled_end: null,
    worked_sum: '2h 30m',
    has_active_tracking: false,
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders task title correctly', () => {
    const {getByText} = render(
      <TaskCard task={mockTask} onPress={mockOnPress} />,
    );
    expect(getByText('Test Task')).toBeTruthy();
  });

  it('renders task description correctly', () => {
    const {getByText} = render(
      <TaskCard task={mockTask} onPress={mockOnPress} />,
    );
    expect(getByText('Test description')).toBeTruthy();
  });

  it('renders worked sum correctly', () => {
    const {getByText} = render(
      <TaskCard task={mockTask} onPress={mockOnPress} />,
    );
    expect(getByText('2h 30m')).toBeTruthy();
  });

  it('displays default worked sum when not provided', () => {
    const taskWithoutWorkedSum = {...mockTask, worked_sum: undefined};
    const {getByText} = render(
      <TaskCard task={taskWithoutWorkedSum} onPress={mockOnPress} />,
    );
    expect(getByText('0h 0m')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const {getByText} = render(
      <TaskCard task={mockTask} onPress={mockOnPress} />,
    );
    const card = getByText('Test Task');
    fireEvent.press(card.parent?.parent || card);
    expect(mockOnPress).toHaveBeenCalledWith(mockTask);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('displays priority badge for started tasks (priority 1)', () => {
    const {getByText} = render(
      <TaskCard task={mockTask} onPress={mockOnPress} />,
    );
    expect(getByText('Started')).toBeTruthy();
  });

  it('displays priority badge for scheduled tasks (priority 2)', () => {
    const scheduledTask = {...mockTask, priority: 2};
    const {getByText} = render(
      <TaskCard task={scheduledTask} onPress={mockOnPress} />,
    );
    expect(getByText('Scheduled')).toBeTruthy();
  });

  it('does not display priority badge for other tasks (priority 3)', () => {
    const otherTask = {...mockTask, priority: 3};
    const {queryByText} = render(
      <TaskCard task={otherTask} onPress={mockOnPress} />,
    );
    expect(queryByText('Started')).toBeNull();
    expect(queryByText('Scheduled')).toBeNull();
  });

  it('displays active tracking indicator when has_active_tracking is true', () => {
    const activeTask = {...mockTask, has_active_tracking: true};
    const {getByText} = render(
      <TaskCard task={activeTask} onPress={mockOnPress} />,
    );
    expect(getByText('Tracking')).toBeTruthy();
  });

  it('does not display active tracking indicator when has_active_tracking is false', () => {
    const {queryByText} = render(
      <TaskCard task={mockTask} onPress={mockOnPress} />,
    );
    expect(queryByText('Tracking')).toBeNull();
  });

  it('truncates long descriptions', () => {
    const longDescription = 'A'.repeat(150);
    const taskWithLongDescription = {
      ...mockTask,
      description: longDescription,
    };
    const {getByText} = render(
      <TaskCard task={taskWithLongDescription} onPress={mockOnPress} />,
    );
    const displayedText = getByText(/A+\.\.\./);
    expect(displayedText).toBeTruthy();
    expect(displayedText.props.children.length).toBeLessThan(
      longDescription.length,
    );
  });

  it('handles null description', () => {
    const taskWithoutDescription = {...mockTask, description: null};
    const {queryByText} = render(
      <TaskCard task={taskWithoutDescription} onPress={mockOnPress} />,
    );
    // Should not crash and should not display description text
    expect(queryByText('Test description')).toBeNull();
  });

  it('has proper accessibility label', () => {
    const {getByLabelText} = render(
      <TaskCard task={mockTask} onPress={mockOnPress} />,
    );
    const card = getByLabelText(/Task: Test Task/);
    expect(card).toBeTruthy();
  });

  it('includes worked sum in accessibility label', () => {
    const {getByLabelText} = render(
      <TaskCard task={mockTask} onPress={mockOnPress} />,
    );
    const card = getByLabelText(/Time worked: 2h 30m/);
    expect(card).toBeTruthy();
  });

  it('includes tracking status in accessibility label when active', () => {
    const activeTask = {...mockTask, has_active_tracking: true};
    const {getByLabelText} = render(
      <TaskCard task={activeTask} onPress={mockOnPress} />,
    );
    const card = getByLabelText(/Currently tracking/);
    expect(card).toBeTruthy();
  });

  it('applies custom style prop', () => {
    const customStyle = {marginTop: 20};
    const {getByTestId} = render(
      <TaskCard task={mockTask} onPress={mockOnPress} style={customStyle} />,
    );
    const card = getByTestId('task-card');
    expect(card.props.style).toMatchObject(customStyle);
  });

  it('renders correctly with minimal task data', () => {
    const minimalTask: Task = {
      id: '2',
      title: 'Minimal Task',
      description: null,
      status: 'active',
      priority: 3,
      scheduled_start: null,
      scheduled_end: null,
    };
    const {getByText} = render(
      <TaskCard task={minimalTask} onPress={mockOnPress} />,
    );
    expect(getByText('Minimal Task')).toBeTruthy();
    expect(getByText('0h 0m')).toBeTruthy();
  });
});

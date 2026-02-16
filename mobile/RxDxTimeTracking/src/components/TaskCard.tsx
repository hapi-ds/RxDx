import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {Task} from '../types';

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
  style?: ViewStyle;
}

export const TaskCard: React.FC<TaskCardProps> = ({task, onPress, style}) => {
  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 1:
        return '#34C759'; // Green for started tasks
      case 2:
        return '#FF9500'; // Orange for scheduled tasks
      default:
        return '#8E8E93'; // Gray for other tasks
    }
  };

  const getPriorityLabel = (priority: number): string => {
    switch (priority) {
      case 1:
        return 'Started';
      case 2:
        return 'Scheduled';
      default:
        return '';
    }
  };

  const truncateDescription = (description: string | null): string => {
    if (!description) {
      return '';
    }
    const maxLength = 100;
    return description.length > maxLength
      ? `${description.substring(0, maxLength)}...`
      : description;
  };

  const priorityColor = getPriorityColor(task.priority);
  const priorityLabel = getPriorityLabel(task.priority);

  return (
    <TouchableOpacity
      testID="task-card"
      style={[styles.card, style]}
      onPress={() => onPress(task)}
      accessible={true}
      accessibilityLabel={`Task: ${task.title}. ${
        task.worked_sum ? `Time worked: ${task.worked_sum}` : ''
      }. ${task.has_active_tracking ? 'Currently tracking' : ''}`}
      accessibilityRole="button"
      accessibilityHint="Tap to start or view time tracking for this task"
      activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {task.title}
          </Text>
          {task.has_active_tracking && (
            <View style={styles.activeIndicator}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Tracking</Text>
            </View>
          )}
        </View>
        {priorityLabel && (
          <View
            style={[styles.priorityBadge, {backgroundColor: priorityColor}]}>
            <Text style={styles.priorityText}>{priorityLabel}</Text>
          </View>
        )}
      </View>

      {task.description && (
        <Text style={styles.description} numberOfLines={2}>
          {truncateDescription(task.description)}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.workedSumContainer}>
          <Text style={styles.workedSumLabel}>Time worked:</Text>
          <Text style={styles.workedSumValue}>
            {task.worked_sum || '0h 0m'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 44,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workedSumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workedSumLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 6,
  },
  workedSumValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});

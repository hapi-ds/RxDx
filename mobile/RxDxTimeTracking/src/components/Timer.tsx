import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';

interface TimerProps {
  startTime: Date;
  isRunning?: boolean;
  style?: ViewStyle;
}

/**
 * Timer component that displays elapsed time in HH:MM:SS format
 * Updates every second while running
 */
export const Timer: React.FC<TimerProps> = ({
  startTime,
  isRunning = true,
  style,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    // Calculate initial elapsed time
    const calculateElapsed = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      return Math.max(0, diff);
    };

    setElapsedSeconds(calculateElapsed());

    if (!isRunning) {
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityLabel={`Elapsed time: ${formatTime(elapsedSeconds)}`}
      accessibilityRole="timer">
      <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#007AFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
});

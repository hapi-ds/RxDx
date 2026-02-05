/**
 * Type definitions for logging
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
  componentName?: string;
  sessionId?: string;
  requestId?: string;
  error?: ErrorInfo;
}

export interface ErrorInfo {
  type: string;
  message: string;
  stack?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  checks: Record<string, CheckResult>;
  duration_seconds: number;
}

export interface CheckResult {
  status: 'healthy' | 'unhealthy';
  error?: string;
}

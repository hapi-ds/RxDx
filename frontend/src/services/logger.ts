/**
 * Centralized logging service for frontend
 * Provides structured logging with console output
 */

import type { LogEntry } from '../types/logging';
import { LogLevel } from '../types/logging';

class LoggerService {
  private sessionId: string;
  private currentLogLevel: LogLevel;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.currentLogLevel = this.getLogLevelFromEnv();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLogLevelFromEnv(): LogLevel {
    const env = import.meta.env.MODE;
    const configuredLevel = import.meta.env.VITE_LOG_LEVEL;
    
    if (configuredLevel) {
      switch (configuredLevel.toUpperCase()) {
        case 'DEBUG':
          return LogLevel.DEBUG;
        case 'INFO':
          return LogLevel.INFO;
        case 'WARN':
          return LogLevel.WARN;
        case 'ERROR':
          return LogLevel.ERROR;
        default:
          break;
      }
    }
    
    // Default: DEBUG for development, INFO for production
    return env === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  private createLogEntry(
    level: string,
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
    };

    if (context) {
      entry.context = context;
      entry.componentName = context.componentName;
      entry.requestId = context.requestId;
      
      if (context.error) {
        entry.error = {
          type: context.error.constructor?.name || 'Error',
          message: context.error.message,
          stack: context.error.stack,
        };
      }
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    // Always log to console in development
    if (import.meta.env.MODE === 'development') {
      const consoleMethod = entry.level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error';
      
      // Format for better readability in console
      const contextStr = entry.context ? JSON.stringify(entry.context, null, 2) : '';
      console[consoleMethod](
        `[${entry.level}] ${entry.message}`,
        contextStr ? `\n${contextStr}` : ''
      );
    } else {
      // In production, use structured JSON logging
      const consoleMethod = entry.level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error';
      console[consoleMethod](JSON.stringify(entry));
    }
  }

  public debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry('DEBUG', message, context);
    this.writeLog(entry);
  }

  public info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry('INFO', message, context);
    this.writeLog(entry);
  }

  public warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry('WARN', message, context);
    this.writeLog(entry);
  }

  public error(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry('ERROR', message, context);
    this.writeLog(entry);
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const logger = new LoggerService();

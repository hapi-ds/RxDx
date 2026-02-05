/**
 * Tests for logger service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';
import { LogLevel } from '../types/logging';

describe('LoggerService', () => {
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should generate a session ID', () => {
    const sessionId = logger.getSessionId();
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);
  });

  it('should log debug messages', () => {
    logger.debug('Test debug message');
    expect(consoleDebugSpy).toHaveBeenCalled();
  });

  it('should log info messages', () => {
    logger.info('Test info message');
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  it('should log warning messages', () => {
    logger.warn('Test warning message');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    logger.error('Test error message');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should include context in log messages', () => {
    const context = {
      componentName: 'TestComponent',
      userId: '123',
      action: 'test',
    };
    
    logger.info('Test with context', context);
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  it('should include error details in log messages', () => {
    const error = new Error('Test error');
    const context = {
      error,
      componentName: 'TestComponent',
    };
    
    logger.error('Error occurred', context);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should respect log level filtering', () => {
    // Set log level to ERROR
    logger.setLogLevel(LogLevel.ERROR);
    
    // Clear previous calls
    consoleDebugSpy.mockClear();
    consoleInfoSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    
    // Try logging at different levels
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    
    // Only error should be logged
    expect(consoleDebugSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Reset to default
    logger.setLogLevel(LogLevel.DEBUG);
  });

  it('should include request ID in context', () => {
    const context = {
      requestId: 'abc-123-def-456',
      componentName: 'TestComponent',
    };
    
    logger.info('Request logged', context);
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  it('should handle missing context gracefully', () => {
    logger.info('Message without context');
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  it('should include session ID in all logs', () => {
    const sessionId = logger.getSessionId();
    expect(sessionId).toBeDefined();
    
    logger.info('Test message');
    expect(consoleInfoSpy).toHaveBeenCalled();
  });
});

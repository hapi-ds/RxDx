/**
 * Tests for useVoiceCommands hook
 * Tests voice command recognition and parsing for VR hands-free operation
 * 
 * References: Requirement 16 (Dual Frontend Interface) - Voice commands for hands-free operation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useVoiceCommands,
  parseVoiceCommand,
  isSpeechRecognitionSupported,
  AVAILABLE_COMMANDS,
  DEFAULT_VOICE_CONFIG,
} from './useVoiceCommands';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock SpeechRecognition
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  maxAlternatives = 1;
  
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  onaudiostart: (() => void) | null = null;
  onaudioend: (() => void) | null = null;
  onnomatch: (() => void) | null = null;
  onsoundstart: (() => void) | null = null;
  onsoundend: (() => void) | null = null;

  start = vi.fn(() => {
    setTimeout(() => this.onstart?.(), 0);
  });
  
  stop = vi.fn(() => {
    setTimeout(() => this.onend?.(), 0);
  });
  
  abort = vi.fn();

  // Helper to simulate a speech result
  simulateResult(transcript: string, confidence: number = 0.9, isFinal: boolean = true): void {
    const event = {
      resultIndex: 0,
      results: {
        length: 1,
        item: () => ({
          length: 1,
          item: () => ({ transcript, confidence }),
          0: { transcript, confidence },
          isFinal,
        }),
        0: {
          length: 1,
          item: () => ({ transcript, confidence }),
          0: { transcript, confidence },
          isFinal,
        },
      },
    };
    this.onresult?.(event);
  }

  // Helper to simulate an error
  simulateError(error: string): void {
    const event = { error, message: error };
    this.onerror?.(event);
  }
}

// Store original window properties
const originalSpeechRecognition = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
const originalWebkitSpeechRecognition = (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

// Create a mock constructor function
function createMockSpeechRecognitionConstructor(): { new(): MockSpeechRecognition; instance: MockSpeechRecognition | null } {
  let instance: MockSpeechRecognition | null = null;
  
  function MockConstructor(this: MockSpeechRecognition) {
    instance = new MockSpeechRecognition();
    return instance;
  }
  
  MockConstructor.instance = null as MockSpeechRecognition | null;
  
  Object.defineProperty(MockConstructor, 'instance', {
    get: () => instance,
  });
  
  return MockConstructor as unknown as { new(): MockSpeechRecognition; instance: MockSpeechRecognition | null };
}

// ============================================================================
// parseVoiceCommand Tests
// ============================================================================

describe('parseVoiceCommand', () => {
  describe('select command', () => {
    it('should parse "select" command with node name', () => {
      const result = parseVoiceCommand('select authentication module', 0.9);
      
      expect(result.type).toBe('select');
      expect(result.targetNodeName).toBe('authentication module');
      expect(result.confidence).toBe(0.9);
    });

    it('should parse "choose" as select command', () => {
      const result = parseVoiceCommand('choose user login', 0.85);
      
      expect(result.type).toBe('select');
      expect(result.targetNodeName).toBe('user login');
    });

    it('should parse "pick" as select command', () => {
      const result = parseVoiceCommand('pick requirement 1', 0.8);
      
      expect(result.type).toBe('select');
      expect(result.targetNodeName).toBe('requirement 1');
    });

    it('should handle case insensitivity', () => {
      const result = parseVoiceCommand('SELECT My Node', 0.9);
      
      expect(result.type).toBe('select');
      expect(result.targetNodeName).toBe('my node');
    });
  });

  describe('zoom commands', () => {
    it('should parse "zoom in" command', () => {
      const result = parseVoiceCommand('zoom in', 0.95);
      
      expect(result.type).toBe('zoom_in');
    });

    it('should parse "zoom closer" as zoom in', () => {
      const result = parseVoiceCommand('zoom closer', 0.9);
      
      expect(result.type).toBe('zoom_in');
    });

    it('should parse "magnify" as zoom in', () => {
      const result = parseVoiceCommand('magnify', 0.85);
      
      expect(result.type).toBe('zoom_in');
    });

    it('should parse "zoom out" command', () => {
      const result = parseVoiceCommand('zoom out', 0.95);
      
      expect(result.type).toBe('zoom_out');
    });

    it('should parse "zoom away" as zoom out', () => {
      const result = parseVoiceCommand('zoom away', 0.9);
      
      expect(result.type).toBe('zoom_out');
    });

    it('should parse "shrink" as zoom out', () => {
      const result = parseVoiceCommand('shrink', 0.85);
      
      expect(result.type).toBe('zoom_out');
    });
  });

  describe('reset view command', () => {
    it('should parse "reset view" command', () => {
      const result = parseVoiceCommand('reset view', 0.9);
      
      expect(result.type).toBe('reset_view');
    });

    it('should parse "reset camera" command', () => {
      const result = parseVoiceCommand('reset camera', 0.9);
      
      expect(result.type).toBe('reset_view');
    });

    it('should parse "default view" command', () => {
      const result = parseVoiceCommand('default view', 0.85);
      
      expect(result.type).toBe('reset_view');
    });

    it('should parse "home" command', () => {
      const result = parseVoiceCommand('home', 0.9);
      
      expect(result.type).toBe('reset_view');
    });

    it('should parse "center" command', () => {
      const result = parseVoiceCommand('center', 0.9);
      
      expect(result.type).toBe('reset_view');
    });
  });

  describe('show command', () => {
    it('should parse "show requirements" command', () => {
      const result = parseVoiceCommand('show requirements', 0.9);
      
      expect(result.type).toBe('show');
      expect(result.nodeType).toBe('requirement');
    });

    it('should parse "show tasks" command', () => {
      const result = parseVoiceCommand('show tasks', 0.9);
      
      expect(result.type).toBe('show');
      expect(result.nodeType).toBe('task');
    });

    it('should parse "show tests" command', () => {
      const result = parseVoiceCommand('show tests', 0.9);
      
      expect(result.type).toBe('show');
      expect(result.nodeType).toBe('test');
    });

    it('should parse "show risks" command', () => {
      const result = parseVoiceCommand('show risks', 0.9);
      
      expect(result.type).toBe('show');
      expect(result.nodeType).toBe('risk');
    });

    it('should parse "show all" command', () => {
      const result = parseVoiceCommand('show all', 0.9);
      
      expect(result.type).toBe('show');
      expect(result.nodeType).toBe('all');
    });

    it('should parse "display" as show command', () => {
      const result = parseVoiceCommand('display requirements', 0.9);
      
      expect(result.type).toBe('show');
      expect(result.nodeType).toBe('requirement');
    });

    it('should handle node type aliases', () => {
      const result = parseVoiceCommand('show reqs', 0.9);
      
      expect(result.type).toBe('show');
      expect(result.nodeType).toBe('requirement');
    });
  });

  describe('hide command', () => {
    it('should parse "hide requirements" command', () => {
      const result = parseVoiceCommand('hide requirements', 0.9);
      
      expect(result.type).toBe('hide');
      expect(result.nodeType).toBe('requirement');
    });

    it('should parse "hide tasks" command', () => {
      const result = parseVoiceCommand('hide tasks', 0.9);
      
      expect(result.type).toBe('hide');
      expect(result.nodeType).toBe('task');
    });

    it('should parse "conceal" as hide command', () => {
      const result = parseVoiceCommand('conceal tests', 0.9);
      
      expect(result.type).toBe('hide');
      expect(result.nodeType).toBe('test');
    });
  });

  describe('help command', () => {
    it('should parse "help" command', () => {
      const result = parseVoiceCommand('help', 0.9);
      
      expect(result.type).toBe('help');
    });

    it('should parse "commands" as help', () => {
      const result = parseVoiceCommand('commands', 0.9);
      
      expect(result.type).toBe('help');
    });

    it('should parse "what can I say" as help', () => {
      const result = parseVoiceCommand('what can I say', 0.9);
      
      expect(result.type).toBe('help');
    });
  });

  describe('unknown commands', () => {
    it('should return unknown for unrecognized commands', () => {
      const result = parseVoiceCommand('do something random', 0.9);
      
      expect(result.type).toBe('unknown');
      expect(result.rawTranscript).toBe('do something random');
    });

    it('should preserve raw transcript for unknown commands', () => {
      const result = parseVoiceCommand('Hello World', 0.8);
      
      expect(result.type).toBe('unknown');
      expect(result.rawTranscript).toBe('Hello World');
    });
  });

  describe('command metadata', () => {
    it('should include confidence score', () => {
      const result = parseVoiceCommand('zoom in', 0.75);
      
      expect(result.confidence).toBe(0.75);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const result = parseVoiceCommand('zoom in', 0.9);
      const after = Date.now();
      
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });
});

// ============================================================================
// isSpeechRecognitionSupported Tests
// ============================================================================

describe('isSpeechRecognitionSupported', () => {
  beforeEach(() => {
    // Clear any existing mocks
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  });

  afterEach(() => {
    // Restore original values
    if (originalSpeechRecognition) {
      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = originalSpeechRecognition;
    }
    if (originalWebkitSpeechRecognition) {
      (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = originalWebkitSpeechRecognition;
    }
  });

  it('should return true when SpeechRecognition is available', () => {
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = MockSpeechRecognition;
    
    expect(isSpeechRecognitionSupported()).toBe(true);
  });

  it('should return true when webkitSpeechRecognition is available', () => {
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = MockSpeechRecognition;
    
    expect(isSpeechRecognitionSupported()).toBe(true);
  });

  it('should return false when neither is available', () => {
    expect(isSpeechRecognitionSupported()).toBe(false);
  });
});

// ============================================================================
// useVoiceCommands Hook Tests
// ============================================================================

describe('useVoiceCommands', () => {
  let mockConstructor: { new(): MockSpeechRecognition; instance: MockSpeechRecognition | null };

  beforeEach(() => {
    mockConstructor = createMockSpeechRecognitionConstructor();
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = mockConstructor;
    
    // Mock navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useVoiceCommands());
      
      expect(result.current.isSupported).toBe(true);
      expect(result.current.isListening).toBe(false);
      expect(result.current.state).toBe('idle');
      expect(result.current.lastCommand).toBeNull();
      expect(result.current.commandHistory).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should detect when speech recognition is not supported', () => {
      delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
      
      const { result } = renderHook(() => useVoiceCommands());
      
      expect(result.current.isSupported).toBe(false);
      expect(result.current.state).toBe('not_supported');
    });
  });

  describe('startListening', () => {
    it('should start listening when called', async () => {
      const { result } = renderHook(() => useVoiceCommands());
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      expect(instance?.start).toHaveBeenCalled();
    });

    it('should request microphone permission', async () => {
      const { result } = renderHook(() => useVoiceCommands());
      
      await act(async () => {
        await result.current.startListening();
      });
      
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });
  });

  describe('stopListening', () => {
    it('should stop listening when called', async () => {
      const { result } = renderHook(() => useVoiceCommands());
      
      await act(async () => {
        await result.current.startListening();
      });
      
      act(() => {
        result.current.stopListening();
      });
      
      const instance = mockConstructor.instance;
      expect(instance?.stop).toHaveBeenCalled();
    });
  });

  describe('toggleListening', () => {
    it('should toggle from not listening to listening', async () => {
      const { result } = renderHook(() => useVoiceCommands());
      
      await act(async () => {
        await result.current.toggleListening();
      });
      
      const instance = mockConstructor.instance;
      expect(instance?.start).toHaveBeenCalled();
    });
  });

  describe('command callbacks', () => {
    it('should call onSelectNode callback for select command', async () => {
      const onSelectNode = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onSelectNode }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('select my node', 0.9);
      });
      
      expect(onSelectNode).toHaveBeenCalledWith('my node');
    });

    it('should call onZoomIn callback for zoom in command', async () => {
      const onZoomIn = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onZoomIn }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('zoom in', 0.9);
      });
      
      expect(onZoomIn).toHaveBeenCalled();
    });

    it('should call onZoomOut callback for zoom out command', async () => {
      const onZoomOut = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onZoomOut }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('zoom out', 0.9);
      });
      
      expect(onZoomOut).toHaveBeenCalled();
    });

    it('should call onResetView callback for reset view command', async () => {
      const onResetView = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onResetView }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('reset view', 0.9);
      });
      
      expect(onResetView).toHaveBeenCalled();
    });

    it('should call onShowNodeType callback for show command', async () => {
      const onShowNodeType = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onShowNodeType }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('show requirements', 0.9);
      });
      
      expect(onShowNodeType).toHaveBeenCalledWith('requirement');
    });

    it('should call onHideNodeType callback for hide command', async () => {
      const onHideNodeType = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onHideNodeType }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('hide tasks', 0.9);
      });
      
      expect(onHideNodeType).toHaveBeenCalledWith('task');
    });

    it('should call onHelp callback for help command', async () => {
      const onHelp = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onHelp }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('help', 0.9);
      });
      
      expect(onHelp).toHaveBeenCalled();
    });

    it('should call onCommand callback for any recognized command', async () => {
      const onCommand = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onCommand }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('zoom in', 0.9);
      });
      
      expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({
        type: 'zoom_in',
        rawTranscript: 'zoom in',
      }));
    });
  });

  describe('confidence threshold', () => {
    it('should ignore commands below confidence threshold', async () => {
      const onZoomIn = vi.fn();
      const { result } = renderHook(() => 
        useVoiceCommands({ onZoomIn }, { confidenceThreshold: 0.8 })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('zoom in', 0.5); // Below threshold
      });
      
      expect(onZoomIn).not.toHaveBeenCalled();
    });

    it('should accept commands at or above confidence threshold', async () => {
      const onZoomIn = vi.fn();
      const { result } = renderHook(() => 
        useVoiceCommands({ onZoomIn }, { confidenceThreshold: 0.8 })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('zoom in', 0.85);
      });
      
      expect(onZoomIn).toHaveBeenCalled();
    });
  });

  describe('command history', () => {
    it('should maintain command history', async () => {
      const { result } = renderHook(() => useVoiceCommands());
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('zoom in', 0.9);
      });
      
      await act(async () => {
        instance?.simulateResult('zoom out', 0.9);
      });
      
      expect(result.current.commandHistory).toHaveLength(2);
      expect(result.current.commandHistory[0].type).toBe('zoom_in');
      expect(result.current.commandHistory[1].type).toBe('zoom_out');
    });

    it('should update lastCommand', async () => {
      const { result } = renderHook(() => useVoiceCommands());
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('zoom in', 0.9);
      });
      
      expect(result.current.lastCommand?.type).toBe('zoom_in');
    });

    it('should clear history when clearHistory is called', async () => {
      const { result } = renderHook(() => useVoiceCommands());
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateResult('zoom in', 0.9);
      });
      
      act(() => {
        result.current.clearHistory();
      });
      
      expect(result.current.commandHistory).toHaveLength(0);
      expect(result.current.lastCommand).toBeNull();
    });
  });

  describe('getAvailableCommands', () => {
    it('should return list of available commands', () => {
      const { result } = renderHook(() => useVoiceCommands());
      
      const commands = result.current.getAvailableCommands();
      
      expect(commands).toContain('select [name]');
      expect(commands).toContain('zoom in');
      expect(commands).toContain('zoom out');
      expect(commands).toContain('reset view');
      expect(commands).toContain('help');
    });
  });

  describe('error handling', () => {
    it('should handle permission denied error', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onError }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateError('not-allowed');
      });
      
      // Wait for state update - error handling sets hasPermission to false
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false);
      });
      expect(onError).toHaveBeenCalledWith('not-allowed');
    });

    it('should handle audio capture error', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onError }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      const instance = mockConstructor.instance;
      await act(async () => {
        instance?.simulateError('audio-capture');
      });
      
      // Wait for error callback to be called
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('audio-capture');
      });
    });
  });
});

// ============================================================================
// AVAILABLE_COMMANDS Tests
// ============================================================================

describe('AVAILABLE_COMMANDS', () => {
  it('should contain all expected commands', () => {
    expect(AVAILABLE_COMMANDS).toHaveProperty('select [name]');
    expect(AVAILABLE_COMMANDS).toHaveProperty('zoom in');
    expect(AVAILABLE_COMMANDS).toHaveProperty('zoom out');
    expect(AVAILABLE_COMMANDS).toHaveProperty('reset view');
    expect(AVAILABLE_COMMANDS).toHaveProperty('show requirements');
    expect(AVAILABLE_COMMANDS).toHaveProperty('show tasks');
    expect(AVAILABLE_COMMANDS).toHaveProperty('show tests');
    expect(AVAILABLE_COMMANDS).toHaveProperty('show risks');
    expect(AVAILABLE_COMMANDS).toHaveProperty('show all');
    expect(AVAILABLE_COMMANDS).toHaveProperty('hide requirements');
    expect(AVAILABLE_COMMANDS).toHaveProperty('hide tasks');
    expect(AVAILABLE_COMMANDS).toHaveProperty('hide tests');
    expect(AVAILABLE_COMMANDS).toHaveProperty('hide risks');
    expect(AVAILABLE_COMMANDS).toHaveProperty('help');
  });

  it('should have descriptions for all commands', () => {
    Object.values(AVAILABLE_COMMANDS).forEach(description => {
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// DEFAULT_VOICE_CONFIG Tests
// ============================================================================

describe('DEFAULT_VOICE_CONFIG', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_VOICE_CONFIG.language).toBe('en-US');
    expect(DEFAULT_VOICE_CONFIG.continuous).toBe(true);
    expect(DEFAULT_VOICE_CONFIG.interimResults).toBe(false);
    expect(DEFAULT_VOICE_CONFIG.maxAlternatives).toBe(3);
    expect(DEFAULT_VOICE_CONFIG.confidenceThreshold).toBe(0.5);
    expect(DEFAULT_VOICE_CONFIG.autoRestart).toBe(true);
    expect(DEFAULT_VOICE_CONFIG.autoRestartDelay).toBe(100);
  });
});

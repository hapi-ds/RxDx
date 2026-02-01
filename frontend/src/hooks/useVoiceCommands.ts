/**
 * useVoiceCommands Hook
 * Provides voice command recognition for hands-free VR operation
 * Uses the Web Speech API for speech recognition
 * 
 * Supported Commands:
 * - "select [node name]" - Select a node by name
 * - "zoom in" / "zoom out" - Adjust view
 * - "reset view" - Reset camera to default position
 * - "show [type]" - Filter nodes by type (requirements, tasks, tests, risks)
 * - "hide [type]" - Hide nodes by type
 * - "help" - Show available commands
 * 
 * References: Requirement 16 (Dual Frontend Interface) - Voice commands for hands-free operation
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Voice command types supported by the system
 */
export type VoiceCommandType =
  | 'select'
  | 'zoom_in'
  | 'zoom_out'
  | 'reset_view'
  | 'show'
  | 'hide'
  | 'help'
  | 'unknown';

/**
 * Node types that can be filtered
 */
export type FilterableNodeType = 'requirement' | 'task' | 'test' | 'risk' | 'document' | 'all';

/**
 * Parsed voice command result
 */
export interface ParsedVoiceCommand {
  /** The type of command recognized */
  type: VoiceCommandType;
  /** The raw transcript from speech recognition */
  rawTranscript: string;
  /** Target node name for select command */
  targetNodeName?: string;
  /** Node type for show/hide commands */
  nodeType?: FilterableNodeType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Timestamp when command was recognized */
  timestamp: number;
}

/**
 * Voice recognition state
 */
export type VoiceRecognitionState = 
  | 'idle'           // Not listening
  | 'listening'      // Actively listening for commands
  | 'processing'     // Processing recognized speech
  | 'error'          // Error occurred
  | 'not_supported'; // Browser doesn't support speech recognition

/**
 * Voice command callback handlers
 */
export interface VoiceCommandCallbacks {
  /** Called when a node should be selected by name */
  onSelectNode?: (nodeName: string) => void;
  /** Called when zoom in is requested */
  onZoomIn?: () => void;
  /** Called when zoom out is requested */
  onZoomOut?: () => void;
  /** Called when view reset is requested */
  onResetView?: () => void;
  /** Called when nodes of a type should be shown */
  onShowNodeType?: (nodeType: FilterableNodeType) => void;
  /** Called when nodes of a type should be hidden */
  onHideNodeType?: (nodeType: FilterableNodeType) => void;
  /** Called when help is requested */
  onHelp?: () => void;
  /** Called when any command is recognized (for logging/feedback) */
  onCommand?: (command: ParsedVoiceCommand) => void;
  /** Called when recognition state changes */
  onStateChange?: (state: VoiceRecognitionState) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
}

/**
 * Voice commands hook configuration
 */
export interface VoiceCommandsConfig {
  /** Language for speech recognition (default: 'en-US') */
  language?: string;
  /** Whether to use continuous recognition (default: true for VR) */
  continuous?: boolean;
  /** Whether to return interim results (default: false) */
  interimResults?: boolean;
  /** Maximum alternatives to consider (default: 3) */
  maxAlternatives?: number;
  /** Minimum confidence threshold (default: 0.5) */
  confidenceThreshold?: number;
  /** Auto-restart recognition after it stops (default: true) */
  autoRestart?: boolean;
  /** Delay before auto-restart in ms (default: 100) */
  autoRestartDelay?: number;
}

/**
 * Voice commands hook return type
 */
export interface UseVoiceCommandsReturn {
  /** Current recognition state */
  state: VoiceRecognitionState;
  /** Whether voice recognition is supported */
  isSupported: boolean;
  /** Whether currently listening */
  isListening: boolean;
  /** Last recognized command */
  lastCommand: ParsedVoiceCommand | null;
  /** Command history */
  commandHistory: ParsedVoiceCommand[];
  /** Current error message */
  error: string | null;
  /** Whether microphone permission is granted */
  hasPermission: boolean | null;
  /** Start listening for voice commands */
  startListening: () => Promise<void>;
  /** Stop listening for voice commands */
  stopListening: () => void;
  /** Toggle listening state */
  toggleListening: () => Promise<void>;
  /** Request microphone permission */
  requestPermission: () => Promise<boolean>;
  /** Clear command history */
  clearHistory: () => void;
  /** Get available commands list */
  getAvailableCommands: () => string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration for voice commands
 */
export const DEFAULT_VOICE_CONFIG: Required<VoiceCommandsConfig> = {
  language: 'en-US',
  continuous: true,
  interimResults: false,
  maxAlternatives: 3,
  confidenceThreshold: 0.5,
  autoRestart: true,
  autoRestartDelay: 100,
};

/**
 * Available voice commands with descriptions
 */
export const AVAILABLE_COMMANDS: Record<string, string> = {
  'select [name]': 'Select a node by its name',
  'zoom in': 'Zoom the camera in',
  'zoom out': 'Zoom the camera out',
  'reset view': 'Reset camera to default position',
  'show requirements': 'Show requirement nodes',
  'show tasks': 'Show task nodes',
  'show tests': 'Show test nodes',
  'show risks': 'Show risk nodes',
  'show all': 'Show all nodes',
  'hide requirements': 'Hide requirement nodes',
  'hide tasks': 'Hide task nodes',
  'hide tests': 'Hide test nodes',
  'hide risks': 'Hide risk nodes',
  'help': 'Show available commands',
};

/**
 * Node type aliases for flexible recognition
 */
const NODE_TYPE_ALIASES: Record<string, FilterableNodeType> = {
  'requirement': 'requirement',
  'requirements': 'requirement',
  'req': 'requirement',
  'reqs': 'requirement',
  'task': 'task',
  'tasks': 'task',
  'test': 'test',
  'tests': 'test',
  'testing': 'test',
  'risk': 'risk',
  'risks': 'risk',
  'document': 'document',
  'documents': 'document',
  'doc': 'document',
  'docs': 'document',
  'all': 'all',
  'everything': 'all',
};

// ============================================================================
// Speech Recognition Type Definitions
// ============================================================================

/**
 * SpeechRecognition interface for TypeScript
 * Web Speech API types are not fully included in standard TypeScript lib
 */
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the SpeechRecognition constructor (handles vendor prefixes)
 */
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  
  // Standard API
  if ('SpeechRecognition' in window) {
    return (window as unknown as { SpeechRecognition: SpeechRecognitionConstructor }).SpeechRecognition;
  }
  
  // Webkit prefix (Chrome, Edge, Safari)
  if ('webkitSpeechRecognition' in window) {
    return (window as unknown as { webkitSpeechRecognition: SpeechRecognitionConstructor }).webkitSpeechRecognition;
  }
  
  return null;
}

/**
 * Check if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== null;
}

/**
 * Parse a transcript into a voice command
 */
export function parseVoiceCommand(transcript: string, confidence: number): ParsedVoiceCommand {
  const normalizedTranscript = transcript.toLowerCase().trim();
  const timestamp = Date.now();
  
  // Base command object
  const baseCommand: ParsedVoiceCommand = {
    type: 'unknown',
    rawTranscript: transcript,
    confidence,
    timestamp,
  };

  // Check for "select" command
  const selectMatch = normalizedTranscript.match(/^(?:select|choose|pick)\s+(.+)$/);
  if (selectMatch) {
    return {
      ...baseCommand,
      type: 'select',
      targetNodeName: selectMatch[1].trim(),
    };
  }

  // Check for "zoom in" command
  if (/^(?:zoom\s*in|zoom\s*closer|magnify|enlarge)$/.test(normalizedTranscript)) {
    return {
      ...baseCommand,
      type: 'zoom_in',
    };
  }

  // Check for "zoom out" command
  if (/^(?:zoom\s*out|zoom\s*away|shrink|reduce)$/.test(normalizedTranscript)) {
    return {
      ...baseCommand,
      type: 'zoom_out',
    };
  }

  // Check for "reset view" command
  if (/^(?:reset\s*(?:view|camera)|default\s*view|home|center)$/.test(normalizedTranscript)) {
    return {
      ...baseCommand,
      type: 'reset_view',
    };
  }

  // Check for "show" command
  const showMatch = normalizedTranscript.match(/^(?:show|display|reveal)\s+(.+)$/);
  if (showMatch) {
    const typeStr = showMatch[1].trim();
    const nodeType = NODE_TYPE_ALIASES[typeStr];
    if (nodeType) {
      return {
        ...baseCommand,
        type: 'show',
        nodeType,
      };
    }
  }

  // Check for "hide" command
  const hideMatch = normalizedTranscript.match(/^(?:hide|conceal|remove)\s+(.+)$/);
  if (hideMatch) {
    const typeStr = hideMatch[1].trim();
    const nodeType = NODE_TYPE_ALIASES[typeStr];
    if (nodeType) {
      return {
        ...baseCommand,
        type: 'hide',
        nodeType,
      };
    }
  }

  // Check for "help" command
  if (/^(?:help|commands|what\s*can\s*(?:i|you)\s*(?:say|do))$/.test(normalizedTranscript)) {
    return {
      ...baseCommand,
      type: 'help',
    };
  }

  return baseCommand;
}

// ============================================================================
// useVoiceCommands Hook
// ============================================================================

/**
 * Custom hook for voice command recognition in VR mode
 * 
 * @param callbacks - Callback handlers for different voice commands
 * @param config - Configuration options for speech recognition
 * @returns Voice command state and control functions
 * 
 * @example
 * ```tsx
 * const { isListening, startListening, stopListening } = useVoiceCommands({
 *   onSelectNode: (name) => selectNodeByName(name),
 *   onZoomIn: () => camera.zoomIn(),
 *   onZoomOut: () => camera.zoomOut(),
 *   onResetView: () => camera.reset(),
 * });
 * ```
 */
export function useVoiceCommands(
  callbacks: VoiceCommandCallbacks = {},
  config: VoiceCommandsConfig = {}
): UseVoiceCommandsReturn {
  // Merge config with defaults
  const mergedConfig: Required<VoiceCommandsConfig> = {
    ...DEFAULT_VOICE_CONFIG,
    ...config,
  };

  // State
  const [state, setState] = useState<VoiceRecognitionState>(() => {
    const supported = isSpeechRecognitionSupported();
    return supported ? 'idle' : 'not_supported';
  });
  const isSupported = isSpeechRecognitionSupported();
  const [lastCommand, setLastCommand] = useState<ParsedVoiceCommand | null>(null);
  const [commandHistory, setCommandHistory] = useState<ParsedVoiceCommand[]>([]);
  const [error, setError] = useState<string | null>(() => {
    const supported = isSpeechRecognitionSupported();
    return supported ? null : 'Speech recognition is not supported in this browser';
  });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const shouldRestartRef = useRef<boolean>(false);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  /**
   * Handle recognized speech result
   */
  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    const results = event.results;
    
    for (let i = event.resultIndex; i < results.length; i++) {
      const result = results[i];
      
      if (result.isFinal) {
        const alternative = result[0];
        const transcript = alternative.transcript;
        const confidence = alternative.confidence;

        // Parse the command
        const command = parseVoiceCommand(transcript, confidence);

        // Check confidence threshold
        if (confidence < mergedConfig.confidenceThreshold) {
          console.log(`[VoiceCommands] Low confidence (${confidence.toFixed(2)}): "${transcript}"`);
          continue;
        }

        console.log(`[VoiceCommands] Recognized: "${transcript}" (${confidence.toFixed(2)}) -> ${command.type}`);

        // Update state
        setLastCommand(command);
        setCommandHistory(prev => [...prev.slice(-19), command]); // Keep last 20 commands

        // Call general command callback
        callbacksRef.current.onCommand?.(command);

        // Execute command-specific callback
        switch (command.type) {
          case 'select':
            if (command.targetNodeName) {
              callbacksRef.current.onSelectNode?.(command.targetNodeName);
            }
            break;
          case 'zoom_in':
            callbacksRef.current.onZoomIn?.();
            break;
          case 'zoom_out':
            callbacksRef.current.onZoomOut?.();
            break;
          case 'reset_view':
            callbacksRef.current.onResetView?.();
            break;
          case 'show':
            if (command.nodeType) {
              callbacksRef.current.onShowNodeType?.(command.nodeType);
            }
            break;
          case 'hide':
            if (command.nodeType) {
              callbacksRef.current.onHideNodeType?.(command.nodeType);
            }
            break;
          case 'help':
            callbacksRef.current.onHelp?.();
            break;
          default:
            console.log(`[VoiceCommands] Unknown command: "${transcript}"`);
        }
      }
    }
  }, [mergedConfig.confidenceThreshold]);

  /**
   * Handle recognition error
   */
  const handleError = useCallback((event: SpeechRecognitionErrorEvent) => {
    const errorMessage = event.error;
    console.error(`[VoiceCommands] Error: ${errorMessage}`);

    switch (errorMessage) {
      case 'not-allowed':
        setError('Microphone access denied. Please grant permission.');
        setHasPermission(false);
        setState('error');
        break;
      case 'no-speech':
        // This is normal, don't treat as error
        console.log('[VoiceCommands] No speech detected');
        break;
      case 'audio-capture':
        setError('No microphone found. Please connect a microphone.');
        setState('error');
        break;
      case 'network':
        setError('Network error. Speech recognition requires internet connection.');
        setState('error');
        break;
      case 'aborted':
        // User or system aborted, not an error
        break;
      default:
        setError(`Speech recognition error: ${errorMessage}`);
        setState('error');
    }

    callbacksRef.current.onError?.(errorMessage);
  }, []);

  /**
   * Handle recognition end
   */
  const handleEnd = useCallback(() => {
    console.log('[VoiceCommands] Recognition ended');
    isListeningRef.current = false;

    // Auto-restart if configured and should restart
    if (mergedConfig.autoRestart && shouldRestartRef.current && state !== 'error') {
      setTimeout(() => {
        if (shouldRestartRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            isListeningRef.current = true;
            console.log('[VoiceCommands] Auto-restarted');
          } catch (e) {
            console.error('[VoiceCommands] Auto-restart failed:', e);
          }
        }
      }, mergedConfig.autoRestartDelay);
    } else {
      setState('idle');
      callbacksRef.current.onStateChange?.('idle');
    }
  }, [mergedConfig.autoRestart, mergedConfig.autoRestartDelay, state]);

  /**
   * Initialize speech recognition
   */
  const initRecognition = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return null;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = mergedConfig.continuous;
    recognition.interimResults = mergedConfig.interimResults;
    recognition.lang = mergedConfig.language;
    recognition.maxAlternatives = mergedConfig.maxAlternatives;

    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;

    recognition.onstart = () => {
      console.log('[VoiceCommands] Recognition started');
      setState('listening');
      callbacksRef.current.onStateChange?.('listening');
    };

    recognition.onspeechstart = () => {
      console.log('[VoiceCommands] Speech detected');
      setState('processing');
      callbacksRef.current.onStateChange?.('processing');
    };

    recognition.onspeechend = () => {
      console.log('[VoiceCommands] Speech ended');
      setState('listening');
      callbacksRef.current.onStateChange?.('listening');
    };

    return recognition;
  }, [
    mergedConfig.continuous,
    mergedConfig.interimResults,
    mergedConfig.language,
    mergedConfig.maxAlternatives,
    handleResult,
    handleError,
    handleEnd,
  ]);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('[VoiceCommands] Permission denied:', err);
      setHasPermission(false);
      setError('Microphone permission denied');
      return false;
    }
  }, []);

  /**
   * Start listening for voice commands
   */
  const startListening = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setError('Speech recognition is not supported');
      return;
    }

    if (isListeningRef.current) {
      console.log('[VoiceCommands] Already listening');
      return;
    }

    // Request permission if not already granted
    if (hasPermission === null || hasPermission === false) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    // Initialize recognition if needed
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (!recognitionRef.current) {
      setError('Failed to initialize speech recognition');
      return;
    }

    try {
      shouldRestartRef.current = true;
      recognitionRef.current.start();
      isListeningRef.current = true;
      setError(null);
    } catch (err) {
      console.error('[VoiceCommands] Start failed:', err);
      setError('Failed to start speech recognition');
    }
  }, [isSupported, hasPermission, requestPermission, initRecognition]);

  /**
   * Stop listening for voice commands
   */
  const stopListening = useCallback((): void => {
    shouldRestartRef.current = false;
    
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('[VoiceCommands] Stop failed:', err);
      }
    }
    
    isListeningRef.current = false;
    setState('idle');
    callbacksRef.current.onStateChange?.('idle');
  }, []);

  /**
   * Toggle listening state
   */
  const toggleListening = useCallback(async (): Promise<void> => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      await startListening();
    }
  }, [startListening, stopListening]);

  /**
   * Clear command history
   */
  const clearHistory = useCallback((): void => {
    setCommandHistory([]);
    setLastCommand(null);
  }, []);

  /**
   * Get list of available commands
   */
  const getAvailableCommands = useCallback((): string[] => {
    return Object.keys(AVAILABLE_COMMANDS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return {
    state,
    isSupported,
    isListening: state === 'listening' || state === 'processing',
    lastCommand,
    commandHistory,
    error,
    hasPermission,
    startListening,
    stopListening,
    toggleListening,
    requestPermission,
    clearHistory,
    getAvailableCommands,
  };
}

export default useVoiceCommands;

// ProspectCallState.ts - State management for prospect calls
import { Persona } from '../../types/persona';

export type CallStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'reconnecting' | 'error';

export interface ProspectCallState {
  status: CallStatus;
  activeSessionId: string | null;
  persona: Persona | null;
  callDuration: number;
  lastError: Error | null;
  transcript: string;
  currentSentence: string;
  isPlayingSentence: boolean;
  reconnectAttempts: number;
  selectedVoice: string | null;
  isReconnecting: boolean;
}

export type ProspectCallAction =
  | { type: 'CALL_INIT', persona: Persona }
  | { type: 'CALL_CONNECTING', sessionId: string }
  | { type: 'CALL_CONNECTED' }
  | { type: 'CALL_DISCONNECTING' }
  | { type: 'CALL_DISCONNECTED' }
  | { type: 'CALL_ERROR', error: Error }
  | { type: 'UPDATE_DURATION', duration: number }
  | { type: 'UPDATE_TRANSCRIPT', text: string }
  | { type: 'UPDATE_CURRENT_SENTENCE', text: string }
  | { type: 'SENTENCE_PLAYBACK_START' }
  | { type: 'SENTENCE_PLAYBACK_END' }
  | { type: 'RECONNECT_ATTEMPT' }
  | { type: 'RECONNECT_RESET' }
  | { type: 'SET_VOICE', voice: string }
  | { type: 'CALL_RECONNECTING' }
  | { type: 'CALL_RECONNECTED' }
  | { type: 'PERSONA_SWITCHING', newPersona: Persona }
  | { type: 'PERSONA_SWITCHED', newPersona: Persona }
  | { type: 'RESET' };

export const initialCallState: ProspectCallState = {
  status: 'idle',
  activeSessionId: null,
  persona: null,
  callDuration: 0,
  lastError: null,
  transcript: '',
  currentSentence: '',
  isPlayingSentence: false,
  reconnectAttempts: 0,
  selectedVoice: null,
  isReconnecting: false
};

export function prospectCallReducer(state: ProspectCallState, action: ProspectCallAction): ProspectCallState {
  switch (action.type) {
    case 'CALL_INIT':
      return {
        ...initialCallState,
        persona: action.persona
      };
    case 'CALL_CONNECTING':
      return {
        ...state,
        status: 'connecting',
        activeSessionId: action.sessionId
      };
    case 'CALL_CONNECTED':
      return {
        ...state,
        status: 'connected',
        reconnectAttempts: 0,
        isReconnecting: false
      };
    case 'CALL_DISCONNECTING':
      return {
        ...state,
        status: 'disconnecting'
      };
    case 'CALL_DISCONNECTED':
      return {
        ...state,
        status: 'idle',
        activeSessionId: null,
        isReconnecting: false
      };
    case 'CALL_ERROR':
      return {
        ...state,
        status: 'error',
        lastError: action.error,
        isReconnecting: false
      };
    case 'UPDATE_DURATION':
      return {
        ...state,
        callDuration: action.duration
      };
    case 'UPDATE_TRANSCRIPT':
      return {
        ...state,
        transcript: action.text
      };
    case 'CALL_RECONNECTING':
      return {
        ...state,
        status: 'reconnecting',
        isReconnecting: true
      };
    case 'CALL_RECONNECTED':
      return {
        ...state,
        status: 'connected',
        isReconnecting: false
      };
    case 'RECONNECT_ATTEMPT':
      return {
        ...state,
        reconnectAttempts: state.reconnectAttempts + 1
      };
    case 'RECONNECT_RESET':
      return {
        ...state,
        reconnectAttempts: 0
      };
    case 'UPDATE_CURRENT_SENTENCE':
      return {
        ...state,
        currentSentence: action.text
      };
    case 'SENTENCE_PLAYBACK_START':
      return {
        ...state,
        isPlayingSentence: true
      };
    case 'SENTENCE_PLAYBACK_END':
      return {
        ...state,
        isPlayingSentence: false,
        currentSentence: ''
      };
    case 'RESET':
      return {
        ...initialCallState
      };
    case 'SET_VOICE':
      return {
        ...state,
        selectedVoice: action.voice
      };
    default:
      return state;
  }
}

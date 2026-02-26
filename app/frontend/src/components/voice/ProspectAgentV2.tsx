/**
 * ProspectAgentV2 - Two-Rail Architecture with Marcus Voice System
 * 
 * Clean implementation using CallControllerProviderV2
 */

import React, { useEffect, useState } from 'react';
import { CallControllerProviderV2, useCallControllerV2 } from './CallControllerProviderV2';
import { PersonaData } from './DualVoiceAgentFlow';

interface ProspectAgentV2Props {
  persona: PersonaData;
  autoStart?: boolean;
  onTranscriptUpdate?: (transcript: string[]) => void;
}

function ProspectAgentV2Inner({ persona, autoStart, onTranscriptUpdate }: ProspectAgentV2Props) {
  const { state, startCall, endCall } = useCallControllerV2();
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  // Auto-start call
  useEffect(() => {
    if (autoStart && !hasAutoStarted && !state.isActive && !state.isConnecting) {
      console.log('[ProspectAgentV2] Auto-starting call');
      setHasAutoStarted(true);
      startCall(persona);
    }
  }, [autoStart, hasAutoStarted, state.isActive, state.isConnecting, persona, startCall]);

  // Update parent with transcript
  useEffect(() => {
    if (onTranscriptUpdate && state.transcript.length > 0) {
      onTranscriptUpdate(state.transcript);
    }
  }, [state.transcript, onTranscriptUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isActive) {
        endCall();
      }
    };
  }, [state.isActive, endCall]);

  return (
    <div className="prospect-agent-v2">
      {/* Connection Status */}
      <div className="mb-4">
        {state.isConnecting && (
          <div className="text-blue-600">🔄 Connecting to {persona.name}...</div>
        )}
        {state.isActive && (
          <div className="text-green-600">✅ Connected to {persona.name}</div>
        )}
        {state.error && (
          <div className="text-red-600">❌ Error: {state.error}</div>
        )}
      </div>

      {/* Call Controls */}
      <div className="mb-4 space-x-2">
        {!state.isActive && !state.isConnecting && (
          <button
            onClick={() => startCall(persona)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start Call
          </button>
        )}
        {state.isActive && (
          <button
            onClick={endCall}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            End Call
          </button>
        )}
      </div>

      {/* Transcript Display */}
      {state.transcript.length > 0 && (
        <div className="transcript-display bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
          <h3 className="font-bold mb-2">Transcript:</h3>
          <div className="space-y-2">
            {state.transcript.map((text, index) => (
              <div key={index} className="text-gray-700">
                <span className="font-semibold">User:</span> {text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Info */}
      {state.sessionId && (
        <div className="mt-4 text-xs text-gray-500">
          Session: {state.sessionId}
        </div>
      )}
    </div>
  );
}

export function ProspectAgentV2(props: ProspectAgentV2Props) {
  return (
    <CallControllerProviderV2 persona={props.persona}>
      <ProspectAgentV2Inner {...props} />
    </CallControllerProviderV2>
  );
}

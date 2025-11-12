import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Paper } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PersonaData } from './DualVoiceAgentFlow';
import { Persona } from '../../types/persona';
import { CallControllerProvider, useCallController } from './CallControllerProvider';
import { VoiceSelector } from './VoiceSelector';
import { CallMonitoring } from './CallMonitoring';
import { Phone as CallIcon, PhoneOff as EndCallIcon } from 'lucide-react';
import { prospectScoringService, BehaviorUpdate } from '../../services/ProspectScoringService';
import TerminationIndicators from './TerminationIndicators';

// Adapter function to handle both Persona and PersonaData types
const adaptPersonaData = (personaInput: PersonaData | Persona): Persona => {
  // If it's already a Persona type with personality_traits as an array, return it directly
  if ('id' in personaInput && 
      'description_narrative' in personaInput && 
      Array.isArray(personaInput.personality_traits)) {
    return personaInput as Persona;
  }
  
  // Otherwise, treat it as PersonaData and convert
  const personaData = personaInput as PersonaData;
  
  // Handle personality_traits conversion from string to string[]
  let personalityTraits: string[] = [];
  
  if (personaData.personality_traits) {
    if (typeof personaData.personality_traits === 'string') {
      // Split string by commas and trim whitespace
      personalityTraits = personaData.personality_traits
        .split(',')
        .map(trait => trait.trim())
        .filter(trait => trait.length > 0);
    } else if (Array.isArray(personaData.personality_traits)) {
      personalityTraits = personaData.personality_traits;
    }
  }
  
  // If no traits provided, add default lively traits
  if (personalityTraits.length === 0) {
    personalityTraits = ['curious', 'passionate', 'straightforward'];
  }
  
  // Ensure all traits are strings before filtering
  const stringTraits = personalityTraits.map(trait => String(trait));
  
  // Remove any "analytical" traits as per memory
  const filteredTraits = stringTraits.filter(trait => 
    !trait.toLowerCase().includes('analytical') &&
    !trait.toLowerCase().includes('measured') && 
    !trait.toLowerCase().includes('deliberate')
  );
  
  // Replace "analytical" with "thoughtful" in traits
  const transformedTraits = filteredTraits.map(trait => 
    trait.toLowerCase().includes('analytical') ? 
    trait.replace(/analytical/gi, 'thoughtful') : trait
  );
  
  // Final sanitized personality traits array
  personalityTraits = transformedTraits;
  
  // Create a compatible Persona object with default values for missing fields
  const compatiblePersona: Persona = {
    id: `persona_${Date.now()}`,
    name: personaData.name || 'Unknown',
    role: personaData.role || 'Unknown',
    company: personaData.company || 'Unknown',
    description_narrative: personaData.about_person || '',
    personality_traits: personalityTraits,
    // Copy other fields that might be useful
    base_reaction_style: typeof personaData.communication_style === 'string' ? personaData.communication_style : '',
    // Handle voice_id safely - it exists in Persona but may not in PersonaData
    voice_id: 'voice_id' in personaData ? personaData.voice_id as string : undefined
  };
  
  return compatiblePersona;
};

// Create a default theme for Material UI components
const defaultTheme = createTheme();

// Custom button components to avoid direct usage of Material UI icons
const StartCallButton = memo(({
  onClick,
  disabled
}: {
  onClick: () => void;
  disabled?: boolean;
}) => {
  // Handle button click with session tracking
  const handleClick = () => {
    // Track the button click for analytics
    console.log('📞 Start call button clicked');
    onClick();
  };
  
  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleClick}
      disabled={disabled}
      startIcon={<CallIcon />}
    >
      Start Call
    </Button>
  );
});

const EndCallButton = memo(({ onClick }: { onClick: () => void }) => (
  <Button 
    variant="contained" 
    color="error" 
    onClick={onClick}
    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
    startIcon={<EndCallIcon />}
  >
    End Call
  </Button>
));

interface ProspectAgentProps {
  persona: PersonaData | Persona;
  userProductInfo?: {
    product: string;
    target_market: string;
    key_benefits?: string;
    pricing_model?: string;
  };
  product?: string;
  target_market?: string;
  key_benefits?: string;
  pricing_model?: string;
  company?: any;
  onCallEnd?: () => void;
  onEndCall?: () => void;
  onCallComplete?: (callData: any) => void;
  autoStart?: boolean; // Automatically start the call when component mounts
}

/**
 * ProspectAgent - Voice-based AI prospect for sales training
 * 
 * This component has been completely refactored to use a modular architecture:
 * - CallControllerProvider manages the call lifecycle and state
 * - AudioManager handles audio processing
 * - WebSocketManager manages Deepgram communication
 * - VoiceSelector provides enhanced voice selection
 * - CallMonitoring tracks analytics and performance
 * - ProspectCallEventBus enables reliable event communication
 */
// This component must be used as a child of CallControllerProvider
const ProspectAgentContent = memo(({ 
  persona, 
  userProductInfo, 
  company, 
  onCallEnd, 
  onCallComplete,
  autoStart = false
}: ProspectAgentProps) => {
  // Use CallControllerProvider context to access call functions
  const { startCall: contextStartCall, isConnecting: contextIsConnecting, isConnected: contextIsConnected } = useCallController();
  // Use our call controller hook - this must be used inside a component that is a child of CallControllerProvider
  const {
    state,
    startCall,
    endCall,
    isConnected,
    isConnecting,
    callDuration,
    transcript,
    error
  } = useCallController();
  
  // Adapt the persona to ensure type compatibility within the component
  const adaptedPersona = adaptPersonaData(persona);
  
  // Track transcript changes for prospect scoring
  const lastTranscriptRef = useRef<string>('');
  
  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current && prospectScoringService.isSessionActive()) {
      // Extract new message from transcript
      const newContent = transcript.replace(lastTranscriptRef.current, '').trim();
      
      if (newContent) {
        // Determine sender based on content patterns (this is a simple heuristic)
        const isUserMessage = newContent.includes('You:') || newContent.includes('User:');
        const isAIMessage = newContent.includes(adaptedPersona.name + ':') || newContent.includes('AI:');
        
        let sender: 'user' | 'ai' = 'user';
        let content = newContent;
        
        if (isAIMessage) {
          sender = 'ai';
          content = newContent.replace(new RegExp(`^${adaptedPersona.name}:\s*`, 'i'), '').trim();
        } else if (isUserMessage) {
          sender = 'user';
          content = newContent.replace(/^(You|User):\s*/i, '').trim();
        }
        
        // Add message to prospect scoring analysis
        prospectScoringService.addMessage({
          sender,
          content,
          timestamp: Date.now() / 1000,
          persona_name: adaptedPersona.name
        });
        
        console.log(`📝 Added message to scoring analysis: [${sender}] ${content.substring(0, 50)}...`);
      }
      
      lastTranscriptRef.current = transcript;
    }
  }, [transcript, adaptedPersona.name]);
  
  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Generate a session ID for tracking
  const generateSessionId = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${adaptedPersona.name.replace(/\s+/g, '_')}_${timestamp}_${random}`;
  }, [adaptedPersona.name]);
  
  // Track the active session ID for consistent reference
  const activeSessionId = useRef<string | null>(null);
  
  // ProspectAgent no longer registers a behavior update callback directly.
  // The CallControllerProvider owns the singleton's callback and applies
  // behavior hints to the WebSocketManager. This prevents callback conflicts
  // with the Prospect Scoring Debug Panel and ensures a single source of truth.
  
  // Handle call end with proper cleanup
  const handleCallEnd = useCallback(() => {
    const currentSessionId = activeSessionId.current;
    
    if (currentSessionId) {
      console.log(`📵 Ending call with session ID: ${currentSessionId}`);
      
      // Log call end event to metrics endpoint
      fetch('/api/call-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'CALL_ENDED',
          sessionId: currentSessionId,
          persona: adaptedPersona.name,
          timestamp: new Date().toISOString()
        })
      }).catch((error) => {
        console.error(`❌ Failed to log call end metrics: ${error}`);
      });
    }
    
    // Call the CallControllerProvider's endCall function
    endCall();
    
    // Reset the active session ID
    activeSessionId.current = null;
    
    // Notify parent component if callback exists
    if (onCallEnd) {
      onCallEnd();
    }
  }, [endCall, onCallEnd, adaptedPersona.name]);
  
  // Get selected voice for display
  const selectedVoice = state.selectedVoice || VoiceSelector.selectVoiceForPersona(adaptedPersona);
  
  // Use ref to track if auto-start has been attempted
  const hasAutoStartedRef = useRef(false);
  
  // Auto-start call when component mounts if autoStart is true (no delay) + simple retry
  React.useEffect(() => {
    // Only attempt auto-start if it's enabled, not already connected, not connecting, and hasn't been attempted yet
    if (autoStart && !isConnected && !isConnecting && !hasAutoStartedRef.current) {
      console.log('🎯 Auto-starting call for', persona.name);
      hasAutoStartedRef.current = true; // prevent duplicate attempts on this mount

      const doStart = () => {
        if (isConnected || isConnecting) return;
        const newSessionId = generateSessionId();
        activeSessionId.current = newSessionId;
        console.log(`🔑 Generated session ID for auto-start: ${newSessionId}`);

        // Log call start to metrics with error handling
        fetch('/api/call-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'CALL_STARTING',
            sessionId: newSessionId,
            personaName: adaptedPersona.name,
            timestamp: new Date().toISOString()
          })
        }).catch((error) => {
          console.warn(`⚠️ Metrics API error (non-critical): ${error.message}`);
        });

        // Start the call using the provider context API
        console.log(`📞 Initiating auto-started call with session ID: ${newSessionId}`);
        contextStartCall(adaptedPersona, newSessionId);
      };

      // Start immediately
      doStart();

      // Retry once after 1.5s if we still aren't connecting or connected
      const retryTimer = setTimeout(() => {
        if (autoStart && !isConnected && !isConnecting) {
          console.log('↻ Retrying auto-start (not connecting yet)');
          doStart();
        }
      }, 1500);

      return () => clearTimeout(retryTimer);
    }
  }, [autoStart, isConnected, isConnecting, contextStartCall, persona.name, adaptedPersona, generateSessionId]);

  // Manual retry handler (used when autoStart didn't kick off a connection)
  const handleRetryStart = useCallback(() => {
    if (isConnected || isConnecting) return;
    const newSessionId = generateSessionId();
    activeSessionId.current = newSessionId;
    console.log(`🔁 Retry start with session ID: ${newSessionId}`);
    fetch('/api/call-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'CALL_STARTING',
        sessionId: newSessionId,
        personaName: adaptedPersona.name,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {});
    contextStartCall(adaptedPersona, newSessionId);
  }, [isConnected, isConnecting, contextStartCall, adaptedPersona, generateSessionId]);
  
  return (
    <div className="w-full">
      {/* Termination guardrail indicators */}
      <TerminationIndicators />
      
      {/* Call controls */}
      <div className="flex justify-center gap-3 mt-6">
        {!isConnected && !isConnecting ? (
          autoStart ? (
            // When autoStart is enabled, show a small Retry button if not connecting
            <Button variant="outlined" onClick={handleRetryStart} disabled={isConnecting}>
              Retry Call
            </Button>
          ) : (
            <StartCallButton 
              onClick={() => {
              // Prevent duplicate calls if already connecting
              if (isConnecting) {
                console.log('⛔ Ignoring click - call already connecting');
                return;
              }
              
              // Generate new session ID on manual call start
              const newSessionId = generateSessionId();
              activeSessionId.current = newSessionId;
              console.log(`🔑 Generated session ID for manual start: ${newSessionId}`);
              
              // Log call start to metrics with properly structured data
              // Get CSRF token from cookie - try multiple possible cookie names
              const getCsrfTokenFromCookie = () => {
                // Check for standard Flask-WTF cookie names
                const possibleCookieNames = ['csrf_token', 'X-CSRF-TOKEN', '_csrf_token'];
                
                for (const cookieName of possibleCookieNames) {
                  const match = document.cookie.match('(^|;)\\s*' + cookieName + '\\s*=\\s*([^;]+)');
                  if (match) {
                    console.log(`🔑 Found CSRF token with cookie name: ${cookieName}`);
                    return match[2];
                  }
                }
                
                // If no cookie is found, try to get from meta tag as fallback
                const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                if (metaToken) {
                  console.log('🔑 Found CSRF token in meta tag');
                  return metaToken;
                }
                
                console.warn('⚠️ No CSRF token found in cookies or meta tags');
                return '';
              };
              
              const csrfToken = getCsrfTokenFromCookie();
              
              fetch('/api/call-metrics', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'X-CSRFToken': csrfToken || ''
                },
                credentials: 'same-origin', // Include cookies for CSRF validation
                body: JSON.stringify({
                  event: 'CALL_STARTING',
                  sessionId: newSessionId,
                  personaName: adaptedPersona.name, // Field name that matches backend expectation
                  timestamp: new Date().toISOString(),
                  // Add additional required fields that the backend expects
                  metrics: {
                    duration: 0,
                    reconnectAttempts: 0
                  },
                  persona: {
                    name: adaptedPersona.name,
                    role: adaptedPersona.role,
                    company: adaptedPersona.company || ''
                  }
                })
              })
              .then(response => {
                if (!response.ok) {
                  console.warn(`⚠️ Metrics API returned ${response.status}: ${response.statusText}`);
                  return response.text().then(text => {
                    console.warn(`API error details: ${text}`);
                  });
                }
              })
              .catch((error) => {
                console.warn(`⚠️ Failed to log call metrics: ${error.message}`);
                // Continue with call despite metrics API errors
              });
              
              // Start call with adapted persona and explicitly pass the session ID
              console.log(`📞 Initiating manually started call with session ID: ${newSessionId}`);
              // Use the CallControllerProvider context to start the call properly
              contextStartCall(adaptedPersona, newSessionId);
              }} 
              disabled={isConnecting} 
            />
          )
        ) : (
          <EndCallButton onClick={handleCallEnd} />
        )}
      </div>
      
      {/* Show loading indicator only when actually connecting */}
      {(!isConnected && isConnecting) && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <CircularProgress size={24} />
          <span className="text-sm text-gray-600">
            Connecting...
          </span>
        </div>
      )}
      
      {/* Show error if any */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-900">
            Error: {error.message}
          </p>
        </div>
      )}
    </div>
  );
});

/**
 * Wrapper component that provides the CallControllerProvider context
 * This is the main exported component that should be used by parent components
 */
const ProspectAgent = memo(({ persona, userProductInfo, company, onCallEnd, onCallComplete, autoStart = false }: ProspectAgentProps) => {
  // Handle transcript updates
  const [transcript, setTranscript] = useState<string>('');
  
  const handleTranscriptUpdate = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  // Handle call completion
  const handleCallComplete = useCallback((callData: any) => {
    if (onCallComplete) {
      onCallComplete(callData);
    }
  }, [onCallComplete]);

  // Adapt the persona to ensure type compatibility
  const adaptedPersona = adaptPersonaData(persona);

  return (
    <ThemeProvider theme={defaultTheme}>
      <CallControllerProvider 
        persona={adaptedPersona} 
        onTranscriptUpdate={handleTranscriptUpdate}
      >
        <ProspectAgentContent 
          persona={adaptedPersona} 
          userProductInfo={userProductInfo}
          company={company}
          onCallEnd={onCallEnd}
          onCallComplete={onCallComplete}
          autoStart={autoStart}
        />
      </CallControllerProvider>
    </ThemeProvider>
  );
});

// Export as both named and default export to maintain compatibility
export { ProspectAgent };
export default ProspectAgent;

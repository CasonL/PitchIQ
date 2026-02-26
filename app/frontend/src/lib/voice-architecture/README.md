# Voice Architecture Package

**Plug-and-play two-rail voice system for PitchIQ**

## Overview

This package separates timing authority (WHEN to speak) from meaning authority (WHAT to say) for natural, low-latency voice conversations.

## Architecture

```
TOP RAIL (Timing)        BOTTOM RAIL (Meaning)
     ↓                          ↓
  VAD Events              Transcript Events
     ↓                          ↓
TimingAuthority         MeaningAuthority
     ↓                          ↓
  SpeechGate  ←───────────  Queue
     ↓
   TTS
```

## Quick Start

### 1. Install Package (Already Local)

```typescript
import { VoiceOrchestrator, VoiceArchitectureConfig } from '@/lib/voice-architecture';
```

### 2. Configure Orchestrator

```typescript
const config: VoiceArchitectureConfig = {
  // Timing settings
  silence_threshold_ms: 800,
  user_done_threshold_ms: 1200,
  max_queue_size: 5,
  
  // Features
  enable_mirroring: true,
  mirroring_sensitivity: 0.7,
  enable_coach_orchestration: false,
  
  // Callbacks (you provide these)
  onSpeakRequest: async (text, metadata) => {
    // Send to your TTS system
    await yourTTS.speak(text);
  },
  onMicControl: (enabled) => {
    // Control microphone streaming
    yourAudioManager.setMicEnabled(enabled);
  },
  onTurnChange: (state) => {
    console.log('Turn state:', state);
  }
};
```

### 3. Create Orchestrator

```typescript
const orchestrator = new VoiceOrchestrator(config);
```

### 4. Wire Up Events

```typescript
// Top rail events (from VAD/audio)
yourWebSocket.on('UserStartedSpeaking', () => {
  orchestrator.userStartedSpeaking();
});

yourWebSocket.on('UserStoppedSpeaking', () => {
  orchestrator.userStoppedSpeaking(800);
});

yourWebSocket.on('AgentStartedSpeaking', () => {
  orchestrator.prospectStartedSpeaking();
});

yourWebSocket.on('AgentStoppedSpeaking', () => {
  orchestrator.prospectStoppedSpeaking();
});

// Bottom rail events (from transcript)
yourWebSocket.on('Transcript', async (text, speaker) => {
  await orchestrator.onTranscript(text, speaker);
  
  // Generate response if it's user speech
  if (speaker === 'user') {
    await orchestrator.generateResponse({
      transcript: text,
      persona: yourPersona,
      sessionId: yourSessionId
    });
  }
});
```

### 5. Cleanup on Unmount

```typescript
useEffect(() => {
  return () => orchestrator.cleanup();
}, []);
```

## Usage Examples

### Example 1: ProspectAgent Component

```typescript
import { VoiceOrchestrator } from '@/lib/voice-architecture';
import { WebSocketManager } from '../WebSocketManager';

export function ProspectAgent() {
  const [orchestrator, setOrchestrator] = useState<VoiceOrchestrator | null>(null);
  const wsManager = useRef<WebSocketManager | null>(null);
  
  useEffect(() => {
    const orch = new VoiceOrchestrator({
      silence_threshold_ms: 800,
      max_queue_size: 5,
      enable_mirroring: true,
      enable_coach_orchestration: false,
      
      onSpeakRequest: async (text, metadata) => {
        // Use existing WebSocketManager TTS
        await wsManager.current?.sendProspectResponse(text);
      },
      onMicControl: (enabled) => {
        wsManager.current?.setMicStreamingAllowed(enabled, 'orchestrator');
      },
      onTurnChange: (state) => {
        setTurnState(state);
      }
    });
    
    // Wire up existing WebSocket events
    wsManager.current?.on('UserStartedSpeaking', () => {
      orch.userStartedSpeaking();
    });
    
    wsManager.current?.on('UserStoppedSpeaking', () => {
      orch.userStoppedSpeaking(800);
    });
    
    wsManager.current?.on('ConversationText', async (msg) => {
      const speaker = wsManager.current?.getCurrentSpeaker();
      await orch.onTranscript(msg.content, speaker);
    });
    
    setOrchestrator(orch);
    
    return () => orch.cleanup();
  }, []);
  
  return <div>Prospect Agent with Two-Rail Architecture</div>;
}
```

### Example 2: SamCoachAgent Component

```typescript
export function SamCoachAgent() {
  const config: VoiceArchitectureConfig = {
    silence_threshold_ms: 600,  // Coach responds faster
    enable_coach_orchestration: true,  // Enable coach strategies
    // ... rest of config
  };
  
  const orchestrator = new VoiceOrchestrator(config);
  // ... wire up events
}
```

### Example 3: Custom Voice Provider

```typescript
// Works with any voice provider, not just Deepgram
const orchestrator = new VoiceOrchestrator({
  // ... config
  onSpeakRequest: async (text, metadata) => {
    if (metadata.pause_before) {
      await delay(metadata.pause_before);
    }
    
    // Could be ElevenLabs, OpenAI, etc.
    await elevenLabs.speak(text, {
      stability: metadata.tone === 'uncomfortable' ? 0.3 : 0.7
    });
  }
});
```

## API Reference

### VoiceOrchestrator

Main entry point for the voice architecture.

#### Constructor

```typescript
constructor(config: VoiceArchitectureConfig)
```

#### Methods

**Top Rail (Timing Events)**

```typescript
userStartedSpeaking(): void
userStoppedSpeaking(silenceDuration_ms?: number): void
prospectStartedSpeaking(): void
prospectStoppedSpeaking(): void
```

**Bottom Rail (Meaning Events)**

```typescript
onTranscript(text: string, speaker: 'user' | 'prospect'): Promise<void>
generateResponse(context: ConversationContext): Promise<void>
```

**Lifecycle**

```typescript
cleanup(): void
getDebugState(): object
```

## Configuration Options

### VoiceArchitectureConfig

```typescript
{
  // TIMING SETTINGS
  silence_threshold_ms: number;        // Default: 800
  user_done_threshold_ms: number;      // Default: 1200
  max_queue_size: number;              // Default: 5
  
  // BEHAVIORAL MIRRORING
  enable_mirroring: boolean;           // Default: true
  mirroring_sensitivity: number;       // 0-1, Default: 0.7
  
  // COACH INTEGRATION (Phase 2)
  enable_coach_orchestration: boolean; // Default: false
  
  // CALLBACKS (Required)
  onSpeakRequest: (text: string, metadata: SpeechMetadata) => Promise<void>;
  onMicControl: (enabled: boolean) => void;
  onTurnChange: (state: 'user' | 'prospect' | 'idle') => void;
}
```

## Behavioral Mirroring

When `enable_mirroring: true`, the system automatically analyzes salesperson behavior and mirrors it:

- **Awkward salesperson** → Uncomfortable prospect responses
- **Passive salesperson** → Disengaged prospect
- **Confident salesperson** → Engaged prospect

### Detection Patterns

**Awkwardness:**
- Filler words: "um", "uh", "like", "you know"
- Validation seeking: "does that make sense?", "is that okay?"
- Uncertainty: "I guess", "maybe", "kind of"

**Passiveness:**
- "What do you think?"
- "Any questions?"
- "Let me know"

**Control:**
- "Let me...", "Let's..."
- Discovery questions: "What", "When", "How", "Why"
- Directive language: "Here's what we'll do"

## Queue System

The queue sits between timing and meaning rails:

### QueueItem Structure

```typescript
{
  text: string;                  // What to say
  priority: number;              // 0-1, higher = more urgent
  expires_in_ms: number;         // Time before stale
  interrupt_ok: boolean;         // Can interrupt user?
  abortable: boolean;            // Can be cut off?
  
  // Behavioral metadata
  pause_before?: number;         // Awkward silence duration
  tone?: 'engaged' | 'uncomfortable' | 'disengaged';
  speaking_speed?: 'normal' | 'hesitant' | 'flat';
}
```

### Queue Behavior

- **Priority sorting:** Highest priority speaks first
- **Context versioning:** Old items expire when user changes topic
- **Size limits:** Drops lowest priority when full
- **Automatic expiration:** Removes stale items

## Debugging

```typescript
const state = orchestrator.getDebugState();
console.log(state);
// {
//   queue: { size: 2, items: [...] },
//   gateOpen: false,
//   turnState: 'user'
// }
```

## Migration from Existing System

### Before (Current System)

```typescript
// WebSocketManager handles everything
wsManager.on('ConversationText', (msg) => {
  const response = generateResponse(msg.content);
  wsManager.sendToTTS(response);  // Immediate, no queue
});
```

### After (Two-Rail System)

```typescript
// Orchestrator separates concerns
wsManager.on('ConversationText', async (msg) => {
  await orchestrator.onTranscript(msg.content, 'user');
  await orchestrator.generateResponse({ transcript: msg.content });
  // Response goes to queue, timing authority controls speaking
});
```

## Benefits

✅ **200-400ms response time** (vs. 2-5 seconds)  
✅ **Natural interruptions** (no more talking over each other)  
✅ **Behavioral mirroring** (awkwardness feels authentic)  
✅ **Extensible** (add coach orchestration in Phase 2)  
✅ **Provider agnostic** (works with any STT/TTS)  
✅ **70% code reuse** (refactor, not rewrite)

## Phase 2: Coach Orchestration

Coming in weeks 4-5:

```typescript
const orchestrator = new VoiceOrchestrator({
  enable_coach_orchestration: true,
  coach_strategies: [
    'difficulty_control',
    'objection_steering',
    'conversation_control',
    // ... 8 total strategies
  ]
});
```

Coach will control queue metadata (priority, urgency, intervention type).

## Support

See `VOICE_ARCHITECTURE_REBUILD_PLAN.md` for full implementation roadmap.

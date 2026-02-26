# Marcus Architecture Migration Plan

## Changes Summary

### Old Architecture (Deepgram Agent)
- `WebSocketManager`: Deepgram Agent API (autonomous AI responses)
- `DirectAudioManager`: Audio processing and playback
- `VoiceOrchestrator`: Behavioral logic (partially integrated)

### New Architecture (Marcus Model)
- `ProspectVoiceManager`: Unified STT (Deepgram Nova-2) + TTS (Cartesia)
- `VoiceOrchestrator`: Full two-rail control (timing + meaning)
- No autonomous responses - orchestrator controls everything

## Key Replacements

### 1. Manager Initialization
```typescript
// OLD
audioManager.current = new DirectAudioManager({...});
wsManager.current = new WebSocketManager({...});

// NEW
voiceManager.current = new ProspectVoiceManager({
  onTranscript: (text, isFinal) => {...},
  onSpeechStart: () => {...}, // VAD for interruption
  onSpeakingStateChange: (isSpeaking) => {...},
  onError: (error) => {...}
});
await voiceManager.current.startListening();
```

### 2. Cleanup
```typescript
// OLD
wsManager.current.terminate();
audioManager.current.cleanup();

// NEW
voiceManager.current.cleanup();
```

### 3. Speaking
```typescript
// OLD
wsManager.current.speakProspectResponse(text);

// NEW
voiceManager.current.speak(text, { voiceId, emotion, speed });
```

### 4. Interruption
```typescript
// OLD
No built-in interruption handling

// NEW
voiceManager handles VAD → automatic interruption
```

### 5. State Checks
```typescript
// OLD
wsManager.current.isActive()

// NEW
voiceManager.current.isActive()
```

## Implementation Steps

1. ✅ Create ProspectVoiceManager
2. ✅ Add Cartesia API endpoint
3. ⏳ Update CallControllerProvider cleanup
4. ⏳ Update startCall initialization
5. ⏳ Wire orchestrator to voiceManager
6. ⏳ Remove deprecated methods (switchPersona, injectAgentMessage, etc.)
7. ⏳ Test full flow

## Benefits

- **70% cost reduction** (Deepgram Nova-2 vs Agent API)
- **40ms TTS latency** (Cartesia streaming)
- **Full control** over responses
- **Better interruption** handling (VAD-based)
- **Cleaner architecture** (unified manager)

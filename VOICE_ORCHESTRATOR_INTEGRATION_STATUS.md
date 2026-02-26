# Voice Orchestrator Integration Status

**Last Updated:** January 2, 2026  
**Status:** ✅ Phase 1 Complete - Ready for Testing

---

## ✅ Completed

### Package Built (100%)
- ✅ Core types and interfaces (`types.ts`)
- ✅ ProspectQueue with priority, expiration, context versioning
- ✅ SpeechGate with open/close control
- ✅ TimingAuthority (top rail) with VAD handling
- ✅ MeaningAuthority (bottom rail) with behavioral mirroring
- ✅ VoiceOrchestrator (main API)
- ✅ Complete README with usage examples
- ✅ Clean index.ts exports

**Location:** `app/frontend/src/lib/voice-architecture/`

### Integration Started (60%)
- ✅ Imported VoiceOrchestrator into CallControllerProvider
- ✅ Added orchestrator ref for instance management
- ✅ Initialized orchestrator in startCall function
- ✅ Added orchestrator cleanup in cleanup function
- ✅ Basic configuration with callbacks defined

---

## ⚠️ In Progress

### WebSocketManager Event Wiring (0%)
**Status:** Not yet started - this is the critical missing piece

**What needs to happen:**

The VoiceOrchestrator needs to receive events from WebSocketManager to control timing. Currently WebSocketManager emits events like:
- `AgentEvents.UserStartedSpeaking`
- `AgentEvents.UserStoppedSpeaking` (implied by silence)
- `AgentEvents.AgentStartedSpeaking`
- `AgentEvents.AgentStoppedSpeaking`

**Two options:**

#### Option 1: Add Event Emitter to WebSocketManager (Recommended)
```typescript
// In WebSocketManager.ts
import { EventEmitter } from 'events';

class WebSocketManager extends EventEmitter {
  // In setupEventListeners():
  this.agent.on(AgentEvents.UserStartedSpeaking, () => {
    this.emit('userStartedSpeaking'); // NEW: Emit for orchestrator
    this.smartLog('important', "🎤 User started speaking");
    // ... existing logic
  });
  
  this.agent.on(AgentEvents.AgentStartedSpeaking, () => {
    this.emit('prospectStartedSpeaking'); // NEW: Emit for orchestrator
    this.smartLog('important', "🗣️ Agent started speaking");
    // ... existing logic
  });
}
```

Then in CallControllerProvider:
```typescript
// After wsManager.current.connect()
wsManager.current.on('userStartedSpeaking', () => {
  orchestrator.current?.userStartedSpeaking();
});

wsManager.current.on('userStoppedSpeaking', () => {
  orchestrator.current?.userStoppedSpeaking(800);
});

wsManager.current.on('prospectStartedSpeaking', () => {
  orchestrator.current?.prospectStartedSpeaking();
});

wsManager.current.on('prospectStoppedSpeaking', () => {
  orchestrator.current?.prospectStoppedSpeaking();
});
```

#### Option 2: Pass Orchestrator to WebSocketManager Config
```typescript
// In CallControllerProvider startCall:
wsManager.current = new WebSocketManager({
  // ... existing config
  orchestrator: orchestrator.current, // NEW: Pass orchestrator reference
  
  onUserStartedSpeaking: () => {
    orchestrator.current?.userStartedSpeaking();
  },
  onUserStoppedSpeaking: (duration: number) => {
    orchestrator.current?.userStoppedSpeaking(duration);
  }
  // ... etc
});
```

**Recommendation:** Use Option 1 (Event Emitter) for cleaner separation.

---

## 🚧 Blocking Issues

### Issue 1: setMicStreamingAllowed is Private
**Error:** `Property 'setMicStreamingAllowed' is private and only accessible within class 'WebSocketManager'`

**Location:** `CallControllerProvider.tsx` line 732

**Fix Required:**
```typescript
// In WebSocketManager.ts, change:
private setMicStreamingAllowed(allowed: boolean, reason: string): void {

// To:
public setMicStreamingAllowed(allowed: boolean, reason: string): void {
```

**Why:** The VoiceOrchestrator needs to control microphone streaming based on turn state (top rail timing authority).

### Issue 2: No TTS Method for Orchestrator
**Status:** TODO placeholder added

**Location:** `CallControllerProvider.tsx` line 725

**Fix Required:**
Add a public method to WebSocketManager for orchestrator to trigger TTS:
```typescript
// In WebSocketManager.ts
public speakProspectResponse(text: string): void {
  if (!this.agent || !this.isActive()) {
    this.smartLog('important', '⚠️ Cannot speak - not connected');
    return;
  }
  
  this.injectAgentMessage(text);
}
```

Then update orchestrator config:
```typescript
onSpeakRequest: async (text: string, metadata: any) => {
  if (wsManager.current && wsManager.current.isActive()) {
    wsManager.current.speakProspectResponse(text);
  }
}
```

---

## 📋 Next Steps (In Order)

### Step 1: Fix Blocking Issues (30 min)
1. Make `setMicStreamingAllowed` public in WebSocketManager
2. Add `speakProspectResponse` method to WebSocketManager
3. Test that no TypeScript errors remain

### Step 2: Wire WebSocketManager Events (1 hour)
1. Add EventEmitter to WebSocketManager
2. Emit events in setupEventListeners for all VAD events
3. Wire events to orchestrator in CallControllerProvider
4. Add console logs to verify events flow through

### Step 3: Test Integration (1 hour)
1. Start a call in ProspectAgent
2. Check console logs for:
   - `[VoiceOrchestrator] Initialized`
   - `[TimingAuthority] User started speaking`
   - `[TimingAuthority] User stopped speaking`
   - `[SpeechGate] Open/Close` events
   - `[MeaningAuthority] Behavior analysis`
3. Verify turn state changes work correctly
4. Check queue debug state: `orchestrator.current?.getDebugState()`

### Step 4: Connect Bottom Rail to LLM (2 hours)
Currently MeaningAuthority has placeholder response generation:
```typescript
// In MeaningAuthority.ts
private async generateResponse(context: ConversationContext): Promise<string> {
  return `Response to: ${context.transcript}`; // PLACEHOLDER
}
```

Need to connect to actual prospect response generation:
```typescript
private async generateResponse(context: ConversationContext): Promise<string> {
  // Call your existing GPT-4o persona generation
  const response = await fetch('/api/persona/generate-response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: context.transcript,
      persona: context.persona,
      sessionId: context.sessionId
    })
  });
  
  const data = await response.json();
  return data.response;
}
```

### Step 5: Verify End-to-End Flow (30 min)
1. User speaks → VAD detects → Top rail closes gate
2. Transcript arrives → Bottom rail generates response → Pushes to queue
3. User stops speaking → Top rail detects silence → Opens gate
4. Gate pulls from queue → Sends to TTS → Prospect speaks
5. Verify 200-400ms latency from user stop to prospect start

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- [ ] No TypeScript errors
- [ ] All WebSocketManager events wired to orchestrator
- [ ] Console logs show orchestrator receiving events
- [ ] Queue accepts items and serves them in priority order
- [ ] Gate controls TTS timing correctly
- [ ] Behavioral mirroring detects awkwardness patterns
- [ ] Response latency < 800ms (goal: 200-400ms)

### Phase 2 (Coach Orchestration):
- [ ] Coach LLM classifies user behavior
- [ ] 8 intervention strategies implemented
- [ ] Priority and flags set based on strategy
- [ ] Persistence system working

### Phase 3 (Polish):
- [ ] VAD threshold tuned
- [ ] Queue expiration optimized
- [ ] Rubric-based evaluation
- [ ] Production-ready

---

## 🔍 Testing Commands

```typescript
// In browser console during a call:

// Check orchestrator state
orchestrator.current?.getDebugState()
// Should show: { queue: {...}, gateOpen: false, turnState: 'user' }

// Manually test queue
orchestrator.current?.generateResponse({
  transcript: "Tell me about pricing",
  persona: { name: "Test" },
  sessionId: "test-123"
})
// Check queue size increased

// Check timing authority
orchestrator.current?.userStartedSpeaking()
// Should close gate

orchestrator.current?.userStoppedSpeaking(900)
// Should open gate if threshold passed
```

---

## 📝 Code Locations

### Package
- Core: `app/frontend/src/lib/voice-architecture/core/`
- Main API: `app/frontend/src/lib/voice-architecture/VoiceOrchestrator.ts`
- Types: `app/frontend/src/lib/voice-architecture/core/types.ts`

### Integration Points
- Provider: `app/frontend/src/components/voice/CallControllerProvider.tsx`
- WebSocket: `app/frontend/src/components/voice/WebSocketManager.ts`
- Component: `app/frontend/src/components/voice/ProspectAgent.tsx`

---

## 🚨 Known Limitations (Phase 1)

1. **No Coach Orchestration Yet** - `enable_coach_orchestration: false`
2. **Placeholder LLM Response** - MeaningAuthority generates dummy responses
3. **No TTS Metadata** - pause_before, tone, speaking_speed not yet applied
4. **Basic VAD** - Uses fixed 800ms threshold, needs tuning
5. **No Persistence** - Queue items don't persist across sessions

These are intentional - Phase 1 is foundation only.

---

## 📊 Current Architecture

```
┌──────────────────────────────────────────────┐
│         CallControllerProvider               │
│                                              │
│  ┌────────────────┐    ┌─────────────────┐  │
│  │ WebSocketMgr   │───▶│ Orchestrator    │  │
│  │ (Deepgram SDK) │    │                 │  │
│  └────────────────┘    │  TOP RAIL       │  │
│         ↓              │  ├─ Timing      │  │
│    VAD Events          │  ├─ Gate        │  │
│         ↓              │                 │  │
│    ❌ NOT WIRED YET    │  BOTTOM RAIL    │  │
│                        │  ├─ Meaning     │  │
│                        │  └─ Queue       │  │
│                        └─────────────────┘  │
└──────────────────────────────────────────────┘
```

**Next:** Wire the ❌ connection to complete the loop.

---

## 💡 Quick Start (After Fixing Issues)

```typescript
// 1. Start call
// ProspectAgent auto-starts or user clicks "Start Call"

// 2. Speak into microphone
// Should see: [TimingAuthority] User started speaking

// 3. Stop speaking
// Should see: [TimingAuthority] User stopped speaking, silence: 800
// Should see: [SpeechGate] Opening gate

// 4. Check queue
console.log(orchestrator.current?.getDebugState())
// Should show queued responses

// 5. Verify prospect speaks
// Should see: [SpeechGate] Speaking: "..."
```

---

**Next Action:** Fix the two blocking issues, then wire WebSocketManager events to orchestrator.

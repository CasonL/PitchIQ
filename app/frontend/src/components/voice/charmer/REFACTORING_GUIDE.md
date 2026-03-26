# CharmerController Refactoring Guide

## Overview

This guide documents the refactoring of `CharmerController.tsx` from a 1848-line God Object into a clean service-oriented architecture.

**Goal:** Reduce `CharmerController.tsx` to ~150 lines of pure UI code by extracting business logic into focused services.

---

## Architecture Changes

### Before (Current)
```
CharmerController.tsx (1848 lines)
├── Call lifecycle (start/stop/pause)
├── Transcript processing (echo, stitching, quality)
├── AI orchestration (context, LLM, parsing)
├── TTS/STT coordination
├── State management (50+ pieces)
├── Phase transitions
├── Post-call analysis
└── UI rendering
```

### After (Target)
```
CharmerController.tsx (150 lines - UI ONLY)
├── services/
│   ├── CallOrchestrator.ts (350 lines)
│   ├── TranscriptProcessor.ts (350 lines)
│   ├── ResponseCoordinator.ts (300 lines)
│   └── PostCallAnalyzer.ts (250 lines)
├── hooks/
│   ├── useCharmerServices.ts (100 lines)
│   └── useCallOrchestration.ts (150 lines - to be created)
└── context/
    └── CharmerServicesContext.tsx (100 lines)
```

---

## Service Responsibilities

### 1. CallOrchestrator
**Location:** `services/CallOrchestrator.ts`

**Responsibilities:**
- Call start/stop/pause
- Session ID generation
- Service initialization (PhaseManager, ConversationTracker, TurnTracker)
- Phase transitions
- Call state management

**API:**
```typescript
class CallOrchestrator {
  startCall(scenario: MarcusScenario): Promise<CallServices>
  endCall(): CallServices | null
  togglePause(): void
  getState(): CallState
  getServices(): CallServices
  isCallActive(): boolean
  getElapsedTime(): number
  transitionToPhase(phase: CharmerPhase, reason?: string): void
}
```

### 2. TranscriptProcessor
**Location:** `services/TranscriptProcessor.ts`

**Responsibilities:**
- Echo filtering (detect Marcus's voice)
- Multi-part utterance stitching
- Quality assessment
- Utterance validation
- Continuation detection

**API:**
```typescript
class TranscriptProcessor {
  processTranscript(transcript: string, isFinal: boolean): ProcessedTranscript | null
  setLastMarcusMessage(message: string): void
  handleInterruption(text: string, count: number): void
  hasQueuedUtterances(): boolean
  getStitchedUtterance(): ProcessedTranscript | null
  detectContinuationCue(text: string): boolean
  reset(): void
}
```

### 3. ResponseCoordinator
**Location:** `services/ResponseCoordinator.ts`

**Responsibilities:**
- AI response generation orchestration
- Strategy layer integration
- Judgment gate routing
- Question classification
- Speculative response generation

**API:**
```typescript
class ResponseCoordinator {
  generateResponse(request: ResponseRequest, signal?: AbortSignal): Promise<MarcusResponse>
  applyJudgmentGate(response: MarcusResponse, userText: string, history: any[]): JudgmentDecision
  reset(): void
}
```

### 4. PostCallAnalyzer
**Location:** `services/PostCallAnalyzer.ts`

**Responsibilities:**
- Critical moment detection
- Moment feedback generation
- Call metrics calculation
- Post-call data assembly

**API:**
```typescript
class PostCallAnalyzer {
  analyzeCall(turnTracker, conversationTracker, sessionId, startTime): Promise<PostCallData>
  generateMomentSummary(moment, context): Promise<string>
  deepDiveMoment(moment, transcript): Promise<any>
  exportCallData(data: PostCallData): string
}
```

---

## Migration Steps

### Step 1: Wrap App with Services Provider ✅

```tsx
// In app root or CharmerController parent
import { CharmerServicesProvider } from './context/CharmerServicesContext';

<CharmerServicesProvider>
  <CharmerController />
</CharmerServicesProvider>
```

### Step 2: Access Services in CharmerController

```tsx
import { useCharmerServices } from './hooks/useCharmerServices';

function CharmerController() {
  const {
    callOrchestrator,
    transcriptProcessor,
    responseCoordinator,
    postCallAnalyzer
  } = useCharmerServices();
  
  // Now use services instead of local logic
}
```

### Step 3: Replace Call Lifecycle Logic

**Before:**
```tsx
const startCall = useCallback(async (scenario: MarcusScenario) => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const sessionId = `charmer_${timestamp}_${randomId}`;
  
  callStartTimeRef.current = Date.now();
  conversationTrackerRef.current = new ConversationTracker(callStartTimeRef.current);
  turnTrackerRef.current = new TurnTracker(callStartTimeRef.current);
  phaseManagerRef.current = new CharmerPhaseManager();
  // ... 50 more lines
}, []);
```

**After:**
```tsx
const startCall = useCallback(async (scenario: MarcusScenario) => {
  const services = await callOrchestrator.startCall(scenario);
  setCallServices(services);
  
  // Start voice call
  await marcusVoice.startCall?.();
}, [callOrchestrator]);
```

**Lines saved:** ~80 lines

### Step 4: Replace Transcript Processing

**Before:**
```tsx
const handleFinalTranscript = useCallback((transcript: string) => {
  const newContent = transcript.replace(lastTranscriptRef.current, '').trim();
  
  // Echo filter
  if (isEcho(newContent)) {
    lastTranscriptRef.current = transcript;
    return;
  }
  
  // Quality check
  const qualityCheck = TranscriptQualityDetector.assess(newContent);
  
  utteranceCountRef.current++;
  // ... 40 more lines
}, []);
```

**After:**
```tsx
const handleFinalTranscript = useCallback((transcript: string) => {
  const processed = transcriptProcessor.processTranscript(transcript, true);
  
  if (!processed) return; // Filtered or invalid
  
  processUserInput(processed.text);
}, [transcriptProcessor]);
```

**Lines saved:** ~60 lines

### Step 5: Replace Response Generation

**Before:**
```tsx
const processUserInput = useCallback(async (userText: string) => {
  // Build strategy context (30 lines)
  const strategyContext = {
    phase: phaseManagerRef.current!.getCurrentPhase() === 'prospect' ? 0 : 1,
    conversationHistory: conversationHistoryRef.current,
    // ... 20 more properties
  };
  
  // Get strategy (5 lines)
  const strategy = strategyLayerRef.current!.determineStrategy(strategyContext);
  
  // Generate AI response (20 lines)
  const aiResponse = await aiServiceRef.current!.generateResponse({
    // ... complex context building
  });
  
  // Apply judgment gate (15 lines)
  const decision = judgmentGateRef.current!.decide({
    // ... more context
  });
  
  // ... 80 more lines of processing
}, []);
```

**After:**
```tsx
const processUserInput = useCallback(async (userText: string) => {
  const services = callOrchestrator.getServices();
  
  const response = await responseCoordinator.generateResponse({
    userText,
    conversationHistory: conversationHistoryRef.current,
    phase: services.phaseManager.getCurrentPhase(),
    turnContext: services.turnTracker.getCurrentContext()
  });
  
  const decision = responseCoordinator.applyJudgmentGate(
    response,
    userText,
    conversationHistoryRef.current
  );
  
  if (decision.action === 'speak') {
    speakMarcusResponse(response);
  }
}, [callOrchestrator, responseCoordinator]);
```

**Lines saved:** ~120 lines

### Step 6: Replace Post-Call Analysis

**Before:**
```tsx
const handleCallEnd = useCallback(async () => {
  // Detect moments (20 lines)
  const detector = new CriticalMomentDetector();
  const moments = await detector.detectCriticalMomentsWithLLM(
    transcript,
    conversationTrackerRef.current!
  );
  
  // Generate feedback (30 lines)
  const feedbackGenerator = new MomentFeedbackGenerator();
  const momentsWithFeedback = await Promise.all(
    moments.map(m => feedbackGenerator.generateFeedback(m))
  );
  
  // Calculate metrics (40 lines)
  const metrics = {
    // ... complex calculation
  };
  
  // ... 50 more lines
}, []);
```

**After:**
```tsx
const handleCallEnd = useCallback(async () => {
  const services = callOrchestrator.endCall();
  if (!services) return;
  
  const postCallData = await postCallAnalyzer.analyzeCall(
    services.turnTracker,
    services.conversationTracker,
    callOrchestrator.getState().sessionId!,
    callOrchestrator.getState().startTime!
  );
  
  setPostCallData(postCallData);
  onCallComplete?.(postCallData);
}, [callOrchestrator, postCallAnalyzer, onCallComplete]);
```

**Lines saved:** ~140 lines

---

## State Reduction

### Before: 50+ pieces of state
```tsx
// Call state
const [isCallActive, setIsCallActive] = useState(false);
const [sessionId, setSessionId] = useState<string | null>(null);
const callStartTimeRef = useRef<number>(0);

// Transcript state
const utteranceCountRef = useRef(0);
const lastTranscriptRef = useRef('');
const lastMarcusMessageRef = useRef('');
const queuedUtterancesRef = useRef<any[]>([]);
const interruptedUtteranceRef = useRef<any>(null);
const processingTranscriptRef = useRef('');
const isStitchedMessageRef = useRef(false);

// Service refs
const phaseManagerRef = useRef<CharmerPhaseManager | null>(null);
const conversationTrackerRef = useRef<ConversationTracker | null>(null);
const turnTrackerRef = useRef<TurnTracker | null>(null);
const aiServiceRef = useRef<CharmerAIService | null>(null);
const strategyLayerRef = useRef<StrategyLayer | null>(null);
const judgmentGateRef = useRef<JudgmentGate | null>(null);

// Processing state
const [isProcessing, setIsProcessing] = useState(false);
const [isMarcusSpeaking, setIsMarcusSpeaking] = useState(false);
const wasInterruptedRef = useRef(false);

// ... 30+ more pieces
```

### After: ~10 pieces of state
```tsx
// Services from context
const {
  callOrchestrator,
  transcriptProcessor,
  responseCoordinator,
  postCallAnalyzer
} = useCharmerServices();

// Call services (initialized on start)
const [callServices, setCallServices] = useState<CallServices | null>(null);

// UI state
const [isProcessing, setIsProcessing] = useState(false);
const [isMarcusSpeaking, setIsMarcusSpeaking] = useState(false);
const [selectedScenario, setSelectedScenario] = useState<MarcusScenario | null>(null);

// Post-call data
const [postCallData, setPostCallData] = useState<PostCallData | null>(null);

// Conversation history (still needed for UI)
const conversationHistoryRef = useRef<Array<{role: string; content: string}>>([]);
```

**State reduction:** 50+ → ~10 pieces (80% reduction)

---

## Benefits

### 1. **Testability** 
Each service can be unit tested in isolation:
```typescript
describe('TranscriptProcessor', () => {
  it('should filter echo', () => {
    const processor = new TranscriptProcessor();
    processor.setLastMarcusMessage('Hello there');
    const result = processor.processTranscript('Hello there', true);
    expect(result).toBeNull(); // Filtered as echo
  });
});
```

### 2. **Maintainability**
- Each file has single responsibility
- Easy to locate bugs (e.g., echo filter issue → check TranscriptProcessor)
- Changes don't ripple through entire system

### 3. **Reusability**
Services can be used in other components:
```typescript
// Use in a different call experience
function SimplerCallComponent() {
  const { responseCoordinator } = useCharmerServices();
  // Same AI logic, different UI
}
```

### 4. **Debugging**
Centralized logging per service:
```
📞 [CallOrchestrator] Starting call
📝 [TranscriptProcessor] Processing utterance #3
🤖 [ResponseCoordinator] Generating response
📊 [PostCallAnalyzer] Detected 5 moments
```

---

## Next Steps

### Immediate (P0)
1. ✅ Create service layer foundation
2. ✅ Create context provider
3. ⏳ Wrap CharmerController with provider
4. ⏳ Migrate call lifecycle to CallOrchestrator
5. ⏳ Migrate transcript processing to TranscriptProcessor

### Short-term (P1)
6. Migrate response generation to ResponseCoordinator
7. Migrate post-call analysis to PostCallAnalyzer
8. Remove old code from CharmerController
9. Update tests

### Future (P2)
10. Extract UI components from CharmerController
11. Create presentation/container split
12. Add service-level caching
13. Implement state machine for call flow

---

## File Size Comparison

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| CharmerController.tsx | 1848 | ~150 | **92%** |
| CallOrchestrator.ts | - | 195 | +195 |
| TranscriptProcessor.ts | - | 267 | +267 |
| ResponseCoordinator.ts | - | 225 | +225 |
| PostCallAnalyzer.ts | - | 200 | +200 |
| CharmerServicesContext.tsx | - | 53 | +53 |
| **Total** | **1848** | **1090** | **41% overall reduction** |

**Net benefit:** 758 fewer lines + better organization + easier testing

---

## TypeScript Errors to Fix

The PostCallAnalyzer.ts has type mismatches that need correction:
- `detectCriticalMomentsWithLLM` return type doesn't match usage
- `CallMetrics` interface needs updating
- `MomentFeedbackGenerator` API signature mismatch

These will be fixed during migration when actual API signatures are confirmed.

---

*Last Updated: March 22, 2026*
*Status: Foundation Complete - Ready for Migration*

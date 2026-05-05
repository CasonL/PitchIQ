# Latency Tracking - Current State & Enhancement Options

**Status**: Partially implemented - can be enhanced  
**Current Capability**: Basic LLM timing exists  
**Effort to Complete**: 2-3 hours

## What's Already Tracked

### In CharmerAIService.ts (lines 814, 893-906)

```typescript
const startTime = performance.now();

// ... streaming response ...

if (!firstChunkTime) {
  firstChunkTime = performance.now();
  const timeToFirst = firstChunkTime - startTime;
  console.log(`⚡ First token in ${timeToFirst.toFixed(0)}ms`);
}

// ... completion ...
const duration = performance.now() - startTime;
console.log(`⏱️ LLM stream completed in ${duration.toFixed(0)}ms`);
```

**Current Metrics**:
- ✅ Time To First Token (TTFT) - How fast LLM starts responding
- ✅ Total Generation Time - Complete LLM response duration
- ✅ Prompt size (character count)

## What's Missing

### End-to-End Latency Tracking

```
User speaks → STT → Classification → LLM → TTS → Marcus speaks
    ^                                                      ^
    |________________ TOTAL LATENCY _____________________|
```

**Not currently measured**:
- ❌ User speech end → Transcript available (STT latency)
- ❌ Transcript → Classification → Routing decision
- ❌ LLM response → Audio playback start (TTS latency)
- ❌ Total perceived latency (user perspective)

### Per-Question-Type Metrics

Currently no breakdown by question category:
- How fast are `instant` questions? (target: <500ms)
- How slow are `deliberate` questions? (acceptable: 2000ms+)
- Are we within expected thresholds?

## Implementation Plan

### Phase 1: Enhanced Timing Service (1 hour)

Create `services/LatencyTracker.ts`:

```typescript
export interface LatencyMetrics {
  sessionId: string;
  utteranceNumber: number;
  questionCategory: QuestionCategory;
  
  // Timestamps
  userSpeechEnd: number;
  transcriptReceived: number;
  classificationComplete: number;
  llmFirstToken: number;
  llmComplete: number;
  ttsStart: number;
  marcusSpeechStart: number;
  
  // Calculated durations
  sttLatency: number;        // userSpeechEnd → transcriptReceived
  processingLatency: number; // transcriptReceived → llmFirstToken
  ttft: number;              // llmFirstToken - requestStart
  generationTime: number;    // llmComplete - llmFirstToken
  ttsLatency: number;        // ttsStart - llmComplete
  totalLatency: number;      // userSpeechEnd → marcusSpeechStart
}

export class LatencyTracker {
  private metrics: LatencyMetrics[] = [];
  
  startUtterance(sessionId: string, utteranceNumber: number): string {
    const id = `${sessionId}_${utteranceNumber}`;
    // Track timing for this utterance
    return id;
  }
  
  recordTimestamp(utteranceId: string, event: keyof LatencyMetrics): void {
    // Record timestamp
  }
  
  getMetrics(sessionId: string): LatencyMetrics[] {
    // Return all metrics for analysis
  }
  
  getAverageByCategory(category: QuestionCategory): {
    avgTTFT: number;
    avgTotal: number;
    count: number;
  } {
    // Calculate averages per question type
  }
}
```

### Phase 2: Integration Points (1 hour)

**In CharmerController.tsx**:
```typescript
// When transcript arrives
latencyTracker.recordTimestamp(utteranceId, 'transcriptReceived');

// After classification
latencyTracker.recordTimestamp(utteranceId, 'classificationComplete');

// When LLM starts
latencyTracker.recordTimestamp(utteranceId, 'llmFirstToken');

// When TTS begins
latencyTracker.recordTimestamp(utteranceId, 'ttsStart');

// When Marcus speaks
latencyTracker.recordTimestamp(utteranceId, 'marcusSpeechStart');
```

### Phase 3: Analytics Dashboard (1 hour)

Simple overlay for dev/debug showing:
- Current utterance latency breakdown
- Session averages by question category
- Highlight slow responses (>threshold)

**Visual Format**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LATENCY BREAKDOWN - Utterance #5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question Type: thoughtful (discovery)
STT:          120ms  ████░░░░░░░░░░░░░░░░
Classification: 15ms  █░░░░░░░░░░░░░░░░░░░
LLM TTFT:     850ms  ████████████████░░░░
Generation:   320ms  ██████░░░░░░░░░░░░░░
TTS:          180ms  ████░░░░░░░░░░░░░░░░
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:       1485ms  
Target:      <2000ms  ✅ WITHIN THRESHOLD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session Averages:
  instant:    avg 285ms (14 samples)
  quick:      avg 720ms (8 samples)
  thoughtful: avg 1420ms (12 samples)
  deliberate: avg 1890ms (5 samples)
```

## Expected Baseline Performance

Based on current architecture:

**Instant Questions** (greetings, confirmations):
- Target: <500ms total latency
- Current: Unknown (need metrics)
- Components: STT (100ms) + Canned/Focused LLM (200ms) + TTS (150ms)

**Quick Questions** (clarifications):
- Target: <1000ms total latency
- Components: STT (100ms) + Focused LLM (500ms) + TTS (200ms)

**Thoughtful Questions** (discovery):
- Target: <2000ms acceptable
- Components: STT (100ms) + Full LLM (1200ms) + TTS (200ms)

**Deliberate Questions** (objections, pricing):
- Target: <2500ms acceptable
- Components: STT (100ms) + Full LLM (1800ms) + TTS (200ms)

## When Hybrid Routing Would Help

**Current bottleneck**: All questions go through full LLM (1000-2000ms)

**After hybrid routing**:
- `instant` → Canned (0ms LLM) = **500ms total** ⚡
- `quick` → Focused LLM (500ms) = **800ms total** ⚡
- `thoughtful` → Bridge + Full = **1500ms total** (user hears bridge at 500ms)
- `deliberate` → Bridge + Full = **2000ms total** (user hears bridge at 500ms)

## Data Export for Analysis

Store metrics in localStorage or send to backend:

```typescript
interface SessionReport {
  sessionId: string;
  scenario: string;
  totalUtterances: number;
  averageLatency: number;
  latencyByCategory: Record<QuestionCategory, number>;
  slowUtterances: Array<{ number: number; latency: number; text: string }>;
  metrics: LatencyMetrics[];
}
```

Can export as JSON for analysis in Excel/Python.

## Implementation Priority

**High Priority** (Do Now):
- Add basic timing to CharmerController (user speech → Marcus speaks)
- Log to console for manual inspection
- Establish baseline numbers

**Medium Priority** (After Baseline):
- Create LatencyTracker service
- Add per-category breakdown
- Identify actual bottlenecks

**Low Priority** (Nice to Have):
- Visual dashboard overlay
- Historical trend analysis
- Export to analytics backend

## Next Steps

1. **Add quick timing logs** to CharmerController.tsx:
   ```typescript
   const userSpeechEndTime = performance.now();
   // ... processing ...
   const marcusSpeechStartTime = performance.now();
   console.log(`⏱️ Total latency: ${marcusSpeechStartTime - userSpeechEndTime}ms`);
   ```

2. **Run 5-10 test calls** and manually note latencies per question type

3. **Analyze results**:
   - Are instant questions >500ms? → Opportunity for hybrid routing
   - Are deliberate questions <1000ms? → Already fast, no need for optimization
   - Where's the actual bottleneck? (STT vs LLM vs TTS)

4. **Only implement hybrid routing if**:
   - Instant questions average >1000ms
   - Users notice/complain about lag
   - Data shows clear improvement opportunity

---

**Current Status**: ✅ Basic LLM timing exists  
**Next Action**: Add end-to-end timing logs to establish baseline  
**Decision Point**: Review baseline before building LatencyTracker service

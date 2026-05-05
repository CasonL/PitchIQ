# Hybrid Routing Concept - Future Implementation

**Status**: Documented for future implementation  
**Estimated Effort**: 5 hours  
**Priority**: Implement when user feedback indicates response latency is an issue

## Problem Statement

Voice agents face a tradeoff:
- **Fast responses** (word chunking): Feel conversational but shallow reasoning
- **Deep responses** (full reasoning): Nuanced but can feel sluggish

Current PitchIQ system uses single-path routing - every response goes through full LLM regardless of complexity.

## Proposed Solution: Response Complexity Routing

Route Marcus responses between **reflex** and **deliberation** based on what the moment actually needs:

```
User speaks → Classify complexity → Route:
  ├─ INSTANT (greetings) → Canned response (0ms)
  ├─ QUICK (clarifications) → Reflex LLM (500ms, focused prompt)
  ├─ THOUGHTFUL (discovery) → Bridge phrase + Deliberate LLM
  └─ DELIBERATE (objections) → Bridge phrase + Full context LLM
```

## Existing Infrastructure (80% Built)

### Already Implemented

1. **QuestionClassifier** (`QuestionClassifier.ts`)
   - Categories: `instant` | `quick` | `thoughtful` | `deliberate` | `statement`
   - Thinking times: 150ms → 1800ms
   - Pattern matching for discovery, objections, pricing questions

2. **FirstUtterancePatternDetector** (`FirstUtterancePatternDetector.ts`)
   - Canned responses for pure greetings
   - Focused prompts for simple patterns
   - Compound pattern detection

3. **ResponseCoordinator** (`services/ResponseCoordinator.ts`)
   - `trySpeculativeResponse()` for instant rapport questions
   - Question classification integration

4. **MarcusState** (`MarcusState.ts`)
   - Tracks patience, irritation, behavioral stages
   - Needed to ensure reflex responses match state

## Missing Components (20% to Build)

### 1. ResponseRouter Class

```typescript
export type ResponsePath = 'canned' | 'reflex_llm' | 'bridge_deliberate' | 'deliberate';

export class ResponseRouter {
  static route(
    userText: string,
    marcusState: MarcusState,
    patternMatch: PatternMatch | null,
    questionClassification: QuestionClassification
  ): RoutingDecision {
    // Route based on complexity AND safety
  }
  
  private static selectBridge(
    classification: QuestionClassification,
    state: MarcusState
  ): string | undefined {
    // Natural latency masks
  }
}
```

### 2. Bridge Phrase System

Context-aware phrases that are **safe to say before full reasoning is done**:

**Discovery Questions**:
- "Hmm."
- "Let me think..."
- "Good question."

**Objections/Pricing**:
- "Fair question."
- "I mean..."
- "That's a good point."

**Comparison Questions**:
- "Honestly?"
- "Well..."

**Critical Design Principle**: Bridge phrases must:
- ✅ Never commit to a position
- ✅ Sound natural (not robotic stalling)
- ✅ Match Marcus's current state (don't say "Good question" if impatient)
- ❌ Never contradict what deliberate response will say

### 3. Extended Pattern Matching

Current `FirstUtterancePatternDetector` only works for first utterance.  
Need routing logic that works **throughout entire conversation**.

### 4. State Consistency Layer

Ensure reflex responses don't contradict Marcus's:
- Current pain level
- Budget constraints
- Satisfaction with current solution
- Behavioral stage (normal/impatient/done)

## Implementation Steps

### Phase 1: Core Router (2 hours)
- Create `ResponseRouter.ts`
- Implement routing logic based on question classification
- Add bridge phrase selection with state awareness

### Phase 2: Integration (1 hour)
- Integrate into `CharmerController.tsx` transcript processing
- Wire up to existing QuestionClassifier
- Pass MarcusState for consistency checks

### Phase 3: Testing & Tuning (2 hours)
- Add logging to measure latency improvements
- Test state consistency (reflex doesn't contradict deliberate)
- Verify natural feel of bridge phrases
- Ensure no "two raccoons in a trench coat" effect

## Key Design Decisions

### When to Use Reflex Path

**Safe for reflex** (no deep reasoning needed):
- "Yeah?" / "Who is this?" / "Okay."
- "Good, you?"
- Simple acknowledgments
- Identity confirmations

**Requires deliberation**:
- Discovery questions about pain/process
- Objection handling
- Pricing discussions
- Strategic pivots

### Bridge Phrase Selection Policy

**No bridge if**:
- Marcus is impatient/done (would feel fake)
- Response is already instant (greetings)

**Use bridge if**:
- Question is thoughtful/deliberate
- Marcus has patience to "think"
- Natural human would pause here

### Avoiding the Trap

❌ **Don't** switch between "dumb mode" and "smart mode"  
✅ **Do** treat it as surface control vs deep intention modeling

## Success Metrics

Track before/after implementation:

1. **Time to First Response** (TTFR)
   - Target: <500ms for instant/quick questions
   - Baseline: Currently unknown (need metrics)

2. **Response Quality** (Qualitative)
   - Does Marcus still feel coherent?
   - Are objections still authentic?
   - Do bridges feel natural?

3. **User Perception**
   - Survey: "Did Marcus feel responsive?"
   - Compare to competitors (Kendo uses word chunking)

## When to Implement

**Build this when**:
- ✅ Users complain about response lag
- ✅ Analytics show drop-off during pauses
- ✅ Competitors winning on perceived speed
- ✅ Latency metrics show TTFR >2s for simple questions

**Don't build until**:
- ❌ No evidence users notice/care about delay
- ❌ Other priorities are more impactful
- ❌ Risk of adding complexity without proven need

## Competitive Context

**Kendo AI**: Uses word chunking for fast responses but sacrifices depth  
**PitchIQ Opportunity**: Match their speed on simple questions, exceed their depth on complex ones

## References

- Conversation with AI about Kendo sales training (May 4, 2026)
- QuestionClassifier implementation
- FirstUtterancePatternDetector patterns
- ResponseCoordinator speculative logic

---

**Next Steps When Implementing**:
1. Add latency metrics to current system (see LATENCY_TRACKING.md)
2. Establish baseline TTFR for each question category
3. Build ResponseRouter with bridge logic
4. A/B test with users to validate improvement

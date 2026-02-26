# PitchIQ Voice Architecture Rebuild Plan

**Created:** January 1, 2026  
**Timeline:** 6-8 weeks  
**Goal:** Build production-grade two-rail voice architecture with Coach orchestration and behavioral mirroring

---

## Executive Summary

### Current Problems
- Deepgram Agent API is unstable (watchdog timers, fallback recovery, session ID mismatches)
- Voice infrastructure tangled with coaching logic
- Awkward timing and interruptions
- Response latency feels unnatural (2-5 seconds)
- Extensive defensive programming indicates architectural issues

### Solution
Implement **two-rail architecture** that separates:
- **Top Rail (Timing Authority):** Controls WHEN to speak (VAD, turn state, speech gate)
- **Bottom Rail (Meaning Authority):** Controls WHAT to say (Coach LLM, queue, prospect planner)

### Benefits
- ✅ 200-800ms response time (vs. 2-5 seconds currently)
- ✅ Natural interruption handling
- ✅ Coach-driven intervention strategies
- ✅ Behavioral mirroring for authentic training
- ✅ 70-80% code reuse via refactoring (not rewriting)

---

## Phase 1: Two-Rail Architecture Foundation (Weeks 1-2)

### Week 1: Split Timing from Meaning

**Goal:** Refactor existing WebSocketManager into separate timing and meaning authorities.

#### Tasks

**1.1 Create Core Classes (2 days)**
```
└─ app/frontend/src/components/voice/architecture/
   ├─ TimingAuthority.ts (top rail - 50 lines)
   ├─ MeaningAuthority.ts (bottom rail - 50 lines)
   ├─ SpeechGate.ts (20 lines)
   └─ ProspectQueue.ts (50 lines)
```

**1.2 Refactor WebSocketManager (2 days)**
- Extract timing logic → TimingAuthority
- Extract response generation → MeaningAuthority
- Keep WebSocketManager as routing layer
- Don't change behavior yet (prove refactor works)

**1.3 Add Basic Queue (1 day)**
```typescript
class ProspectQueue {
  private items: QueueItem[] = [];
  
  push(item: QueueItem): void;
  getNext(): QueueItem | null;
  removeExpired(): void;
}

interface QueueItem {
  text: string;
  priority: number;
  expires_in_ms: number;
  timestamp: number;
}
```

**Deliverable:** Refactored architecture with queue (no behavior change yet)

---

### Week 2: Implement Speech Gate & Timing Control

**Goal:** Decouple speech timing from generation timing.

#### Tasks

**2.1 Implement SpeechGate (2 days)**
```typescript
class SpeechGate {
  open(duration_ms?: number): void {
    const item = this.queue.getNext();
    if (item) this.speak(item);
  }
  
  close(): void {
    this.abortCurrentSpeech();
  }
}
```

**2.2 Connect Top Rail to VAD Events (2 days)**
```typescript
class TimingAuthority {
  onUserStartedSpeaking() {
    this.turnState = 'user';
    this.gate.close();
  }
  
  onSilenceDetected(duration_ms: number) {
    if (duration_ms > 800 && this.userDoneTalking()) {
      this.gate.open();
    }
  }
}
```

**2.3 Make Bottom Rail Async (1 day)**
- Response generation doesn't block
- Push to queue instead of immediate TTS
- Top rail controls when to speak

**Deliverable:** Working two-rail system with improved timing

**Success Metrics:**
- Response latency reduced to <500ms
- No more awkward simultaneous speaking
- Queue successfully buffers responses

---

## Phase 2: Queue Intelligence (Week 3)

### Week 3: Priority, Expiration, and Metadata

**Goal:** Add smart queue features for Coach control.

#### Tasks

**3.1 Add Priority Sorting (1 day)**
```typescript
interface QueueItem {
  text: string;
  priority: number;        // 0-1, higher = more urgent
  expires_in_ms: number;
  interrupt_ok: boolean;   // Can interrupt user?
  abortable: boolean;      // Can be cut off mid-speech?
  timestamp: number;
}

push(item: QueueItem): void {
  this.items.push(item);
  this.items.sort((a, b) => b.priority - a.priority);
}
```

**3.2 Add Context Versioning (2 days)**
```typescript
class ProspectQueue {
  private contextVersion: number = 0;
  
  onNewUserSpeech(): void {
    this.contextVersion++;
    this.removeStaleItems();
  }
  
  removeStaleItems(): void {
    this.items = this.items.filter(item => 
      item.contextVersion >= this.contextVersion - 1
    );
  }
}
```

**3.3 Add Queue Bounds (1 day)**
- Max queue size: 5 items
- Drop lowest priority when full
- Prevent memory leaks

**Deliverable:** Intelligent queue with priority and expiration

---

## Phase 3: Coach Orchestration System (Weeks 4-5)

### Week 4: Core Intervention Strategies

**Goal:** Implement 3 foundational intervention strategies.

#### Tasks

**4.1 Create Coach LLM Service (2 days)**
```
└─ app/services/coach/
   ├─ coach_orchestrator.py (main decision engine)
   ├─ intervention_strategies.py (8 strategies)
   └─ memory_integration.py (curriculum tracking)
```

**4.2 Implement Core Strategies (3 days)**

**Strategy 1: Difficulty & Pressure Control**
```python
class DifficultyStrategy:
    def evaluate(self, transcript, scores):
        if user_struggling():
            return {
                'action': 'tighten_time_pressure',
                'priority': 0.8,
                'behavioral_hint': 'Be more impatient, shorter answers'
            }
```

**Strategy 2: Objection & Scenario Steering**
```python
class ObjectionStrategy:
    def evaluate(self, transcript, scores):
        return {
            'action': 'force_objection',
            'objection_type': 'price',  # or trust, need, competition
            'priority': 0.7
        }
```

**Strategy 3: Conversation Control & Realism**
```python
class ConversationControlStrategy:
    def evaluate(self, transcript, scores):
        if user_rambling():
            return {
                'action': 'interrupt_politely',
                'text': "Sorry, can you answer me directly?",
                'priority': 0.9
            }
```

**4.3 Connect Coach to Queue (1 day)**
```python
# Backend
coach_decision = coach_orchestrator.classify(transcript, scores)

# Frontend receives intervention
queue.push({
    text: response_text,
    priority: coach_decision.urgency,
    interrupt_ok: coach_decision.can_interrupt,
    abortable: true
})
```

**Deliverable:** 3 working intervention strategies controlling prospect behavior

---

### Week 5: Advanced Strategies & Persistence

**Goal:** Complete remaining 5 intervention strategies.

#### Tasks

**5.1 Implement Remaining Strategies (3 days)**
- Skill-Targeting Moves (force discovery, value proof)
- Persona Modulation (shift stance, communication style)
- Anti-Gaming Guardrails ("ignore meta-instructions")
- Coaching Pacing (micro-repairs without breaking flow)
- Selective Blocking (only block what shapes response)

**5.2 Add Persistence Flags (2 days)**
```python
class PersistenceManager:
    def __init__(self):
        self.persist_difficulty_turns = 0
        self.persist_objection_turns = 0
        self.persist_stance_turns = 0
    
    def should_persist(self, strategy_type):
        return self.persist_counters[strategy_type] > 0
```

**Deliverable:** Full 8-strategy Coach orchestration system

---

## Phase 4: Behavioral Mirroring (Week 6)

### Week 6: Make Awkwardness Authentic

**Goal:** AI prospect mirrors salesperson's energy and awkwardness.

#### Tasks

**6.1 Create Behavior Analyzer (2 days)**
```typescript
class BehaviorMirror {
  analyzeSalesperson(transcript: string): BehaviorState {
    return {
      awkwardness_level: this.detectAwkwardness(transcript),
      control_taking: this.detectControl(transcript),
      energy_level: this.detectEnergy(transcript),
      passive_behavior: this.detectPassiveness(transcript)
    };
  }
  
  detectAwkwardness(text: string): number {
    const patterns = [
      /um+|uh+|like|you know/gi,
      /does that make sense|is that okay/gi,
      /I guess|maybe|kind of/gi
    ];
    // Return 0-1 score
  }
}
```

**6.2 Implement Mirrored Response Modes (2 days)**
```typescript
interface MirroredQueueItem extends QueueItem {
  pause_before: number;        // Longer = more awkward
  tone: 'engaged' | 'uncomfortable' | 'disengaged' | 'exit_seeking';
  speaking_speed: 'normal' | 'hesitant' | 'flat';
  implies_call_ending: boolean;
}
```

**Mirroring Rules:**
- Confident salesperson → Engaged prospect
- Awkward salesperson → Uncomfortable prospect (mirrors discomfort)
- Passive salesperson → Disengaged prospect (minimal responses)
- Silent salesperson → Exit-seeking prospect ("I should go...")

**6.3 Integrate Silence Handling (1 day)**
```typescript
class SilenceHandler {
  onUserSilence(duration_ms: number) {
    if (salesState.control_taking < 0.3) {
      // Passive salesperson - don't rescue
      if (duration_ms < 2000) {
        this.gate.stay_closed(); // Let awkwardness build
      } else if (duration_ms < 5000) {
        queue.push({ text: "...", tone: 'uncomfortable' });
      } else {
        queue.push({ 
          text: "I should probably get going...",
          tone: 'exit_seeking',
          implies_call_ending: true 
        });
      }
    }
  }
}
```

**Deliverable:** Realistic behavioral mirroring that makes awkwardness feel authentic

---

## Phase 5: Evaluation System (Week 7)

### Week 7: Rubric-Based Assessment

**Goal:** Replace point system with holistic rubric evaluation.

#### Tasks

**7.1 Design Evaluation Rubric (1 day)**
```python
EVALUATION_RUBRIC = {
    'discovery': {
        'weight': 0.25,
        'criteria': [
            'Asked open-ended questions',
            'Uncovered pain points',
            'Listened without interrupting',
            'Probed for specifics'
        ]
    },
    'value_articulation': {
        'weight': 0.25,
        'criteria': [
            'Connected product to needs',
            'Used specific examples',
            'Avoided generic claims',
            'Tailored to prospect context'
        ]
    },
    'objection_handling': {
        'weight': 0.20,
        'criteria': [
            'Acknowledged concerns',
            'Asked clarifying questions',
            'Provided relevant responses',
            'Didn\'t defend reactively'
        ]
    },
    'conversation_control': {
        'weight': 0.15,
        'criteria': [
            'Natural pacing',
            'Didn\'t ramble',
            'Led conversation',
            'Managed interruptions'
        ]
    },
    'closing': {
        'weight': 0.15,
        'criteria': [
            'Moved toward next step',
            'Asked for commitment',
            'Didn\'t oversell',
            'Created clear follow-up'
        ]
    }
}
```

**7.2 Implement Post-Call Analysis (3 days)**
```python
class RubricEvaluator:
    async def evaluate_call(self, transcript, persona, duration):
        analysis = await gpt4o.analyze(f"""
        Evaluate this sales call using the rubric.
        Provide:
        1. Score (0-10) for each category
        2. Specific evidence from transcript
        3. Key moments with timestamps
        4. Strengths and improvement areas
        5. Next practice focus
        
        Transcript: {transcript}
        """)
        
        return PostCallEvaluation(
            rubric_scores=analysis.scores,
            strengths=analysis.strengths,
            improvement_areas=analysis.areas,
            key_moments=analysis.moments,
            overall_grade=analysis.grade,
            next_focus=analysis.focus
        )
```

**7.3 Build Evaluation UI (2 days)**
- Post-call summary screen
- Rubric breakdown visualization
- Key moment playback
- Progress tracking over time

**Deliverable:** Holistic rubric-based evaluation (not gameable points)

---

## Phase 6: Integration & Polish (Week 8)

### Week 8: Testing, Tuning, and Deployment

#### Tasks

**8.1 End-to-End Testing (2 days)**
- Test all 8 intervention strategies
- Test behavioral mirroring edge cases
- Test queue under various timing scenarios
- Validate rubric evaluation quality

**8.2 VAD Tuning (2 days)**
- A/B test silence thresholds (600ms, 800ms, 1000ms)
- Test with different speaking styles
- Tune interrupt detection
- Optimize for natural flow

**8.3 Performance Optimization (1 day)**
- Ensure <500ms response latency
- Optimize LLM prompt lengths
- Test queue under load
- Profile memory usage

**8.4 Documentation & Handoff (2 days)**
- Architecture documentation
- Coach strategy guide
- Rubric calibration guide
- Troubleshooting guide

**Deliverable:** Production-ready two-rail voice architecture

---

## Technical Architecture Diagrams

### Two-Rail System

```
┌─────────────────────────────────────────┐
│         TOP RAIL (TIMING)               │
│  Mic → VAD → Turn State → Gate         │
│                           ↓             │
│                    OPEN / CLOSED        │
│                           ↓             │
│                         TTS             │
└─────────────────────────────────────────┘
                           ↑
                           │ (pull from queue)
                           │
┌─────────────────────────────────────────┐
│       BOTTOM RAIL (MEANING)             │
│  ASR → Coach → Prospect → Queue         │
│                           ↑             │
│                    (push candidates)    │
└─────────────────────────────────────────┘
```

### Coach Orchestration Flow

```
User Speech
    ↓
Transcript
    ↓
┌─────────────────────────────────┐
│      Coach LLM Classifies       │
│  - User behavior analysis       │
│  - Intervention selection       │
│  - Priority calculation         │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│   Select Intervention Plan      │
│  ┌─────────────────────────┐    │
│  │ 1. Difficulty Control   │    │
│  │ 2. Objection Steering   │    │
│  │ 3. Conversation Control │    │
│  │ 4. Skill Targeting      │    │
│  │ 5. Persona Modulation   │    │
│  │ 6. Anti-Gaming Guards   │    │
│  │ 7. Coaching Pacing      │    │
│  │ 8. Selective Blocking   │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
    ↓
Prospect Planner
    ↓
Queue (with metadata)
    ↓
Speech Gate (when timing permits)
    ↓
TTS → User hears response
```

---

## Key Implementation Principles

### 1. Timing Grants Permission, Meaning Spends It
**Top rail decides WHEN to speak**  
**Bottom rail decides WHAT to say**  
Never violate this separation.

### 2. Queue is the Contract
The queue is the **only interface** between rails:
- Bottom rail: `queue.push(item)`
- Top rail: `queue.getNext()`
- No direct calls between rails

### 3. Behavioral Mirroring > Helpful AI
The prospect should mirror the salesperson's energy:
- Confident → Engaged
- Awkward → Uncomfortable
- Passive → Disengaged

Never rescue the salesperson. Make awkwardness feel real.

### 4. Rubric Over Points
Evaluate holistically, not by counting actions:
- Evidence-based feedback
- Context matters
- Not gameable with keywords

---

## Code Reuse Strategy

### Keep & Refactor (70-80% reuse)
```
✅ WebSocketManager → Split into top/bottom routing
✅ AudioManager → Part of top rail
✅ Deepgram integration → Unchanged
✅ Audio worklet → Unchanged
✅ Persona generation → Feed to bottom rail
✅ ProspectScoreManager → Feed to Coach LLM
✅ All prompt engineering → Reuse in strategies
```

### New Components (20-30%)
```
🆕 TimingAuthority
🆕 MeaningAuthority
🆕 SpeechGate
🆕 ProspectQueue
🆕 CoachOrchestrator
🆕 BehaviorMirror
🆕 RubricEvaluator
```

---

## Success Metrics

### Technical Metrics
- [ ] Response latency: <500ms (target: 200-400ms)
- [ ] Queue processing: <100ms
- [ ] No simultaneous speaking
- [ ] Clean session management (no mismatch errors)
- [ ] Memory stable over 30+ minute calls

### User Experience Metrics
- [ ] Interruptions feel natural
- [ ] Awkward silence feels authentic
- [ ] Prospect behavior adapts realistically
- [ ] Coaching feedback is actionable
- [ ] No obvious "AI quirks"

### Business Metrics
- [ ] Training completion rates improve
- [ ] User satisfaction scores increase
- [ ] Skill improvement measurable over time
- [ ] Cost per session: <$0.30

---

## Risk Mitigation

### Risk 1: VAD Tuning Hell
**Mitigation:** Start with 800ms threshold, A/B test, iterate weekly

### Risk 2: Queue Timing Feels Off
**Mitigation:** Build with feature flags, can roll back to old system

### Risk 3: LLM Latency Varies
**Mitigation:** Pre-generate candidates, use timeouts, have fallbacks

### Risk 4: Integration Edge Cases
**Mitigation:** Extensive logging, debug UI, gradual rollout

---

## Week-by-Week Checklist

- [ ] **Week 1:** Two-rail refactor complete, queue added
- [ ] **Week 2:** Speech gate working, timing decoupled
- [ ] **Week 3:** Smart queue with priority & expiration
- [ ] **Week 4:** 3 core Coach strategies working
- [ ] **Week 5:** All 8 strategies + persistence
- [ ] **Week 6:** Behavioral mirroring feels authentic
- [ ] **Week 7:** Rubric evaluation replacing points
- [ ] **Week 8:** Production-ready, tested, documented

---

## IMPLEMENTATION UPDATE: Sync/Async Coach Architecture (Jan 3, 2026)

### Architecture Overview

The Coach system has been split into **two paths** that respect voice timing constraints:

```
User Speech → [SYNC: Fast Reflexes] → Current Turn Response
     ↓
[ASYNC: Strategic Planning] → Future Turn Strategy
```

### Key Insight

**"Flow prompting shapes trajectories, not utterances."**

- **Sync path:** Pattern matching for reflexes (no LLM, <50ms)
- **Async path:** LLM-based strategic planning (runs during user speech)
- **Rule:** Async only affects FUTURE turns, never current

### Three Types of Intelligence

| Type | Path | Responsibility | Timing |
|------|------|----------------|--------|
| **Reactive** | Sync | "What do I say right now?" | Every turn, <50ms |
| **Strategic** | Async | "Where is this call going?" | During user speech |
| **Pedagogical** | Post-hoc | "What did user learn?" | After call |

### Implementation Files

```
Backend:
├─ app/services/coach_sync_classifier.py   # Fast pattern matching
├─ app/services/coach_async_planner.py     # Strategic LLM planning
├─ app/services/session_state.py           # Phase machine + facts buffer
└─ app/routes/api/coach_routes.py          # API endpoints

Frontend:
├─ src/lib/voice-architecture/services/CoachService.ts
└─ src/lib/voice-architecture/VoiceOrchestrator.ts
```

### Sync Classifier (Reflex Flags)

Fast pattern-based classification. No LLM calls.

**Allowlisted outputs:**
- `max_sentences` (1-4)
- `answer_policy` ("answer" | "clarify" | "deflect")
- `do_not_echo` (boolean)
- `hard_constraints` (limited set)
- `question_type` ("open" | "closed" | "none")

```typescript
// Called every turn, <50ms
const reflexes = await coachService.syncClassify(message, sessionId);
// Returns: { max_sentences: 2, answer_policy: "answer", ... }
```

### Async Planner (Strategic Flow)

LLM-based strategic planning. Runs during user speech (uses dead time).

**Outputs:**
- `suggested_phase` (next phase transition)
- `phase_confidence` (0-1)
- `pending_trap` (trap to set up)
- `pressure_adjustment` (-0.2 to +0.2)
- `objection_to_introduce`
- `facts_detected` (extracted from conversation)

```typescript
// Called during user speech, can take 1-3 seconds
const plan = await coachService.asyncPlan(history, persona, sessionId);
// Returns: { suggested_phase: "discovery", pending_trap: "price_anchor", ... }
```

### Phase State Machine

Phases can only progress forward (with reset exception):

```
rapport → discovery → presentation → tension → close
```

**Thrash Prevention:**
- Minimum 3-turn cooldown per phase
- Confidence threshold (0.7) for transitions
- No backwards movement (except reset to rapport)

```python
# Attempt transition with guards
transitioned = session_state.try_transition_phase(
    target_phase=CallPhase.DISCOVERY,
    confidence=0.8,
    min_confidence=0.7
)
```

### Facts Buffer

Append-only runtime context. Not re-flowed, just accumulated.

```python
session_state.add_fact("industry", "healthcare")
session_state.add_fact("crm", "salesforce")
# Facts persist for the session, inform both sync and async paths
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/coach/sync-classify` | POST | Fast reflex flags |
| `/api/coach/async-plan` | POST | Strategic planning |
| `/api/coach/state` | GET | Debug current state |

### When Async Runs

1. **Triggered:** When user starts speaking
2. **Runs:** During user speech (dead time)
3. **Commits:** On end of utterance
4. **Applies:** To NEXT turn, never current

```typescript
public userStartedSpeaking(): void {
  this.topRail.onUserStartedSpeaking();
  
  // Trigger async planning during user speech
  if (this.config.enable_coach_orchestration && !this.asyncPlanPending) {
    this.triggerAsyncPlanning();
  }
}
```

### Design Principles

1. **Sync = Reflexes only.** No strategic content, no LLM.
2. **Async = Strategy only.** Never blocks response path.
3. **Future turns only.** Async never affects current turn.
4. **Compiled persona.** Base prompt is frozen, not re-flowed per turn.
5. **Facts are append-only.** No interpretation, just accumulation.
6. **Thrash prevention.** Phase machine with cooldowns.

---

## Post-Launch Improvements

### Phase 7 (Future)
- Multi-persona scenarios (panel interviews)
- Voice provider abstraction layer
- Advanced memory/curriculum system
- Real-time coaching nudges (beyond behavioral hints)
- Team training features

---

## Contact & Resources

**Architecture Questions:** Reference this document  
**Coach Strategy Design:** See intervention_strategies.py  
**Rubric Calibration:** See EVALUATION_RUBRIC constant  
**Debugging:** Enable debug UI for queue/gate visibility

---

**Remember:** This is not a rewrite, it's a refactor. We're reorganizing existing code into a better architecture, not starting from scratch.

**Core Philosophy:** Separate timing from meaning. Make awkwardness feel real. Evaluate holistically, not by points. Build for humans, not certifications.

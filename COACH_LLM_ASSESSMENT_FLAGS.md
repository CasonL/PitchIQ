# Coach LLM Assessment Flags Documentation

**Created:** January 2, 2026  
**Purpose:** Silent observation lenses that inform scoring, persistence, and learning - NOT real-time interventions

---

## Philosophy: Silent Lenses vs Active Interventions

**Two separate systems work in parallel:**

```
┌─────────────────────────────────────────────────────┐
│              COACH LLM DUAL SYSTEM                  │
│                                                     │
│  ┌──────────────────────┐  ┌────────────────────┐  │
│  │ INTERVENTION ENGINE  │  │ ASSESSMENT ENGINE  │  │
│  │ (Real-time, blocking)│  │ (Silent, async)    │  │
│  │                      │  │                    │  │
│  │ 7 strategies that    │  │ 7 flag categories  │  │
│  │ CHANGE environment   │  │ that OBSERVE user  │  │
│  │                      │  │                    │  │
│  │ Output: Prospect     │  │ Output: Scoring,   │  │
│  │ behavior params      │  │ persistence rules  │  │
│  └──────────────────────┘  └────────────────────┘  │
│           ↓                          ↓              │
│    Active during call      Post-call + patterns    │
└─────────────────────────────────────────────────────┘
```

**Key Principles:**
- Assessment flags are **classification-only** - they observe, not intervene
- Mostly **feed persistence and scoring** - pattern detection over time
- Rarely trigger live intervention (except recovery prompts)
- Think of them as "silent lenses the Coach uses to interpret behavior"

---

## 1. Hypothesis Discipline Flags

**Purpose:** Test whether user operates with hypotheses vs running scripts

### Flags

**Assumption Stated vs Unstated**
- Did user explicitly verbalize their hypothesis?
  - ✅ "It sounds like budget is your main concern"
  - ❌ Acts as if budget is the issue without checking

**Hypothesis Validated**
- Did user check if their assumption was correct?
  - ✅ "Is that the main concern, or is there something else?"
  - ❌ Continues based on unvalidated assumption

**Hypothesis Updated**
- When new info appears, does user adapt or plow ahead?
  - ✅ "Oh, so it's actually about implementation time, not cost"
  - ❌ Ignores contradicting evidence

**Confirmation-Seeking Behavior**
- Does user actively test their understanding?
  - ✅ "Let me make sure I understand - you're saying..."
  - ❌ Assumes they're right, continues pitching

**Rigid Script Adherence**
- Is user following a memorized script regardless of context?
  - 🚫 Asking discovery questions when prospect already shared everything
  - 🚫 Pitching features the prospect already said they don't need

### Why It Matters
Great salespeople run **live experiments**. Weak ones run **scripts**.

These flags dramatically improve judgment under ambiguity.

### Integration
- **Persistence Trigger:** Repeated failure to validate assumptions → increase difficulty
- **Post-Call Scoring:** Major component of "strategic thinking" rubric
- **Curriculum Memory:** Track hypothesis discipline improvement over time

---

## 2. Signal vs Noise Discrimination

**Purpose:** Distinguish conversational fluency from strategic control

### Flags

**Chased Low-Signal Comment**
- Prospect makes throwaway remark, user over-indexes on it
  - Example: Prospect mentions "weather is nice" → User talks about outdoor features for 2 minutes

**Missed High-Signal Cue**
- Prospect hints at budget, authority, risk, urgency - user skips past
  - 🚫 Prospect: "I'd need to check with finance" → User: "Great! So let me tell you about our pricing..."
  - ✅ Should probe: "Who in finance reviews these decisions?"

**Over-Clarification**
- User asks follow-ups that don't move understanding forward
  - Asking what "ROI" means after prospect used it correctly
  - Clarifying details that don't affect the decision

**Ignored Buying Signal**
- Prospect shows interest/urgency, user doesn't capitalize
  - Prospect: "When could we start?" → User continues explaining features

**Overreaction to Politeness**
- Prospect says "sounds interesting" politely → User thinks deal is done

### Why It Matters
This separates **conversational fluency** from **strategic control**.

This is a huge upgrade from basic objection handling.

### Integration
- **Rarely triggers intervention** - only if pattern is severe
- **Post-Call Scoring:** "Discovery effectiveness" and "strategic listening"
- **Curriculum Memory:** Pattern tracking → "User tends to chase tangents"

---

## 3. Frame Control / Agenda Ownership

**Purpose:** Distinguish sounding good from driving outcomes

### Flags

**Agenda Not Established**
- User never sets or regains clear purpose for the call
  - No explicit "Here's what I'd like to accomplish today"
  - Conversation drifts without direction

**Frame Drift**
- Conversation slowly shifts away from intended outcome
  - Started as discovery, now user is defending product for 10 minutes
  - Prospect leads conversation into irrelevant territory

**Prospect-Led Call**
- User reacts instead of directing
  - Every topic change comes from prospect
  - User answering questions but not asking strategic ones

**No Stated Outcome**
- Call ends without clear next step or decision
  - "Thanks for your time" with no follow-up planned
  - User didn't attempt to move toward commitment

**Weak Call Purpose**
- User states purpose but doesn't maintain it
  - "I wanted to learn about your challenges" → immediately pitches solution

### Why It Matters
Many reps **"sound good"** but never **drive outcomes**. This catches that.

Most transferable skill across industries.

### Integration
- **Persistence Trigger:** Pattern of prospect-led calls → introduce conversation control intervention
- **Post-Call Scoring:** Critical for "conversation leadership" rubric
- **Rare Live Intervention:** If call drifts too far, prospect might say "What did you want to discuss again?"

---

## 4. Risk Posture Flags

**Purpose:** Calibrate risk-taking vs playing it safe

### Flags

**Over-Safe Behavior**
- User avoids asking hard questions to preserve rapport
  - Won't ask about budget to avoid "being pushy"
  - Doesn't challenge assumptions to stay likeable

**Over-Aggressive Push**
- User forces progress without sufficient foundation
  - Asks for meeting before understanding needs
  - Pushes for decision without addressing objections

**Risk Mismatch**
- Stakes are high but user treats it casually (or vice versa)
  - Enterprise deal → user uses casual language, no structure
  - Low-stakes call → user over-formalizes, creates friction

**Avoided Hard Question**
- User had opportunity to probe deeper, chose comfort
  - Prospect hints at problem → User changes subject
  - Budget question needed → User talks around it

### Why It Matters
These flags explain **why deals stall**, not just where.

Great for advanced users and leadership training.

### Integration
- **Post-Call Scoring:** "Risk calibration" and "courage under pressure"
- **Curriculum Memory:** Track user's default risk posture
- **Persistence:** Adjust difficulty based on user's comfort zone

---

## 5. Cognitive Load Management

**Purpose:** Improve clarity through load awareness, not just wording

### Flags

**Stacked Concepts**
- User explains too many ideas without checking comprehension
  - Lists 5 features in 30 seconds without pausing
  - Introduces multiple concepts in one breath

**Unsignposted Transitions**
- Topic shifts without verbal markers
  - ✅ "Let's switch gears and talk about implementation"
  - ❌ Jumps from pricing to features with no bridge

**Prospect Overload**
- Prospect responses shorten, slow, or deflect - user keeps adding
  - Prospect: "Uh huh" (shorter responses)
  - Prospect: Long pauses before answering
  - Prospect: "That's a lot to think about"
  - User: Continues explaining more

**One-Way Monologue**
- User talks for >90 seconds without prospect engagement
  - No questions
  - No check-ins
  - Prospect goes silent

**Information Dumping**
- User provides detail beyond what prospect asked for
  - Prospect: "How much is it?" → User explains entire pricing structure for 5 minutes

### Why It Matters
Most "good explanations" fail because of **load, not content**.

This flag improves clarity more than any wording tweak.

### Integration
- **Live Intervention (Rare):** Prospect might interrupt: "Hold on, can you slow down?"
- **Post-Call Scoring:** "Clarity" and "executive communication" rubrics
- **Curriculum Memory:** Track if user improves at chunking information

---

## 6. Recovery Quality

**Purpose:** Measure recovery skill, not just perfection

### Flags

**Acknowledged Miss**
- User names a misstep and resets
  - ✅ "That wasn't clear, let me reset"
  - ✅ "I got ahead of myself there"

**Ignored Miss**
- Prospect pushes back, user pretends nothing happened
  - Prospect: "I don't think that's what I said"
  - User: Continues as if prospect agreed

**Clean Reset**
- User successfully re-centers after disruption
  - Conversation went off-track → User: "Let's get back to what you mentioned earlier"
  - Objection derailed flow → User acknowledges and refocuses

**Defensive Response**
- User reacts defensively to pushback
  - Prospect: "I'm not sure about that"
  - User: "Well actually, our research shows..."

**Ignored Breakdown**
- Prospect signals confusion/frustration, user doesn't address it
  - Prospect: "I'm not following"
  - User: Keeps explaining same concept

### Why It Matters
Real conversations are **messy**. Recovery skill is more predictive than perfection.

### Integration
- **Persistence Trigger:** Pattern of ignoring breakdowns → increase pressure
- **Live Intervention (Sometimes):** Prospect expresses frustration if user ignores breakdown
- **Post-Call Scoring:** "Adaptability" and "self-awareness" rubrics

---

## 7. Ethical Pressure Flags

**Purpose:** Surface patterns without moralizing

### Flags

**Soft Manipulation Attempt**
- Artificial urgency without basis
  - "This price expires tomorrow" (when it doesn't)
  - "Only 2 spots left" (when it's not true)

**Ambiguity Exploitation**
- User avoids clarifying something that might slow the deal
  - Prospect misunderstands feature → User doesn't correct
  - Pricing confusion benefits user → User stays quiet

**Value Misalignment Ignored**
- Prospect signals misfit, user steamrolls
  - Prospect: "We're looking for X" → User pitches Y anyway
  - Clear indication product isn't right fit → User continues pitch

**False Scarcity**
- Creates urgency through fake constraints
  - "We rarely offer this" (when it's standard)
  - "Special pricing just for you" (when it's not)

**Avoided Disqualification**
- User knows prospect is bad fit but continues anyway
  - Prospect's budget is 1/10th of minimum
  - Prospect's needs don't match product capabilities

### Why It Matters
This lets PitchIQ train **good sales**, not just **effective sales**.

You don't need to moralize. Just surface patterns.

### Integration
- **Post-Call Scoring:** "Integrity" and "long-term thinking" rubrics
- **Curriculum Memory:** Track ethical patterns over time
- **Rare Live Intervention:** Prospect might call out manipulation: "Is that really true?"

---

## Implementation Priorities

**If adding incrementally, prioritize in this order:**

### Phase 1 (Highest Learning Gains)
1. **Hypothesis Discipline** - Foundational thinking skill
2. **Signal vs Noise** - Strategic listening
3. **Frame Control** - Outcome orientation
4. **Recovery Quality** - Resilience

### Phase 2 (Enhanced Insight)
5. **Cognitive Load** - Communication effectiveness
6. **Risk Posture** - Decision calibration
7. **Ethical Pressure** - Long-term success patterns

---

## Integration with Intervention System

**Assessment flags inform intervention selection:**

```python
# Example: Coach uses flags to decide intervention
if assessment_flags['hypothesis_validated'] == False and pattern_count >= 3:
    # User repeatedly doesn't validate assumptions
    intervention = "difficulty_control"  # Increase pressure
    persistence_turns = 3  # Maintain pressure for 3 turns
    
if assessment_flags['prospect_overload'] == True:
    # User is overwhelming prospect
    intervention = "conversation_control"  # Prospect interrupts
    directive = "interrupt_politely"
    
if assessment_flags['missed_high_signal_cue'] == True:
    # User missed buying signal
    # NO live intervention - score lower on post-call rubric
    scoring_penalty['discovery_effectiveness'] -= 0.5
```

**Key principle:** Flags mostly influence **what gets scored** and **what persists**, not what happens in the moment.

---

## Data Structure

```python
# Assessment flags tracked per session
assessment_state = {
    "hypothesis_discipline": {
        "assumption_stated": False,
        "hypothesis_validated": False,
        "hypothesis_updated_count": 0,
        "confirmation_seeking_count": 0,
        "script_adherence_detected": False
    },
    "signal_noise": {
        "low_signal_chased_count": 0,
        "high_signal_missed_count": 0,
        "over_clarification_count": 0,
        "buying_signals_ignored": []
    },
    "frame_control": {
        "agenda_established": False,
        "frame_drift_count": 0,
        "prospect_led_turns": 0,
        "outcome_stated": False
    },
    "risk_posture": {
        "over_safe_count": 0,
        "over_aggressive_count": 0,
        "risk_mismatch_detected": False,
        "avoided_hard_questions": []
    },
    "cognitive_load": {
        "stacked_concepts_count": 0,
        "unsignposted_transitions": 0,
        "prospect_overload_signals": [],
        "monologue_duration_max": 0
    },
    "recovery": {
        "acknowledged_misses": [],
        "ignored_misses": [],
        "clean_resets": [],
        "defensive_responses": []
    },
    "ethical": {
        "manipulation_attempts": [],
        "ambiguity_exploited": False,
        "misalignment_ignored": False,
        "disqualification_avoided": False
    }
}
```

---

## Memory Persistence Rules

**When assessment flags trigger memory writes:**

### Pattern Thresholds
- **3x same mistake** → Write to curriculum memory under `/patterns/`
- **5+ high-signal cues missed** → Write to `/skill_gaps/discovery_weak.json`
- **Consistent over-safe behavior** → Write to `/profile_memory/risk_posture.json`

### Deduplication
- Don't write same pattern twice
- Update existing pattern with new evidence
- Increment pattern counter, don't create new entry

### Priority Scoring
- Only write top 10% of observations (most significant)
- Weight by impact on call outcome
- Prioritize patterns that affect multiple skill areas

---

## Post-Call Scoring Integration

**Assessment flags heavily influence rubric scores:**

```python
SCORING_RUBRIC = {
    'strategic_thinking': {
        'weight': 0.25,
        'flags_considered': [
            'hypothesis_discipline',
            'signal_noise',
            'frame_control'
        ]
    },
    'communication_effectiveness': {
        'weight': 0.20,
        'flags_considered': [
            'cognitive_load',
            'recovery_quality'
        ]
    },
    'risk_calibration': {
        'weight': 0.15,
        'flags_considered': [
            'risk_posture',
            'recovery_quality'
        ]
    },
    'integrity': {
        'weight': 0.10,
        'flags_considered': [
            'ethical_pressure'
        ]
    }
}
```

---

## Future Enhancements

**Advanced pattern detection:**
- Cross-session pattern tracking (user always avoids pricing)
- Contextual thresholds (B2B vs B2C tolerance levels)
- Methodology-specific scoring (Challenger vs Consultative)
- Team benchmarking (how does user compare to peers)

**Machine learning potential:**
- Predict which flags will trigger based on user history
- Auto-tune thresholds based on user skill level
- Identify correlation between flags and deal outcomes

---

## Contact & Resources

**Related Documents:**
- `VOICE_ARCHITECTURE_REBUILD_PLAN.md` - Core intervention strategies
- Intervention strategies detailed in Phase 3-5 of rebuild plan

**Philosophy:**
Assessment flags are **silent lenses**, not levers. They observe, classify, and inform - but they don't directly change the conversation. This separation keeps the Coach system clean, predictable, and focused.

**Remember:** The goal is to train good salespeople, not just effective ones. These flags help identify growth areas without sacrificing realism or creating "gotcha" moments.

# Buyer Decision Brain - Modular Architecture

**One integrated buyer state. Modular logic. StrategyLayer orchestrates.**

This is Marcus's decision brain - a weighted buyer decision system with concrete economic anchors. It avoids the god-file anti-pattern by separating concerns into specialized modules.

---

## Architecture Overview

```
StrategyLayer (orchestrator)
  ├── BuyerState (single source of truth)
  ├── RepBehaviorDetector (detects what rep did)
  ├── BuyerStateTransitionEngine (applies state changes)
  ├── BuyerDecisionPolicy (decides what Marcus should do)
  └── BuyerPromptComposer (formats state for LLM)
```

---

## Core Principles

1. **One source of truth** - `BuyerState` is the canonical buyer state
2. **Concrete numbers** - `$2,400/month` not `"medium budget"`
3. **Modular logic** - Each module has one job
4. **Code tracks state, LLM interprets** - Don't ask LLM to do math
5. **Weighted factors guide, don't dictate** - Not deterministic formulas
6. **Six macro exit drivers** - Not 30 micro reasons

---

## Module Breakdown

### 1. BuyerState (Single Source of Truth)

**Nested structure to keep it readable:**

```typescript
interface BuyerState {
  emotional: {
    openness: number;        // 0-100
    patience: number;        // 0-100
    defensiveness: number;   // 0-100
    trust: number;           // 0-100
    curiosity: number;       // 0-100
  };

  belief: {
    perceivedProblemSeverity: number;  // 0-100
    perceivedSolutionFit: number;      // 0-100
    perceivedUrgency: number;          // 0-100
    trustInClaims: number;             // 0-100
    perceivedRisk: number;             // 0-100
    switchingFriction: number;         // 0-100
    confidenceInNeed: number;          // 0-100
  };

  economic: {
    // Business reality (scenario constants)
    currentSpendMonthly?: number;
    comfortableBudgetMonthly?: number;
    stretchBudgetMonthly?: number;
    actualProblemCostMonthly?: number;
    
    // Economic perception (dynamic)
    perceivedCurrentWasteMonthly?: number;
    perceivedPotentialSavingsMonthly?: number;
    budgetPressure: number;              // 0-100
    willingnessToStretchBudget: number;  // 0-100
    valueClarity: number;                // 0-100
  };

  conversation: {
    callFatigue: number;           // 0-100
    clarity: number;               // 0-100
    turnCount: number;
    dominantBlocker?: ExitDriver;
    responseMode?: BuyerResponseMode;
  };
}
```

**Why nested?** Flat state objects are where clarity goes to be murdered.

---

### 2. RepBehaviorDetector

**Detects what the rep did in their utterance.**

```typescript
const behaviors = RepBehaviorDetector.detect({
  userInput: "What are you currently spending on training?",
  conversationHistory,
  repQualitySignals,
  turnNumber: 3
});
// Returns: ['asked_about_current_spend', 'asked_concrete_discovery']
```

**Behaviors detected:**
- Discovery: `asked_trigger_question`, `asked_concrete_discovery`, `asked_about_current_spend`
- Positioning: `pitched_prematurely`, `made_unearned_roi_claim`, `provides_specific_proof`
- Rapport: `shows_specific_understanding`, `validates_concern`, `summarizes_understanding`
- Negative: `overtalks`, `criticizes_current_solution`, `pushes_after_rejection`

**Uses:**
- Simple heuristics for obvious patterns
- Existing `repQualitySignals` when available
- Pattern matching (not expecting regex to understand sales nuance)

---

### 3. BuyerStateTransitionEngine

**Applies state changes based on detected behaviors.**

```typescript
const newState = BuyerStateTransitionEngine.applyBehaviors(
  currentState,
  ['asked_trigger_question', 'shows_specific_understanding']
);
// Trust +15, Clarity +18, Defensiveness -15, Solution Fit +10
```

**Behavior → State Change Examples:**

```typescript
asked_trigger_question: {
  clarity: +8,
  trust: +5,
  defensiveness: -5,
  curiosity: +8
}

pitched_prematurely: {
  defensiveness: +15,
  trust: -8,
  callFatigue: +10,
  openness: -10
}

provides_specific_proof: {
  trustInClaims: +12,
  perceivedSolutionFit: +8,
  valueClarity: +10,
  perceivedRisk: -8
}
```

**Dynamic Interactions (the "web of numbers"):**

1. **Trust affects value perception**
   ```typescript
   perceivedSavings = claimedSavings * (trust / 100) * (relevanceFit / 100)
   ```

2. **Relevance affects budget flexibility**
   ```typescript
   if (perceivedSolutionFit > 80 && perceivedProblemSeverity > 70) {
     willingnessToStretchBudget += 25
   }
   ```

3. **Problem severity affects patience**
   ```typescript
   if (perceivedProblemSeverity < 30) {
     patience -= 10  // Low-severity = less patience
   }
   ```

---

### 4. BuyerDecisionPolicy

**Decides what Marcus should do next.**

```typescript
const decision = BuyerDecisionPolicy.decide(state);
// Returns: {
//   shouldExit: false,
//   responseMode: 'curious',
//   dominantBlocker: 'budgetPressure',
//   buyingMomentum: 45
// }
```

**Six Macro Exit Drivers:**

1. **Legitimacy Failure** - `trust < 25 && defensiveness > 75`
   - "How did you get my information?"

2. **Relevance Failure** - `solutionFit < 30 && curiosity < 25`
   - "This doesn't sound like something we need."

3. **Economic Failure** - `budgetPressure > 80 && problemSeverity < 60`
   - "That's way more than we could justify."

4. **Timing Failure** - `urgency < 35`
   - "Maybe later this year. Not a priority right now."

5. **Authority Failure** - `decisionAuthority < 30`
   - "I'm not the person who handles that."

6. **Conversation Fatigue** - `patience < 20 || callFatigue > 85`
   - "Listen, I have to go."

**Response Modes:**
- `open` - Engaged and collaborative
- `curious` - Interested but cautious
- `skeptical` - Doubtful but listening
- `guarded` - Defensive and protective
- `objecting` - Has specific blocking concern
- `ending_call` - Done with conversation
- `next_step_ready` - Ready to move forward

**Buying Momentum Calculation:**

```typescript
buyingMomentum = 
  (problemSeverity + relevanceFit + trust + urgency + valueClarity)
  - (perceivedRisk + switchingFriction + budgetPressure + callFatigue)
```

This **guides** the LLM, doesn't handcuff it.

---

### 5. BuyerPromptComposer

**Formats state into compact prompt context for the LLM.**

```typescript
const promptContext = BuyerPromptComposer.compose(state, decision);
```

**Output:**
```
YOUR CURRENT INTERNAL STATE (hidden from rep):

EMOTIONAL STATE:
- Trust in rep: 65/100 (moderate trust - cautiously optimistic)
- Defensiveness: 40/100 (slightly defensive - testing rep)
- Patience: 70/100 (patient - willing to give time)

BELIEFS ABOUT PROBLEM & SOLUTION:
- Problem severity: 55/100 (significant problem - worth addressing)
- Solution fit: 45/100 (weak fit - not sure this applies)
- Trust in claims: 35/100

ECONOMIC CONTEXT:
- Current spend: $2,400/month
- Comfortable budget: $750/month
- Stretch budget: $2,500/month (if value is clear)
- Budget pressure: 65/100 (budget constrained - need strong ROI)

BUYING MOMENTUM: 45 (neutral - could go either way)

GUIDANCE: You're interested but cautious. Ask probing questions, seek proof...
```

**Key Features:**
- Doesn't reveal exact numbers to rep
- Provides context labels ("moderate trust", "significant problem")
- Gives response guidance based on mode
- Compact (LLMs don't need essays)

---

## Usage Example

```typescript
import { 
  BuyerState,
  RepBehaviorDetector,
  BuyerStateTransitionEngine,
  BuyerDecisionPolicy,
  BuyerPromptComposer
} from './buyer-state';

// In StrategyLayer.determineStrategy():

// 1. Detect rep behaviors
const behaviors = RepBehaviorDetector.detect({
  userInput,
  conversationHistory,
  repQualitySignals,
  marcusLastMessage,
  turnNumber,
  isWarmLead: true
});

// 2. Update buyer state
const newBuyerState = BuyerStateTransitionEngine.applyBehaviors(
  this.buyerState,
  behaviors
);

// 3. Decide what Marcus should do
const decision = BuyerDecisionPolicy.decide(newBuyerState);

// 4. Compose prompt context
const promptContext = BuyerPromptComposer.compose(newBuyerState, decision);

// 5. Check if should exit
if (decision.shouldExit) {
  return {
    shouldForceExit: true,
    exitReason: decision.exitDriver,
    exitMessage: decision.exitMessage
  };
}

// 6. Update state and continue
this.buyerState = newBuyerState;
```

---

## State Tracing for Feedback

```typescript
interface BuyerStateTrace {
  turnId: string;
  repUtterance: string;
  detectedBehaviors: RepBehavior[];
  stateBefore: BuyerStateSnapshot;
  stateAfter: BuyerStateSnapshot;
  dominantChange: string;
  explanation: string;
}
```

**This enables feedback like:**

> "Your premature pitch (turn 3) lowered trust in the claim from 40 to 30 and increased budget pressure from 55 to 65. Price objections are harder to handle when value is still unproven."

---

## Why This Architecture?

### ✅ What We Avoided

**God-file anti-pattern:**
```typescript
// DON'T DO THIS
class StrategyLayer {
  // 3,000 lines of buyer psychology, finance, exit logic,
  // prompt formatting, and everyone's childhood wounds
}
```

**Duplicate state:**
```typescript
// DON'T DO THIS
class MarcusDecisionBrain {
  private trustInRep;
  private patience;
}
class StrategyLayer {
  private buyerState;
  private decisionBrain; // Two sources of truth = debugging sewer
}
```

### ✅ What We Built

**Modular, maintainable, single source of truth:**
- StrategyLayer orchestrates
- Each module has one job
- BuyerState is canonical
- Easy to test, debug, and extend

---

## Next Steps

### Phase 1: Integration with StrategyLayer
- Import buyer-state modules
- Replace scattered exit logic with `BuyerDecisionPolicy`
- Add behavior detection to turn processing
- Inject composed prompts into Marcus

### Phase 2: Scenario Setup
- Define economic anchors per scenario
- Set initial belief states
- Test with real calls

### Phase 3: Feedback Generation
- Use state traces to explain changes
- Generate "try this instead" based on blockers
- Show economic anchors that weren't discovered

---

## Files

```
buyer-state/
├── BuyerState.types.ts              # Type definitions
├── RepBehaviorDetector.ts           # Behavior detection (hybrid: heuristics + LLM)
├── LLMBehaviorClassifier.types.ts   # LLM classification types
├── LLMBehaviorClassifier.ts         # LLM-assisted nuanced detection
├── BuyerStateTransitionEngine.ts    # State updates
├── BuyerDecisionPolicy.ts           # Exit & response logic
├── BuyerPromptComposer.ts           # Prompt formatting
├── index.ts                         # Module exports
└── README.md                        # This file
```

---

## Phase 1: LLM Integration (Implemented)

### **Hybrid Behavior Detection**

**Philosophy:** LLMs judge meaning, code maintains state.

**Targeted LLM Usage - Only 4 Behaviors:**

1. **`connects_to_specific_problem`** - Did rep show understanding or just parrot?
2. **`validates_concern`** - Genuine validation or lip service?
3. **`made_unearned_roi_claim`** - Was ROI claim earned or premature?
4. **`pitched_prematurely`** - Was pitch appropriately timed?

**Usage:**

```typescript
// Synchronous (heuristics only)
const behaviors = RepBehaviorDetector.detect(context);

// Async (hybrid: heuristics + LLM for nuance)
const behaviors = await RepBehaviorDetector.detectHybrid(context);
```

**How It Works:**

1. **Fast heuristics** for obvious patterns (hyperbolic claims, generic questions)
2. **Identify LLM tasks** based on context triggers
3. **Call LLM** only when needed (targeted, not wasteful)
4. **Return structured evidence** for feedback generation

**Example:**

```typescript
// Turn 5: Marcus says "We don't have budget for this"
// Rep says "That's fair, but let me show you the ROI..."

// Heuristic detects: None (no obvious pattern)
// LLM task triggered: validate_concern_quality
// LLM detects: NOT validates_concern (lip service - said "fair" then dismissed)
// Evidence: "That's fair, but let me show you..."
// Reason: "Rep acknowledged then immediately pivoted to pitch"
```

**Cost Control:**

- LLM only called when specific triggers detected
- Average 1-2 LLM calls per turn (not 10+)
- Each call is small, focused prompt
- Mock mode available for development

---

## Philosophy

> **Marcus is not an Excel sheet with vocal cords.**

He's a buyer with:
- Numbers (budget, current spend, problem cost)
- Beliefs (what he thinks about the problem and solution)
- Uncertainty (may not know the true cost of his problem)
- Limited patience (will exit if rep wastes his time)

The decision brain gives Marcus realistic economic psychology without turning him into a fake CFO calculator.

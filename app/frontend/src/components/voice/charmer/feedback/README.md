# Warm-Lead Feedback System

## Overview

The Warm-Lead Feedback System generates sophisticated, evidence-based coaching feedback for sales calls. It analyzes call transcripts, detects rep mistakes and strengths, and provides practical guidance with quiz reinforcement.

**Key Design Principles:**
- ✅ Practical, behavior-based feedback (not gimmicky psychology)
- ✅ Evidence-anchored interpretations (no psychic claims)
- ✅ Equal-length quiz answers (no telegraphing correctness)
- ✅ Warm-lead specific (website visits, not cold calls)

---

## Architecture

### Three-Axis Buyer State Model

Instead of a single "buyer state" enum, we use three independent axes:

1. **BuyerDefense** - What shield is the buyer using?
   - `recognition_gap` - "I don't remember looking at your site"
   - `autonomy_defense` - "I'm not looking for a pitch"
   - `status_quo_shield` - "We're happy with current"
   - `relevance_test` - "What exactly do you do?"
   - `risk_scan` - "We don't have time for this"
   - `timing_defense` - "Not a priority right now"
   - `authority_deflection` - "I'd have to talk to my team"

2. **BuyerEngagement** - How open is the buyer?
   - `closed` - Actively trying to end call
   - `guarded` - Protective, minimal responses
   - `curious` - Asking questions, not committed
   - `exploring` - Actively discussing situation
   - `problem_aware` - Acknowledging gaps/pain
   - `next_step_open` - Ready to commit

3. **CallPhase** - Where are we in the conversation?
   - `opening` - First 30 seconds
   - `permission` - Getting right to continue
   - `trigger_discovery` - Finding what prompted interest
   - `problem_discovery` - Uncovering operational pain
   - `impact_development` - Exploring consequences
   - `solution_mapping` - Connecting product to problem
   - `next_step` - Scheduling/committing

**Example:** Marcus can be "guarded + using status quo shield + still in opening phase" - three independent dimensions.

---

## Rep Behavior Detection

### Mistakes (13 types)

**Warm-lead specific:**
- `IGNORED_WARM_SIGNAL` - Didn't mention the website visit
- `OVERCLAIMED_INTENT` - "You requested info" when they just browsed
- `FAKE_PERMISSION` - "You filled out a form" (lie)
- `SKIPPED_TRIGGER_DISCOVERY` - Didn't ask what prompted visit

**Universal:**
- `PREMATURE_PITCH` - Pitched before relevance established
- `UNEARNED_ROI_CLAIM` - Big claims before trust
- `FOUGHT_STATUS_QUO` - Argued with "we're happy"
- `ASKED_TOO_LARGE_COMMITMENT` - "Do you have 5 minutes?"
- `GENERIC_DISCOVERY` - "What keeps you up at night?"
- `FEATURE_DUMPED` - Listed features without context
- `IGNORED_BUYING_SIGNAL` - Missed engagement cues
- `FILLED_SILENCE` - Talked over buyer thinking
- `TALKED_PAST_OBJECTION` - Kept pitching after objection

### Strengths (11 types)

- `USED_WARM_SIGNAL_CAREFULLY` - Mentioned signal without overclaiming
- `PRESERVED_BUYER_CONTROL` - Gave easy outs
- `ANSWERED_DIRECTLY` - Answered legitimacy questions
- `VALIDATED_STATUS_QUO` - Validated current process
- `ASKED_TRIGGER_QUESTION` - Asked about warm signal
- `ASKED_CONCRETE_DISCOVERY` - Concrete operational questions
- `EXPLORED_CONSEQUENCES` - Explored impact
- `SUMMARIZED_BUYER_WORLD` - Summarized buyer's situation
- `MATCHED_NEXT_STEP_TO_PROBLEM` - Right commitment ask
- `GAVE_EASY_OUT` - Explicitly gave an out
- `USED_SILENCE_WELL` - Let buyer think

---

## Feedback Structure

Every moment of feedback follows this format:

```typescript
{
  whatHappened: "1-2 sentences: what the rep said, how the buyer responded, using quotes",
  whyItDidntWork: "1-2 sentences: buyer's probable interpretation, based on evidence, with confidence level",
  whatToDoInstead: "Specific behavior change",
  tryThisLine: "Exact alternative line the rep could say",
  whyItWorks: "1 sentence: practical reason, no jargon"
}
```

**Example:**

```
## What happened
You opened with "I'd love to share how our AI training has helped teams increase close rates by 20%" before Marcus had said training was a problem. He responded by saying his team was happy with current methods.

## Why it likely didn't work
That probably made him evaluate PitchIQ too early. Instead of thinking through his own training gaps, he had an easy reason to protect the current process. (Confidence: medium - based on defensive response pattern)

## What to do instead
Use the warm signal first. Find out what made him look before explaining why PitchIQ is useful.

## Try this line
"Marcus, you checked out PitchIQ recently. I'm not sure if that was active research or just curiosity - what were you hoping to figure out?"

## Why it works
It lowers pressure and brings the conversation back to Marcus's original reason for looking.
```

---

## Evidence Anchoring

Every interpretation includes evidence:

```typescript
{
  repQuote: "Exact quote from rep",
  buyerQuote: "Exact quote from buyer",
  supportingContext: "Turn number, phase, etc.",
  interpretationConfidence: "low" | "medium" | "high",
  reasoning: "Why we think this is what happened"
}
```

**Confidence levels:**
- **High** - Direct contradiction or clear cause-effect
- **Medium** - Single mistake pattern detected
- **Low** - Positive behavior, no clear mistakes

---

## Quiz Generation

Quizzes test understanding, not memory. All answers are:
- ✅ Equal length (±3 words)
- ✅ Psychologically plausible
- ✅ Based on real principles (just misapplied)
- ✅ No jargon

**Example:**

**Question:** "Marcus said 'we're happy with current training.' Why did pitching PitchIQ's benefits make him more defensive?"

**A)** "Because buyers never care about product benefits until they like the rep personally" ❌  
(Uses relationship-first principle - plausible but not core issue)

**B)** "Because 'we're happy' was likely a status quo shield, and pitching too soon made him defend it harder" ✅  
(Correct - addresses actual dynamic)

**C)** "Because he needed to hear all features before committing to ensure completeness" ❌  
(Uses completeness bias - sounds smart but he's not evaluating features yet)

---

## Scoring Rubric

### Warm-Lead Specific (0-100 each)
- `warmSignalUse` - Did rep acknowledge the signal appropriately?
- `intentCalibration` - Did rep calibrate buyer intent correctly?
- `triggerDiscovery` - Did rep find what prompted the visit?

### Universal (0-100 each)
- `autonomyPreservation` - Did rep keep buyer in control?
- `relevanceEstablishment` - Did rep connect to buyer's world?
- `statusQuoHandling` - Did rep handle "we're happy"?
- `discoveryQuality` - Did rep uncover real pain?
- `impactDevelopment` - Did rep create urgency ethically?
- `productTiming` - Did rep pitch at right time?
- `nextStepFit` - Did rep ask for right commitment?

---

## Usage

### Basic Integration

```typescript
import { WarmLeadFeedbackService } from './feedback/WarmLeadFeedbackService';

const feedbackService = new WarmLeadFeedbackService();

// After call ends
const feedback = await feedbackService.generateFeedback({
  sessionId: 'charmer_123',
  warmSignal: 'website_visit',
  daysAgoSignal: 8,
  transcript: conversationHistory,
  marcusStateHistory: stateHistory,
  criticalMoments: [],
  successfulMoments: []
});

// Use the feedback
console.log('Overall score:', feedback.score.overallScore);
console.log('Key moments:', feedback.moments.length);
```

### Backend API

The system uses two backend endpoints:

**1. Generate Feedback**
```
POST /api/generate-feedback
{
  "prompt": "LLM prompt with context",
  "moment": { ... }
}
```

**2. Generate Quiz**
```
POST /api/generate-quiz
{
  "prompt": "LLM prompt with context",
  "moment": { ... },
  "feedback": { ... }
}
```

---

## The Central Question

Every moment of feedback answers:

> **"How well did the rep use the prior signal without overclaiming buyer intent?"**

This breaks down into:
1. Did they acknowledge the signal? ("You checked us out recently...")
2. Did they calibrate intent correctly? ("Not sure if that was research or curiosity...")
3. Did they find the trigger? ("What were you hoping to figure out?")
4. Did they respect autonomy? (Gave easy outs, didn't push)

---

## What "Warm Lead" Means in PitchIQ

A warm lead is someone who showed **any prior signal of interest**:
- ✅ Visited website 8 days ago (like Marcus)
- ✅ Downloaded content
- ✅ Clicked email link
- ✅ Viewed pricing page
- ✅ Filled out form
- ✅ Requested demo

**The signal does NOT equal permission.** Marcus glanced at the website. That's it. He might have been:
- Researching competitors
- Casually browsing
- Checking you out for a friend
- Killing time between meetings
- Comparing options with no intent to buy

---

## Next Steps

### 1. Integrate with CharmerController

Add feedback generation after call ends:

```typescript
// In CharmerController.tsx, after call ends
const feedbackService = new WarmLeadFeedbackService();
const feedback = await feedbackService.generateFeedback({
  sessionId: sessionId,
  warmSignal: 'website_visit',
  daysAgoSignal: 8,
  transcript: conversationHistory,
  marcusStateHistory: marcusStateHistory,
  criticalMoments: criticalMoments,
  successfulMoments: successfulMoments
});

// Store in localStorage for post-call-review
localStorage.setItem('postCallFeedback', JSON.stringify(feedback));
```

### 2. Connect to Post-Call-Review UI

Update the Kimi post-call-review app to read from localStorage:

```typescript
// In Kimi app
const feedback = JSON.parse(localStorage.getItem('postCallFeedback') || '{}');

// Use feedback.moments for timeline
// Use feedback.score for scoring
// Use feedback.keyTakeaways for summary
```

### 3. Test with Real Calls

Run test calls and validate:
- ✅ Mistakes are detected accurately
- ✅ Feedback is practical and usable
- ✅ Quiz answers are equal length
- ✅ Evidence supports interpretations
- ✅ Confidence levels are appropriate

---

## Files Created

```
app/frontend/src/components/voice/charmer/feedback/
├── WarmLeadFeedbackTypes.ts       # Type definitions
├── WarmLeadFeedbackService.ts     # Main service class
└── README.md                       # This file

app/routes/api/
└── feedback_routes.py              # Backend API endpoints
```

---

## Design Philosophy

**What We Avoid:**
- ❌ "His brain was too busy to think 'sales pitch'" (gimmicky)
- ❌ Neuroscience theater in user-facing feedback
- ❌ Absolute psychological claims
- ❌ Clever-sounding but impractical advice
- ❌ Obvious wrong answers in quizzes
- ❌ Answer length telegraphing correctness

**What We Embrace:**
- ✅ Practical, behavior-based feedback
- ✅ Evidence from actual transcript
- ✅ Usable alternative lines
- ✅ Psychology hidden in scoring logic
- ✅ Equal-length, grounded quiz distractors
- ✅ Confidence levels for interpretations

---

## Credits

Architecture designed based on real warm-lead sales psychology research:
- Psychological reactance (Brehm, 1966)
- Status quo bias (Samuelson & Zeckhauser, 1988)
- Prospect theory (Kahneman & Tversky, 1979)
- Cognitive load theory (Sweller, 1988)
- Motivational interviewing (Miller & Rollnick, 1991)

Implemented without the LinkedIn smoothie.

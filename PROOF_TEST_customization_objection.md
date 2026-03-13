# Proof Test: Customization Objection Handling

## Test Scenario

**Marcus asks:** "What makes this different from generic sales training?"

**Rep answers:** "Traditional training is generic. We generate custom personas based on your actual buyers and objections, so reps practice your real sales conversations instead of cookie-cutter workshops."

## BEFORE Refactor (Old System)

### System State
```typescript
// Old StrategyConstraints (mixed buyer/coach logic)
{
  resistanceLevel: 6,
  shouldWithholdProgress: true, // ❌ Coach blocking buyer
  withholdReason: "Rep is pitching too early without building rapport",
  trainingObjective: "Teach rep to ask discovery questions first"
}
```

### Marcus Prompt (Old)
```
**IMPORTANT - WITHHOLD PROGRESS:**
- Rep is pitching, not building rapport - block progression
- Do NOT move the conversation forward
- Do NOT reward poor sales behavior
```

### Expected Marcus Response
```
Marcus: "I'm still not seeing how it's different from other programs."
```

**Problem:** Marcus ignores the valid differentiation because coaching logic overrides buyer logic.

---

## AFTER Refactor (New System)

### System Flow

**Step 1: Marcus raises objection**
```typescript
Marcus: "What makes this different from generic sales training?"
// System detects objection pattern
strategyLayer.setActiveObjection("What makes this different from generic sales training?")
// Sets: activeObjection = 'customization', satisfaction = 0.3
```

**Step 2: Rep answers**
```typescript
Rep: "Traditional training is generic. We generate custom personas based on your actual buyers and objections, so reps practice your real sales conversations instead of cookie-cutter workshops."
```

**Step 3: Answer Evaluation**
```typescript
AnswerEvaluator.evaluate(repAnswer, 'customization', 0.3, context)

// Keyword matches found:
// - "custom" ✓
// - "personas" ✓  
// - "your actual buyers" ✓
// - "your objections" ✓
// - "not cookie-cutter" ✓
// Contrast phrase: "Traditional training is generic" ✓
// Specificity: "based on your actual buyers and objections" ✓

// Returns:
{
  addressed: true,
  satisfactionDelta: +0.4,  // Strong match
  clarityDelta: +2,
  relevanceDelta: +2,
  trustDelta: +0.5,
  acknowledgmentCue: 'strong',
  specificAcknowledgment: "Okay, I get it - you're adapting to our specific buyers and objections."
}
```

**Step 4: State Update**
```typescript
// BuyerState updated
{
  activeObjection: 'customization',
  objectionSatisfaction: {
    customization: 0.7,  // Was 0.3, now 0.7 (+0.4)
    proof: 1.0,
    fit: 1.0,
    // ... others
  },
  clarity: 5,  // Was 3, now 5 (+2)
  relevance: 5, // Was 3, now 5 (+2)
  trustLevel: 5.5, // Was 5.0, now 5.5 (+0.5)
  lastAcknowledgment: "Okay, I get it - you're adapting to our specific buyers and objections.",
  resistanceLevel: 6.0
}

// CoachingAssessment (separate, not sent to Marcus)
{
  trainingObjective: "Teach rep to ask discovery questions",
  identifiedIssues: ["Pitching too early"],
  pitchingTooEarly: true,
  overallQuality: 5
}
```

**Step 5: Marcus Prompt (New)**
```
**HOW YOU FEEL RIGHT NOW:**
- Your resistance/guardedness level is 6.0/10
- Your openness to this conversation: 4/10
- Your patience remaining: 7/10
- Your trust level in this person: 5.5/10
- How clear you are on what they're offering: 5/10
- How relevant this feels to your needs: 5/10

**🎯 ACKNOWLEDGE THEIR ANSWER:**
- They just addressed your concern somewhat well
- Start your response with: "Okay, I get it - you're adapting to our specific buyers and objections."
- Then pivot to your next concern or remaining skepticism
- DO NOT repeat the same objection if it was partially satisfied
- You can still be skeptical on OTHER concerns

**Your current concern:** customization
- Satisfaction level: 70%
- They've partially addressed this, but you're not fully convinced
```

### Expected Marcus Response (New)
```
Marcus: "Okay, I get it - you're adapting to our specific buyers and objections. My bigger question is whether this actually improves performance. Do you have any proof it works?"
```

**What Changed:**
✅ Marcus acknowledges the differentiation
✅ Doesn't repeat "I'm not seeing how it's different"
✅ Pivots to next realistic concern (proof)
✅ Stays skeptical but on NEW grounds
✅ Feels like a real human conversation

---

## Key Behavioral Changes

### Old System
1. Coaching logic gates buyer responses
2. Marcus withholds acknowledgment if rep didn't follow "correct" sales process
3. Same objection repeats regardless of answer quality
4. Feels like a rigged test

### New System
1. Buyer state drives responses
2. Marcus acknowledges good answers even if process was imperfect
3. Objections get partially satisfied, new ones emerge
4. Feels like a real skeptical buyer

---

## Verification Console Logs

```
🚩 [Objection] Marcus raised: "What makes this different from generic sales training?"
🎯 [Active Objection] Set to: customization

💡 [Answer Eval] customization objection:
   Keywords matched: 5/13
   Has contrast: true, Has specificity: true
   Satisfaction delta: +0.40
   Acknowledgment: strong

✅ [Answer Impact] customization satisfaction: 0.30 → 0.70
   Clarity: 3 → 5, Relevance: 3 → 5, Trust: 5.0 → 5.5

🎯 [Strategy] Buyer: skeptical | Resistance: 6.0/10 | Openness: 4/10 | Patience: 7/10
```

---

## The Proof

**Before:** Marcus couldn't say "I see how that's different"
**After:** Marcus MUST say it (it's in the prompt)

**Before:** Objection satisfaction was decorative
**After:** It drives acknowledgment behavior

**Before:** Coaching blocked buyer reactions
**After:** Coaching tracked separately, buyer responds naturally

This is the bridge between "rep said it" and "Marcus recognized it."

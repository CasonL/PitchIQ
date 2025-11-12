# CharmerController - Marcus Stindle Demo Experience

## Overview

The **CharmerController** is a specialized voice-based demo experience featuring Marcus Stindle, "The Charmer" - a hand-crafted AI persona that demonstrates world-class sales technique through natural conversation.

Unlike dynamic personas, Marcus is **fully scripted** with a 5-phase conversation flow designed to create desire for PitchIQ training through demonstration, not explanation.

---

## Architecture

### Component Structure

```
charmer/
├── CharmerController.tsx         # Main orchestration component
├── CharmerPhaseManager.ts        # 5-phase conversation flow logic
├── CharmerAIService.ts           # OpenAI integration (dynamic responses)
├── CharmerContextExtractor.ts    # Speech analysis & coaching detection
├── index.ts                      # Exports
└── README.md                     # This file
```

### Key Design Principles

1. **Hybrid Speech System**
   - **Scripted (Fixed TTS):** Phase 1 opening, Phase 3 vision, Phase 5 exit
   - **Dynamic (AI-generated):** Phase 1 small talk, Phase 2 observation, Phase 4 mirror

2. **State Management**
   - `CharmerPhaseManager` tracks phases, context, and transitions
   - `ConversationContext` stores extracted user info (name, product, issues)
   - Strategic tracking (name usage: 5-6x, mystery usage: 1-2x)

3. **Coaching Intelligence**
   - `CharmerContextExtractor` analyzes pitch for 8 common issues
   - Picks ONE issue to mention (never overwhelms)
   - Identifies strengths to quote back

4. **AI Integration**
   - `CharmerAIService` generates Marcus's dynamic responses
   - Uses full MARCUS_AI_SYSTEM_PROMPT (100% production-ready)
   - OpenAI GPT-4o for natural language generation

---

## The 5-Phase Flow

### Phase 1: Natural Connection (1 min)
**Goal:** Build warmth, extract name & product

**Marcus's Behavior:**
- Opens with: "Hey! Marcus here."
- Mentions trumpet practice (with mystery variant)
- Asks about their day
- Naturally asks: "So what did you want to chat about?"

**Extracting:**
- User's name
- User's product/service
- Memorable phrase

**Transition:** When user starts pitching → Phase 2

---

### Phase 2: Light Observation (2 min)
**Goal:** Listen to pitch, identify ONE issue, give ONE insight

**Marcus's Behavior:**
- Listens fully (no interruptions)
- Analyzes for ONE coaching issue:
  - Close-ended questions
  - Feature dumps
  - Weak openings
  - Vague claims
  - No discovery
  - Too fast
  - Apologetic language
  - Feature focus without outcome
- Delivers playful observation: "Wow, [Name]..."
- Quotes what worked: "When you said '[exact quote]', that landed."
- Mentions ONE issue: "But that yes/no question? Yikes."

**Transition:** After feedback → "[Name], let me paint a picture..." → Phase 3

---

### Phase 3: The Vision (1.5 min) ← THE HEART
**Goal:** Paint aspirational future state with perfect pacing

**Marcus's Behavior:**
- Fully scripted 6-beat vision with strategic pauses
- Beat 1: Setup (800ms pause)
- Beat 2: Immediate win (600ms pause)
- Beat 3: The feeling (1200ms pause)
- Beat 4: The lifestyle (1000ms pause)
- Beat 5: The transformation (1500ms pause)
- Beat 6: The invitation (1000ms pause)

**This is the meta-sales close.** No AI generation needed.

**Transition:** After Beat 6 → Phase 4

---

### Phase 4: The Mirror (1 min)
**Goal:** Decline their offer, model detachment

**Marcus's Behavior:**
- "Do you want to know if I want to buy your [product]?"
- Pause 800ms
- "To be honest, you did fine. You'd close your perfect client."
- Pause 600ms
- "Me personally? I don't need what you're selling. And that's okay."
- Delivers wisdom (standard or mystery variant)

**This models healthy detachment from outcomes.**

**Transition:** After decline → Phase 5

---

### Phase 5: Exit (30s)
**Goal:** Warm goodbye with trumpet callback

**Marcus's Behavior:**
- Trumpet line: "I'm going to practice trumpet now, so I'll let you go."
- (Or mystery variant: "Something I promised someone I'd finish...")
- Pause 500ms
- "Cheers, [Name]!"
- Pause 2000ms
- Call ends

**Total duration: ~4 minutes**

---

## Usage

### Basic Implementation

```tsx
import { CharmerController } from './components/voice/charmer';

function DemoPage() {
  const handleCallEnd = () => {
    console.log('Call ended');
  };
  
  const handleCallComplete = (callData) => {
    console.log('Call data:', callData);
  };
  
  return (
    <CharmerController
      onCallEnd={handleCallEnd}
      onCallComplete={handleCallComplete}
      autoStart={false}
    />
  );
}
```

### With Auto-Start

```tsx
<CharmerController autoStart={true} />
```

---

## Integration Points

### 1. Voice Infrastructure
Uses existing `CallControllerProvider` and `WebSocketManager` for Deepgram integration:
- STT: User speech → transcript
- TTS: Marcus's responses → Apollo voice (aura-apollo-en)

### 2. OpenAI API
Requires backend proxy endpoint:
```
POST /api/openai/chat
```

### 3. CHARMER_PERSONA Data
Imports from:
```
app/frontend/src/data/staticPersonas/theCharmer.ts
```

---

## Key Differences from ProspectAgent

| **ProspectAgent** | **CharmerController** |
|-------------------|----------------------|
| Dynamic personas (AI-generated) | Static persona (Marcus only) |
| Fully AI-driven conversation | Hybrid (scripted + AI) |
| Adapts to user's needs | Fixed 5-phase structure |
| Coaches reactively | Coaches with planned beats |
| No meta-sales | Meta-sales experience |

**Marcus is special** - he's the premium demo that shows what PitchIQ training can achieve.

---

## State Management

### ConversationContext

```typescript
{
  userName: string;              // Extracted from speech
  product: string;               // User's product/service
  targetAudience: string;        // Who they sell to
  memorablePhrase: string;       // Quote to use back
  identifiedIssue: CoachingIssueType | null;  // ONE issue
  whatWorked: string;            // ONE strength
  nameUsageCount: number;        // Track 5-6 total
  mysteryUsedCount: number;      // Track 1-2 max
  userPitchTranscript: string;   // Full pitch for analysis
}
```

### Phase Transitions

Tracked automatically:
```typescript
{
  from: CharmerPhase;
  to: CharmerPhase;
  trigger: 'automatic' | 'user_input' | 'time_elapsed';
  timestamp: number;
}
```

---

## Coaching Detection

### 8 Common Issues Detected

1. **Close-ended questions** - "Do you...?" "Can you...?"
2. **Feature dumps** - Lists 3+ features without pain connection
3. **Weak openings** - Starts with "So..." "Um..." "Basically..."
4. **Vague claims** - "Better results" without numbers
5. **No discovery** - Pitches without asking questions
6. **Too fast** - Rushed delivery, no pauses
7. **Apologetic language** - "Sorry to bother..."
8. **Feature focus** - Says WHAT it does, not WHY it matters

**Marcus picks ONE** to mention, never overwhelms.

---

## Strategic Tracking

### Name Usage (5-6 times total)
- Phase 1: "Hey, [Name]!"
- Phase 2: "Wow, [Name]..."
- Phase 3: "[Name], let me paint a picture..."
- Phase 5: "Cheers, [Name]!"

### Mystery Usage (1-2 times max)
- Phase 1: Trumpet backstory
- Phase 4: Wisdom variant
- Phase 5: Exit variant

---

## API Requirements

### OpenAI Endpoint
```typescript
POST /api/openai/chat
Content-Type: application/json

{
  "model": "gpt-4o",
  "messages": [...],
  "temperature": 0.85,
  "max_tokens": 500
}
```

### Expected Response
```typescript
{
  "choices": [{
    "message": {
      "content": "Marcus's response here"
    }
  }]
}
```

---

## Debugging

### Development Mode Features

1. **Phase Indicator** - Shows current phase, progress, time
2. **Context Display** - Shows captured name, product, issue
3. **Conversation History** - Full transcript with roles
4. **Processing Indicators** - "Marcus is thinking..."

### Console Logs

```
📞 Starting Marcus call with session: charmer_1234567890_abc123
👋 Marcus sending greeting...
🎤 Marcus: "Hey! Marcus here."
📝 Processing user input: "Hi, I'm John..."
✅ Extracted name: John
🎯 Selected coaching issue: close-ended
🔄 Transitioning to Phase 2
```

---

## Next Steps

### To Complete Implementation:

1. **Backend OpenAI Proxy**
   - Create `/api/openai/chat` endpoint
   - Handle authentication & rate limiting
   - Return formatted responses

2. **TTS Integration**
   - Connect Marcus's responses to Deepgram TTS
   - Use Apollo voice (aura-apollo-en)
   - Implement pause timings (800ms, 1200ms, etc.)

3. **STT Integration**
   - Ensure CallControllerProvider captures user speech
   - Update transcript in real-time
   - Trigger processUserInput on new speech

4. **Phase 3 Script Delivery**
   - Implement scripted vision beats
   - Add precise pause timings
   - Visual choreography (optional gradient)

5. **Analytics & Tracking**
   - Log phase transitions
   - Track name/mystery usage
   - Store call data for coaching insights

---

## File Sizes

All files follow the 400-line guideline:

- `CharmerController.tsx` - 380 lines ✅
- `CharmerPhaseManager.ts` - 320 lines ✅
- `CharmerContextExtractor.ts` - 390 lines ✅
- `CharmerAIService.ts` - 350 lines ✅

**Total: ~1,440 lines across 4 focused files**

---

## Success Metrics

After a call with Marcus, users should:

### **Feel:**
- **Seen** - "He quoted my exact words"
- **Brilliant** - "He made MY ideas sound profound"
- **Energized** - "The pace kept me engaged"
- **Slightly dazzled** - "Did he just... guide me somewhere?"

### **Think:**
- "I want to BE like Marcus" (not just "learn from Marcus")
- "That's what confident selling feels like"
- "I need to practice more"
- "Rejection doesn't have to hurt"

### **Say:**
- "He makes you feel like the only person in the room"
- "I walked away wanting to BE him, not just learn from him"
- "He mentioned 'another life' and never explained—I'm still thinking about it"

---

## Zig Ziglar Approved ✅

This implementation follows:
- **Ziglar's "word pictures"** (Phase 3 vision)
- **Cialdini's influence principles** (contrast, scarcity, social proof)
- **Voss's tactical empathy** (exact quotes, labeling)
- **Sandler's disqualification** (comfortable "no")

**Marcus is ethical persuasion at its finest.**

---

🎯 **Built for PitchIQ by Cason**

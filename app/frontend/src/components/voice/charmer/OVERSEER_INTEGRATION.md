# Marcus Overseer System - Integration Guide

## What Is It?

The **Overseer** is a parallel strategic layer that analyzes conversation flow and provides contextual hints to Marcus (the rigid AI speaker). This makes Marcus appear more conversationally aware without slowing down response generation.

## Architecture

```
User speaks
    ↓
CharmerController processes
    ↓
    ├─────────────────────────────┐
    │ (parallel, non-blocking)    │ (immediate)
    ▼                             ▼
Overseer analyzes         Marcus generates
    │                             ↑
    └─── hints cached ───────────┘
         (used next turn)
```

## How to Enable (3 Lines of Code)

### Step 1: Import the hook in CharmerController.tsx

```typescript
import { useOverseer } from './useOverseer';
```

### Step 2: Initialize the hook (top of component)

```typescript
const CharmerController: React.FC<CharmerControllerProps> = ({ ... }) => {
  // ... existing state ...
  
  // 🔮 Overseer integration (can be removed without breaking anything)
  const { analyzeConversation, getGuidance, clearCache } = useOverseer();
  
  // ... rest of component ...
```

### Step 3: Call it after user speaks (in your existing processing function)

```typescript
const handleUserUtterance = useCallback(async (userInput: string) => {
  // ... existing code to process user input ...
  
  // 🔮 Start parallel analysis (non-blocking)
  analyzeConversation({
    conversationHistory,
    currentResistance,
    currentPhase,
    exchangeCount: conversationHistory.length / 2,
    lastUserMessage: userInput
  });
  
  // ... continue with Marcus response generation ...
  
  // 🔮 Get strategic hints for Marcus's prompt
  const overseerGuidance = getGuidance();
  
  // Pass to AI service (it's optional, so won't break if empty)
  const response = await aiService.generateResponse(
    context,
    motivationBlock,
    conversationStyle,
    overseerGuidance  // ← New optional parameter
  );
  
  // ... rest of your code ...
}, [analyzeConversation, getGuidance, ...otherDeps]);
```

### Step 4: Clear cache on new calls

```typescript
const handleStartCall = useCallback(() => {
  // ... existing call start logic ...
  
  clearCache(); // Clear overseer hints for fresh start
  
  // ... rest of your code ...
}, [clearCache]);
```

## How to Disable (1 Line Change)

Edit `useOverseer.ts`:

```typescript
// 🎛️ MASTER SWITCH: Set to false to completely disable Overseer
const ENABLE_OVERSEER = false; // ← Change this to false
```

That's it! The entire system is now disabled. No code removal needed.

## How to Remove Completely

If you want to remove the Overseer entirely:

1. Delete these files:
   - `OverseerTypes.ts`
   - `MarcusOverseerService.ts`
   - `useOverseer.ts`
   - `OVERSEER_INTEGRATION.md`

2. In `CharmerController.tsx`, remove:
   - The `import { useOverseer } from './useOverseer';` line
   - The `const { ... } = useOverseer();` line
   - The `analyzeConversation(...)` calls
   - The `overseerGuidance` variable
   - The 4th parameter in `generateResponse(..., overseerGuidance)`

3. In `CharmerAIService.ts`, remove:
   - The 4th parameter `overseerGuidance?: string` from `generateResponse()`
   - The 4th parameter from `buildSystemPrompt()`
   - The overseer guidance injection block (lines 1099-1102)

## What Does It Do?

**Analyzes:**
- User's current intent (pitching, discovery, objection handling, etc.)
- Conversation phase (rapport, pitch, close, etc.)
- Marcus's emotional state (skeptical, curious, defensive, etc.)

**Provides:**
- Allowed response types (short acknowledgment vs opening up)
- Forbidden behaviors (don't volunteer pain points)
- Contextual rules ("They're pitching without discovery - stay defensive")

**Result:**
Marcus feels naturally aware while staying rigid and fast.

## Example Overseer Output

```
🔮 OVERSEER STRATEGIC GUIDANCE

CONVERSATION ANALYSIS:
→ They are currently: pitching
→ Conversation phase: pitch
→ Next likely moves: continue pitching, ask closing question

YOUR EMOTIONAL STATE:
→ Current emotion: skeptical
→ Resistance level: 7/10
→ Trust level: 20%
→ Should you open up? NO - Stay guarded

BEHAVIORAL GUIDANCE:
→ Allowed responses: short_acknowledgment, defensive_statement
→ Avoid: volunteering_pain_points, being_overly_friendly

CONTEXT: User is pitching without doing discovery. They told you your website is outdated. Be defensive.

FOLLOW THE OVERSEER'S GUIDANCE while maintaining your core personality.
```

## Performance

- **Non-blocking**: Overseer runs in parallel, never delays Marcus
- **Fast**: Uses GPT-4o-mini with 300 token limit (~200ms)
- **Cached**: If analysis isn't ready, uses last cached hints
- **Fallback**: If API fails, uses heuristic-based hints

## Testing

To test if it's working:

1. Enable overseer in `useOverseer.ts`
2. Start a Marcus call
3. Check browser console for: `🔮 [Overseer] Starting parallel analysis...`
4. After user speaks, check for: `🔮 [Overseer] Analysis complete: <contextual rule>`
5. Marcus's responses should feel more contextually aware

## Debugging

Set breakpoints or add console logs:

```typescript
const overseerGuidance = getGuidance();
console.log('🔮 Overseer guidance:', overseerGuidance);
```

You'll see the full strategic guidance being injected into Marcus's prompt.

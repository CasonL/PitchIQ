/**
 * MomentCoachingPanel.tsx
 * Interactive coaching panel for deep-diving on a specific moment
 */

import React, { useState, useEffect, useRef } from 'react';
import { KeyMoment, MomentClassification } from './MomentExtractor';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Mic, MicOff, Info, ChevronLeft, ChevronRight } from 'lucide-react';

interface MomentCoachingPanelProps {
  moment: KeyMoment | null;
  callDuration: number;
  onClose?: () => void;
  allMoments?: KeyMoment[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
  theme?: 'dark' | 'light';
  scenario?: any; // Marcus scenario with difficulty level
}

interface RetryResult {
  label: 'better' | 'strong_improvement' | 'partial' | 'still_missed';
  explanation: string;
  marcusReaction: string;
}

type RetryState = 'initial' | 'submitting' | 'result';

interface CoachingBrief {
  // For wins
  whyItWorked?: string;
  
  // For losses - mechanical explanation
  whyItDidntWork?: string;       // Mechanics of why the response failed
}

interface StructuralHint {
  level1: string;  // Broad structure: "Acknowledge his disinterest, Show him value"
  level2: string;  // Specific template: "I understand that..., can I send you a..."
  level3: string;  // Full suggested response
}

interface CoachingSections {
  header?: string;           // First sentence/paragraph before sections
  coreIssue?: string;        // ### The Core Issue section (negative)
  whatWorks?: string;        // ### What Would Work Here section (negative)
  keyMechanic?: string;      // ### The Key Mechanic section (both)
  whatYouDidWell?: string;   // ### What You Did Well section (positive)
  whatLimited?: string;      // ### What Limited the Moment section (positive)
  whyItLanded?: string;      // ### Why It Partially Landed section (positive)
  howToExecute?: string;     // ### How to Execute This Move Better section (positive)
}

const getClassificationLabel = (classification: MomentClassification): string => {
  switch (classification) {
    case 'best_moment': return 'Best Moment';
    case 'strong_move': return 'Strong Move';
    case 'turning_point': return 'Turning Point';
    case 'partial_turning_point': return 'Partial Win: Right Move, Rough Execution';
    case 'strong_attempt': return 'Strong Attempt: Good Instinct, Incomplete';
    case 'mixed_signal': return 'Mixed Result: Addressed Need, Missed Opportunity';
    case 'missed_opportunity': return 'Missed Opportunity';
    case 'mistake': return 'Mistake';
    case 'blunder': return 'Blunder';
  }
};

const getClassificationDotColor = (classification: MomentClassification): string => {
  switch (classification) {
    case 'best_moment': return '#10b981'; // emerald-500
    case 'strong_move': return '#4ade80'; // green-400
    case 'turning_point': return '#3b82f6'; // blue-500
    // Nuanced moments: yellow-green gradient
    case 'partial_turning_point': return '#eab308'; // yellow-500
    case 'strong_attempt': return '#facc15'; // yellow-400
    case 'mixed_signal': return '#fbbf24'; // amber-400
    case 'missed_opportunity': return '#fb923c'; // orange-400
    case 'mistake': return '#fb923c'; // orange-400
    case 'blunder': return '#ef4444'; // red-500
  }
};

export const MomentCoachingPanel: React.FC<MomentCoachingPanelProps> = ({ 
  moment, 
  callDuration, 
  onClose, 
  allMoments, 
  currentIndex, 
  onNavigate,
  theme = 'dark',
  scenario
}) => {
  const [coachingBrief, setCoachingBrief] = useState<CoachingBrief | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const briefCacheRef = useRef<Map<string, CoachingBrief>>(new Map());
  const generatingForMomentRef = useRef<string | null>(null);
  
  // Card navigation state
  const [currentCard, setCurrentCard] = useState(0);
  
  // Retry flow state
  const [isPracticeModeActive, setIsPracticeModeActive] = useState(false);
  const [retryState, setRetryState] = useState<RetryState>('initial');
  const [retryInput, setRetryInput] = useState('');
  const [retryResult, setRetryResult] = useState<RetryResult | null>(null);
  const [showStrongerExample, setShowStrongerExample] = useState(false);
  const [structuralHint, setStructuralHint] = useState<StructuralHint | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [showGiveUpWarning, setShowGiveUpWarning] = useState(false);
  const [showHintResponse, setShowHintResponse] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  useEffect(() => {
    if (moment) {
      setCurrentCard(0);
      setIsPracticeModeActive(false);
      setRetryState('initial');
      setRetryInput('');
      setRetryResult(null);
      setShowStrongerExample(false);
      setStructuralHint(null);
      setRetryAttempts(0);
      setShowHintResponse(false);
      
      // Check cache first
      const cached = briefCacheRef.current.get(moment.id);
      if (cached) {
        console.log('📦 Using cached coaching brief for moment:', moment.id);
        setCoachingBrief(cached);
        setIsLoading(false);
      } else {
        // Clear brief and trigger generation
        setCoachingBrief(null);
        setIsLoading(true);
        
        // If we're already generating for a different moment, reset the flag
        if (generatingForMomentRef.current && generatingForMomentRef.current !== moment.id) {
          console.log('🔄 Canceling previous generation for:', generatingForMomentRef.current);
          generatingForMomentRef.current = null;
        }
        
        // Generate with a small delay to ensure state updates
        setTimeout(() => {
          if (generatingForMomentRef.current !== moment.id) {
            generateCoachingBrief(moment);
          } else {
            console.log('⏳ Already generating for this moment:', moment.id);
          }
        }, 0);
      }
    }
  }, [moment?.id]);
  
  
  const generateCoachingBrief = async (moment: KeyMoment) => {
    // Guard against duplicate calls
    if (generatingForMomentRef.current === moment.id) {
      console.log('⏭️  Already generating coaching for moment:', moment.id);
      return;
    }
    
    generatingForMomentRef.current = moment.id;
    setIsLoading(true);
    
    try {
      const prompt = `You are a strategic sales coach analyzing a pivotal call moment. Be direct, grounded, and specific. No generic advice.

THE MOMENT:
Turn ${moment.turnNumber} - Marcus said: "${moment.marcusResponse}"
You responded: "${moment.userMessage}"

CONTEXT:
- ${moment.whatChanged}
- Marcus's state: Trust ${moment.marcusState?.trust || 'unknown'}, Curiosity ${moment.marcusState?.curiosity || 'unknown'}, Urgency ${moment.marcusState?.urgency || 'unknown'}
- Moment type: ${moment.classification}

TACTICAL PATTERN CHECKS (analyze the user's response for these):
1. **Weak language**: "maybe", "might", "kind of", "a little bit", "just wondering", "could you maybe" = sounds hesitant
2. **Rambling**: Multiple questions or ideas in one breath (discovery + pitch + diagnosis all at once)
3. **Ignored Marcus's question**: If Marcus asked something directly, did you answer it?
4. **Too presumptive**: Asking "are you having issues" or diagnosing pain before earning the right
5. **Length mismatch**: Marcus gave short/impatient response → you gave long explanation (bad)
6. **Mixing modes**: Trying to ask discovery AND pitch AND explain all in the same sentence
7. **Exit overtalking**: If Marcus said "send me something" or "I'll look later", he already gave you the next step - did you keep the handoff SHORT or did you add a mini-pitch?

STRATEGIC CORRECTION GUIDANCE:
- If Marcus asks "What do you want?" or "Why are you calling?" → he's asking for CLARITY, not inviting discovery
- Correct move: Answer his question FIRST (crisp reason for call), THEN transition to one question
- WRONG: deflect into discovery ("I want to understand your challenges")
- RIGHT: answer directly ("Quick reason for the call: [concrete value prop]. [One clean question]")
- Pattern: impatient buyer = needs clarity, not discovery invitation
- Don't recommend pivoting to discovery when the buyer is asking for relevance/clarity

EXIT MOMENT GUIDANCE:
- If Marcus says "Send me something", "I'll look later", "I've got to run", or similar soft exit → he ALREADY gave you the next step
- This is a HANDOFF moment, not a persuasion moment
- Correct move: Accept exit cleanly + State what you'll send briefly + Done
- WRONG: Add mini-pitch, pile on claims, ask permission for something he already allowed, keep selling
- RIGHT: "I'll send over [specific thing]. You can review it when you have time."
- Don't mistake "not fighting the exit" for "handled it well" - if you overtalked the handoff, that's still a mistake
- These moments should usually be classified as NUANCED at best (accepted exit but overtalked), not clean wins

${['strong_move', 'best_moment', 'turning_point', 'partial_turning_point', 'strong_attempt', 'mixed_signal'].includes(moment.classification) ? `This moment had POTENTIAL. Analyze both the strategic choice AND the execution quality:

CRITICAL: Separate "right move" from "clean execution". A rep can choose the correct strategic response but deliver it poorly. Be honest about both.

ALSO CRITICAL: Distinguish "baseline competence" from "momentum-creating move". Don't oversell basic expected behavior.

TONE: Rigorous coach who sees nuance. Give credit for good instincts, but don't oversell rough execution OR basic table-stakes behavior.

BASELINE VS MOMENTUM:
**Baseline competence** (necessary but not pivotal):
- Answering "who's this?" with your name and company = basic identification, not trust-building masterstroke
- Saying "how are you doing?" = small talk, not rapport-building genius
- Responding to a question = minimum expected behavior, not strategic brilliance

**Momentum-creating moves** (actually shifts the dynamic):
- Getting Marcus to reveal a pain point he wasn't planning to share
- Earning permission to send something when he was ready to decline
- Shifting from skeptical to curious through a well-crafted question
- Creating genuine interest where there was none

DON'T OVERSELL:
- ❌ "You established credibility and trust" (just said your name)
- ❌ "You created momentum" (just answered basic question)
- ❌ "You built rapport" (just added unnecessary small talk)
- ✅ "You handled the baseline checkpoint" (accurate)
- ✅ "You answered competently but didn't create real shift yet" (honest)

EXECUTION QUALITY CHECKS:
1. **Clarity**: Was the response actually clear, or just directionally relevant but clunky?
2. **Completeness**: Did they finish their thought, or trail off mid-sentence?
3. **Phrasing**: Was it natural and conversational, or awkward and tangled?
4. **Precision**: Did they use concrete language, or vague/generic terms?
5. **Strategic alignment**: Did they actually pick up the buyer's thread, or just answer generally?

CLASSIFY THE WIN:
- **Full clean win**: Right move + clean execution + created real shift
- **Partial win**: Right move + rough execution (MOST COMMON)
- **Baseline competence**: Did the expected thing adequately (not a "win", just necessary)
- **Decent move**: Right instinct + clumsy delivery
- **Exit overtalked**: Accepted the exit (good) but added unnecessary pitch during handoff (mistake)

Don't call something "clear and concise" if it was unfinished or awkward. Be honest.
Don't reward "maintaining dialogue" if Marcus had already given the next step and the user just needed to make the handoff simple.
Don't call basic identification a "trust-building" or "momentum-creating" moment. That's just showing up to the game.

FORMAT RULES:
- Start with 1 sentence on the core strategic choice
- Use markdown headers (###) for each section
- Use bullet points (-) for breakdown items
- Add blank lines (\\n\\n) between sections
- Use **bold** for key concepts
- ALWAYS include a concrete improvement example if execution was rough

ADAPTIVE STRUCTURE - Choose based on moment complexity:

SIMPLE MOMENTS (basic identification, routine answers):
### Summary
1-2 sentences on what happened and whether it was handled cleanly.

### Better Move (if execution was rough)
One verbatim example showing cleaner delivery.
> "Example"

MEDIUM MOMENTS (nuanced execution issues, partial wins):
### Summary
1 sentence: what you attempted and whether it landed.

### What Limited It
Specific execution issues with quotes from actual words if rough.

### Better Move
1-2 verbatim examples of cleaner execution.
> "Example 1"
> "Example 2"

DEEP MOMENTS (strategic pivots, major missed opportunities):
### Summary
What happened in this exchange.

### Why It Mattered
The strategic significance or cost of the move.

### Better Move
Multiple concrete examples with the underlying principle baked in.
> "Example 1"
> "Example 2"

CRITICAL RULES:
- DO NOT create 4+ sections for simple moments
- MERGE "what you did well" into the summary sentence
- DO NOT separate "Why It Landed" from "What Limited" - they're the same diagnosis
- DO NOT add a standalone "Key Mechanic" section - weave it into Better Move
- Cap at 2-3 sections for 80% of moments

Example output for SIMPLE moment (basic answer with rough execution):
{
  "whyItWorked": "You answered Marcus's question by identifying yourself, which was necessary. The added small talk ('How are you doing today?') made it less focused than it needed to be.\\n\\n### Better Move\\nAnswer directly and move forward without social filler.\\n\\n> \\"Hey Marcus, it's Kayson from Website Refresh Co. Quick reason for the call...\\""
}

Example output for MEDIUM moment (strategic move with execution issues):
{
  "whyItWorked": "You attempted to explain your offer when Marcus asked, which was the right move.\\n\\n### What Limited It\\nThe phrasing was rough and unfinished. 'Where you can generate a persona exactly like your IT customer persona' is clunky. You trailed off: 'afterwards, they get,' - incomplete delivery reduced clarity.\\n\\n### Better Move\\nAnswer with a complete, concrete explanation. When a buyer asks for clarity, being direct and finishing your thought builds credibility.\\n\\n> \\"We let your reps practice against AI prospects modeled after your real buyers, so they can sharpen conversations before talking to actual customers.\\"\\n\\n> \\"Sales training that feels like real calls. Your team practices on AI prospects that match your buyer personas.\\""
}

Now generate YOUR coaching based on the actual moment above.` : `Explain what MECHANICALLY would work here instead:

TONE: Concrete, specific coaching with EXACT verbatim suggestions. The user will retry this moment, so your suggestions must be precise enough that if they say them verbatim, they WILL succeed.

FORMAT RULES - CRITICAL FOR EVALUATION ALIGNMENT:
- Start with 1 sentence on the core issue
- Use markdown headers (###) for each section
- Use bullet points (-) for breakdown items
- Add blank lines (\\n\\n) between sections
- Use **bold** for key concepts AND key actions
- ALWAYS include 2-3 blockquote examples (> "exact verbatim response") that would score as "better"

ADAPTIVE STRUCTURE - Choose based on moment severity:

SIMPLE MISTAKE (minor tactical error):
### The Issue
1-2 sentences on what went wrong.

### Better Move
One concrete verbatim example.
> "Example"

MEDIUM MISTAKE (strategic mismatch or poor execution):
### The Issue
What Marcus needed vs what you gave. Quote actual awkward phrases if present.

WORDING PRECISION: Use "reduced clarity" or "made the call feel less controlled" instead of vague "increased resistance".

### Better Move

SPECIAL CASE - DIFFERENTIATION QUESTIONS:
If Marcus asked "what makes this different from other [X]?" or "I've seen a bunch of those before", he is NOT asking for a cleaner generic explanation. He's asking for EXPLICIT CONTRAST.

- Lead with the differentiator: state the ONE thing that makes it unlike what he's seen
- Make the contrast explicit: directly compare to seminars/static roleplay/generic training
- Keep it concrete: explain what happens differently in practice
- Examples MUST show contrast structure: "Unlike X, we do Y" or "This isn't X. It's Y because Z."
- DO NOT give polished generic value props - Marcus is already skeptical of those
- DO NOT default to "answer + question" - sometimes the right move is just to nail the differentiation and stop

GENERAL GUIDANCE:
- **First action**: [specific behavior] - why this works
- **Second action**: [specific behavior] - why this works
- If applicable, contrast what they said vs what they should have said ("You said X, which is weak. Instead say Y, which is direct.")
- CRITICAL: Include 2-3 verbatim examples in blockquotes that demonstrate these actions
- Examples MUST be SHORTER/CLEANER than what the user said
- Examples MUST sound CONVERSATIONAL and NATURAL, not formal or corporate
- Examples MUST be CONCRETE and SPECIFIC to this moment, not generic value statements
- AVOID generic value language: "improve performance", "boost results", "drive growth", "innovative solutions", "enhance effectiveness", "realistic practice environment", "stress-free setting"
- AVOID outcome claims too early: "drives results", "guaranteed success" - these sound like pitches
- PREFER concrete activities: "practice real conversations" not "improve performance"
- PREFER category differentiation with contrast: "we do X instead of Y" (e.g., "the AI prospect adapts and pushes back in real time, not canned roleplay scenarios")
- AVOID: "enhance", "discuss", "explore", "effectiveness", "I want to understand" - these are too polished/boardroom
- PREFER: short, direct language that sounds like real cold-call conversation
- If Marcus asked for clarity ("What do you want?"), examples should ANSWER his question, not deflect into discovery
- NOT EVERY MOMENT NEEDS A QUESTION: Sometimes the right move is just to answer the objection well and stop

1-2 verbatim examples with the underlying principle woven in (not as separate section).

> "Example response 1 that would work"

> "Example response 2 that would work"

Weave in why this works: the principle that makes this approach effective for Marcus's actual need.

CRITICAL GUIDANCE FOR EXAMPLES:
- Your verbatim examples are the "gold standard" that will be evaluated
- Make them CONCRETE and SPECIFIC to this exact moment
- Describe WHAT YOU DO in practical terms, not vague value propositions
- Use contrast structure when possible: "we help teams do X instead of Y" (concrete vs concrete)
- Example: "practice real buyer conversations instead of just sitting through training" (GOOD)
- Example: "improve sales performance with innovative solutions" (TOO VAGUE)
- They should sound like REAL conversation, not polished sales copy or brochure language
- Shorter is better - if Marcus was impatient, your example should be brief
- Use natural language: "Quick reason for the call" not "I'd like to discuss"
- Avoid asking for pain/challenges too early - earn the right first
- Match the buyer's energy - if they're skeptical, be crisp and clear, not wordy
- Don't make outcome claims ("drives results") at the opening - just explain what you do differently
- Use concrete, category-specific language and avoid generic value claims in examples
- For follow-up questions, prefer concrete and natural: "How are you currently training reps?" over abstract "What's your current approach to training?"
- Questions should be short, direct, and conversational - not formal or consultative

Example output for SIMPLE mistake:
{
  "whyItDidntWork": "Marcus asked 'What do you want?' and needed a fast, clear answer. You hesitated with 'could you maybe' and 'a little bit', which made the call feel less controlled.\n\n### Better Move\nAnswer directly with concrete differentiation - this shows you respect his time.\n\n> \"Quick reason for the call: we help sales teams practice real buyer conversations instead of just sitting through training. How are you currently training reps?\"\n\n> \"I'll keep it brief. We offer hands-on sales training that's different from traditional methods. How do you currently support your sales team?\""
}

Example output for MEDIUM mistake:
{
  "whyItDidntWork": "Marcus asked what makes this different from other training he's seen. You gave a generic explanation instead of explicit contrast.\n\n### The Issue\nMarcus wasn't asking for a cleaner pitch - he was asking for differentiation. Your answer didn't show how this is UNLIKE what he's seen before.\n\n### Better Move\nLead with the differentiator using contrast structure. This directly addresses his skepticism.\n\n> \"Unlike seminars where reps just listen, this is live practice against AI prospects that push back in real time.\"\n\n> \"This isn't roleplay with a coworker reading a script. The AI adapts based on what your rep says, so they get real objection handling.\""
}

Now generate YOUR coaching based on the actual moment above.`}

STYLE RULES:
- Strategic and grounded in Marcus's state and call dynamics
- Short paragraphs (1-3 sentences)
- Use "you" not "the rep"
- **Bold** key strategic concepts
- > blockquotes for exact alternative responses
- NO generic sales advice - ground everything in THIS moment
- NO motivational fluff - be direct about what worked or didn't`;

      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `You are a sales coach. Output valid JSON with EXACTLY ONE field:
- For positive/nuanced moments (strong_move, best_moment, turning_point, partial_turning_point, strong_attempt, mixed_signal): use field "whyItWorked"
- For negative moments (mistake, missed_opportunity, blunder): use field "whyItDidntWork"

Current moment type: ${moment.classification}
Required field name: ${['strong_move', 'best_moment', 'turning_point', 'partial_turning_point', 'strong_attempt', 'mixed_signal'].includes(moment.classification) ? '"whyItWorked"' : '"whyItDidntWork"'}

ALL markdown sections (### headers, bullet points, blockquotes) must be INSIDE that single string field value using \\n for line breaks. Do NOT create separate JSON fields for each section. The example shows the correct format.` },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 1500
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate coaching brief');
      
      const data = await response.json();
      let content = data.choices[0].message.content;
      
      console.log('🤖 Raw LLM output:', content);
      
      // Extract JSON from markdown code fences if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
      
      // Remove any leading/trailing whitespace
      content = content.trim();
      
      // Sanitize: escape actual newlines and control characters that LLM may output
      // Even with json_object mode, OpenAI sometimes outputs literal newlines in strings
      // Find the string value and escape only the content between the first " and last "
      let sanitized = content;
      const match = content.match(/\{\s*"whyIt(?:Didnt)?Work"\s*:\s*"([\s\S]*)"\s*\}/);
      if (match) {
        const originalValue = match[1];
        const escapedValue = originalValue
          .replace(/\\/g, '\\\\')  // Escape backslashes first
          .replace(/"/g, '\\"')     // Escape internal quotes
          .replace(/\n/g, '\\n')     // Escape newlines
          .replace(/\r/g, '\\r')     // Escape carriage returns  
          .replace(/\t/g, '\\t');    // Escape tabs
        sanitized = content.replace(originalValue, escapedValue);
      }
      
      let brief;
      try {
        brief = JSON.parse(sanitized);
        console.log(' Successfully parsed coaching brief');
        
        // Unescape literal \n sequences that LLM may have output instead of actual newlines
        if (brief.whyItWorked) {
          brief.whyItWorked = brief.whyItWorked.replace(/\\n/g, '\n');
        }
        if (brief.whyItDidntWork) {
          brief.whyItDidntWork = brief.whyItDidntWork.replace(/\\n/g, '\n');
        }
      } catch (parseError) {
        console.error(' Failed to parse coaching brief:', parseError);
        console.log('Raw content:', content);
        console.log('Sanitized:', sanitized);
        console.log('Parse error position:', (parseError as any).message);
        throw new Error('Invalid JSON response from LLM');
      }
      
      // Post-process markdown to fix common LLM formatting issues
      const fixMarkdown = (text: string): string => {
        if (!text) return text;
        
        // Fix standalone quoted lines - add > character for blockquote syntax
        // Pattern: lines that start with " but don't have > before them
        let fixed = text.replace(/\n"([^"]+)"/g, '\n\n> "$1"');
        
        // Also fix if it's at the start of the text
        if (fixed.startsWith('"') && !fixed.startsWith('> "')) {
          fixed = '> ' + fixed;
        }
        
        console.log('🔧 Fixed markdown formatting');
        return fixed;
      };
      
      // Apply markdown fixes to the coaching content
      if (brief.whyItWorked) {
        brief.whyItWorked = fixMarkdown(brief.whyItWorked);
      }
      if (brief.whyItDidntWork) {
        brief.whyItDidntWork = fixMarkdown(brief.whyItDidntWork);
      }
      
      // Cache the brief
      briefCacheRef.current.set(moment.id, brief);
      console.log('💾 Cached coaching brief for moment:', moment.id);
      
      setCoachingBrief(brief);
      
    } catch (error) {
      console.error('Error generating coaching brief:', error);
      setCoachingBrief({
        whyItDidntWork: 'Unable to generate coaching brief. Please try again.'
      });
    } finally {
      setIsLoading(false);
      generatingForMomentRef.current = null;
    }
  };
  
  const evaluateRetry = async (userResponse: string): Promise<RetryResult> => {
    const scenarioDifficulty = scenario?.difficulty || 'medium';
    
    // Extract suggested responses from coaching brief for gold standard comparison
    const suggestedResponses = coachingBrief?.whyItDidntWork?.match(/> "([^"]+)"/g)?.map(q => q.replace(/> "(.+)"/, '$1')) || [];
    
    const prompt = `You are evaluating a sales rep's retry attempt for a weak moment in their call.

# ORIGINAL MOMENT CONTEXT
**Moment Type**: ${getClassificationLabel(moment!.classification)}
**Marcus Said**: "${moment!.marcusMessage}"
**Your Original Response**: "${moment!.userMessage}"
**Marcus's State**: Trust=${moment!.marcusState.trust}, Curiosity=${moment!.marcusState.curiosity}, Urgency=${moment!.marcusState.urgency}
**Scenario Difficulty**: ${scenarioDifficulty.toUpperCase()} - ${scenarioDifficulty === 'easy' ? 'Marcus is a winnable prospect' : scenarioDifficulty === 'medium' ? 'Marcus requires strong technique' : 'Marcus is likely a dead-end (qualify-out expected)'}

# COACHING BRIEF - WHAT WOULD WORK
${coachingBrief?.whyItDidntWork || 'The response missed the mark.'}

# GOLD STANDARD RESPONSES (if user matches these, they succeed)
${suggestedResponses.length > 0 ? suggestedResponses.map((r, i) => `${i + 1}. "${r}"`).join('\n') : 'None provided'}

# USER'S RETRY ATTEMPT
"${userResponse}"

# YOUR TASK
Evaluate this retry using ONE PRIMARY QUESTION:

🎯 **DID THIS IMPROVE THE POSITION RELATIVE TO THE ORIGINAL MOMENT?**

NOT: "Is this perfect?"
NOT: "Does this maximize the entire call?"
NOT: "Does this match the coaching examples exactly?"

# EVALUATION FRAMEWORK

**STEP 1: COMPARE ORIGINAL → RETRY**

Original Response: "${moment!.userMessage}"
Retry Response: "${userResponse}"

Ask yourself:
1. What was the MAIN problem with the original?
2. Did the retry fix or improve that specific problem?
3. Is the retry response better positioned than the original (even if not perfect)?

**STEP 2: APPLY STAGE-APPROPRIATE LENS**

**EARLY CALL ("Who's this?" / "What do you want?"):**
- Original problem likely: unclear identity, no reason for call, or added fluff
- Retry success: clearer identity, stated reason, removed fluff
- DON'T demand: urgency, specific value prop, personalized pitch (too early)

**MID CALL (Discovery/qualification):**
- Original problem likely: didn't uncover needs, missed concern, pushed too hard
- Retry success: better question, acknowledged concern, earned next step
- DON'T demand: full solution, closing language (wrong stage)

**LATE CALL (Objections/closing):**
- Original problem likely: didn't address objection, missed commitment opportunity
- Retry success: handled concern, created next step
- NOW you can expect: specificity, direct handling

**STEP 3: VERDICT**

Return ONLY valid JSON:
{
  "label": "better" | "strong_improvement" | "partial" | "still_missed",
  "explanation": "One specific sentence about what improved or what's still limiting",
  "marcusReaction": "A short (1-2 sentence) simulated response Marcus would give"
}

**LABEL GUIDE (relative to original):**
- "better" = Fixed the main issue, would move conversation forward
- "strong_improvement" = Fixed main issue + added value
- "partial" = Improved something but main issue still present
- "still_missed" = Didn't improve the core problem

**EXPLANATION QUALITY REQUIREMENTS:**
- ❌ GENERIC: "lacks connection to Marcus's current state of urgency"
- ✅ SPECIFIC: "doesn't address Marcus's direct question 'What do you want?' with a clear, concise value proposition"

- ❌ GENERIC: "improved clarity about the service but still lacks connection to needs"
- ✅ SPECIFIC: "better explains the service, but Marcus still hasn't heard why this matters for his [company type/role] specifically"

- ❌ GENERIC: "still doesn't connect to his current state"
- ✅ SPECIFIC: "Marcus asked 'What do you want?' - your response didn't give him a quick, clear reason to keep listening"

**CRITICAL: DISTINGUISH BETWEEN "DIDN'T ANSWER" VS "TOO VERBOSE"**

If Marcus asks "What do you want?" and user says "The reason for my call is [service details]":
- ❌ WRONG DIAGNOSIS: "you didn't address Marcus's question"
- ✅ RIGHT DIAGNOSIS: "you answered but packed too much detail for someone asking 'What do you want?' - shorter and crisper would work better"

If Marcus says "I'm busy" and user launches into a 3-sentence pitch:
- ❌ WRONG: "you didn't acknowledge his concern"
- ✅ RIGHT: "you acknowledged it but then gave too long an explanation for someone who just said they're busy"

**PRECISION MATTERS:**
- "Didn't answer" = user completely ignored the question/concern
- "Answered too verbosely" = user addressed it but with too much detail/length
- "Wrong answer" = user answered the wrong question or misread the situation
- "Right direction but incomplete" = user started well but didn't finish the thought

**EXPLANATION RULES:**
1. Focus on what CHANGED between original and retry
2. Reference what Marcus actually said (use quotes)
3. Be concrete: "removed unnecessary small talk" not "improved connection"
4. If it's better, say what improved. If partial, say what main issue remains.
5. Avoid vague terms like "state", "needs", "connection" without specifics

**COMMON EVALUATION MISTAKES TO AVOID:**

❌ DEMANDING PERFECTION:
- "lacks specific value prop" (when original just needed clarity)
- "doesn't create urgency" (at early identification moment)
- "not personalized to his business" (too early for that)

✅ JUDGING IMPROVEMENT:
- "removed the small talk that made original unclear"
- "stated reason for call which original didn't do"
- "clearer than original, though could still be tightened"

❌ CHECKLIST MENTALITY:
- Checking if retry has: value prop + urgency + personalization + next step

✅ RELATIVE IMPROVEMENT:
- Did this fix the thing that made the original weak?

EXAMPLES OF GOOD EVALUATION:

Original: "Hey Marcus, how are you doing today? I'm calling about your website."
Retry: "Hey Marcus, reason for my call is we help improve website performance. Got a minute?"
Verdict: **"better"** - Removed fluff, stated clear reason (don't demand urgency/specificity at this stage)

Original: "I can help with your challenges."
Retry: "What's currently frustrating about your website?"
Verdict: **"strong_improvement"** - Shifted from claim to discovery question

Original: "We do SEO and content."
Retry: "We do SEO, content, design, analytics, and consulting."
Verdict: **"still_missed"** - Added more features but didn't fix relevance problem

OUTCOME-BASED CRITERIA:
Ask: Would this retry work better than the original in moving the conversation forward?

ACCEPT AS "BETTER" IF:
- Fixed the main issue from the original (even if not perfect)
- Marcus would respond more positively to this than the original
- It's positioned better for the next exchange

**The coaching examples show ONE possible path. Accept any approach that improves on the original.**

Examples:
- Coaching: "Acknowledge, then offer to send info"
- User: "Let's connect in a few months" → ACCEPT if original was pushy
- User: "What makes this bad timing?" → ACCEPT if original didn't diagnose

**GENERATE MARCUS'S REACTION THAT MATCHES THE LABEL:**
- "better"/"strong_improvement" → Marcus reacts POSITIVELY or with INTEREST
- "partial" → Marcus is POLITE but NON-COMMITTAL
- "still_missed" → Marcus DECLINES, PUSHES BACK, or SHOWS RESISTANCE

**CRITICAL CONSISTENCY RULE:**
If you label it "better" but Marcus declines/passes in your reaction → YOU MADE AN ERROR. The label and reaction must be aligned.

**MARCUS REACTION MUST BE CONTEXTUAL TO USER'S ACTUAL WORDS:**

❌ GENERIC REACTION: "I appreciate the information, but I'm still not sure how this directly benefits my company right now."
✅ CONTEXTUAL REACTION: "Maybe, but I'm not really following. What exactly are you trying to help with?" (responds to specific wording/structure)

❌ GENERIC: "That sounds interesting, but can you tell me more?"
✅ CONTEXTUAL: "SEO and content, got it. We already have someone doing that though." (references specific service mentioned)

**HOW TO MAKE REACTIONS CONTEXTUAL:**
1. Reference specific words/phrases the user actually said (e.g., "SEO", "online presence", "improve visibility")
2. React to the LENGTH of their response (if too long: "That's a lot to take in", if crisp: natural engagement)
3. React to the TONE (pushy vs consultative vs rushed)
4. Avoid cookie-cutter phrases like "I appreciate the information" unless they truly fit

Be consistent and deterministic. Same input should give same output.`;

    const response = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a sales coach evaluating retry attempts. Be consistent and deterministic in your judgments. Output only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,  // Low temperature for consistent, deterministic evaluations
        max_tokens: 400
      })
    });

    if (!response.ok) throw new Error('Failed to evaluate retry');

    const data = await response.json();
    let content = data.choices[0].message.content;

    // Extract JSON from markdown code fences if present
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    return JSON.parse(content.trim());
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Transcription failed');

      const data = await response.json();
      setRetryInput(data.transcript || '');
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const parseCoachingSections = (text: string): CoachingSections => {
    const sections: CoachingSections = {};
    
    // Extract header (everything before first ###)
    const headerMatch = text.match(/^([^#]+?)(?=###|$)/s);
    if (headerMatch) {
      sections.header = headerMatch[1].trim();
    }
    
    // NEGATIVE moment sections
    const coreIssueMatch = text.match(/### The Core Issue([\s\S]*?)(?=###|$)/i);
    if (coreIssueMatch) {
      sections.coreIssue = '### The Core Issue' + coreIssueMatch[1];
    }
    
    const whatWorksMatch = text.match(/### What Would Work Here([\s\S]*?)(?=###|$)/i);
    if (whatWorksMatch) {
      sections.whatWorks = '### What Would Work Here' + whatWorksMatch[1];
    }
    
    // POSITIVE moment sections
    const whatYouDidWellMatch = text.match(/### What You Did Well([\s\S]*?)(?=###|$)/i);
    if (whatYouDidWellMatch) {
      sections.whatYouDidWell = '### What You Did Well' + whatYouDidWellMatch[1];
    }
    
    const whatLimitedMatch = text.match(/### What Limited the Moment([\s\S]*?)(?=###|$)/i);
    if (whatLimitedMatch) {
      sections.whatLimited = '### What Limited the Moment' + whatLimitedMatch[1];
    }
    
    const whyItLandedMatch = text.match(/### Why It (?:Partially |Fully )?Landed([\s\S]*?)(?=###|$)/i);
    if (whyItLandedMatch) {
      sections.whyItLanded = whyItLandedMatch[0];
    }
    
    const howToExecuteMatch = text.match(/### How to Execute This Move Better([\s\S]*?)(?=###|$)/i);
    if (howToExecuteMatch) {
      sections.howToExecute = '### How to Execute This Move Better' + howToExecuteMatch[1];
    }
    
    // The Key Mechanic (used by both)
    const keyMechanicMatch = text.match(/### The Key Mechanic([\s\S]*?)$/i);
    if (keyMechanicMatch) {
      sections.keyMechanic = '### The Key Mechanic' + keyMechanicMatch[1];
    }
    
    return sections;
  };

  // Determine card structure based on moment type
  const getCardStructure = (classification: MomentClassification, isWin: boolean) => {
    // Wins: 2 cards (Why It Worked + Principle)
    if (['strong_move', 'best_moment'].includes(classification)) {
      return ['why-worked', 'principle'];
    }
    
    // Nuanced/Losses: 4 cards (Read + Problem + Better Move + Principle)
    // Practice is separate, triggered by button
    return ['read', 'problem', 'better-move', 'principle'];
  };

  // Render individual card content
  const renderCard = (cardType: string, sections: CoachingSections, classification: MomentClassification) => {
    const isWin = ['strong_move', 'best_moment'].includes(classification);
    const isNuanced = ['partial_turning_point', 'strong_attempt', 'mixed_signal'].includes(classification);
    
    // Card colors
    const cardColors = isWin 
      ? { bg: theme === 'dark' ? 'from-green-500/10 to-emerald-500/10' : 'from-green-50 to-emerald-50', border: theme === 'dark' ? 'border-green-500/30' : 'border-green-300', text: theme === 'dark' ? 'text-green-400' : 'text-green-700', heading: theme === 'dark' ? 'text-green-300' : 'text-green-700' }
      : isNuanced
      ? { bg: theme === 'dark' ? 'from-yellow-500/10 to-amber-500/10' : 'from-yellow-50 to-amber-50', border: theme === 'dark' ? 'border-yellow-500/30' : 'border-yellow-300', text: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700', heading: theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700' }
      : { bg: theme === 'dark' ? 'from-orange-500/10 to-red-500/10' : 'from-orange-50 to-red-50', border: theme === 'dark' ? 'border-orange-500/30' : 'border-orange-300', text: theme === 'dark' ? 'text-orange-400' : 'text-orange-700', heading: theme === 'dark' ? 'text-orange-300' : 'text-orange-700' };

    switch (cardType) {
      case 'read':
        // Card 1: The Read (what happened + what you did well)
        return (
          <div>
            {sections.header && (
              <div className="mb-4">
                <ReactMarkdown>{sections.header}</ReactMarkdown>
              </div>
            )}
            {sections.whatYouDidWell && (
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 first:mt-0 ${cardColors.heading}`} {...props} />,
                  p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                }}
              >{sections.whatYouDidWell}</ReactMarkdown>
            )}
          </div>
        );
      
      case 'problem':
        // Card 2: The Problem (what limited it + why it only partially landed)
        return (
          <div>
            {sections.whatLimited && (
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mb-2 ${cardColors.heading}`} {...props} />,
                  p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                }}
              >{sections.whatLimited}</ReactMarkdown>
            )}
            {sections.whyItLanded && (
              <div className="mt-4">
                <ReactMarkdown
                  components={{
                    h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${cardColors.heading}`} {...props} />,
                    ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                    li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className={`mt-0.5 ${cardColors.text}`}>•</span><span className="flex-1">{props.children}</span></li>,
                  }}
                >{sections.whyItLanded}</ReactMarkdown>
              </div>
            )}
            {sections.coreIssue && (
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mb-2 ${cardColors.heading}`} {...props} />,
                  p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                }}
              >{sections.coreIssue}</ReactMarkdown>
            )}
          </div>
        );
      
      case 'better-move':
        // Card 3: The Better Move (how to execute better with verbatim examples)
        return (
          <div>
            {sections.howToExecute && (
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mb-2 ${cardColors.heading}`} {...props} />,
                  p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className={`border-l-2 pl-3 my-2 italic ${
                    theme === 'dark' ? 'border-blue-500 text-blue-200' : 'border-blue-400 text-blue-800'
                  }`} {...props} />,
                }}
              >{sections.howToExecute}</ReactMarkdown>
            )}
            {sections.whatWorks && (
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mb-2 ${cardColors.heading}`} {...props} />,
                  ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                  li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className={`mt-0.5 ${cardColors.text}`}>•</span><span className="flex-1">{props.children}</span></li>,
                }}
              >{sections.whatWorks}</ReactMarkdown>
            )}
          </div>
        );
      
      case 'principle':
        // Card 4: The Principle (key mechanic - when to use this again)
        return (
          <div>
            {sections.keyMechanic && (
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mb-2 ${cardColors.heading}`} {...props} />,
                  p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                }}
              >{sections.keyMechanic}</ReactMarkdown>
            )}
          </div>
        );
      
      case 'why-worked':
        // Win Card 1: Why This Worked (full positive feedback)
        return (
          <div>
            <ReactMarkdown
              components={{
                h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-6 mb-3 first:mt-0 ${cardColors.heading}`} {...props} />,
                p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className={`mt-0.5 ${cardColors.text}`}>•</span><span className="flex-1">{props.children}</span></li>,
                strong: ({node, ...props}) => <strong className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} {...props} />,
              }}
            >{sections.header || ''}</ReactMarkdown>
            {sections.whatYouDidWell && (
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${cardColors.heading}`} {...props} />,
                  p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                }}
              >{sections.whatYouDidWell}</ReactMarkdown>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  const extractStructuralHint = (brief: CoachingBrief): StructuralHint | null => {
    if (!brief.whyItDidntWork) return null;

    console.log('🔍 Extracting verbatim response hint from coaching brief');
    
    // Extract ALL blockquote examples (suggested responses) - try multiple quote patterns
    let suggestions: string[] = [];
    
    // Try pattern 1: > "text" (straight quotes)
    let matches = brief.whyItDidntWork.match(/>\s*"([^"]+)"/g);
    if (matches) {
      suggestions = matches.map(m => {
        const match = m.match(/>\s*"([^"]+)"/);
        return match ? match[1].trim() : '';
      }).filter(s => s.length > 0);
    }
    
    // Try pattern 2: > "text" or > "text" (smart quotes) if pattern 1 failed
    if (suggestions.length === 0) {
      matches = brief.whyItDidntWork.match(/>\s*[""]([^""]+)[""]/g);
      if (matches) {
        suggestions = matches.map(m => {
          const match = m.match(/>\s*[""]([^""]+)[""]/);
          return match ? match[1].trim() : '';
        }).filter(s => s.length > 0);
      }
    }
    
    // Try pattern 3: > \" escaped quotes (in case JSON escaping)
    if (suggestions.length === 0) {
      matches = brief.whyItDidntWork.match(/>\s*\\"([^"]+)\\"/g);
      if (matches) {
        suggestions = matches.map(m => {
          const match = m.match(/>\s*\\"([^"]+)\\"/);
          return match ? match[1].trim() : '';
        }).filter(s => s.length > 0);
      }
    }
    
    console.log('💬 Extracted verbatim suggestions:', suggestions);
    
    // Return FIRST suggestion verbatim - this is what they should say
    const verbatimResponse = suggestions.length > 0 ? suggestions[0] : 
      'Address his concern directly and provide a clear next step.';
    
    console.log('✅ Verbatim hint to display:', verbatimResponse);
    
    // Return as level3 (interface kept for compatibility)
    return { 
      level1: '', 
      level2: '', 
      level3: verbatimResponse 
    };
  };

  const handleRetrySubmit = async () => {
    if (!retryInput.trim() || !moment) return;

    setRetryState('submitting');
    setRetryAttempts(prev => prev + 1);

    try {
      const result = await evaluateRetry(retryInput);
      setRetryResult(result);
      setRetryState('result');
    } catch (error) {
      console.error('Failed to evaluate retry:', error);
      setRetryState('initial');
    }
  };

  const handleTryAgain = () => {
    setRetryState('initial');
    setRetryInput('');
    setRetryResult(null);
    setShowHintResponse(false);
  };

  
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const summarizeContext = (exchanges: Array<{speaker: string; text: string}>): string => {
    if (exchanges.length === 0) return '';
    
    const topics: string[] = [];
    exchanges.forEach(ex => {
      const text = ex.text.toLowerCase();
      if (text.includes('price') || text.includes('cost')) topics.push('pricing');
      else if (text.includes('time') || text.includes('when')) topics.push('timing');
      else if (text.includes('how') || text.includes('work')) topics.push('process');
      else if (text.includes('proof') || text.includes('evidence')) topics.push('proof');
      else if (text.includes('trust') || text.includes('believe')) topics.push('trust');
    });
    
    const uniqueTopics = [...new Set(topics)];
    if (uniqueTopics.length > 0) {
      return `Discussing ${uniqueTopics.join(', ')}`;
    }
    
    return exchanges[0].speaker === 'user' 
      ? 'You were asking questions'
      : 'Marcus was responding to your questions';
  };
  
  const calculateCallProgress = (timestamp: number, callDuration: number): number => {
    return Math.min(100, (timestamp / callDuration) * 100);
  };
  
  const renderInteractiveExplanation = (explanation: string) => {
    // Simple text rendering without tooltips
    return explanation;
  };
  
  if (!moment) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a moment to begin coaching
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col h-full overflow-hidden ${
      theme === 'dark' ? 'bg-[#0a0e13]' : 'bg-gray-50'
    }`}>
      {/* Coaching Content - Scrollable (mobile: no padding, no border as it's handled by parent) */}
      <div className={`flex-1 overflow-y-auto md:p-6 md:border-b ${
        theme === 'dark' ? 'md:border-white/10' : 'md:border-gray-200'
      }`}>
        {/* Marcus's State - Hidden on mobile (shown at top of mobile layout) */}
        <div className="hidden md:flex gap-2 md:gap-3 text-xs mb-4 md:mb-6">
          <div className={`flex-1 rounded-lg p-2 ${
            theme === 'dark' ? 'bg-white/5' : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className={`mb-1 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
            }`}>Trust</div>
            <div className={`font-medium capitalize ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>{moment.marcusState?.trust || 'unknown'}</div>
          </div>
          <div className={`flex-1 rounded-lg p-2 ${
            theme === 'dark' ? 'bg-white/5' : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className={`mb-1 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
            }`}>Curiosity</div>
            <div className={`font-medium capitalize ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>{moment.marcusState?.curiosity || 'unknown'}</div>
          </div>
          <div className={`flex-1 rounded-lg p-2 ${
            theme === 'dark' ? 'bg-white/5' : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className={`mb-1 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
            }`}>Urgency</div>
            <div className={`font-medium capitalize ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>{moment.marcusState?.urgency || 'unknown'}</div>
          </div>
        </div>
        
        {/* Loading State - While generating coaching */}
        {isLoading && !coachingBrief && (
          <div className={`mb-6 bg-gradient-to-br border-2 rounded-lg p-8 ${
            theme === 'dark'
              ? 'from-blue-500/10 to-cyan-500/10 border-blue-500/30'
              : 'from-blue-50 to-cyan-50 border-blue-300'
          }`}>
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Generating coaching insights...
              </div>
            </div>
          </div>
        )}
        
        {/* Card-Based Coaching Display */}
        {!isPracticeModeActive && coachingBrief && (() => {
          const isWin = ['strong_move', 'best_moment'].includes(moment.classification);
          const isNuanced = ['partial_turning_point', 'strong_attempt', 'mixed_signal'].includes(moment.classification);
          const text = isWin || isNuanced ? coachingBrief.whyItWorked : coachingBrief.whyItDidntWork;
          
          if (!text) return null;
          
          const sections = parseCoachingSections(text);
          const cardStructure = getCardStructure(moment.classification, isWin);
          const totalCards = cardStructure.length;
          
          // Card colors based on moment type
          const cardColors = isWin 
            ? { bg: theme === 'dark' ? 'from-green-500/10 to-emerald-500/10' : 'from-green-50 to-emerald-50', border: theme === 'dark' ? 'border-green-500/30' : 'border-green-300', text: theme === 'dark' ? 'text-green-400' : 'text-green-700', icon: '✓', iconBg: 'bg-green-500' }
            : isNuanced
            ? { bg: theme === 'dark' ? 'from-yellow-500/10 to-amber-500/10' : 'from-yellow-50 to-amber-50', border: theme === 'dark' ? 'border-yellow-500/30' : 'border-yellow-300', text: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700', icon: '≈', iconBg: 'bg-yellow-500' }
            : { bg: theme === 'dark' ? 'from-orange-500/10 to-red-500/10' : 'from-orange-50 to-red-50', border: theme === 'dark' ? 'border-orange-500/30' : 'border-orange-300', text: theme === 'dark' ? 'text-orange-400' : 'text-orange-700', icon: '!', iconBg: 'bg-orange-500' };
          
          return (
            <div className={`mb-6 bg-gradient-to-br border-2 rounded-lg overflow-hidden ${cardColors.bg} ${cardColors.border}`}>
              {/* Card Header */}
              <div className="p-4 border-b" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(229,231,235,1)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded ${cardColors.iconBg} flex items-center justify-center text-white text-xs font-bold`}>{cardColors.icon}</div>
                    <h3 className={`font-bold text-sm uppercase tracking-wide ${cardColors.text}`}>
                      {isWin ? 'Why This Worked' : isNuanced ? 'Nuanced Moment' : 'Coaching Breakdown'}
                    </h3>
                  </div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {currentCard + 1} / {totalCards}
                  </div>
                </div>
              </div>
              
              {/* Card Content */}
              <div className={`p-5 text-sm leading-relaxed prose prose-sm max-w-none ${
                theme === 'dark' ? 'prose-invert text-white' : 'text-gray-800'
              }`}>
                {renderCard(cardStructure[currentCard], sections, moment.classification)}
              </div>
              
              {/* Card Navigation */}
              <div className="p-4 border-t" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(229,231,235,1)' }}>
                <div className="flex items-center justify-between">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentCard(Math.max(0, currentCard - 1))}
                    disabled={currentCard === 0}
                    className={`p-2 rounded-lg transition-colors ${
                      currentCard === 0
                        ? theme === 'dark' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                        : theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  {/* Dot Indicators */}
                  <div className="flex items-center gap-2">
                    {cardStructure.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentCard(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentCard
                            ? `${cardColors.iconBg} w-6`
                            : theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentCard(Math.min(totalCards - 1, currentCard + 1))}
                    disabled={currentCard === totalCards - 1}
                    className={`p-2 rounded-lg transition-colors ${
                      currentCard === totalCards - 1
                        ? theme === 'dark' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                        : theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      
      {/* Practice Button - Only for losses (mobile: in scroll area, desktop: separate section) */}
      {!['strong_move', 'best_moment', 'turning_point'].includes(moment.classification) && !isPracticeModeActive && coachingBrief && (
        <div className="md:px-6 md:pb-6">
          <button
            onClick={() => {
              setIsPracticeModeActive(true);
              if (coachingBrief) {
                const hint = extractStructuralHint(coachingBrief);
                setStructuralHint(hint);
              }
            }}
            className={`w-full py-2.5 md:py-3 border rounded-lg text-sm md:text-base font-medium transition-all flex items-center justify-center gap-2 active:scale-98 ${
              theme === 'dark'
                ? 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-400'
                : 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700'
            }`}
          >
            <MessageSquare size={18} />
            Practice This Moment
          </button>
        </div>
      )}
      
      {/* Retry Flow - Only for losses and when practice mode is active */}
      {!['strong_move', 'best_moment', 'turning_point'].includes(moment.classification) && isPracticeModeActive && (
        <div className={`border-t ${
          theme === 'dark' ? 'border-white/10 bg-[#0f1419]' : 'border-gray-200 bg-gray-50'
        }`}>
          {retryState === 'initial' && (
            <div className="p-6">
              
              <div className="mb-4">
                <label className={`text-xs font-medium mb-2 block ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Speak your alternative response
                </label>
                
                {/* Voice Recording Button */}
                {!isRecording && !isTranscribing && !retryInput && (
                  <button
                    onClick={startVoiceRecording}
                    className={`w-full py-4 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50'
                        : 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400'
                    }`}
                  >
                    <Mic size={32} className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
                    <span className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`}>Click to Record Your Response</span>
                  </button>
                )}
                
                {/* Recording in Progress */}
                {isRecording && (
                  <button
                    onClick={stopVoiceRecording}
                    className={`w-full py-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'border-red-500 bg-red-500/10 hover:bg-red-500/20'
                        : 'border-red-500 bg-red-50 hover:bg-red-100'
                    }`}
                  >
                    <MicOff size={32} className="text-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-red-500">Recording... Click to Stop</span>
                  </button>
                )}
                
                {/* Transcribing */}
                {isTranscribing && (
                  <div className={`w-full py-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-blue-300 bg-blue-50'
                  }`}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`}>Transcribing...</span>
                  </div>
                )}
                
                {/* Transcribed Text Preview */}
                {retryInput && !isTranscribing && (
                  <div className="space-y-2">
                    <div className={`rounded-lg p-3 text-sm border ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white'
                        : 'bg-gray-50 border-gray-300 text-gray-800'
                    }`}>
                      {retryInput}
                    </div>
                    <button
                      onClick={() => {
                        setRetryInput('');
                        startVoiceRecording();
                      }}
                      className={`text-xs ${
                        theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                      }`}
                    >
                      Re-record
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleRetrySubmit}
                disabled={!retryInput.trim() || isTranscribing}
                className={`w-full py-3 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'
                }`}
              >
                Submit Response
              </button>
            </div>
          )}
          
          {retryState === 'submitting' && (
            <div className="p-6 text-center">
              <div className={`text-sm ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}>Evaluating your response...</div>
            </div>
          )}
          
          {retryState === 'result' && retryResult && (
            <div className="p-6">
              <div className="mb-4">
                <div className={
                  `inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${
                    retryResult.label === 'strong_improvement' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    retryResult.label === 'better' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    retryResult.label === 'partial' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`
                }>
                  {retryResult.label === 'strong_improvement' && 'Strong Improvement'}
                  {retryResult.label === 'better' && 'Better'}
                  {retryResult.label === 'partial' && 'Partially Improved'}
                  {retryResult.label === 'still_missed' && 'Still Missed'}
                </div>
              </div>
              
              <div className={`text-sm mb-4 leading-relaxed ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {renderInteractiveExplanation(retryResult.explanation)}
              </div>
              
              <div className={`rounded-lg p-3 mb-4 border-l-2 border-blue-500 ${
                theme === 'dark' ? 'bg-white/5' : 'bg-blue-50'
              }`}>
                <div className={`text-xs font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>Marcus's reaction:</div>
                <div className={`text-sm italic ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>"{retryResult.marcusReaction}"</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  {/* Try Again button - always available */}
                  <button
                    onClick={handleTryAgain}
                    className={`flex-1 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700'
                    }`}
                  >
                    Try Again
                  </button>
                  {/* Hint or Continue button */}
                  {retryResult.label === 'better' || retryResult.label === 'strong_improvement' ? (
                    <button
                      onClick={() => {
                        setIsPracticeModeActive(false);
                        // Navigate to next moment if available
                        if (allMoments && currentIndex !== undefined && currentIndex < allMoments.length - 1 && onNavigate) {
                          onNavigate(currentIndex + 1);
                        }
                      }}
                      className={`flex-1 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-400'
                          : 'bg-green-50 hover:bg-green-100 border-green-300 text-green-700'
                      }`}
                    >
                      ✓ Continue
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        // Extract hint if not already available
                        if (!structuralHint && coachingBrief) {
                          const hint = extractStructuralHint(coachingBrief);
                          setStructuralHint(hint);
                          console.log('🔧 Extracted hint on-demand:', hint);
                        }
                        setShowHintResponse(!showHintResponse);
                      }}
                      className={`flex-1 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-400'
                          : 'bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-700'
                      }`}
                    >
                      {showHintResponse ? '👁️ Hide Hint' : '💡 Get Hint'}
                    </button>
                  )}
                </div>
                
                {/* Exit Practice button - only show if not succeeded */}
                {retryResult.label !== 'better' && retryResult.label !== 'strong_improvement' && (
                  <button
                    onClick={() => setShowGiveUpWarning(true)}
                    className={`w-full py-2 border rounded-lg text-xs font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700'
                    }`}
                  >
                    Exit Practice
                  </button>
                )}
              </div>
              
              {/* Show Hint Response Below Marcus's Reaction */}
              {showHintResponse && (
                <div className={`mt-4 p-4 rounded-lg border-l-4 ${
                  theme === 'dark'
                    ? 'bg-orange-500/10 border-orange-500 text-orange-200'
                    : 'bg-orange-50 border-orange-400 text-orange-800'
                }`}>
                  <div className={`text-xs font-bold mb-2 uppercase tracking-wide ${
                    theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                  }`}>💡 Potential Response:</div>
                  {structuralHint ? (
                    <div className={`text-sm italic ${
                      theme === 'dark' ? 'text-orange-100' : 'text-orange-900'
                    }`}>"{structuralHint.level3}"</div>
                  ) : (
                    <div className={`text-sm ${
                      theme === 'dark' ? 'text-orange-200' : 'text-orange-800'
                    }`}>
                      Based on what Marcus said ("{moment?.marcusResponse?.substring(0, 60)}..."), try addressing his specific concern directly and concisely.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Exit Practice Modal */}
      {showGiveUpWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-xl p-6 shadow-2xl ${
            theme === 'dark' ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
              }`}>
                <X size={18} />
              </div>
              <h3 className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Exit Practice?</h3>
            </div>
            
            <p className={`text-sm mb-6 leading-relaxed ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              You can return to practice this moment anytime. Your progress will reset when you come back.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowGiveUpWarning(false)}
                className={`flex-1 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowGiveUpWarning(false);
                  setIsPracticeModeActive(false);
                  setRetryState('initial');
                  setRetryInput('');
                  setRetryResult(null);
                }}
                className={`flex-1 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                Exit Practice
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default MomentCoachingPanel;

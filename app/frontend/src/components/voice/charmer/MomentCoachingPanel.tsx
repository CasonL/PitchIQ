/**
 * MomentCoachingPanel.tsx
 * Interactive coaching panel for deep-diving on a specific moment
 */

import React, { useState, useEffect, useRef } from 'react';
import { KeyMoment, MomentClassification } from './MomentExtractor';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Mic, MicOff, Info } from 'lucide-react';

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
  const [expandedTooltip, setExpandedTooltip] = useState<string | null>(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  useEffect(() => {
    if (moment) {
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

Structure your response like this:

### What You Did Well
The strategic choice (what you attempted to address and why it was the right move)

### What Limited the Moment
Execution quality issues (rough phrasing, incomplete thoughts, missed strategic threads)
Be specific: quote actual awkward phrases if present

### Why It Partially Landed (use "Why It Fully Landed" ONLY if execution was clean)
For partial wins (rough execution):
- Marcus's state made him receptive to this move type
- Which parts of your response worked
- Which parts reduced clarity or impact

For full wins (clean execution):
- Why the move matched Marcus's immediate need
- How your execution amplified the strategic choice

### How to Execute This Move Better
Provide 1-2 concrete examples showing cleaner execution of the same strategic move
Use blockquotes for verbatim examples

> "Example of cleaner execution"

### The Key Mechanic
The underlying principle that makes this move type effective when executed well.
Avoid overstating outcomes: use "builds credibility" or "maintains engagement" instead of "builds trust".

Example output for partial win:
{
  "whyItWorked": "You made the right strategic choice by answering Marcus's direct question instead of dodging it.\\n\\n### What You Did Well\\nYou attempted to explain your offer directly when Marcus asked 'What exactly are you offering?' This was important because he needed clarity before deciding whether to keep listening.\\n\\n### What Limited the Moment\\nYour explanation introduced the right concept, but the phrasing was rough and unfinished. The line 'Where you can generate a persona exactly like your IT customer persona in your business' is clunky and awkward. You also trailed off mid-thought: 'afterwards, they get,' - this incomplete delivery reduced the clarity of your answer.\\n\\n### Why It Partially Landed\\n- Marcus had enough curiosity to hear a concrete explanation\\n- The simulated-prospect idea is relevant and differentiated\\n- But the rough phrasing prevented it from landing as cleanly as it could have\\n\\n### How to Execute This Move Better\\n\\n> \\"We let your reps practice against AI prospects modeled after your real buyers, so they can sharpen conversations before talking to actual customers.\\"\\n\\n> \\"Sales training that feels like real calls. Your team practices on AI prospects that match your buyer personas.\\"\\n\\n### The Key Mechanic\\nWhen a buyer asks for clarity, answering directly with a concrete, complete explanation demonstrates responsiveness and builds credibility. Execution matters - rough phrasing reduces impact even when the strategic choice is correct."
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

Structure your response like this:

### The Core Issue
Brief explanation of the mechanical mismatch (what Marcus needed vs what you gave).

CRITICAL DISTINCTION:
- Did the user aim at the WRONG thing entirely? (e.g., asked discovery when Marcus wanted clarity)
- Or did they aim at the RIGHT thing but execute POORLY? (e.g., tried to explain differentiation but explanation was tangled)

Be precise about which one. Don't say "you failed to address" if they actually tried to address it - say "you aimed at the right answer but your explanation was too fragmented/abstract to land."

If the user's response had TACTICAL problems (weak language, rambling, incomplete thoughts), CALL THESE OUT SPECIFICALLY with quotes from their actual words.

WORDING PRECISION: Instead of vague "increased resistance", use precise language like:
- "made the call feel less clear and less controlled"
- "reduced clarity"
- "lowered confidence"
- "made Marcus less willing to engage"
Only say "increased resistance" if you have clear state evidence that resistance actually rose.

### What Would Work Here

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

> "Example response 1 that would work"

> "Example response 2 that would work"

### The Key Mechanic
- The underlying principle that makes the working approach effective
- How it addresses Marcus's actual need at this point in the call

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

Example output for opening clarity:
{
  "whyItDidntWork": "Marcus asked a blunt question because he wanted a fast reason to keep listening. Your answer was hesitant and tried to do too much at once.\n\n### The Core Issue\nMarcus needed clarity about why you called, but you mixed discovery and pitching without answering his question. The phrases 'could you maybe' and 'a little bit' conveyed hesitation, which made the call feel less clear and less controlled.\n\n### What Would Work Here\n- **Answer his question first**: give a clear reason for the call in one sentence\n- **Keep it concrete**: describe the category in practical terms, not vague value language\n- **Ask one simple question**: once Marcus understands why you called\n\n> \"Quick reason for the call: we help sales teams practice real buyer conversations instead of just sitting through training. How are you currently training reps?\"\n\n> \"I'll keep it brief. We offer hands-on sales training that's different from traditional methods. How do you currently support your sales team?\"\n\n### The Key Mechanic\nWhen a buyer asks 'What do you want?', they're testing for clarity and relevance. Answering directly with concrete differentiation shows you respect their time and understand the category."
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
Evaluate this retry and return ONLY valid JSON with this structure:
{
  "label": "better" | "strong_improvement" | "partial" | "still_missed",
  "explanation": "One specific sentence about what improved or what's missing - MUST reference Marcus's actual words or business context",
  "marcusReaction": "A short (1-2 sentence) simulated response Marcus would give to this retry"
}

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

**RULES FOR EXPLANATION:**
1. Reference what Marcus actually said (use quotes)
2. Include his business context (role, company type) when relevant
3. Be concrete about what's missing or what worked
4. Diagnose the ACTUAL problem (verbosity vs relevance vs timing vs tone)
5. Avoid vague terms like "state", "needs", "connection" without specifics

EVALUATION CRITERIA - OUTCOME-BASED, NOT CHECKLIST-BASED:
**Judge by whether this would realistically work, not by whether it matches a formula.**

PRIMARY QUESTION: Given Marcus's state (trust/curiosity/urgency) and difficulty level, would this response realistically move the conversation forward in a positive way?

ACCEPT AS "BETTER" IF ANY OF THESE ARE TRUE:
1. **It addresses Marcus's core concern** in any reasonable way (even if approach differs from coaching)
2. **It shows situational awareness** - user understands what Marcus needs right now
3. **It's a valid sales technique** that would work with someone at this state (even if not the "textbook" answer)
4. **Marcus would likely respond positively or neutrally** instead of pushing back harder

REJECT AS "STILL_MISSED" ONLY IF:
- Ignores Marcus's stated position entirely
- Pushes harder when Marcus has clearly disengaged
- Uses a technique completely inappropriate for his state (e.g., aggressive pitch to low-trust prospect)

**The coaching examples show ONE path, not THE ONLY path. Don't penalize creative solutions that would work.**

Examples of ACCEPTING different approaches:
- Coaching: "Acknowledge, then offer to send info"
- User: "Got it, let's connect in a few months when timing's better" → ACCEPT (graceful exit works too)
- User: "What specifically makes this bad timing?" → ACCEPT (diagnostic question can work)
- User: "Fair enough, I appreciate your honesty" → ACCEPT (respectful close is valid)

DETERMINISTIC DECISION FRAMEWORK (to reduce evaluation randomness):

**STEP 1: Would Marcus respond positively to this in real life?**
- YES → Likely "better" or "strong_improvement"
- NEUTRAL (doesn't hurt, doesn't help) → "partial"
- NO (makes things worse) → "still_missed"

**STEP 2: Check difficulty-specific outcomes:**

**EASY DIFFICULTY** (Winnable prospect):
- Better/Strong: Marcus shows openness (agrees to send info, asks clarifying question, shows interest)
- Partial: Marcus acknowledges but doesn't commit
- Missed: Marcus declines, passes, or shows more resistance
→ If Marcus declines = user FAILED (should've been salvageable)

**MEDIUM DIFFICULTY** (Requires skill):
- Better/Strong: Marcus moves forward (agrees to next step, provides useful info, lowers guard)
- Partial: Marcus stays engaged but neutral
- Missed: Marcus holds position or declines
→ Polite decline = likely user FAILED (needed stronger technique)

**HARD DIFFICULTY** (Dead-end by design):
- Better/Strong: User recognizes dead-end and exits gracefully OR gets clarity on why it's not a fit
- Partial: User softens but still tries to push
- Missed: User ignores signals and pushes harder
→ Graceful exit = user SUCCEEDED (recognized unwinnable)

**STEP 3: Generate Marcus's reaction that MATCHES the label:**
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

  const extractStructuralHint = (brief: CoachingBrief): StructuralHint | null => {
    if (!brief.whyItDidntWork) return null;

    console.log('🔍 Extracting 3-level hints from coaching brief');
    console.log('📄 Full coaching brief:', brief.whyItDidntWork);
    
    // Extract blockquote examples (suggested responses) - try multiple quote patterns
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
    
    console.log('💬 Extracted suggestions:', suggestions);
    
    // Extract bold actions from "What Would Work Here" section
    const whatWorksMatch = brief.whyItDidntWork.match(/### What Would Work Here([\s\S]*?)(?=###|$)/i);
    const boldActions = whatWorksMatch ? 
      [...whatWorksMatch[1].matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1].trim()).filter(a => !a.includes(':')) : [];
    
    console.log('🎯 Extracted bold actions:', boldActions);
    
    // Level 1: Extract high-level structure from bold actions or bullet points
    let level1Parts: string[] = [];
    if (boldActions.length >= 2) {
      level1Parts = boldActions.slice(0, 2);
    } else {
      // Fallback: extract from bullet points
      const bulletMatches = [...brief.whyItDidntWork.matchAll(/- \*\*([^*:]+)\*\*/g)];
      level1Parts = bulletMatches.slice(0, 2).map(m => m[1].trim());
    }
    const level1 = level1Parts.length >= 2 ? level1Parts.join(', ') : 'Address his concern, Provide value';
    
    // Level 2: Create template from first suggestion if available
    let level2 = '';
    if (suggestions.length > 0) {
      const suggestion = suggestions[0];
      // Take first ~half of the suggestion as a template hint
      const words = suggestion.split(' ');
      const midpoint = Math.ceil(words.length / 2);
      level2 = words.slice(0, midpoint).join(' ') + '...';
    } else {
      level2 = 'Start with acknowledgment, then offer next step';
    }
    
    // Level 3: Full suggested response (first blockquote)
    const level3 = suggestions.length > 0 ? suggestions[0] : 
      'Address his concern directly, then provide a clear path forward that matches his current state.';
    
    console.log('✅ Generated hints:', { level1, level2, level3: level3.substring(0, 60) });
    
    return { level1, level2, level3 };
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
    // Detect compound phrases first (more specific matches)
    const compoundPatterns = [
      { pattern: /\b(state of urgency|urgency state)\b/gi, type: 'urgency' },
      { pattern: /\b(state of trust|trust state)\b/gi, type: 'trust' },
      { pattern: /\b(state of curiosity|curiosity state)\b/gi, type: 'curiosity' },
      { pattern: /\b(current state|Marcus'?s? state)\b/gi, type: 'state' },
      { pattern: /\b(current needs|Marcus'?s? needs|his needs)\b/gi, type: 'needs' }
    ];
    
    // Check for compound phrases
    for (const { pattern, type } of compoundPatterns) {
      if (pattern.test(explanation)) {
        // Split on the compound phrase
        const parts = explanation.split(pattern);
        return parts.map((part, index) => {
          if (index % 2 === 1) {
            // This is the matched phrase
            return renderTooltipButton(part, type, index);
          }
          return <span key={index}>{part}</span>;
        });
      }
    }
    
    // Fallback to simple word matching
    const parts = explanation.split(/\b(state|needs|urgency|trust|curiosity)\b/gi);
    
    return parts.map((part, index) => {
      const lowerPart = part.toLowerCase();
      
      if (lowerPart === 'urgency') {
        return renderTooltipButton(part, 'urgency', index);
      }
      
      if (lowerPart === 'trust') {
        return renderTooltipButton(part, 'trust', index);
      }
      
      if (lowerPart === 'curiosity') {
        return renderTooltipButton(part, 'curiosity', index);
      }
      
      if (lowerPart === 'state') {
        return renderTooltipButton(part, 'state', index);
      }
      
      if (lowerPart === 'needs') {
        return renderTooltipButton(part, 'needs', index);
      }
      
      return <span key={index}>{part}</span>;
    });
  };
  
  const renderTooltipButton = (text: string, type: string, index: number) => {
    const tooltipKey = `${type}-${index}`;
    const isExpanded = expandedTooltip === tooltipKey;
    
    if (type === 'urgency' || type === 'trust' || type === 'curiosity') {
      // Single metric tooltip
      const metricValue = moment?.marcusState?.[type as 'trust' | 'curiosity' | 'urgency'];
      
      return (
        <span key={index} className="inline-flex items-center">
          <button
            onClick={() => setExpandedTooltip(isExpanded ? null : tooltipKey)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
            }`}
          >
            {text}
            <Info size={12} />
          </button>
          {isExpanded && metricValue && (
            <span className={`inline-flex items-center gap-1 ml-2 px-2 py-1 rounded text-xs font-medium ${
              theme === 'dark'
                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {type.charAt(0).toUpperCase() + type.slice(1)}: <strong>{metricValue}</strong>
            </span>
          )}
        </span>
      );
    }
    
    if (type === 'state') {
      return (
        <span key={index} className="inline-flex items-center">
          <button
            onClick={() => setExpandedTooltip(isExpanded ? null : tooltipKey)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
            }`}
          >
            {text}
            <Info size={12} />
          </button>
          {isExpanded && moment?.marcusState && (
            <span className={`inline-flex items-center gap-2 ml-2 px-2 py-1 rounded text-xs ${
              theme === 'dark'
                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              Trust: <strong>{moment.marcusState.trust}</strong>
              <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
              Curiosity: <strong>{moment.marcusState.curiosity}</strong>
              <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
              Urgency: <strong>{moment.marcusState.urgency}</strong>
            </span>
          )}
        </span>
      );
    }
    
    if (type === 'needs') {
      // Infer needs from moment context
      const inferredNeeds = inferMarcusNeeds();
      
      return (
        <span key={index} className="inline-flex items-center">
          <button
            onClick={() => setExpandedTooltip(isExpanded ? null : tooltipKey)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300'
            }`}
          >
            {text}
            <Info size={12} />
          </button>
          {isExpanded && (
            <span className={`inline-flex items-center gap-1 ml-2 px-2 py-1 rounded text-xs ${
              theme === 'dark'
                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
                : 'bg-purple-50 border border-purple-200 text-purple-700'
            }`}>
              {inferredNeeds}
            </span>
          )}
        </span>
      );
    }
    
    return <span key={index}>{text}</span>;
  };
  
  const inferMarcusNeeds = (): string => {
    if (!moment) return 'Unknown';
    
    const state = moment.marcusState;
    const marcusText = moment.marcusResponse?.toLowerCase() || '';
    const userText = moment.userMessage?.toLowerCase() || '';
    
    // Extract Marcus's actual business context from scenario or moment
    const businessContext = scenario?.persona?.company || scenario?.persona?.role || '';
    const marcusRole = scenario?.persona?.role || 'decision maker';
    
    // Build context-specific needs based on what Marcus actually said
    const needs: string[] = [];
    
    // 1. Direct quote analysis - what did Marcus actually express?
    if (marcusText.includes('not sure') || marcusText.includes('maybe') || marcusText.includes("don't know")) {
      needs.push(`Why this matters specifically for ${businessContext || 'his business'}`);
    }
    
    if (marcusText.includes('busy') || marcusText.includes('time') || marcusText.includes('got to go')) {
      needs.push('Quick, concrete value - not explanations');
    }
    
    if (marcusText.includes('send') || marcusText.includes('email') || marcusText.includes('later')) {
      needs.push('Reason to engage now vs. just receiving info');
    }
    
    // 2. State-based needs with Marcus context
    if (state?.trust === 'low') {
      needs.push(`Proof that you've helped companies like ${businessContext || 'his'}`);
    }
    
    if (state?.curiosity === 'low') {
      needs.push(`Relevance to his role as ${marcusRole}`);
    }
    
    if (state?.urgency === 'low' && !marcusText.includes('not interested')) {
      needs.push('Urgency - what happens if he waits?');
    }
    
    // 3. Question type analysis - what is Marcus asking for?
    if (marcusText.includes('what') && marcusText.includes('do')) {
      needs.push('Specific examples of outcomes, not processes');
    }
    
    if (marcusText.includes('how') && (marcusText.includes('work') || marcusText.includes('help'))) {
      needs.push('Concrete steps or proof points, not theories');
    }
    
    if (marcusText.includes('why') || marcusText.includes('what for')) {
      needs.push('Clear ROI or business impact');
    }
    
    // 4. Objection signals
    if (marcusText.includes('already have') || marcusText.includes('not need')) {
      needs.push('Differentiation - what you offer that others don\'t');
    }
    
    // Return top 2-3 most specific needs
    if (needs.length > 0) {
      return needs.slice(0, 3).join('; ');
    }
    
    // Fallback with context
    return `Understanding of ${businessContext || 'his specific situation'}`;
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
        
        {/* Coaching Brief Display - Hidden/collapsed during practice mode */}
        {!isPracticeModeActive && (
          <>
          {/* Win Analysis - Only for strong_move, best_moment, turning_point */}
          {coachingBrief && coachingBrief.whyItWorked && ['strong_move', 'best_moment'].includes(moment.classification) && (
            <div className={`mb-6 bg-gradient-to-br border-2 rounded-lg p-5 ${
              theme === 'dark'
                ? 'from-green-500/10 to-emerald-500/10 border-green-500/30'
                : 'from-green-50 to-emerald-50 border-green-300'
            }`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 md:w-6 md:h-6 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
              <h3 className={`font-bold text-sm md:text-base uppercase tracking-wide ${
                theme === 'dark' ? 'text-green-400' : 'text-green-700'
              }`}>Why This Worked</h3>
            </div>
            <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${
              theme === 'dark' ? 'prose-invert text-white' : 'text-gray-800'
            }`}>
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-6 mb-3 first:mt-0 ${
                    theme === 'dark' ? 'text-green-300' : 'text-green-700'
                  }`} {...props} />,
                  p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                  li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className={`mt-0.5 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`}>•</span><span className="flex-1">{props.children}</span></li>,
                  strong: ({node, ...props}) => <strong className={`font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`} {...props} />,
                }}
              >{coachingBrief.whyItWorked}</ReactMarkdown>
            </div>
          </div>
        )}
        
        {/* Nuanced Moments - Yellow/Amber for partial wins (YELLOW) */}
        {coachingBrief && coachingBrief.whyItWorked && ['partial_turning_point', 'strong_attempt', 'mixed_signal'].includes(moment.classification) && (() => {
          const sections = parseCoachingSections(coachingBrief.whyItWorked);
          
          return (
            <div className={`mb-6 bg-gradient-to-br border-2 rounded-lg p-5 ${
              theme === 'dark'
                ? 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30'
                : 'from-yellow-50 to-amber-50 border-yellow-300'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">≈</div>
                <h3 className={`font-bold text-base uppercase tracking-wide ${
                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                }`}>Nuanced Moment</h3>
              </div>
              <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${
                theme === 'dark' ? 'prose-invert text-white' : 'text-gray-800'
              }`}>
                {sections.header && (
                  <div className="mb-4">
                    <ReactMarkdown>{sections.header}</ReactMarkdown>
                  </div>
                )}
                {sections.whatYouDidWell && (
                  <div className="mb-4">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 first:mt-0 ${
                          theme === 'dark' ? 'text-green-300' : 'text-green-700'
                        }`} {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                      }}
                    >{sections.whatYouDidWell}</ReactMarkdown>
                  </div>
                )}
                {sections.whatLimited && (
                  <div className="mb-4">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${
                          theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                        }`} {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                      }}
                    >{sections.whatLimited}</ReactMarkdown>
                  </div>
                )}
                {sections.whyItLanded && (
                  <div className="mb-4">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${
                          theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                        }`} {...props} />,
                        ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                        li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className={`mt-0.5 ${
                          theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                        }`}>•</span><span className="flex-1">{props.children}</span></li>,
                        strong: ({node, ...props}) => <strong className={`font-bold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`} {...props} />,
                      }}
                    >{sections.whyItLanded}</ReactMarkdown>
                  </div>
                )}
                {sections.howToExecute && (
                  <div className="mb-4">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${
                          theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                        }`} {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className={`border-l-2 pl-3 my-2 italic ${
                          theme === 'dark' ? 'border-yellow-500 text-yellow-200' : 'border-yellow-400 text-yellow-800'
                        }`} {...props} />,
                      }}
                    >{sections.howToExecute}</ReactMarkdown>
                  </div>
                )}
                {sections.keyMechanic && (
                  <div>
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${
                          theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                        }`} {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                      }}
                    >{sections.keyMechanic}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        
        {/* Why This Worked - For turning points (BLUE) */}
        {coachingBrief && coachingBrief.whyItWorked && moment.classification === 'turning_point' && (() => {
          const sections = parseCoachingSections(coachingBrief.whyItWorked);
          
          return (
            <div className={`mb-6 bg-gradient-to-br border-2 rounded-lg p-5 ${
              theme === 'dark'
                ? 'from-blue-500/10 to-cyan-500/10 border-blue-500/30'
                : 'from-blue-50 to-cyan-50 border-blue-300'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">↻</div>
                <h3 className={`font-bold text-base uppercase tracking-wide ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                }`}>Coaching Breakdown</h3>
              </div>
              <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${
                theme === 'dark' ? 'prose-invert text-white' : 'text-gray-800'
              }`}>
                {sections.header && (
                  <div className="mb-4">
                    <ReactMarkdown>{sections.header}</ReactMarkdown>
                  </div>
                )}
                {sections.whatYouDidWell && (
                  <div className="mb-4">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 first:mt-0 ${
                          theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                        }`} {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                      }}
                    >{sections.whatYouDidWell}</ReactMarkdown>
                  </div>
                )}
                {sections.whatLimited && (
                  <div className="mb-4">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${
                          theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                        }`} {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                      }}
                    >{sections.whatLimited}</ReactMarkdown>
                  </div>
                )}
                {sections.whyItLanded && (
                  <div className="mb-4">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${
                          theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                        }`} {...props} />,
                        ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                        li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className={`mt-0.5 ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`}>•</span><span className="flex-1">{props.children}</span></li>,
                        strong: ({node, ...props}) => <strong className={`font-bold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`} {...props} />,
                      }}
                    >{sections.whyItLanded}</ReactMarkdown>
                  </div>
                )}
                {sections.howToExecute && (
                  <div className="mb-4">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${
                          theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                        }`} {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className={`border-l-2 pl-3 my-2 italic ${
                          theme === 'dark' ? 'border-blue-500 text-blue-200' : 'border-blue-400 text-blue-800'
                        }`} {...props} />,
                      }}
                    >{sections.howToExecute}</ReactMarkdown>
                  </div>
                )}
                {sections.keyMechanic && (
                  <div>
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${
                          theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                        }`} {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                      }}
                    >{sections.keyMechanic}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        
        {/* Why This Didn't Work - Always show all sections */}
        {coachingBrief && coachingBrief.whyItDidntWork && (() => {
          const sections = parseCoachingSections(coachingBrief.whyItDidntWork);
          // Show all sections immediately - no progressive unlock
          const showHeader = true;
          const showCoreIssue = true;
          const showWhatWorks = true;
          const showKeyMechanic = true;
          
          return (
            <div className={`mb-6 bg-gradient-to-br border-2 rounded-lg p-5 ${
              theme === 'dark'
                ? 'from-orange-500/10 to-red-500/10 border-orange-500/30'
                : 'from-orange-50 to-red-50 border-orange-300'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white text-xs font-bold">!</div>
                <h3 className={`font-bold text-base uppercase tracking-wide ${
                  theme === 'dark' ? 'text-orange-400' : 'text-orange-700'
                }`}>Coaching Breakdown</h3>
              </div>
              <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${
                theme === 'dark' ? 'prose-invert text-white' : 'text-gray-800'
              }`}>
                {showHeader && sections.header && (
                  <div className="mb-4">
                    <ReactMarkdown>{sections.header}</ReactMarkdown>
                  </div>
                )}
                {showCoreIssue && sections.coreIssue && (
                  <div className="mb-4">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 first:mt-0 ${
                          theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                        }`} {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                      }}
                    >{sections.coreIssue}</ReactMarkdown>
                  </div>
                )}
                {showWhatWorks && sections.whatWorks && (
                  <div className="mb-4">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${
                          theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                        }`} {...props} />,
                        ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                        li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className={`mt-0.5 ${
                          theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                        }`}>•</span><span className="flex-1">{props.children}</span></li>,
                        strong: ({node, ...props}) => <strong className={`font-bold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`} {...props} />,
                      }}
                    >{sections.whatWorks}</ReactMarkdown>
                  </div>
                )}
                {showKeyMechanic && sections.keyMechanic && (
                  <div>
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-4 mb-2 ${
                          theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                        }`} {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                      }}
                    >{sections.keyMechanic}</ReactMarkdown>
                  </div>
                )}
                {isPracticeModeActive && (
                  <div className={`mt-4 pt-4 border-t text-xs ${
                    theme === 'dark' ? 'border-blue-500/20 text-gray-400' : 'border-blue-300 text-gray-600'
                  }`}>
                    {retryAttempts === 1 && 'Showing broader structure'}
                    {retryAttempts === 2 && 'Showing specific template'}
                    {retryAttempts === 3 && 'Showing detailed example'}
                    {retryAttempts >= 4 && 'Showing full coaching details'}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        </>
        )}
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
                      onClick={() => setIsPracticeModeActive(false)}
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

/**
 * MomentCoachingPanel.tsx
 * Interactive coaching panel for deep-diving on a specific moment
 */

import React, { useState, useEffect, useRef } from 'react';
import { KeyMoment, MomentClassification } from './MomentExtractor';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Mic, MicOff } from 'lucide-react';

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
  header?: string;      // First sentence/paragraph before sections
  coreIssue?: string;   // ### The Core Issue section
  whatWorks?: string;   // ### What Would Work Here section
  keyMechanic?: string; // ### The Key Mechanic section
}

const getClassificationLabel = (classification: MomentClassification): string => {
  switch (classification) {
    case 'best_moment': return 'Best Moment';
    case 'strong_move': return 'Strong Move';
    case 'turning_point': return 'Turning Point';
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
    case 'missed_opportunity': return '#fbbf24'; // amber-400
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
      
      // Check cache first
      const cached = briefCacheRef.current.get(moment.id);
      if (cached) {
        console.log('📦 Using cached coaching brief for moment:', moment.id);
        setCoachingBrief(cached);
      } else {
        // Prevent duplicate generations for the same moment
        if (generatingForMomentRef.current !== moment.id) {
          setCoachingBrief(null);
          generateCoachingBrief(moment);
        }
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

STRATEGIC CORRECTION GUIDANCE:
- If Marcus asks "What do you want?" or "Why are you calling?" → he's asking for CLARITY, not inviting discovery
- Correct move: Answer his question FIRST (crisp reason for call), THEN transition to one question
- WRONG: deflect into discovery ("I want to understand your challenges")
- RIGHT: answer directly ("Quick reason for the call: [concrete value prop]. [One clean question]")
- Pattern: impatient buyer = needs clarity, not discovery invitation
- Don't recommend pivoting to discovery when the buyer is asking for relevance/clarity

${['strong_move', 'best_moment', 'turning_point'].includes(moment.classification) ? `This was a WIN. Explain what MECHANICALLY made this work:

TONE: Strategic coach who sees the board position. Use "you" naturally. Focus on the specific mechanics that made this land.

FORMAT RULES - CRITICAL FOR READABILITY:
- Start with 1 sentence on what you did right
- Use markdown headers (###) for each section
- Use bullet points (-) for breakdown items
- Add blank lines (\\n\\n) between sections
- Use **bold** for key concepts

Structure your response like this:

### What You Did
Brief explanation of the strategic move (what you addressed and how)

### Why It Landed
- Specific reason tied to Marcus's state
- Timing element (if relevant)
- Language/approach that worked

### The Key Mechanic
- The underlying principle that made this effective
- How it moved Marcus's state in the right direction

Example output:
{
  "whyItWorked": "You addressed Marcus's **skepticism** by making it concrete instead of abstract.\\n\\n### What You Did\\nYou shifted from talking about personalization as a feature to showing how it works in practice. Instead of defending the concept, you offered a relatable scenario he could visualize.\\n\\n### Why It Landed\\n- Marcus was at moderate trust/curiosity - ready to engage but needed substance\\n- The word \\\"actual\\\" signaled you're grounded, not pitching fluff\\n- You moved from generic to personalized, matching his need for clarity\\n\\n### The Key Mechanic\\nWhen a buyer expresses doubt at moderate trust, **concrete examples** build credibility faster than feature explanations. You gave him something he could mentally test, which moved his curiosity up and reduced resistance."
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
Brief explanation of the mechanical mismatch (what Marcus needed vs what you gave). If the user's response had TACTICAL problems (weak language, rambling, ignored his question), CALL THESE OUT SPECIFICALLY with examples from their actual words.

### What Would Work Here
- **First action**: [specific behavior] - why this works
- **Second action**: [specific behavior] - why this works
- If applicable, contrast what they said vs what they should have said ("You said X, which is weak. Instead say Y, which is direct.")
- CRITICAL: Include 2-3 verbatim examples in blockquotes that demonstrate these actions
- Examples MUST be SHORTER/CLEANER than what the user said
- Examples MUST sound CONVERSATIONAL and NATURAL, not formal or corporate
- Examples MUST be CONCRETE and SPECIFIC to this moment, not generic value statements
- AVOID generic value language: "improve performance", "boost results", "drive growth", "innovative solutions", "enhance effectiveness"
- AVOID outcome claims too early: "drives results", "guaranteed success" - these sound like pitches
- PREFER concrete activities: "practice real conversations" not "improve performance"
- PREFER category differentiation with contrast: "we do X instead of Y" (e.g., "practice real buyer conversations instead of just sitting through training")
- AVOID: "enhance", "discuss", "explore", "effectiveness", "I want to understand" - these are too polished/boardroom
- PREFER: short, direct language that sounds like real cold-call conversation
- If Marcus asked for clarity ("What do you want?"), examples should ANSWER his question, not deflect into discovery
- Structure: [Crisp reason for call] + [One transition question], NOT [Discovery question] alone

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

Example output for opening clarity:
{
  "whyItDidntWork": "Marcus asked a blunt question because he wanted a fast reason to keep listening. Your answer was hesitant and tried to do too much at once.\n\n### The Core Issue\nMarcus needed clarity about why you called, but you mixed discovery and pitching without answering his question. This made the call feel less controlled.\n\n### What Would Work Here\n- **Answer his question first**: give a clear reason for the call in one sentence\n- **Keep it concrete**: describe the category in practical terms, not vague value language\n- **Ask one simple question**: once Marcus understands why you called\n\n> \"Quick reason for the call: we help sales teams practice real buyer conversations instead of just sitting through training. How are you currently training reps?\"\n\n> \"I'll keep it brief. We're building a more practical alternative to traditional sales training. Worth a quick question?\"\n\n### The Key Mechanic\nWhen a buyer asks 'What do you want?', they're testing for clarity and relevance. Answering directly with concrete differentiation shows you respect their time and understand the category."
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
            { role: 'system', content: 'You are a sales coach. Output valid JSON with EXACTLY ONE field (either "whyItWorked" or "whyItDidntWork"). ALL markdown sections (### headers, bullet points, blockquotes) must be INSIDE that single string field value using \\n for line breaks. Do NOT create separate JSON fields for each section. The example shows the correct format.' },
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
      
      // With json_object mode, OpenAI should return valid JSON
      let brief;
      try {
        brief = JSON.parse(content);
        console.log('✅ Successfully parsed coaching brief');
      } catch (parseError) {
        console.error('❌ Failed to parse coaching brief:', parseError);
        console.log('Raw content:', content);
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
  "explanation": "One sentence explaining what improved or what's still missing",
  "marcusReaction": "A short (1-2 sentence) simulated response Marcus would give to this retry"
}

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
    
    // Extract The Core Issue
    const coreIssueMatch = text.match(/### The Core Issue([\s\S]*?)(?=###|$)/i);
    if (coreIssueMatch) {
      sections.coreIssue = '### The Core Issue' + coreIssueMatch[1];
    }
    
    // Extract What Would Work Here
    const whatWorksMatch = text.match(/### What Would Work Here([\s\S]*?)(?=###|$)/i);
    if (whatWorksMatch) {
      sections.whatWorks = '### What Would Work Here' + whatWorksMatch[1];
    }
    
    // Extract The Key Mechanic
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
      {/* Coaching Content - Scrollable */}
      <div className={`flex-1 overflow-y-auto p-4 md:p-6 border-b ${
        theme === 'dark' ? 'border-white/10' : 'border-gray-200'
      }`}>
        {/* Marcus's State */}
        <div className="flex gap-2 md:gap-3 text-xs mb-4 md:mb-6">
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
        
        {/* Coaching Brief Display - Blurred during entire practice mode */}
        <div className={`transition-all ${isPracticeModeActive ? 'blur-lg opacity-30 pointer-events-none' : ''}`}>
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
        
        {/* Why This Worked - For turning points (BLUE) */}
        {coachingBrief && coachingBrief.whyItWorked && moment.classification === 'turning_point' && (
          <div className={`mb-6 bg-gradient-to-br border-2 rounded-lg p-5 ${
            theme === 'dark'
              ? 'from-blue-500/10 to-cyan-500/10 border-blue-500/30'
              : 'from-blue-50 to-cyan-50 border-blue-300'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">↻</div>
              <h3 className={`font-bold text-base uppercase tracking-wide ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
              }`}>Why This Worked</h3>
            </div>
            <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${
              theme === 'dark' ? 'prose-invert text-white' : 'text-gray-800'
            }`}>
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className={`font-bold text-xs uppercase tracking-wide mt-6 mb-3 first:mt-0 ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  }`} {...props} />,
                  p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                  li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className={`mt-0.5 ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`}>•</span><span className="flex-1">{props.children}</span></li>,
                  strong: ({node, ...props}) => <strong className={`font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`} {...props} />,
                }}
              >{coachingBrief.whyItWorked}</ReactMarkdown>
            </div>
          </div>
        )}
        
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
      </div>
      </div>
      
      {/* Practice Button - Only for losses */}
      {!['strong_move', 'best_moment', 'turning_point'].includes(moment.classification) && !isPracticeModeActive && coachingBrief && (
        <div className="px-4 md:px-6 pb-4 md:pb-6">
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
              {/* Progressive Structural Hints */}
              {structuralHint && (
                <div className="mb-4 space-y-3">
                  <div className={`text-xs font-bold uppercase tracking-wide ${
                    theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                  }`}>Structure Hint</div>
                  
                  {/* Level 1: Always show broad structure */}
                  {retryAttempts >= 0 && (
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-orange-500/10 border-orange-500/30' 
                        : 'bg-orange-50 border-orange-300'
                    }`}>
                      <div className={`text-xs mb-1 ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      }`}>Broad Structure:</div>
                      <div className={`text-base font-bold ${
                        theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                      }`}>
                        {structuralHint.level1}
                      </div>
                    </div>
                  )}
                  
                  {/* Level 2: Show after 1st failed attempt */}
                  {retryAttempts >= 1 && (
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-orange-500/10 border-orange-500/30' 
                        : 'bg-orange-50 border-orange-300'
                    }`}>
                      <div className={`text-xs mb-1 ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      }`}>Template:</div>
                      <div className={`text-sm italic ${
                        theme === 'dark' ? 'text-orange-200' : 'text-orange-700'
                      }`}>
                        "{structuralHint.level2}"
                      </div>
                    </div>
                  )}
                  
                  {/* Level 3: Show full answer button after 2nd failed attempt */}
                  {retryAttempts >= 2 && (
                    <button
                      onClick={() => setRetryInput(structuralHint.level3)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        theme === 'dark'
                          ? 'bg-orange-500/5 border-orange-500/50 hover:bg-orange-500/10 hover:border-orange-500'
                          : 'bg-orange-50 border-orange-300 hover:bg-orange-100 hover:border-orange-400'
                      }`}
                    >
                      <div className={`text-xs mb-1 font-medium ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      }`}>Click to use suggested response:</div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-orange-200' : 'text-orange-700'
                      }`}>
                        "{structuralHint.level3}"
                      </div>
                    </button>
                  )}
                </div>
              )}
              
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
              
              <p className={`text-sm mb-4 leading-relaxed ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {retryResult.explanation}
              </p>
              
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
                  {/* Continue button - only enabled on success */}
                  <button
                    onClick={() => setIsPracticeModeActive(false)}
                    disabled={retryResult.label !== 'better' && retryResult.label !== 'strong_improvement'}
                    className={`flex-1 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      retryResult.label === 'better' || retryResult.label === 'strong_improvement'
                        ? theme === 'dark'
                          ? 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-400'
                          : 'bg-green-50 hover:bg-green-100 border-green-300 text-green-700'
                        : 'opacity-50 cursor-not-allowed bg-gray-500/10 border-gray-500/30 text-gray-500'
                    }`}
                  >
                    {retryResult.label === 'better' || retryResult.label === 'strong_improvement' ? '✓ Continue' : '🔒 Locked'}
                  </button>
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
              
              {/* Hint for next level */}
              {(retryResult.label === 'partial' || retryResult.label === 'still_missed') && retryAttempts < 4 && (
                <div className={`mt-4 p-3 rounded-lg border text-xs ${
                  theme === 'dark' 
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' 
                    : 'bg-blue-50 border-blue-300 text-blue-700'
                }`}>
                  💡 {retryAttempts === 0 && 'Try again for a more specific hint'}
                  {retryAttempts === 1 && 'Try again for a response template'}
                  {retryAttempts === 2 && 'Try again for a detailed example'}
                  {retryAttempts === 3 && 'Try again for the full coaching breakdown'}
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

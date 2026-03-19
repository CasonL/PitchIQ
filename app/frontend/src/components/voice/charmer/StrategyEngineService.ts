/**
 * StrategyEngineService.ts
 * LLM-based strategic evaluation with label outputs (no raw deltas)
 * Uses example-based anchoring to prevent interpretation drift
 */

import { StrategyLabels, PrimaryFailure, InteractionQuality, CredibilitySignal, RapportLevel, ObjectionHandling } from './DeltaMapping';

export interface StrategyEngineContext {
  userInput: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentState: {
    trust: number;
    resistance: number;
    openness: number;
    patience: number;
  };
  activeObjection?: string;
  marcusPersona: {
    name: string;
    role: string;
    painLevel: string;
    openness: string;
  };
}

export interface StrategyEngineOutput extends StrategyLabels {
  moment_type: 'breakthrough' | 'trust_drop' | 'neutral' | 'critical';
  severity: 'high' | 'medium' | 'low';
  reasoning: {
    what_happened: string;
    why_it_mattered: string;
    missed_opportunity?: string;
  };
  credibility_score: number; // 0-10 for analytics
  confidence: number; // 0-1, how certain the evaluation is
}

export class StrategyEngineService {
  private baseUrl = '/api/openai/chat';
  private model = 'openai/gpt-4o'; // Strategic thinking = 4o

  /**
   * Generate strategic evaluation with structured labels
   */
  async evaluateInteraction(context: StrategyEngineContext): Promise<StrategyEngineOutput> {
    const prompt = this.buildPrompt(context);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3, // Low temp for consistent evaluation
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`StrategyEngine API error: ${response.status}`);
      }

      const data = await response.json();
      let rawContent = data.choices[0].message.content;
      
      // Strip markdown code fences if present (```json ... ```)
      rawContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      
      const output = JSON.parse(rawContent);

      console.log('🧠 [StrategyEngine] Labels:', {
        primary_failure: output.primary_failure,
        interaction_quality: output.interaction_quality,
        credibility_signal: output.credibility_signal,
        rapport: output.rapport,
        moment_type: output.moment_type
      });

      return output;
    } catch (error) {
      console.error('⚠️ [StrategyEngine] FALLBACK TRIGGERED - Service error:', error);
      // Degrade realistically, not neutrally - makes failures visible
      return {
        primary_failure: 'unclear_value',
        interaction_quality: 'slightly_negative',
        credibility_signal: 'no_evidence',
        rapport: 'neutral',
        moment_type: 'neutral',
        severity: 'low',
        reasoning: {
          what_happened: 'StrategyEngine service failed - using degraded evaluation',
          why_it_mattered: 'Unable to properly assess interaction quality',
          missed_opportunity: 'Full evaluation not available due to service error'
        },
        credibility_score: 3,
        confidence: 0.1 // Very low confidence in fallback
      };
    }
  }

  /**
   * Build compressed context summary - prevents forgetting trajectory
   */
  private buildContextSummary(context: StrategyEngineContext): string {
    const lines: string[] = [];
    
    // Key objection tracking
    if (context.activeObjection) {
      lines.push(`- Key objection: ${context.activeObjection}`);
    }
    
    // Current stance based on state
    const trust = context.currentState.trust;
    const resistance = context.currentState.resistance;
    let stance = 'neutral';
    if (resistance > 0.7) stance = 'highly resistant';
    else if (resistance > 0.5 && trust < 0.4) stance = 'skeptical and guarded';
    else if (trust > 0.6 && resistance < 0.4) stance = 'opening up';
    else if (trust < 0.3) stance = 'distrusting';
    lines.push(`- Current stance: ${stance}`);
    
    // Previous issues from history
    const history = context.conversationHistory;
    if (history.length >= 4) {
      const earlyExchanges = history.slice(0, 4).map(m => m.content.toLowerCase()).join(' ');
      if (earlyExchanges.includes('vague') || earlyExchanges.includes('what exactly')) {
        lines.push(`- Previous issue: rep was too vague early on`);
      } else if (earlyExchanges.includes('pushy') || earlyExchanges.includes('too fast')) {
        lines.push(`- Previous issue: rep pushed too hard`);
      }
    }
    
    return lines.join('\n');
  }

  private buildPrompt(context: StrategyEngineContext): string {
    // Build compressed context summary
    const contextSummary = this.buildContextSummary(context);
    
    return `You are a strategic sales coach evaluating a sales rep's interaction with ${context.marcusPersona.name}, a ${context.marcusPersona.role}.

CONTEXT SUMMARY:
${contextSummary}

CURRENT STATE:
- Trust: ${(context.currentState.trust * 10).toFixed(1)}/10
- Resistance: ${(context.currentState.resistance * 10).toFixed(1)}/10
- Openness: ${(context.currentState.openness * 10).toFixed(1)}/10
- Patience: ${(context.currentState.patience * 10).toFixed(1)}/10
${context.activeObjection ? `- Active Objection: ${context.activeObjection}` : ''}

MARCUS'S PROFILE:
- Pain Level: ${context.marcusPersona.painLevel}
- Openness: ${context.marcusPersona.openness}

RECENT CONVERSATION:
${context.conversationHistory.slice(-6).map(msg => `${msg.role === 'user' ? 'Rep' : 'Marcus'}: ${msg.content}`).join('\n')}

CURRENT REP INPUT:
${context.userInput}

---

## YOUR TASK: Evaluate this interaction using LABELS (not numbers)

**CRITICAL: Follow these steps in order to prevent shallow pattern matching:**

STEP 1: Briefly describe what the rep just did in plain English (1-2 sentences)
STEP 2: Identify the main issue or strength (if any)
STEP 3: Assign labels based on your analysis

Output a JSON object with these exact fields:

{
  "primary_failure": "lack_of_specificity | no_evidence | missed_objection | poor_listening | too_pushy | unclear_value | disrespectful | no_dominant_failure",
  "interaction_quality": "very_positive | slightly_positive | neutral | slightly_negative | very_negative",
  "credibility_signal": "strong_evidence | moderate_evidence | weak_evidence | no_evidence | harmful",
  "rapport": "excellent | good | neutral | poor | hostile",
  "objection_handling": "fully_addressed | partially_addressed | acknowledged | missed | made_worse",
  "moment_type": "breakthrough | trust_drop | neutral | critical",
  "severity": "high | medium | low",
  "reasoning": {
    "what_happened": "1-2 sentence description of what the rep did",
    "why_it_mattered": "Why this was significant (or not)",
    "missed_opportunity": "What they could have done better (optional)"
  },
  "credibility_score": 0-10,
  "confidence": 0.0-1.0 (how certain you are of this evaluation)
}

---

## EXAMPLE-BASED CALIBRATION

Use these examples as reference points:

### CREDIBILITY EXAMPLES:

Rep: "We help sales teams"
→ credibility_signal: "no_evidence" (vague claim, zero proof)
→ credibility_score: 2

Rep: "We increased close rates 22% for similar B2B teams in your industry"
→ credibility_signal: "moderate_evidence" (specific metric, relevant)
→ credibility_score: 7

Rep: "Our clients include Salesforce, HubSpot, and Zoom. We reduced ramp time 40% in 90 days with documented case studies"
→ credibility_signal: "strong_evidence" (social proof + specifics + proof)
→ credibility_score: 9

### INTERACTION QUALITY EXAMPLES:

Rep: "Hey Marcus, appreciate you taking my call. I know you're busy so I'll be quick"
→ interaction_quality: "slightly_positive" (respectful, aware of time)

Rep: "So like I was saying, our platform does a bunch of stuff and yeah"
→ interaction_quality: "slightly_negative" (vague, rambling, unprofessional)

Rep: "Look Marcus, I'm not here to waste your time. I've worked with 5 companies in your space and here's specifically what we did for them..."
→ interaction_quality: "very_positive" (respectful, specific, value-focused)

### PRIMARY FAILURE EXAMPLES:

Rep: "We help improve sales performance"
→ primary_failure: "lack_of_specificity" (no details on how/what/who)

Rep: "Yeah we're really good at this, trust me"
→ primary_failure: "no_evidence" (claim without any backing)

Rep: "So anyway, what's your budget for something like this?"
→ primary_failure: "too_pushy" (jumping to close without earning right)

Marcus: "I'm not sure I see how this fits our situation"
Rep: "Great! Let me tell you more about our features..."
→ primary_failure: "missed_objection" (ignored concern completely)

### RAPPORT EXAMPLES:

Rep uses Marcus's name naturally, mirrors energy, shows genuine interest
→ rapport: "good"

Rep interrupts Marcus, talks over him, dismisses concerns
→ rapport: "poor"

Rep is polite but transactional, no real connection
→ rapport: "neutral"

---

## OBJECTION HANDLING CALIBRATION

${context.activeObjection ? `Current objection: "${context.activeObjection}"

If rep addresses it with:
- Specific evidence + addresses root concern = "fully_addressed"
- Partial answer but missing key element = "partially_addressed"  
- "I hear you" but doesn't solve = "acknowledged"
- Ignores it completely = "missed"
- Makes excuse or defensive = "made_worse"` : 'No active objection - set objection_handling to null'}

---

## MOMENT TYPE CLASSIFICATION

- breakthrough: Rep made significant progress, Marcus's guard is dropping
- trust_drop: Rep said something that damaged credibility or rapport
- critical: High-stakes moment (major objection, confusion, impatience spike)
- neutral: Normal exchange, no major shift

---

Evaluate the CURRENT rep input against these calibrated examples. Return valid JSON.`;
  }
}

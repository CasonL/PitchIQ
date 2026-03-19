/**
 * MomentFeedbackGenerator.ts
 * Generates puzzle-based feedback for critical moments using LLM
 */

import { CriticalMoment } from './ConversationTranscript';

export interface MomentPuzzle {
  moment: CriticalMoment;
  puzzleQuestions: string[]; // 3 guiding questions
  possiblePath: string; // Hidden hint (revealed on tap)
  context: string; // Why this exchange mattered
}

export interface CallSummary {
  overallTakeaway: string; // 2-3 sentences
  encouragement: string; // Short motivational line
  traitAnalysis?: string; // Analysis of performance vs Marcus's traits
  idealOutcome?: string; // What should have happened based on traits
}

export class MomentFeedbackGenerator {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || '';
    this.baseUrl = '/api/openai/chat';
  }
  
  /**
   * Generate puzzle-based feedback for critical moments
   */
  async generateMomentPuzzles(
    moments: CriticalMoment[],
    scenario?: { productName?: string; targetAudience?: string }
  ): Promise<MomentPuzzle[]> {
    const puzzles: MomentPuzzle[] = [];
    
    for (const moment of moments) {
      try {
        const puzzle = await this.generateSinglePuzzle(moment, scenario);
        puzzles.push(puzzle);
      } catch (error) {
        console.error('Error generating puzzle for moment:', moment.id, error);
        // Fallback to basic puzzle
        puzzles.push(this.generateFallbackPuzzle(moment));
      }
    }
    
    return puzzles;
  }
  
  /**
   * Generate overall call summary with trait-aware analysis
   */
  async generateCallSummary(
    moments: CriticalMoment[],
    totalExchanges: number,
    callDuration: number,
    scenario?: { productName?: string; targetAudience?: string },
    marcusTraits?: {
      traitProfileName: string;
      painLevel: string;
      urgency: string;
      budget: string;
      openness: string;
      satisfactionLevel: number;
      idealOutcome: string;
      winConditionExists: boolean;
    },
    objectionData?: {
      activeObjection?: string;
      objectionSatisfaction: Record<string, number>;
      objectionCounts: Record<string, number>;
    }
  ): Promise<CallSummary> {
    const prompt = `You are a tough but fair sales coach. NO BULLSHIT. NO FLUFF. NO GENERIC PLATITUDES.

CALL CONTEXT:
- Duration: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}
- Total exchanges: ${totalExchanges}
- Critical moments identified: ${moments.length}

${marcusTraits ? `MARCUS'S HIDDEN TRAITS (for your analysis only):
- Profile: ${marcusTraits.traitProfileName}
- Pain Level: ${marcusTraits.painLevel}
- Urgency: ${marcusTraits.urgency}
- Budget: ${marcusTraits.budget}
- Openness: ${marcusTraits.openness}
- Satisfaction with current solution: ${marcusTraits.satisfactionLevel}/10
- Winnable call: ${marcusTraits.winConditionExists ? 'Yes' : 'No'}
- Ideal outcome: ${marcusTraits.idealOutcome}
` : ''}
${objectionData ? `OBJECTION HANDLING (CRITICAL):
${Object.entries(objectionData.objectionSatisfaction)
  .filter(([_, satisfaction]) => satisfaction < 1.0)
  .map(([type, satisfaction]) => {
    const count = objectionData.objectionCounts[type] || 0;
    const addressed = satisfaction > 0.3 ? 'partially addressed' : 'NEVER addressed';
    return `- ${type.toUpperCase()}: Raised ${count}x, satisfaction ${(satisfaction * 100).toFixed(0)}% (${addressed})`;
  }).join('\n') || '- No objections raised'}
${objectionData.activeObjection ? `- Active objection at call end: ${objectionData.activeObjection.toUpperCase()}` : ''}

⚠️ If satisfaction is 0-30%, they NEVER used the right language to address it. Call this out FIRST in your feedback.
` : ''}
CRITICAL MOMENTS:
${moments.map((m, i) => `
${i + 1}. ${m.type.replace(/_/g, ' ')}
   User said: "${m.userMessage}"
   Marcus responded: "${m.marcusResponse}"
   Resistance: ${m.resistanceBefore} → ${m.resistanceAfter}
`).join('\n')}

Your job: Tell them EXACTLY what they did wrong and right, using THEIR ACTUAL WORDS from the call.

1. overallTakeaway: 2-3 sentences. CITE specific things they said AND tie advice to Marcus's state. Example: "When Marcus mentioned his outdated website, you asked 'Do you have someone who works on it?' - a closed question that went nowhere. Marcus's curiosity was medium at that point. You needed to ask WHY it matters to him or HOW it's affecting his business to raise it." NO vague shit like "deepen the conversation" or "build rapport." USE THEIR WORDS. EXPLAIN THE STATE-BASED REASONING.

2. encouragement: One punchy line. Make it about what they'll do NEXT time, not generic motivation. Example: "Next call, watch for resistance spikes and back off when you see them." NOT "Keep up the good work!"

${marcusTraits ? `3. traitAnalysis: 2-3 sentences. Tell them if this prospect was even worth their time based on Marcus's hidden traits. Example: "Marcus had high pain and budget but you never uncovered it because you stayed surface-level. This was winnable if you'd asked about business impact instead of technical details."

4. idealOutcome: One sentence. What SHOULD have happened? Example: "Should have booked a follow-up after uncovering 3 pain points." or "Should have qualified out after realizing he's satisfied."` : ''}

Return ONLY valid JSON in this format:
{
  "overallTakeaway": "string",
  "encouragement": "string"${marcusTraits ? `,
  "traitAnalysis": "string",
  "idealOutcome": "string"` : ''}
}

CRITICAL RULES:
- CITE their actual words from the call in "quotes"
- NO phrases like "deepen the conversation", "build rapport", "keep it up", "good effort"
- ALWAYS explain WHY an approach would work based on Marcus's state (urgency, pain, resistance, curiosity)
- Be SPECIFIC about what question they should have asked instead
- If they fucked up, say it. If they did well, say what they did.
- Write like you're texting them, not writing a corporate performance review
- Never give advice without state-based reasoning ("Marcus's urgency was low, so..." or "His resistance spiked to 8, so...")`;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a sales coach. Output only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const summary = JSON.parse(content);
      
      return summary as CallSummary;
      
    } catch (error) {
      console.error('Error generating call summary:', error);
      return this.generateFallbackSummary(moments, totalExchanges, callDuration);
    }
  }
  
  /**
   * Generate a single puzzle for a moment
   */
  private async generateSinglePuzzle(
    moment: CriticalMoment,
    scenario?: { productName?: string; targetAudience?: string }
  ): Promise<MomentPuzzle> {
    const prompt = `You are a sales coach analyzing a critical moment in a cold call.

SCENARIO:
${scenario?.productName ? `Product: ${scenario.productName}` : ''}
${scenario?.targetAudience ? `Target audience: ${scenario.targetAudience}` : ''}

CRITICAL MOMENT (${moment.timestamp.toFixed(0)}s into call):
Type: ${moment.type.replace(/_/g, ' ')}
What happened: ${moment.whatHappened}

THE EXCHANGE:
User said: "${moment.userMessage}"
Marcus responded: "${moment.marcusResponse}"

CONTEXT:
- Resistance level: ${moment.resistanceBefore} → ${moment.resistanceAfter}
${moment.hiddenOpportunity ? `- Hidden opportunity: ${moment.hiddenOpportunity}` : ''}

Generate coaching feedback in puzzle format:
1. context: One sentence explaining why this exchange mattered (what was really going on beneath the surface). INCLUDE Marcus's state (resistance level, emotional shift) as context.
2. puzzleQuestions: Exactly 3 Socratic questions that guide them to discover the issue themselves. Each question should:
   - Build on the previous one
   - Lead them toward the insight
   - NOT give away the answer
   - Be specific to THIS exchange (use actual words from the exchange)
3. possiblePath: One possible better approach (2-3 sentences). This is hidden until they tap. CRITICAL: Tie your advice to Marcus's STATE. Example: "Marcus's resistance went from 3→6 here. Pushing harder would spike it further. Instead, [specific alternative] would have kept him open." Focus on the NEXT question they could have asked or the reframe they could have used. ${scenario?.productName ? `Connect to how ${scenario.productName} solves the underlying problem.` : ''}

Return ONLY valid JSON:
{
  "context": "string",
  "puzzleQuestions": ["question 1", "question 2", "question 3"],
  "possiblePath": "string"
}

IMPORTANT:
- Be specific, not generic
- Questions should make them think, not feel judged
- possiblePath MUST explain why the alternative would work based on Marcus's resistance/emotional state at that moment
- Never say "do X" without explaining "because Marcus's [state] was [Y], so X would have [outcome]"
- possiblePath should hint at product value without explicitly stating it`;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a sales coach creating puzzle-based learning. Output only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 400
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const puzzle = JSON.parse(content);
    
    return {
      moment,
      context: puzzle.context,
      puzzleQuestions: puzzle.puzzleQuestions,
      possiblePath: puzzle.possiblePath
    };
  }
  
  /**
   * Fallback puzzle if LLM fails
   */
  private generateFallbackPuzzle(moment: CriticalMoment): MomentPuzzle {
    let context = 'This exchange revealed something important about the prospect\'s priorities.';
    let questions = [
      'What was the real objection behind the words?',
      'What question could have uncovered the underlying concern?',
      'How does your solution address what they\'re actually worried about?'
    ];
    let path = 'Try asking what\'s driving their current challenge before explaining how you can help.';
    
    // Customize based on moment type
    if (moment.type === 'trust_window') {
      context = 'The prospect showed vulnerability here, which is rare in cold calls.';
      questions = [
        'What did they reveal about their situation?',
        'Why did they feel safe sharing that with you?',
        'What would have happened if you\'d asked them to elaborate instead of pitching?'
      ];
      path = 'When someone shares a problem, resist the urge to solve it immediately. Ask them to tell you more about it first.';
    } else if (moment.type === 'resistance_spike') {
      context = 'Something you said here triggered a defensive response.';
      questions = [
        'What assumption did you make in your response?',
        'How might the prospect have interpreted that assumption?',
        'What could you have asked to understand their situation first?'
      ];
      path = 'Before presenting solutions, validate their current approach. Then ask what they wish was different.';
    } else if (moment.type === 'objection_mishandled') {
      context = 'An objection was raised here but it wasn\'t acknowledged.';
      questions = [
        'What concern did they express (in their words)?',
        'What happened when you moved past it without addressing it?',
        'How could acknowledging it have changed the conversation?'
      ];
      path = 'Name the objection explicitly: "It sounds like [their concern] is top of mind. Tell me more about that."';
    }
    
    return {
      moment,
      context,
      puzzleQuestions: questions,
      possiblePath: path
    };
  }
  
  /**
   * Fallback summary if LLM fails
   */
  private generateFallbackSummary(
    moments: CriticalMoment[],
    totalExchanges: number,
    callDuration: number
  ): CallSummary {
    const mins = Math.floor(callDuration / 60);
    const hadResistanceSpike = moments.some(m => m.type === 'resistance_spike');
    const hadMissedWindow = moments.some(m => m.type === 'trust_window');
    
    let takeaway = `You kept the conversation going for ${mins}+ minutes with ${totalExchanges} exchanges. `;
    
    if (hadMissedWindow) {
      takeaway += 'You got the prospect to open up, which is half the battle. ';
    }
    
    if (hadResistanceSpike) {
      takeaway += 'A few responses triggered pushback, but that\'s part of learning where the boundaries are.';
    } else {
      takeaway += 'You maintained a respectful tone throughout.';
    }
    
    return {
      overallTakeaway: takeaway,
      encouragement: 'You\'re learning what works and what doesn\'t. That\'s the whole point. 🔥'
    };
  }
}

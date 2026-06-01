/**
 * WarmLeadFeedbackService
 * 
 * Generates sophisticated, evidence-based feedback for warm-lead sales calls.
 * Uses LLM to analyze call moments and provide practical coaching with quiz reinforcement.
 */

import {
  WarmSignal,
  BuyerDefense,
  BuyerEngagement,
  CallPhase,
  RepMistake,
  RepStrength,
  MomentContext,
  MomentFeedback,
  QuizQuestion,
  WarmLeadScore,
  FeedbackGenerationInput,
  FeedbackGenerationOutput,
  InterpretationEvidence
} from './WarmLeadFeedbackTypes';

export class WarmLeadFeedbackService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '') {
    this.apiBaseUrl = apiBaseUrl || import.meta.env.VITE_API_BASE_URL || '';
  }

  /**
   * Generate complete feedback for a warm-lead call
   */
  async generateFeedback(input: FeedbackGenerationInput): Promise<FeedbackGenerationOutput> {
    console.log('🎓 Generating warm-lead feedback for session:', input.sessionId);

    // Step 1: Detect and classify moments
    const moments = await this.detectMoments(input);
    console.log(`📊 Detected ${moments.length} key moments`);

    // Step 2: Generate feedback for each moment
    const momentFeedback = await Promise.all(
      moments.map(moment => this.generateMomentFeedback(moment))
    );

    // Step 3: Calculate overall score
    const score = this.calculateScore(moments, momentFeedback);

    // Step 4: Generate overall summary
    const overallSummary = this.generateOverallSummary(score, momentFeedback);
    const keyTakeaways = this.extractKeyTakeaways(momentFeedback);

    return {
      sessionId: input.sessionId,
      score,
      moments: momentFeedback,
      overallSummary,
      keyTakeaways
    };
  }

  /**
   * Detect and classify key moments in the call
   */
  private async detectMoments(input: FeedbackGenerationInput): Promise<MomentContext[]> {
    const moments: MomentContext[] = [];

    // Analyze each turn in the conversation
    for (let i = 0; i < input.transcript.length - 1; i += 2) {
      const userTurn = input.transcript[i];
      const marcusTurn = input.transcript[i + 1];

      if (!userTurn || !marcusTurn || userTurn.speaker !== 'user' || marcusTurn.speaker !== 'marcus') {
        continue;
      }

      const turnNumber = Math.floor(i / 2) + 1;
      const marcusStateBefore = input.marcusStateHistory[i] || input.marcusStateHistory[0];
      const marcusStateAfter = input.marcusStateHistory[i + 1] || marcusStateBefore;

      // Detect buyer state and rep behavior
      const moment = await this.classifyMoment(
        userTurn.text,
        marcusTurn.text,
        turnNumber,
        input.warmSignal,
        input.daysAgoSignal,
        marcusStateBefore,
        marcusStateAfter
      );

      // Only include moments with significant mistakes or strengths
      if (moment.detectedMistakes.length > 0 || moment.detectedStrengths.length > 0) {
        moments.push(moment);
      }
    }

    return moments;
  }

  /**
   * Classify a single moment (buyer state + rep behavior)
   */
  private async classifyMoment(
    repUtterance: string,
    buyerUtterance: string,
    turnNumber: number,
    warmSignal: WarmSignal,
    daysAgoSignal: number | undefined,
    marcusStateBefore: any,
    marcusStateAfter: any
  ): Promise<MomentContext> {
    // Detect call phase
    const callPhase = this.detectCallPhase(turnNumber, repUtterance, buyerUtterance);

    // Detect buyer defense
    const buyerDefense = this.detectBuyerDefense(buyerUtterance);

    // Detect buyer engagement
    const buyerEngagementBefore = this.detectBuyerEngagement(marcusStateBefore);
    const buyerEngagementAfter = this.detectBuyerEngagement(marcusStateAfter);

    // Detect rep mistakes
    const detectedMistakes = this.detectRepMistakes(
      repUtterance,
      buyerUtterance,
      turnNumber,
      warmSignal,
      callPhase
    );

    // Detect rep strengths
    const detectedStrengths = this.detectRepStrengths(
      repUtterance,
      buyerUtterance,
      callPhase
    );

    // Build evidence
    const evidence = this.buildEvidence(
      repUtterance,
      buyerUtterance,
      detectedMistakes,
      detectedStrengths
    );

    return {
      timestamp: `Turn ${turnNumber}`,
      turnNumber,
      repUtterance,
      buyerUtterance,
      warmSignal,
      daysAgoSignal,
      callPhase,
      buyerDefense,
      buyerEngagementBefore,
      buyerEngagementAfter,
      metricDeltas: {
        trust: marcusStateAfter.confidence - marcusStateBefore.confidence,
        curiosity: marcusStateAfter.curiosity - marcusStateBefore.curiosity,
        urgency: marcusStateAfter.urgency - marcusStateBefore.urgency,
        clarity: 0 // TODO: Add clarity metric
      },
      detectedMistakes,
      detectedStrengths,
      evidence
    };
  }

  /**
   * Detect which phase of the call we're in
   */
  private detectCallPhase(turnNumber: number, repUtterance: string, buyerUtterance: string): CallPhase {
    const repLower = repUtterance.toLowerCase();
    const buyerLower = buyerUtterance.toLowerCase();

    // Opening phase (first 2 turns)
    if (turnNumber <= 2) {
      return 'opening';
    }

    // Permission phase (asking to continue)
    if (repLower.includes('worth') && repLower.includes('second')) {
      return 'permission';
    }

    // Trigger discovery (asking about the warm signal)
    if (repLower.includes('check') || repLower.includes('visit') || repLower.includes('look')) {
      return 'trigger_discovery';
    }

    // Problem discovery (asking about current state)
    if (repLower.includes('current') || repLower.includes('how do you') || repLower.includes('what happens')) {
      return 'problem_discovery';
    }

    // Impact development (exploring consequences)
    if (repLower.includes('what if') || repLower.includes('cost') || repLower.includes('impact')) {
      return 'impact_development';
    }

    // Solution mapping (connecting product to problem)
    if (repLower.includes('we help') || repLower.includes('our platform') || repLower.includes('pitchiq')) {
      return 'solution_mapping';
    }

    // Next step (scheduling/committing)
    if (repLower.includes('demo') || repLower.includes('meeting') || repLower.includes('tuesday')) {
      return 'next_step';
    }

    return 'problem_discovery'; // Default
  }

  /**
   * Detect buyer defense mechanism
   */
  private detectBuyerDefense(buyerUtterance: string): BuyerDefense {
    const lower = buyerUtterance.toLowerCase();

    if (lower.includes("don't remember") || lower.includes("didn't sign up")) {
      return 'recognition_gap';
    }

    if (lower.includes("not looking for") || lower.includes("not interested in a pitch")) {
      return 'autonomy_defense';
    }

    if (lower.includes("happy with") || lower.includes("all set") || lower.includes("we're good")) {
      return 'status_quo_shield';
    }

    if (lower.includes("what do you do") || lower.includes("what exactly")) {
      return 'relevance_test';
    }

    if (lower.includes("don't have time") || lower.includes("busy right now")) {
      return 'risk_scan';
    }

    if (lower.includes("not a priority") || lower.includes("maybe later")) {
      return 'timing_defense';
    }

    if (lower.includes("talk to my team") || lower.includes("need to check")) {
      return 'authority_deflection';
    }

    return 'none';
  }

  /**
   * Detect buyer engagement level
   */
  private detectBuyerEngagement(marcusState: any): BuyerEngagement {
    const confidence = marcusState.confidence || 0;
    const curiosity = marcusState.curiosity || 0;

    // Closed: low confidence and curiosity
    if (confidence < 30 && curiosity < 30) {
      return 'closed';
    }

    // Guarded: moderate confidence, low curiosity
    if (confidence < 50 && curiosity < 40) {
      return 'guarded';
    }

    // Curious: moderate curiosity
    if (curiosity >= 40 && curiosity < 60) {
      return 'curious';
    }

    // Exploring: high curiosity
    if (curiosity >= 60 && curiosity < 75) {
      return 'exploring';
    }

    // Problem aware: high confidence and curiosity
    if (confidence >= 60 && curiosity >= 75) {
      return 'problem_aware';
    }

    // Next step open: very high confidence
    if (confidence >= 75) {
      return 'next_step_open';
    }

    return 'guarded'; // Default
  }

  /**
   * Detect rep mistakes
   */
  private detectRepMistakes(
    repUtterance: string,
    buyerUtterance: string,
    turnNumber: number,
    warmSignal: WarmSignal,
    callPhase: CallPhase
  ): RepMistake[] {
    const mistakes: RepMistake[] = [];
    const repLower = repUtterance.toLowerCase();
    const buyerLower = buyerUtterance.toLowerCase();

    // IGNORED_WARM_SIGNAL: Didn't mention the website visit in opening
    if (turnNumber === 1 && !repLower.includes('check') && !repLower.includes('visit') && !repLower.includes('look')) {
      mistakes.push(RepMistake.IGNORED_WARM_SIGNAL);
    }

    // OVERCLAIMED_INTENT: Claimed more than a website visit
    if (repLower.includes('requested') || repLower.includes('reached out') || repLower.includes('signed up')) {
      mistakes.push(RepMistake.OVERCLAIMED_INTENT);
    }

    // FAKE_PERMISSION: Lied about form fills
    if (repLower.includes('filled out') || repLower.includes('left your number')) {
      if (buyerLower.includes("didn't") || buyerLower.includes("never")) {
        mistakes.push(RepMistake.FAKE_PERMISSION);
      }
    }

    // SKIPPED_TRIGGER_DISCOVERY: Didn't ask what prompted the visit
    if (callPhase === 'opening' && !repLower.includes('what') && !repLower.includes('why')) {
      mistakes.push(RepMistake.SKIPPED_TRIGGER_DISCOVERY);
    }

    // PREMATURE_PITCH: Pitched before relevance established
    if (turnNumber <= 2 && (repLower.includes('our') || repLower.includes('we help') || repLower.includes('increase'))) {
      mistakes.push(RepMistake.PREMATURE_PITCH);
    }

    // UNEARNED_ROI_CLAIM: Big claims before trust
    if (repLower.match(/\d+%/) && turnNumber <= 3) {
      mistakes.push(RepMistake.UNEARNED_ROI_CLAIM);
    }

    // FOUGHT_STATUS_QUO: Argued with "we're happy"
    if (buyerLower.includes('happy with') && repLower.includes('but')) {
      mistakes.push(RepMistake.FOUGHT_STATUS_QUO);
    }

    // ASKED_TOO_LARGE_COMMITMENT: Asked for too much time
    if (repLower.includes('five minutes') || repLower.includes('10 minutes')) {
      mistakes.push(RepMistake.ASKED_TOO_LARGE_COMMITMENT);
    }

    // GENERIC_DISCOVERY: Generic questions
    if (repLower.includes('keeps you up at night') || repLower.includes('biggest challenge')) {
      mistakes.push(RepMistake.GENERIC_DISCOVERY);
    }

    // FEATURE_DUMPED: Listed features without context
    if (repLower.split(',').length > 3 && repLower.includes('and')) {
      mistakes.push(RepMistake.FEATURE_DUMPED);
    }

    return mistakes;
  }

  /**
   * Detect rep strengths
   */
  private detectRepStrengths(
    repUtterance: string,
    buyerUtterance: string,
    callPhase: CallPhase
  ): RepStrength[] {
    const strengths: RepStrength[] = [];
    const repLower = repUtterance.toLowerCase();

    // USED_WARM_SIGNAL_CAREFULLY: Mentioned signal without overclaiming
    if ((repLower.includes('check') || repLower.includes('visit')) && repLower.includes('not sure')) {
      strengths.push(RepStrength.USED_WARM_SIGNAL_CAREFULLY);
    }

    // PRESERVED_BUYER_CONTROL: Gave easy outs
    if (repLower.includes('worth') && repLower.includes('second')) {
      strengths.push(RepStrength.PRESERVED_BUYER_CONTROL);
    }

    // VALIDATED_STATUS_QUO: Validated current process
    if (repLower.includes('makes sense') || repLower.includes('totally fair')) {
      strengths.push(RepStrength.VALIDATED_STATUS_QUO);
    }

    // ASKED_TRIGGER_QUESTION: Asked about the warm signal
    if (repLower.includes('what were you hoping') || repLower.includes('what made you')) {
      strengths.push(RepStrength.ASKED_TRIGGER_QUESTION);
    }

    // ASKED_CONCRETE_DISCOVERY: Concrete operational questions
    if (repLower.includes('how long') || repLower.includes('what happens when')) {
      strengths.push(RepStrength.ASKED_CONCRETE_DISCOVERY);
    }

    // GAVE_EASY_OUT: Explicitly gave an out
    if (repLower.includes('if not') || repLower.includes('if there\'s nothing')) {
      strengths.push(RepStrength.GAVE_EASY_OUT);
    }

    return strengths;
  }

  /**
   * Build evidence for interpretation
   */
  private buildEvidence(
    repUtterance: string,
    buyerUtterance: string,
    mistakes: RepMistake[],
    strengths: RepStrength[]
  ): InterpretationEvidence {
    let confidence: 'low' | 'medium' | 'high' = 'medium';
    let reasoning = '';

    // High confidence if there's a direct contradiction
    if (buyerUtterance.toLowerCase().includes("didn't") || buyerUtterance.toLowerCase().includes("never")) {
      confidence = 'high';
      reasoning = 'Direct contradiction in transcript';
    }
    // High confidence if there's a clear pattern
    else if (mistakes.length >= 2) {
      confidence = 'high';
      reasoning = 'Multiple mistake patterns detected';
    }
    // Medium confidence for single mistakes
    else if (mistakes.length === 1) {
      confidence = 'medium';
      reasoning = 'Single mistake pattern detected';
    }
    // Low confidence if only strengths
    else if (strengths.length > 0) {
      confidence = 'low';
      reasoning = 'Positive behavior detected, no clear mistakes';
    }

    return {
      repQuote: repUtterance.substring(0, 150) + (repUtterance.length > 150 ? '...' : ''),
      buyerQuote: buyerUtterance.substring(0, 150) + (buyerUtterance.length > 150 ? '...' : ''),
      supportingContext: `Turn with ${mistakes.length} mistakes and ${strengths.length} strengths`,
      interpretationConfidence: confidence,
      reasoning
    };
  }

  /**
   * Generate feedback for a single moment using LLM
   */
  private async generateMomentFeedback(moment: MomentContext): Promise<MomentFeedback> {
    // Build the prompt
    const prompt = this.buildFeedbackPrompt(moment);

    try {
      // Call LLM to generate feedback
      const response = await fetch(`${this.apiBaseUrl}/api/generate-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, moment })
      });

      if (!response.ok) {
        throw new Error(`Feedback generation failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Generate quiz question
      const quiz = await this.generateQuizQuestion(moment, result.feedback);

      return {
        momentId: `moment_${moment.turnNumber}`,
        timestamp: moment.timestamp,
        momentType: this.determineMomentType(moment),
        whatHappened: result.feedback.whatHappened,
        whyItDidntWork: result.feedback.whyItDidntWork,
        whatToDoInstead: result.feedback.whatToDoInstead,
        tryThisLine: result.feedback.tryThisLine,
        whyItWorks: result.feedback.whyItWorks,
        quiz,
        evidence: moment.evidence
      };
    } catch (error) {
      console.error('Error generating moment feedback:', error);
      
      // Fallback to rule-based feedback
      return this.generateFallbackFeedback(moment);
    }
  }

  /**
   * Build LLM prompt for feedback generation
   */
  private buildFeedbackPrompt(moment: MomentContext): string {
    const mistakeDescriptions = moment.detectedMistakes.map(m => this.getMistakeDescription(m)).join(', ');
    const strengthDescriptions = moment.detectedStrengths.map(s => this.getStrengthDescription(s)).join(', ');

    return `You are generating sales coaching feedback for a warm-lead call.

CONTEXT:
- Warm signal: ${moment.warmSignal}${moment.daysAgoSignal ? ` (${moment.daysAgoSignal} days ago)` : ''}
- Call phase: ${moment.callPhase}
- Buyer defense: ${moment.buyerDefense}
- Buyer engagement: ${moment.buyerEngagementBefore} → ${moment.buyerEngagementAfter}
- Rep said: "${moment.repUtterance}"
- Buyer said: "${moment.buyerUtterance}"
- Trust changed: ${moment.metricDeltas.trust}
- Detected mistakes: ${mistakeDescriptions || 'none'}
- Detected strengths: ${strengthDescriptions || 'none'}

TASK: Generate practical, evidence-based feedback.

CRITICAL RULES:

1. USE TRANSCRIPT EVIDENCE
   - Base interpretations on what was actually said
   - Use phrases like "Marcus may have heard this as..." or "This likely landed as..."
   - Avoid claiming emotions as facts: "Marcus felt..." or "Marcus was thinking..."
   - Include confidence level based on evidence

2. NO GIMMICKY PSYCHOLOGY
   ❌ "His brain was too busy to think sales pitch"
   ✅ "You pitched before Marcus agreed the problem was relevant"

3. ACKNOWLEDGE STRENGTHS FIRST (if any)
   If the rep did something right, mention it before the mistake

4. BE SPECIFIC ABOUT EVIDENCE
   Quote the exact lines that support your interpretation

5. GIVE USABLE ALTERNATIVES
   Always include a "Try this instead" line that the rep can actually say

6. SOFTEN MANIPULATIVE LANGUAGE
   ❌ "Once he admits what doesn't work..."
   ✅ "Once Marcus feels you respect what already works, he's more likely to talk honestly about friction points"

FEEDBACK STRUCTURE (respond with JSON):
{
  "whatHappened": "1-2 sentences: what the rep said, how the buyer responded, using quotes",
  "whyItDidntWork": "1-2 sentences: buyer's probable interpretation, based on evidence, with confidence level",
  "whatToDoInstead": "Specific behavior change",
  "tryThisLine": "Exact alternative line the rep could say",
  "whyItWorks": "1 sentence: practical reason, no jargon"
}`;
  }

  /**
   * Generate quiz question for a moment
   */
  private async generateQuizQuestion(moment: MomentContext, feedback: any): Promise<QuizQuestion> {
    const prompt = this.buildQuizPrompt(moment, feedback);

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, moment, feedback })
      });

      if (!response.ok) {
        throw new Error(`Quiz generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.quiz;
    } catch (error) {
      console.error('Error generating quiz:', error);
      return this.generateFallbackQuiz(moment);
    }
  }

  /**
   * Build LLM prompt for quiz generation
   */
  private buildQuizPrompt(moment: MomentContext, feedback: any): string {
    return `Generate a multiple-choice question that tests understanding of what went wrong.

CONTEXT:
- What happened: ${feedback.whatHappened}
- Why it failed: ${feedback.whyItDidntWork}

REQUIREMENTS:

1. EQUAL LENGTH ANSWERS (±3 words)
2. ALL ANSWERS PSYCHOLOGICALLY PLAUSIBLE
3. NO JARGON IN ANSWERS
4. WRONG ANSWERS USE REAL PRINCIPLES (JUST MISAPPLIED)

QUESTION SHOULD TEST:
"Why did Marcus react this way?"

NOT:
"What is the definition of status quo bias?"

RESPOND WITH JSON:
{
  "question": "Why did Marcus [reaction]?",
  "options": [
    {
      "text": "Option A (15-17 words)",
      "correct": false,
      "psychologyPrinciple": "Why this is plausible"
    },
    {
      "text": "Option B (15-17 words)",
      "correct": true,
      "psychologyPrinciple": "Why this is correct"
    },
    {
      "text": "Option C (15-17 words)",
      "correct": false,
      "psychologyPrinciple": "Why this is plausible"
    }
  ],
  "explanation": "Why the correct answer is right",
  "howResponse": "What to do instead"
}`;
  }

  /**
   * Calculate overall score
   */
  private calculateScore(moments: MomentContext[], feedback: MomentFeedback[]): WarmLeadScore {
    // TODO: Implement sophisticated scoring logic
    // For now, return placeholder scores
    return {
      warmSignalUse: 50,
      intentCalibration: 50,
      triggerDiscovery: 50,
      autonomyPreservation: 50,
      relevanceEstablishment: 50,
      statusQuoHandling: 50,
      discoveryQuality: 50,
      impactDevelopment: 50,
      productTiming: 50,
      nextStepFit: 50,
      overallScore: 50,
      confidence: 'medium',
      strengths: [],
      improvements: [],
      criticalMoments: feedback
    };
  }

  /**
   * Generate overall summary
   */
  private generateOverallSummary(score: WarmLeadScore, feedback: MomentFeedback[]): string {
    return `Overall call performance: ${score.overallScore}/100. ${feedback.length} key moments identified for improvement.`;
  }

  /**
   * Extract key takeaways
   */
  private extractKeyTakeaways(feedback: MomentFeedback[]): string[] {
    return feedback.map(f => f.whatToDoInstead).slice(0, 3);
  }

  // Helper methods for descriptions
  private getMistakeDescription(mistake: RepMistake): string {
    const descriptions: Record<RepMistake, string> = {
      [RepMistake.IGNORED_WARM_SIGNAL]: 'Ignored warm signal',
      [RepMistake.OVERCLAIMED_INTENT]: 'Overclaimed buyer intent',
      [RepMistake.FAKE_PERMISSION]: 'Fabricated permission',
      [RepMistake.SKIPPED_TRIGGER_DISCOVERY]: 'Skipped trigger discovery',
      [RepMistake.PREMATURE_PITCH]: 'Pitched too early',
      [RepMistake.UNEARNED_ROI_CLAIM]: 'Unearned ROI claim',
      [RepMistake.FOUGHT_STATUS_QUO]: 'Fought status quo',
      [RepMistake.ASKED_TOO_LARGE_COMMITMENT]: 'Asked for too much time',
      [RepMistake.GENERIC_DISCOVERY]: 'Generic discovery questions',
      [RepMistake.FEATURE_DUMPED]: 'Feature dumped',
      [RepMistake.IGNORED_BUYING_SIGNAL]: 'Ignored buying signal',
      [RepMistake.FILLED_SILENCE]: 'Filled silence',
      [RepMistake.TALKED_PAST_OBJECTION]: 'Talked past objection'
    };
    return descriptions[mistake];
  }

  private getStrengthDescription(strength: RepStrength): string {
    const descriptions: Record<RepStrength, string> = {
      [RepStrength.USED_WARM_SIGNAL_CAREFULLY]: 'Used warm signal carefully',
      [RepStrength.PRESERVED_BUYER_CONTROL]: 'Preserved buyer control',
      [RepStrength.ANSWERED_DIRECTLY]: 'Answered directly',
      [RepStrength.VALIDATED_STATUS_QUO]: 'Validated status quo',
      [RepStrength.ASKED_TRIGGER_QUESTION]: 'Asked trigger question',
      [RepStrength.ASKED_CONCRETE_DISCOVERY]: 'Asked concrete discovery',
      [RepStrength.EXPLORED_CONSEQUENCES]: 'Explored consequences',
      [RepStrength.SUMMARIZED_BUYER_WORLD]: 'Summarized buyer world',
      [RepStrength.MATCHED_NEXT_STEP_TO_PROBLEM]: 'Matched next step to problem',
      [RepStrength.GAVE_EASY_OUT]: 'Gave easy out',
      [RepStrength.USED_SILENCE_WELL]: 'Used silence well'
    };
    return descriptions[strength];
  }

  private determineMomentType(moment: MomentContext): 'mistake' | 'turning' | 'win' {
    if (moment.detectedMistakes.length > 0) {
      return 'mistake';
    }
    if (moment.metricDeltas.trust > 10 || moment.metricDeltas.curiosity > 10) {
      return 'turning';
    }
    return 'win';
  }

  private generateFallbackFeedback(moment: MomentContext): MomentFeedback {
    // Simple rule-based fallback
    const primaryMistake = moment.detectedMistakes[0];
    
    return {
      momentId: `moment_${moment.turnNumber}`,
      timestamp: moment.timestamp,
      momentType: 'mistake',
      whatHappened: `You said "${moment.repUtterance.substring(0, 100)}..." and Marcus responded with "${moment.buyerUtterance.substring(0, 100)}..."`,
      whyItDidntWork: `This likely didn't work because of ${this.getMistakeDescription(primaryMistake)}.`,
      whatToDoInstead: 'Try a different approach that addresses the warm signal first.',
      tryThisLine: 'Marcus, you checked out PitchIQ recently. What were you hoping to figure out?',
      whyItWorks: 'It brings the conversation back to Marcus\'s original reason for looking.',
      quiz: this.generateFallbackQuiz(moment),
      evidence: moment.evidence
    };
  }

  private generateFallbackQuiz(moment: MomentContext): QuizQuestion {
    return {
      question: 'Why did this approach not work well?',
      options: [
        {
          text: 'The rep did not establish enough rapport before pitching',
          correct: false,
          psychologyPrinciple: 'Relationship-first principle'
        },
        {
          text: 'The rep made Marcus evaluate the product before agreeing there was a problem',
          correct: true,
          psychologyPrinciple: 'Relevance-first principle'
        },
        {
          text: 'The rep needed to provide more detailed information about features',
          correct: false,
          psychologyPrinciple: 'Information-first principle'
        }
      ],
      explanation: 'Buyers reject faster when asked to evaluate a product before agreeing the problem is relevant.',
      howResponse: 'Start with the warm signal and find out what triggered the interest before explaining the product.'
    };
  }
}

/**
 * FrameworkAnalyzer.ts
 * Detects advanced sales patterns and provides plain-English feedback
 * No jargon - just clear, actionable insights
 */

export interface QuestionPatternAnalysis {
  contextQuestions: number;
  problemQuestions: number;
  impactQuestions: number;
  valueQuestions: number;
  total: number;
  balance: 'weak' | 'surface-level' | 'developing' | 'strong';
  feedback: string;
  whatYouDid: string[];
  whatToTryNext: string;
}

export interface ObjectionResponseAnalysis {
  objectionsHandled: number;
  exploredBeforeResponding: number;
  acknowledgedConcerns: number;
  score: number;
  feedback: string;
  missedMoments: string[];
}

export interface InsightMomentAnalysis {
  reframingMoments: number;
  clearRecommendations: number;
  score: number;
  feedback: string;
  bestExample: string | null;
  opportunity: string | null;
}

export interface DealQualityAnalysis {
  hasNumbers: boolean;
  knowsDecisionMaker: boolean;
  understandsProcess: boolean;
  identifiedPain: boolean;
  hasChampion: boolean;
  completeness: number;
  feedback: string;
  criticalGaps: string[];
}

export interface CallOutcomeAnalysis {
  type: 'concrete-next-step' | 'vague-follow-up' | 'no-commitment';
  quality: number;
  whatYouGot: string | null;
  whoElseNeeded: string[];
  hasPlan: boolean;
  feedback: string;
}

export interface FrameworkInsights {
  questionPattern: QuestionPatternAnalysis;
  objectionHandling: ObjectionResponseAnalysis | null;
  insightMoments: InsightMomentAnalysis | null;
  dealQuality: DealQualityAnalysis | null;
  outcome: CallOutcomeAnalysis;
  overallScore: number;
  biggestWin: string;
  biggestGap: string;
  practiceThis: string;
}

export class FrameworkAnalyzer {
  /**
   * Analyze question progression - context vs problems vs impact vs value
   */
  analyzeQuestionPattern(transcript: Array<{ role: string; content: string }>): QuestionPatternAnalysis {
    const userTurns = transcript.filter(t => t.role === 'user');
    
    const analysis: QuestionPatternAnalysis = {
      contextQuestions: 0,
      problemQuestions: 0,
      impactQuestions: 0,
      valueQuestions: 0,
      total: 0,
      balance: 'weak',
      feedback: '',
      whatYouDid: [],
      whatToTryNext: ''
    };
    
    for (const turn of userTurns) {
      const text = turn.content.toLowerCase();
      
      if (this.isContextQuestion(text)) {
        analysis.contextQuestions++;
      }
      
      if (this.isProblemQuestion(text)) {
        analysis.problemQuestions++;
      }
      
      if (this.isImpactQuestion(text)) {
        analysis.impactQuestions++;
      }
      
      if (this.isValueQuestion(text)) {
        analysis.valueQuestions++;
      }
    }
    
    analysis.total = analysis.contextQuestions + analysis.problemQuestions + 
                     analysis.impactQuestions + analysis.valueQuestions;
    
    analysis.balance = this.assessQuestionBalance(analysis);
    analysis.feedback = this.generateQuestionFeedback(analysis);
    analysis.whatYouDid = this.describeWhatTheyDid(analysis);
    analysis.whatToTryNext = this.suggestNextQuestionMove(analysis);
    
    return analysis;
  }
  
  private isContextQuestion(text: string): boolean {
    const patterns = [
      /what (do you|does|is your|are you) (currently|now|today)/,
      /how (do you|does) (currently|now)/,
      /tell me about (your|the) (current|existing)/,
      /walk me through/,
      /who (handles|manages|owns)/,
      /what tools/,
      /how long have you/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private isProblemQuestion(text: string): boolean {
    const patterns = [
      /what.*(challenge|problem|issue|struggle|difficult|pain|frustrat)/,
      /where.*(break|fail|stuck|bottleneck|slow)/,
      /what.*(not working|missing|gap)/,
      /why.*(hard|difficult|challenging)/,
      /(challenge|problem|issue) (is|are|do you)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private isImpactQuestion(text: string): boolean {
    const patterns = [
      /what.*(happen|impact|effect|cost|consequence)/,
      /when.*(slip|miss|delay|fail)/,
      /how.*(affect|impact|hurt|cost)/,
      /what.*(downstream|ripple|knock-on)/,
      /(cost|impact|effect) (of|when)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private isValueQuestion(text: string): boolean {
    const patterns = [
      /what would.*(change|improve|free up|enable)/,
      /if (we|you) (could|solved|fixed)/,
      /what would.*(worth|value|mean)/,
      /how would.*(help|benefit|improve)/,
      /(value|benefit|outcome) (of|if)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private assessQuestionBalance(analysis: QuestionPatternAnalysis): 'weak' | 'surface-level' | 'developing' | 'strong' {
    if (analysis.total < 3) return 'weak';
    
    if (analysis.problemQuestions >= 2 && analysis.impactQuestions >= 1 && analysis.valueQuestions >= 1) {
      return 'strong';
    }
    
    if (analysis.problemQuestions >= 1 && (analysis.impactQuestions >= 1 || analysis.valueQuestions >= 1)) {
      return 'developing';
    }
    
    if (analysis.contextQuestions > analysis.problemQuestions + analysis.impactQuestions + analysis.valueQuestions) {
      return 'surface-level';
    }
    
    return 'weak';
  }
  
  private generateQuestionFeedback(analysis: QuestionPatternAnalysis): string {
    if (analysis.balance === 'strong') {
      return 'You built the value naturally - started with problems, dug into consequences, then made it worth solving.';
    }
    
    if (analysis.balance === 'developing') {
      if (analysis.impactQuestions === 0) {
        return 'You found the problem. Now dig into what happens when it breaks: "What does that cost you?"';
      }
      if (analysis.valueQuestions === 0) {
        return 'You uncovered pain. Now quantify the win: "If we fixed this, what would that free up for you?"';
      }
      return 'Good start. Push deeper: problem → consequences → value.';
    }
    
    if (analysis.balance === 'surface-level') {
      return 'You gathered context, but never got to the real problem. Try: "Where does that break down most often?"';
    }
    
    return 'Not enough discovery. Start with: "What\'s the biggest challenge with [their situation]?"';
  }
  
  private describeWhatTheyDid(analysis: QuestionPatternAnalysis): string[] {
    const descriptions: string[] = [];
    
    if (analysis.contextQuestions >= 2) {
      descriptions.push(`Asked ${analysis.contextQuestions} context questions (current state, tools, process)`);
    }
    if (analysis.problemQuestions >= 1) {
      descriptions.push(`Asked ${analysis.problemQuestions} problem questions (where it breaks, what's hard)`);
    }
    if (analysis.impactQuestions >= 1) {
      descriptions.push(`Asked ${analysis.impactQuestions} impact questions (what happens when it fails)`);
    }
    if (analysis.valueQuestions >= 1) {
      descriptions.push(`Asked ${analysis.valueQuestions} value questions (what fixing it would enable)`);
    }
    
    return descriptions.length > 0 ? descriptions : ['Mostly statement-based conversation'];
  }
  
  private suggestNextQuestionMove(analysis: QuestionPatternAnalysis): string {
    if (analysis.problemQuestions === 0) {
      return 'Next time, lead with the problem: "What\'s not working the way you want?"';
    }
    if (analysis.impactQuestions === 0) {
      return 'Once you hear a problem, dig into cost: "When that happens, what\'s the impact?"';
    }
    if (analysis.valueQuestions === 0) {
      return 'After establishing impact, quantify the win: "If we solved that, what would change?"';
    }
    return 'Keep that progression: problem → impact → value.';
  }
  
  /**
   * Analyze how objections were handled
   */
  analyzeObjectionHandling(
    transcript: Array<{ role: string; content: string }>,
    objections: Array<{ timestamp: number; surface: string; addressed: boolean; resolved: boolean }>
  ): ObjectionResponseAnalysis | null {
    if (objections.length === 0) return null;
    
    let exploredBeforeResponding = 0;
    let acknowledgedConcerns = 0;
    const missedMoments: string[] = [];
    
    for (const objection of objections) {
      const response = this.analyzeObjectionResponse(transcript, objection);
      
      if (response.explored) exploredBeforeResponding++;
      if (response.acknowledged) acknowledgedConcerns++;
      
      if (!response.explored) {
        missedMoments.push('Ask "what\'s behind that?" before responding');
      }
      if (!response.acknowledged && response.explored) {
        missedMoments.push('Acknowledge their concern first: "I hear you..."');
      }
    }
    
    const score = objections.length > 0 ? 
      ((acknowledgedConcerns + exploredBeforeResponding * 2) / (objections.length * 3)) * 10 : 7;
    
    return {
      objectionsHandled: objections.length,
      exploredBeforeResponding,
      acknowledgedConcerns,
      score,
      feedback: this.generateObjectionFeedback(exploredBeforeResponding, objections.length, acknowledgedConcerns),
      missedMoments: [...new Set(missedMoments)].slice(0, 2)
    };
  }
  
  private analyzeObjectionResponse(
    transcript: Array<{ role: string; content: string }>,
    objection: { surface: string }
  ): { acknowledged: boolean; explored: boolean; responded: boolean } {
    const objectionIndex = transcript.findIndex(t => 
      t.role === 'assistant' && t.content.toLowerCase().includes(objection.surface.toLowerCase().slice(0, 20))
    );
    
    if (objectionIndex === -1) {
      return { acknowledged: false, explored: false, responded: false };
    }
    
    const nextUserTurn = transcript[objectionIndex + 1];
    if (!nextUserTurn || nextUserTurn.role !== 'user') {
      return { acknowledged: false, explored: false, responded: false };
    }
    
    const response = nextUserTurn.content.toLowerCase();
    
    const acknowledged = /\b(i hear|i understand|that makes sense|fair|got it|i see|totally)\b/.test(response);
    const explored = /\b(what|why|how|when|help me understand|tell me more|curious|behind that)\b/.test(response) && response.includes('?');
    const responded = response.length > 20;
    
    return { acknowledged, explored, responded };
  }
  
  private generateObjectionFeedback(explored: number, total: number, acknowledged: number): string {
    if (explored === total && acknowledged === total) {
      return 'Excellent - you explored their concerns before jumping to solutions.';
    }
    if (explored >= total / 2) {
      return `Good instinct to dig deeper on ${explored}/${total} objections. Keep asking "what\'s behind that?"`;
    }
    if (acknowledged >= total / 2 && explored === 0) {
      return 'You acknowledged concerns, but didn\'t explore them. Try: "Help me understand what\'s driving that?"';
    }
    return 'When they push back, pause and explore: "What specifically concerns you about that?"';
  }
  
  /**
   * Detect moments where you challenged their thinking or took control
   */
  analyzeInsightMoments(transcript: Array<{ role: string; content: string }>): InsightMomentAnalysis | null {
    const userTurns = transcript.filter(t => t.role === 'user');
    
    let reframingMoments = 0;
    let clearRecommendations = 0;
    let bestExample: string | null = null;
    
    for (const turn of userTurns) {
      const text = turn.content.toLowerCase();
      
      if (this.isReframingMoment(text)) {
        reframingMoments++;
        if (!bestExample) bestExample = turn.content;
      }
      
      if (this.isClearRecommendation(text)) {
        clearRecommendations++;
      }
    }
    
    if (reframingMoments === 0 && clearRecommendations === 0) return null;
    
    const score = Math.min(reframingMoments * 3 + clearRecommendations * 2, 10);
    
    return {
      reframingMoments,
      clearRecommendations,
      score,
      feedback: this.generateInsightFeedback(reframingMoments, clearRecommendations),
      bestExample,
      opportunity: reframingMoments === 0 ? 
        'Try reframing: "Most people focus on X, but the real issue is usually Y"' : null
    };
  }
  
  private isReframingMoment(text: string): boolean {
    const patterns = [
      /(what we see|pattern we notice|interesting thing) is/,
      /most (teams|companies|people).*(but|however|actually)/,
      /the (real|hidden|bigger) (issue|driver|cost) is/,
      /let me share (what|how|why)/,
      /here's what.*(miss|overlook|don't see)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private isClearRecommendation(text: string): boolean {
    const patterns = [
      /here's what i('d| would) (suggest|recommend)/,
      /my recommendation/,
      /what makes sense is/,
      /let's (do|try|test) this/,
      /i'd suggest we/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private generateInsightFeedback(reframes: number, recommendations: number): string {
    if (reframes >= 2 && recommendations >= 1) {
      return 'Strong - you challenged their thinking AND gave clear direction.';
    }
    if (reframes >= 1) {
      return 'Good reframe. Now add a clear next step: "Here\'s what I\'d suggest we do..."';
    }
    if (recommendations >= 1 && reframes === 0) {
      return 'You led the conversation, but try reframing their problem first to build credibility.';
    }
    return 'Opportunity: Share a non-obvious insight about their situation before pitching.';
  }
  
  /**
   * Check if they qualified the deal properly
   */
  analyzeDealQuality(transcript: Array<{ role: string; content: string }>): DealQualityAnalysis | null {
    const conversationText = transcript.map(t => t.content).join(' ').toLowerCase();
    
    const analysis: DealQualityAnalysis = {
      hasNumbers: this.hasQuantifiedMetrics(conversationText),
      knowsDecisionMaker: this.knowsWhoSignsOff(conversationText),
      understandsProcess: this.understandsHowTheyDecide(conversationText),
      identifiedPain: this.foundRealProblem(conversationText),
      hasChampion: this.hasInternalAdvocate(conversationText),
      completeness: 0,
      feedback: '',
      criticalGaps: []
    };
    
    const confirmed = [
      analysis.hasNumbers,
      analysis.knowsDecisionMaker,
      analysis.understandsProcess,
      analysis.identifiedPain,
      analysis.hasChampion
    ].filter(Boolean).length;
    
    analysis.completeness = confirmed / 5;
    
    if (!analysis.hasNumbers) {
      analysis.criticalGaps.push('Get a number: "What does that cost you per month?"');
    }
    if (!analysis.knowsDecisionMaker) {
      analysis.criticalGaps.push('Find who signs off: "When budget and risk are factors, who ultimately decides?"');
    }
    if (!analysis.hasChampion) {
      analysis.criticalGaps.push('Identify your champion: "Who internally would push for this when I\'m not around?"');
    }
    
    analysis.feedback = this.generateDealQualityFeedback(confirmed);
    
    return analysis;
  }
  
  private hasQuantifiedMetrics(text: string): boolean {
    return /(cost|save|reduce|increase|\d+(k|%|percent|hours|days|million))/.test(text);
  }
  
  private knowsWhoSignsOff(text: string): boolean {
    return /(cfo|vp|director|signs off|approves|budget owner|final say)/.test(text);
  }
  
  private understandsHowTheyDecide(text: string): boolean {
    return /(process|steps|timeline|approval|who needs to|sequence|how (do|does) (you|they) decide)/.test(text);
  }
  
  private foundRealProblem(text: string): boolean {
    return /(problem|challenge|issue|pain|struggle|difficult|breaking|costing)/.test(text);
  }
  
  private hasInternalAdvocate(text: string): boolean {
    return /(champion|advocate|sponsor|drive this|internal ally|push for|in my corner)/.test(text);
  }
  
  private generateDealQualityFeedback(confirmed: number): string {
    if (confirmed >= 4) return 'Strong qualification - you know this deal well.';
    if (confirmed >= 3) return 'Good start on qualification. Fill the gaps before moving forward.';
    if (confirmed >= 1) return 'Basic info gathered, but missing critical pieces to forecast this.';
    return 'Can\'t qualify yet. Start with: "What would need to happen for this to move forward?"';
  }
  
  /**
   * Analyze call outcome quality
   */
  analyzeOutcome(transcript: Array<{ role: string; content: string }>): CallOutcomeAnalysis {
    const lastFewTurns = transcript.slice(-4);
    const conversationText = lastFewTurns.map(t => t.content).join(' ').toLowerCase();
    
    const hasConcreteNextStep = this.hasConcreteCommitment(conversationText);
    const hasStakeholderPlan = this.hasStakeholderMention(conversationText);
    const hasMutualPlan = this.hasMutualPlanLanguage(conversationText);
    
    let type: 'concrete-next-step' | 'vague-follow-up' | 'no-commitment';
    let quality = 5;
    
    if (hasConcreteNextStep && hasStakeholderPlan) {
      type = 'concrete-next-step';
      quality = 8 + (hasMutualPlan ? 2 : 0);
    } else if (hasConcreteNextStep) {
      type = 'vague-follow-up';
      quality = 6;
    } else {
      type = 'no-commitment';
      quality = 3;
    }
    
    const stakeholders = this.extractStakeholders(conversationText);
    const commitment = this.extractCommitment(lastFewTurns);
    
    return {
      type,
      quality,
      whatYouGot: commitment,
      whoElseNeeded: stakeholders,
      hasPlan: hasMutualPlan,
      feedback: this.generateOutcomeFeedback(type, quality, hasMutualPlan, stakeholders.length)
    };
  }
  
  private hasConcreteCommitment(text: string): boolean {
    return /(next week|tomorrow|friday|monday|tuesday|wednesday|thursday|schedule|calendar|set up|book)/.test(text) &&
           /(meeting|call|demo|review|session)/.test(text);
  }
  
  private hasStakeholderMention(text: string): boolean {
    return /(security|finance|ops|team|manager|director|cfo|cto|legal|procurement)/.test(text);
  }
  
  private hasMutualPlanLanguage(text: string): boolean {
    return /(we'll|you'll|i'll|next step|action item|who|when|timeline|by when)/.test(text);
  }
  
  private extractStakeholders(text: string): string[] {
    const mentioned = [];
    if (/security/.test(text)) mentioned.push('Security');
    if (/(finance|cfo)/.test(text)) mentioned.push('Finance');
    if (/(ops|operations)/.test(text)) mentioned.push('Operations');
    if (/(it|technical|cto)/.test(text)) mentioned.push('IT/Technical');
    if (/(legal|procurement)/.test(text)) mentioned.push('Legal/Procurement');
    return mentioned;
  }
  
  private extractCommitment(turns: Array<{ role: string; content: string }>): string | null {
    for (const turn of turns.reverse()) {
      if (turn.role === 'assistant' && /(yes|sure|okay|sounds good|let's do|i can do)/.test(turn.content.toLowerCase())) {
        return turn.content.slice(0, 100);
      }
    }
    return null;
  }
  
  private generateOutcomeFeedback(type: string, quality: number, hasPlan: boolean, stakeholderCount: number): string {
    if (type === 'concrete-next-step') {
      if (hasPlan && stakeholderCount > 0) {
        return 'Excellent close - date on the calendar, stakeholders identified, shared plan.';
      }
      if (stakeholderCount > 0) {
        return 'Good advance. You got commitment and identified who else is involved.';
      }
      return 'Next step secured, but ask: "Who else needs to be in the room?"';
    }
    
    if (type === 'vague-follow-up') {
      return 'Weak commitment. Push for concrete: "When exactly works? And who else should join?"';
    }
    
    return 'No clear next step. Close with: "What\'s the smallest step we could take this week?"';
  }
  
  /**
   * Full analysis with plain-English insights
   */
  analyze(
    transcript: Array<{ role: string; content: string }>,
    objections: Array<{ timestamp: number; surface: string; addressed: boolean; resolved: boolean }>
  ): FrameworkInsights {
    const questionPattern = this.analyzeQuestionPattern(transcript);
    const objectionHandling = this.analyzeObjectionHandling(transcript, objections);
    const insightMoments = this.analyzeInsightMoments(transcript);
    const dealQuality = this.analyzeDealQuality(transcript);
    const outcome = this.analyzeOutcome(transcript);
    
    const scores = [
      questionPattern.balance === 'strong' ? 9 : questionPattern.balance === 'developing' ? 7 : questionPattern.balance === 'surface-level' ? 5 : 3,
      objectionHandling?.score || 7,
      insightMoments?.score || 5,
      outcome.quality
    ];
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const wins = [];
    const gaps = [];
    
    if (questionPattern.balance === 'strong') wins.push('Question progression (problem → impact → value)');
    else if (questionPattern.balance === 'weak' || questionPattern.balance === 'surface-level') {
      gaps.push('Discovery depth');
    }
    
    if (objectionHandling && objectionHandling.score >= 8) wins.push('Handling resistance');
    else if (objectionHandling && objectionHandling.score < 6) gaps.push('Objection exploration');
    
    if (insightMoments && insightMoments.score >= 7) wins.push('Challenging their thinking');
    else if (!insightMoments) gaps.push('Reframing problems');
    
    if (outcome.type === 'concrete-next-step') wins.push('Getting commitment');
    else gaps.push('Closing momentum');
    
    return {
      questionPattern,
      objectionHandling,
      insightMoments,
      dealQuality,
      outcome,
      overallScore,
      biggestWin: wins[0] || 'Clear communication',
      biggestGap: gaps[0] || 'Execution consistency',
      practiceThis: this.recommendPractice(gaps[0])
    };
  }
  
  private recommendPractice(gap: string | undefined): string {
    const practices: Record<string, string> = {
      'Discovery depth': 'Practice: Ask "Where does that break down?" then "What does that cost you?"',
      'Objection exploration': 'Practice: When they push back, ask "What specifically concerns you?" before responding',
      'Reframing problems': 'Practice: "Most teams think X is the issue, but it\'s usually Y" - then prove it',
      'Closing momentum': 'Practice: "What\'s the next concrete step?" and "Who else needs to be involved?"'
    };
    return practices[gap || ''] || 'Practice moving from problem to impact to value';
  }
}

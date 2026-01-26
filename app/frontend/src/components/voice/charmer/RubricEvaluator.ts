/**
 * RubricEvaluator.ts
 * LLM-based rubric scoring - judgment, not math
 */

import { CallMetrics, RubricScore } from './CallMetrics';

export class RubricEvaluator {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || '';
    this.baseUrl = '/api/openai';
  }
  
  /**
   * Generate rubric score using LLM judgment
   */
  async evaluateCall(metrics: CallMetrics): Promise<RubricScore> {
    const talkRatio = metrics.userSpeakingTime / (metrics.userSpeakingTime + metrics.marcusSpeakingTime);
    
    const prompt = `You are a sales coach evaluating a cold call. Analyze the metrics and provide a judgment-based assessment.

CALL METRICS:
- Talk Ratio: ${Math.round(talkRatio * 100)}% user / ${Math.round((1 - talkRatio) * 100)}% prospect
- Open-ended questions: ${metrics.openEndedCount}
- Follow-up questions: ${metrics.followUpCount}
- Objections raised: ${metrics.objectionsRaised}
- Objections addressed: ${metrics.objectionsAddressed}
- Objections resolved: ${metrics.objectionsResolved}
- Total exchanges: ${metrics.totalExchanges}
- Win condition: ${metrics.winCondition}

Provide your assessment in this exact JSON format:
{
  "level": "Developing|Solid|Strong|Advanced",
  "score": 0-10,
  "strengths": ["strength 1", "strength 2"],
  "bottleneck": "single biggest gap",
  "trainingPlan": {
    "teach": ["skill 1", "skill 2"],
    "challenge": ["scenario 1", "scenario 2"]
  },
  "oneLiner": "punchy summary without judgment",
  "salesDNA": "personality type (e.g., Curious Builder, Confident Closer)"
}

GUIDELINES:
- Never rate below 4/10 (always "Developing" minimum)
- Rarely rate above 9/10 (keep room for growth)
- Most calls land in 6-8 range
- oneLiner should be empowering but honest (e.g., "You sound credible. You just missed the moment they pushed back.")
- salesDNA should feel like identity, not judgment
- trainingPlan.teach should be specific skills, not vague advice
- trainingPlan.challenge should be concrete scenarios
- strengths should validate real wins
- bottleneck should be actionable, not shaming

Return ONLY the JSON, no other text.`;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a sales coach providing judgment-based assessments. Output only valid JSON.' },
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
      
      // Parse LLM response
      const evaluation = JSON.parse(content);
      
      return evaluation as RubricScore;
      
    } catch (error) {
      console.error('Rubric evaluation error:', error);
      
      // Fallback scoring
      return this.generateFallbackScore(metrics);
    }
  }
  
  /**
   * Fallback scoring if LLM fails
   */
  private generateFallbackScore(metrics: CallMetrics): RubricScore {
    const talkRatio = metrics.userSpeakingTime / (metrics.userSpeakingTime + metrics.marcusSpeakingTime);
    const talkPercent = Math.round(talkRatio * 100);
    
    // Simple heuristic scoring
    let score = 5.0;
    
    // Talk ratio scoring
    if (talkPercent >= 40 && talkPercent <= 60) score += 1.5;
    else if (talkPercent >= 30 && talkPercent <= 70) score += 0.5;
    
    // Discovery scoring
    if (metrics.openEndedCount >= 3) score += 1.5;
    if (metrics.followUpCount >= 2) score += 1.0;
    
    // Objection handling
    if (metrics.objectionsRaised > 0) {
      const resolvedRatio = metrics.objectionsResolved / metrics.objectionsRaised;
      score += resolvedRatio * 2;
    }
    
    score = Math.min(score, 10);
    
    // Determine level
    let level: RubricScore['level'];
    if (score < 5) level = 'Developing';
    else if (score < 7) level = 'Solid';
    else if (score < 8.5) level = 'Strong';
    else level = 'Advanced';
    
    // Generate sales DNA based on strengths
    let salesDNA = 'The Explorer';
    if (metrics.openEndedCount >= 4) salesDNA = 'Curious Builder';
    if (talkRatio > 0.6) salesDNA = 'Confident Closer';
    if (metrics.objectionsResolved >= 2) salesDNA = 'Smooth Navigator';
    
    return {
      level,
      score: Math.round(score * 10) / 10,
      strengths: this.identifyStrengths(metrics, talkRatio),
      bottleneck: this.identifyBottleneck(metrics, talkRatio),
      trainingPlan: {
        teach: this.generateTeachingPlan(metrics),
        challenge: this.generateChallengePlan(metrics)
      },
      oneLiner: this.generateOneLiner(metrics, score),
      salesDNA
    };
  }
  
  private identifyStrengths(metrics: CallMetrics, talkRatio: number): string[] {
    const strengths: string[] = [];
    
    if (metrics.openEndedCount >= 3) strengths.push('Strong discovery mindset');
    if (talkRatio >= 0.4 && talkRatio <= 0.6) strengths.push('Natural conversation flow');
    if (metrics.objectionsAddressed === metrics.objectionsRaised) strengths.push('Acknowledged all resistance');
    if (metrics.followUpCount >= 2) strengths.push('Active listening');
    if (metrics.winCondition === 'booked') strengths.push('Secured commitment');
    
    // Default if no clear strengths
    if (strengths.length === 0) {
      strengths.push('Clear communication', 'Professional presence');
    }
    
    return strengths.slice(0, 2);
  }
  
  private identifyBottleneck(metrics: CallMetrics, talkRatio: number): string {
    // Prioritize objection handling if poor
    if (metrics.objectionsRaised > 0 && metrics.objectionsResolved === 0) {
      return 'Objection recognition';
    }
    
    // Talk ratio issues
    if (talkRatio < 0.3) return 'Leading the conversation';
    if (talkRatio > 0.7) return 'Active listening';
    
    // Discovery issues
    if (metrics.openEndedCount < 2) return 'Discovery questions';
    
    // Default
    return 'Objection handling confidence';
  }
  
  private generateTeachingPlan(metrics: CallMetrics): string[] {
    const plan: string[] = [];
    
    if (metrics.objectionsResolved < metrics.objectionsRaised) {
      plan.push('Spot hidden objections', 'Confirm before moving on');
    }
    if (metrics.openEndedCount < 3) {
      plan.push('Open-ended discovery techniques');
    }
    
    return plan.slice(0, 2);
  }
  
  private generateChallengePlan(metrics: CallMetrics): string[] {
    const challenges: string[] = [];
    
    if (metrics.objectionsResolved < metrics.objectionsRaised) {
      challenges.push('Prospects who object indirectly', 'Faster objection chains');
    } else {
      challenges.push('More skeptical prospects', 'Higher-stakes scenarios');
    }
    
    return challenges.slice(0, 2);
  }
  
  private generateOneLiner(metrics: CallMetrics, score: number): string {
    if (score >= 8) return 'You sound credible and confident. Keep that energy.';
    if (score >= 6) return 'You sound credible. You just need sharper pattern recognition.';
    return 'Solid foundation. Focus on reading between the lines.';
  }
}

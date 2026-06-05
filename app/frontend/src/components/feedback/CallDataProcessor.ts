/**
 * CallDataProcessor.ts
 * Processes real call data and generates metrics for the advanced feedback dashboard
 * Integrates with MomentRankingEngine and SalesPsychologyEngine
 */

import { MomentRankingEngine, type RankedMoment } from './MomentRankingEngine';
import { SalesPsychologyEngine, type MomentAnalysis } from './SalesPsychologyEngine';

export interface ProcessedCallData {
  callMetrics: {
    readinessScore: number;
    duration: string;
    painFound: number;
    objectionsHandled: string;
    demoScheduled: string;
    sentiment: Array<{
      timestamp: number;
      value: number;
      label: string;
    }>;
    tags: Array<{
      text: string;
      type: 'success' | 'warning' | 'info';
    }>;
  };
  moments: Array<{
    id: string;
    title: string;
    category: string;
    beforeScore: number;
    afterScore?: number;
    scenario: string;
    userResponse?: string;
    feedback: {
      summary: string;
      psychologyCheck: {
        question: string;
        options: Array<{
          letter: 'A' | 'B' | 'C';
          text: string;
          isCorrect: boolean;
          explanation: string;
        }>;
      };
      whyItMatters: string;
      howToImprove: string;
    };
  }>;
}

export class CallDataProcessor {
  /**
   * Process raw call data into sophisticated feedback
   */
  static async processCall(
    conversationHistory: Array<{ role: string; content: string }>,
    callDuration: number,
    buyerState?: any,
    strategicMoments?: any[]
  ): Promise<ProcessedCallData> {
    
    // Extract basic metrics
    const basicMetrics = this.extractBasicMetrics(conversationHistory, callDuration);
    
    // Rank moments using intelligent analysis
    const rankedMoments = MomentRankingEngine.rankMoments(conversationHistory, basicMetrics);
    
    // Generate psychology analysis for top moments
    const momentAnalyses = await this.generateMomentAnalyses(rankedMoments);
    
    // Calculate readiness score
    const readinessScore = this.calculateReadinessScore(basicMetrics, rankedMoments);
    
    // Generate sentiment timeline
    const sentimentTimeline = this.generateSentimentTimeline(conversationHistory);
    
    // Generate insight tags
    const insightTags = this.generateInsightTags(rankedMoments);

    return {
      callMetrics: {
        readinessScore,
        duration: this.formatDuration(callDuration),
        painFound: basicMetrics.painPointsFound,
        objectionsHandled: `${basicMetrics.objectionsHandled}/${basicMetrics.objectionsRaised}`,
        demoScheduled: basicMetrics.demoScheduled ? 'Tue 2pm' : 'No',
        sentiment: sentimentTimeline,
        tags: insightTags
      },
      moments: momentAnalyses.map(analysis => ({
        id: analysis.moment.id,
        title: analysis.moment.title,
        category: analysis.moment.shortDescription,
        beforeScore: analysis.moment.beforeScore,
        afterScore: analysis.moment.afterPotential,
        scenario: analysis.practiceScenario.setup,
        feedback: {
          summary: analysis.insight.explanation,
          psychologyCheck: analysis.multipleChoice,
          whyItMatters: analysis.insight.whyItMatters,
          howToImprove: analysis.insight.howToApply
        }
      }))
    };
  }

  /**
   * Extract basic metrics from conversation
   */
  private static extractBasicMetrics(
    conversationHistory: Array<{ role: string; content: string }>,
    callDuration: number
  ) {
    let painPointsFound = 0;
    let objectionsRaised = 0;
    let objectionsHandled = 0;
    let demoScheduled = false;
    let questionCount = 0;
    let featureMentions = 0;

    conversationHistory.forEach((message, index) => {
      const content = message.content.toLowerCase();
      
      if (message.role === 'assistant') {
        // Marcus responses - look for pain signals and objections
        const painSignals = ['struggling', 'difficult', 'problem', 'issue', 'challenge', 'frustrated', 'headache'];
        const objectionSignals = ['expensive', 'costly', 'budget', 'price', 'too much', 'not sure', 'maybe'];
        
        if (painSignals.some(signal => content.includes(signal))) {
          painPointsFound++;
        }
        
        if (objectionSignals.some(signal => content.includes(signal))) {
          objectionsRaised++;
        }
        
        if (content.includes('demo') || content.includes('meeting') || content.includes('schedule')) {
          demoScheduled = true;
        }
      } else {
        // User responses - analyze technique
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'tell me', 'describe'];
        const featureWords = ['feature', 'capability', 'function', 'includes', 'offers', 'provides'];
        const handlingWords = ['understand', 'makes sense', 'let me ask', 'what if', 'consider'];
        
        if (questionWords.some(word => content.includes(word))) {
          questionCount++;
        }
        
        if (featureWords.some(word => content.includes(word))) {
          featureMentions++;
        }
        
        // Check if previous message was an objection and this handles it well
        const prevMessage = conversationHistory[index - 1];
        if (prevMessage && prevMessage.role === 'assistant') {
          const hadObjection = ['expensive', 'costly', 'budget', 'price'].some(word => 
            prevMessage.content.toLowerCase().includes(word)
          );
          const handledWell = handlingWords.some(word => content.includes(word));
          
          if (hadObjection && handledWell) {
            objectionsHandled++;
          }
        }
      }
    });

    return {
      painPointsFound,
      objectionsRaised,
      objectionsHandled,
      demoScheduled,
      questionCount,
      featureMentions,
      totalTurns: conversationHistory.length / 2
    };
  }

  /**
   * Generate psychology analysis for ranked moments
   */
  private static async generateMomentAnalyses(rankedMoments: RankedMoment[]): Promise<MomentAnalysis[]> {
    return rankedMoments.slice(0, 3).map(moment => 
      SalesPsychologyEngine.analyzeMoment(moment)
    );
  }

  /**
   * Calculate overall readiness score
   */
  private static calculateReadinessScore(basicMetrics: any, rankedMoments: RankedMoment[]): number {
    let score = 50; // Base score
    
    // Positive factors
    score += Math.min(basicMetrics.painPointsFound * 8, 24); // Max 24 points for pain discovery
    score += Math.min(basicMetrics.questionCount * 3, 15); // Max 15 points for questions
    score += basicMetrics.objectionsHandled * 5; // 5 points per objection handled
    if (basicMetrics.demoScheduled) score += 10;
    
    // Negative factors
    score -= Math.min(basicMetrics.featureMentions * 5, 20); // Penalty for feature dumping
    score -= rankedMoments.filter(m => m.category === 'critical_mistake').length * 8;
    
    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate sentiment timeline from conversation
   */
  private static generateSentimentTimeline(
    conversationHistory: Array<{ role: string; content: string }>
  ) {
    const timeline: Array<{ timestamp: number; value: number; label: string }> = [];
    let currentSentiment = 50; // Start neutral
    
    conversationHistory.forEach((message, index) => {
      if (message.role === 'assistant') {
        const content = message.content.toLowerCase();
        
        // Analyze Marcus's sentiment
        if (content.includes('interested') || content.includes('sounds good') || content.includes('tell me more')) {
          currentSentiment = Math.min(100, currentSentiment + 15);
        } else if (content.includes('not sure') || content.includes('maybe') || content.includes('busy')) {
          currentSentiment = Math.max(0, currentSentiment - 10);
        } else if (content.includes('expensive') || content.includes('budget') || content.includes('costly')) {
          currentSentiment = Math.max(0, currentSentiment - 20);
        } else if (content.includes('demo') || content.includes('meeting')) {
          currentSentiment = Math.min(100, currentSentiment + 25);
        }
        
        let label = '';
        if (content.includes('demo') || content.includes('meeting')) {
          label = 'Demo scheduled';
        } else if (content.includes('budget') || content.includes('expensive')) {
          label = 'Led with features';
        } else if (index < 4) {
          label = 'Pivoted to Q4';
        }
        
        timeline.push({
          timestamp: index * 30, // Approximate seconds
          value: currentSentiment,
          label
        });
      }
    });
    
    return timeline;
  }

  /**
   * Generate insight tags based on call analysis
   */
  private static generateInsightTags(rankedMoments: RankedMoment[]) {
    const tags: Array<{ text: string; type: 'success' | 'warning' | 'info' }> = [];
    
    // Analyze moment types
    const criticalMistakes = rankedMoments.filter(m => m.category === 'critical_mistake');
    const missedOpportunities = rankedMoments.filter(m => m.category === 'missed_opportunity');
    const psychologyLessons = rankedMoments.filter(m => m.category === 'psychology_lesson');
    
    if (criticalMistakes.length > 0) {
      tags.push({ text: 'Too brief', type: 'warning' });
    }
    
    if (missedOpportunities.length > 0) {
      tags.push({ text: 'Uncovered pain', type: 'success' });
    }
    
    if (psychologyLessons.length > 0) {
      tags.push({ text: 'Good pivot', type: 'success' });
    }
    
    // Add specific insights
    const allPrinciples = rankedMoments.flatMap(m => m.psychologyPrinciples);
    
    if (allPrinciples.includes('feature_vs_benefit')) {
      tags.push({ text: 'Led with features', type: 'warning' });
    }
    
    if (allPrinciples.includes('pain_amplification')) {
      tags.push({ text: 'Uncovered pain', type: 'success' });
    }
    
    if (allPrinciples.includes('discovery_technique')) {
      tags.push({ text: 'Good pivot', type: 'success' });
    }
    
    tags.push({ text: 'Aim for 2min', type: 'info' });
    
    return tags.slice(0, 4); // Limit to 4 tags
  }

  /**
   * Format call duration
   */
  private static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
  }

  /**
   * Generate sample data for testing
   */
  static generateSampleData(): ProcessedCallData {
    return {
      callMetrics: {
        readinessScore: 68,
        duration: '48s',
        painFound: 1,
        objectionsHandled: '0/2',
        demoScheduled: 'Tue 2pm',
        sentiment: [
          { timestamp: 0, value: 50, label: '' },
          { timestamp: 30, value: 40, label: 'Led with features' },
          { timestamp: 60, value: 65, label: 'Pivoted to Q4' },
          { timestamp: 90, value: 85, label: 'Demo scheduled' }
        ],
        tags: [
          { text: 'Uncovered pain', type: 'success' },
          { text: 'Good pivot', type: 'success' },
          { text: 'Too brief', type: 'warning' },
          { text: 'Aim for 2min', type: 'info' }
        ]
      },
      moments: [
        {
          id: 'moment_1',
          title: 'Feature Dumping Alert',
          category: 'led with features',
          beforeScore: 4.2,
          afterScore: 7.8,
          scenario: 'You cold-called Marcus at NexaCorp. He answered the phone.',
          feedback: {
            summary: 'You used you instead of him effectively. Score improved from 4.2 to 7.8.',
            psychologyCheck: {
              question: "Marcus knows you're a sales rep. Why did talking about your 20% feature make him reject you?",
              options: [
                {
                  letter: 'A',
                  text: "People trust you less when you brag about your product",
                  isCorrect: false,
                  explanation: "While bragging can hurt trust, this isn't the core psychological issue here."
                },
                {
                  letter: 'B',
                  text: "When you talk about HIS problems, his brain is too busy to think 'sales pitch'",
                  isCorrect: true,
                  explanation: "Correct! People can't multitask. When you talk about Marcus's problems, his brain is fully occupied with his own world. He doesn't have spare mental bandwidth to keep thinking 'this person is selling to me.' But when you talk about yourself, his brain has room to categorize you as 'just another sales rep' and shut down."
                },
                {
                  letter: 'C',
                  text: "He doesn't care about your product's numbers until he likes you first",
                  isCorrect: false,
                  explanation: "While rapport matters, this specific situation is about cognitive load and attention management."
                }
              ]
            },
            whyItMatters: "People can't multitask. When you talk about Marcus's problems, his brain is fully occupied with his own world. He doesn't have spare mental bandwidth to keep thinking 'this person is selling to me.' But when you talk about yourself, his brain has room to categorize you as 'just another sales rep' and shut down.",
            howToImprove: "Always lead with their world, not yours. Ask about their challenges before mentioning your solution."
          }
        }
      ]
    };
  }
}

/**
 * CriticalMomentDetector.ts
 * Identifies the 1-2 most impactful moments from a call
 */

import { ConversationTranscript, ConversationExchange, CriticalMoment } from './ConversationTranscript';

export class CriticalMomentDetector {
  /**
   * Analyze transcript and find the most critical moments
   * Returns max 2 moments, prioritized by impact
   */
  detectCriticalMoments(transcript: ConversationTranscript): CriticalMoment[] {
    const moments: CriticalMoment[] = [];
    
    // Find resistance spikes
    const resistanceSpikes = this.findResistanceSpikes(transcript);
    moments.push(...resistanceSpikes);
    
    // Find missed trust windows
    const missedWindows = this.findMissedTrustWindows(transcript);
    moments.push(...missedWindows);
    
    // Find objection mishandling
    const objectionMisses = this.findObjectionMishandling(transcript);
    moments.push(...objectionMisses);
    
    // Sort by severity and return top 2
    return moments
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 2);
  }
  
  /**
   * Find moments where resistance increased significantly
   */
  private findResistanceSpikes(transcript: ConversationTranscript): CriticalMoment[] {
    const spikes: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 1; i < exchanges.length; i++) {
      const prev = exchanges[i - 1];
      const curr = exchanges[i];
      
      // Look for Marcus responses where resistance jumped
      if (curr.speaker === 'marcus' && 
          prev.resistanceLevel !== undefined && 
          curr.resistanceLevel !== undefined) {
        
        const resistanceIncrease = curr.resistanceLevel - prev.resistanceLevel;
        
        // Spike = resistance increased by 2+ points
        if (resistanceIncrease >= 2) {
          // Find the user message that triggered this
          const userMessage = this.findPreviousUserMessage(exchanges, i);
          
          if (userMessage) {
            spikes.push({
              id: `spike_${curr.id}`,
              timestamp: curr.timestamp,
              type: 'resistance_spike',
              severity: resistanceIncrease / 10, // 0-1 scale
              userMessage: userMessage.text,
              marcusResponse: curr.text,
              resistanceBefore: prev.resistanceLevel,
              resistanceAfter: curr.resistanceLevel,
              whatHappened: `Resistance jumped from ${prev.resistanceLevel} → ${curr.resistanceLevel}`,
              hiddenOpportunity: 'User pushed too hard or missed the real concern'
            });
          }
        }
      }
    }
    
    return spikes;
  }
  
  /**
   * Find moments where Marcus showed vulnerability but user responded with a pitch
   */
  private findMissedTrustWindows(transcript: ConversationTranscript): CriticalMoment[] {
    const missed: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    
    // Vulnerability signals
    const vulnerabilityPatterns = [
      /\b(tight|swamped|busy|struggling|overwhelmed|concerned|worried|not sure)\b/i,
      /\b(don't have|can't|hard to|difficult|challenge|problem)\b/i,
      /\b(budget|time|bandwidth|resources|capacity)\b/i
    ];
    
    // Pitch signals (user responding with features/benefits instead of questions)
    const pitchPatterns = [
      /\b(we offer|we provide|our solution|it includes|features|helps you|you'll be able to)\b/i,
      /\b(better|improve|increase|optimize|enhance)\b/i
    ];
    
    for (let i = 0; i < exchanges.length - 1; i++) {
      const marcusMsg = exchanges[i];
      const userMsg = exchanges[i + 1];
      
      if (marcusMsg.speaker === 'marcus' && userMsg.speaker === 'user') {
        // Check if Marcus showed vulnerability
        const showedVulnerability = vulnerabilityPatterns.some(pattern => 
          pattern.test(marcusMsg.text)
        );
        
        // Check if user responded with pitch instead of question
        const respondedWithPitch = pitchPatterns.some(pattern => 
          pattern.test(userMsg.text)
        );
        
        const askedQuestion = /\?/.test(userMsg.text);
        
        if (showedVulnerability && respondedWithPitch && !askedQuestion) {
          missed.push({
            id: `trust_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'trust_window',
            severity: 0.7, // High severity - these are precious
            userMessage: userMsg.text,
            marcusResponse: this.findNextMarcusMessage(exchanges, i + 1)?.text || '',
            resistanceBefore: marcusMsg.resistanceLevel || 0,
            resistanceAfter: this.findNextMarcusMessage(exchanges, i + 1)?.resistanceLevel || 0,
            whatHappened: 'Marcus revealed a concern, but user pitched instead of exploring',
            hiddenOpportunity: 'Ask about the underlying problem, not just the symptom'
          });
        }
      }
    }
    
    return missed;
  }
  
  /**
   * Find moments where Marcus raised an objection but user didn't address it
   */
  private findObjectionMishandling(transcript: ConversationTranscript): CriticalMoment[] {
    const mishandled: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 0; i < exchanges.length - 1; i++) {
      const marcusMsg = exchanges[i];
      const userMsg = exchanges[i + 1];
      
      if (marcusMsg.speaker === 'marcus' && 
          marcusMsg.objectionTriggered && 
          userMsg.speaker === 'user') {
        
        // Check if user acknowledged the objection
        const objectionWords = this.extractKeyWords(marcusMsg.text);
        const userAcknowledged = objectionWords.some(word => 
          userMsg.text.toLowerCase().includes(word.toLowerCase())
        );
        
        if (!userAcknowledged) {
          const nextMarcus = this.findNextMarcusMessage(exchanges, i + 1);
          
          mishandled.push({
            id: `objection_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'objection_mishandled',
            severity: 0.8, // Very high severity
            userMessage: userMsg.text,
            marcusResponse: nextMarcus?.text || '',
            resistanceBefore: marcusMsg.resistanceLevel || 0,
            resistanceAfter: nextMarcus?.resistanceLevel || 0,
            whatHappened: `Marcus raised "${marcusMsg.objectionTriggered}" but it wasn't addressed`,
            hiddenOpportunity: 'Acknowledge the objection before moving forward'
          });
        }
      }
    }
    
    return mishandled;
  }
  
  /**
   * Helper: Find the previous user message before index
   */
  private findPreviousUserMessage(exchanges: ConversationExchange[], beforeIndex: number): ConversationExchange | null {
    for (let i = beforeIndex - 1; i >= 0; i--) {
      if (exchanges[i].speaker === 'user') {
        return exchanges[i];
      }
    }
    return null;
  }
  
  /**
   * Helper: Find the next Marcus message after index
   */
  private findNextMarcusMessage(exchanges: ConversationExchange[], afterIndex: number): ConversationExchange | null {
    for (let i = afterIndex + 1; i < exchanges.length; i++) {
      if (exchanges[i].speaker === 'marcus') {
        return exchanges[i];
      }
    }
    return null;
  }
  
  /**
   * Helper: Extract key words from a sentence (for objection matching)
   */
  private extractKeyWords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were', 'be', 'have', 'has'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w));
    
    return words.slice(0, 5); // Top 5 key words
  }
}

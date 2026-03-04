/**
 * CriticalMomentDetector.ts
 * Identifies the 1-2 most impactful moments from a call
 */

import { ConversationTranscript, ConversationExchange, CriticalMoment, SuccessfulMoment } from './ConversationTranscript';

export class CriticalMomentDetector {
  /**
   * Detect successful moments - what they did right
   * Returns max 3 wins, prioritized by impact
   */
  detectSuccessfulMoments(transcript: ConversationTranscript): SuccessfulMoment[] {
    const successes: SuccessfulMoment[] = [];
    
    // Find resistance drops
    const resistanceDrops = this.findResistanceDrops(transcript);
    successes.push(...resistanceDrops);
    
    // Find pain discoveries
    const painDiscoveries = this.findPainDiscoveries(transcript);
    successes.push(...painDiscoveries);
    
    // Find clean objection handling
    const objectionHandling = this.findCleanObjectionHandling(transcript);
    successes.push(...objectionHandling);
    
    // Find active listening
    const activeListening = this.findActiveListening(transcript);
    successes.push(...activeListening);
    
    // Find brevity wins
    const brevityWins = this.findBrevityWins(transcript);
    successes.push(...brevityWins);
    
    // Find permission-based opener
    const permissionOpener = this.findPermissionOpener(transcript);
    if (permissionOpener) successes.push(permissionOpener);
    
    // Sort by impact and return top 3
    return successes
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);
  }
  /**
   * Analyze transcript and find the most critical moments
   * Returns max 5 moments, prioritized by impact
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
    
    // NEW: Find rambling responses
    const rambling = this.findRambling(transcript);
    moments.push(...rambling);
    
    // NEW: Find repetition
    const repetition = this.findRepetition(transcript);
    moments.push(...repetition);
    
    // NEW: Find tone issues
    const toneIssues = this.findToneIssues(transcript);
    moments.push(...toneIssues);
    
    // NEW: Find missed pain signals
    const missedPain = this.findMissedPainSignals(transcript);
    moments.push(...missedPain);
    
    // Sort by severity and return top 5
    return moments
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 5);
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
  
  /**
   * NEW: Find rambling - user responses longer than 15 seconds
   */
  private findRambling(transcript: ConversationTranscript): CriticalMoment[] {
    const rambling: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 0; i < exchanges.length; i++) {
      const userMsg = exchanges[i];
      
      if (userMsg.speaker === 'user') {
        // Estimate duration: ~150 words per minute = 2.5 words per second
        const wordCount = userMsg.text.split(/\s+/).length;
        const estimatedSeconds = wordCount / 2.5;
        
        if (estimatedSeconds > 15) {
          const nextMarcus = this.findNextMarcusMessage(exchanges, i);
          
          rambling.push({
            id: `ramble_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'rambling',
            severity: 0.6,
            userMessage: userMsg.text,
            marcusResponse: nextMarcus?.text || '',
            resistanceBefore: userMsg.resistanceLevel || 0,
            resistanceAfter: nextMarcus?.resistanceLevel || 0,
            whatHappened: `User spoke for ~${Math.round(estimatedSeconds)} seconds - too long`,
            hiddenOpportunity: 'Keep responses under 10 seconds. Ask questions, don\'t monologue.'
          });
        }
      }
    }
    
    return rambling;
  }
  
  /**
   * NEW: Find repetition - asking the same question twice
   */
  private findRepetition(transcript: ConversationTranscript): CriticalMoment[] {
    const repetitions: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    const userMessages: ConversationExchange[] = exchanges.filter(e => e.speaker === 'user');
    
    for (let i = 0; i < userMessages.length; i++) {
      for (let j = i + 1; j < userMessages.length; j++) {
        const msg1 = userMessages[i].text.toLowerCase();
        const msg2 = userMessages[j].text.toLowerCase();
        
        // Check for very similar messages (>70% word overlap)
        const words1 = new Set(msg1.split(/\s+/));
        const words2 = new Set(msg2.split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const similarity = intersection.size / Math.min(words1.size, words2.size);
        
        if (similarity > 0.7 && msg1.length > 20) {
          const nextMarcus = this.findNextMarcusMessage(exchanges, exchanges.indexOf(userMessages[j]));
          
          repetitions.push({
            id: `repeat_${userMessages[j].id}`,
            timestamp: userMessages[j].timestamp,
            type: 'repetition',
            severity: 0.75,
            userMessage: userMessages[j].text,
            marcusResponse: nextMarcus?.text || '',
            resistanceBefore: userMessages[i].resistanceLevel || 0,
            resistanceAfter: nextMarcus?.resistanceLevel || 0,
            whatHappened: 'User repeated the same question - shows they weren\'t listening',
            hiddenOpportunity: 'If you didn\'t get the answer you wanted, reframe the question differently.'
          });
          break; // Only flag once per message
        }
      }
    }
    
    return repetitions;
  }
  
  /**
   * NEW: Find tone issues - demanding or aggressive language
   */
  private findToneIssues(transcript: ConversationTranscript): CriticalMoment[] {
    const toneIssues: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    
    const demandingPatterns = [
      /\b(answer my question|listen|you need to|you have to|you should)\b/i,
      /\b(are you|can you answer|just tell me)\b.*\?/i,
      /\bcould you answer\b/i
    ];
    
    for (let i = 0; i < exchanges.length; i++) {
      const userMsg = exchanges[i];
      
      if (userMsg.speaker === 'user') {
        const hasDemandingTone = demandingPatterns.some(pattern => pattern.test(userMsg.text));
        
        if (hasDemandingTone) {
          const nextMarcus = this.findNextMarcusMessage(exchanges, i);
          
          toneIssues.push({
            id: `tone_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'tone_issue',
            severity: 0.8,
            userMessage: userMsg.text,
            marcusResponse: nextMarcus?.text || '',
            resistanceBefore: userMsg.resistanceLevel || 0,
            resistanceAfter: nextMarcus?.resistanceLevel || 0,
            whatHappened: 'Tone shifted to demanding - prospects shut down when pushed',
            hiddenOpportunity: 'Stay curious, not combative. "Help me understand..." not "Answer my question."'
          });
        }
      }
    }
    
    return toneIssues;
  }
  
  /**
   * NEW: Find missed pain signals - Marcus volunteers pain but user doesn't explore
   */
  private findMissedPainSignals(transcript: ConversationTranscript): CriticalMoment[] {
    const missedPain: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    
    const painSignals = [
      /\b(leads? bounce|losing|miss|waste|struggle|frustrat|problem|issue|concern)\b/i,
      /\b(not sure|don't know|can't tell|unclear)\b/i,
      /\b(could be better|room for improvement|wish|would like)\b/i
    ];
    
    for (let i = 0; i < exchanges.length - 1; i++) {
      const marcusMsg = exchanges[i];
      const userMsg = exchanges[i + 1];
      
      if (marcusMsg.speaker === 'marcus' && userMsg.speaker === 'user') {
        const volunteersPain = painSignals.some(pattern => pattern.test(marcusMsg.text));
        const asksFollowUp = /\?/.test(userMsg.text);
        const pitches = /\b(we offer|we help|our solution|what we do)\b/i.test(userMsg.text);
        
        if (volunteersPain && (!asksFollowUp || pitches)) {
          const nextMarcus = this.findNextMarcusMessage(exchanges, i + 1);
          
          missedPain.push({
            id: `painmiss_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'missed_pain',
            severity: 0.85,
            userMessage: userMsg.text,
            marcusResponse: nextMarcus?.text || '',
            resistanceBefore: marcusMsg.resistanceLevel || 0,
            resistanceAfter: nextMarcus?.resistanceLevel || 0,
            whatHappened: 'Marcus volunteered a pain point but user didn\'t dig deeper',
            hiddenOpportunity: 'Ask: "Tell me more about that" or "How is that affecting you?"'
          });
        }
      }
    }
    
    return missedPain;
  }
  
  /**
   * SUCCESS DETECTORS
   */
  
  /**
   * Find moments where resistance dropped significantly
   */
  private findResistanceDrops(transcript: ConversationTranscript): SuccessfulMoment[] {
    const drops: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 1; i < exchanges.length; i++) {
      const prev = exchanges[i - 1];
      const curr = exchanges[i];
      
      if (curr.speaker === 'marcus' && 
          prev.resistanceLevel !== undefined && 
          curr.resistanceLevel !== undefined) {
        
        const resistanceDecrease = prev.resistanceLevel - curr.resistanceLevel;
        
        if (resistanceDecrease >= 2) {
          const userMessage = this.findPreviousUserMessage(exchanges, i);
          
          if (userMessage) {
            drops.push({
              id: `drop_${curr.id}`,
              timestamp: curr.timestamp,
              type: 'resistance_drop',
              impact: resistanceDecrease / 10,
              userMessage: userMessage.text,
              marcusResponse: curr.text,
              resistanceBefore: prev.resistanceLevel,
              resistanceAfter: curr.resistanceLevel,
              whatHappened: `Your question lowered his guard from ${prev.resistanceLevel} → ${curr.resistanceLevel}`,
              whyItWorked: 'You earned trust through genuine curiosity, not pitching'
            });
          }
        }
      }
    }
    
    return drops;
  }
  
  /**
   * Find moments where Marcus revealed pain points
   */
  private findPainDiscoveries(transcript: ConversationTranscript): SuccessfulMoment[] {
    const discoveries: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 0; i < exchanges.length; i++) {
      const marcusMsg = exchanges[i];
      
      if (marcusMsg.speaker === 'marcus' && marcusMsg.painPointRevealed) {
        const prevUser = this.findPreviousUserMessage(exchanges, i);
        
        if (prevUser) {
          discoveries.push({
            id: `pain_${marcusMsg.id}`,
            timestamp: marcusMsg.timestamp,
            type: 'pain_discovery',
            impact: 0.8,
            userMessage: prevUser.text,
            marcusResponse: marcusMsg.text,
            resistanceBefore: prevUser.resistanceLevel || 0,
            resistanceAfter: marcusMsg.resistanceLevel || 0,
            whatHappened: `He opened up about: "${marcusMsg.painPointRevealed}"`,
            whyItWorked: 'You built enough rapport for him to volunteer this - that\'s trust',
            repeatThis: 'Ask open-ended questions and give space for them to share'
          });
        }
      }
    }
    
    return discoveries;
  }
  
  /**
   * Find clean objection handling - acknowledged before moving on
   */
  private findCleanObjectionHandling(transcript: ConversationTranscript): SuccessfulMoment[] {
    const handled: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 0; i < exchanges.length - 1; i++) {
      const marcusMsg = exchanges[i];
      const userMsg = exchanges[i + 1];
      
      if (marcusMsg.speaker === 'marcus' && 
          marcusMsg.objectionTriggered && 
          userMsg.speaker === 'user') {
        
        const objectionWords = this.extractKeyWords(marcusMsg.text);
        const userAcknowledged = objectionWords.some(word => 
          userMsg.text.toLowerCase().includes(word.toLowerCase())
        );
        
        if (userAcknowledged) {
          const nextMarcus = this.findNextMarcusMessage(exchanges, i + 1);
          
          handled.push({
            id: `handled_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'objection_handled',
            impact: 0.75,
            userMessage: userMsg.text,
            marcusResponse: nextMarcus?.text || '',
            resistanceBefore: marcusMsg.resistanceLevel || 0,
            resistanceAfter: nextMarcus?.resistanceLevel || 0,
            whatHappened: `You acknowledged "${marcusMsg.objectionTriggered}" before moving forward`,
            whyItWorked: 'People need to feel heard before they\'ll listen to you',
            repeatThis: 'Always validate the concern first, then address it'
          });
        }
      }
    }
    
    return handled;
  }
  
  /**
   * Find active listening - user referenced Marcus's words
   */
  private findActiveListening(transcript: ConversationTranscript): SuccessfulMoment[] {
    const listening: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 1; i < exchanges.length; i++) {
      const userMsg = exchanges[i];
      
      if (userMsg.speaker === 'user') {
        // Look at last 2 Marcus messages
        const recentMarcus = exchanges.slice(0, i)
          .filter(e => e.speaker === 'marcus')
          .slice(-2);
        
        for (const marcusMsg of recentMarcus) {
          const marcusWords = this.extractKeyWords(marcusMsg.text);
          const referenced = marcusWords.filter(word => 
            userMsg.text.toLowerCase().includes(word.toLowerCase())
          );
          
          if (referenced.length >= 2) {
            const nextMarcus = this.findNextMarcusMessage(exchanges, i);
            
            listening.push({
              id: `listen_${userMsg.id}`,
              timestamp: userMsg.timestamp,
              type: 'active_listening',
              impact: 0.6,
              userMessage: userMsg.text,
              marcusResponse: nextMarcus?.text || '',
              resistanceBefore: userMsg.resistanceLevel || 0,
              resistanceAfter: nextMarcus?.resistanceLevel || 0,
              whatHappened: `You referenced his words: "${referenced.join(', ')}"`,
              whyItWorked: 'Mirroring shows you\'re listening, builds instant rapport'
            });
            break; // Only flag once per message
          }
        }
      }
    }
    
    return listening;
  }
  
  /**
   * Find brevity wins - short responses with questions
   */
  private findBrevityWins(transcript: ConversationTranscript): SuccessfulMoment[] {
    const wins: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 0; i < exchanges.length; i++) {
      const userMsg = exchanges[i];
      
      if (userMsg.speaker === 'user') {
        const wordCount = userMsg.text.split(/\s+/).length;
        const hasQuestion = /\?/.test(userMsg.text);
        
        if (wordCount <= 25 && hasQuestion) {
          const nextMarcus = this.findNextMarcusMessage(exchanges, i);
          
          wins.push({
            id: `brevity_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'brevity_win',
            impact: 0.5,
            userMessage: userMsg.text,
            marcusResponse: nextMarcus?.text || '',
            resistanceBefore: userMsg.resistanceLevel || 0,
            resistanceAfter: nextMarcus?.resistanceLevel || 0,
            whatHappened: `Perfect length - ${wordCount} words, ended with a question`,
            whyItWorked: 'Short questions keep control and make them think',
            repeatThis: 'Aim for <20 words per turn'
          });
        }
      }
    }
    
    return wins;
  }
  
  /**
   * Find permission-based opener
   */
  private findPermissionOpener(transcript: ConversationTranscript): SuccessfulMoment | null {
    const exchanges = transcript.exchanges;
    const firstUser = exchanges.find(e => e.speaker === 'user');
    
    if (!firstUser) return null;
    
    const permissionPatterns = [
      /\b(do you have|is this a good time|can I|may I|quick question|20 seconds)\b/i
    ];
    
    const askedPermission = permissionPatterns.some(pattern => pattern.test(firstUser.text));
    
    if (askedPermission) {
      const nextMarcus = this.findNextMarcusMessage(exchanges, exchanges.indexOf(firstUser));
      
      return {
        id: `opener_${firstUser.id}`,
        timestamp: firstUser.timestamp,
        type: 'permission_opener',
        impact: 0.7,
        userMessage: firstUser.text,
        marcusResponse: nextMarcus?.text || '',
        resistanceBefore: firstUser.resistanceLevel || 0,
        resistanceAfter: nextMarcus?.resistanceLevel || 0,
        whatHappened: 'You asked permission before launching into your pitch',
        whyItWorked: 'Respecting their time disarms the "another salesperson" reflex',
        repeatThis: 'Always start with: "Do you have 20 seconds for why I called?"'
      };
    }
    
    return null;
  }
}

/**
 * CriticalMomentDetector.ts
 * Identifies the 1-2 most impactful moments from a call
 */

import { ConversationTranscript, ConversationExchange, CriticalMoment, SuccessfulMoment, ExchangePair } from './ConversationTranscript';
import { ImpactJudge, ImpactJudgment } from './ImpactJudge';
import { OpenerQualityEvaluator, OpenerAnalysis } from './OpenerQualityEvaluator';

/**
 * Centralized detector thresholds - tune these to adjust sensitivity
 */
const DETECTOR_THRESHOLDS = {
  resistanceSpike: 0.4,      // Resistance increase (actual scale: 0-10, typical change: 0.2-1.0)
  resistanceDrop: 0.5,       // Resistance decrease (good moments)
  ramblingSeconds: 15,       // User talks for 15+ seconds
  repetitionSimilarity: 0.7, // String similarity for repetition
  repeatedObjectionCount: 2, // Objection mentioned 2+ times (was 3, too high)
  brevityWordCount: 25,      // Messages under 25 words
  activeListeningWords: 2    // Follow-up questions
} as const;

/**
 * CriticalMomentDetector.ts
 * Detects critical moments in sales conversations
 * Uses both rule-based detection and LLM judgment for hybrid analysis
 */
export class CriticalMomentDetector {
  private impactJudge: ImpactJudge;
  private openerEvaluator: OpenerQualityEvaluator;

  constructor() {
    this.impactJudge = new ImpactJudge();
    this.openerEvaluator = new OpenerQualityEvaluator();
  }
  /**
   * Detect successful moments - what they did right
   * Returns max 3 wins, prioritized by impact
   */
  detectSuccessfulMoments(transcript: ConversationTranscript, pairs: ExchangePair[] = []): SuccessfulMoment[] {
    const successes: SuccessfulMoment[] = [];
    
    // EXECUTION QUALITY PATTERNS (not resistance drops)
    // Focus: Detect turn-by-turn skill improvement and professional execution
    
    // Find pain discoveries (still valuable - shows discovery depth)
    const painDiscoveries = this.findPainDiscoveries(transcript, pairs);
    successes.push(...painDiscoveries);
    
    // Find clean objection handling
    const objectionHandling = this.findCleanObjectionHandling(transcript, pairs);
    successes.push(...objectionHandling);
    
    // Find active listening
    const activeListening = this.findActiveListening(transcript, pairs);
    successes.push(...activeListening);
    
    // Find brevity wins
    const brevityWins = this.findBrevityWins(transcript, pairs);
    successes.push(...brevityWins);
    
    // Find permission-based opener
    const permissionOpener = this.findPermissionOpener(transcript, pairs);
    if (permissionOpener) successes.push(permissionOpener);
    
    // NEW: Find open-ended questions that worked (discovery success)
    const openEndedWins = this.findOpenEndedQuestions(transcript, pairs);
    successes.push(...openEndedWins);
    
    // NEW: Find question depth progression (getting better at discovery)
    const questionDepth = this.findQuestionDepthProgression(transcript, pairs);
    successes.push(...questionDepth);
    
    // NEW: Find rapport building moments (incremental trust building)
    const rapportMoments = this.findRapportBuilding(transcript, pairs);
    successes.push(...rapportMoments);
    
    // NEW: Find talk ratio improvements (listening more over time)
    const listenRatio = this.findListenRatioImprovement(transcript, pairs);
    if (listenRatio) successes.push(listenRatio);
    
    // Sort by impact and return top 3
    // NOTE: Impact is based on EXECUTION QUALITY, not resistance magnitude
    return successes
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);
  }
  /**
   * HYBRID PIPELINE: Analyze transcript with rule-based candidates + LLM judgment
   * This is the recommended approach - rules filter, LLM judges impact
   */
  async detectCriticalMomentsWithLLM(
    transcript: ConversationTranscript,
    conversationTracker: any // ConversationTracker instance
  ): Promise<{
    criticalMoments: CriticalMoment[];
    successfulMoments: SuccessfulMoment[];
    topPositive: CriticalMoment | null;
    topNegative: CriticalMoment | null;
  }> {
    console.log('🔍 Starting hybrid impact detection pipeline...');
    
    // STEP 1: Extract exchange pairs first (needed for stable ID matching)
    const allPairs = conversationTracker.getStructuredExchangePairs();
    console.log(`📦 Extracted ${allPairs.length} exchange pairs with stable IDs`);
    
    // STEP 2: Rule-based candidate detection with pairs
    const candidateMoments = this.detectCriticalMoments(transcript, allPairs);
    const candidateSuccesses = this.detectSuccessfulMoments(transcript, allPairs);
    
    console.log(`📋 Rule-based detection found ${candidateMoments.length} negative candidates, ${candidateSuccesses.length} positive candidates`);
    
    // Filter to pairs that match our candidate moments using stable IDs
    const candidatePairIds = new Set<string>();
    candidateMoments.forEach(m => candidatePairIds.add(m.sourcePairId));
    candidateSuccesses.forEach(s => candidatePairIds.add(s.sourcePairId));
    
    const candidatePairs = allPairs.filter(pair => candidatePairIds.has(pair.id));
    
    console.log(`🎯 Filtered to ${candidatePairs.length} exchange pairs for LLM judgment`);
    
    // STEP 3: Build conversation context for LLM
    const currentObjections = transcript.exchanges
      .filter(ex => ex.speaker === 'marcus' && ex.objectionTriggered)
      .map(ex => ex.objectionTriggered!);
    
    const avgResistance = transcript.exchanges
      .filter(ex => ex.resistanceLevel !== undefined)
      .reduce((sum, ex, _, arr) => sum + ex.resistanceLevel! / arr.length, 0);
    
    const context = {
      totalExchanges: transcript.exchanges.length,
      currentObjections: [...new Set(currentObjections)], // Dedupe
      trustLevel: Math.max(0, 10 - avgResistance),
      callStage: this.determineCallStage(transcript.exchanges.length)
    };
    
    // STEP 4: LLM judgment on candidates
    let judgments: ImpactJudgment[] = [];
    
    if (candidatePairs.length > 0) {
      try {
        judgments = await this.impactJudge.judgeExchangePairs(candidatePairs, context);
      } catch (error) {
        console.error('❌ LLM judgment failed:', error);
        // Fall back to rule-based only
      }
    }
    
    // STEP 5: Merge LLM judgments with rule-based moments
    const enrichedMoments = this.mergeLLMJudgments(candidateMoments, candidatePairs, judgments);
    const enrichedSuccesses = this.mergeLLMJudgmentsForSuccesses(candidateSuccesses, candidatePairs, judgments);
    
    // STEP 5.5: Deduplicate moments by sourcePairId (multiple detectors may flag same pair)
    const dedupedMoments = this.dedupeMoments(enrichedMoments);
    const dedupedSuccesses = this.dedupeSuccesses(enrichedSuccesses);
    
    console.log(`🔄 Deduplication: ${enrichedMoments.length} → ${dedupedMoments.length} critical, ${enrichedSuccesses.length} → ${dedupedSuccesses.length} success`);
    
    // STEP 5.6: Cross-deduplicate between positive and negative (same turn can't be both)
    const negativePairIds = new Set(dedupedMoments.map(m => m.sourcePairId));
    const positivePairIds = new Set(dedupedSuccesses.map(s => s.sourcePairId));
    const conflictingPairIds = [...negativePairIds].filter(id => positivePairIds.has(id));
    
    if (conflictingPairIds.length > 0) {
      console.log(`⚠️ Found ${conflictingPairIds.length} turns flagged as BOTH positive and negative - resolving conflicts`);
      
      // For each conflict, keep only one based on LLM enrichment or impact
      conflictingPairIds.forEach(pairId => {
        const negative = dedupedMoments.find(m => m.sourcePairId === pairId);
        const positive = dedupedSuccesses.find(s => s.sourcePairId === pairId);
        
        if (!negative || !positive) return;
        
        // Prefer LLM-enriched moments (they have impactScore)
        const negHasLLM = negative.impactScore !== undefined;
        const posHasLLM = positive.impact !== undefined;
        
        if (negHasLLM && !posHasLLM) {
          // Remove positive, keep negative
          const posIndex = dedupedSuccesses.findIndex(s => s.sourcePairId === pairId);
          if (posIndex >= 0) dedupedSuccesses.splice(posIndex, 1);
          console.log(`  → Kept negative (LLM-enriched) for pair ${pairId}`);
        } else if (posHasLLM && !negHasLLM) {
          // Remove negative, keep positive
          const negIndex = dedupedMoments.findIndex(m => m.sourcePairId === pairId);
          if (negIndex >= 0) dedupedMoments.splice(negIndex, 1);
          console.log(`  → Kept positive (LLM-enriched) for pair ${pairId}`);
        } else {
          // Both or neither have LLM - prefer higher absolute impact
          const negImpact = Math.abs(negative.impactScore || negative.severity || 0);
          const posImpact = Math.abs(positive.impact || 0);
          
          if (negImpact > posImpact) {
            const posIndex = dedupedSuccesses.findIndex(s => s.sourcePairId === pairId);
            if (posIndex >= 0) dedupedSuccesses.splice(posIndex, 1);
            console.log(`  → Kept negative (higher impact ${negImpact.toFixed(1)}) for pair ${pairId}`);
          } else {
            const negIndex = dedupedMoments.findIndex(m => m.sourcePairId === pairId);
            if (negIndex >= 0) dedupedMoments.splice(negIndex, 1);
            console.log(`  → Kept positive (higher impact ${posImpact.toFixed(1)}) for pair ${pairId}`);
          }
        }
      });
    }
    
    // STEP 5.6: Validate moments have required fields (filter out malformed moments)
    const validMoments = dedupedMoments.filter(m => {
      const isValid = m.id && 
                      m.timestamp !== undefined && 
                      !isNaN(m.timestamp) && 
                      m.userMessage && 
                      m.marcusResponse &&
                      m.sourcePairId;
      
      if (!isValid) {
        console.warn('⚠️ Filtered invalid moment:', {
          id: m.id,
          timestamp: m.timestamp,
          hasUserMsg: !!m.userMessage,
          hasMarcusMsg: !!m.marcusResponse,
          sourcePairId: m.sourcePairId
        });
      }
      
      return isValid;
    });
    
    const validSuccesses = dedupedSuccesses.filter(s => {
      const isValid = s.id && 
                      s.timestamp !== undefined && 
                      !isNaN(s.timestamp) && 
                      s.userMessage && 
                      s.marcusResponse &&
                      s.sourcePairId;
      
      if (!isValid) {
        console.warn('⚠️ Filtered invalid success moment:', {
          id: s.id,
          timestamp: s.timestamp,
          hasUserMsg: !!s.userMessage,
          hasMarcusMsg: !!s.marcusResponse,
          sourcePairId: s.sourcePairId
        });
      }
      
      return isValid;
    });
    
    if (validMoments.length < dedupedMoments.length || validSuccesses.length < dedupedSuccesses.length) {
      console.log(`🧹 Validation: Filtered ${dedupedMoments.length - validMoments.length} invalid critical, ${dedupedSuccesses.length - validSuccesses.length} invalid success moments`);
    }
    
    // STEP 6: Rank and identify top 1 good + top 1 bad
    const ranked = this.impactJudge.rankMoments(judgments);
    
    // Map top judgments back to validated moments
    const topNegative = this.findMomentForJudgment(validMoments, ranked.topNegative);
    const topPositive = this.findSuccessMomentForJudgment(validSuccesses, ranked.topPositive);
    
    // Convert top positive SuccessfulMoment to CriticalMoment format for consistency
    const topPositiveAsCritical = topPositive ? {
      ...topPositive,
      type: 'missed_opening' as const, // Placeholder type
      severity: 0,
      hiddenOpportunity: topPositive.repeatThis || 'Replicate this approach'
    } : null;
    
    console.log('✅ Hybrid pipeline complete');
    console.log(`   Top negative: ${topNegative ? topNegative.type : 'none'}`);
    console.log(`   Top positive: ${topPositive ? topPositive.type : 'none'}`);
    
    return {
      criticalMoments: validMoments,
      successfulMoments: validSuccesses,
      topPositive: topPositiveAsCritical,
      topNegative
    };
  }
  
  /**
   * Analyze transcript and find the most critical moments (rule-based only)
   * Returns max 5 moments, prioritized by impact
   */
  detectCriticalMoments(transcript: ConversationTranscript, pairs: ExchangePair[] = []): CriticalMoment[] {
    const moments: CriticalMoment[] = [];
    
    // PATTERN-BASED DETECTION (not resistance jumps)
    // Focus: Execution issues that prevent incremental improvement
    
    // Find missed trust windows (still valuable - checks if they ignored signals)
    const missedWindows = this.findMissedTrustWindows(transcript, pairs);
    moments.push(...missedWindows);
    
    // Find objection mishandling
    const objectionMisses = this.findObjectionMishandling(transcript, pairs);
    moments.push(...objectionMisses);
    
    // NEW: Find rambling responses
    const rambling = this.findRambling(transcript, pairs);
    moments.push(...rambling);
    
    // NEW: Find repetition
    const repetition = this.findRepetition(transcript, pairs);
    moments.push(...repetition);
    
    // NEW: Find tone issues
    const toneIssues = this.findToneIssues(transcript, pairs);
    moments.push(...toneIssues);
    
    // NEW: Find missed pain signals
    const missedPain = this.findMissedPainSignals(transcript, pairs);
    moments.push(...missedPain);
    
    // NEW: Find repeated objections (CRITICAL signal)
    const repeatedObjections = this.findRepeatedObjections(transcript, pairs);
    moments.push(...repeatedObjections);
    
    // NEW: Evaluate opener quality (structure AND substance)
    const openerQuality = this.evaluateOpenerQuality(transcript, pairs);
    if (openerQuality) moments.push(openerQuality);
    
    // NEW: Find low clarity progression (positioning mistake)
    const lowClarity = this.findLowClarityProgression(transcript, pairs);
    if (lowClarity) moments.push(lowClarity);
    
    // NEW: Find assumption-making (pitching without discovery)
    const assumptions = this.findAssumptions(transcript, pairs);
    moments.push(...assumptions);
    
    // NEW: Find not listening (interrupting, ignoring Marcus's answers)
    const notListening = this.findNotListening(transcript, pairs);
    moments.push(...notListening);
    
    // NEW: Find closed questions (limiting discovery)
    const closedQuestions = this.findClosedQuestions(transcript, pairs);
    moments.push(...closedQuestions);
    
    // Sort by severity and return top 5
    // NOTE: Severity is based on EXECUTION QUALITY, not resistance magnitude
    return moments
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 5);
  }
  
  /**
   * Find the ExchangePair that contains the given user and Marcus exchanges
   */
  private findMatchingPair(
    pairs: ExchangePair[],
    userExchange: ConversationExchange,
    marcusExchange: ConversationExchange
  ): ExchangePair | null {
    return pairs.find(pair =>
      pair.userTurn.id === userExchange.id &&
      pair.marcusResponse.id === marcusExchange.id
    ) || null;
  }

  /**
   * Determine call stage based on exchange count
   */
  private determineCallStage(exchangeCount: number): 'opening' | 'discovery' | 'objection' | 'closing' {
    if (exchangeCount < 6) return 'opening';
    if (exchangeCount < 12) return 'discovery';
    if (exchangeCount < 20) return 'objection';
    return 'closing';
  }
  
  /**
   * Merge LLM judgments into CriticalMoment objects
   */
  private mergeLLMJudgments(
    moments: CriticalMoment[],
    pairs: ExchangePair[],
    judgments: ImpactJudgment[]
  ): CriticalMoment[] {
    // Build Map for O(1) lookup by sourcePairId
    const judgmentByPairId = new Map(judgments.map(j => [j.sourcePairId, j]));
    
    return moments.map(moment => {
      // Use stable ID to find matching judgment
      const judgment = judgmentByPairId.get(moment.sourcePairId);
      
      if (!judgment) return moment;
      
      // Enrich with LLM data
      return {
        ...moment,
        impactScore: judgment.impactScore,
        impactDirection: judgment.direction,
        impactCategory: judgment.category,
        impactReason: judgment.reason,
        buyerStateChange: judgment.buyerStateChange,
        isKeyMoment: judgment.isKeyMoment
      };
    });
  }
  
  /**
   * Merge LLM judgments into SuccessfulMoment objects
   */
  private mergeLLMJudgmentsForSuccesses(
    successes: SuccessfulMoment[],
    pairs: ExchangePair[],
    judgments: ImpactJudgment[]
  ): SuccessfulMoment[] {
    // Build Map for O(1) lookup by sourcePairId
    const judgmentByPairId = new Map(judgments.map(j => [j.sourcePairId, j]));
    
    return successes.map(success => {
      // Use stable ID to find matching judgment
      const judgment = judgmentByPairId.get(success.sourcePairId);
      
      if (!judgment || judgment.impactScore <= 0) return success;
      
      return {
        ...success,
        impactScore: judgment.impactScore,
        impactCategory: judgment.category,
        impactReason: judgment.reason,
        isKeyMoment: judgment.isKeyMoment
      };
    });
  }
  
  /**
   * Deduplicate critical moments by sourcePairId - choose dominant type
   */
  private dedupeMoments(moments: CriticalMoment[]): CriticalMoment[] {
    const byPairId = new Map<string, CriticalMoment[]>();
    
    // Group by sourcePairId
    moments.forEach(m => {
      const existing = byPairId.get(m.sourcePairId) || [];
      existing.push(m);
      byPairId.set(m.sourcePairId, existing);
    });
    
    // Choose dominant moment per pair (highest severity or LLM-enriched)
    const deduped: CriticalMoment[] = [];
    byPairId.forEach((group, pairId) => {
      if (group.length === 1) {
        deduped.push(group[0]);
        return;
      }
      
      // Prefer LLM-enriched moments
      const enriched = group.filter(m => m.impactScore !== undefined);
      if (enriched.length > 0) {
        deduped.push(enriched[0]);
        return;
      }
      
      // Otherwise take highest severity
      const dominant = group.reduce((prev, curr) => 
        curr.severity > prev.severity ? curr : prev
      );
      deduped.push(dominant);
    });
    
    return deduped;
  }
  
  /**
   * Deduplicate successful moments by sourcePairId - choose dominant type
   */
  private dedupeSuccesses(successes: SuccessfulMoment[]): SuccessfulMoment[] {
    const byPairId = new Map<string, SuccessfulMoment[]>();
    
    // Group by sourcePairId
    successes.forEach(s => {
      const existing = byPairId.get(s.sourcePairId) || [];
      existing.push(s);
      byPairId.set(s.sourcePairId, existing);
    });
    
    // Choose dominant moment per pair (highest impact or LLM-enriched)
    const deduped: SuccessfulMoment[] = [];
    byPairId.forEach((group, pairId) => {
      if (group.length === 1) {
        deduped.push(group[0]);
        return;
      }
      
      // Prefer LLM-enriched moments
      const enriched = group.filter(s => s.impactScore !== undefined);
      if (enriched.length > 0) {
        deduped.push(enriched[0]);
        return;
      }
      
      // Otherwise take highest impact
      const dominant = group.reduce((prev, curr) => 
        curr.impact > prev.impact ? curr : prev
      );
      deduped.push(dominant);
    });
    
    return deduped;
  }
  
  /**
   * Find CriticalMoment matching a judgment using stable sourcePairId
   */
  private findMomentForJudgment(
    moments: CriticalMoment[],
    judgment: ImpactJudgment | null
  ): CriticalMoment | null {
    if (!judgment?.sourcePairId) return null;
    return moments.find(m => m.sourcePairId === judgment.sourcePairId) ?? null;
  }
  
  /**
   * Find SuccessfulMoment matching a judgment using stable sourcePairId
   */
  private findSuccessMomentForJudgment(
    successes: SuccessfulMoment[],
    judgment: ImpactJudgment | null
  ): SuccessfulMoment | null {
    if (!judgment?.sourcePairId) return null;
    return successes.find(s => s.sourcePairId === judgment.sourcePairId) ?? null;
  }
  
  /**
   * Find moments where resistance increased significantly
   */
  private findResistanceSpikes(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
    const spikes: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    
    if (!exchanges || exchanges.length === 0) {
      console.warn('[CriticalMomentDetector] No exchanges found in transcript');
      return spikes;
    }
    
    for (let i = 1; i < exchanges.length; i++) {
      const prev = exchanges[i - 1];
      const curr = exchanges[i];
      
      // Look for Marcus responses where resistance jumped
      if (curr.speaker === 'marcus' && 
          prev.resistanceLevel !== undefined && 
          curr.resistanceLevel !== undefined) {
        
        const resistanceIncrease = curr.resistanceLevel - prev.resistanceLevel;
        
        // Spike = resistance increased significantly
        if (resistanceIncrease >= DETECTOR_THRESHOLDS.resistanceSpike) {
          // Find the user message that triggered this
          const userMessage = this.findPreviousUserMessage(exchanges, i);
          
          if (userMessage) {
            // Find matching pair for stable ID reference
            const matchingPair = this.findMatchingPair(pairs, userMessage, curr);
            
            spikes.push({
              id: `spike_${curr.id}`,
              timestamp: curr.timestamp,
              type: 'resistance_spike',
              severity: resistanceIncrease / 10, // 0-1 scale
              sourcePairId: matchingPair?.id || `fallback_${userMessage.id}_${curr.id}`,
              sourceUserId: userMessage.id,
              sourceMarcusId: curr.id,
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
  private findMissedTrustWindows(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
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
          const nextMarcus = this.findNextMarcusMessage(exchanges, i + 1);
          const matchingPair = nextMarcus ? this.findMatchingPair(pairs, userMsg, nextMarcus) : null;
          
          missed.push({
            id: `trust_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'trust_window',
            severity: 0.7, // High severity - these are precious
            sourcePairId: matchingPair?.id || `fallback_${userMsg.id}_${nextMarcus?.id || 'unknown'}`,
            sourceUserId: userMsg.id,
            sourceMarcusId: nextMarcus?.id || marcusMsg.id,
            userMessage: userMsg.text,
            marcusResponse: nextMarcus?.text || '',
            resistanceBefore: marcusMsg.resistanceLevel || 0,
            resistanceAfter: nextMarcus?.resistanceLevel || 0,
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
  private findObjectionMishandling(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
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
          const matchingPair = nextMarcus ? this.findMatchingPair(pairs, userMsg, nextMarcus) : null;
          
          if (!matchingPair) {
            console.warn('⚠️ No matching pair found for objection_mishandled', {
              userId: userMsg.id,
              marcusId: nextMarcus?.id || 'unknown'
            });
          }
          
          mishandled.push({
            id: `objection_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'objection_mishandled',
            severity: 0.8, // Very high severity
            sourcePairId: matchingPair?.id ?? `fallback_${userMsg.id}_${nextMarcus?.id || 'unknown'}`,
            sourceUserId: userMsg.id,
            sourceMarcusId: nextMarcus?.id || marcusMsg.id,
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
   * Helper: Find the previous Marcus message before index
   */
  private findPreviousMarcusMessage(exchanges: ConversationExchange[], beforeIndex: number): ConversationExchange | null {
    for (let i = beforeIndex - 1; i >= 0; i--) {
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
  private findRambling(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
    const rambling: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 0; i < exchanges.length; i++) {
      const userMsg = exchanges[i];
      
      if (userMsg.speaker === 'user') {
        // Estimate duration: ~150 words per minute = 2.5 words per second
        const wordCount = userMsg.text.split(/\s+/).length;
        const estimatedSeconds = wordCount / 2.5;
        
        if (estimatedSeconds > DETECTOR_THRESHOLDS.ramblingSeconds) {
          const nextMarcus = this.findNextMarcusMessage(exchanges, i);
          const matchingPair = nextMarcus ? this.findMatchingPair(pairs, userMsg, nextMarcus) : null;
          
          if (!matchingPair) {
            console.warn('⚠️ No matching pair found for rambling', {
              userId: userMsg.id,
              marcusId: nextMarcus?.id || 'unknown'
            });
          }
          
          rambling.push({
            id: `ramble_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'rambling',
            severity: 0.6,
            sourcePairId: matchingPair?.id ?? `fallback_${userMsg.id}_${nextMarcus?.id || 'unknown'}`,
            sourceUserId: userMsg.id,
            sourceMarcusId: nextMarcus?.id || 'unknown',
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
  private findRepetition(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
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
        
        if (similarity > DETECTOR_THRESHOLDS.repetitionSimilarity) {
          const nextMarcus = this.findNextMarcusMessage(exchanges, exchanges.indexOf(userMessages[j]));
          const matchingPair = nextMarcus ? this.findMatchingPair(pairs, userMessages[j], nextMarcus) : null;
          
          if (!matchingPair) {
            console.warn('⚠️ No matching pair found for repetition', {
              userId: userMessages[j].id,
              marcusId: nextMarcus?.id || 'unknown'
            });
          }
          
          repetitions.push({
            id: `repeat_${userMessages[j].id}`,
            timestamp: userMessages[j].timestamp,
            type: 'repetition',
            severity: 0.5,
            sourcePairId: matchingPair?.id ?? `fallback_${userMessages[j].id}_${nextMarcus?.id || 'unknown'}`,
            sourceUserId: userMessages[j].id,
            sourceMarcusId: nextMarcus?.id || 'unknown',
            userMessage: userMessages[j].text,
            marcusResponse: nextMarcus?.text || '',
            resistanceBefore: userMessages[i].resistanceLevel || 0,
            resistanceAfter: userMessages[j].resistanceLevel || 0,
            whatHappened: 'User asked similar question twice - shows lack of progress',
            hiddenOpportunity: 'Move conversation forward with new angles'
          });
          break;
        }
      }
    }
    
    return repetitions;
  }
  
  /**
   * NEW: Find repeated objections - CRITICAL signal when buyer repeats same concern
   * This means the objection was never actually addressed
   */
  private findRepeatedObjections(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
    const repeated: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    
    // Track objection themes and their occurrences
    const objectionThemes = new Map<string, Array<{exchange: ConversationExchange, index: number}>>();
    
    for (let i = 0; i < exchanges.length; i++) {
      const ex = exchanges[i];
      
      if (ex.speaker === 'marcus' && ex.objectionTriggered) {
        const theme = this.extractObjectionTheme(ex.objectionTriggered);
        
        if (!objectionThemes.has(theme)) {
          objectionThemes.set(theme, []);
        }
        
        objectionThemes.get(theme)!.push({ exchange: ex, index: i });
      }
    }
    
    // Flag themes that repeated 2+ times
    for (const [theme, occurrences] of objectionThemes.entries()) {
      if (occurrences.length >= DETECTOR_THRESHOLDS.repeatedObjectionCount) {
        // Create moment for the last occurrence (proves pattern exists)
        const lastOccurrence = occurrences[occurrences.length - 1];
        const userMsg = this.findPreviousUserMessage(exchanges, lastOccurrence.index);
        
        if (userMsg) {
          const matchingPair = this.findMatchingPair(pairs, userMsg, lastOccurrence.exchange);
          
          if (!matchingPair) {
            console.warn('⚠️ No matching pair found for repeated_objection', {
              userId: userMsg.id,
              marcusId: lastOccurrence.exchange.id
            });
          }
          
          repeated.push({
            id: `repeated_obj_${lastOccurrence.exchange.id}`,
            timestamp: lastOccurrence.exchange.timestamp,
            type: 'repeated_objection',
            severity: 0.95, // VERY high severity
            sourcePairId: matchingPair?.id ?? `fallback_${userMsg.id}_${lastOccurrence.exchange.id}`,
            sourceUserId: userMsg.id,
            sourceMarcusId: lastOccurrence.exchange.id,
            userMessage: userMsg.text,
            marcusResponse: lastOccurrence.exchange.text,
            resistanceBefore: userMsg.resistanceLevel || 0,
            resistanceAfter: lastOccurrence.exchange.resistanceLevel || 0,
            whatHappened: `Marcus repeated "${theme}" concern ${occurrences.length} times - it was never resolved`,
            hiddenOpportunity: 'Acknowledge the concern directly and address the root fear, not just symptoms'
          });
        }
      }
    }
    
    return repeated;
  }
  
  /**
   * NEW: Find tone issues - demanding or aggressive language
   */
  private findToneIssues(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
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
        const isDemanding = demandingPatterns.some(pattern => pattern.test(userMsg.text));
        
        if (isDemanding) {
          const nextMarcus = this.findNextMarcusMessage(exchanges, i);
          const matchingPair = nextMarcus ? this.findMatchingPair(pairs, userMsg, nextMarcus) : null;
          
          if (!matchingPair) {
            console.warn('⚠️ No matching pair found for tone_issue', {
              userId: userMsg.id,
              marcusId: nextMarcus?.id || 'unknown'
            });
          }
          
          toneIssues.push({
            id: `tone_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'tone_issue',
            severity: 0.5,
            sourcePairId: matchingPair?.id ?? `fallback_${userMsg.id}_${nextMarcus?.id || 'unknown'}`,
            sourceUserId: userMsg.id,
            sourceMarcusId: nextMarcus?.id || 'unknown',
            userMessage: userMsg.text,
            marcusResponse: nextMarcus?.text || '',
            resistanceBefore: userMsg.resistanceLevel || 0,
            resistanceAfter: nextMarcus?.resistanceLevel || 0,
            whatHappened: 'User tone came across as pushy or demanding',
            hiddenOpportunity: 'Stay collaborative, not confrontational'
          });
        }
      }
    }
    
    return toneIssues;
  }
  
  /**
   * Extract core theme from objection text
   */
  private extractObjectionTheme(objectionText: string): string {
    const lower = objectionText.toLowerCase();
    
    // Map to core themes
    if (/\b(proof|evidence|work|results?|roi|show me)\b/.test(lower)) {
      return 'lack_of_proof';
    }
    if (/\b(trust|believe|sure|know|guarantee)\b/.test(lower)) {
      return 'trust_concern';
    }
    if (/\b(time|busy|bandwidth|schedule)\b/.test(lower)) {
      return 'time_concern';
    }
    if (/\b(budget|cost|price|afford|expensive)\b/.test(lower)) {
      return 'budget_concern';
    }
    if (/\b(fit|right|relevant|applicable)\b/.test(lower)) {
      return 'fit_concern';
    }
    if (/\b(generic|cookie.?cutter|customiz|tailored)\b/.test(lower)) {
      return 'customization_concern';
    }
    
    // Default: use first 3 words
    return lower.split(/\s+/).slice(0, 3).join('_');
  }
  
  /**
   * NEW: Find missed pain signals - Marcus volunteers pain but user doesn't explore
   */
  private findMissedPainSignals(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
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
          const matchingPair = nextMarcus ? this.findMatchingPair(pairs, userMsg, nextMarcus) : null;
          
          if (!matchingPair) {
            console.warn('⚠️ No matching pair found for missed_pain', {
              userId: userMsg.id,
              marcusId: nextMarcus?.id || 'unknown'
            });
          }
          
          missedPain.push({
            id: `painmiss_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'missed_pain',
            severity: 0.85,
            sourcePairId: matchingPair?.id ?? `fallback_${userMsg.id}_${nextMarcus?.id || 'unknown'}`,
            sourceUserId: userMsg.id,
            sourceMarcusId: nextMarcus?.id || marcusMsg.id,
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
  private findResistanceDrops(transcript: ConversationTranscript, pairs: ExchangePair[]): SuccessfulMoment[] {
    const drops: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 1; i < exchanges.length; i++) {
      const prev = exchanges[i - 1];
      const curr = exchanges[i];
      
      if (curr.speaker === 'marcus' && 
          prev.resistanceLevel !== undefined && 
          curr.resistanceLevel !== undefined) {
        
        const resistanceDecrease = prev.resistanceLevel - curr.resistanceLevel;
        
        if (resistanceDecrease >= DETECTOR_THRESHOLDS.resistanceDrop) {
          const userMessage = this.findPreviousUserMessage(exchanges, i);
          
          if (userMessage) {
            const matchingPair = this.findMatchingPair(pairs, userMessage, curr);
            
            if (!matchingPair) {
              console.warn('⚠️ No matching pair found for resistance_drop', {
                userId: userMessage.id,
                marcusId: curr.id
              });
            }
            
            drops.push({
              id: `drop_${curr.id}`,
              timestamp: curr.timestamp,
              type: 'resistance_drop',
              impact: resistanceDecrease / 10,
              sourcePairId: matchingPair?.id ?? `fallback_${userMessage.id}_${curr.id}`,
              sourceUserId: userMessage.id,
              sourceMarcusId: curr.id,
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
  private findPainDiscoveries(transcript: ConversationTranscript, pairs: ExchangePair[]): SuccessfulMoment[] {
    const discoveries: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 0; i < exchanges.length; i++) {
      const marcusMsg = exchanges[i];
      
      if (marcusMsg.speaker === 'marcus' && marcusMsg.painPointRevealed) {
        const prevUser = this.findPreviousUserMessage(exchanges, i);
        
        if (prevUser) {
          const matchingPair = this.findMatchingPair(pairs, prevUser, marcusMsg);
          
          if (!matchingPair) {
            console.warn('⚠️ No matching pair found for pain_discovery', {
              userId: prevUser.id,
              marcusId: marcusMsg.id
            });
          }
          
          discoveries.push({
            id: `pain_${marcusMsg.id}`,
            timestamp: marcusMsg.timestamp,
            type: 'pain_discovery',
            impact: 0.8,
            sourcePairId: matchingPair?.id ?? `fallback_${prevUser.id}_${marcusMsg.id}`,
            sourceUserId: prevUser.id,
            sourceMarcusId: marcusMsg.id,
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
  private findCleanObjectionHandling(transcript: ConversationTranscript, pairs: ExchangePair[]): SuccessfulMoment[] {
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
          const matchingPair = nextMarcus ? this.findMatchingPair(pairs, userMsg, nextMarcus) : null;
          
          if (!matchingPair) {
            console.warn('⚠️ No matching pair found for objection_handled', {
              userId: userMsg.id,
              marcusId: nextMarcus?.id || 'unknown'
            });
          }
          
          handled.push({
            id: `handled_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'objection_handled',
            impact: 0.75,
            sourcePairId: matchingPair?.id ?? `fallback_${userMsg.id}_${nextMarcus?.id || 'unknown'}`,
            sourceUserId: userMsg.id,
            sourceMarcusId: nextMarcus?.id || marcusMsg.id,
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
  private findActiveListening(transcript: ConversationTranscript, pairs: ExchangePair[]): SuccessfulMoment[] {
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
          
          if (referenced.length >= DETECTOR_THRESHOLDS.activeListeningWords) {
            const nextMarcus = this.findNextMarcusMessage(exchanges, i);
            const matchingPair = nextMarcus ? this.findMatchingPair(pairs, userMsg, nextMarcus) : null;
            
            if (!matchingPair) {
              console.warn('⚠️ No matching pair found for active_listening', {
                userId: userMsg.id,
                marcusId: nextMarcus?.id || 'unknown'
              });
            }
            
            listening.push({
              id: `listen_${userMsg.id}`,
              timestamp: userMsg.timestamp,
              type: 'active_listening',
              impact: 0.6,
              sourcePairId: matchingPair?.id ?? `fallback_${userMsg.id}_${nextMarcus?.id || 'unknown'}`,
              sourceUserId: userMsg.id,
              sourceMarcusId: nextMarcus?.id || 'unknown',
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
  private findBrevityWins(transcript: ConversationTranscript, pairs: ExchangePair[]): SuccessfulMoment[] {
    const wins: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    
    // Skip first 2 user exchanges (opening/identity confirmation - procedural, not strategic)
    const userExchangeCount = exchanges.filter(e => e.speaker === 'user').length;
    let userTurnsSeen = 0;
    
    for (let i = 0; i < exchanges.length; i++) {
      const userMsg = exchanges[i];
      
      if (userMsg.speaker === 'user') {
        userTurnsSeen++;
        
        // Skip opening exchanges (turn 1-2)
        if (userTurnsSeen <= 2) continue;
        
        const wordCount = userMsg.text.split(/\s+/).length;
        const hasQuestion = /\?/.test(userMsg.text);
        
        if (wordCount <= DETECTOR_THRESHOLDS.brevityWordCount && hasQuestion) {
          // CONTEXT FILTERS: Exclude technical/procedural questions
          const technicalPatterns = [
            /are you (still )?there/i,
            /can you hear me/i,
            /hello\?+$/i,
            /you there\?/i,
            /is this (.*?)\?$/i  // "Is this Marcus?" - identity confirmation
          ];
          
          const isTechnicalCheck = technicalPatterns.some(pattern => pattern.test(userMsg.text));
          if (isTechnicalCheck) continue;
          
          // Check previous Marcus message for objection signals
          const prevMarcus = this.findPreviousMarcusMessage(exchanges, i);
          if (prevMarcus) {
            const objectionPatterns = [
              /not (really )?interested/i,
              /not a (good )?fit/i,
              /not right now/i,
              /reconnect later/i,
              /send (me )?something/i,
              /gotta run/i,
              /don't think/i
            ];
            
            const marcusJustObjected = objectionPatterns.some(pattern => pattern.test(prevMarcus.text));
            
            // If Marcus just objected and user asks a short question, it's likely avoidance, not strategy
            if (marcusJustObjected) continue;
          }
          
          const nextMarcus = this.findNextMarcusMessage(exchanges, i);
          const matchingPair = nextMarcus ? this.findMatchingPair(pairs, userMsg, nextMarcus) : null;
          
          if (!matchingPair) {
            console.warn('⚠️ No matching pair found for brevity_win', {
              userId: userMsg.id,
              marcusId: nextMarcus?.id || 'unknown'
            });
          }
          
          wins.push({
            id: `brevity_${userMsg.id}`,
            timestamp: userMsg.timestamp,
            type: 'brevity_win',
            impact: 0.5,
            sourcePairId: matchingPair?.id ?? `fallback_${userMsg.id}_${nextMarcus?.id || 'unknown'}`,
            sourceUserId: userMsg.id,
            sourceMarcusId: nextMarcus?.id || 'unknown',
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
  private findPermissionOpener(transcript: ConversationTranscript, pairs: ExchangePair[]): SuccessfulMoment | null {
    const exchanges = transcript.exchanges;
    const firstUser = exchanges.find(e => e.speaker === 'user');
    
    if (!firstUser) return null;
    
    const permissionPatterns = [
      /\b(do you have|is this a good time|can I|may I|quick question|20 seconds)\b/i
    ];
    
    const askedPermission = permissionPatterns.some(pattern => pattern.test(firstUser.text));
    
    if (askedPermission) {
      const nextMarcus = this.findNextMarcusMessage(exchanges, exchanges.indexOf(firstUser));
      const matchingPair = nextMarcus ? this.findMatchingPair(pairs, firstUser, nextMarcus) : null;
      
      if (!matchingPair) {
        console.warn('⚠️ No matching pair found for permission_opener', {
          userId: firstUser.id,
          marcusId: nextMarcus?.id || 'unknown'
        });
      }
      
      return {
        id: `opener_${firstUser.id}`,
        timestamp: firstUser.timestamp,
        type: 'permission_opener',
        impact: 0.7,
        sourcePairId: matchingPair?.id ?? `fallback_${firstUser.id}_${nextMarcus?.id || 'unknown'}`,
        sourceUserId: firstUser.id,
        sourceMarcusId: nextMarcus?.id || 'unknown',
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
  
  /**
   * Evaluate opener quality - checks BOTH structure (permission, sequence) AND substance (relevance, insight)
   * This replaces the old permission-only check
   */
  private evaluateOpenerQuality(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment | null {
    const exchanges = transcript.exchanges;
    const userMessages = exchanges.filter(e => e.speaker === 'user');
    
    if (userMessages.length === 0) return null;
    
    const firstUser = userMessages[0];
    const secondUser = userMessages.length > 1 ? userMessages[1] : undefined;
    const nextMarcus = this.findNextMarcusMessage(exchanges, exchanges.indexOf(firstUser));
    const matchingPair = nextMarcus ? this.findMatchingPair(pairs, firstUser, nextMarcus) : null;
    
    // SUBSTANCE EVALUATION: Use OpenerQualityEvaluator
    const substanceAnalysis = this.openerEvaluator.evaluateOpener(
      firstUser.text,
      secondUser?.text
    );
    
    // STRUCTURAL CHECKS: Permission, sequence
    const permissionPatterns = [
      /\b(do you have|is this a good time|can I|may I|quick question|20 seconds|quick reason)\b/i
    ];
    const askedPermission = permissionPatterns.some(pattern => 
      pattern.test(firstUser.text) || (secondUser && pattern.test(secondUser.text))
    );
    
    // Determine severity based on BOTH structure and substance
    const structuralIssue = !askedPermission;
    const substanceWeak = substanceAnalysis.score.overallQuality === 'weak' || 
                          substanceAnalysis.score.overallQuality === 'template';
    
    // Only flag if resistance stayed high (structural issue had real impact) OR substance is weak
    const initialResistance = nextMarcus?.resistanceLevel || 7;
    const shouldFlag = (structuralIssue && initialResistance >= 6) || substanceWeak;
    
    if (shouldFlag) {
      // Determine primary issue: structure, substance, or both
      let whatHappened = '';
      let hiddenOpportunity = '';
      let severity = 0.5;
      
      if (structuralIssue && substanceWeak) {
        // BOTH issues
        whatHappened = `Your opener had structural and substance issues. ${substanceAnalysis.coaching}`;
        hiddenOpportunity = 'Lead with specific insight: "Quick reason - [industry] companies hit [specific pain] when [pattern]..." Then move to discovery.';
        severity = 0.85;
      } else if (structuralIssue) {
        // STRUCTURE issue only (substance is okay)
        whatHappened = 'Your message had substance, but you buried it. Marcus went defensive because you didn\'t frame why you\'re calling.';
        hiddenOpportunity = 'Lead with: "Quick reason for the call..." or "I noticed [pattern]..." Keep your insight, just frame it better.';
        severity = 0.65;
      } else {
        // SUBSTANCE issue only (structure is okay)
        whatHappened = `Your structure was okay, but your message lacked punch. ${substanceAnalysis.coaching}`;
        hiddenOpportunity = substanceAnalysis.score.overallQuality === 'template' 
          ? 'Replace template language with concrete observation: "When [industry] teams face [pain], [consequence]..."'
          : 'Add specific relevance: industry markers, role-specific pain, operational patterns, or benchmarks.';
        severity = 0.75;
      }
      
      return {
        id: `opener_quality_${firstUser.id}`,
        timestamp: firstUser.timestamp,
        type: 'missed_opening',
        severity,
        sourcePairId: matchingPair?.id ?? `fallback_${firstUser.id}_${nextMarcus?.id || 'unknown'}`,
        sourceUserId: firstUser.id,
        sourceMarcusId: nextMarcus?.id || 'unknown',
        userMessage: firstUser.text,
        marcusResponse: nextMarcus?.text || '',
        resistanceBefore: firstUser.resistanceLevel || 7,
        resistanceAfter: nextMarcus?.resistanceLevel || 7,
        whatHappened,
        hiddenOpportunity,
        // Attach substance analysis for reference
        substanceScore: substanceAnalysis.score as any
      };
    }
    
    return null;
  }
  
  /**
   * Find open-ended questions that got Marcus to open up - mirrors discovery score rewards
   */
  private findOpenEndedQuestions(transcript: ConversationTranscript, pairs: ExchangePair[]): SuccessfulMoment[] {
    const wins: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    
    const openEndedPatterns = [
      /\b(what|how|why|tell me|describe|explain|walk me through)\b/i
    ];
    
    for (let i = 0; i < exchanges.length - 1; i++) {
      const userMsg = exchanges[i];
      const marcusMsg = exchanges[i + 1];
      
      if (userMsg.speaker === 'user' && marcusMsg.speaker === 'marcus') {
        const isOpenEnded = openEndedPatterns.some(pattern => pattern.test(userMsg.text));
        const isQuestion = userMsg.text.includes('?');
        
        if (isOpenEnded && isQuestion) {
          // Check if Marcus opened up (longer response or pain revealed)
          const marcusWordCount = marcusMsg.text.split(/\s+/).length;
          const resistanceDrop = (userMsg.resistanceLevel || 7) - (marcusMsg.resistanceLevel || 7);
          
          if (marcusWordCount > 20 || marcusMsg.painPointRevealed || resistanceDrop > 0.3) {
            const matchingPair = this.findMatchingPair(pairs, userMsg, marcusMsg);
            
            wins.push({
              id: `open_q_${userMsg.id}`,
              timestamp: userMsg.timestamp,
              type: 'pain_discovery',
              impact: 0.75,
              sourcePairId: matchingPair?.id ?? `fallback_${userMsg.id}_${marcusMsg.id}`,
              sourceUserId: userMsg.id,
              sourceMarcusId: marcusMsg.id,
              userMessage: userMsg.text,
              marcusResponse: marcusMsg.text,
              resistanceBefore: userMsg.resistanceLevel || 0,
              resistanceAfter: marcusMsg.resistanceLevel || 0,
              whatHappened: 'Your open-ended question got Marcus to open up',
              whyItWorked: 'Open-ended questions invite detailed responses instead of yes/no - builds trust',
              repeatThis: 'Use "What...", "How...", "Tell me about..." instead of closed questions'
            });
          }
        }
      }
    }
    
    return wins;
  }
  
  /**
   * Find low clarity progression - mirrors positioning score penalty
   */
  private findLowClarityProgression(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment | null {
    const exchanges = transcript.exchanges;
    
    // Find a point mid-conversation where clarity should be higher but isn't
    const midpoint = Math.floor(exchanges.length / 2);
    
    if (midpoint < 3) return null; // Need enough conversation to assess
    
    // Check clarity progression from exchanges
    let lowClarityCount = 0;
    let lastLowClarityPair: { user: ConversationExchange; marcus: ConversationExchange } | null = null;
    
    for (let i = 2; i < Math.min(exchanges.length, midpoint + 3); i++) {
      const exchange = exchanges[i];
      
      // If Marcus shows confusion or asks clarifying questions
      const confusionPatterns = [
        /\b(what do you mean|I don't understand|confused|not clear|what's your point|lost you)\b/i
      ];
      
      if (exchange.speaker === 'marcus' && confusionPatterns.some(p => p.test(exchange.text))) {
        lowClarityCount++;
        const prevUser = this.findPreviousUserMessage(exchanges, i);
        if (prevUser) {
          lastLowClarityPair = { user: prevUser, marcus: exchange };
        }
      }
    }
    
    // If Marcus showed confusion 2+ times, flag as positioning mistake
    if (lowClarityCount >= 2 && lastLowClarityPair) {
      const matchingPair = this.findMatchingPair(pairs, lastLowClarityPair.user, lastLowClarityPair.marcus);
      
      return {
        id: `low_clarity_${lastLowClarityPair.marcus.id}`,
        timestamp: lastLowClarityPair.marcus.timestamp,
        type: 'missed_pain',
        severity: 0.65,
        sourcePairId: matchingPair?.id ?? `fallback_${lastLowClarityPair.user.id}_${lastLowClarityPair.marcus.id}`,
        sourceUserId: lastLowClarityPair.user.id,
        sourceMarcusId: lastLowClarityPair.marcus.id,
        userMessage: lastLowClarityPair.user.text,
        marcusResponse: lastLowClarityPair.marcus.text,
        resistanceBefore: lastLowClarityPair.user.resistanceLevel || 7,
        resistanceAfter: lastLowClarityPair.marcus.resistanceLevel || 7,
        whatHappened: 'Marcus lost clarity on what you\'re offering - confusion kills interest',
        hiddenOpportunity: 'Use simple language: "We help [WHO] [DO WHAT] so they can [OUTCOME]" - test with a 5th grader'
      };
    }
    
    return null;
  }
  
  /**
   * NEW: Find assumption-making - pitching features without discovering pain first
   * Pattern: Product/feature mentions before asking discovery questions
   */
  private findAssumptions(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
    const assumptions: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    const userMessages = exchanges.filter(e => e.speaker === 'user');
    
    if (userMessages.length < 3) return assumptions; // Need enough turns to assess
    
    // Track if they asked discovery questions before pitching
    let discoveryQuestions = 0;
    let pitchingStarted = false;
    let assumptionPair: { user: ConversationExchange; marcus: ConversationExchange } | null = null;
    
    const discoveryPatterns = [/\b(what|how|why|tell me|challenge|pain|struggle|problem|goal|need)\b/i];
    const pitchPatterns = [/\b(we|our|feature|product|solution|help you|offer|provide)\b/i];
    
    for (let i = 0; i < userMessages.length; i++) {
      const user = userMessages[i];
      const isDiscovery = discoveryPatterns.some(p => p.test(user.text)) && user.text.includes('?');
      const isPitch = pitchPatterns.some(p => p.test(user.text));
      
      if (isDiscovery) discoveryQuestions++;
      
      if (isPitch && !pitchingStarted && discoveryQuestions < 2) {
        pitchingStarted = true;
        const nextMarcus = this.findNextMarcusMessage(exchanges, exchanges.indexOf(user));
        if (nextMarcus) {
          assumptionPair = { user, marcus: nextMarcus };
        }
      }
    }
    
    // If they pitched before asking 2+ discovery questions, flag it
    if (assumptionPair) {
      const matchingPair = this.findMatchingPair(pairs, assumptionPair.user, assumptionPair.marcus);
      assumptions.push({
        id: `assumption_${assumptionPair.user.id}`,
        timestamp: assumptionPair.user.timestamp,
        type: 'missed_pain',
        severity: 0.8,
        sourcePairId: matchingPair?.id ?? `fallback_${assumptionPair.user.id}_${assumptionPair.marcus.id}`,
        sourceUserId: assumptionPair.user.id,
        sourceMarcusId: assumptionPair.marcus.id,
        userMessage: assumptionPair.user.text,
        marcusResponse: assumptionPair.marcus.text,
        resistanceBefore: assumptionPair.user.resistanceLevel || 7,
        resistanceAfter: assumptionPair.marcus.resistanceLevel || 7,
        whatHappened: 'You pitched your solution before discovering Marcus\'s pain - he doesn\'t see why he needs it',
        hiddenOpportunity: 'Ask 3-4 discovery questions first: "What challenges are you facing with [X]?" Then pitch to the pain you uncovered'
      });
    }
    
    return assumptions;
  }
  
  /**
   * NEW: Find not listening - interrupting or ignoring Marcus's answers
   * Pattern: User asks question, Marcus answers with pain/detail, user doesn't acknowledge or follow up
   */
  private findNotListening(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
    const notListening: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    
    for (let i = 0; i < exchanges.length - 2; i++) {
      const user1 = exchanges[i];
      const marcus = exchanges[i + 1];
      const user2 = exchanges[i + 2];
      
      if (user1.speaker === 'user' && marcus.speaker === 'marcus' && user2.speaker === 'user') {
        // Check if Marcus gave a substantive answer (word count > 15)
        const marcusWordCount = marcus.text.split(/\s+/).length;
        
        if (marcusWordCount > 15 || marcus.painPointRevealed) {
          // Check if user2 acknowledges Marcus's answer
          const acknowledgmentPatterns = [/\b(I hear|that makes sense|I understand|interesting|got it|so what you're saying)\b/i];
          const hasAcknowledgment = acknowledgmentPatterns.some(p => p.test(user2.text));
          
          // Check if user2 pivots to unrelated topic or pitches instead
          const pivotPatterns = [/\b(anyway|so|let me tell you|our|we offer|feature|solution)\b/i];
          const isPivot = pivotPatterns.some(p => p.test(user2.text));
          
          if (!hasAcknowledgment && isPivot) {
            const matchingPair = this.findMatchingPair(pairs, user2, this.findNextMarcusMessage(exchanges, i + 2) || marcus);
            notListening.push({
              id: `not_listening_${user2.id}`,
              timestamp: user2.timestamp,
              type: 'missed_trust',
              severity: 0.7,
              sourcePairId: matchingPair?.id ?? `fallback_${user2.id}_${marcus.id}`,
              sourceUserId: user2.id,
              sourceMarcusId: marcus.id,
              userMessage: user2.text,
              marcusResponse: this.findNextMarcusMessage(exchanges, i + 2)?.text || '',
              resistanceBefore: user2.resistanceLevel || 7,
              resistanceAfter: this.findNextMarcusMessage(exchanges, i + 2)?.resistanceLevel || 7,
              whatHappened: 'Marcus opened up but you didn\'t acknowledge it - he feels unheard',
              hiddenOpportunity: 'When Marcus shares pain, acknowledge it: "That sounds frustrating..." Then dig deeper before pitching'
            });
          }
        }
      }
    }
    
    return notListening;
  }
  
  /**
   * NEW: Find closed questions - yes/no questions that limit discovery
   * Pattern: Questions ending in ? but not starting with open-ended words
   */
  private findClosedQuestions(transcript: ConversationTranscript, pairs: ExchangePair[]): CriticalMoment[] {
    const closedQs: CriticalMoment[] = [];
    const exchanges = transcript.exchanges;
    const userMessages = exchanges.filter(e => e.speaker === 'user');
    
    const openPatterns = [/\b(what|how|why|tell me|describe|explain|walk me through)\b/i];
    
    let closedCount = 0;
    let lastClosedPair: { user: ConversationExchange; marcus: ConversationExchange } | null = null;
    
    for (const user of userMessages) {
      if (user.text.includes('?')) {
        const isOpen = openPatterns.some(p => p.test(user.text));
        
        if (!isOpen) {
          closedCount++;
          const nextMarcus = this.findNextMarcusMessage(exchanges, exchanges.indexOf(user));
          if (nextMarcus) {
            lastClosedPair = { user, marcus: nextMarcus };
          }
        }
      }
    }
    
    // If 3+ closed questions in a row, flag it
    if (closedCount >= 3 && lastClosedPair) {
      const matchingPair = this.findMatchingPair(pairs, lastClosedPair.user, lastClosedPair.marcus);
      closedQs.push({
        id: `closed_q_${lastClosedPair.user.id}`,
        timestamp: lastClosedPair.user.timestamp,
        type: 'missed_pain',
        severity: 0.6,
        sourcePairId: matchingPair?.id ?? `fallback_${lastClosedPair.user.id}_${lastClosedPair.marcus.id}`,
        sourceUserId: lastClosedPair.user.id,
        sourceMarcusId: lastClosedPair.marcus.id,
        userMessage: lastClosedPair.user.text,
        marcusResponse: lastClosedPair.marcus.text,
        resistanceBefore: lastClosedPair.user.resistanceLevel || 7,
        resistanceAfter: lastClosedPair.marcus.resistanceLevel || 7,
        whatHappened: 'Your closed questions limit Marcus\'s answers to yes/no - you\'re not uncovering real pain',
        hiddenOpportunity: 'Use open-ended questions: "What challenges..." "How does that affect..." "Tell me about..."'
      });
    }
    
    return closedQs;
  }
  
  /**
   * NEW: Find question depth progression - are questions getting deeper over time?
   * Success pattern: Questions become more specific and targeted as call progresses
   */
  private findQuestionDepthProgression(transcript: ConversationTranscript, pairs: ExchangePair[]): SuccessfulMoment[] {
    const progressions: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    const userMessages = exchanges.filter(e => e.speaker === 'user' && e.text.includes('?'));
    
    if (userMessages.length < 3) return progressions;
    
    // Check if questions get more specific (contain references to previous answers)
    const referencePatterns = [/\b(that|those|your|the [a-z]+ you mentioned|when you said)\b/i];
    
    for (let i = 2; i < userMessages.length; i++) {
      const current = userMessages[i];
      const hasReference = referencePatterns.some(p => p.test(current.text));
      const isOpen = /\b(what|how|why|tell me)\b/i.test(current.text);
      
      if (hasReference && isOpen) {
        const nextMarcus = this.findNextMarcusMessage(exchanges, exchanges.indexOf(current));
        if (nextMarcus) {
          const matchingPair = this.findMatchingPair(pairs, current, nextMarcus);
          progressions.push({
            id: `q_depth_${current.id}`,
            timestamp: current.timestamp,
            type: 'pain_discovery',
            impact: 0.7,
            sourcePairId: matchingPair?.id ?? `fallback_${current.id}_${nextMarcus.id}`,
            sourceUserId: current.id,
            sourceMarcusId: nextMarcus.id,
            userMessage: current.text,
            marcusResponse: nextMarcus.text,
            resistanceBefore: current.resistanceLevel || 0,
            resistanceAfter: nextMarcus.resistanceLevel || 0,
            whatHappened: 'Your follow-up question dug deeper into what Marcus just shared',
            whyItWorked: 'Good discovery builds on previous answers - shows you\'re listening and care about details',
            repeatThis: 'Reference their words: "You mentioned [X]... tell me more about that"'
          });
        }
      }
    }
    
    return progressions;
  }
  
  /**
   * NEW: Find rapport building - incremental trust improvements through empathy/acknowledgment
   * Success pattern: Using empathy statements, acknowledging concerns
   */
  private findRapportBuilding(transcript: ConversationTranscript, pairs: ExchangePair[]): SuccessfulMoment[] {
    const rapportMoments: SuccessfulMoment[] = [];
    const exchanges = transcript.exchanges;
    
    const empathyPatterns = [
      /\b(I understand|that makes sense|I hear you|that sounds|must be frustrating|I can see why|appreciate you sharing)\b/i
    ];
    
    for (let i = 0; i < exchanges.length - 1; i++) {
      const user = exchanges[i];
      const marcus = exchanges[i + 1];
      
      if (user.speaker === 'user' && marcus.speaker === 'marcus') {
        const hasEmpathy = empathyPatterns.some(p => p.test(user.text));
        
        if (hasEmpathy) {
          const matchingPair = this.findMatchingPair(pairs, user, marcus);
          rapportMoments.push({
            id: `rapport_${user.id}`,
            timestamp: user.timestamp,
            type: 'trust_moment',
            impact: 0.65,
            sourcePairId: matchingPair?.id ?? `fallback_${user.id}_${marcus.id}`,
            sourceUserId: user.id,
            sourceMarcusId: marcus.id,
            userMessage: user.text,
            marcusResponse: marcus.text,
            resistanceBefore: user.resistanceLevel || 0,
            resistanceAfter: marcus.resistanceLevel || 0,
            whatHappened: 'You acknowledged Marcus\'s perspective - building trust',
            whyItWorked: 'Empathy statements show you\'re listening and care about their challenges, not just making a sale',
            repeatThis: 'Use: "I understand...", "That makes sense...", "I can see why that\'s challenging..."'
          });
        }
      }
    }
    
    return rapportMoments;
  }
  
  /**
   * NEW: Find listen ratio improvement - are they listening more (talking less) over time?
   * Success pattern: User message length decreases while question quality increases
   */
  private findListenRatioImprovement(transcript: ConversationTranscript, pairs: ExchangePair[]): SuccessfulMoment | null {
    const exchanges = transcript.exchanges;
    const userMessages = exchanges.filter(e => e.speaker === 'user');
    
    if (userMessages.length < 4) return null;
    
    // Compare first half vs second half average word count
    const midpoint = Math.floor(userMessages.length / 2);
    const firstHalf = userMessages.slice(0, midpoint);
    const secondHalf = userMessages.slice(midpoint);
    
    const avgFirst = firstHalf.reduce((sum, msg) => sum + msg.text.split(/\s+/).length, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, msg) => sum + msg.text.split(/\s+/).length, 0) / secondHalf.length;
    
    // If second half is 20%+ shorter, they're listening more
    if (avgSecond < avgFirst * 0.8) {
      const lastUser = userMessages[userMessages.length - 1];
      const lastMarcus = this.findNextMarcusMessage(exchanges, exchanges.indexOf(lastUser));
      
      if (lastMarcus) {
        const matchingPair = this.findMatchingPair(pairs, lastUser, lastMarcus);
        return {
          id: `listen_ratio_improvement`,
          timestamp: lastUser.timestamp,
          type: 'trust_moment',
          impact: 0.8,
          sourcePairId: matchingPair?.id ?? `fallback_${lastUser.id}_${lastMarcus.id}`,
          sourceUserId: lastUser.id,
          sourceMarcusId: lastMarcus.id,
          userMessage: lastUser.text,
          marcusResponse: lastMarcus.text,
          resistanceBefore: lastUser.resistanceLevel || 0,
          resistanceAfter: lastMarcus.resistanceLevel || 0,
          whatHappened: 'You\'re talking less and listening more as the call progresses',
          whyItWorked: 'Best salespeople listen 70%+ of the time - you\'re moving in that direction',
          repeatThis: 'Keep responses under 3 sentences. Ask questions. Let Marcus do the talking.'
        };
      }
    }
    
    return null;
  }
}

/**
 * TreeDeltaManager
 * 
 * Generates buyer-facing guidance from the buyer-state tree for Marcus's prompt.
 * Marcus is the buyer, so all guidance is from his perspective:
 * - What Marcus is thinking/feeling right now
 * - How Marcus should behave
 * - How Marcus should react to different seller actions
 * - What Marcus should not reveal too early
 * 
 * Uses PreTreeBuyerPolicy for realistic behavior before tree activates.
 * 
 * Phase 1: Buyer-facing deltas only
 * Phase 2+: Add seller-facing coaching deltas
 */

import { BuyerStateNode, BuyerStateTransition, BuyerStateType } from './BuyerStateTree';
import { BuyerBeliefState } from './BuyerBeliefTracker';
import { PreTreeBuyerPolicy, PreTreeContext, PreTreeGuidance } from './PreTreeBuyerPolicy';
import { ProductConfidence } from './ProductConfidenceDetector';
import { AvailabilityPolicy, type AvailabilityState, type AvailabilityContext } from './AvailabilityPolicy';

export interface BuyerDelta {
  currentState: {
    type: BuyerStateType;
    subtype: string | null;
    name: string;
    description: string;
  };
  
  internalPosture: string;
  behaviorGuidance: string[];
  reactionGuidance: Array<{
    sellerAction: string;
    marcusReaction: string;
  }>;
  doNotReveal: string[];
  
  guidanceText: string;
}

export class TreeDeltaManager {
  /**
   * Generate buyer-facing prompt delta from current tree state or pre-tree policy
   * with availability overlay
   */
  generateBuyerDelta(
    currentNode: BuyerStateNode | null,
    childNodes: BuyerStateNode[],
    beliefState: BuyerBeliefState,
    lastTransition: BuyerStateTransition | null,
    turnNumber: number = 0,
    productConfidence: ProductConfidence,
    treeActivated: boolean = false,
    recentSellerSignals: string[] | { persistent: string[]; turnSpecific: string[] } = [],
    scenarioTraits?: {
      urgency: number;
      openness: number;
      satisfaction: number;
      initialResistance: number;
      patience: number;
    }
  ): BuyerDelta | null {
    // Flatten scoped signals if passed as object
    const flattenedSignals = Array.isArray(recentSellerSignals) 
      ? recentSellerSignals 
      : [...recentSellerSignals.persistent, ...recentSellerSignals.turnSpecific];
    // Determine availability state from scenario traits
    const availability = this.determineAvailability(
      turnNumber,
      productConfidence,
      beliefState,
      scenarioTraits
    );
    
    console.log(`🕐 [Availability] State: ${availability}`);
    
    // Use pre-tree guidance when:
    // 1. Tree is not activated yet
    // 2. Tree is stuck in Initial Contact after Turn 2 with HIGH product confidence
    const stuckInInitialContact = currentNode?.stateName === 'Initial Contact' && 
                                   turnNumber > 2 && 
                                   productConfidence.confidence === 'high';
    
    const shouldUsePreTree = !treeActivated || stuckInInitialContact;
    
    if (shouldUsePreTree) {
      console.log(`🌳 [TreeDelta] Using PRE-TREE guidance (activated=${treeActivated}, stuck=${stuckInInitialContact})`);
      return this.generatePreTreeDelta(
        beliefState,
        turnNumber,
        productConfidence,
        flattenedSignals,
        availability
      );
    }
    
    if (!currentNode) return null;
    
    // Extract current state info
    const currentState = {
      type: currentNode.stateType,
      subtype: currentNode.stateSubtype,
      name: currentNode.stateName,
      description: currentNode.stateDescription
    };
    
    // Generate internal posture (what Marcus is thinking/feeling)
    const internalPosture = this.generateInternalPosture(
      currentNode, 
      beliefState, 
      turnNumber, 
      productConfidence.confidence
    );
    
    // Generate behavior guidance (how Marcus should act)
    const behaviorGuidance = this.generateBehaviorGuidance(currentNode, beliefState);
    
    // Generate reaction guidance (how Marcus reacts to seller actions)
    const reactionGuidance = this.generateReactionGuidance(currentNode, childNodes);
    
    // Generate do-not-reveal list (what Marcus should hold back)
    const doNotReveal = this.generateDoNotReveal(currentNode, beliefState);
    
    // Generate natural language guidance text
    const guidanceText = this.generateBuyerGuidanceText(
      currentState,
      internalPosture,
      behaviorGuidance,
      reactionGuidance,
      doNotReveal,
      lastTransition
    );
    
    return {
      currentState,
      internalPosture,
      behaviorGuidance,
      reactionGuidance,
      doNotReveal,
      guidanceText
    };
  }
  
  /**
   * Determine availability state from scenario traits and context
   */
  private determineAvailability(
    turnNumber: number,
    productConfidence: ProductConfidence,
    beliefState: BuyerBeliefState,
    scenarioTraits?: {
      urgency: number;
      openness: number;
      satisfaction: number;
      initialResistance: number;
      patience: number;
    }
  ): AvailabilityState {
    // Default to available if no scenario traits provided
    if (!scenarioTraits) {
      return 'available';
    }
    
    // Determine if seller has earned relevance
    const hasEarnedRelevance = 
      productConfidence.confidence === 'high' && 
      (beliefState.seesRelevance >= 6 || beliefState.trustsRep >= 6);
    
    const context: AvailabilityContext = {
      urgency: scenarioTraits.urgency,
      openness: scenarioTraits.openness,
      satisfaction: scenarioTraits.satisfaction,
      initialResistance: scenarioTraits.initialResistance,
      patience: scenarioTraits.patience,
      turnNumber,
      hasEarnedRelevance,
      productConfidenceLevel: productConfidence.confidence
    };
    
    return AvailabilityPolicy.determineAvailability(context);
  }
  
  /**
   * Generate pre-tree buyer guidance before tree takes over with availability overlay
   */
  private generatePreTreeDelta(
    beliefState: BuyerBeliefState,
    turnNumber: number,
    productConfidence: ProductConfidence,
    recentSellerSignals: string[],
    availability: AvailabilityState
  ): BuyerDelta {
    // Split product/company detection for clearer pre-tree context
    const detectedCompany = productConfidence.product?.includes(' ') ? undefined : productConfidence.product || undefined;
    const detectedProductName = productConfidence.product || undefined;
    const detectedProductDescription = productConfidence.category || undefined;
    
    const context: PreTreeContext = {
      productConfidence,
      beliefState,
      turnNumber,
      detectedCompany,
      detectedProductName,
      detectedProductDescription,
      detectedCategory: productConfidence.category || undefined,
      detectedFeatures: productConfidence.signals || [],
      recentSellerSignals: recentSellerSignals as any[] // Will be SellerSignalId[] when CharmerController passes them
    };
    
    const guidance = PreTreeBuyerPolicy.generateGuidance(context, availability);
    
    console.log(`🌳 [PreTree] Mode: ${guidance.mode}`);
    console.log(`🌳 [PreTree] Posture: ${guidance.internalPosture.substring(0, 80)}...`);
    console.log(`🌳 [PreTree] Examples: ${guidance.voiceExamples.join(' / ')}`);
    
    return {
      currentState: {
        type: 'clarification' as BuyerStateType,
        subtype: 'pre_tree',
        name: `Pre-Tree: ${guidance.mode}`,
        description: guidance.internalPosture
      },
      internalPosture: guidance.internalPosture,
      behaviorGuidance: guidance.promptGuidance,  // Use clean prompt guidance
      reactionGuidance: [],
      doNotReveal: this.generatePreTreeDoNotReveal(guidance.mode),
      guidanceText: this.generatePreTreeGuidanceText(guidance)
    };
  }
  
  /**
   * Generate do-not-reveal list for pre-tree mode
   */
  private generatePreTreeDoNotReveal(mode: string): string[] {
    // Pre-tree modes should withhold deep information
    return [
      'Budget or specific numbers',
      'Decision-making authority',
      'Detailed pain points unless earned',
      'Timeline or urgency details',
      'Internal processes or team structure'
    ];
  }
  
  /**
   * Generate guidance text for pre-tree mode
   */
  private generatePreTreeGuidanceText(guidance: PreTreeGuidance): string {
    const parts: string[] = [];
    
    parts.push(`BUYER STATE: ${guidance.mode.replace(/_/g, ' ')}`);
    parts.push(guidance.internalPosture);
    parts.push('');
    parts.push('REACTION RULES:');
    guidance.promptGuidance.forEach(b => {
      parts.push(`• ${b}`);
    });
    parts.push('');
    parts.push(`Withhold: ${this.generatePreTreeDoNotReveal(guidance.mode).join(', ')}.`);
    
    return parts.join('\n');
  }
  
  /**
   * Generate internal posture (what Marcus is thinking/feeling)
   */
  private generateInternalPosture(
    node: BuyerStateNode, 
    beliefs: BuyerBeliefState,
    turnNumber: number,
    productConfidenceLevel: string
  ): string {
    const parts: string[] = [];
    
    // GUARD: Don't use "just picked up the phone" after Turn 2
    const isEarlyCall = turnNumber <= 2;
    const nodeDescriptionFiltered = isEarlyCall 
      ? node.stateDescription
      : node.stateDescription.replace(/Marcus just picked up the phone\./gi, '').trim();
    
    // Add state description as base posture (filtered)
    if (nodeDescriptionFiltered) {
      parts.push(nodeDescriptionFiltered);
    }
    
    // GUARD: Don't say "don't understand what they're selling" if productConfidence is HIGH
    const productIsUnderstood = productConfidenceLevel === 'high' || productConfidenceLevel === 'medium';
    
    // Add belief-based internal thoughts with guards
    if (beliefs.understandsProduct < 3 && !productIsUnderstood) {
      parts.push("You don't really understand what they're selling yet.");
    }
    
    if (beliefs.seesRelevance < 3) {
      parts.push("You're not seeing how this connects to your business.");
    }
    
    if (beliefs.trustsRep < 3) {
      parts.push("You're not sure if you trust this person yet.");
    }
    
    if (beliefs.painClarity < 3) {
      parts.push("You're not even clear on your own challenges right now.");
    }
    
    return parts.join(' ');
  }
  
  /**
   * Generate behavior guidance (how Marcus should act right now)
   */
  private generateBehaviorGuidance(node: BuyerStateNode, beliefs: BuyerBeliefState): string[] {
    const guidance: string[] = [];
    
    // Use expected behaviors from state definition
    node.expectedBehaviors.forEach(behavior => {
      guidance.push(behavior);
    });
    
    // Add belief-based guidance
    if (node.stateType === 'distrust' || node.stateType === 'exit_attempt') {
      guidance.push('Keep responses brief and guarded');
      guidance.push('Look for reasons to exit the conversation');
    }
    
    if (node.stateType === 'clarification') {
      guidance.push('Ask one brief clarifying question if needed');
      guidance.push('Stay professional but non-committal');
    }
    
    if (node.stateType === 'buying_signal') {
      guidance.push('Ask specific questions about fit');
      guidance.push('Share limited context about your situation');
    }
    
    return guidance;
  }
  
  /**
   * Generate reaction guidance (how Marcus reacts to seller actions)
   */
  private generateReactionGuidance(
    currentNode: BuyerStateNode,
    childNodes: BuyerStateNode[]
  ): Array<{ sellerAction: string; marcusReaction: string }> {
    const reactionsMap = new Map<string, { sellerAction: string; marcusReaction: string }>();
    
    // Map seller triggers to Marcus reactions based on child states
    childNodes
      .filter(child => child.lifecycle === 'active' || child.lifecycle === 'deprioritized')
      .forEach(child => {
        // Positive states
        if (child.stateType === 'buying_signal' || child.stateType === 'clarification') {
          // Check both hard and soft triggers
          [...child.hardTriggers, ...child.softTriggers].forEach(trigger => {
            const reaction = this.triggerToMarcusReaction(trigger, child.stateName, 'positive');
            if (reaction && !reactionsMap.has(trigger)) {
              reactionsMap.set(trigger, reaction);
            }
          });
        }
        
        // Negative states
        if (child.stateType === 'distrust' || child.stateType === 'exit_attempt' || child.stateType === 'fit_concern') {
          // Check both hard and soft triggers
          [...child.hardTriggers, ...child.softTriggers].forEach(trigger => {
            const reaction = this.triggerToMarcusReaction(trigger, child.stateName, 'negative');
            if (reaction && !reactionsMap.has(trigger)) {
              reactionsMap.set(trigger, reaction);
            }
          });
        }
      });
    
    return Array.from(reactionsMap.values());
  }
  
  /**
   * Convert trigger ID to Marcus's reaction
   */
  private triggerToMarcusReaction(
    triggerId: string,
    targetStateName: string,
    direction: 'positive' | 'negative'
  ): { sellerAction: string; marcusReaction: string } | null {
    const reactionMap: Record<string, { sellerAction: string; positive: string; negative: string }> = {
      'rep_provides_clear_value_statement': {
        sellerAction: 'seller provides clear, specific value',
        positive: 'become slightly more open and curious',
        negative: 'remain skeptical'
      },
      'rep_launches_into_pitch_immediately': {
        sellerAction: 'seller jumps into pitch without rapport',
        positive: 'stay neutral',
        negative: 'become guarded and dismissive'
      },
      'rep_asks_good_discovery_question': {
        sellerAction: 'seller asks thoughtful discovery questions',
        positive: 'become more open and share limited context',
        negative: 'stay guarded'
      },
      'rep_makes_bold_claim_without_proof': {
        sellerAction: 'seller makes bold claims without evidence',
        positive: 'stay skeptical',
        negative: 'become distrustful or ask for proof'
      },
      'rep_pushes_too_hard': {
        sellerAction: 'seller pushes too hard for commitment',
        positive: 'push back',
        negative: 'become resistant or try to exit'
      },
      'rep_demonstrates_genuine_curiosity': {
        sellerAction: 'seller shows genuine curiosity about your business',
        positive: 'lower your guard slightly',
        negative: 'stay neutral'
      },
      'rep_respects_time': {
        sellerAction: 'seller acknowledges your time constraints',
        positive: 'appreciate the respect and stay engaged',
        negative: 'stay neutral'
      },
      'rep_fails_to_establish_relevance': {
        sellerAction: 'seller fails to connect to your needs',
        positive: 'stay polite but disengaged',
        negative: 'lose interest or exit'
      }
    };
    
    const mapping = reactionMap[triggerId];
    if (!mapping) return null;
    
    return {
      sellerAction: `If ${mapping.sellerAction}`,
      marcusReaction: direction === 'positive' ? mapping.positive : mapping.negative
    };
  }
  
  /**
   * Generate do-not-reveal list (what Marcus should hold back until earned)
   */
  private generateDoNotReveal(node: BuyerStateNode, beliefs: BuyerBeliefState): string[] {
    const doNotRevealSet = new Set<string>();
    
    // Early states: don't reveal much
    if (node.stateType === 'initial_contact' || node.stateType === 'distrust') {
      doNotRevealSet.add('Budget or specific numbers');
      doNotRevealSet.add('Decision-making authority');
      doNotRevealSet.add('Detailed pain points');
      doNotRevealSet.add('Timeline or urgency');
    }
    
    // Mid states: hold back some details
    if (node.stateType === 'clarification' || node.stateType === 'timing_concern') {
      doNotRevealSet.add('Exact budget');
      doNotRevealSet.add('Full decision-making process');
    }
    
    // Low trust: extra guarded
    if (beliefs.trustsRep < 4) {
      doNotRevealSet.add('Internal challenges or weaknesses');
      doNotRevealSet.add('Previous vendor failures');
    }
    
    return Array.from(doNotRevealSet);
  }
  
  /**
   * Generate natural language buyer guidance text for Marcus's prompt
   * COMPRESSED FORMAT: Focused logic + 2-4 voice examples only
   */
  private generateBuyerGuidanceText(
    currentState: BuyerDelta['currentState'],
    internalPosture: string,
    behaviorGuidance: string[],
    reactions: BuyerDelta['reactionGuidance'],
    doNotReveal: string[],
    lastTransition: BuyerStateTransition | null
  ): string {
    const parts: string[] = [];
    
    // SECTION 1: Compressed buyer-state logic (no examples)
    parts.push(`BUYER STATE: ${currentState.name}`);
    parts.push(internalPosture);
    
    // Compress behavior + reactions into bullet rules
    if (behaviorGuidance.length > 0 || reactions.length > 0) {
      parts.push(`\nREACTION RULES:`);
      
      // Take top 2 reactions only
      const topReactions = reactions.slice(0, 2);
      topReactions.forEach(r => {
        parts.push(`• ${r.sellerAction}, ${r.marcusReaction}`);
      });
      
      // Add 1-2 key behaviors if not redundant
      const keyBehaviors = behaviorGuidance.slice(0, 2).filter(b => 
        !topReactions.some(r => r.marcusReaction.toLowerCase().includes(b.toLowerCase().split(' ')[0]))
      );
      keyBehaviors.forEach(behavior => {
        parts.push(`• ${behavior}`);
      });
    }
    
    // Compress do-not-reveal into single line
    if (doNotReveal.length > 0) {
      const compressed = doNotReveal.slice(0, 3).join(', ');
      parts.push(`\nWithhold: ${compressed} unless earned.`);
    }
    
    // SECTION 2: Voice examples (tone reference only)
    const voiceExamples = this.generateVoiceExamples(currentState, reactions);
    if (voiceExamples.length > 0) {
      parts.push(`\nVOICE EXAMPLES (tone reference, not exact lines):`);
      voiceExamples.forEach(ex => parts.push(`• "${ex}"`));
    }
    
    return parts.join('\n');
  }
  
  /**
   * Generate 2-4 focused voice examples for current state + likely transitions
   */
  private generateVoiceExamples(
    currentState: BuyerDelta['currentState'],
    reactions: BuyerDelta['reactionGuidance']
  ): string[] {
    const examples: string[] = [];
    
    // Example 1: Current state tone
    const stateExamples: Record<string, string> = {
      'Skeptical - Proof Request': "15% sounds nice. Who actually got that result?",
      'Guarded - Cold Open': "Yeah, what's this about?",
      'Distrust - Bold Claims': "That's a pretty big claim. What's the proof?",
      'Clarification Needed': "Wait, what exactly are you saying?",
      'Timing Concern': "Not really the right time for this.",
      'Budget Concern': "I don't have budget for new tools right now.",
      'Exit Attempt - Poor Fit': "I don't think this is a fit.",
      'Buying Signal - Interested': "Okay, that's interesting. How does it work for teams like mine?"
    };
    
    // Match state name to example
    const stateEx = stateExamples[currentState.name];
    if (stateEx) {
      examples.push(stateEx);
    } else {
      // Generic fallback based on state type
      if (currentState.type === 'distrust') {
        examples.push("I'm not really following. What are you selling?");
      } else if (currentState.type === 'clarification') {
        examples.push("Hold on, I'm confused. What does this actually do?");
      } else if (currentState.type === 'buying_signal') {
        examples.push("Tell me more about how that works.");
      }
    }
    
    // Example 2-3: Most likely positive/negative reactions
    const positiveReaction = reactions.find(r => 
      r.marcusReaction.includes('open') || r.marcusReaction.includes('curious') || r.marcusReaction.includes('share')
    );
    const negativeReaction = reactions.find(r => 
      r.marcusReaction.includes('skeptical') || r.marcusReaction.includes('guarded') || r.marcusReaction.includes('exit')
    );
    
    if (positiveReaction) {
      // Generate example for positive movement
      if (positiveReaction.sellerAction.includes('value')) {
        examples.push("Okay, that makes sense. How does it compare to Gong?");
      } else if (positiveReaction.sellerAction.includes('discovery')) {
        examples.push("Yeah, we do have some challenges with that.");
      }
    }
    
    if (negativeReaction) {
      // Generate example for negative movement
      if (negativeReaction.sellerAction.includes('claim') || negativeReaction.sellerAction.includes('proof')) {
        examples.push("That's pretty vague. Give me something concrete.");
      } else if (negativeReaction.sellerAction.includes('push')) {
        examples.push("Whoa, slow down. I'm not ready for that.");
      }
    }
    
    // Cap at 2 examples max (keep guidance compact)
    return examples.slice(0, 2);
  }
  
  
  /**
   * Generate minimal buyer delta (for memory-constrained scenarios)
   */
  generateMinimalBuyerDelta(
    currentNode: BuyerStateNode | null,
    childNodes: BuyerStateNode[]
  ): string {
    if (!currentNode) return '';
    
    const lines: string[] = [];
    
    lines.push(`State: ${currentNode.stateName}`);
    lines.push(currentNode.stateDescription);
    
    // Filter out retired and dormant nodes, then sort by confidence
    const activeChildren = childNodes.filter(
      child => child.lifecycle !== 'retired' && child.lifecycle !== 'dormant'
    );
    
    if (activeChildren.length > 0) {
      const sortedChildren = [...activeChildren].sort((a, b) => 
        b.currentConfidence - a.currentConfidence
      );
      const topChild = sortedChildren[0];
      lines.push(`Likely next: ${topChild.stateName}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Check if buyer delta has changed significantly (to avoid redundant updates)
   */
  hasSignificantChange(
    oldDelta: BuyerDelta | null,
    newDelta: BuyerDelta | null
  ): boolean {
    if (!oldDelta && newDelta) return true;
    if (oldDelta && !newDelta) return true;
    if (!oldDelta && !newDelta) return false;
    
    // Check if current state changed (compare structured identity)
    if (
      oldDelta!.currentState.type !== newDelta!.currentState.type ||
      oldDelta!.currentState.subtype !== newDelta!.currentState.subtype
    ) {
      return true;
    }
    
    // Check if behavior guidance changed
    if (oldDelta!.behaviorGuidance.length !== newDelta!.behaviorGuidance.length) {
      return true;
    }
    
    // Check if reaction guidance changed significantly (count, not exact text)
    if (oldDelta!.reactionGuidance.length !== newDelta!.reactionGuidance.length) {
      return true;
    }
    
    // Check if do-not-reveal list changed
    if (oldDelta!.doNotReveal.length !== newDelta!.doNotReveal.length) {
      return true;
    }
    
    return false;
  }
  
  // TODO Phase 2+: Implement generateCoachDelta() for seller-facing coaching guidance
  // TODO Phase 2+: Add context-aware guidance based on conversation history
  // TODO Phase 2+: Include confidence scores in buyer guidance
  // TODO Phase 2+: More sophisticated reaction mapping based on conversation flow
}

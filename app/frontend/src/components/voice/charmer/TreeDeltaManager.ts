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
 * Phase 1: Buyer-facing deltas only
 * Phase 2+: Add seller-facing coaching deltas
 */

import { BuyerStateNode, BuyerStateTransition, BuyerStateType } from './BuyerStateTree';
import { BuyerBeliefState } from './BuyerBeliefTracker';

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
   * Generate buyer-facing prompt delta from current tree state
   */
  generateBuyerDelta(
    currentNode: BuyerStateNode | null,
    childNodes: BuyerStateNode[],
    beliefState: BuyerBeliefState,
    lastTransition: BuyerStateTransition | null
  ): BuyerDelta | null {
    if (!currentNode) return null;
    
    // Extract current state info
    const currentState = {
      type: currentNode.stateType,
      subtype: currentNode.stateSubtype,
      name: currentNode.stateName,
      description: currentNode.stateDescription
    };
    
    // Generate internal posture (what Marcus is thinking/feeling)
    const internalPosture = this.generateInternalPosture(currentNode, beliefState);
    
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
   * Generate internal posture (what Marcus is thinking/feeling)
   */
  private generateInternalPosture(node: BuyerStateNode, beliefs: BuyerBeliefState): string {
    const parts: string[] = [];
    
    // Add state description as base posture
    parts.push(node.stateDescription);
    
    // Add belief-based internal thoughts
    if (beliefs.understandsProduct < 3) {
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
    
    // Part 1: Current state and internal posture
    parts.push(`**Current State: ${currentState.name}**`);
    parts.push(internalPosture);
    
    // Part 2: How to behave
    if (behaviorGuidance.length > 0) {
      parts.push(`\n**How to behave:**`);
      parts.push(`(Use these as behavioral tendencies, not exact lines)`);
      behaviorGuidance.forEach(guidance => {
        parts.push(`- ${guidance}`);
      });
    }
    
    // Part 3: Reaction guidance
    if (reactions.length > 0) {
      parts.push(`\n**How to react to seller actions:**`);
      reactions.slice(0, 4).forEach(r => {
        parts.push(`- ${r.sellerAction}, ${r.marcusReaction}`);
      });
    }
    
    // Part 4: What not to reveal unless earned
    if (doNotReveal.length > 0) {
      parts.push(`\n**Do not reveal unless earned:**`);
      parts.push(`(If seller builds relevance, trust, and asks good discovery questions, you may reveal limited information naturally)`);
      doNotReveal.forEach(item => {
        parts.push(`- ${item}`);
      });
    }
    
    // Part 5: Transition note
    if (lastTransition) {
      parts.push(`\n*[Your state shifted due to: ${lastTransition.reason}]*`);
    }
    
    return parts.join('\n');
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

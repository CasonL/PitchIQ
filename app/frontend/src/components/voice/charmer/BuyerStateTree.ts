/**
 * BuyerStateTree
 * 
 * Dynamic, sparse tree of buyer states that adapts based on:
 * - Product confidence
 * - Buyer belief state
 * - Seller actions (hard triggers vs strong soft triggers)
 * 
 * Phase 1 Features:
 * - Sparse 3-depth horizon (generate only a few steps ahead)
 * - Sticky state transitions (prevent rapid bouncing)
 * - Node lifecycle management (active → selected → expanded → deprioritized → dormant → retired)
 * - Confidence scoring for candidate states
 * - Background tree generation at medium product confidence
 * - Tree activation at high product confidence
 */

import { BuyerBeliefState } from './BuyerBeliefTracker';
import { ProductConfidence } from './ProductConfidenceDetector';
import { ProductConversationPhysics } from './prompts/ProductConversationFitService';

export type BuyerStateNodeLifecycle = 
  | 'active'        // Available for selection
  | 'selected'      // Currently the buyer's state
  | 'expanded'      // Children generated
  | 'deprioritized' // Still available but less likely
  | 'dormant'       // Not currently relevant
  | 'retired';      // Permanently removed from consideration

export type BuyerStateType =
  | 'initial_contact'
  | 'clarification'
  | 'distrust'
  | 'fit_concern'
  | 'timing_concern'
  | 'price_concern'
  | 'authority_concern'
  | 'current_solution_comparison'
  | 'risk_concern'
  | 'buying_signal'
  | 'exit_attempt';

export interface BuyerStateNode {
  nodeId: string;               // Permanent unique ID (e.g., "n_curious_001")
  displayPath: string;          // Hierarchical notation (e.g., "1.2.1")
  
  stateType: BuyerStateType;    // Structured state category
  stateSubtype: string | null;  // Specific variant within type
  stateName: string;            // Human-readable label
  stateDescription: string;     // What Marcus is thinking/feeling
  expectedBehaviors: string[];  // How Marcus might act
  
  parentId: string | null;
  childIds: string[];
  depth: number;
  
  lifecycle: BuyerStateNodeLifecycle;
  
  // Confidence and scoring
  baseConfidence: number;       // 0-100: How likely is this state generally?
  currentConfidence: number;    // 0-100: Given current context, how likely?
  
  // Triggers
  hardTriggers: string[];       // Actions that force this state
  softTriggers: string[];       // Actions that boost confidence
  
  // Stickiness
  turnsInState: number;         // How many turns Marcus has been in this state
  minTurnsBeforeTransition: number; // Prevent too-quick transitions
  
  // Metadata
  createdTurn: number;
  lastSelectedTurn: number | null;
  retiredTurn: number | null;
}

export interface BuyerStateTransition {
  fromNodeId: string;
  toNodeId: string;
  confidence: number;
  reason: string;
  triggerType: 'hard' | 'soft' | 'natural';
}

export interface HardTriggerDetection {
  triggerId: string;
  detected: boolean;
  reason?: string;
}

export interface CandidateScore {
  nodeId: string;
  stateType: BuyerStateType;
  stateSubtype: string | null;
  stateName: string;
  baseConfidence: number;
  beliefAlignment: number;
  triggerBonus: number;
  hardTriggerForced: boolean;
  lifecyclePenalty: number;
  depthPenalty: number;
  productPhysicsScore: number;  // Product realism boost/penalty
  finalScore: number;
  selected: boolean;
  reasonSelected?: string;
  reasonRejected?: string;
}

export interface TreeGenerationConfig {
  productName: string | null;
  productCategory: string | null;
  productPhysics: ProductConversationPhysics;  // CRITICAL: Product physics for realistic state selection
  beliefState: BuyerBeliefState;
  maxDepth: number;
  maxChildrenPerNode: number;
}

export class BuyerStateTree {
  private nodes: Map<string, BuyerStateNode>;
  private rootNodeId: string | null;
  private currentNodeId: string | null;
  private currentTurn: number;
  private nodeIdCounter: number;
  
  private treeGenerated: boolean;
  private treeActivated: boolean;
  
  // Store latest config for post-transition expansion
  private latestConfig: TreeGenerationConfig | null = null;
  
  // Track detected hard triggers this turn
  private currentHardTriggers: Set<string> = new Set();
  
  // Track last candidate scores for debugging
  private lastCandidateScores: CandidateScore[] = [];
  
  // Stickiness configuration
  private readonly MIN_TURNS_IN_STATE = 2;
  private readonly CONFIDENCE_THRESHOLD_TRANSITION = 50; // Reduced from 65 to allow faster transitions
  private readonly STICKY_BONUS_PER_TURN = 3; // Reduced from 5 to lower stickiness
  private readonly MAX_STICKY_BONUS = 12; // Reduced from 15
  private readonly TRANSITION_MARGIN = 10;
  
  constructor() {
    this.nodes = new Map();
    this.rootNodeId = null;
    this.currentNodeId = null;
    this.currentTurn = 0;
    this.nodeIdCounter = 0;
    this.treeGenerated = false;
    this.treeActivated = false;
  }
  
  /**
   * Generate the initial buyer state tree based on product/category
   */
  async generateTree(config: TreeGenerationConfig, turnNumber: number): Promise<void> {
    this.currentTurn = turnNumber;
    this.latestConfig = config;
    
    console.log(`🌳 [BuyerStateTree] Generating tree for "${config.productName || config.productCategory || 'Unknown Product'}"`);
    
    // Clear existing tree
    this.nodes.clear();
    this.nodeIdCounter = 0;
    
    // Create root node (initial state)
    const rootNode = this.createInitialState(config);
    this.nodes.set(rootNode.nodeId, rootNode);
    this.rootNodeId = rootNode.nodeId;
    this.currentNodeId = rootNode.nodeId;
    
    // Generate sparse horizon (depth 1-3)
    await this.expandNode(rootNode.nodeId, config, 1);
    
    this.treeGenerated = true;
    
    console.log(`🌳 [BuyerStateTree] Tree generated with ${this.nodes.size} nodes`);
    this.logTreeStructure();
  }
  
  /**
   * Create the initial buyer state (root)
   */
  private createInitialState(config: TreeGenerationConfig): BuyerStateNode {
    const nodeId = this.generateNodeId('initial');
    
    return {
      nodeId,
      displayPath: '1',
      stateType: 'initial_contact',
      stateSubtype: null,
      stateName: 'Initial Contact',
      stateDescription: 'Marcus just picked up the phone. He\'s neutral but mildly busy.',
      expectedBehaviors: [
        'Brief, polite greeting',
        'Might ask "Who is this?" or "What\'s this about?"',
        'Guarded but professional'
      ],
      parentId: null,
      childIds: [],
      depth: 0,
      lifecycle: 'selected',
      baseConfidence: 100,
      currentConfidence: 100,
      hardTriggers: [],
      softTriggers: [],
      turnsInState: 0,
      minTurnsBeforeTransition: 1,
      createdTurn: this.currentTurn,
      lastSelectedTurn: this.currentTurn,
      retiredTurn: null
    };
  }
  
  /**
   * Expand a node by generating its children (sparse)
   */
  private async expandNode(
    nodeId: string,
    config: TreeGenerationConfig,
    currentDepth: number
  ): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node || currentDepth > config.maxDepth) return;
    
    // Don't expand if already expanded
    if (node.lifecycle === 'expanded' || node.childIds.length > 0) return;
    
    // Generate children based on parent state and belief state
    const children = this.generateChildStates(node, config);
    
    // Add children to tree
    children.forEach((child, index) => {
      this.nodes.set(child.nodeId, child);
      node.childIds.push(child.nodeId);
    });
    
    // Mark as expanded
    if (node.lifecycle === 'selected') {
      // Keep it selected, but note it's expanded
    } else {
      node.lifecycle = 'expanded';
    }
    
    // Recursively expand children (sparse - only expand most likely path)
    if (currentDepth < config.maxDepth && children.length > 0) {
      // Expand only the highest-confidence child
      const bestChild = children.reduce((best, child) => 
        child.baseConfidence > best.baseConfidence ? child : best
      );
      await this.expandNode(bestChild.nodeId, config, currentDepth + 1);
    }
  }
  
  /**
   * Generate child states for a parent node
   */
  private generateChildStates(
    parent: BuyerStateNode,
    config: TreeGenerationConfig
  ): BuyerStateNode[] {
    const { beliefState, productCategory } = config;
    const children: BuyerStateNode[] = [];
    
    // Generate states based on parent and belief progression
    const childDefinitions = this.getChildStateDefinitions(parent, beliefState, productCategory);
    
    childDefinitions.forEach((def, index) => {
      const childNode: BuyerStateNode = {
        nodeId: this.generateNodeId(def.stateName),
        displayPath: `${parent.displayPath}.${index + 1}`,
        stateType: def.stateType,
        stateSubtype: def.stateSubtype,
        stateName: def.stateName,
        stateDescription: def.stateDescription,
        expectedBehaviors: def.expectedBehaviors,
        parentId: parent.nodeId,
        childIds: [],
        depth: parent.depth + 1,
        lifecycle: 'active',
        baseConfidence: def.baseConfidence,
        currentConfidence: def.baseConfidence,
        hardTriggers: def.hardTriggers,
        softTriggers: def.softTriggers,
        turnsInState: 0,
        minTurnsBeforeTransition: def.minTurns || this.MIN_TURNS_IN_STATE,
        createdTurn: this.currentTurn,
        lastSelectedTurn: null,
        retiredTurn: null
      };
      
      children.push(childNode);
    });
    
    return children;
  }
  
  /**
   * Get child state definitions based on parent state and belief state
   */
  private getChildStateDefinitions(
    parent: BuyerStateNode,
    beliefs: BuyerBeliefState,
    category: string | null
  ): Array<{
    stateType: BuyerStateType;
    stateSubtype: string | null;
    stateName: string;
    stateDescription: string;
    expectedBehaviors: string[];
    baseConfidence: number;
    hardTriggers: string[];
    softTriggers: string[];
    minTurns?: number;
  }> {
    // Phase 1: Simple state definitions
    // In Phase 2+, this would be LLM-generated based on product/persona
    
    if (parent.stateType === 'initial_contact') {
      return [
        {
          stateType: 'clarification',
          stateSubtype: 'politely_curious',
          stateName: 'Politely Curious',
          stateDescription: 'Marcus is willing to hear more, but keeping it brief.',
          expectedBehaviors: [
            'Asks "What\'s this about?"',
            'Brief, open-ended responses',
            'Checking time/urgency'
          ],
          baseConfidence: 40,
          hardTriggers: ['rep_provides_clear_value_statement'],
          softTriggers: ['rep_asks_permission_to_continue', 'rep_personalizes_opening'],
          minTurns: 2
        },
        {
          stateType: 'distrust',
          stateSubtype: 'guarded_skeptical',
          stateName: 'Guarded Skeptical',
          stateDescription: 'Marcus is defensive, assumes this is a sales pitch.',
          expectedBehaviors: [
            '"I\'m not interested"',
            '"We\'re all set"',
            'Short, dismissive responses'
          ],
          baseConfidence: 35,
          hardTriggers: ['rep_launches_into_pitch_immediately'],
          softTriggers: ['rep_sounds_scripted', 'rep_ignores_context'],
          minTurns: 2
        },
        {
          stateType: 'timing_concern',
          stateSubtype: 'busy_professional',
          stateName: 'Busy But Professional',
          stateDescription: 'Marcus is genuinely busy but willing to be polite.',
          expectedBehaviors: [
            '"Can you make this quick?"',
            '"What do you need?"',
            'Checking calendar/time'
          ],
          baseConfidence: 25,
          hardTriggers: ['rep_respects_time'],
          softTriggers: ['rep_asks_about_timing', 'rep_offers_to_reschedule'],
          minTurns: 1
        }
      ];
    }
    
    if (parent.stateType === 'clarification' && parent.stateSubtype === 'politely_curious') {
      if (beliefs.understandsProduct >= 5 && beliefs.seesRelevance >= 5) {
        return [
          {
            stateType: 'buying_signal',
            stateSubtype: 'engaged_asking',
            stateName: 'Engaged & Asking',
            stateDescription: 'Marcus sees potential relevance and wants to learn more.',
            expectedBehaviors: [
              'Asks specific questions',
              'Shares context about his situation',
              'Exploring fit'
            ],
            baseConfidence: 60,
            hardTriggers: ['rep_asks_good_discovery_question'],
            softTriggers: ['rep_demonstrates_product_understanding', 'rep_shares_relevant_example'],
            minTurns: 3
          },
          {
            stateType: 'risk_concern',
            stateSubtype: 'interested_cautious',
            stateName: 'Interested But Cautious',
            stateDescription: 'Marcus likes what he hears but wants proof.',
            expectedBehaviors: [
              '"Tell me more about..."',
              'Asking for case studies/proof',
              'Probing for catches'
            ],
            baseConfidence: 30,
            hardTriggers: ['rep_makes_bold_claim_without_proof'],
            softTriggers: ['rep_provides_social_proof', 'rep_shares_metrics'],
            minTurns: 2
          }
        ];
      } else {
        return [
          {
            stateType: 'fit_concern',
            stateSubtype: 'losing_interest',
            stateName: 'Losing Interest',
            stateDescription: 'Marcus doesn\'t see the relevance or value yet.',
            expectedBehaviors: [
              '"I don\'t think this is for us"',
              'Polite deflection',
              'Looking for exit'
            ],
            baseConfidence: 50,
            hardTriggers: ['rep_fails_to_establish_relevance'],
            softTriggers: ['rep_uses_jargon', 'rep_too_generic'],
            minTurns: 2
          }
        ];
      }
    }
    
    if (parent.stateType === 'distrust' && parent.stateSubtype === 'guarded_skeptical') {
      if (beliefs.trustsRep >= 4 && beliefs.seesRelevance >= 4) {
        return [
          {
            stateType: 'clarification',
            stateSubtype: 'warming_up',
            stateName: 'Warming Up',
            stateDescription: 'Marcus is lowering his guard a bit.',
            expectedBehaviors: [
              'Fewer one-word answers',
              'Willing to share context',
              'Still testing the rep'
            ],
            baseConfidence: 50,
            hardTriggers: ['rep_demonstrates_genuine_curiosity'],
            softTriggers: ['rep_builds_rapport', 'rep_asks_permission'],
            minTurns: 2
          }
        ];
      } else {
        return [
          {
            stateType: 'exit_attempt',
            stateSubtype: 'firming_resistance',
            stateName: 'Firming Up Resistance',
            stateDescription: 'Marcus is getting ready to end the call.',
            expectedBehaviors: [
              '"I really need to go"',
              '"We\'re not interested"',
              'Final objections'
            ],
            baseConfidence: 60,
            hardTriggers: ['rep_pushes_too_hard'],
            softTriggers: ['rep_ignores_objection', 'rep_sounds_desperate'],
            minTurns: 1
          }
        ];
      }
    }
    
    // Default: no children (leaf node or unhandled state)
    return [];
  }
  
  /**
   * Register hard triggers detected this turn (called by controller)
   */
  registerHardTriggers(triggers: string[]): void {
    this.currentHardTriggers.clear();
    triggers.forEach(t => this.currentHardTriggers.add(t));
  }
  
  /**
   * Update current buyer state based on new turn
   */
  async updateState(
    userUtterance: string,
    beliefs: BuyerBeliefState,
    productConfidence: ProductConfidence,
    turnNumber: number
  ): Promise<BuyerStateTransition | null> {
    this.currentTurn = turnNumber;
    
    // DEBUG: Verify internal state
    console.log('[BuyerStateTree.updateState]', {
      activated: this.treeActivated,
      generated: this.treeGenerated,
      currentNodeId: this.currentNodeId,
      nodeCount: this.nodes.size
    });
    
    // Update latest config with fresh belief state
    if (this.latestConfig) {
      this.latestConfig = {
        ...this.latestConfig,
        beliefState: beliefs
      };
    }
    
    // Age lifecycle states every turn
    this.updateLifecycleStates();
    
    if (!this.treeActivated || !this.currentNodeId) {
      console.log(`🌳 [BuyerStateTree] Tree not activated yet, staying in current state`);
      return null;
    }
    
    // Guard: don't update tree if product confidence is too low
    if (productConfidence.confidence === 'none' || productConfidence.confidence === 'low') {
      return null;
    }
    
    const currentNode = this.nodes.get(this.currentNodeId);
    if (!currentNode) return null;
    
    // Increment turns in current state
    currentNode.turnsInState++;
    
    // Check if we should transition
    const candidates = this.getCandidateStates(currentNode, userUtterance, beliefs);
    
    if (candidates.length === 0) {
      console.log(`🌳 [BuyerStateTree] No candidate transitions from "${currentNode.stateName}"`);
      this.currentHardTriggers.clear();
      return null;
    }
    
    // Score candidates with detailed breakdown - NOW WITH PRODUCT PHYSICS
    const scoredCandidates = candidates.map(candidate => 
      this.scoreCandidate(candidate, currentNode, beliefs, userUtterance, this.latestConfig?.productPhysics)
    );
    
    // Update currentConfidence on all candidate nodes
    scoredCandidates.forEach(scored => {
      const node = this.nodes.get(scored.nodeId);
      if (node) {
        node.currentConfidence = scored.finalScore;
      }
    });
    
    // Sort by score
    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);
    
    // Store for debugging (will update after final decision)
    this.lastCandidateScores = scoredCandidates;
    
    // Check for hard trigger forced transitions (pick best if multiple)
    const hardTriggeredCandidates = scoredCandidates.filter(c => c.hardTriggerForced);
    
    if (hardTriggeredCandidates.length > 0) {
      // Sort hard-triggered by score and pick best
      hardTriggeredCandidates.sort((a, b) => b.finalScore - a.finalScore);
      const bestHardTrigger = hardTriggeredCandidates[0];
      
      // Mark selected and rejected
      scoredCandidates.forEach(c => {
        if (c.nodeId === bestHardTrigger.nodeId) {
          c.selected = true;
          c.reasonSelected = 'Hard trigger forced';
        } else {
          c.selected = false;
          c.reasonRejected = c.hardTriggerForced 
            ? `Lower score than selected hard trigger`
            : `Not hard-triggered`;
        }
      });
      
      // Log all candidates before transitioning
      this.logCandidateScores(scoredCandidates, currentNode);
      
      console.log(`🌳 [BuyerStateTree] HARD TRIGGER forcing transition to "${bestHardTrigger.stateName}"`);
      const transition = await this.transitionToState(
        this.nodes.get(bestHardTrigger.nodeId)!,
        currentNode,
        bestHardTrigger.finalScore,
        'hard',
        scoredCandidates
      );
      this.currentHardTriggers.clear();
      return transition;
    }
    
    const bestCandidate = scoredCandidates[0];
    
    // Score current state for comparison
    const currentStateScore = this.scoreCurrentState(currentNode, beliefs);
    
    // Check stickiness: stay in current state unless transition confidence is high enough
    const stickyBonus = Math.min(this.MAX_STICKY_BONUS, this.STICKY_BONUS_PER_TURN * currentNode.turnsInState);
    const effectiveThreshold = this.CONFIDENCE_THRESHOLD_TRANSITION + stickyBonus;
    
    if (bestCandidate.finalScore < effectiveThreshold) {
      // Mark all as rejected
      scoredCandidates.forEach(c => {
        c.selected = false;
        c.reasonRejected = `Below threshold (${effectiveThreshold})`;
      });
      this.logCandidateScores(scoredCandidates, currentNode);
      console.log(`🌳 [BuyerStateTree] Staying in "${currentNode.stateName}" (score below threshold: ${bestCandidate.finalScore.toFixed(1)} < ${effectiveThreshold})`);
      this.currentHardTriggers.clear();
      return null;
    }
    
    // Check minimum turns
    if (currentNode.turnsInState < currentNode.minTurnsBeforeTransition) {
      // Mark all as rejected
      scoredCandidates.forEach(c => {
        c.selected = false;
        c.reasonRejected = `Min turns not met (${currentNode.minTurnsBeforeTransition})`;
      });
      this.logCandidateScores(scoredCandidates, currentNode);
      console.log(`🌳 [BuyerStateTree] Staying in "${currentNode.stateName}" (min turns: ${currentNode.minTurnsBeforeTransition}, current: ${currentNode.turnsInState})`);
      this.currentHardTriggers.clear();
      return null;
    }
    
    // Check margin: new state must beat current by meaningful amount
    const requiredScore = currentStateScore + this.TRANSITION_MARGIN;
    if (bestCandidate.finalScore < requiredScore) {
      // Mark all as rejected
      scoredCandidates.forEach(c => {
        c.selected = false;
        c.reasonRejected = `Insufficient margin over current state (need ${requiredScore.toFixed(1)})`;
      });
      this.logCandidateScores(scoredCandidates, currentNode);
      console.log(`🌳 [BuyerStateTree] Staying in "${currentNode.stateName}" (insufficient margin: ${bestCandidate.finalScore.toFixed(1)} < ${requiredScore.toFixed(1)})`);
      this.currentHardTriggers.clear();
      return null;
    }
    
    // Mark selected and rejected
    scoredCandidates.forEach((c, index) => {
      if (index === 0) {
        c.selected = true;
        c.reasonSelected = 'Highest score, passed all checks';
      } else {
        c.selected = false;
        const diff = bestCandidate.finalScore - c.finalScore;
        c.reasonRejected = `${diff.toFixed(1)} points below best`;
      }
    });
    
    // Log all candidates
    this.logCandidateScores(scoredCandidates, currentNode);
    
    // Transition to new state
    const transition = await this.transitionToState(
      this.nodes.get(bestCandidate.nodeId)!,
      currentNode,
      bestCandidate.finalScore,
      'soft',
      scoredCandidates
    );
    
    this.currentHardTriggers.clear();
    return transition;
  }
  
  /**
   * Get candidate states for transition
   */
  private getCandidateStates(
    currentNode: BuyerStateNode,
    userUtterance: string,
    beliefs: BuyerBeliefState
  ): BuyerStateNode[] {
    const candidates: BuyerStateNode[] = [];
    
    // Candidate 1: Children of current node (active, deprioritized, or dormant)
    currentNode.childIds.forEach(childId => {
      const child = this.nodes.get(childId);
      if (child && (child.lifecycle === 'active' || child.lifecycle === 'deprioritized' || child.lifecycle === 'dormant')) {
        candidates.push(child);
      }
    });
    
    // Candidate 2: Siblings (other children of parent)
    if (currentNode.parentId) {
      const parent = this.nodes.get(currentNode.parentId);
      if (parent) {
        parent.childIds.forEach(siblingId => {
          if (siblingId !== currentNode.nodeId) {
            const sibling = this.nodes.get(siblingId);
            if (sibling && (sibling.lifecycle === 'active' || sibling.lifecycle === 'deprioritized' || sibling.lifecycle === 'dormant')) {
              candidates.push(sibling);
            }
          }
        });
      }
    }
    
    return candidates;
  }
  
  /**
   * Score the current state (for comparison)
   */
  private scoreCurrentState(
    currentNode: BuyerStateNode,
    beliefs: BuyerBeliefState
  ): number {
    let score = currentNode.baseConfidence;
    
    // Current state gets belief alignment
    const beliefAlignment = this.calculateBeliefAlignment(currentNode, beliefs);
    score += beliefAlignment;
    
    // Current state gets inertia bonus (being here is comfortable)
    const inertiaBonus = Math.min(20, currentNode.turnsInState * 5);
    score += inertiaBonus;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Score a candidate state with detailed breakdown
   * NOW INCLUDES: Product physics for realistic buyer behavior per product type
   */
  private scoreCandidate(
    candidate: BuyerStateNode,
    currentNode: BuyerStateNode,
    beliefs: BuyerBeliefState,
    userUtterance: string,
    productPhysics?: ProductConversationPhysics
  ): CandidateScore {
    let score = candidate.baseConfidence;
    
    // Check for hard trigger
    const hasHardTrigger = candidate.hardTriggers.some(t => this.currentHardTriggers.has(t));
    
    // Factor 1: Belief alignment
    const beliefAlignment = this.calculateBeliefAlignment(candidate, beliefs);
    score += beliefAlignment;
    
    // Factor 2: Trigger detection
    const triggerBonus = this.detectTriggers(candidate, userUtterance);
    score += triggerBonus;
    
    // Factor 3: PRODUCT PHYSICS - boost realistic states, penalize unrealistic ones
    let productPhysicsScore = 0;
    if (productPhysics) {
      productPhysicsScore = this.calculateProductPhysicsScore(candidate, productPhysics);
      score += productPhysicsScore;
    }
    
    // Factor 4: Depth penalty (prefer staying shallow early)
    let depthPenalty = 0;
    if (candidate.depth > 2 && this.currentTurn < 10) {
      depthPenalty = -10;
      score += depthPenalty;
    }
    
    // Factor 5: Lifecycle penalty
    let lifecyclePenalty = 0;
    if (candidate.lifecycle === 'deprioritized') {
      lifecyclePenalty = -15;
      score += lifecyclePenalty;
    } else if (candidate.lifecycle === 'dormant') {
      lifecyclePenalty = -30;
      score += lifecyclePenalty;
    }
    
    const finalScore = Math.max(0, Math.min(100, score));
    
    return {
      nodeId: candidate.nodeId,
      stateType: candidate.stateType,
      stateSubtype: candidate.stateSubtype,
      stateName: candidate.stateName,
      baseConfidence: candidate.baseConfidence,
      beliefAlignment,
      triggerBonus,
      hardTriggerForced: hasHardTrigger,
      lifecyclePenalty,
      depthPenalty,
      finalScore,
      selected: false,
      // Add product physics score for debugging
      productPhysicsScore: productPhysicsScore
    };
  }
  
  /**
   * Calculate how well candidate aligns with belief state
   */
  private calculateBeliefAlignment(
    candidate: BuyerStateNode,
    beliefs: BuyerBeliefState
  ): number {
    let alignment = 0;
    
    // Use stateType instead of string matching
    switch (candidate.stateType) {
      case 'buying_signal':
        // Requires high understanding + relevance
        if (beliefs.understandsProduct >= 6 && beliefs.seesRelevance >= 6) {
          alignment += 20;
        } else {
          alignment -= 20;
        }
        break;
        
      case 'clarification':
        if (candidate.stateSubtype === 'warming_up') {
          // Requires trust
          if (beliefs.trustsRep >= 5) {
            alignment += 15;
          } else {
            alignment -= 15;
          }
        } else if (candidate.stateSubtype === 'politely_curious') {
          // Neutral state, slight bias based on product understanding
          if (beliefs.understandsProduct >= 3) {
            alignment += 5;
          }
        }
        break;
        
      case 'fit_concern':
        // Happens when relevance is low
        if (beliefs.seesRelevance < 4) {
          alignment += 20;
        } else {
          alignment -= 20;
        }
        break;
        
      case 'distrust':
        // Happens when trust is low
        if (beliefs.trustsRep < 4) {
          alignment += 15;
        } else {
          alignment -= 15;
        }
        break;
        
      case 'exit_attempt':
        // Happens when trust or relevance is very low
        if (beliefs.trustsRep < 3 || beliefs.seesRelevance < 3) {
          alignment += 20;
        } else {
          alignment -= 20;
        }
        break;
        
      case 'risk_concern':
        // Happens when value clarity is low despite interest
        if (beliefs.valueClarity < 5 && beliefs.seesRelevance >= 5) {
          alignment += 15;
        }
        break;
        
      case 'timing_concern':
        // Happens when urgency is low
        if (beliefs.urgency < 3) {
          alignment += 10;
        }
        break;
    }
    
    return alignment;
  }
  
  /**
   * CRITICAL: Calculate product physics score - boosts realistic states, penalizes unrealistic ones
   * This prevents SaaS-shaped responses for chemicals/equipment/etc.
   */
  private calculateProductPhysicsScore(
    candidate: BuyerStateNode,
    productPhysics: ProductConversationPhysics
  ): number {
    let score = 0;
    
    // Map state types to product archetypes for realism scoring
    const stateRealism = this.getStateRealismForProduct(
      candidate.stateType,
      candidate.stateSubtype,
      productPhysics.archetype
    );
    
    if (stateRealism.realistic) {
      score += stateRealism.boost;
      console.log(`🏗️ [ProductPhysics] "${candidate.stateName}" +${stateRealism.boost} (realistic for ${productPhysics.archetype})`);
    } else if (stateRealism.unrealistic) {
      score += stateRealism.penalty; // penalty is negative
      console.log(`⚠️ [ProductPhysics] "${candidate.stateName}" ${stateRealism.penalty} (unrealistic for ${productPhysics.archetype})`);
    }
    
    return score;
  }
  
  /**
   * Determine if a buyer state is realistic for a product archetype
   */
  private getStateRealismForProduct(
    stateType: BuyerStateType,
    stateSubtype: string | null,
    archetype: string
  ): { realistic?: boolean; unrealistic?: boolean; boost: number; penalty: number } {
    
    // Chemical/Industrial Supply - realistic states
    if (archetype === 'chemical_or_industrial_supply') {
      switch (stateType) {
        case 'clarification':
          if (stateSubtype?.includes('spec') || stateSubtype?.includes('grade') || stateSubtype?.includes('SDS')) {
            return { realistic: true, boost: 18, penalty: 0 };
          }
          if (stateSubtype?.includes('compliance') || stateSubtype?.includes('handling')) {
            return { realistic: true, boost: 15, penalty: 0 };
          }
          break;
        case 'current_solution_comparison':
          return { realistic: true, boost: 12, penalty: 0 };
        case 'price_concern':
          if (stateSubtype?.includes('volume') || stateSubtype?.includes('bulk')) {
            return { realistic: true, boost: 10, penalty: 0 };
          }
          break;
        case 'fit_concern':
          if (stateSubtype?.includes('application') || stateSubtype?.includes('process')) {
            return { realistic: true, boost: 8, penalty: 0 };
          }
          break;
      }
      
      // Penalize SaaS-ish states for chemicals
      if (stateSubtype?.includes('platform') || stateSubtype?.includes('onboarding') || 
          stateSubtype?.includes('dashboard') || stateSubtype?.includes('integration')) {
        return { unrealistic: true, boost: 0, penalty: -15 };
      }
    }
    
    // SaaS - realistic states  
    if (archetype === 'saas') {
      switch (stateType) {
        case 'clarification':
          if (stateSubtype?.includes('platform') || stateSubtype?.includes('integration')) {
            return { realistic: true, boost: 15, penalty: 0 };
          }
          if (stateSubtype?.includes('onboarding') || stateSubtype?.includes('workflow')) {
            return { realistic: true, boost: 12, penalty: 0 };
          }
          break;
        case 'risk_concern':
          if (stateSubtype?.includes('data') || stateSubtype?.includes('security')) {
            return { realistic: true, boost: 10, penalty: 0 };
          }
          break;
      }
      
      // Penalize chemical-ish states for SaaS
      if (stateSubtype?.includes('spec') || stateSubtype?.includes('SDS') || 
          stateSubtype?.includes('grade') || stateSubtype?.includes('handling')) {
        return { unrealistic: true, boost: 0, penalty: -12 };
      }
    }
    
    // Equipment/Hardware - realistic states
    if (archetype === 'equipment_or_hardware') {
      switch (stateType) {
        case 'clarification':
          if (stateSubtype?.includes('specs') || stateSubtype?.includes('installation')) {
            return { realistic: true, boost: 15, penalty: 0 };
          }
          break;
        case 'risk_concern':
          if (stateSubtype?.includes('maintenance') || stateSubtype?.includes('reliability')) {
            return { realistic: true, boost: 12, penalty: 0 };
          }
          break;
      }
    }
    
    // Default: neutral (no boost or penalty)
    return { boost: 0, penalty: 0 };
  }
  
  /**
   * Detect soft triggers in user utterance
   */
  private detectTriggers(candidate: BuyerStateNode, utterance: string): number {
    let bonus = 0;
    const matchedTriggers: string[] = [];
    
    // DEBUG: Log available triggers for this candidate
    if (candidate.softTriggers.length > 0 || candidate.hardTriggers.length > 0) {
      console.log(`🔍 [Trigger Check] "${candidate.stateName}":`, {
        softTriggers: candidate.softTriggers,
        hardTriggers: candidate.hardTriggers,
        registeredHardTriggers: Array.from(this.currentHardTriggers)
      });
    }
    
    // Check soft triggers only (hard triggers checked separately)
    candidate.softTriggers.forEach(trigger => {
      if (this.matchesTriggerPattern(trigger, utterance)) {
        bonus += 10;
        matchedTriggers.push(trigger);
      }
    });
    
    // Log matched triggers
    if (matchedTriggers.length > 0) {
      console.log(`✅ [Trigger Match] "${candidate.stateName}" matched: ${matchedTriggers.join(', ')} (+${bonus})`);
    }
    
    return bonus;
  }
  
  /**
   * Simple trigger pattern matching
   */
  private matchesTriggerPattern(trigger: string, utterance: string): boolean {
    // Phase 1: simple keyword matching
    // Phase 2+: more sophisticated NLP
    
    const lower = utterance.toLowerCase();
    
    if (trigger === 'rep_asks_permission_to_continue') {
      return /\b(is this a good time|do you have a (minute|moment)|can we|may i)\b/i.test(utterance);
    }
    
    if (trigger === 'rep_personalizes_opening') {
      return /\b(i noticed|i saw|i read about|specific to you)\b/i.test(utterance);
    }
    
    if (trigger === 'rep_launches_into_pitch_immediately') {
      return /\b(we offer|our product|i'm calling about our)\b/i.test(utterance) && utterance.split(' ').length > 20;
    }
    
    return false;
  }
  
  /**
   * Transition to a new state
   */
  private async transitionToState(
    newNode: BuyerStateNode,
    oldNode: BuyerStateNode,
    confidence: number,
    triggerType: 'hard' | 'soft' | 'natural',
    allCandidates: CandidateScore[]
  ): Promise<BuyerStateTransition> {
    // Update old node
    oldNode.lifecycle = 'expanded';
    oldNode.turnsInState = 0;
    
    // Deprioritize siblings of new node
    if (newNode.parentId) {
      const parent = this.nodes.get(newNode.parentId);
      if (parent) {
        parent.childIds.forEach(siblingId => {
          if (siblingId !== newNode.nodeId) {
            const sibling = this.nodes.get(siblingId);
            if (sibling && sibling.lifecycle === 'active') {
              sibling.lifecycle = 'deprioritized';
            }
          }
        });
      }
    }
    
    // Update new node
    newNode.lifecycle = 'selected';
    newNode.turnsInState = 0;
    newNode.lastSelectedTurn = this.currentTurn;
    
    this.currentNodeId = newNode.nodeId;
    
    // Ensure rolling 3-depth horizon from new selected node
    if (this.latestConfig) {
      await this.ensureHorizon(newNode.nodeId, 3);
    }
    
    const selectedCandidate = allCandidates.find(c => c.nodeId === newNode.nodeId);
    const reason = selectedCandidate 
      ? `belief:${selectedCandidate.beliefAlignment.toFixed(0)} + triggers:${selectedCandidate.triggerBonus.toFixed(0)}`
      : 'hard trigger';
    
    const transition: BuyerStateTransition = {
      fromNodeId: oldNode.nodeId,
      toNodeId: newNode.nodeId,
      confidence,
      reason,
      triggerType
    };
    
    console.log(`🌳 [BuyerStateTree] TRANSITION [${triggerType.toUpperCase()}]: "${oldNode.stateName}" → "${newNode.stateName}" (score: ${confidence.toFixed(1)})`);
    console.log(`  Reason: ${reason}`);
    
    return transition;
  }
  
  /**
   * Activate tree for guidance
   */
  activateTree(): void {
    this.treeActivated = true;
    console.log(`🌳 [BuyerStateTree] Tree ACTIVATED for guidance`);
  }
  
  /**
   * Check if tree is activated
   */
  isActivated(): boolean {
    return this.treeActivated;
  }
  
  /**
   * Get current buyer state
   */
  getCurrentState(): BuyerStateNode | null {
    if (!this.currentNodeId) return null;
    return this.nodes.get(this.currentNodeId) || null;
  }
  
  /**
   * Get child nodes for a given node ID
   */
  getChildNodes(nodeId: string): BuyerStateNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    
    return node.childIds
      .map(id => this.nodes.get(id))
      .filter((child): child is BuyerStateNode => child !== undefined);
  }
  
  /**
   * Generate unique node ID
   */
  private generateNodeId(baseName: string): string {
    const sanitized = baseName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `n_${sanitized}_${String(this.nodeIdCounter++).padStart(3, '0')}`;
  }
  
  /**
   * Log tree structure
   */
  private logTreeStructure(): void {
    console.log(`🌳 [Tree Structure]:`);
    
    if (!this.rootNodeId) {
      console.log(`  (empty tree)`);
      return;
    }
    
    this.logNodeRecursive(this.rootNodeId, 0);
  }
  
  private logNodeRecursive(nodeId: string, indent: number): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    const prefix = '  '.repeat(indent);
    const lifecycle = node.lifecycle === 'selected' ? '●' : node.lifecycle === 'active' ? '○' : '◌';
    
    console.log(`${prefix}${lifecycle} ${node.displayPath}. ${node.stateName} (conf: ${node.baseConfidence})`);
    
    node.childIds.forEach(childId => {
      this.logNodeRecursive(childId, indent + 1);
    });
  }
  
  /**
   * Log detailed candidate scoring
   */
  private logCandidateScores(
    candidates: CandidateScore[],
    currentNode: BuyerStateNode
  ): void {
    console.log(`🌳 [Candidates] From "${currentNode.stateName}" (${currentNode.stateType}):`);
    
    if (candidates.length === 0) {
      console.log(`  (no candidates)`);
      return;
    }
    
    candidates.forEach(c => {
      const marker = c.selected ? '✓' : ' ';
      const hardMarker = c.hardTriggerForced ? ' [HARD]' : '';
      
      console.log(`  ${marker} ${c.stateName} (${c.stateType}${c.stateSubtype ? `:${c.stateSubtype}` : ''})${hardMarker}`);
      console.log(`     Base: ${c.baseConfidence} | Belief: ${c.beliefAlignment >= 0 ? '+' : ''}${c.beliefAlignment} | Trigger: +${c.triggerBonus} | Lifecycle: ${c.lifecyclePenalty} | Depth: ${c.depthPenalty} → FINAL: ${c.finalScore.toFixed(1)}`);
      
      if (c.selected && c.reasonSelected) {
        console.log(`     ✓ SELECTED: ${c.reasonSelected}`);
      } else if (!c.selected && c.reasonRejected) {
        console.log(`     ✗ REJECTED: ${c.reasonRejected}`);
      }
    });
  }
  
  /**
   * Ensure rolling horizon: selected node has paths N steps ahead
   */
  private async ensureHorizon(nodeId: string, depthAhead: number): Promise<void> {
    if (!this.latestConfig) return;
    
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    // Check if we have full horizon
    const hasFullHorizon = this.checkHorizonDepth(node, depthAhead);
    
    if (!hasFullHorizon) {
      console.log(`🌳 [BuyerStateTree] Ensuring ${depthAhead}-step horizon from "${node.stateName}"`);
      await this.expandHorizon(node, this.latestConfig, depthAhead);
    }
  }
  
  /**
   * Check if a node has paths extending N steps ahead
   */
  private checkHorizonDepth(node: BuyerStateNode, depthAhead: number): boolean {
    if (depthAhead === 0) return true;
    if (node.childIds.length === 0) return false;
    
    // Check if at least one child has horizon of (depthAhead - 1)
    for (const childId of node.childIds) {
      const child = this.nodes.get(childId);
      if (child && this.checkHorizonDepth(child, depthAhead - 1)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Expand horizon to ensure N steps ahead
   */
  private async expandHorizon(
    node: BuyerStateNode,
    config: TreeGenerationConfig,
    depthAhead: number
  ): Promise<void> {
    if (depthAhead === 0) return;
    
    // Expand current node if it has no children
    if (node.childIds.length === 0) {
      await this.expandNode(node.nodeId, config, node.depth + 1);
    }
    
    // Recursively ensure horizon on most likely child
    if (node.childIds.length > 0 && depthAhead > 1) {
      const children = node.childIds
        .map(id => this.nodes.get(id)!)
        .filter(Boolean);
      
      if (children.length > 0) {
        // Pick highest-confidence child
        const bestChild = children.reduce((best, child) => 
          child.baseConfidence > best.baseConfidence ? child : best
        );
        
        await this.expandHorizon(bestChild, config, depthAhead - 1);
      }
    }
  }
  
  /**
   * Update lifecycle states (age deprioritized toward dormant, etc.)
   */
  private updateLifecycleStates(): void {
    const currentTurn = this.currentTurn;
    
    this.nodes.forEach(node => {
      // Deprioritized → Dormant after 3 turns without selection
      if (node.lifecycle === 'deprioritized') {
        const turnsSinceLastSelected = node.lastSelectedTurn 
          ? currentTurn - node.lastSelectedTurn 
          : currentTurn - node.createdTurn;
        
        if (turnsSinceLastSelected >= 3) {
          node.lifecycle = 'dormant';
          console.log(`🌳 [Lifecycle] "${node.stateName}" → dormant (${turnsSinceLastSelected} turns without relevance)`);
        }
      }
    });
  }
  
  /**
   * Retire a node due to contradiction (called by controller)
   */
  retireNode(nodeId: string, reason: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    node.lifecycle = 'retired';
    node.retiredTurn = this.currentTurn;
    
    console.log(`🌳 [Lifecycle] "${node.stateName}" → retired (reason: ${reason})`);
  }
  
  /**
   * Get detailed candidate scores (for external logging/debugging)
   */
  getLastCandidateScores(): CandidateScore[] {
    return [...this.lastCandidateScores];
  }
  
  /**
   * Reset tree
   */
  reset(): void {
    this.nodes.clear();
    this.rootNodeId = null;
    this.currentNodeId = null;
    this.currentTurn = 0;
    this.nodeIdCounter = 0;
    this.treeGenerated = false;
    this.treeActivated = false;
    this.latestConfig = null;
    this.currentHardTriggers.clear();
    this.lastCandidateScores = [];
  }
  
  // TODO Phase 2+: LLM-generated state definitions based on product/persona
  // TODO Phase 2+: Dynamic tree expansion based on conversation flow
  // TODO Phase 2+: More sophisticated belief-state alignment scoring
  // TODO Phase 2+: Reactivate dormant branches when conditions change significantly
  // TODO Phase 3+: Sales call data to inform transition probabilities
}

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
import { updateDiscoveryLayer } from './BuyerStateTreeUpdater';
import {
  createClarificationNode,
  createDistractedNode,
  createTimingNode,
  createEngagedNode,
  createProofNode
} from './BuyerStateProductNodes';
import {
  BuyerStateNodeLifecycle,
  BuyerStateType,
  BuyerStateNode,
  BuyerStateTransition,
  HardTriggerDetection,
  CandidateScore,
  TreeGenerationConfig
} from './BuyerStateTypes';
import {
  scoreCurrentState,
  scoreCandidate,
  pickBestChildForHorizon
} from './BuyerStateScoring';

export type { BuyerStateNodeLifecycle, BuyerStateType, BuyerStateNode, BuyerStateTransition, HardTriggerDetection, CandidateScore, TreeGenerationConfig };

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
  private readonly CONFIDENCE_THRESHOLD_TRANSITION = 40; // Lowered from 50 to allow easier transitions
  private readonly STICKY_BONUS_PER_TURN = 2; // Reduced from 3 to lower stickiness
  private readonly MAX_STICKY_BONUS = 8; // Reduced from 12 to prevent getting stuck
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
      // Expand the most product-realistic child, not just highest base confidence
      const bestChild = pickBestChildForHorizon(children, config);
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
    const { beliefState } = config;
    const children: BuyerStateNode[] = [];
    
    // Generate states based on parent and belief progression
    const childDefinitions = this.getChildStateDefinitions(parent, beliefState);
    
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
        retiredTurn: null,
        discoveryLayers: (def as any).discoveryLayers,
        currentDiscoveryLayer: (def as any).discoveryLayers ? 'surface' : undefined
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
    beliefs: BuyerBeliefState
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
    // CRITICAL FIX: Use product physics to generate product-appropriate branches
    const productPhysics = this.latestConfig?.productPhysics;
    
    if (parent.stateType === 'initial_contact') {
      return [
        createClarificationNode(productPhysics),
        createDistractedNode(productPhysics),
        createTimingNode(productPhysics)
      ];
    }
    
    if (parent.stateType === 'clarification') {
      if (beliefs.understandsProduct >= 5 && beliefs.seesRelevance >= 5) {
        return [
          createEngagedNode(productPhysics),
          createProofNode(productPhysics)
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
   * Update product physics mid-call if classifier corrects archetype.
   * Before depth 2: regenerate tree from scratch with new physics.
   * After depth 2: update config so future expansions + scoring use new physics.
   */
  async updateProductPhysics(
    newPhysics: TreeGenerationConfig['productPhysics'],
    newConfidence: ProductConfidence
  ): Promise<void> {
    if (!this.latestConfig) return;

    const oldArchetype = this.latestConfig.productPhysics?.archetype;
    const newArchetype = newPhysics?.archetype;

    if (oldArchetype === newArchetype) return;

    console.log(`🌳 [BuyerStateTree] Product archetype changed: "${oldArchetype}" → "${newArchetype}"`);

    this.latestConfig = {
      ...this.latestConfig,
      productPhysics: newPhysics,
      productConfidence: newConfidence
    };

    const currentDepth = this.nodes.get(this.currentNodeId ?? '')?.depth ?? 0;

    if (currentDepth <= 1) {
      console.log(`🌳 [BuyerStateTree] Early-call archetype correction — regenerating tree`);
      await this.generateTree(this.latestConfig, this.currentTurn);
    } else {
      console.log(`🌳 [BuyerStateTree] Mid-call archetype correction — preserving state, updating future expansions`);
    }
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
    
    // Update discovery layer based on user question
    updateDiscoveryLayer(currentNode, userUtterance);
    
    // Check if we should transition
    const candidates = this.getCandidateStates(currentNode, userUtterance, beliefs);
    
    if (candidates.length === 0) {
      console.log(`🌳 [BuyerStateTree] No candidate transitions from "${currentNode.stateName}"`);
      this.currentHardTriggers.clear();
      return null;
    }
    
    // Score candidates with detailed breakdown - NOW WITH PRODUCT PHYSICS
    const scoredCandidates = candidates.map(candidate => 
      scoreCandidate(candidate, currentNode, beliefs, userUtterance, this.currentTurn, this.currentHardTriggers, this.latestConfig?.productPhysics, productConfidence)
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
    const currentStateScore = scoreCurrentState(currentNode, beliefs);
    
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
    // CRITICAL: initial_contact is a launch pad, not a real buyer state - no margin check
    const requiredScore = currentNode.stateType === 'initial_contact'
      ? this.CONFIDENCE_THRESHOLD_TRANSITION
      : currentStateScore + this.TRANSITION_MARGIN;
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
      const physicsStr = c.productPhysicsScore !== 0 ? ` | Physics: ${c.productPhysicsScore >= 0 ? '+' : ''}${c.productPhysicsScore.toFixed(1)}` : '';
      console.log(`     Base: ${c.baseConfidence} | Belief: ${c.beliefAlignment >= 0 ? '+' : ''}${c.beliefAlignment} | Trigger: +${c.triggerBonus}${physicsStr} | Lifecycle: ${c.lifecyclePenalty} | Depth: ${c.depthPenalty} → FINAL: ${c.finalScore.toFixed(1)}`);
      
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
        // Pick most product-realistic child, not just highest base confidence
        const bestChild = pickBestChildForHorizon(children, config);
        
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

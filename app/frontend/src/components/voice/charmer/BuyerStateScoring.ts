/**
 * BuyerStateScoring
 *
 * Standalone scoring functions for the BuyerStateTree.
 * Extracted to keep BuyerStateTree.ts under 400 lines.
 */

import { BuyerBeliefState } from './BuyerBeliefTracker';
import { ProductConfidence } from './ProductConfidenceDetector';
import { ProductConversationPhysics } from './prompts/ProductConversationFitService';
import { BuyerStateNode, BuyerStateType, CandidateScore, TreeGenerationConfig } from './BuyerStateTypes';

export function scoreCurrentState(
  currentNode: BuyerStateNode,
  beliefs: BuyerBeliefState
): number {
  let score = currentNode.baseConfidence;
  score += calculateBeliefAlignment(currentNode, beliefs);
  const inertiaBonus = Math.min(20, currentNode.turnsInState * 5);
  score += inertiaBonus;
  return Math.max(0, Math.min(100, score));
}

export function scoreCandidate(
  candidate: BuyerStateNode,
  currentNode: BuyerStateNode,
  beliefs: BuyerBeliefState,
  userUtterance: string,
  currentTurn: number,
  currentHardTriggers: Set<string>,
  productPhysics?: ProductConversationPhysics,
  productConfidence?: ProductConfidence
): CandidateScore {
  let score = candidate.baseConfidence;

  const hasHardTrigger = candidate.hardTriggers.some(t => currentHardTriggers.has(t));

  const beliefAlignment = calculateBeliefAlignment(candidate, beliefs);
  score += beliefAlignment;

  const triggerBonus = detectTriggers(candidate, userUtterance, currentHardTriggers);
  score += triggerBonus;

  let productPhysicsScore = 0;
  if (productPhysics) {
    productPhysicsScore = calculateProductPhysicsScore(candidate, productPhysics, productConfidence);
    score += productPhysicsScore;
  }

  let depthPenalty = 0;
  if (candidate.depth > 2 && currentTurn < 10) {
    depthPenalty = -10;
    score += depthPenalty;
  }

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
    productPhysicsScore,
    finalScore,
    selected: false
  };
}

export function calculateBeliefAlignment(
  candidate: BuyerStateNode,
  beliefs: BuyerBeliefState
): number {
  let alignment = 0;
  switch (candidate.stateType) {
    case 'buying_signal':
      alignment += (beliefs.understandsProduct >= 6 && beliefs.seesRelevance >= 6) ? 20 : -20;
      break;
    case 'clarification':
      if (candidate.stateSubtype === 'warming_up') {
        alignment += beliefs.trustsRep >= 5 ? 15 : -15;
      } else if (candidate.stateSubtype === 'politely_curious' && beliefs.understandsProduct >= 3) {
        alignment += 5;
      }
      break;
    case 'fit_concern':
      alignment += beliefs.seesRelevance < 4 ? 20 : -20;
      break;
    case 'distrust':
      alignment += beliefs.trustsRep < 4 ? 15 : -15;
      break;
    case 'exit_attempt':
      alignment += (beliefs.trustsRep < 3 || beliefs.seesRelevance < 3) ? 20 : -20;
      break;
    case 'risk_concern':
      if (beliefs.valueClarity < 5 && beliefs.seesRelevance >= 5) alignment += 15;
      break;
    case 'timing_concern':
      if (beliefs.urgency < 3) alignment += 10;
      break;
  }
  return alignment;
}

export function calculateProductPhysicsScore(
  candidate: BuyerStateNode,
  productPhysics: ProductConversationPhysics,
  productConfidence?: ProductConfidence
): number {
  let score = 0;
  const stateRealism = getStateRealismForProduct(
    candidate.stateType,
    candidate.stateSubtype,
    productPhysics.archetype
  );

  const confidenceWeight = getProductPhysicsConfidenceWeight(productConfidence);

  if (stateRealism.realistic) {
    const weightedBoost = stateRealism.boost * confidenceWeight;
    score += weightedBoost;
    console.log(`🏗️ [ProductPhysics] "${candidate.stateName}" +${weightedBoost.toFixed(1)} (${stateRealism.boost} × ${(confidenceWeight * 100).toFixed(0)}% confidence)`);
  } else if (stateRealism.unrealistic) {
    const weightedPenalty = stateRealism.penalty * confidenceWeight;
    score += weightedPenalty;
    console.log(`⚠️ [ProductPhysics] "${candidate.stateName}" ${weightedPenalty.toFixed(1)} (${stateRealism.penalty} × ${(confidenceWeight * 100).toFixed(0)}% confidence)`);
  }
  return score;
}

export function getProductPhysicsConfidenceWeight(productConfidence?: ProductConfidence): number {
  switch (productConfidence?.confidence) {
    case 'high': return 1.0;
    case 'medium': return 0.75;
    case 'low': return 0.35;
    case 'none': return 0.0;
    default: return 0.5;
  }
}

export function pickBestChildForHorizon(
  children: BuyerStateNode[],
  config: TreeGenerationConfig
): BuyerStateNode {
  return children.reduce((best, child) => {
    const childScore = calculateHorizonScore(child, config);
    const bestScore = calculateHorizonScore(best, config);
    return childScore > bestScore ? child : best;
  });
}

export function calculateHorizonScore(
  node: BuyerStateNode,
  config: TreeGenerationConfig
): number {
  let score = node.baseConfidence;
  if (config.beliefState) {
    score += calculateBeliefAlignment(node, config.beliefState);
  }
  if (config.productPhysics) {
    score += calculateProductPhysicsScore(node, config.productPhysics, config.productConfidence);
  }
  return score;
}

export function getStateRealismForProduct(
  stateType: BuyerStateType,
  stateSubtype: string | null,
  archetype: string
): { realistic?: boolean; unrealistic?: boolean; boost: number; penalty: number } {
  const subtype = stateSubtype?.toLowerCase() ?? '';

  if (archetype === 'chemical_or_industrial_supply') {
    switch (stateType) {
      case 'clarification':
        if (subtype.includes('spec') || subtype.includes('grade') || subtype.includes('sds')) {
          return { realistic: true, boost: 18, penalty: 0 };
        }
        if (subtype.includes('compliance') || subtype.includes('handling')) {
          return { realistic: true, boost: 15, penalty: 0 };
        }
        break;
      case 'current_solution_comparison':
        return { realistic: true, boost: 12, penalty: 0 };
      case 'price_concern':
        if (subtype.includes('volume') || subtype.includes('bulk')) {
          return { realistic: true, boost: 10, penalty: 0 };
        }
        break;
      case 'fit_concern':
        if (subtype.includes('application') || subtype.includes('process')) {
          return { realistic: true, boost: 8, penalty: 0 };
        }
        break;
      case 'risk_concern':
        if (subtype.includes('sds') || subtype.includes('compliance') ||
            subtype.includes('quality') || subtype.includes('validation') ||
            subtype.includes('safety') || subtype.includes('certificate')) {
          return { realistic: true, boost: 15, penalty: 0 };
        }
        break;
    }
    if (subtype.includes('platform') || subtype.includes('onboarding') ||
        subtype.includes('dashboard') || subtype.includes('integration')) {
      return { unrealistic: true, boost: 0, penalty: -15 };
    }
  }

  if (archetype === 'saas') {
    switch (stateType) {
      case 'clarification':
        if (subtype.includes('platform') || subtype.includes('integration')) {
          return { realistic: true, boost: 15, penalty: 0 };
        }
        if (subtype.includes('onboarding') || subtype.includes('workflow')) {
          return { realistic: true, boost: 12, penalty: 0 };
        }
        break;
      case 'risk_concern':
        if (subtype.includes('data') || subtype.includes('security') ||
            subtype.includes('platform') || subtype.includes('validation') ||
            subtype.includes('roi') || subtype.includes('integration')) {
          return { realistic: true, boost: 12, penalty: 0 };
        }
        break;
    }
    if (subtype.includes('spec') || subtype.includes('sds') ||
        subtype.includes('grade') || subtype.includes('handling')) {
      return { unrealistic: true, boost: 0, penalty: -12 };
    }
  }

  if (archetype === 'equipment_or_hardware') {
    switch (stateType) {
      case 'clarification':
        if (subtype.includes('specs') || subtype.includes('installation')) {
          return { realistic: true, boost: 15, penalty: 0 };
        }
        break;
      case 'risk_concern':
        if (subtype.includes('maintenance') || subtype.includes('reliability')) {
          return { realistic: true, boost: 12, penalty: 0 };
        }
        break;
    }
  }

  return { boost: 0, penalty: 0 };
}

export function detectTriggers(
  candidate: BuyerStateNode,
  utterance: string,
  currentHardTriggers: Set<string>
): number {
  let bonus = 0;
  const matchedTriggers: string[] = [];

  if (candidate.softTriggers.length > 0 || candidate.hardTriggers.length > 0) {
    console.log(`🔍 [Trigger Check] "${candidate.stateName}":`, {
      softTriggers: candidate.softTriggers,
      hardTriggers: candidate.hardTriggers,
      registeredHardTriggers: Array.from(currentHardTriggers)
    });
  }

  candidate.softTriggers.forEach(trigger => {
    if (matchesTriggerPattern(trigger, utterance)) {
      bonus += 10;
      matchedTriggers.push(trigger);
    }
  });

  if (matchedTriggers.length > 0) {
    console.log(`✨ [Trigger Match] "${candidate.stateName}": +${bonus} from [${matchedTriggers.join(', ')}]`);
  }

  return bonus;
}

export function matchesTriggerPattern(trigger: string, utterance: string): boolean {
  const lowerUtterance = utterance.toLowerCase();
  const triggerMap: Record<string, string[]> = {
    'rep_provides_clear_value_statement': ['helps', 'saves', 'improves', 'increases', 'reduces', 'solving'],
    'rep_asks_permission_to_continue': ['quick question', 'take a moment', 'two minutes', 'briefly', 'just a second'],
    'rep_personalizes_opening': ['noticed', 'saw', 'heard', 'based on', 'specifically'],
    'rep_launches_into_pitch_immediately': ['our product', 'our solution', 'we offer', 'we provide', 'let me tell you'],
    'rep_sounds_scripted': ['as you know', 'in today\'s world', 'in today\'s market', 'revolutionary', 'cutting-edge'],
    'rep_respects_time': ['quick', 'brief', 'thirty seconds', 'one minute', 'won\'t take long'],
    'rep_asks_about_timing': ['is now a good time', 'better time', 'when would work', 'schedule a call'],
    'rep_asks_good_discovery_question': ['what\'s your current', 'how do you currently', 'what challenges', 'what does that look like'],
    'rep_demonstrates_product_understanding': ['specifically for', 'designed for', 'built for', 'handles', 'supports'],
    'rep_makes_bold_claim_without_proof': ['best', 'only', 'guaranteed', 'always', 'never fails', '#1'],
    'rep_provides_social_proof': ['other companies', 'our clients', 'case study', 'results show', 'they saw'],
    'rep_pushes_too_hard': ['you need this', 'you should', 'why wouldn\'t you', 'everyone is doing'],
  };

  const keywords = triggerMap[trigger];
  if (!keywords) return false;
  return keywords.some(kw => lowerUtterance.includes(kw));
}

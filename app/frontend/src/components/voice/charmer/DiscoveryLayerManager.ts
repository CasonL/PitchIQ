/**
 * DiscoveryLayerManager
 * 
 * Manages progression through discovery layers based on user questions.
 * Detects question types and advances layers appropriately.
 */

import { BuyerStateNode, DiscoveryLayer } from './BuyerStateTypes';

/**
 * Question type detection for layer progression
 */
export type QuestionType = 
  | 'how_what_about_current'
  | 'asks_about_issues'
  | 'asks_why'
  | 'suggests_cause'
  | 'asks_what_happens'
  | 'close_ended'
  | 'other';

/**
 * Detect question type from user input
 */
export function detectQuestionType(userInput: string): QuestionType {
  const lower = userInput.toLowerCase();
  
  // Why questions (root cause discovery)
  if (lower.includes('why do you') || lower.includes('why don\'t') || lower.includes('why is')) {
    return 'asks_why';
  }
  
  // What happens questions (impact discovery)
  if (lower.includes('what happens') || lower.includes('what\'s the impact') || lower.includes('what does that cost')) {
    return 'asks_what_happens';
  }
  
  // How/What about current (shallow detail)
  if ((lower.includes('how') || lower.includes('what')) && 
      (lower.includes('working') || lower.includes('using') || lower.includes('doing') || lower.includes('current'))) {
    return 'how_what_about_current';
  }
  
  // Issue probing
  if (lower.includes('any issues') || lower.includes('any problems') || lower.includes('challenges') || 
      lower.includes('seeing issues') || lower.includes('pain points')) {
    return 'asks_about_issues';
  }
  
  // Suggestion/confirmation (e.g., "and not interactive?")
  if (lower.includes('not ') && lower.includes('?') && lower.split(' ').length < 8) {
    return 'suggests_cause';
  }
  
  // Close-ended detection
  if ((lower.startsWith('are you') || lower.startsWith('do you') || lower.startsWith('is it') || 
       lower.startsWith('does it') || lower.startsWith('have you')) && lower.includes('?')) {
    return 'close_ended';
  }
  
  return 'other';
}

/**
 * Get the next discovery layer based on question type
 */
export function getNextLayer(currentLayer: DiscoveryLayer, questionType: QuestionType): DiscoveryLayer | null {
  const layerOrder: DiscoveryLayer[] = ['surface', 'shallow', 'problem_surface', 'root_cause', 'confirmation', 'impact'];
  const currentIndex = layerOrder.indexOf(currentLayer);
  
  // Map question types to required layers
  const questionToLayer: Record<QuestionType, DiscoveryLayer | null> = {
    'how_what_about_current': 'shallow',
    'asks_about_issues': 'problem_surface',
    'asks_why': 'root_cause',
    'suggests_cause': 'confirmation',
    'asks_what_happens': 'impact',
    'close_ended': null, // Close-ended questions don't advance layers
    'other': null
  };
  
  const targetLayer = questionToLayer[questionType];
  if (!targetLayer) return null;
  
  const targetIndex = layerOrder.indexOf(targetLayer);
  
  // Only advance if target is the next layer (can't skip)
  if (targetIndex === currentIndex + 1) {
    return targetLayer;
  }
  
  // Stay at current layer if trying to skip or go backwards
  return null;
}

/**
 * Check if a question type is open-ended
 */
export function isOpenEndedQuestion(questionType: QuestionType): boolean {
  return questionType !== 'close_ended' && questionType !== 'other';
}

/**
 * Advance discovery layer if appropriate
 */
export function advanceDiscoveryLayer(
  node: BuyerStateNode,
  userInput: string
): DiscoveryLayer | null {
  if (!node.discoveryLayers || !node.currentDiscoveryLayer) {
    return null;
  }
  
  const questionType = detectQuestionType(userInput);
  const nextLayer = getNextLayer(node.currentDiscoveryLayer, questionType);
  
  if (nextLayer) {
    console.log(`🔍 [Discovery] Advancing from ${node.currentDiscoveryLayer} → ${nextLayer} (question: ${questionType})`);
    return nextLayer;
  }
  
  if (questionType === 'close_ended') {
    console.log(`⚠️ [Discovery] Close-ended question - staying at ${node.currentDiscoveryLayer}`);
  }
  
  return null;
}

/**
 * Get the current layer definition
 */
export function getCurrentLayerDef(node: BuyerStateNode) {
  if (!node.discoveryLayers || !node.currentDiscoveryLayer) {
    return null;
  }
  
  return node.discoveryLayers.find(layer => layer.layer === node.currentDiscoveryLayer);
}

/**
 * Get guidance for Marcus based on current discovery layer
 */
export function getLayerGuidance(node: BuyerStateNode): string {
  const layerDef = getCurrentLayerDef(node);
  if (!layerDef) return '';
  
  let guidance = `DISCOVERY LAYER: ${layerDef.layer.toUpperCase()}\n\n`;
  guidance += `Response: "${layerDef.response}"\n\n`;
  guidance += `Hint to drop: ${layerDef.hint}\n\n`;
  
  if (layerDef.requiresOpenEnded) {
    guidance += `⚠️ This layer requires an open-ended why/how/what question to unlock.\n`;
    guidance += `Close-ended questions (yes/no) should get minimal, surface-level answers.\n\n`;
  }
  
  if (layerDef.breakthrough) {
    guidance += `🎯 BREAKTHROUGH MOMENT: If rep asks the right question, Marcus realizes the connection.\n\n`;
  }
  
  return guidance;
}

/**
 * BuyerStateTreeUpdater
 * 
 * Handles discovery layer progression when updating buyer state tree.
 * Integrates with BuyerStateTree to advance layers based on user questions.
 */

import { BuyerStateNode } from './BuyerStateTypes';
import { advanceDiscoveryLayer } from './DiscoveryLayerManager';

/**
 * Update discovery layer for a node based on user input
 * Returns true if layer advanced
 */
export function updateDiscoveryLayer(node: BuyerStateNode, userInput: string): boolean {
  if (!node.discoveryLayers || !node.currentDiscoveryLayer) {
    return false;
  }
  
  const nextLayer = advanceDiscoveryLayer(node, userInput);
  
  if (nextLayer) {
    node.currentDiscoveryLayer = nextLayer;
    console.log(`✅ [Discovery] Layer advanced to: ${nextLayer}`);
    return true;
  }
  
  return false;
}

/**
 * Reset discovery layer to surface when entering a new node
 */
export function resetDiscoveryLayer(node: BuyerStateNode): void {
  if (node.discoveryLayers) {
    node.currentDiscoveryLayer = 'surface';
    console.log(`🔄 [Discovery] Layer reset to surface for node: ${node.stateName}`);
  }
}
